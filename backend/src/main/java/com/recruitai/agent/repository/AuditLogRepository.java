package com.recruitai.agent.repository;

import com.recruitai.agent.entity.AuditLog;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AuditLogRepository extends MongoRepository<AuditLog, String> {

    /**
     * Find all audit logs for a specific candidate
     */
    List<AuditLog> findByCandidateId(String candidateId);

    /**
     * Find all audit logs for a specific resume
     */
    List<AuditLog> findByResumeId(String resumeId);

    /**
     * Find audit logs by parser confidence level
     */
    List<AuditLog> findByParserConfidence(String parserConfidence);

    /**
     * Find audit logs with validation errors
     */
    List<AuditLog> findByValidationErrorsIsNotEmpty();

    /**
     * Find audit logs with missing fields
     */
    List<AuditLog> findByMissingFieldsIsNotEmpty();

    /**
     * Find audit logs within a time range
     */
    List<AuditLog> findByTimestampBetween(LocalDateTime start, LocalDateTime end);

    /**
     * Find audit logs by job matching status
     */
    List<AuditLog> findByJobMatchingStatus(String status);

    /**
     * Find recent audit logs (ordered by timestamp descending)
     */
    List<AuditLog> findTop100ByOrderByTimestampDesc();
}
