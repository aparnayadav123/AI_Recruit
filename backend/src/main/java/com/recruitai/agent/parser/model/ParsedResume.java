package com.recruitai.agent.parser.model;

import java.util.List;
import java.util.Map;
import com.fasterxml.jackson.annotation.JsonProperty;

public class ParsedResume {
    @JsonProperty("name")
    private String name;

    @JsonProperty("email")
    private String email;

    @JsonProperty("phone")
    private String phone;

    @JsonProperty("skills")
    private List<String> skills;

    @JsonProperty("total_experience_years")
    private Double experience;

    @JsonProperty("job_titles")
    private List<String> jobTitles;

    @JsonProperty("education")
    private List<String> education;

    @JsonProperty("certifications")
    private List<String> certifications;

    @JsonProperty("previous_roles")
    private List<String> previousRoles;

    @JsonProperty("current_role")
    private String currentRole;

    @JsonProperty("resume_source")
    private String resumeSource;

    @JsonProperty("matched_job_role")
    private String matchedJobRole;

    @JsonProperty("confidence_score")
    private String confidenceScore;

    @JsonProperty("visa_type")
    private String visaType;

    @JsonProperty("visa_validity")
    private String visaValidity;

    @JsonProperty("reason_for_change")
    private String reasonForChange;

    @JsonProperty("recently_applied_companies")
    private String recentlyAppliedCompanies;

    @JsonProperty("summary")
    private String summary;
    private Map<String, Object> metadata;

    // Internal use for transferring audit data
    private com.recruitai.agent.entity.AuditLog auditLog;

    // Getters and Setters
    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public List<String> getSkills() {
        return skills;
    }

    public void setSkills(List<String> skills) {
        this.skills = skills;
    }

    public Double getExperience() {
        return experience;
    }

    public void setExperience(Double experience) {
        this.experience = experience;
    }

    public List<String> getJobTitles() {
        return jobTitles;
    }

    public void setJobTitles(List<String> jobTitles) {
        this.jobTitles = jobTitles;
    }

    public List<String> getEducation() {
        return education;
    }

    public void setEducation(List<String> education) {
        this.education = education;
    }

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary;
    }

    public Map<String, Object> getMetadata() {
        return metadata;
    }

    public void setMetadata(Map<String, Object> metadata) {
        this.metadata = metadata;
    }

    public List<String> getCertifications() {
        return certifications;
    }

    public void setCertifications(List<String> certifications) {
        this.certifications = certifications;
    }

    public List<String> getPreviousRoles() {
        return previousRoles;
    }

    public void setPreviousRoles(List<String> previousRoles) {
        this.previousRoles = previousRoles;
    }

    public String getCurrentRole() {
        return currentRole;
    }

    public void setCurrentRole(String currentRole) {
        this.currentRole = currentRole;
    }

    public String getResumeSource() {
        return resumeSource;
    }

    public void setResumeSource(String resumeSource) {
        this.resumeSource = resumeSource;
    }

    public String getMatchedJobRole() {
        return matchedJobRole;
    }

    public void setMatchedJobRole(String matchedJobRole) {
        this.matchedJobRole = matchedJobRole;
    }

    public String getConfidenceScore() {
        return confidenceScore;
    }

    public void setConfidenceScore(String confidenceScore) {
        this.confidenceScore = confidenceScore;
    }

    public String getVisaType() {
        return visaType;
    }

    public void setVisaType(String visaType) {
        this.visaType = visaType;
    }

    public String getVisaValidity() {
        return visaValidity;
    }

    public void setVisaValidity(String visaValidity) {
        this.visaValidity = visaValidity;
    }

    public String getReasonForChange() {
        return reasonForChange;
    }

    public void setReasonForChange(String reasonForChange) {
        this.reasonForChange = reasonForChange;
    }

    public String getRecentlyAppliedCompanies() {
        return recentlyAppliedCompanies;
    }

    public void setRecentlyAppliedCompanies(String recentlyAppliedCompanies) {
        this.recentlyAppliedCompanies = recentlyAppliedCompanies;
    }

    public com.recruitai.agent.entity.AuditLog getAuditLog() {
        return auditLog;
    }

    public void setAuditLog(com.recruitai.agent.entity.AuditLog auditLog) {
        this.auditLog = auditLog;
    }
}
