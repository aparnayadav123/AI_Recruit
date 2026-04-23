package com.recruitai.agent.service;

import com.recruitai.agent.entity.AuditLog;
import com.recruitai.agent.repository.AuditLogRepository;
import com.recruitai.agent.validation.ValidationResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Service for comprehensive audit logging of all parsing and validation events
 * Ensures data integrity and auditability for enterprise requirements
 */
@Service
@Transactional
public class AuditLogService {

    private static final Logger logger = LoggerFactory.getLogger(AuditLogService.class);

    @Autowired
    private AuditLogRepository auditLogRepository;

    /**
     * Create a new audit log entry
     */
    public AuditLog createAuditLog(String candidateId, String resumeId) {
        AuditLog auditLog = new AuditLog(candidateId, resumeId);
        logger.debug("Created audit log for candidate: {}, resume: {}", candidateId, resumeId);
        return auditLog;
    }

    /**
     * Save audit log to database
     */
    public AuditLog save(AuditLog auditLog) {
        AuditLog saved = auditLogRepository.save(auditLog);
        logger.info("Saved audit log: {} with {} missing fields, {} validation errors",
                saved.getId(),
                saved.getMissingFields() != null ? saved.getMissingFields().size() : 0,
                saved.getValidationErrors() != null ? saved.getValidationErrors().size() : 0);
        return saved;
    }

    /**
     * Log validation result to audit log
     */
    public void logValidationResult(AuditLog auditLog, ValidationResult result) {
        if (result == null) {
            return;
        }

        if (!result.isValid()) {
            if (result.getValue() != null && "NOT_FOUND".equals(result.getValue().toString())) {
                auditLog.addMissingField(result.getFieldName());
                logger.debug("Logged missing field: {}", result.getFieldName());
            } else {
                String error = result.getFieldName() + ": " + result.getErrorMessage();
                auditLog.addValidationError(error);
                logger.debug("Logged validation error: {}", error);
            }
        }
    }

    /**
     * Log multiple validation results
     */
    public void logValidationResults(AuditLog auditLog, List<ValidationResult> results) {
        if (results == null || results.isEmpty()) {
            return;
        }

        for (ValidationResult result : results) {
            logValidationResult(auditLog, result);
        }
    }

    /**
     * Set parser confidence level based on extraction quality
     */
    public void setParserConfidence(AuditLog auditLog, int fieldsExtracted, int totalFields, boolean aiUsed) {
        double extractionRate = totalFields > 0 ? (double) fieldsExtracted / totalFields : 0;

        String confidence;
        if (extractionRate >= 0.8 && aiUsed) {
            confidence = "HIGH";
        } else if (extractionRate >= 0.5) {
            confidence = "MEDIUM";
        } else {
            confidence = "LOW";
        }

        auditLog.setParserConfidence(confidence);
        logger.debug("Set parser confidence to: {} (extraction rate: {}%)",
                confidence, Math.round(extractionRate * 100));
    }

    /**
     * Log job matching result
     */
    public void logJobMatching(AuditLog auditLog, String jobId, String status, Double confidenceScore) {
        auditLog.setMatchedJobId(jobId);
        auditLog.setJobMatchingStatus(status);
        auditLog.setMatchConfidenceScore(confidenceScore);

        logger.info("Logged job matching: status={}, jobId={}, confidence={}",
                status, jobId, confidenceScore);
    }

    /**
     * Get all audit logs for a candidate
     */
    public List<AuditLog> getAuditLogsByCandidate(String candidateId) {
        return auditLogRepository.findByCandidateId(candidateId);
    }

    /**
     * Get all audit logs for a resume
     */
    public List<AuditLog> getAuditLogsByResume(String resumeId) {
        return auditLogRepository.findByResumeId(resumeId);
    }

    /**
     * Get audit logs with validation errors
     */
    public List<AuditLog> getAuditLogsWithErrors() {
        return auditLogRepository.findByValidationErrorsIsNotEmpty();
    }

    /**
     * Get audit logs with missing fields
     */
    public List<AuditLog> getAuditLogsWithMissingFields() {
        return auditLogRepository.findByMissingFieldsIsNotEmpty();
    }

    /**
     * Get recent audit logs
     */
    public List<AuditLog> getRecentAuditLogs() {
        return auditLogRepository.findTop100ByOrderByTimestampDesc();
    }

    /**
     * Get audit logs by confidence level
     */
    public List<AuditLog> getAuditLogsByConfidence(String confidence) {
        return auditLogRepository.findByParserConfidence(confidence);
    }

    /**
     * Get audit logs within time range
     */
    public List<AuditLog> getAuditLogsByTimeRange(LocalDateTime start, LocalDateTime end) {
        return auditLogRepository.findByTimestampBetween(start, end);
    }

    /**
     * Calculate overall system health metrics
     */
    public AuditMetrics calculateMetrics(LocalDateTime since) {
        List<AuditLog> logs = auditLogRepository.findByTimestampBetween(since, LocalDateTime.now());

        long totalLogs = logs.size();
        long highConfidence = logs.stream().filter(l -> "HIGH".equals(l.getParserConfidence())).count();
        long mediumConfidence = logs.stream().filter(l -> "MEDIUM".equals(l.getParserConfidence())).count();
        long lowConfidence = logs.stream().filter(l -> "LOW".equals(l.getParserConfidence())).count();
        long withErrors = logs.stream()
                .filter(l -> l.getValidationErrors() != null && !l.getValidationErrors().isEmpty()).count();
        long withMissingFields = logs.stream()
                .filter(l -> l.getMissingFields() != null && !l.getMissingFields().isEmpty()).count();

        return new AuditMetrics(totalLogs, highConfidence, mediumConfidence, lowConfidence, withErrors,
                withMissingFields);
    }

    /**
     * Inner class for audit metrics
     */
    public static class AuditMetrics {
        public final long totalLogs;
        public final long highConfidence;
        public final long mediumConfidence;
        public final long lowConfidence;
        public final long withErrors;
        public final long withMissingFields;

        public AuditMetrics(long totalLogs, long highConfidence, long mediumConfidence,
                long lowConfidence, long withErrors, long withMissingFields) {
            this.totalLogs = totalLogs;
            this.highConfidence = highConfidence;
            this.mediumConfidence = mediumConfidence;
            this.lowConfidence = lowConfidence;
            this.withErrors = withErrors;
            this.withMissingFields = withMissingFields;
        }
    }
}
