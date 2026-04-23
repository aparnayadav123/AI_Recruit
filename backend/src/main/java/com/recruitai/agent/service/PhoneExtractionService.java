package com.recruitai.agent.service;

import com.recruitai.agent.ats.service.GeminiAgentService;
import com.recruitai.agent.validation.PhoneValidator;
import com.recruitai.agent.validation.ValidationResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * Production-ready Phone Extraction Service.
 * Implements strict extraction, logic-based normalization, and AI verification.
 */
@Service
public class PhoneExtractionService {

    private static final Logger logger = LoggerFactory.getLogger(PhoneExtractionService.class);

    @Autowired
    private PhoneValidator phoneValidator;

    @Autowired
    private GeminiAgentService geminiAgentService;

    /**
     * Extracts and normalizes phone number from resume text.
     * 
     * @param resumeText The raw text of the resume
     * @param auditLog   Existing audit log to record extraction details
     * @return Normalized phone number or "Not Found"
     */
    public String extractPhone(String resumeText, com.recruitai.agent.entity.AuditLog auditLog) {
        String extractedPhone = "Not Found";
        String method = "NONE";

        try {
            // STEP 1: Deterministic Regex Extraction (Primary)
            ValidationResult regexResult = phoneValidator.extractAndValidate(resumeText);

            if (regexResult.isValid()) {
                extractedPhone = (String) regexResult.getValue();
                method = "Regex";
                logger.info("Phone extracted via Regex: {}", extractedPhone);
            } else {
                // STEP 2: AI-Assisted Extraction (Secondary)
                // Use Gemini to locate phone number if text is messy or unconventional
                logger.debug("Regex extraction failed. Attempting AI extraction...");
                String aiExtracted = geminiAgentService.parseResume(resumeText);
                // The Gemini parseResume returns a full JSON, we should probably have a
                // specific method
                // but we can extract 'phone' from the JSON returned by parseResume.

                com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                com.fasterxml.jackson.databind.JsonNode node = mapper.readTree(aiExtracted);
                String aiPhone = node.has("phone") ? node.get("phone").asText() : null;

                if (aiPhone != null && !"null".equals(aiPhone) && !aiPhone.isEmpty()) {
                    String normalized = phoneValidator.normalize(aiPhone);
                    if (!"NOT_FOUND".equals(normalized)) {
                        extractedPhone = normalized;
                        method = "AI";
                        logger.info("Phone extracted via AI: {}", extractedPhone);
                    }
                }
            }

            // STEP 3: Fallback/Validation result logging
            if (auditLog != null) {
                auditLog.setExtractionMethod(method);
                if ("Not Found".equals(extractedPhone)) {
                    auditLog.addMissingField("phone");
                }
            }

        } catch (Exception e) {
            logger.error("Error during phone extraction process", e);
            extractedPhone = "Not Found";
        }

        logger.info("Extraction Result: Method={}, Value={}", method, extractedPhone);
        return extractedPhone;
    }
}
