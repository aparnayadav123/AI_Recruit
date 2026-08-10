package com.recruitai.agent.service;

import com.recruitai.agent.entity.Candidate;
import com.recruitai.agent.entity.Resume;
import com.recruitai.agent.parser.ResumeParserAgent;
import com.recruitai.agent.parser.model.ParsedResume;
import com.recruitai.agent.repository.CandidateRepository;
import com.recruitai.agent.repository.ResumeRepository;
import org.apache.tika.Tika;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import com.recruitai.agent.ats.service.GeminiAgentService;
// Wait, I see other fully qualified names in the file lines 42, 45.
// Let's just add the specific import for GeminiAgentService and fix line 39 first.

@Service
@Transactional
public class ResumeService implements org.springframework.beans.factory.InitializingBean {

    private static final Logger logger = LoggerFactory.getLogger(ResumeService.class);

    @Autowired
    private ResumeRepository resumeRepository;

    @Autowired
    private CandidateRepository candidateRepository;

    @Autowired
    private ResumeParserAgent parserAgent;

    @Autowired
    private GeminiAgentService geminiAgentService;

    @Autowired
    private com.recruitai.agent.repository.AuditLogRepository auditLogRepository;

    @Autowired
    private com.recruitai.agent.repository.JobRepository jobRepository;

    @Autowired
    private PhoneExtractionService phoneExtractionService;

    @Autowired
    private SkillMatrixService skillMatrixService;

    @Autowired
    private ResumeEnrichmentService enrichmentService;

    @Autowired
    private com.recruitai.agent.parser.DeterministicResumeParser deterministicParser;

    @Autowired
    private SequenceService sequenceService;

    @Autowired
    private FitScoreService fitScoreService;

    @Autowired
    private com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    /**
     * PRODUCTION CLEANUP: Automatically delete invalid "NOT_FOUND" records on
     * startup.
     */
    @Override
    public void afterPropertiesSet() throws Exception {
        logger.info("Executing Production Cleanup: Removing invalid candidates...");
        List<Candidate> invalidCandidates = candidateRepository.findAll().stream()
                .filter(c -> c.getName() == null
                        || c.getName().contains("NOT_FOUND")
                        || "Unknown Candidate".equalsIgnoreCase(c.getName())
                        || (c.getEmail() == null || c.getEmail().contains("placeholder")))
                .collect(java.util.stream.Collectors.toList());

        if (!invalidCandidates.isEmpty()) {
            candidateRepository.deleteAll(invalidCandidates);
            logger.info("CLEANUP SUCCESS: Deleted " + invalidCandidates.size() + " invalid/ghost candidates.");
        } else {
            logger.info("CLEANUP: System is clean.");
        }
    }

    public Candidate uploadAndParseResume(MultipartFile file, String source) throws IOException {
        return uploadAndParseResume(file, source, null, null);
    }

