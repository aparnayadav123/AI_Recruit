package com.recruitai.agent.validation;

import com.recruitai.agent.entity.AuditLog;
import com.recruitai.agent.parser.model.ParsedResume;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Orchestrates validation rules and populates the Audit Log.
 * Enforces Zero-Hallucination policy.
 */
@Service
public class ValidationService {

    private static final Logger logger = LoggerFactory.getLogger(ValidationService.class);

    @Autowired
    private EmailValidator emailValidator;

    @Autowired
    private PhoneValidator phoneValidator;

    public void validate(ParsedResume resume, AuditLog auditLog) {
        logger.info("Starting validation for resume: {}", resume.getName());
        boolean isPartial = false;

        // 1. Validate Email
        ValidationResult emailResult = emailValidator.validate(resume.getEmail());
        if (!emailResult.isValid()) {
            auditLog.addValidationError("Invalid Email: " + emailResult.getErrorMessage());
            // User request: Do NOT overwrite with NOT_FOUND if AI found something.
            // Just warn.
            if (resume.getEmail() == null || resume.getEmail().isEmpty()) {
                auditLog.addMissingField("email");
                resume.setEmail("NOT_FOUND");
            } else {
                logger.warn("Kept invalid email from parser: {}", resume.getEmail());
            }
            isPartial = true;
        }

        // 2. Validate Phone
        ValidationResult phoneResult = phoneValidator.validate(resume.getPhone());
        if (!phoneResult.isValid()) {
            auditLog.addValidationError("Invalid Phone: " + phoneResult.getErrorMessage());
            auditLog.addMissingField("phone");
            resume.setPhone("NOT_FOUND");
            isPartial = true;
        }

        // 3. Validate Skills
        List<String> skills = resume.getSkills();
        if (skills == null || skills.isEmpty()) {
            auditLog.addMissingField("skills");
            isPartial = true;
        }

        // 4. Validate Experience
        if (resume.getExperience() == null) {
            resume.setExperience(0.0); // Default to 0 instead of null
        }

        // 5. Check Confidence & Set Status
        // If critical fields are missing, status is PARTIAL_DATA
        if (isPartial) {
            resume.setConfidenceScore("LOW"); // Force low confidence
            auditLog.setParserConfidence("LOW");
        } else {
            auditLog.setParserConfidence("HIGH");
        }

        // Log final status
        logger.info("Validation complete. Partial Data: {}", isPartial);
    }
}
