package com.recruitai.agent.dto;

import java.util.ArrayList;
import java.util.List;

/**
 * Enterprise-grade standardized response for resume parsing operations
 * Matches specification with status, candidate_profile, and audit_log sections
 */
public class EnterpriseResumeResponse {

    private String status; // SUCCESS, PARTIAL_SUCCESS, FAILED
    private CandidateProfile candidateProfile;
    private AuditLogSummary auditLog;

    public EnterpriseResumeResponse() {
        this.candidateProfile = new CandidateProfile();
        this.auditLog = new AuditLogSummary();
    }

    public EnterpriseResumeResponse(String status) {
        this();
        this.status = status;
    }

    // Getters and Setters
    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public CandidateProfile getCandidateProfile() {
        return candidateProfile;
    }

    public void setCandidateProfile(CandidateProfile candidateProfile) {
        this.candidateProfile = candidateProfile;
    }

    public AuditLogSummary getAuditLog() {
        return auditLog;
    }

    public void setAuditLog(AuditLogSummary auditLog) {
        this.auditLog = auditLog;
    }

    /**
     * Candidate Profile section
     */
    public static class CandidateProfile {
        private String fullName;
        private String email;
        private String phone;
        private List<String> skills = new ArrayList<>();
        private String totalExperienceYears;
        private String resumeSource;
        private String matchedJobRole;
        private String confidenceScore;
        private List<String> education = new ArrayList<>();
        private List<String> certifications = new ArrayList<>();
        private List<String> previousRoles = new ArrayList<>();
        private String currentRole;

        // Getters and Setters
        public String getFullName() {
            return fullName;
        }

        public void setFullName(String fullName) {
            this.fullName = fullName;
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

        public String getTotalExperienceYears() {
            return totalExperienceYears;
        }

        public void setTotalExperienceYears(String totalExperienceYears) {
            this.totalExperienceYears = totalExperienceYears;
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

        public List<String> getEducation() {
            return education;
        }

        public void setEducation(List<String> education) {
            this.education = education;
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
    }

    /**
     * Audit Log Summary section
     */
    public static class AuditLogSummary {
        private List<String> missingFields = new ArrayList<>();
        private List<String> validationErrors = new ArrayList<>();
        private String parserConfidence;

        // Getters and Setters
        public List<String> getMissingFields() {
            return missingFields;
        }

        public void setMissingFields(List<String> missingFields) {
            this.missingFields = missingFields;
        }

        public List<String> getValidationErrors() {
            return validationErrors;
        }

        public void setValidationErrors(List<String> validationErrors) {
            this.validationErrors = validationErrors;
        }

        public String getParserConfidence() {
            return parserConfidence;
        }

        public void setParserConfidence(String parserConfidence) {
            this.parserConfidence = parserConfidence;
        }
    }
}