    /**
     * Attach an uploaded resume to an EXISTING candidate (the one open on the
     * candidate-details page) and re-score them from it. Unlike
     * {@link #uploadAndParseResume}, this never matches/creates a candidate by the
     * resume's email — the candidate's identity (name, email, CANxxx id) is
     * preserved. Parsed fields fill in gaps; skills are merged (union) so nothing
     * already known is lost; then the skill matrix is regenerated against the real
     * resume text.
     */
    public Candidate attachResumeToCandidate(MultipartFile file, String candidateId, String source, String assignedBy)
            throws IOException {
        Candidate candidate = candidateRepository.findById(candidateId)
                .orElseThrow(() -> new com.recruitai.agent.exception.ResourceNotFoundException("Candidate", candidateId));

        // Store the uploaded file
        Resume resume = new Resume();
        resume.setId("RES-" + UUID.randomUUID().toString().substring(0, 8));
        resume.setFileName(file.getOriginalFilename());
        resume.setContentType(file.getContentType());
        resume.setSize(file.getSize());
        resume.setData(file.getBytes());
        resume.setSource(source != null ? source : "UPLOAD");
        resumeRepository.save(resume);

        // Extract text for parsing + later skill-matrix evidence
        String text = "";
        try {
            text = new Tika().parseToString(new ByteArrayInputStream(file.getBytes()));
            if (text == null) text = "";
        } catch (Exception e) {
            logger.error("Resume text extraction failed", e);
        }
        if (text.length() < 10 || isPoisoned(text)) text = "";

        ParsedResume parsed = deterministicParser.parse(text);

        // Attach + enrich the existing row only — fill gaps, never overwrite identity.
        candidate.setResumeId(resume.getId());

        java.util.List<String> mergedSkills = new java.util.ArrayList<>();
        java.util.Set<String> seenSkills = new java.util.HashSet<>();
        for (java.util.List<String> src : java.util.Arrays.asList(candidate.getSkills(), parsed.getSkills())) {
            if (src == null) continue;
            for (String sk : src) {
                if (sk == null) continue;
                String t = sk.trim();
                if (!t.isEmpty() && seenSkills.add(t.toLowerCase())) mergedSkills.add(t);
            }
        }
        if (!mergedSkills.isEmpty()) candidate.setSkills(mergedSkills);

        if (parsed.getExperience() != null && (candidate.getExperience() == null || candidate.getExperience() == 0.0)) {
            candidate.setExperience(parsed.getExperience());
        }
        if ((candidate.getEducation() == null || candidate.getEducation().isEmpty()) && parsed.getEducation() != null) {
            candidate.setEducation(parsed.getEducation());
        }
        if (candidate.getPhone() == null || candidate.getPhone().isBlank()) {
            candidate.setPhone(phoneExtractionService.extractPhone(text, parsed.getAuditLog()));
        }
        if ((candidate.getSummary() == null || candidate.getSummary().isBlank()) && parsed.getSummary() != null) {
            candidate.setSummary(parsed.getSummary());
        }
        if ((candidate.getVisaType() == null || candidate.getVisaType().isBlank()) && parsed.getVisaType() != null) {
            candidate.setVisaType(parsed.getVisaType());
        }
        String attachLinkedin = extractLinkedinUrl(text);
        if (attachLinkedin != null && (candidate.getLinkedinUrl() == null || candidate.getLinkedinUrl().isBlank())) {
            candidate.setLinkedinUrl(attachLinkedin);
        }
        if (assignedBy != null && !assignedBy.trim().isEmpty()) {
            candidate.setUploadedBy(assignedBy);
        }
        // Merged skills may change the best-fit job; ensure a real score is set.
        ensureFitScore(candidate);
        candidate.setUpdatedAt(LocalDateTime.now());
        candidateRepository.save(candidate);

        // Regenerate the skill matrix — now backed by the candidate's real resume text.
        try {
            skillMatrixService.calculateAndSave(candidate, candidate.getJobId());
        } catch (Exception e) {
            logger.error("Failed to regenerate Skill Matrix for {}: {}", candidate.getName(), e.getMessage());
        }

        return candidate;
    }

