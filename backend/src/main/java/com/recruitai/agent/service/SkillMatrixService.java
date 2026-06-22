package com.recruitai.agent.service;

import com.recruitai.agent.entity.Candidate;
import com.recruitai.agent.entity.Job;
import com.recruitai.agent.entity.SkillMatrix;
import com.recruitai.agent.repository.CandidateRepository;
import com.recruitai.agent.repository.JobRepository;
import com.recruitai.agent.repository.SkillMatrixRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Deterministic skill-proficiency matrix generator. No external AI calls — every
 * score derives from evidence in the candidate's actual resume text (parsed on
 * demand from the stored file) plus structured fields. Proficiency is driven by
 * how often and in what context each skill genuinely appears, NOT by the arbitrary
 * order it happens to occupy in the parsed skills list.
 *
 *   Skill Score = base(30) + resumeMentions(≤36) + context(≤26) + experience(≤20)
 *
 * resumeMentions = extra mentions of the skill in the resume body (beyond the bare
 * skills-list entry); context rewards proximity to expert / project / leadership /
 * certification wording; experience lifts overall seniority. Clamped to 10..99 and
 * sorted descending so the first entry is the candidate's genuine top skill.
 */
@Service
public class SkillMatrixService {

    private static final Logger logger = LoggerFactory.getLogger(SkillMatrixService.class);

    @Autowired private SkillMatrixRepository skillMatrixRepository;
    @Autowired private CandidateRepository candidateRepository;
    @Autowired private JobRepository jobRepository;
    @Autowired private com.recruitai.agent.repository.ResumeRepository resumeRepository;

    // ==================== PUBLIC API ====================

    public SkillMatrix calculateAndSave(Candidate candidate, String jobId) {
        if (candidate == null) return null;

        List<SkillMatrix> existing = skillMatrixRepository.findByCandidateId(candidate.getId());
        SkillMatrix matrix = existing.isEmpty() ? new SkillMatrix() : existing.get(0);

        matrix.setCandidateId(candidate.getId());
        matrix.setCandidateName(candidate.getName());
        matrix.setUpdatedAt(LocalDateTime.now());
        if (matrix.getCreatedAt() == null) matrix.setCreatedAt(LocalDateTime.now());
        matrix.setJobId(jobId);

        if (jobId != null && !jobId.isBlank()) {
            jobRepository.findById(jobId).ifPresent(j -> matrix.setJobTitle(j.getTitle()));
        }

        List<SkillMatrix.SkillMetric> metrics = computeMetrics(candidate);
        matrix.setSkillMetrics(metrics);
        matrix.setTotalScore(metrics.isEmpty() ? 0 : metrics.get(0).getPercentage());

        // Drop legacy duplicates so the table doesn't accumulate one row per recompute
        if (existing.size() > 1) {
            for (int i = 1; i < existing.size(); i++) {
                skillMatrixRepository.delete(existing.get(i));
            }
        }

        SkillMatrix saved = skillMatrixRepository.save(matrix);
        logger.debug("Skill matrix saved for {}: top={} ({}%)", candidate.getName(),
                metrics.isEmpty() ? "—" : metrics.get(0).getSkill(),
                metrics.isEmpty() ? 0 : metrics.get(0).getPercentage());
        return saved;
    }

    /** Alias kept for backward compatibility with the previous service signature. */
    public SkillMatrix calculateDeterministic(Candidate candidate, String jobId) {
        return calculateAndSave(candidate, jobId);
    }

    public List<SkillMatrix> getByCandidate(String candidateId) {
        List<SkillMatrix> existing = skillMatrixRepository.findByCandidateId(candidateId);

        // Lazily generate on first read so candidates seeded before this code shipped
        // still get a matrix without manual intervention.
        boolean needsGenerate = existing.isEmpty()
                || existing.get(0).getSkillMetrics() == null
                || existing.get(0).getSkillMetrics().isEmpty();

        if (needsGenerate) {
            Candidate candidate = candidateRepository.findById(candidateId).orElse(null);
            if (candidate != null && candidate.getSkills() != null && !candidate.getSkills().isEmpty()) {
                SkillMatrix sm = calculateAndSave(candidate, candidate.getJobId());
                return sm == null ? existing : List.of(sm);
            }
        }

        if (existing.size() > 1) {
            existing.sort((a, b) -> b.getUpdatedAt().compareTo(a.getUpdatedAt()));
        }
        return existing;
    }

    public List<SkillMatrix> getByJob(String jobId) {
        if (jobId == null || jobId.isBlank()) return new ArrayList<>();
        return skillMatrixRepository.findByJobId(jobId);
    }

    /** One-shot backfill — invoked from the startup migration. */
    public int regenerateAll() {
        List<Candidate> all = candidateRepository.findAll();
        int updated = 0;
        for (Candidate c : all) {
            if (c.getSkills() == null || c.getSkills().isEmpty()) continue;
            calculateAndSave(c, c.getJobId());
            updated++;
        }
        return updated;
    }

    // ==================== ALGORITHM ====================

    // Resume-evidence keyword groups used to gauge the depth of a skill.
    private static final String[] EXPERT_KW  = {"expert", "advanced", "proficient", "strong", "extensive", "specializ"};
    private static final String[] PROJECT_KW = {"project", "built", "developed", "implemented", "designed", "architected", "deployed", "production"};
    private static final String[] LEAD_KW    = {"lead", "led", "mentor", "senior", "architect", "managed", "owned"};

