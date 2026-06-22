package com.recruitai.agent.entity;

import com.fasterxml.jackson.annotation.JsonFormat;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.LocalDateTime;

/**
 * Append-only audit trail for candidate lifecycle actions (reject, reconsider, reopen,
 * reassign, restart-interview). New collection — does not touch the existing resume-parsing
 * {@code audit_logs}. Historical data is never deleted.
 */
@Document(collection = "candidate_audit_events")
public class CandidateAuditEvent {

    @Id
    private String id;

    @Field("candidate_id")
    private String candidateId;

    /** REJECT, RECONSIDER, REOPEN, REASSIGN, RESTART_INTERVIEW, STAGE_RECORDED, etc. */
    @Field("action")
    private String action;

    @Field("detail")
    private String detail;

    @Field("actor")
    private String actor;

    @Field("from_status")
    private String fromStatus;

    @Field("to_status")
    private String toStatus;

    @Field("job_id")
    private String jobId;

    @Field("timestamp")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime timestamp;

    public CandidateAuditEvent() {
        this.timestamp = LocalDateTime.now();
    }

    public CandidateAuditEvent(String candidateId, String action, String detail, String actor) {
        this();
        this.candidateId = candidateId;
        this.action = action;
        this.detail = detail;
        this.actor = actor;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getCandidateId() { return candidateId; }
    public void setCandidateId(String candidateId) { this.candidateId = candidateId; }

    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }

    public String getDetail() { return detail; }
    public void setDetail(String detail) { this.detail = detail; }

    public String getActor() { return actor; }
    public void setActor(String actor) { this.actor = actor; }

    public String getFromStatus() { return fromStatus; }
    public void setFromStatus(String fromStatus) { this.fromStatus = fromStatus; }

    public String getToStatus() { return toStatus; }
    public void setToStatus(String toStatus) { this.toStatus = toStatus; }

    public String getJobId() { return jobId; }
    public void setJobId(String jobId) { this.jobId = jobId; }

    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
}
