package com.recruitai.agent.entity;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import com.fasterxml.jackson.databind.JsonSerializer;
import com.fasterxml.jackson.databind.SerializerProvider;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;

/**
 * Shared JSON (de)serialization for wall-clock {@link LocalDateTime} fields.
 *
 * <p>Writes them as an absolute instant carrying the server's zone offset
 * (e.g. "…Z" on a UTC host, "…+05:30" locally) so a browser in ANY timezone
 * computes the correct relative time — "just now", not "6 hours ago". A bare
 * offset-less string is ambiguous: the browser assumes its own zone and a
 * freshly-created row can read as hours old when server and viewer zones differ.</p>
 *
 * <p>Deserialization accepts both the offset-qualified form and legacy offset-less
 * strings (older data / dumps), and never throws on a garbled value.</p>
 */
public final class JsonTimestamp {

    private JsonTimestamp() {
    }

    public static class Serializer extends JsonSerializer<LocalDateTime> {
        @Override
        public void serialize(LocalDateTime value, JsonGenerator gen, SerializerProvider sp) throws IOException {
            if (value == null) {
                gen.writeNull();
                return;
            }
            gen.writeString(value.atZone(ZoneId.systemDefault()).toOffsetDateTime().toString());
        }
    }

    public static class Deserializer extends JsonDeserializer<LocalDateTime> {
        @Override
        public LocalDateTime deserialize(JsonParser p, DeserializationContext ctx) throws IOException {
            String s = p.getValueAsString();
            if (s == null || s.isBlank()) {
                return null;
            }
            s = s.trim();
            try {
                // Offset/zoned form (…+05:30 / …Z) → normalize to the server's wall-clock.
                return OffsetDateTime.parse(s).atZoneSameInstant(ZoneId.systemDefault()).toLocalDateTime();
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
