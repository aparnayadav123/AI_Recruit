package com.recruitai.agent.validation;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.regex.Pattern;
import java.util.regex.Matcher;

/**
 * Enterprise-grade email validator with strict regex validation
 * Returns "NOT_FOUND" for invalid or missing emails (zero-hallucination policy)
 */
@Component
public class EmailValidator {

    private static final Logger logger = LoggerFactory.getLogger(EmailValidator.class);

    // Enterprise specification regex - Relaxed for better capture
    // Allow broader set of characters and formats
    private static final String EMAIL_REGEX = "[a-zA-Z0-9._%+-]+@(?:[a-zA-Z0-9-]+\\.)+[a-zA-Z]{2,}";
    private static final Pattern EMAIL_PATTERN = Pattern.compile(EMAIL_REGEX, Pattern.CASE_INSENSITIVE);

    /**
     * Validates an email address against enterprise specification
     * 
     * @param email Email address to validate
     * @return ValidationResult with validation status and errors
     */
    public ValidationResult validate(String email) {
        if (email == null || email.trim().isEmpty()) {
            logger.debug("Email validation failed: null or empty");
            return ValidationResult.notFound("email");
        }

        String trimmedEmail = email.trim();

        // Check for placeholder/generated emails (zero-hallucination check)
        if (isPlaceholderEmail(trimmedEmail)) {
            logger.warn("Detected placeholder email: {}", trimmedEmail);
            return ValidationResult.failure("email", "Placeholder email detected - not a real email address");
        }

        Matcher matcher = EMAIL_PATTERN.matcher(trimmedEmail);
        if (matcher.matches()) {
            logger.debug("Email validation successful: {}", trimmedEmail);
            return ValidationResult.success("email", trimmedEmail);
        } else {
            logger.warn("Email validation failed for: {}", trimmedEmail);
            return ValidationResult.failure("email", "Email format invalid - must match pattern: " + EMAIL_REGEX);
        }
    }

    /**
     * Extracts and validates email from resume text
     * 
     * @param resumeText Full resume text
     * @return ValidationResult with extracted email or NOT_FOUND
     */
    public ValidationResult extractAndValidate(String resumeText) {
        if (resumeText == null || resumeText.trim().isEmpty()) {
            return ValidationResult.notFound("email");
        }

        // Try to find email in text
        Pattern extractPattern = Pattern.compile(EMAIL_REGEX, Pattern.CASE_INSENSITIVE);
        Matcher matcher = extractPattern.matcher(resumeText);

        // Prefer Gmail addresses if multiple emails found
        String gmailAddress = null;
        String firstValidEmail = null;

        while (matcher.find()) {
            String foundEmail = matcher.group();

            // Skip placeholder emails
            if (isPlaceholderEmail(foundEmail)) {
                continue;
            }

            if (firstValidEmail == null) {
                firstValidEmail = foundEmail;
            }

            if (foundEmail.toLowerCase().endsWith("@gmail.com")) {
                gmailAddress = foundEmail;
                break; // Prefer Gmail
            }
        }

        String extractedEmail = gmailAddress != null ? gmailAddress : firstValidEmail;

        if (extractedEmail != null) {
            logger.info("Extracted email from resume: {}", extractedEmail);
            return ValidationResult.success("email", extractedEmail);
        } else {
            logger.warn("No valid email found in resume text");
            return ValidationResult.notFound("email");
        }
    }

    /**
     * Checks if email is a placeholder/generated email
     */
    private boolean isPlaceholderEmail(String email) {
        if (email == null)
            return true;

        String lowerEmail = email.toLowerCase();
        return lowerEmail.startsWith("pending-") ||
                lowerEmail.startsWith("no-email") ||
                lowerEmail.contains("@example.com") ||
                lowerEmail.contains("@test.com") ||
                lowerEmail.contains("@placeholder.com") ||
                lowerEmail.equals("not_found");
    }

    /**
     * Quick validation check - returns true if email is valid
     */
    public boolean isValid(String email) {
        return validate(email).isValid();
    }

    /**
     * Returns validated email or "NOT_FOUND"
     */
    public String getValidatedEmailOrNotFound(String email) {
        ValidationResult result = validate(email);
        return result.isValid() ? (String) result.getValue() : "NOT_FOUND";
    }
}
