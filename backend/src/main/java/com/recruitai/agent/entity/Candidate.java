package com.recruitai.agent.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonFormat;

@Document(collection = "candidates")
public class Candidate {
    
    @Field("sequence_id")
    private Long sequenceId;

    @Id
    private String id;

    @NotBlank(message = "Name is required")
    @Size(max = 100, message = "Name must not exceed 100 characters")
    @Field("name")
    private String name; // Combined first/last name for simplicity matching frontend

    @Email(message = "Email should be valid")
    @NotBlank(message = "Email is required")
    @Field("email")
    private String email;

    @Field("role")
    private String role; // e.g. "Senior Backend Dev"

    @Field("phone")
    private String phone;

    @Field("skills")
    private List<String> skills;

    @Field("experience")
    private Double experience;

    @Field("education")
    private List<String> education;

    @Field("industry")
    private String industry;

    @Field("source")
    private String source; // origin of the candidate record

    @Field("confidence_score")
    private Double confidenceScore;

    @Field("audit_log_id")
    private String auditLogId;

    @Field("fit_score")
    private Integer fitScore;

    @Field("resume_id")
    private String resumeId; // Link to Resume entity

    @Field("job_id")
    private String jobId;

    @Field("shortlisted")
    private boolean shortlisted;

    @Field("avatar")
    private String avatar; // URL to avatar

    @Field("status")
    private String status = "New"; // "New", "Screening", "Interview", "Offer", "Rejected"

    @Field("created_at")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss[.SSS][.SS][.S]")
    private LocalDateTime createdAt = LocalDateTime.now();

    @Field("updated_at")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss[.SSS][.SS][.S]")
    private LocalDateTime updatedAt = LocalDateTime.now();

    @Field("match_reason")
    private String matchReason;

    @Field("interview_date")
    private String interviewDate;

    @Field("interview_time")
    private String interviewTime;

    @Field("interview_type")
    private String interviewType;

    @Field("interview_notes")
    private String interviewNotes;

    @Field("interview_meeting_link")
    private String interviewMeetingLink;

    @Field("rejection_reason")
    private String rejectionReason;

    // --- Interview Pipeline Fields ---
    @Field("interview_round")
    private String interviewRound; // "Technical", "Managerial", "HR"

    @Field("round_status")
    private String roundStatus; // "Scheduled", "Feedback Pending", "Passed", "Rejected"

    @Field("current_organization")
    private String currentOrganization;

    @Field("notice_period")
    private Integer noticePeriod;

    @Field("postal_code")
    private String postalCode;

    @Field("current_employment_status")
    private String currentEmploymentStatus;

    @Field("language_skills")
    private List<String> languageSkills;

    @Field("current_salary")
    private String currentSalary;

    @Field("salary_expectation")
    private String salaryExpectation;

    @Field("relevant_experience")
    private Double relevantExperience;

    @Field("country")
    private String country;

    @Field("available_from")
    private String availableFrom;

    @Field("salary_type")
    private String salaryType;

    @Field("locality")
    private String locality;

    @Field("willing_to_relocate")
    private boolean willingToRelocate;

    @Field("summary")
    private String summary;

    @Field("hotlist")
    private String hotlist;

    @Field("assigned_by")
    private String assignedBy;

    @Field("job_assigned_by")
    private String jobAssignedBy;

    @Field("assigned_to")
    private String assignedTo;

    @Field("uploaded_by")
    private String uploadedBy;

    @Field("japanese_language_proficiency")
    private String japaneseLanguageProficiency;

    @Field("visa_type")
    private String visaType;

    @Field("visa_validity")
    private String visaValidity;

    @Field("reason_for_change")
    private String reasonForChange;

    @Field("recently_applied_companies")
    private String recentlyAppliedCompanies;

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

    public String getAssignedTo() {
        return assignedTo;
    }

    public void setAssignedTo(String assignedTo) {
        this.assignedTo = assignedTo;
    }

    public String getUploadedBy() {
        return uploadedBy;
    }

    public void setUploadedBy(String uploadedBy) {
        this.uploadedBy = uploadedBy;
    }

    public String getCurrentOrganization() {
        return currentOrganization;
    }

    public void setCurrentOrganization(String currentOrganization) {
        this.currentOrganization = currentOrganization;
    }

    public Integer getNoticePeriod() {
        return noticePeriod;
    }

    public void setNoticePeriod(Integer noticePeriod) {
        this.noticePeriod = noticePeriod;
    }

    public String getPostalCode() {
        return postalCode;
    }

    public void setPostalCode(String postalCode) {
        this.postalCode = postalCode;
    }

    public String getCurrentEmploymentStatus() {
        return currentEmploymentStatus;
    }

    public void setCurrentEmploymentStatus(String currentEmploymentStatus) {
        this.currentEmploymentStatus = currentEmploymentStatus;
    }

    public List<String> getLanguageSkills() {
        return languageSkills;
    }

    public void setLanguageSkills(List<String> languageSkills) {
        this.languageSkills = languageSkills;
    }