    public Candidate uploadAndParseResume(MultipartFile file, String source, String jobId, String assignedBy) throws IOException {

        Resume resume = new Resume();
        resume.setId("RES-" + UUID.randomUUID().toString().substring(0, 8));
        resume.setFileName(file.getOriginalFilename());
        resume.setContentType(file.getContentType());
        resume.setSize(file.getSize());
        resume.setData(file.getBytes());
        resume.setSource(source);
        resumeRepository.save(resume);

        String text = "";
        try {
            text = new Tika().parseToString(new ByteArrayInputStream(file.getBytes()));
            if (text == null)
                text = "";
        } catch (Exception e) {
            logger.error("Resume text extraction failed", e);
        }

        // Clean text if it looks like binary garbage
        if (text.length() < 10 || isPoisoned(text)) {
            text = "";
        }

        // 1. PARSE (Deterministic only — regex/dictionary, no API calls).
        // The heavier Gemini parse runs asynchronously after the candidate is saved
        // so the upload request returns in under a second.
        long tParse = System.currentTimeMillis();
        ParsedResume parsed = deterministicParser.parse(text);
        logger.info("Deterministic parse complete in {} ms", System.currentTimeMillis() - tParse);

        // VALIDATION: a recruiter uploading a resume directly (source=UPLOAD) still needs a
        // parseable file. But an applicant submitting through a careers form has ALREADY typed
        // their name/email — the caller overrides those on the candidate right after creation
        // — so we must NEVER drop their application just because the file didn't parse. For any
        // external source we fall through to the placeholder name/email handled just below.
        boolean externalApplication = source != null && !source.isBlank()
                && !"UPLOAD".equalsIgnoreCase(source.trim());
        if (parsed.getName() == null && parsed.getEmail() == null && !externalApplication) {
            throw new RuntimeException("Validation Failed: Could not extract Name or Email from resume.");
        }

        // 6-MONTH COOL-DOWN: once a candidate has applied to ANY job at the
        // company, they can't re-apply for six months. After that window the
        // upload is allowed and updates the existing candidate row (preserving
        // their CANxxx id). Boundary: company-wide, not per-job.
        if (parsed.getEmail() != null) {
            java.util.Optional<Candidate> existing = candidateRepository.findByEmail(parsed.getEmail());
            if (existing.isPresent()) {
                Candidate prior = existing.get();
                LocalDateTime lastApplied = prior.getUpdatedAt() != null
                        ? prior.getUpdatedAt()
                        : prior.getCreatedAt();
                if (lastApplied != null) {
                    LocalDateTime reopenAt = lastApplied.plusMonths(6);
                    if (LocalDateTime.now().isBefore(reopenAt)) {
                        java.time.format.DateTimeFormatter fmt =
                            java.time.format.DateTimeFormatter.ofPattern("d MMM yyyy");
                        throw new RuntimeException(
                            "You applied on " + lastApplied.toLocalDate().format(fmt)
                            + ". Re-applications open on " + reopenAt.toLocalDate().format(fmt) + ".");
                    }
                }
            }
        }

        // 3. JOB MATCHING & ROLE ASSIGNMENT (Determined before creating/loading
        // candidate)
        String lookupEmail = (parsed.getEmail() != null) ? parsed.getEmail()
                : "pending-" + resume.getId() + "@placeholder.com";
        String candidateName = parsed.getName();
        if (candidateName == null || candidateName.trim().isEmpty()) {
            String safeName = (file.getOriginalFilename() != null) ? file.getOriginalFilename() : "Unknown_Resume";
            if (safeName.contains("."))
                safeName = safeName.substring(0, safeName.lastIndexOf('.'));
            candidateName = safeName.replace("_", " ").replace("-", " ");
        }

        // Create a temporary candidate to run matching logic
        Candidate tempMatch = new Candidate();
        tempMatch.setName(candidateName);
        tempMatch.setEmail(lookupEmail);
        tempMatch.setSkills(parsed.getSkills());
        tempMatch.setExperience(parsed.getExperience());

        // Fast deterministic role/job match only — Gemini fit-score runs async.
        try {
            if (!jobRepository.findAll().isEmpty()) {
                performDeterministicMatch(tempMatch);
            }
        } catch (Exception e) {
            logger.error("Role matching failure: {}", e.getMessage());
        }

        // 4. GET OR CREATE CANDIDATE
        // If a row already exists for this email, the 6-month cool-down check
        // above has already confirmed the previous application is older than
        // 6 months, so we recycle the same row (preserves CANxxx) and just
        // point it at the new job. Otherwise create fresh.
        String assignedJobId = tempMatch.getJobId();
        Candidate candidate = (parsed.getEmail() != null)
                ? candidateRepository.findByEmail(parsed.getEmail()).orElse(null)
                : candidateRepository.findByEmailAndJobId(lookupEmail, assignedJobId).orElse(null);

        if (candidate != null) {
            logger.info("Updating existing application for {} - Job: {}", lookupEmail, assignedJobId);
            // Re-uploading for SAME JOB: Reset status to New
            candidate.setStatus("New");
            candidate.setInterviewDate(null);
            candidate.setInterviewTime(null);
            candidate.setInterviewType(null);
            candidate.setInterviewNotes(null);
            candidate.setInterviewMeetingLink(null);
        } else {
            logger.info("Creating new application record for {} - Job: {}", lookupEmail, assignedJobId);
            candidate = new Candidate();
            candidate.setId("CAN-" + UUID.randomUUID().toString().substring(0, 8));
            candidate.setCreatedAt(LocalDateTime.now());
            candidate.setStatus("New");
            // Smallest unused number → consecutive, gap-free IDs (reclaims freed slots).
            candidate.setSequenceId(sequenceService.nextConsecutiveSeq());
        }

        // Apply metadata and matched data
        candidate.setName(candidateName);
        candidate.setEmail(parsed.getEmail() != null ? parsed.getEmail() : lookupEmail);
        candidate.setSkills(parsed.getSkills());
        candidate.setExperience(parsed.getExperience());
        candidate.setEducation(parsed.getEducation());
        candidate.setPhone(phoneExtractionService.extractPhone(text, parsed.getAuditLog()));
        candidate.setSource(source);
        candidate.setResumeId(resume.getId());
        candidate.setUpdatedAt(LocalDateTime.now());
        candidate.setVisaType(parsed.getVisaType());
        candidate.setVisaValidity(parsed.getVisaValidity());
        candidate.setReasonForChange(parsed.getReasonForChange());
        candidate.setRecentlyAppliedCompanies(parsed.getRecentlyAppliedCompanies());
        candidate.setSummary(parsed.getSummary());
        String linkedinUrl = extractLinkedinUrl(text);
        if (linkedinUrl != null) {
            candidate.setLinkedinUrl(linkedinUrl);
        }

        if (assignedBy != null && !assignedBy.trim().isEmpty()) {
            candidate.setAssignedBy(assignedBy);
            candidate.setUploadedBy(assignedBy);
        }

        // Copy match results from tempMatch
        candidate.setJobId(tempMatch.getJobId());
        candidate.setRole(tempMatch.getRole());
        candidate.setFitScore(tempMatch.getFitScore());
        candidate.setMatchReason(tempMatch.getMatchReason());
        if (tempMatch.getJobId() != null) {
            candidate.setJobAssignedBy("AI");
        }
        candidate.setShortlisted(candidate.getFitScore() >= 70);

        if (parsed.getConfidenceScore() != null) {
            candidate.setConfidenceScore("HIGH".equals(parsed.getConfidenceScore()) ? 90.0 : 40.0);
        }

        // If the strict upload matcher found no job, fall back to the canonical
        // scorer so the candidate still gets a real fit score (not a blank 0).
        ensureFitScore(candidate);

        candidateRepository.save(candidate);

        // Fast deterministic skill matrix so the candidate row is immediately useful.
        try {
            skillMatrixService.calculateAndSave(candidate, candidate.getJobId());
        } catch (Exception e) {
            logger.error("Failed to generate Skill Matrix for {}: {}", candidate.getName(), e.getMessage());
        }

        // Kick off Gemini-backed enrichment off the request thread. The candidate is
        // already saved and visible in the UI; this fills in education, summary,
        // visa fields, an AI-graded fit score, and any extra skills it spots.
        try {
            enrichmentService.enrich(candidate.getId(), text, file.getBytes(), file.getContentType());
        } catch (Exception e) {
            logger.warn("Async enrichment dispatch failed for {}: {}", candidate.getId(), e.getMessage());
        }

        return candidate;
    }

