package com.recruitai.agent.service;

import com.recruitai.agent.entity.Candidate;
import com.recruitai.agent.entity.Job;
import com.recruitai.agent.entity.SkillWeight;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Deterministic ATS fit score calculator.
 *
 *   skillsScore (75%) = matched / totalRequired * 75
 *   experienceScore (25%) = min(candidateExp / requiredExp, 1) * 25
 *   fitScore = round(skillsScore + experienceScore)
 *
 * Skills matching is case-insensitive, whitespace-trimmed, and deduplicated.
 * Missing job/candidate data is handled gracefully (returns zero).
 */
@Service
public class FitScoreService {

    private static final Pattern NUMERIC = Pattern.compile("(\\d+(?:\\.\\d+)?)");

    /** Result holder — mirrors the JSON shape the spec requires. */
    public static class FitScoreResult {
        private final double skillsPercentage;
        private final double experiencePercentage;
        private final int fitScore;

        public FitScoreResult(double skillsPercentage, double experiencePercentage, int fitScore) {
            this.skillsPercentage = skillsPercentage;
            this.experiencePercentage = experiencePercentage;
            this.fitScore = fitScore;
        }

        public double getSkillsPercentage()     { return skillsPercentage; }
        public double getExperiencePercentage() { return experiencePercentage; }
        public int getFitScore()                { return fitScore; }
    }

    /**
     * Convenience: just the integer score. Safe to call with nulls.
     */
    public int calculateFitScore(Candidate candidate, Job job) {
        return calculateATSFitScore(candidate, job).getFitScore();
    }

    /**
     * Pick the best-fitting job for a candidate from the supplied list.
     * Returns null if the list is empty or the candidate scores 0 against every job.
     * Ties are broken in iteration order (first highest wins).
     */
    public Job findBestJobMatch(Candidate candidate, List<Job> jobs) {
        if (candidate == null || jobs == null || jobs.isEmpty()) return null;

        Job best = null;
        int bestScore = -1;
        for (Job job : jobs) {
            if (job == null) continue;
            int score = calculateFitScore(candidate, job);
            if (score > bestScore) {
                bestScore = score;
                best = job;
            }
        }
        // A 0% match across every job means none of them are appropriate — leave unassigned
        return bestScore > 0 ? best : null;
    }

    /**
     * Full breakdown. Returns zeros when there isn't enough data to score.
     */
    public FitScoreResult calculateATSFitScore(Candidate candidate, Job job) {
        if (candidate == null || job == null) {
            return new FitScoreResult(0, 0, 0);
        }

        double skillsPercentage     = computeSkillsPercentage(candidate, job);
        double experiencePercentage = computeExperiencePercentage(candidate, job);

        double skillsScore     = (skillsPercentage     * 75.0) / 100.0;
        double experienceScore = (experiencePercentage * 25.0) / 100.0;

        int fitScore = (int) Math.round(skillsScore + experienceScore);
        if (fitScore < 0)   fitScore = 0;
        if (fitScore > 100) fitScore = 100;

        return new FitScoreResult(skillsPercentage, experiencePercentage, fitScore);
    }

    // ---------- Skills ----------

    private double computeSkillsPercentage(Candidate candidate, Job job) {
        Set<String> required = normalizeSkillNames(extractJobSkillNames(job));
        if (required.isEmpty()) return 0.0;

        Set<String> candidateSkills = normalizeSkillNames(candidate.getSkills());
        if (candidateSkills.isEmpty()) return 0.0;

        long matched = required.stream()
                .filter(req -> candidateSkills.stream().anyMatch(cand -> skillsMatch(req, cand)))
                .count();

        return (matched * 100.0) / required.size();
    }

    /**
     * Lenient skill matching used in addition to the case-insensitive trim from {@link #normalizeSkillNames}:
     *   - "Java script"   ↔ "JavaScript"       (whitespace/punctuation stripped on both sides)
     *   - "Spring boot"   ↔ "Spring Boot"      (substring after normalization)
     *   - "UI"            ↔ "UI Design"        (substring)
     *   - "Node.js"       ↔ "Node"             (substring after stripping punctuation)
     * Returns false if either input collapses to empty after normalization.
     */
    private boolean skillsMatch(String a, String b) {
        if (a == null || b == null) return false;
        String alphaNumA = stripNonAlphaNum(a);
        String alphaNumB = stripNonAlphaNum(b);
        if (alphaNumA.isEmpty() || alphaNumB.isEmpty()) return false;
        if (alphaNumA.equals(alphaNumB)) return true;
        return alphaNumA.contains(alphaNumB) || alphaNumB.contains(alphaNumA);
    }

    private String stripNonAlphaNum(String s) {
        return s.toLowerCase().replaceAll("[^a-z0-9]", "");
    }

    private List<String> extractJobSkillNames(Job job) {
        if (job.getSkills() == null) return java.util.Collections.emptyList();
        return job.getSkills().stream()
                .map(SkillWeight::getName)
                .collect(Collectors.toList());
    }

    private Set<String> normalizeSkillNames(List<String> raw) {
        if (raw == null) return new HashSet<>();
        Set<String> out = new HashSet<>();
        for (String s : raw) {
            if (s == null) continue;
            String trimmed = s.trim().toLowerCase();
            if (!trimmed.isEmpty()) out.add(trimmed);
        }
        return out;
    }

    // ---------- Experience ----------

    private double computeExperiencePercentage(Candidate candidate, Job job) {
        double required = parseRequiredExperience(job);
        if (required <= 0) {
            // No experience requirement → any candidate scores full marks here
            return 100.0;
        }
        Double candExp = candidate.getExperience();
        // Treat null OR negative (corrupt) experience as zero — never let bad
        // data produce a negative score component that drags fitScore down.
        double cand = (candExp == null || candExp < 0) ? 0.0 : candExp;

        if (cand >= required) return 100.0;
        return (cand / required) * 100.0;
    }

    /**
     * Job stores experience as a free-form string ("Mid-Senior", "3-5 years", "Entry Level", "2+ years").
     * We use the same heuristic as Job.getMinExperience() — keyword first, numeric fallback.
     */
    private double parseRequiredExperience(Job job) {
        String level = job.getExperienceLevel();
        if (level == null || level.trim().isEmpty()) return 0.0;
        String lower = level.toLowerCase();

        if (lower.contains("entry") || lower.contains("fresher") || lower.contains("junior")) return 0.0;
        if (lower.contains("senior") || lower.contains("lead")) return 5.0;
        if (lower.contains("mid")) return 2.0;

        Matcher m = NUMERIC.matcher(level);
        if (m.find()) {
            try {
                return Double.parseDouble(m.group(1));
            } catch (NumberFormatException ignored) {}
        }
        return 0.0;
    }
}
