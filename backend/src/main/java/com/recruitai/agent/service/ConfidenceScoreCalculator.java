package com.recruitai.agent.service;

import org.springframework.stereotype.Service;

/**
 * Calculate confidence scores for candidate-job matches
 * Formula: (Skill Match × 0.5) + (Experience Match × 0.3) + (Education Match ×
 * 0.2)
 * Categorization: High (80-100), Medium (60-79), Low (<60)
 */
@Service
public class ConfidenceScoreCalculator {

    private static final double SKILL_WEIGHT = 0.50;
    private static final double EXPERIENCE_WEIGHT = 0.30;
    private static final double EDUCATION_WEIGHT = 0.20;

    /**
     * Calculate confidence score
     * 
     * @param skillMatchPercentage      Skill match percentage (0-100)
     * @param experienceMatchPercentage Experience match percentage (0-100)
     * @param educationMatchPercentage  Education match percentage (0-100)
     * @return Confidence score (0-100)
     */
    public double calculate(double skillMatchPercentage, double experienceMatchPercentage,
            double educationMatchPercentage) {
        return (skillMatchPercentage * SKILL_WEIGHT) +
                (experienceMatchPercentage * EXPERIENCE_WEIGHT) +
                (educationMatchPercentage * EDUCATION_WEIGHT);
    }

    /**
     * Get confidence level category
     * 
     * @param score Confidence score (0-100)
     * @return "High", "Medium", or "Low"
     */
    public String getConfidenceLevel(double score) {
        if (score >= 80) {
            return "High";
        } else if (score >= 60) {
            return "Medium";
        } else {
            return "Low";
        }
    }

    /**
     * Calculate and categorize in one call
     */
    public ConfidenceResult calculateWithLevel(double skillMatch, double experienceMatch,
            double educationMatch) {
        double score = calculate(skillMatch, experienceMatch, educationMatch);
        String level = getConfidenceLevel(score);
        return new ConfidenceResult(score, level);
    }

    /**
     * Result class
     */
    public static class ConfidenceResult {
        private final double score;
        private final String level;

        public ConfidenceResult(double score, String level) {
            this.score = score;
            this.level = level;
        }

        public double getScore() {
            return score;
        }

        public String getLevel() {
            return level;
        }
    }
}
