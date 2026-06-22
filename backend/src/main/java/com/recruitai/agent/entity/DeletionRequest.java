package com.recruitai.agent.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.LocalDateTime;

/**
 * Audit-tracked request from an HR user to delete a candidate. HR users can't
 * delete directly; they submit one of these with a mandatory reason and a
 * Manager approves or rejects. Approval triggers the actual cascade delete;
 * the record itself is kept (status flips to APPROVED) for compliance.
 */
@Document(collection = "deletion_requests")
public class DeletionRequest {

    public static final String STATUS_PENDING = "PENDING";
    public static final String STATUS_APPROVED = "APPROVED";
    public static final String STATUS_REJECTED = "REJECTED";

    @Id
    private String id;

    @Field("candidate_id")
    private String candidateId;

    /** Snapshot of the candidate's name at request time — survives the actual delete. */
    @Field("candidate_name")
    private String candidateName;

    @Field("requested_by_email")
    private String requestedByEmail;

    @Field("requested_by_name")
    private String requestedByName;

    @Field("reason")
    private String reason;

    @Field("status")
    private String status = STATUS_PENDING;

    @Field("created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @Field("decided_by_email")
    private String decidedByEmail;

    @Field("decided_by_name")
    private String decidedByName;

    @Field("decided_at")
    private LocalDateTime decidedAt;

    @Field("decision_notes")
    private String decisionNotes;

    public DeletionRequest() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getCandidateId() { return candidateId; }
    public void setCandidateId(String candidateId) { this.candidateId = candidateId; }
    public String getCandidateName() { return candidateName; }
    public void setCandidateName(String candidateName) { this.candidateName = candidateName; }
    public String getRequestedByEmail() { return requestedByEmail; }
    public void setRequestedByEmail(String requestedByEmail) { this.requestedByEmail = requestedByEmail; }
    public String getRequestedByName() { return requestedByName; }
    public void setRequestedByName(String requestedByName) { this.requestedByName = requestedByName; }
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public String getDecidedByEmail() { return decidedByEmail; }
    public void setDecidedByEmail(String decidedByEmail) { this.decidedByEmail = decidedByEmail; }
    public String getDecidedByName() { return decidedByName; }
    public void setDecidedByName(String decidedByName) { this.decidedByName = decidedByName; }
    public LocalDateTime getDecidedAt() { return decidedAt; }
    public void setDecidedAt(LocalDateTime decidedAt) { this.decidedAt = decidedAt; }
    public String getDecisionNotes() { return decisionNotes; }
    public void setDecisionNotes(String decisionNotes) { this.decisionNotes = decisionNotes; }
}