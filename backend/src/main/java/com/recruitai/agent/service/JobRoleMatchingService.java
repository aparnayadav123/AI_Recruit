package com.recruitai.agent.service;

import com.recruitai.agent.entity.Candidate;
import com.recruitai.agent.entity.Job;
import com.recruitai.agent.repository.JobRepository;
import com.recruitai.agent.util.SkillNormalizer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Intelligent job role matching based on skills and experience
 * Implements 60% minimum skill overlap threshold with weighted ranking
 */
@Service
public class JobRoleMatchingService {

    private static final Logger logger = LoggerFactory.getLogger(JobRoleMatchingService.class);

    @Autowired
    private JobRepository jobRepository;

    // Minimum skill overlap percentage for role consideration
    private static final double MIN_SKILL_OVERLAP = 0.60; // 60%

    // Weighted scoring factors
    private static final double SKILL_WEIGHT = 0.50; // 50%
    private static final double EXPERIENCE_WEIGHT = 0.30; // 30%
    private static final double EDUCATION_WEIGHT = 0.20; // 20%

    /**
     * Match candidate to best job role
     * 
     * @param candidate Candidate to match
     * @return JobMatchResult with matched job and confidence score, or null if no
     *         match
     */
    public JobMatchResult matchCandidateToJob(Candidate candidate) {
        if (candidate == null || candidate.getSkills() == null || candidate.getSkills().isEmpty()) {
            logger.warn("Cannot match candidate with no skills");
            return null;
        }

        List<Job> allJobs = jobRepository.findAll();
        if (allJobs.isEmpty()) {
            logger.warn("No jobs available for matching");
            return null;
        }

        List<JobMatchResult> matches = new ArrayList<>();

        for (Job job : allJobs) {
            JobMatchResult result = calculateMatch(candidate, job);

            // Only consider jobs meeting minimum threshold
            if (result != null && result.getSkillMatchPercentage() >= MIN_SKILL_OVERLAP) {
                matches.add(result);
                logger.debug("Job {} meets threshold: skill={}%, total score={}",
                        job.getTitle(),
                        Math.round(result.getSkillMatchPercentage() * 100),
                        Math.round(result.getTotalScore()));
            }
        }

        if (matches.isEmpty()) {
            logger.info("No jobs meet 60% skill overlap threshold for candidate: {}", candidate.getName());
            return null;
        }

        // Sort by total score descending
        matches.sort((a, b) -> Double.compare(b.getTotalScore(), a.getTotalScore()));

        JobMatchResult bestMatch = matches.get(0);
        logger.info("Best match for {}: {} (score: {}, confidence: {})",
                candidate.getName(),
                bestMatch.getJob().getTitle(),
                Math.round(bestMatch.getTotalScore()),
                bestMatch.getConfidenceLevel());

        return bestMatch;
    }

    /**
     * Calculate match score between candidate and job
     */
    private JobMatchResult calculateMatch(Candidate candidate, Job job) {
        if (job.getRequiredSkills() == null || job.getRequiredSkills().isEmpty()) {
            return null;
        }

        // Normalize skills for comparison
        Set<String> candidateSkills = normalizeSkills(candidate.getSkills());
        Set<String> jobSkills = normalizeSkills(job.getRequiredSkills());

        // Calculate skill match percentage
        long matchingSkills = candidateSkills.stream()
                .filter(jobSkills::contains)
                .count();

        double skillMatchPercentage = (double) matchingSkills / jobSkills.size();
        double skillScore = skillMatchPercentage * 100;

        // Calculate experience match score
        double experienceScore = calculateExperienceScore(candidate.getExperience(), job.getMinExperience());

        // Calculate education match score
        double educationScore = calculateEducationScore(candidate.getEducation(), job.getEducationRequirement());

        // Calculate weighted total score
        double totalScore = (skillScore * SKILL_WEIGHT) +
                (experienceScore * EXPERIENCE_WEIGHT) +
                (educationScore * EDUCATION_WEIGHT);

        // Determine confidence level
        String confidenceLevel = getConfidenceLevel(totalScore);

        return new JobMatchResult(job, skillMatchPercentage, skillScore, experienceScore,
                educationScore, totalScore, confidenceLevel, matchingSkills);
    }

