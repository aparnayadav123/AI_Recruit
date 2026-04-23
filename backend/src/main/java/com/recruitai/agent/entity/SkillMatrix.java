package com.recruitai.agent.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import java.time.LocalDateTime;
import com.fasterxml.jackson.annotation.JsonFormat;
import java.util.Map;

@Document(collection = "skill_matrix")
public class SkillMatrix {
    @Id
    private String id;

    @Field("candidate_id")
    private String candidateId;

    @Field("candidate_name")
    private String candidateName;

    @Field("job_id")
    private String jobId;

    @Field("job_title")
    private String jobTitle;

    @Field("total_score")
    private Integer totalScore;

    @Field("skill_scores")
    private Map<String, Integer> skillScores; // Legacy support

    @Field("skill_metrics")
    private java.util.List<SkillMetric> skillMetrics;

    @Field("extracted_role")
    private String extractedRole;

    @Field("key_strengths")
    private java.util.List<String> keyStrengths;

    @Field("required_skills")
    private java.util.List<String> requiredSkills;

    @Field("matched_skills")
    private java.util.List<String> matchedSkills;

    @Field("missing_skills")
    private java.util.List<String> missingSkills;

    @Field("experience_match")
    private String experienceMatch;

    @Field("recommended_role")
    private String recommendedRole;

    @Field("shortlisted")
    private boolean shortlisted;

    @Field("summary")
    private String summary;

    @Field("created_at")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss[.SSS][.SS][.S]")
    private LocalDateTime createdAt = LocalDateTime.now();

    @Field("updated_at")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss[.SSS][.SS][.S]")
    private LocalDateTime updatedAt = LocalDateTime.now();

    public static class SkillMetric {
        private String skill;
        private int percentage;
        private String confidence; // High, Medium, Low

        public String getSkill() {
            return skill;
        }

        public void setSkill(String skill) {
            this.skill = skill;
        }

        public int getPercentage() {
            return percentage;
        }

        public void setPercentage(int percentage) {
            this.percentage = percentage;
        }

        public String getConfidence() {
            return confidence;
        }

        public void setConfidence(String confidence) {
            this.confidence = confidence;
        }
    }

    // Getters and Setters
    public String getExtractedRole() {
        return extractedRole;
    }

    public void setExtractedRole(String extractedRole) {
        this.extractedRole = extractedRole;
    }

    public java.util.List<String> getKeyStrengths() {
        return keyStrengths;
    }

    public void setKeyStrengths(java.util.List<String> keyStrengths) {
        this.keyStrengths = keyStrengths;
    }

    public java.util.List<SkillMetric> getSkillMetrics() {
        return skillMetrics;
    }

    public void setSkillMetrics(java.util.List<SkillMetric> skillMetrics) {
        this.skillMetrics = skillMetrics;
    }

    public boolean isShortlisted() {
        return shortlisted;
    }

    public void setShortlisted(boolean shortlisted) {
        this.shortlisted = shortlisted;
    }

    // Getters and Setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getCandidateId() {
        return candidateId;
    }

    public void setCandidateId(String candidateId) {
        this.candidateId = candidateId;
    }

    public String getCandidateName() {
        return candidateName;
    }

    public void setCandidateName(String candidateName) {
        this.candidateName = candidateName;
    }

    public String getJobId() {
        return jobId;
    }

    public void setJobId(String jobId) {
        this.jobId = jobId;
    }

    public String getJobTitle() {
        return jobTitle;
    }

    public void setJobTitle(String jobTitle) {
        this.jobTitle = jobTitle;
    }

    public Integer getTotalScore() {
        return totalScore;
    }

    public void setTotalScore(Integer totalScore) {
        this.totalScore = totalScore;
    }

    public Map<String, Integer> getSkillScores() {
        return skillScores;
    }

    public void setSkillScores(Map<String, Integer> skillScores) {
        this.skillScores = skillScores;
    }

    public java.util.List<String> getRequiredSkills() {
        return requiredSkills;
    }

    public void setRequiredSkills(java.util.List<String> requiredSkills) {
        this.requiredSkills = requiredSkills;
    }

    public java.util.List<String> getMatchedSkills() {
        return matchedSkills;
    }

    public void setMatchedSkills(java.util.List<String> matchedSkills) {
        this.matchedSkills = matchedSkills;
    }

    public java.util.List<String> getMissingSkills() {
        return missingSkills;
    }

    public void setMissingSkills(java.util.List<String> missingSkills) {
        this.missingSkills = missingSkills;
    }

    public String getExperienceMatch() {
        return experienceMatch;
    }

    public void setExperienceMatch(String experienceMatch) {
        this.experienceMatch = experienceMatch;
    }

    public String getRecommendedRole() {
        return recommendedRole;
    }

    public void setRecommendedRole(String recommendedRole) {
        this.recommendedRole = recommendedRole;
    }

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