    public Resume getResumeById(String id) {
        return resumeRepository.findById(id).orElse(null);
    }

    /** Delete a single resume blob by id. Returns false if it didn't exist. */
    public boolean deleteResume(String id) {
        if (id == null || !resumeRepository.existsById(id)) return false;
        resumeRepository.deleteById(id);
        return true;
    }

    /**
     * One-shot: re-parse every candidate's stored resume and populate
     * candidate.linkedinUrl when the resume text contains a linkedin.com/in/...
     * link. Used to bring pre-existing candidates up to date with the dynamic
     * extraction added on resume upload. Idempotent — candidates that already
     * have a linkedinUrl are skipped.
     */
    public java.util.Map<String, Object> backfillLinkedinUrls() {
        int scanned = 0, updated = 0, skipped = 0, noResume = 0, noMatch = 0, errored = 0;
        java.util.List<java.util.Map<String, String>> updates = new java.util.ArrayList<>();
        for (Candidate candidate : candidateRepository.findAll()) {
            scanned++;
            if (candidate.getLinkedinUrl() != null && !candidate.getLinkedinUrl().isBlank()) {
                skipped++;
                continue;
            }
            String resumeId = candidate.getResumeId();
            if (resumeId == null || resumeId.isBlank()) {
                noResume++;
                continue;
            }
            Resume resume = resumeRepository.findById(resumeId).orElse(null);
            if (resume == null || resume.getData() == null) {
                noResume++;
                continue;
            }
            try {
                String text = new Tika().parseToString(new ByteArrayInputStream(resume.getData()));
                String url = extractLinkedinUrl(text);
                if (url == null) {
                    noMatch++;
                    continue;
                }
                candidate.setLinkedinUrl(url);
                candidate.setUpdatedAt(LocalDateTime.now());
                candidateRepository.save(candidate);
                updated++;
                java.util.Map<String, String> row = new java.util.HashMap<>();
                row.put("id", candidate.getId());
                row.put("name", candidate.getName());
                row.put("linkedinUrl", url);
                updates.add(row);
            } catch (Exception e) {
                errored++;
                logger.warn("backfillLinkedinUrls: failed for candidate {}: {}", candidate.getId(), e.getMessage());
            }
        }
        java.util.Map<String, Object> result = new java.util.HashMap<>();
        result.put("scanned", scanned);
        result.put("updated", updated);
        result.put("skipped_already_set", skipped);
        result.put("no_resume", noResume);
        result.put("no_linkedin_in_text", noMatch);
        result.put("errored", errored);
        result.put("updates", updates);
        return result;
    }

