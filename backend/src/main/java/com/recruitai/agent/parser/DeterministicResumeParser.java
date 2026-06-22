package com.recruitai.agent.parser;

import com.recruitai.agent.parser.model.ParsedResume;
import com.recruitai.agent.validation.EmailValidator;
import com.recruitai.agent.validation.PhoneValidator;
import com.recruitai.agent.validation.ValidationResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Deterministic Resume Parser (Primary Extraction Layer)
 * Uses strict regex and rule-based logic to extract data without hallucination.
 */
@Component
public class DeterministicResumeParser {

    private static final Logger logger = LoggerFactory.getLogger(DeterministicResumeParser.class);

    @Autowired
    private EmailValidator emailValidator;

    @Autowired
    private PhoneValidator phoneValidator;

    // Common technical skills dictionary for deterministic extraction
    private static final Set<String> CONFIRMED_SKILLS = new HashSet<>(Arrays.asList(
            "java", "python", "c", "c++", "c#", ".net", "javascript", "typescript", "react", "angular", "vue",
            "node.js", "express", "spring boot", "hibernate", "jpa", "sql", "mysql", "postgresql",
            "mongodb", "redis", "elasticsearch", "aws", "azure", "gcp", "docker", "kubernetes", "jenkins",
            "git", "maven", "gradle", "linux", "bash", "html", "css", "sass", "less", "redux", "graphql",
            "rest api", "soap", "microservices", "kafka", "rabbitmq", "hadoop", "spark", "scala", "kotlin",
            "swift", "android", "ios", "flutter", "react native", "selenium", "junit", "testng", "cucumber",
            "jira", "agile", "scrum", "devops", "ci/cd", "terraform", "ansible", "machine learning", "ai",
            "deep learning", "nlp", "tensorflow", "pytorch", "pandas", "numpy", "scikit-learn", "project management",
            "communication", "teamwork", "leadership", "problem solving", "manual testing",
            // NEW SKILLS ADDED
            "salesforce", "apex", "lightning", "visualforce", "uipath", "automation anywhere", "blue prism", "rpa",
            "figma", "adobe xd", "sketch", "invision", "wireframing", "prototyping", "ui design", "ux design",
            "sap", "abap", "hana", "erp", "crm", "oracle", "pl/sql", "dynamics 365", "powerapps", "power bi", "tableau",
            "excel", "word", "powerpoint", "mendix", "outsystems", "low-code", "no-code",
            "blockchain", "smart contracts", "solidity", "ethereum", "hyperledger",
            "iot", "embedded c", "arduino", "raspberry pi", "mqtt", "unity", "unreal engine", "c++", "blender",
            "seo", "sem", "google analytics", "content marketing", "digital marketing",
            "technical writing", "documentation", "api documentation", "white papers",
            "recruiting", "sourcing", "screening", "interviewing", "ats", "hr", "human resources"));

    public ParsedResume parse(String resumeText) {
        logger.info("Starting Deterministic Parsing");
        ParsedResume resume = new ParsedResume();

        if (resumeText == null || resumeText.trim().isEmpty()) {
            return resume;
        }

        // 1. Extract Name (Heuristic: First non-empty line usually contains name)
        extractName(resumeText, resume);

        // 2. Extract Email (Strict Regex)
        ValidationResult emailResult = emailValidator.extractAndValidate(resumeText);
        if (emailResult.isValid()) {
            resume.setEmail((String) emailResult.getValue());
        }

        // 3. Extract Phone (Strict Regex)
        ValidationResult phoneResult = phoneValidator.extractAndValidate(resumeText);
        if (phoneResult.isValid()) {
            resume.setPhone((String) phoneResult.getValue());
        }

        // 4. Extract Skills (Dictionary Match)
        List<String> foundSkills = extractSkills(resumeText);
        resume.setSkills(foundSkills);

        // 5. Extract Experience (Regex for years)
        resume.setExperience(extractExperience(resumeText));

        // 6. Set Source (Default)
        resume.setResumeSource("Local System");

        resume.setConfidenceScore("HIGH"); // Base confidence for deterministic

        return resume;
    }

