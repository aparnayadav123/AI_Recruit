package com.recruitai.agent.parser;

import com.recruitai.agent.ats.service.GeminiAgentService;
import com.recruitai.agent.parser.model.ParsedResume;
import com.recruitai.agent.validation.ValidationService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class ResumeParserAgent {

    private static final Logger logger = LoggerFactory.getLogger(ResumeParserAgent.class);

    @Autowired
    private DeterministicResumeParser deterministicParser;

    @Autowired
    private ValidationService validationService;

    @Autowired
    private GeminiAgentService geminiAgentService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    public ParsedResume parse(String resumeText) {
        return parse(resumeText, null, null);
    }

    public ParsedResume parse(String resumeText, byte[] data, String mimeType) {
        int textLen = (resumeText != null ? resumeText.length() : 0);
        logger.info("Starting Enterprise Extraction Pipeline. Text Length: {}", textLen);
        if (textLen > 0) {
            logger.info("Resume Text Preview (First 500 chars): {}",
                    resumeText.substring(0, Math.min(textLen, 500)).replace("\n", " "));
        } else {
            logger.warn("Resume Text is EMPTY! Tika failed to extract text.");
        }

        // STEP 1: Deterministic Parser (Mandatory Base Layer)
        ParsedResume parsed = deterministicParser.parse(resumeText);

        // STEP 2: AI-Assisted Extraction (Enhancement Layer)
        // Restored "Super" capabilities to extract Skills, Job Titles, and Context not
        // found by Regex.
        try {
            logger.info("Invoking Gemini AI for enhanced extraction...");
            String jsonResponse = geminiAgentService.parseResume(resumeText, data, mimeType);

            if (jsonResponse != null && !jsonResponse.isEmpty() && !jsonResponse.equals("{}")) {
                JsonNode aiNode = objectMapper.readTree(jsonResponse);
                mergeAiData(parsed, aiNode);
            }
        } catch (Exception e) {
            logger.error("AI Extraction failed (fallback to deterministic only): {}", e.getMessage());
            // Continue with deterministic results
        }

        // STEP 3: Validation Layer (Strict)
        com.recruitai.agent.entity.AuditLog auditLog = new com.recruitai.agent.entity.AuditLog();
        validationService.validate(parsed, auditLog);
        parsed.setAuditLog(auditLog);

        logger.info("Parsing Complete. Email: {}, Confidence: {}, Skills Found: {}",
                parsed.getEmail(), parsed.getConfidenceScore(),
                (parsed.getSkills() != null ? parsed.getSkills().size() : 0));

        return parsed;
    }

    private void mergeAiData(ParsedResume parsed, JsonNode aiNode) {
        logger.info("Merging AI Data: {}", aiNode.toPrettyString());

        // Merge Job Titles
        if (parsed.getJobTitles() == null || parsed.getJobTitles().isEmpty()) {
            if (aiNode.has("job_titles")) {
                parsed.setJobTitles(jsonArrayToList(aiNode.get("job_titles")));
            }
        } else if (aiNode.has("job_titles")) {
            List<String> aiTitles = jsonArrayToList(aiNode.get("job_titles"));
            for (String t : aiTitles) {
                if (!parsed.getJobTitles().contains(t)) {
                    parsed.getJobTitles().add(t);
                }
            }
        }

        // Merge Skills
        if (aiNode.has("skills")) {
            List<String> aiSkills = jsonArrayToList(aiNode.get("skills"));
            if (parsed.getSkills() == null) {
                parsed.setSkills(aiSkills);
            } else {
                for (String s : aiSkills) {
                    boolean exists = parsed.getSkills().stream().anyMatch(existing -> existing.equalsIgnoreCase(s));
                    if (!exists) {
                        parsed.getSkills().add(s);
                    }
                }
            }
        }

        // Current Role
        if ((parsed.getCurrentRole() == null || "NOT_FOUND".equals(parsed.getCurrentRole()))
                && aiNode.has("current_role")) {
            parsed.setCurrentRole(aiNode.get("current_role").asText(null));
        }

        // Education
        if (aiNode.has("education")) {
            // Prefer AI education as it might include degrees Deterministic didn't find
            List<String> aiEdu = jsonArrayToList(aiNode.get("education"));
            if (parsed.getEducation() == null || parsed.getEducation().isEmpty()) {
                parsed.setEducation(aiEdu);
            } else {
                // Add if not present
                for (String e : aiEdu) {
                    if (!parsed.getEducation().contains(e))
                        parsed.getEducation().add(e);
                }
            }
        }

        // Experience
        if ((parsed.getExperience() == null || parsed.getExperience() == 0.0)
                && aiNode.has("total_experience_years")) {
            parsed.setExperience(aiNode.get("total_experience_years").asDouble());
        }

        // Phone - Overwrite if missing or "NOT_FOUND"
        if ((parsed.getPhone() == null || "NOT_FOUND".equals(parsed.getPhone())) && aiNode.has("phone")) {
            String aiPhone = aiNode.get("phone").asText(null);
            if (aiPhone != null && !aiPhone.isEmpty() && !"null".equalsIgnoreCase(aiPhone)) {
                parsed.setPhone(aiPhone);
            }
        }

        // Email - Overwrite if missing or "NOT_FOUND"
        String currentEmail = parsed.getEmail();
        if ((currentEmail == null || "NOT_FOUND".equals(currentEmail) || currentEmail.isEmpty())
                && aiNode.has("email")) {
            String aiEmail = aiNode.get("email").asText(null);
            if (aiEmail != null && !aiEmail.isEmpty() && !"null".equalsIgnoreCase(aiEmail)) {
                logger.info("Overwriting missing email with AI result: {}", aiEmail);
                parsed.setEmail(aiEmail);
            }
        }

        // Name - Overwrite if missing
        String currentName = parsed.getName();
        if ((currentName == null || "Unknown Candidate".equals(currentName) || currentName.isEmpty())
                && aiNode.has("name")) {
            String aiName = aiNode.get("name").asText(null);
            if (aiName != null && !aiName.isEmpty() && !"null".equalsIgnoreCase(aiName)) {
                parsed.setName(aiName);
            }
        }
    }

    private List<String> jsonArrayToList(JsonNode node) {
        List<String> list = new ArrayList<>();
        if (node.isArray()) {
            for (JsonNode item : node) {
                if (item.isTextual()) {
                    list.add(item.asText());
                }
            }
        }
        return list;
    }
}