    public String generateFormattedCv(String resumeId) {
        Resume resume = getResumeById(resumeId);
        if (resume == null)
            return "Resume not found.";

        Candidate candidate = candidateRepository.findAll().stream()
                .filter(c -> resumeId.equals(c.getResumeId()))
                .findFirst().orElse(null);

        String candidateName = (candidate != null) ? candidate.getName() : "Candidate";
        String extractedText = "";
        try {
            extractedText = new Tika().parseToString(new ByteArrayInputStream(resume.getData()));
        } catch (Exception e) {
            logger.warn("Could not extract text for CV formatting, using multimodal fallback.");
        }

        String aiCv;
        try {
            aiCv = geminiAgentService.generateFormattedCv(
                    candidateName,
                    extractedText,
                    resume.getData(),
                    resume.getContentType());
        } catch (Exception e) {
            aiCv = null;
        }
        // When Gemini is unavailable (revoked key / quota), it returns an error
        // sentinel or throws — fall back to a clean deterministic CV so the feature
        // still works instead of showing an error.
        if (aiCv == null || aiCv.isBlank()
                || aiCv.startsWith("Internal Error")
                || aiCv.startsWith("Error formatting CV")) {
            return buildDeterministicCv(candidate, candidateName, extractedText);
        }
        return aiCv;
    }

    /** Offline CV: a clean Markdown résumé built from the stored candidate data +
     *  extracted text, used when the AI formatter is unavailable. */
    private String buildDeterministicCv(Candidate c, String name, String text) {
        StringBuilder sb = new StringBuilder();
        sb.append("# ").append(name != null && !name.isBlank() ? name : "Candidate").append("\n\n");
        if (c != null) {
            java.util.List<String> contact = new java.util.ArrayList<>();
            if (c.getEmail() != null && !c.getEmail().isBlank() && !c.getEmail().startsWith("pending-")) contact.add(c.getEmail());
            if (c.getPhone() != null && !c.getPhone().isBlank() && !"Not Found".equalsIgnoreCase(c.getPhone())) contact.add(c.getPhone());
            if (c.getLocality() != null && !c.getLocality().isBlank()) contact.add(c.getLocality());
            if (!contact.isEmpty()) sb.append(String.join("  |  ", contact)).append("\n\n");
            if (c.getRole() != null && !c.getRole().isBlank()) sb.append("**").append(c.getRole()).append("**\n\n");
            if (c.getSummary() != null && !c.getSummary().isBlank())
                sb.append("## Summary\n\n").append(c.getSummary().trim()).append("\n\n");
            if (c.getSkills() != null && !c.getSkills().isEmpty())
                sb.append("## Core Competencies\n\n")
                  .append(c.getSkills().stream().map(s -> "`" + s + "`").collect(java.util.stream.Collectors.joining(" ")))
                  .append("\n\n");
            if (c.getExperience() != null && c.getExperience() > 0)
                sb.append("## Experience\n\n- ").append(c.getExperience()).append(" years of professional experience\n\n");
            if (c.getEducation() != null && !c.getEducation().isEmpty()) {
                sb.append("## Education\n\n");
                for (String e : c.getEducation()) sb.append("- ").append(e).append("\n");
                sb.append("\n");
            }
        }
        if (text != null && !text.isBlank())
            sb.append("## Full Résumé\n\n").append(text.trim()).append("\n");
        sb.append("\n---\n*Generated by RecruitAI (offline formatting — AI service unavailable).*\n");
        return sb.toString();
    }