    /**
     * Calculate experience match score (0-100)
     */
    private double calculateExperienceScore(Double candidateExp, Double requiredExp) {
        if (candidateExp == null)
            candidateExp = 0.0;
        if (requiredExp == null)
            requiredExp = 0.0;

        if (requiredExp == 0) {
            return 100.0; // No experience required
        }

        if (candidateExp >= requiredExp) {
            // Candidate meets or exceeds requirement
            return 100.0;
        } else {
            // Partial credit for partial experience
            return (candidateExp / requiredExp) * 100.0;
        }
    }

    /**
     * Calculate education match score (0-100)
     */
    private double calculateEducationScore(List<String> candidateEducation, String requiredEducation) {
        if (requiredEducation == null || requiredEducation.trim().isEmpty()) {
            return 100.0; // No education requirement
        }

        if (candidateEducation == null || candidateEducation.isEmpty()) {
            return 0.0; // No education provided
        }

        // Simple keyword matching for education
        String reqLower = requiredEducation.toLowerCase();
        for (String edu : candidateEducation) {
            if (edu != null && edu.toLowerCase().contains(reqLower)) {
                return 100.0; // Exact match
            }
        }

        // Partial matching logic
        if (reqLower.contains("bachelor") || reqLower.contains("b.tech") || reqLower.contains("b.e")) {
            for (String edu : candidateEducation) {
                String eduLower = edu.toLowerCase();
                if (eduLower.contains("bachelor") || eduLower.contains("b.tech") ||
                        eduLower.contains("b.e") || eduLower.contains("master") ||
                        eduLower.contains("m.tech") || eduLower.contains("phd")) {
                    return 80.0; // Similar level
                }
            }
        }

        return 50.0; // Default partial credit
    }

    /**
     * Normalize skills for case-insensitive comparison
     */
    private Set<String> normalizeSkills(List<String> skills) {
        if (skills == null) {
            return new HashSet<>();
        }

        return skills.stream()
                .map(SkillNormalizer::normalizeSkill)
                .collect(Collectors.toSet());
    }

    /**
     * Get confidence level based on total score
     */
    private String getConfidenceLevel(double totalScore) {
        if (totalScore >= 80) {
            return "High";
        } else if (totalScore >= 60) {
            return "Medium";
        } else {
            return "Low";
        }
    }

    /**
     * Match result class
     */
    public static class JobMatchResult {
        private final Job job;
        private final double skillMatchPercentage;
        private final double skillScore;
        private final double experienceScore;
        private final double educationScore;
        private final double totalScore;
        private final String confidenceLevel;
        private final long matchingSkillsCount;

        public JobMatchResult(Job job, double skillMatchPercentage, double skillScore,
                double experienceScore, double educationScore, double totalScore,
                String confidenceLevel, long matchingSkillsCount) {
            this.job = job;
            this.skillMatchPercentage = skillMatchPercentage;
            this.skillScore = skillScore;
            this.experienceScore = experienceScore;
            this.educationScore = educationScore;
            this.totalScore = totalScore;
            this.confidenceLevel = confidenceLevel;
            this.matchingSkillsCount = matchingSkillsCount;
        }

        // Getters
        public Job getJob() {
            return job;
        }

        public double getSkillMatchPercentage() {
            return skillMatchPercentage;
        }

        public double getSkillScore() {
            return skillScore;
        }

        public double getExperienceScore() {
            return experienceScore;
        }

        public double getEducationScore() {
            return educationScore;
        }

        public double getTotalScore() {
            return totalScore;
        }

        public String getConfidenceLevel() {
            return confidenceLevel;
        }

        public long getMatchingSkillsCount() {
            return matchingSkillsCount;
        }
    }
}
