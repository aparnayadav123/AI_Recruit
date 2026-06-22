package com.recruitai.agent.entity;

import com.fasterxml.jackson.annotation.JsonFormat;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.LocalDateTime;

/**
 * One stage in the structured interview pipeline, embedded inside a {@link JobApplication}.
 * Purely additive — existing applications simply have an empty stage list until the
 * pipeline is used, so nothing about current behavior changes.
 *
 * Canonical ordered stages: Screening -> Tech Round 1 -> Tech Round 2 -> Manager Round -> HR Round.
 * Each stage records its own outcome so the full interview timeline is preserved forever.
 */
public class InterviewStage {

    /** Canonical stage names, in order. */
    public static final String[] CANONICAL = {
            "Screening", "Tech Round 1", "Tech Round 2", "Manager Round", "HR Round"
    };

    @Field("name")
    private String name;

    /** PENDING, PASS, FAIL, HOLD. */
    @Field("outcome")
    private String outcome = "PENDING";

    @Field("interviewer")
    private String interviewer;

    @Field("date")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss[.SSS][.SS][.S]")
    private LocalDateTime date;

    /** 1..5. */
    @Field("rating")
    private Integer rating;

    @Field("feedback")
    private String feedback;

    @Field("notes")
    private String notes;

    public InterviewStage() {
    }

    public InterviewStage(String name) {
        this.name = name;
        this.outcome = "PENDING";
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getOutcome() {
        return outcome;
    }

    public void setOutcome(String outcome) {
        this.outcome = outcome;
    }

    public String getInterviewer() {
        return interviewer;
    }

    public void setInterviewer(String interviewer) {
        this.interviewer = interviewer;
    }

    public LocalDateTime getDate() {
        return date;
    }

    public void setDate(LocalDateTime date) {
        this.date = date;
    }

    public Integer getRating() {
        return rating;
    }

    public void setRating(Integer rating) {
        this.rating = rating;
    }

    public String getFeedback() {
        return feedback;
    }

    public void setFeedback(String feedback) {
        this.feedback = feedback;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}