    public String getCurrentSalary() {
        return currentSalary;
    }

    public void setCurrentSalary(String currentSalary) {
        this.currentSalary = currentSalary;
    }

    public String getSalaryExpectation() {
        return salaryExpectation;
    }

    public void setSalaryExpectation(String salaryExpectation) {
        this.salaryExpectation = salaryExpectation;
    }

    public Double getRelevantExperience() {
        return relevantExperience;
    }

    public void setRelevantExperience(Double relevantExperience) {
        this.relevantExperience = relevantExperience;
    }

    public String getCountry() {
        return country;
    }

    public void setCountry(String country) {
        this.country = country;
    }

    public String getAvailableFrom() {
        return availableFrom;
    }

    public void setAvailableFrom(String availableFrom) {
        this.availableFrom = availableFrom;
    }

    public String getSalaryType() {
        return salaryType;
    }

    public void setSalaryType(String salaryType) {
        this.salaryType = salaryType;
    }

    public String getLocality() {
        return locality;
    }

    public void setLocality(String locality) {
        this.locality = locality;
    }

    public boolean isWillingToRelocate() {
        return willingToRelocate;
    }

    public void setWillingToRelocate(boolean willingToRelocate) {
        this.willingToRelocate = willingToRelocate;
    }

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary;
    }

    public String getHotlist() {
        return hotlist;
    }

    public void setHotlist(String hotlist) {
        this.hotlist = hotlist;
    }

    public String getAssignedBy() {
        return assignedBy;
    }

    public void setAssignedBy(String assignedBy) {
        this.assignedBy = assignedBy;
    }

    public String getJobAssignedBy() {
        return jobAssignedBy;
    }

    public void setJobAssignedBy(String jobAssignedBy) {
        this.jobAssignedBy = jobAssignedBy;
    }

    // Getters and Setters
    public String getInterviewRound() {
        return interviewRound;
    }

    public void setInterviewRound(String interviewRound) {
        this.interviewRound = interviewRound;
    }

    public String getRoundStatus() {
        return roundStatus;
    }

    public void setRoundStatus(String roundStatus) {
        this.roundStatus = roundStatus;
    }

    public String getRejectionReason() {
        return rejectionReason;
    }

    public void setRejectionReason(String rejectionReason) {
        this.rejectionReason = rejectionReason;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getInterviewMeetingLink() {
        return interviewMeetingLink;
    }

    public void setInterviewMeetingLink(String interviewMeetingLink) {
        this.interviewMeetingLink = interviewMeetingLink;
    }

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

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
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

    public List<String> getEducation() {
        return education;
    }

    public void setEducation(List<String> education) {
        this.education = education;
    }

    public String getIndustry() {
        return industry;
    }

    public void setIndustry(String industry) {
        this.industry = industry;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public Double getConfidenceScore() {
        return confidenceScore;
    }

    public void setConfidenceScore(Double confidenceScore) {
        this.confidenceScore = confidenceScore;
    }

    public String getAuditLogId() {
        return auditLogId;
    }

    public void setAuditLogId(String auditLogId) {
        this.auditLogId = auditLogId;
    }

    public Integer getFitScore() {
        return fitScore;
    }

    public void setFitScore(Integer fitScore) {
        this.fitScore = fitScore;
    }

    public String getResumeId() {
        return resumeId;
    }

    public void setResumeId(String resumeId) {
        this.resumeId = resumeId;
    }

    public String getJobId() {
        return jobId;
    }

    public void setJobId(String jobId) {
        this.jobId = jobId;
    }

    public boolean isShortlisted() {
        return shortlisted;
    }

    public void setShortlisted(boolean shortlisted) {
        this.shortlisted = shortlisted;
    }

    public String getAvatar() {
        return avatar;
    }

    public void setAvatar(String avatar) {
        this.avatar = avatar;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
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

    public String getMatchReason() {
        return matchReason;
    }

    public void setMatchReason(String matchReason) {
        this.matchReason = matchReason;
    }

    public String getInterviewDate() {
        return interviewDate;
    }

    public void setInterviewDate(String interviewDate) {
        this.interviewDate = interviewDate;
    }

    public String getInterviewTime() {
        return interviewTime;
    }

    public void setInterviewTime(String interviewTime) {
        this.interviewTime = interviewTime;
    }

    public String getInterviewType() {
        return interviewType;
    }

    public void setInterviewType(String interviewType) {
        this.interviewType = interviewType;
    }

    public String getInterviewNotes() {
        return interviewNotes;
    }

    public void setInterviewNotes(String interviewNotes) {
        this.interviewNotes = interviewNotes;
    }

    public Long getSequenceId() {
        return sequenceId;
    }

    public void setSequenceId(Long sequenceId) {
        this.sequenceId = sequenceId;
    }

    public String getJapaneseLanguageProficiency() {
        return japaneseLanguageProficiency;
    }

    public void setJapaneseLanguageProficiency(String japaneseLanguageProficiency) {
        this.japaneseLanguageProficiency = japaneseLanguageProficiency;
    }
}
