package com.recruitai.agent.entity;

import com.fasterxml.jackson.annotation.JsonFormat;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "job_applications")
public class JobApplication {

    @Id
    private String id;

    @Field("candidate_id")
    private String candidateId;

    @Field("job_id")
    private String jobId;

    @Field("status")
    private ApplicationStatus status = ApplicationStatus.PENDING;

    @Field("applied_date")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime appliedDate;

    @Field("resume_url")
    private String resumeUrl;

    @Field("cover_letter")
    private String coverLetter;

    @Field("notes")
    private String notes;

    @Field("created_at")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @Field("updated_at")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;

    @Field("stage")
    private String stage;

    @Field("stage_date")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime stageDate;

    @Field("remarks")
    private String remarks;

    // ---------- Phase 1 additive fields (default null/empty: existing docs untouched) ----------

    /** Denormalized for display in History / lists without extra lookups. */
    @Field("candidate_name")
    private String candidateName;

    @Field("job_title")
    private String jobTitle;

    /** Where this application originated (Career Page / OryFolks / Email / LinkedIn / Manual). */
    @Field("source")
    private String source;

    /** AI Match Score (0-100) computed at apply time against the job. */
    @Field("match_score")
    private Integer matchScore;

    /** Candidate experience (years) captured at the moment of THIS application. */
    @Field("experience_at_apply")
    private Double experienceAtApply;

    /** Structured interview pipeline for this application. */
    @Field("stages")
    private List<InterviewStage> stages = new ArrayList<>();

    // --- Rejection details (only set when status == REJECTED) ---
    @Field("rejection_reason")
    private String rejectionReason;

    @Field("rejected_by")
    private String rejectedBy;

    @Field("rejected_date")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime rejectedDate;

    // --- Hiring details (only set when status == HIRED) ---
    @Field("hired_by")
    private String hiredBy;

    @Field("hired_date")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime hiredDate;

    /** Soft-delete flag — historical data is NEVER physically removed. */
    @Field("deleted")
    private boolean deleted = false;

    public enum ApplicationStatus {
        PENDING,
        UNDER_REVIEW,
        SHORTLISTED,
        REJECTED,
        HIRED,
        WITHDRAWN,
        NOT_ELIGIBLE
    }

    // ✅ Default constructor
    public JobApplication() {
        this.appliedDate = LocalDateTime.now();
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    // ✅ Convenience constructor
    public JobApplication(String candidateId, String jobId) {
        this.candidateId = candidateId;
        this.jobId = jobId;
        this.appliedDate = LocalDateTime.now();
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    // ---------- GETTERS & SETTERS ----------

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

    public String getJobId() {
        return jobId;
    }

    public void setJobId(String jobId) {
        this.jobId = jobId;
    }

    public ApplicationStatus getStatus() {
        return status;
    }

    public void setStatus(ApplicationStatus status) {
        this.status = status;
    }

    public LocalDateTime getAppliedDate() {
        return appliedDate;
    }

    public void setAppliedDate(LocalDateTime appliedDate) {
        this.appliedDate = appliedDate;
    }

    public String getResumeUrl() {
        return resumeUrl;
    }

    public void setResumeUrl(String resumeUrl) {
        this.resumeUrl = resumeUrl;
    }

    public String getCoverLetter() {
        return coverLetter;
    }

    public void setCoverLetter(String coverLetter) {
        this.coverLetter = coverLetter;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
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

    public String getStage() {
        return stage;
    }

    public void setStage(String stage) {
        this.stage = stage;
    }

    public LocalDateTime getStageDate() {
        return stageDate;
    }

    public void setStageDate(LocalDateTime stageDate) {
        this.stageDate = stageDate;
    }

    public String getRemarks() {
        return remarks;
    }

    public void setRemarks(String remarks) {
        this.remarks = remarks;
    }

    public String getCandidateName() {
        return candidateName;
    }

    public void setCandidateName(String candidateName) {
        this.candidateName = candidateName;
    }

    public String getJobTitle() {
        return jobTitle;
    }

    public void setJobTitle(String jobTitle) {
        this.jobTitle = jobTitle;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public Integer getMatchScore() {
        return matchScore;
    }

    public void setMatchScore(Integer matchScore) {
        this.matchScore = matchScore;
    }

    public Double getExperienceAtApply() {
        return experienceAtApply;
    }

    public void setExperienceAtApply(Double experienceAtApply) {
        this.experienceAtApply = experienceAtApply;
    }

    public List<InterviewStage> getStages() {
        return stages;
    }

    public void setStages(List<InterviewStage> stages) {
        this.stages = stages;
    }

    public String getRejectionReason() {
        return rejectionReason;
    }

    public void setRejectionReason(String rejectionReason) {
        this.rejectionReason = rejectionReason;
    }

    public String getRejectedBy() {
        return rejectedBy;
    }

    public void setRejectedBy(String rejectedBy) {
        this.rejectedBy = rejectedBy;
    }

    public LocalDateTime getRejectedDate() {
        return rejectedDate;
    }

    public void setRejectedDate(LocalDateTime rejectedDate) {
        this.rejectedDate = rejectedDate;
    }

    public String getHiredBy() {
        return hiredBy;
    }

    public void setHiredBy(String hiredBy) {
        this.hiredBy = hiredBy;
    }

    public LocalDateTime getHiredDate() {
        return hiredDate;
    }

    public void setHiredDate(LocalDateTime hiredDate) {
        this.hiredDate = hiredDate;
    }

    public boolean isDeleted() {
        return deleted;
    }

    public void setDeleted(boolean deleted) {
        this.deleted = deleted;
    }
}