    private void extractName(String text, ParsedResume resume) {
        // Simple heuristic: First line that isn't too short or too long, and isn't a
        // known keyword
        String[] lines = text.split("\\n");
        for (String line : lines) {
            String trimmed = line.trim();
            if (trimmed.length() > 3 && trimmed.length() < 50 && !isKeyword(trimmed)) {
                // Formatting: Capitalize words
                resume.setName(formatName(trimmed));
                return; // Stop after first potential name
            }
        }
    }

    private boolean isKeyword(String text) {
        String lower = text.toLowerCase();
        return lower.contains("resume") || lower.contains("cv") || lower.contains("curriculum vitae")
                || lower.contains("page") || lower.startsWith("email") || lower.startsWith("phone");
    }

    private String formatName(String name) {
        // Basic capitalization
        return Arrays.stream(name.split("\\s+"))
                .map(word -> word.substring(0, 1).toUpperCase() + word.substring(1).toLowerCase())
                .collect(Collectors.joining(" "));
    }

    private List<String> extractSkills(String text) {
        // RULE: Normalize "Java Script" to "JavaScript"
        String normalizedText;
        try {
            normalizedText = normalizeVariations(text.toLowerCase());
        } catch (Exception e) {
            logger.error("Skill normalization failed: {}", e.getMessage());
            normalizedText = text.toLowerCase();
        }

        List<String> found = new ArrayList<>();

        for (String skill : CONFIRMED_SKILLS) {
            // Check for whole word match
            if (containsWholeWord(normalizedText, skill)) {
                found.add(capitalizeSkill(skill));
            }
        }
        return found;
    }

    private String normalizeVariations(String text) {
        // Regex handles: "java" + whitespace + "script" -> "javascript"
        // (?i) flag not needed as text is already passed as lowerCase
        text = text.replaceAll("java\\s+script", "javascript");
        text = text.replaceAll("react\\s+js", "react");
        text = text.replaceAll("node\\s+js", "node.js");
        text = text.replaceAll("angular\\s+js", "angular");
        text = text.replaceAll("vue\\s+js", "vue");
        return text;
    }

    private boolean containsWholeWord(String text, String word) {
        Pattern pattern = Pattern.compile("\\b" + Pattern.quote(word) + "\\b");
        Matcher matcher = pattern.matcher(text);

        while (matcher.find()) {
            if (word.equalsIgnoreCase("java")) {
                // Check if followed by "script" or "server" (e.g. Java Script, Java Server
                // Pages)
                int end = matcher.end();
                if (end < text.length()) {
                    String nextPart = text.substring(end).trim().toLowerCase();
                    if (nextPart.startsWith("script") || nextPart.startsWith("server")) {
                        continue; // Skip this match, it's not Java
                    }
                }
            }
            return true;
        }
        return false;
    }

    private String capitalizeSkill(String skill) {
        if (skill.length() <= 3)
            return skill.toUpperCase(); // SQL, AWS etc
        return skill.substring(0, 1).toUpperCase() + skill.substring(1);
    }

    private Double extractExperience(String text) {
        // Regex to look for "X years", "X+ years", "X.Y years"
        Pattern pattern = Pattern.compile("(\\d+(\\.\\d+)?)\\+?\\s*years?", Pattern.CASE_INSENSITIVE);
        Matcher matcher = pattern.matcher(text);

        Double maxYears = 0.0;

        while (matcher.find()) {
            try {
                Double years = Double.parseDouble(matcher.group(1));
                if (years < 50) { // Sanity check
                    if (years > maxYears)
                        maxYears = years;
                }
            } catch (NumberFormatException e) {
                // ignore
            }
        }
        return maxYears;
    }
}
