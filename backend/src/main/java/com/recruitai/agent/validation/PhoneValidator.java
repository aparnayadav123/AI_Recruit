package com.recruitai.agent.validation;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.regex.Pattern;
import java.util.regex.Matcher;

/**
 * Phone number validator with international format support
 */
@Component
public class PhoneValidator {

    private static final Logger logger = LoggerFactory.getLogger(PhoneValidator.class);

    // More specific regex to find potential phone numbers while avoiding
    // dates/random numbers
    private static final Pattern FIND_PATTERN = Pattern.compile(
            "(?:\\+?\\d{1,4}[\\s.-]*)?(?:\\(?\\d{2,5}\\)?[\\s.-]*)?\\d{3,5}[\\s.-]*\\d{3,5}(?:[\\s.-]*\\d{3,5})?");

    /**
     * Validates and normalizes
     */
    public ValidationResult validate(String phone) {
        if (phone == null || phone.trim().isEmpty()) {
            return ValidationResult.notFound("phone");
        }
        String normalized = normalize(phone);
        if ("NOT_FOUND".equals(normalized)) {
            return ValidationResult.failure("phone", "Invalid format");
        }
        return ValidationResult.success("phone", normalized);
    }

    /**
     * Extracts and validates phone from resume text
     */
    public ValidationResult extractAndValidate(String resumeText) {
        if (resumeText == null || resumeText.trim().isEmpty()) {
            return ValidationResult.notFound("phone");
        }

        Matcher matcher = FIND_PATTERN.matcher(resumeText);

        while (matcher.find()) {
            String candidate = matcher.group();
            String normalized = normalize(candidate);
            if (!"NOT_FOUND".equals(normalized)) {
                logger.info("Extracted and normalized phone: {} -> {}", candidate, normalized);
                return ValidationResult.success("phone", normalized);
            }
        }

        logger.warn("No valid phone number found in resume");
        return ValidationResult.notFound("phone");
    }

    /**
     * Normalizes phone number to standard format +CCXXXXXXXXXX
     */
    public String normalize(String phone) {
        if (phone == null || phone.trim().isEmpty()) {
            return "NOT_FOUND";
        }

        // 1. Strip all non-numeric characters except leading +
        String cleaned = phone.trim();
        boolean hasPlus = cleaned.startsWith("+");
        String digits = cleaned.replaceAll("[^0-9]", "");

        // 2. Length Validation
        // Minimum 10 digits (local), Max 15 (E.164 max)
        if (digits.length() < 10 || digits.length() > 15) {
            return "NOT_FOUND";
        }

        // 3. Normalization Logic

        // Case A: Exactly 10 Digits (e.g., 9891234567) -> Default to India +91 (Feature
        // requirement)
        if (digits.length() == 10) {
            return "+91" + digits;
        }

        // Case B: 11 Digits starting with 0 (e.g., 09891234567) -> Strip 0, treat as
        // Case A
        if (digits.length() == 11 && digits.startsWith("0")) {
            return "+91" + digits.substring(1);
        }

        // Case C: 12 Digits starting with 91 (e.g., 919891234567) -> Add +
        if (digits.length() == 12 && digits.startsWith("91")) {
            return "+" + digits;
        }

        // Case D: International handling
        // If it starts with 1 (USA) and is 11 digits: 1-xxx-xxx-xxxx
        if (digits.length() == 11 && digits.startsWith("1")) {
            return "+" + digits;
        }

        // Case E: If user provided '+', trust the digits as is (assuming valid CC)
        if (hasPlus) {
            return "+" + digits;
        }

        // Fallback for valid digit strings that don't match known local patterns but
        // are long enough using heuristic
        // Assume it's a number with a country code but missing the plus
        return "+" + digits;
    }

    /**
     * Quick validation check
     */
    public boolean isValid(String phone) {
        return !"NOT_FOUND".equals(normalize(phone));
    }

    /**
     * Returns validated phone or "NOT_FOUND"
     */
    public String getValidatedPhoneOrNotFound(String phone) {
        String normalized = normalize(phone);
        return "NOT_FOUND".equals(normalized) ? "NOT_FOUND" : normalized;
    }
}
