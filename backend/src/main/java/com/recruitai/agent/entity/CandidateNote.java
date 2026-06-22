package com.recruitai.agent.entity;

import com.fasterxml.jackson.annotation.JsonFormat;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.LocalDateTime;

/**
 * A free-text note attached to a candidate (like a sticky note / whiteboard entry).
 * Each note has a type — e.g. "Call Discussion" or "Face-to-Face Meeting" — plus the
 * message, who wrote it, and when. Append-only; notes are kept for later viewing.
 */
@Document(collection = "candidate_notes")
public class CandidateNote {

    @Id
    private String id;

    @Field("candidate_id")
    private String candidateId;

    /** "Call Discussion" | "Face-to-Face Meeting" | (other). */
    @Field("type")
    private String type;

    @Field("message")
    private String message;

    @Field("author")
    private String author;

    @Field("created_at")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    public CandidateNote() {
        this.createdAt = LocalDateTime.now();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getCandidateId() { return candidateId; }
    public void setCandidateId(String candidateId) { this.candidateId = candidateId; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getAuthor() { return author; }
    public void setAuthor(String author) { this.author = author; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