    private static final java.util.regex.Pattern LINKEDIN_URL_PATTERN = java.util.regex.Pattern.compile(
        "(?i)(?:https?://)?(?:[a-z]{2,3}\\.)?linkedin\\.com/in/[A-Za-z0-9_-]+(?:/[A-Za-z0-9_-]*)?");

    static String extractLinkedinUrl(String text) {
        if (text == null || text.isBlank()) return null;
        java.util.regex.Matcher m = LINKEDIN_URL_PATTERN.matcher(text);
        if (!m.find()) return null;
        String raw = m.group().trim();
        while (!raw.isEmpty() && ".,;:)]>\"'".indexOf(raw.charAt(raw.length() - 1)) >= 0) {
            raw = raw.substring(0, raw.length() - 1);
        }
        if (!raw.toLowerCase().startsWith("http")) {
            raw = "https://" + raw;
        }
        return raw;
    }

    private boolean isPoisoned(String text) {
        if (text == null || text.isBlank())
            return false;
        if (text.contains("FlateDecode") || text.contains("/Obj") || text.contains("/Filter")
                || text.contains("/Stream"))
            return true;
        long nonAscii = text.chars().filter(c -> c > 127).count();
        double ratio = (double) nonAscii / text.length();
        return ratio > 0.2 || text.length() > 30000;
    }

    /**
     * Deterministic Matching Engine
     * Calculates exact fit scores and ensures correct role assignment from database
     * jobs.
     */
    /**
     * Guarantee a meaningful fit score after upload. The upload-time
     * {@link #performDeterministicMatch} is intentionally strict and can leave a
     * viable candidate "Not Matched" with 0 (e.g. it requires ≥2 covered skills).
     * When that happens, fall back to the canonical {@link FitScoreService} — the
     * same scorer the dashboard, pipeline and deep-rematch use — so the candidate
     * gets the best-fit Open/Active job and its real ATS score instead of a blank 0.
     */
    private void ensureFitScore(com.recruitai.agent.entity.Candidate candidate) {
        Integer fit = candidate.getFitScore();
        boolean unscored = candidate.getJobId() == null || candidate.getJobId().isBlank()
                || fit == null || fit <= 0;
        if (!unscored) return;
        try {
            java.util.List<com.recruitai.agent.entity.Job> openJobs =
                    jobRepository.findByStatusIn(java.util.List.of("Open", "Active"));
            com.recruitai.agent.entity.Job best = fitScoreService.findBestJobMatch(candidate, openJobs);
            if (best != null) {
                candidate.setJobId(best.getId());
                if (candidate.getRole() == null || candidate.getRole().isBlank()
                        || "Not Matched".equalsIgnoreCase(candidate.getRole())) {
                    candidate.setRole(best.getTitle());
                }
                if (candidate.getJobAssignedBy() == null || candidate.getJobAssignedBy().isBlank()) {
                    candidate.setJobAssignedBy("Auto-Match");
                }
                candidate.setFitScore(fitScoreService.calculateFitScore(candidate, best));
                candidate.setMatchReason("Best-fit match: " + best.getTitle());
            }
        } catch (Exception e) {
            logger.warn("Fallback fit-score match failed for {}: {}", candidate.getId(), e.getMessage());
        }
    }

