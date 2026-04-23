package com.recruitai.agent.service;

import com.recruitai.agent.entity.Job;
import com.recruitai.agent.parser.model.ParsedResume;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class JobRoleMatcher {

    public static class MatchResult {
        private String roleName;
        private int score;
        private String matchReason;
        private Job job;

        public MatchResult(String roleName, int score, String matchReason, Job job) {
            this.roleName = roleName;
            this.score = score;
            this.matchReason = matchReason;
            this.job = job;
        }

        public String getRoleName() {
            return roleName;
        }

        public int getScore() {
            return score;
        }

        public String getMatchReason() {
            return matchReason;
        }

        public Job getJob() {
            return job;
        }
    }

    public MatchResult findBestMatch(ParsedResume resume, List<Job> activeJobs) {
        if (activeJobs == null || activeJobs.isEmpty()) {
            return new MatchResult("Not Matched", 0, "No active jobs available", null);
        }

        MatchResult bestMatch = new MatchResult("Not Matched", 0, "Insufficient Skill Match", null);

        // Normalize Candidate Data
        List<String> candidateSkills = resume.getSkills() != null ? resume.getSkills() : Collections.emptyList();
        Set<String> normalizedCandidateSkills = candidateSkills.stream()
                .map(String::toLowerCase)
                .map(String::trim)
                .collect(Collectors.toSet());

        Double candidateExp = resume.getExperience() != null ? resume.getExperience() : 0.0;

        for (Job job : activeJobs) {
            List<String> requiredSkills = job.getRequiredSkills();
            if (requiredSkills.isEmpty())
                continue; // Skip jobs with no requirements? Or match all? Assume strict.

            // 1. Calculate Skill Match
            long matchCount = 0;
            List<String> matchedSkillNames = new ArrayList<>();
            for (String req : requiredSkills) {
                String reqLower = req.toLowerCase().trim();
                // Check exact or partial match
                if (normalizedCandidateSkills.stream()
                        .anyMatch(s -> s.equals(reqLower) || s.contains(reqLower) || reqLower.contains(s))) {
                    matchCount++;
                    matchedSkillNames.add(req);
                }
            }

            double matchPercent = (double) matchCount / requiredSkills.size();
            double skillScore = matchPercent * 100.0;

            // 2. Experience Bonus
            // +10% if experience >= job minimum experience
            double expBonus = 0.0;
            Double minExp = job.getMinExperience(); // Safe accessor I verified
            if (minExp != null && candidateExp >= minExp) { // Added null check for minExp
                expBonus = 10.0;
            }

            // 3. Final Fit Score
            // Min(100, Skill Score + Experience Bonus)
            int fitScore = (int) Math.min(100, skillScore + expBonus);

            // 4. Strict Matching Rule
            // Match ONLY if: >= 50% of required job skills match
            // OR candidate has prior role experience (Skipping simple string match for now,
            // relying on skills)
            boolean isMatch = matchPercent >= 0.50;

            if (isMatch) {
                // If fits, check if better than current best
                if (fitScore > bestMatch.getScore()) {
                    String reason = String.format("Matched %d/%d Skills: %s. Exp Bonus: %.0f%%",
                            matchCount, requiredSkills.size(),
                            matchedSkillNames.stream().limit(5).collect(Collectors.joining(", ")),
                            expBonus);

                    bestMatch = new MatchResult(job.getTitle(), fitScore, reason, job);
                }
            }
        }

        // 5. Threshold Rule
        if (bestMatch.getScore() < 40) {
            return new MatchResult("Not Matched", 0, "Best match below 40% threshold", null);
        }

        return bestMatch;
    }

    // Kept for backward compatibility if needed, or legacy fallback
    public MatchResult findRoleFromMatrix(ParsedResume resume) {
        return new MatchResult("Not Matched", 0, "Legacy method deprecated", null);
    }
}
