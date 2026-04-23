package com.recruitai.agent.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import jakarta.validation.constraints.NotBlank;

import jakarta.validation.constraints.Size;
import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Document(collection = "jobs")
public class Job {

    @Id
    private String id; // Changed to String to match frontend ID generation or allow UUID

    @NotBlank(message = "Job title is required")
    @Size(max = 100, message = "Job title must not exceed 100 characters")
    @Field("title")
    private String title;

    @NotBlank(message = "Description is required")
    @Field("description")
    private String description;

    @NotBlank
    @Field("company")
    private String company;

    @Size(max = 100, message = "Location must not exceed 100 characters")
    @Field("location")
    private String location;

    @Size(max = 50, message = "Department must not exceed 50 characters")
    @Field("department")
    private String department;

    @JsonProperty("employmentType")
    @JsonAlias({ "type", "employment_type" })
    @Field("employment_type")
    private String employmentType; // Changed to String to simplify mapping

    @Field("salary")
    private String salary; // Changed to String to support ranges e.g. "$80k - $100k"

    @Field("experience_level")
    private String experienceLevel;

    @Field("skills")
    private List<SkillWeight> skills = new ArrayList<>();

    @Field("education")
    private List<String> education = new ArrayList<>();

    @Field("industry")
    private String industry;

    @Field("benefits")
    private List<String> benefits = new ArrayList<>();

    @Field("requirements")
    private List<String> requirements = new ArrayList<>();

    @Field("responsibilities")
    private List<String> responsibilities = new ArrayList<>();

    @Field("remote")
    private boolean remote;

    @Field("deadline")
    private String deadline; // Keeping as string to match frontend '2025-05-01' or similar

    @Field("status")
    private String status = "Open"; // "Open", "Hold", "Closed"

    @JsonProperty("postedDate")
    @JsonAlias({ "posted_date" })
    @Field("posted_date")
    private String postedDate; // "2 days ago" or ISO string

    @Field("applicants")
    private int applicants; // Count of applicants

    @Field("created_at")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss[.SSS][.SS][.S]")
    private LocalDateTime createdAt;

    @Field("updated_at")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss[.SSS][.SS][.S]")
    private LocalDateTime updatedAt;

    // Constructors
    public Job() {
    }

    // Getters and Setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getCompany() {
        return company;
    }

    public void setCompany(String company) {
        this.company = company;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getDepartment() {
        return department;
    }

    public void setDepartment(String department) {
        this.department = department;
    }

    public String getEmploymentType() {
        return employmentType;
    }

    public void setEmploymentType(String employmentType) {
        this.employmentType = employmentType;
    }

    public String getSalary() {
        return salary;
    }

    public void setSalary(String salary) {
        this.salary = salary;
    }

    public String getExperienceLevel() {
        return experienceLevel;
    }

    public void setExperienceLevel(String experienceLevel) {
        this.experienceLevel = experienceLevel;
    }

    public List<SkillWeight> getSkills() {
        return skills;
    }

    public void setSkills(List<SkillWeight> skills) {
        this.skills = skills;
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

    public List<String> getBenefits() {
        return benefits;
    }

    public void setBenefits(List<String> benefits) {
        this.benefits = benefits;
    }

    public List<String> getRequirements() {
        return requirements;
    }

    public void setRequirements(List<String> requirements) {
        this.requirements = requirements;
    }

    public List<String> getResponsibilities() {
        return responsibilities;
    }

    public void setResponsibilities(List<String> responsibilities) {
        this.responsibilities = responsibilities;
    }

    public boolean isRemote() {
        return remote;
    }

    public void setRemote(boolean remote) {
        this.remote = remote;
    }

    public String getDeadline() {
        return deadline;
    }

    public void setDeadline(String deadline) {
        this.deadline = deadline;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getPostedDate() {
        return postedDate;
    }

    public void setPostedDate(String postedDate) {
        this.postedDate = postedDate;
    }

    public int getApplicants() {
        return applicants;
    }

    public void setApplicants(int applicants) {
        this.applicants = applicants;
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

    // Helper methods for job matching
    /**
     * Get list of required skill names (extracted from SkillWeight objects)
     */
    public List<String> getRequiredSkills() {
        if (skills == null || skills.isEmpty()) {
            return new ArrayList<>();
        }
        return skills.stream()
                .map(SkillWeight::getName)
                .filter(Objects::nonNull)
                .collect(java.util.stream.Collectors.toList());
    }

    /**
     * Get minimum experience requirement (extracted from experienceLevel)
     */
    public Double getMinExperience() {
        if (experienceLevel == null || experienceLevel.trim().isEmpty()) {
            return 0.0;
        }

        // Try to extract numeric value from experienceLevel string
        // Examples: "2+ years", "3-5 years", "Entry Level" (0), "Senior" (5+)
        String lower = experienceLevel.toLowerCase();

        if (lower.contains("entry") || lower.contains("fresher") || lower.contains("junior")) {
            return 0.0;
        } else if (lower.contains("senior") || lower.contains("lead")) {
            return 5.0;
        } else if (lower.contains("mid")) {
            return 2.0;
        }

        // Try to extract number
        java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("(\\d+)");
        java.util.regex.Matcher matcher = pattern.matcher(experienceLevel);
        if (matcher.find()) {
            try {
                return Double.parseDouble(matcher.group(1));
            } catch (NumberFormatException e) {
                return 0.0;
            }
        }

        return 0.0;
    }

    /**
     * Get education requirement (first education entry or null)
     */
    public String getEducationRequirement() {
        if (education == null || education.isEmpty()) {
            return null;
        }
        return education.get(0);
    }
}
