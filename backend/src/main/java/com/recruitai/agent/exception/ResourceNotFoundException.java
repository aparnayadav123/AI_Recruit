package com.recruitai.agent.exception;

/**
 * Thrown when a referenced resource (candidate, job, interview, …) cannot be
 * located by its identifier. Mapped to HTTP 404 by GlobalExceptionHandler.
 */
public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String message) {
        super(message);
    }
    public ResourceNotFoundException(String resource, String id) {
        super(resource + " not found with id: " + id);
    }
}
