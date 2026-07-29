package com.recruitai.agent.entity;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import com.fasterxml.jackson.databind.JsonSerializer;
import com.fasterxml.jackson.databind.SerializerProvider;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;

/**
 * In-app notification surfaced by the bell icon in the top bar.
 *
 * <p>Each notification has a short bold {@link #title} (e.g. "Candidate Applied"),
 * a longer {@link #message} body, and a {@link #category} from a fixed set so
 * the UI can show the right icon and group them sensibly:</p>
 *
 * <ul>
 *   <li>INTERVIEW — scheduled / rescheduled / completed / cancelled</li>
 *   <li>CANDIDATE — new applicant, shortlisted, status change</li>
 *   <li>JOB       — job created, published, closed</li>
 *   <li>APPROVAL  — deletion request submitted / decided</li>
 *   <li>SYSTEM    — anything ops-level (migrations, errors, etc.)</li>
 * </ul>
 *
 * <p>{@link #entityName} is the candidate or job display name the UI bolds
 * inside the message (e.g. the candidate name in "Aparna Boligerla applied for
 * Senior Engineer").</p>
 */
@Document(collection = "notifications")
public class Notification {

    public static final String CATEGORY_INTERVIEW = "INTERVIEW";
    public static final String CATEGORY_CANDIDATE = "CANDIDATE";
    public static final String CATEGORY_JOB       = "JOB";
    public static final String CATEGORY_APPROVAL  = "APPROVAL";
    public static final String CATEGORY_SYSTEM    = "SYSTEM";

    @Id
    private String id;
    private String title;        // bold heading e.g. "Interview Scheduled"
    private String message;      // detailed body
    private String entityName;   // name to highlight inside the message
    private String type;         // INFO / SUCCESS / WARNING
    private boolean read;
    /**
     * When the notification was created, in server wall-clock. Serialized to JSON as an
     * absolute instant WITH the server's zone offset (e.g. "…+05:30" / "…Z") so the browser
     * computes "just now" correctly no matter which timezone the server or the browser runs
     * in. A bare LocalDateTime string (no offset) is ambiguous — the browser would guess the
     * zone and could show a just-created notification as "6 hours ago". Deserialization
     * accepts both the offset form and the legacy offset-less form (old backup dumps).
     */
    @JsonSerialize(using = SystemZoneInstantSerializer.class)
    @JsonDeserialize(using = FlexibleLocalDateTimeDeserializer.class)
    private LocalDateTime createdAt;
    private String relatedEntityId;
    private String category;     // see CATEGORY_* constants above

    public Notification() {
        this.createdAt = LocalDateTime.now();
        this.read = false;
    }

    /** Legacy two-arg constructor kept so existing callers compile unchanged. */
    public Notification(String message, String type) {
        this.message = message;
        this.type = type;
        this.read = false;
        this.createdAt = LocalDateTime.now();
    }

    /** Preferred constructor — pass title + message + category + entityName + type. */
    public Notification(String title, String message, String category, String entityName, String type) {
        this.title = title;
        this.message = message;
        this.category = category;
        this.entityName = entityName;
        this.type = type;
        this.read = false;
        this.createdAt = LocalDateTime.now();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public String getEntityName() { return entityName; }
    public void setEntityName(String entityName) { this.entityName = entityName; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public boolean isRead() { return read; }
    public void setRead(boolean read) { this.read = read; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public String getRelatedEntityId() { return relatedEntityId; }
    public void setRelatedEntityId(String relatedEntityId) { this.relatedEntityId = relatedEntityId; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    /**
     * Writes a wall-clock {@link LocalDateTime} as an absolute instant carrying the server's
     * current zone offset (ISO-8601, e.g. "2026-07-28T13:45:15.619+05:30"). This removes the
     * timezone ambiguity that made a just-created notification render as "6 hours ago".
     */
    static class SystemZoneInstantSerializer extends JsonSerializer<LocalDateTime> {
        @Override
        public void serialize(LocalDateTime value, JsonGenerator gen, SerializerProvider sp)
                throws IOException {
            if (value == null) {
                gen.writeNull();
                return;
            }
            gen.writeString(value.atZone(ZoneId.systemDefault()).toOffsetDateTime().toString());
        }
    }

    /**
     * Reads a timestamp back into wall-clock. Accepts either the offset/zoned form written by
     * {@link SystemZoneInstantSerializer} (converted to the server zone) or the legacy
     * offset-less form found in older backup dumps. Never throws on a garbled value.
     */
    static class FlexibleLocalDateTimeDeserializer extends JsonDeserializer<LocalDateTime> {
        @Override
        public LocalDateTime deserialize(JsonParser p, DeserializationContext ctx)
                throws IOException {
            String s = p.getValueAsString();
            if (s == null || s.isBlank()) {
                return null;
            }
            s = s.trim();
            try {
                // Offset/zoned form (…+05:30 / …Z) → normalize to the server's wall-clock.
                return OffsetDateTime.parse(s).atZoneSameInstant(ZoneId.systemDefault())
                        .toLocalDateTime();
            } catch (DateTimeParseException ignored) {
                // Not offset-qualified — fall through to a plain local date-time.
            }
            try {
                return LocalDateTime.parse(s);
            } catch (DateTimeParseException e) {
                return null;
            }
        }
    }
}
