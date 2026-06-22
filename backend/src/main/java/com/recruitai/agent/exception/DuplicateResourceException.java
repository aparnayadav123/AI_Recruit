package com.recruitai.agent.exception;

/**
 * Thrown when an attempted create conflicts with an existing record (e.g.
 * a candidate with the same email). Mapped to HTTP 409 Conflict by
 * GlobalExceptionHandler.
 */
public class DuplicateResourceException extends RuntimeException {
    public DuplicateResourceException(String message) {
        super(message);
    }
}
