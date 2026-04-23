package com.recruitai.agent.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Audit Log entity for tracking all validation events, missing fields, and
 * parser confidence
 * Enterprise-grade audit logging for compliance and debugging
 */
@Document(collection = "audit_logs")
public class AuditLog {

    @Id
    private String id;

    @Field("candidate_id")
    private String candidateId;

    @Field("resume_id")
    private String resumeId;

    @Field("missing_fields")
    private List<String> missingFields = new ArrayList<>();

    @Field("validation_errors")
    private List<String> validationErrors = new ArrayList<>();

    @Field("parser_confidence")
    private String parserConfidence; // HIGH, MEDIUM, LOW

    @Field("extraction_method")
    private String extractionMethod; // AI, FALLBACK, HYBRID

    @Field("job_matching_status")
    private String jobMatchingStatus; // MATCHED, NO_MATCH, INSUFFICIENT_DATA

    @Field("matched_job_id")
    private String matchedJobId;

    @Field("match_confidence_score")
    private Double matchConfidenceScore;

    @Field("timestamp")
    private LocalDateTime timestamp;

    // Constructors
    public AuditLog() {
        this.timestamp = LocalDateTime.now();
        this.missingFields = new ArrayList<>();
        this.validationErrors = new ArrayList<>();
    }

    public AuditLog(String candidateId, String resumeId) {
        this();
        this.candidateId = candidateId;
        this.resumeId = resumeId;
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

    public String getResumeId() {
        return resumeId;
    }

    public void setResumeId(String resumeId) {
        this.resumeId = resumeId;
    }

    public List<String> getMissingFields() {
        return missingFields;
    }

    public void setMissingFields(List<String> missingFields) {
        this.missingFields = missingFields;
    }

    public void addMissingField(String fieldName) {
        if (this.missingFields == null) {
            this.missingFields = new ArrayList<>();
        }
        if (!this.missingFields.contains(fieldName)) {
            this.missingFields.add(fieldName);
        }
    }

    public List<String> getValidationErrors() {
        return validationErrors;
    }

    public void setValidationErrors(List<String> validationErrors) {
        this.validationErrors = validationErrors;
    }

    public void addValidationError(String error) {
        if (this.validationErrors == null) {
            this.validationErrors = new ArrayList<>();
        }
        this.validationErrors.add(error);
    }

    public String getParserConfidence() {
        return parserConfidence;
    }

    public void setParserConfidence(String parserConfidence) {
        this.parserConfidence = parserConfidence;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }

    public String getExtractionMethod() {
        return extractionMethod;
    }

    public void setExtractionMethod(String extractionMethod) {
        this.extractionMethod = extractionMethod;
    }

    public String getJobMatchingStatus() {
        return jobMatchingStatus;
    }

    public void setJobMatchingStatus(String jobMatchingStatus) {
        this.jobMatchingStatus = jobMatchingStatus;
    }

    public String getMatchedJobId() {
        return matchedJobId;
    }

    public void setMatchedJobId(String matchedJobId) {
        this.matchedJobId = matchedJobId;
    }

    public Double getMatchConfidenceScore() {
        return matchConfidenceScore;
    }

    public void setMatchConfidenceScore(Double matchConfidenceScore) {
        this.matchConfidenceScore = matchConfidenceScore;
    }
}