    private void performDeterministicMatch(com.recruitai.agent.entity.Candidate candidate) {
        List<com.recruitai.agent.entity.Job> allJobs = jobRepository.findAll();
        com.recruitai.agent.entity.Job bestJob = null;
        int bestScore = -1;

        List<String> candidateSkills = (candidate.getSkills() != null)
                ? candidate.getSkills().stream().map(String::toLowerCase).map(String::trim)
                        .collect(java.util.stream.Collectors.toList())
                : new java.util.ArrayList<>();

        String aiSuggestedRole = candidate.getRole(); // Role assigned by Gemini initially

        for (com.recruitai.agent.entity.Job job : allJobs) {
            List<String> jobSkills = job.getRequiredSkills().stream()
                    .map(String::toLowerCase).map(String::trim).collect(java.util.stream.Collectors.toList());

            if (jobSkills.isEmpty())
                continue;

            // 1. Calculate Skill Match (Base Score - How many job requirements are
            // covered?)
            long jobSkillsCovered = jobSkills.stream()
                    .filter(js -> candidateSkills.stream().anyMatch(cs -> isSkillMatch(cs, js)))
                    .count();

            double skillCoverage = (double) jobSkillsCovered / jobSkills.size();
            int score = (int) (skillCoverage * 60.0); // Skills are 60% of total score

            // 2. Skill Priority Bonuses (Top 3 skills in job definition)
            int weightedBonus = 0;
            for (int i = 0; i < Math.min(jobSkills.size(), 3); i++) {
                String requiredSkill = jobSkills.get(i);
                if (candidateSkills.stream().anyMatch(s -> isSkillMatch(s, requiredSkill))) {
                    if (i == 0)
                        weightedBonus += 15; // Primary Domain
                    else if (i == 1)
                        weightedBonus += 10; // Secondary
                    else
                        weightedBonus += 5; // Tertiary
                }
            }
            score += weightedBonus;

            // 3. Experience Match (20%)
            Double requiredExp = job.getMinExperience();
            Double candidateExp = (candidate.getExperience() != null) ? candidate.getExperience() : 0.0;

            if (candidateExp >= requiredExp) {
                score += 10;
                double diff = candidateExp - requiredExp;
                score += (int) Math.min(10, diff * 2);
            } else if (candidateExp > 0) {
                score += (int) ((candidateExp / requiredExp) * 10.0);
            }

            // 4. Role Appropriateness
            boolean isInternRole = job.getTitle().toLowerCase().contains("intern")
                    || job.getTitle().toLowerCase().contains("trainee");
            if (candidateExp < 1.0 && !isInternRole) {
                score -= 30;
            } else if (candidateExp >= 2.0 && isInternRole) {
                score -= 40;
            }

            // 5. AI Alignment Bonus (Tie-breaker)
            if (aiSuggestedRole != null && job.getTitle().toLowerCase().contains(aiSuggestedRole.toLowerCase())) {
                score += 10;
            }

            // 6. Hard Kill
            if (jobSkillsCovered == 0 && skillCoverage < 0.20) {
                score = 0;
            }

            score = Math.max(0, Math.min(100, score));

            if (score > bestScore && (score >= 40 || jobSkillsCovered >= 2)) {
                bestScore = score;
                bestJob = job;
            }
        }

        if (bestJob != null) {
            candidate.setJobId(bestJob.getId());
            candidate.setRole(bestJob.getTitle());
            candidate.setFitScore(bestScore);
            candidate.setMatchReason("Verified Match: " + bestJob.getTitle() + " (Requirement coverage Score)");
            logger.info("Deterministic match found: {} ({}%)", bestJob.getTitle(), bestScore);
        } else {
            if ("Not Matched".equalsIgnoreCase(candidate.getRole()) || candidate.getRole() == null
                    || candidate.getFitScore() < 30) {
                candidate.setRole("Not Matched");
                candidate.setFitScore(0);
                candidate.setJobId(null);
                candidate.setMatchReason("No suitable job match found after verification.");
            }
        }
    }

    private boolean isSkillMatch(String cs, String js) {
        if (cs == null || js == null)
            return false;
        cs = cs.toLowerCase().trim();
        js = js.toLowerCase().trim();

        if (cs.equals(js))
            return true;

        // Smart Synonyms for Automation/QA
        if (js.equals("automation") && (cs.contains("selenium") || cs.contains("cucumber") || cs.contains("cypress"))) {
            return true;
        }

        // Word Boundary for short strings (Avoid "SQL" matching "MySQL" too loosely in
        // some contexts)
        if (js.length() <= 3) {
            return cs.equals(js) || cs.startsWith(js + " ") || cs.endsWith(" " + js) || cs.contains(" " + js + " ");
        }

        return cs.contains(js) || js.contains(cs);
    }
}