    private List<SkillMatrix.SkillMetric> computeMetrics(Candidate candidate) {
        List<String> rawSkills = candidate.getSkills();
        if (rawSkills == null || rawSkills.isEmpty()) return Collections.emptyList();

        // Dedupe (case-insensitive, trim) while preserving order — first occurrence wins
        Set<String> seen = new HashSet<>();
        List<String> skills = new ArrayList<>();
        for (String s : rawSkills) {
            if (s == null) continue;
            String trimmed = s.trim();
            if (trimmed.isEmpty()) continue;
            String key = trimmed.toLowerCase();
            if (seen.add(key)) skills.add(trimmed);
        }
        if (skills.isEmpty()) return Collections.emptyList();

        double years = candidate.getExperience() != null ? candidate.getExperience() : 0.0;

        // Evidence = the candidate's ACTUAL resume text (parsed from the stored file)
        // plus the structured fields. The skills list also feeds the haystack, so
        // every skill appears at least once; genuine usage shows up as extra mentions.
        String resumeText = extractResumeText(candidate);
        boolean haveResumeText = !resumeText.isBlank();
        String haystack = (resumeText + " " + buildHaystack(candidate)).toLowerCase();

        // Seniority lifts every skill's confidence, capped at 20 (≈7+ yrs).
        double expPts = Math.min(20.0, years * 3.0);

        List<SkillMatrix.SkillMetric> metrics = new ArrayList<>();
        for (String skill : skills) {
            String s = skill.toLowerCase();

            // Mentions beyond the single skills-list entry are real evidence of usage.
            int evidenceMentions = Math.max(0, countOccurrences(haystack, s) - 1);
            double freqPts = haveResumeText
                    ? Math.min(36.0, evidenceMentions * 12.0)   // 1→12, 2→24, 3+→36
                    : 6.0;                                       // no resume text to differentiate

            double ctxPts = 0;
            if (mentionedNear(haystack, s, EXPERT_KW, 60))  ctxPts += 14;
            if (mentionedNear(haystack, s, PROJECT_KW, 80)) ctxPts += 10;
            if (mentionedNear(haystack, s, LEAD_KW, 60))    ctxPts += 8;
            if (hasCertification(haystack, s))              ctxPts += 8;
            ctxPts = Math.min(26.0, ctxPts);

            double total = 30.0 + freqPts + ctxPts + expPts;
            int pct = (int) Math.round(Math.max(10, Math.min(99, total)));

            SkillMatrix.SkillMetric m = new SkillMatrix.SkillMetric();
            m.setSkill(skill);
            m.setPercentage(pct);
            m.setConfidence(pct >= 80 ? "High" : pct >= 50 ? "Medium" : "Low");
            metrics.add(m);
        }

        metrics.sort((a, b) -> Integer.compare(b.getPercentage(), a.getPercentage()));
        return metrics;
    }

    /**
     * Parse the candidate's stored resume to plain text so skill proficiency can be
     * measured from real content. Returns "" when there's no resume on file or the
     * file can't be text-extracted (e.g. an image-only scan), in which case the
     * scorer falls back to experience-based estimates.
     */
    private String extractResumeText(Candidate candidate) {
        String resumeId = candidate.getResumeId();
        if (resumeId == null || resumeId.isBlank()) return "";
        try {
            return resumeRepository.findById(resumeId)
                    .map(com.recruitai.agent.entity.Resume::getData)
                    .filter(data -> data != null && data.length > 0)
                    .map(data -> {
                        try {
                            String txt = new org.apache.tika.Tika()
                                    .parseToString(new java.io.ByteArrayInputStream(data));
                            return txt == null ? "" : txt;
                        } catch (Exception ex) {
                            return "";
                        }
                    })
                    .orElse("");
        } catch (Exception e) {
            logger.debug("Resume text extraction failed for matrix ({}): {}", candidate.getId(), e.getMessage());
            return "";
        }
    }

    // ---------------- Components ----------------

    private boolean hasCertification(String haystack, String skill) {
        return mentionedNear(haystack, skill, new String[]{"certif", "certified"}, 60);
    }

    // ---------------- Helpers ----------------

    private String buildHaystack(Candidate c) {
        StringBuilder sb = new StringBuilder();
        append(sb, c.getSummary());
        append(sb, c.getRole());
        append(sb, c.getCurrentOrganization());
        append(sb, c.getRecentlyAppliedCompanies());
        append(sb, c.getReasonForChange());
        append(sb, c.getJobAssignedBy());
        if (c.getEducation() != null) for (String e : c.getEducation()) append(sb, e);
        if (c.getLanguageSkills() != null) for (String l : c.getLanguageSkills()) append(sb, l);
        if (c.getSkills() != null) for (String s : c.getSkills()) append(sb, s);
        return sb.toString().toLowerCase();
    }

    private void append(StringBuilder sb, String value) {
        if (value != null && !value.isBlank()) sb.append(value).append(' ');
    }

    private int countOccurrences(String haystack, String needle) {
        if (haystack == null || needle == null || haystack.isEmpty() || needle.isEmpty()) return 0;
        int count = 0, idx = 0;
        while ((idx = haystack.indexOf(needle, idx)) != -1) {
            count++;
            idx += needle.length();
        }
        return count;
    }

    /** True if `skill` appears in `haystack` within `proximity` chars of any keyword. */
    private boolean mentionedNear(String haystack, String skill, String[] keywords, int proximity) {
        if (haystack.isEmpty() || skill.isEmpty()) return false;
        int idx = haystack.indexOf(skill);
        while (idx != -1) {
            int from = Math.max(0, idx - proximity);
            int to = Math.min(haystack.length(), idx + skill.length() + proximity);
            String window = haystack.substring(from, to);
            for (String kw : keywords) {
                if (window.contains(kw)) return true;
            }
            idx = haystack.indexOf(skill, idx + skill.length());
        }
        return false;
    }
}
