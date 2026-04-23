package com.recruitai.agent.ats.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;
import java.util.Base64;

@Service
public class GeminiAgentService {

    private static final Logger logger = LoggerFactory.getLogger(GeminiAgentService.class);

    @Value("${gemini.api.key}")
    private String apiKey;

    @Value("${gemini.api.model:gemini-1.5-flash-001}")
    private String model;

    private static final String BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/";

    private final RestTemplate restTemplate;
    private final ObjectMapper mapper = new ObjectMapper();

    public GeminiAgentService() {
        org.springframework.http.client.SimpleClientHttpRequestFactory factory = new org.springframework.http.client.SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(30000); // 30s
        factory.setReadTimeout(90000); // 90s for Pro/Flash with multiple retries
        this.restTemplate = new RestTemplate(factory);
    }

    public String parseResume(String resumeText) {
        return parseResume(resumeText, null, null);
    }

    public String parseResume(String resumeText, byte[] data, String mimeType) {
        // OPTIMIZATION: If text is good quality, use TEXT-ONLY (Faster).
        // If text is garbage/missing, use VISION (Slower but accurate).

        boolean useVision = (resumeText == null || resumeText.length() < 500 || isPoisoned(resumeText));
        logger.info("Parsing Strategy: " + (useVision ? "VISION (Slow, High Accuracy)" : "TEXT-ONLY (Fast)"));

        String prompt = """
                You are an Enterprise AI Recruitment Intelligence Agent acting as the SINGLE SOURCE OF TRUTH for resume data.

                Input Source: %s

                **INSTRUCTION**:
                Extract the following fields from the provided resume content.
                If any field is missing, return null. DO NOT Hallucinate.

                2️⃣ REQUIRED FIELDS TO EXTRACT

                1. **name**: Full Name
                   - Extract first valid personal name near header.
                   - Must not contain numbers, symbols, or file names.
                   - If not found, return null.

                2. **email**: RFC-compliant email only
                   - Must match: name@domain.tld
                   - No placeholders like example@email.com.
                   - If not found, return null.

                3. **phone**: Phone Number
                   - Extract exactly as it appears.
                   - If not found, return null.

                4. **skills**: Technical Skills Only
                   - Normalize to canonical format (e.g., "Java", "Python").
                   - Remove duplicates.
                   - REJECT soft skills.
                   - STRICTLY extract ONLY skills explicitly mentioned. DO NOT infer frameworks.
                   - Return empty array if none found.

                5. **total_experience_years**: Experience Calculation
                   - Calculate from employment date ranges: CurrentDate - FirstJobStartDate.
                   - Return 0 years if fresher.
                   - Return numeric float (e.g., 2.5).

                6. **job_titles**: Job Roles
                   - Return list of strings.

                7. **current_role**: Most recent job title.

                8. **education**: List of degrees/institutions.

                9. **visa_type**: The candidate's current visa status (e.g., 'Work Visa', 'Student Visa', 'Spouse Visa').

                10. **visa_validity**: The expiration date or validity period of the visa if mentioned.

                11. **reason_for_change**: The reason why the candidate is looking for a new job, if mentioned (e.g., 'Career Growth', 'Relocation').

                12. **recently_applied_companies**: Any companies the candidate recently applied to, if mentioned.

                13. **summary**: A 2-3 sentence professional summary of the candidate's career.

                **MATCHING RULES**:
                1. Compare extracted skills against the provided Job Definitions.
                2. **MANDATORY**: A candidate MUST possess at least 40%% of the required skills for a job to be considered a match.
                3. If matches < 40%% of required skills:
                   - "assigned_role": "Not Matched"
                   - "fit_score": 0
                   - "job_id": null
                4. If candidate has "Java" skill -> Can be "Java Developer".
                   If candidate MISSES "Java" skill -> CANNOT be "Java Developer" (Assign "Not Matched").

                INPUT RESUME TEXT:
                """
                .formatted(useVision ? "Visual Document + Text Layer" : "High-Quality Extracted Text")
                + (resumeText != null ? resumeText : "")
                + """
                        \"\"\"

                        Output ONLY valid JSON in this format:
                        {
                          "name": "string or null",
                          "email": "string or null",
                          "phone": "string or null",
                          "skills": ["string"],
                          "total_experience_years": float,
                          "job_titles": ["string"],
                          "current_role": "string or null",
                          "education": ["string"],
                          "visa_type": "string or null",
                          "visa_validity": "string or null",
                          "reason_for_change": "string or null",
                          "recently_applied_companies": "string or null",
                          "summary": "string or null"
                        }
                        """;

        // Always prioritize multimodal (Vision + Text) if data is available
        String response;
        long startTime = System.currentTimeMillis();
        boolean textOnlyAttempted = false;

        if (useVision && data != null && mimeType != null && data.length > 0) {
            // Use 3 retries for robustness (Vision is heavier)
            response = getGeminiResponseWithMedia(prompt, data, mimeType, 2, 5000);
        } else {
            // Text only is fast, 2 retries enough
            response = getGeminiResponse(prompt, 2, 2000);
            textOnlyAttempted = true;
        }

        logger.info("Parsing took: " + (System.currentTimeMillis() - startTime) + "ms");

        try {
            JsonNode root = mapper.readTree(response);
            logger.debug("Gemini Raw API Response: {}", response);

            String rawJson;
            if (root.has("candidates") && root.get("candidates").isArray()) {
                rawJson = root.at("/candidates/0/content/parts/0/text").asText();
            } else {
                rawJson = cleanJsonResponse(response);
            }

            logger.info("Gemini Extracted JSON: {}", rawJson);

            // RETRY STRATEGY: If Text-Only failed (no email/skills/NAME), Force Vision
            if (textOnlyAttempted && data != null && data.length > 0) {
                JsonNode extracted = mapper.readTree(cleanJsonResponse(rawJson));

                boolean noName = !extracted.has("name") || extracted.get("name").isNull()
                        || extracted.get("name").asText().trim().isEmpty();
                boolean noEmail = !extracted.has("email") || extracted.get("email").isNull()
                        || extracted.get("email").asText().trim().isEmpty();
                boolean noSkills = !extracted.has("skills") || extracted.get("skills").isEmpty();

                // AGGRESSIVE RETRY: If Name OR Email is missing, we must retry. Users hate
                // "Unknown" candidates.
                if (noName || noEmail || (noSkills && extracted.size() < 3)) {
                    logger.warn("Text-Only parsing yielded poor results (Missing Name/Email). RETRYING with VISION...");
                    String visionResponse = getGeminiResponseWithMedia(prompt, data, mimeType, 2, 5000);
                    JsonNode visionRoot = mapper.readTree(visionResponse);
                    if (visionRoot.has("candidates")) {
                        rawJson = visionRoot.at("/candidates/0/content/parts/0/text").asText();
                        logger.info("Vision Retry JSON: {}", rawJson);
                    }
                }
            }

            return cleanJsonResponse(rawJson);
        } catch (Exception e) {
            logger.error("Failed to parse Gemini response. Raw: {}", response);
            throw new RuntimeException("Failed to parse Gemini response", e);
        }
    }

    private boolean isPoisoned(String text) {
        if (text == null || text.isBlank())
            return true;
        long nonAscii = text.chars().filter(c -> c > 127).count();
        double ratio = (double) nonAscii / text.length();
        return ratio > 0.2; // Treat as poisoned if > 20% weird chars
    }

    private String cleanJsonResponse(String rawResponse) {
        if (rawResponse == null || rawResponse.trim().isEmpty())
            return "{}";

        String cleaned = rawResponse.trim();

        // 1. Remove markdown fragments if present
        if (cleaned.contains("```json")) {
            cleaned = cleaned.substring(cleaned.indexOf("```json") + 7);
            if (cleaned.contains("```")) {
                cleaned = cleaned.substring(0, cleaned.lastIndexOf("```"));
            }
        } else if (cleaned.contains("```")) {
            cleaned = cleaned.substring(cleaned.indexOf("```") + 3);
            if (cleaned.contains("```")) {
                cleaned = cleaned.substring(0, cleaned.lastIndexOf("```"));
            }
        }

        // 2. Final attempt: extract between first { and last }
        int start = cleaned.indexOf('{');
        int end = cleaned.lastIndexOf('}');
        if (start != -1 && end != -1 && end > start) {
            cleaned = cleaned.substring(start, end + 1);
        }

        return cleaned.trim();
    }

    // Original overload (backwards compatibility)
    public String calculateFitScore(String candidateName, String resumeText, Double yearsOfExp, String jobsJson) {
        return calculateFitScore(candidateName, resumeText, null, null, yearsOfExp, jobsJson);
    }

    // New overload supporting byte[] data
    public String calculateFitScore(String candidateName, String resumeText, byte[] resumeData, String mimeType,
            Double yearsOfExp, String jobsJson) {
        String prompt = """
                You are given a candidate profile and a list of available jobs from the job management system.

                Your task:
                1. Analyze candidate skills, experience, and projects
                2. Compare them with each job’s required skills and experience
                3. Assign the BEST MATCHING job role from the job list only
                4. Calculate a fit score from 0 to 100
                5. Explain why this role was selected
                6. List missing skills if any

                ---

                Candidate Profile:
                Name: %s
                Skills/Context: %s
                Experience: %s years

                ---

                Available Jobs:
                %s

                ---

                Fit Score Rules:
                - Skill Match = 40%% (STRICT: "Java" != "JavaScript". If mismatch, score = 0)
                - Experience Match = 30%%
                - Tools & Tech Match = 20%%

                SKILL MATRIX DISTRIBUTION RULES (CRITICAL):
                1. **Freshers (< 2 Years Experience)**:
                   - **EQUAL DISTRIBUTION RULE**: You MUST distribute skill percentages EQUALLY among the top identified skills.
                   - Example: If Java and SQL are the top skills found, Java = 50%%, SQL = 50%%.
                   - Example: If Java, SQL, and Python found, each gets ~33%%.
                   - Do not assign arbitrary variance unless one skill is clearly a minor mention (e.g., "Basics of X").

                2. **Experienced (> 2 Years)**:
                   - **PROJECT DURATION / TIME DECAY RULE**: Calculate proficiency based on years of experience with that specific skill.
                   - Example: Total 4 Years Exp.
                     - Worked on Java for 4 years? -> Java = 50%% (Dominant/Expert).
                     - Started Spring 2 years ago? -> Spring = 30%%.
                     - Started SpringBoot 2 years later? -> SpringBoot = 20%%.
                   - The skill with the longest duration/most recent usage MUST be the TOP SKILL.

                3. **CERTIFICATION BONUS (GOLDEN RULE)**:
                   - Scan the resume for "Certifications" or "Licences".
                   - If a candidate has a valid certification for a skill (e.g., "Oracle Certified Java Programmer", "AWS Solutions Architect"), that skill **MUST** be boosted to the TOP or near-TOP.
                   - Mark confidence as "Very High" for certified skills.

                CRITICAL SKILL-ROLE MATRIX (SOURCE OF TRUTH):
                Use this reference to determine if a candidate qualifies for a role.
                | Job Role | Required Skills |
                | Software Developer / Engineer | Java, Python, C++, OOP, Data Structures, Git, Debugging, SDLC |
                | Frontend Developer | HTML, CSS, JavaScript, React, Angular, Vue, Responsive Design, UI/UX |
                | Backend Developer | Java, Node.js, Python, REST APIs, Spring Boot, Express, Databases (SQL/NoSQL) |
                | Full Stack Developer | React, Node.js / Java, MongoDB / MySQL, REST APIs, Git, Cloud Basics |
                | Java Developer | Java, Spring, Spring Boot, Hibernate, REST APIs, SQL, Git |
                | Python Developer | Python, Django / Flask, APIs, SQL, Pandas, NumPy |
                | DevOps Engineer | AWS / Azure, Docker, Kubernetes, CI/CD, Linux, Git, Terraform |
                | Cloud Engineer | AWS, Azure, GCP, IAM, Networking, Virtual Machines, Storage |
                | Data Analyst | Excel, SQL, Python, Power BI, Tableau, Data Visualization, Statistics |
                | Data Scientist | Python, Machine Learning, Pandas, NumPy, TensorFlow, Data Modeling |
                | Machine Learning Engineer | Python, ML Algorithms, TensorFlow, PyTorch, APIs, MLOps |
                | AI Engineer | Python, GenAI, LLMs, LangChain, RAG, OpenAI API, Vector DB |
                | Cybersecurity Engineer | Network Security, Firewalls, SIEM, Ethical Hacking, Risk Management |
                | QA Engineer / Tester | Manual Testing, Selenium, Test Cases, Automation, API Testing |
                | Automation Tester | Selenium, Cypress, Playwright, Java / Python, CI/CD |
                | Mobile App Developer | Android, iOS, Flutter, React Native, REST APIs |
                | UI/UX Designer | Figma, Adobe XD, Wireframing, Prototyping, User Research |
                | System Administrator | Linux, Windows Server, Networking, Bash, Monitoring |
                | Network Engineer | TCP/IP, Routing, Switching, Firewalls, VPN |
                | Database Administrator (DBA) | MySQL, PostgreSQL, Oracle, Backup, Performance Tuning |
                | Business Analyst (IT) | Requirements Gathering, SQL, Documentation, Agile, Jira |
                | Project Manager (IT) | Project Planning, Agile, Scrum, Jira, Risk Management, SDLC |
                | Product Manager (Tech) | Roadmaps, Agile, Jira, Stakeholder Management, Tech Basics |
                | Software Engineer Trainee | Java / Python / C, OOP Basics, Git, Problem Solving |
                | Frontend Developer Intern | HTML, CSS, JavaScript, React Basics, Responsive Design |

                CRITICAL RULES:
                1. Do NOT assign "Java Developer" if candidate only knows "JavaScript".
                2. Do NOT assign "Senior" roles if experience < required.
                3. Do NOT assign "Intern" or "Trainee" roles if candidate has > 1 year of experience.
                4. MUST assign "Intern" or "Trainee" roles if candidate has < 1 year of experience (Fresher).
                5. If technical skills do not align with any job in the list (cross-referenced with the Matrix above), assigned_role MUST be "Not Matched" and fit_score MUST be 0.
                6. VALID_MATCH: A candidate is a match if they have at least 40%% of required skills OR at least 2 matching skills.
                7. **FULL STACK RULE**: A candidate MUST have both FRONTEND (React/Angular/Vue/HTML) AND BACKEND (Node/Java/Python/SQL) skills. If missing one side, assign specifically "Frontend Developer" or "Backend Developer" instead.
                8. Do NOT force a match. It is better to return "Not Matched" than a wrong match.

                ---

                {
                  "assigned_role": "Exact Job Title from List OR 'Not Matched'",
                  "job_id": "Exact Job ID from List OR null",
                  "fit_score": 0,
                  "match_summary": "Explanation of score. If Not Matched, explain why.",
                  "missing_skills": [],
                  "strengths": [],
                  "skill_matrix": [
                    { "skill": "Skill Name", "percentage": 85, "confidence": "High" }
                  ],
                  "candidate_profile": {
                    "extracted_role": "string",
                    "experience_years": 0.0
                  }
                }
                """
                .formatted(candidateName, (resumeText != null ? resumeText : "See attached document"), yearsOfExp,
                        jobsJson);

        String response;
        if (resumeData != null && resumeData.length > 0 && mimeType != null) {
            // ROBUST STRATEGY: Use Vision/Multimodal with 3 retries
            response = getGeminiResponseWithMedia(prompt, resumeData, mimeType, 3, 5000);
        } else {
            // Standard Text
            response = getGeminiResponse(prompt, 3, 5000);
        }

        try {
            JsonNode root = mapper.readTree(response);
            // Robust extraction: Check for standard Gemini response structure first
            if (root.has("candidates") && root.get("candidates").isArray()) {
                String rawJson = root.at("/candidates/0/content/parts/0/text").asText();
                return cleanJsonResponse(rawJson);
            }
            // Fallback
            String rawJson = root.at("/candidates/0/content/parts/0/text").asText();
            if (rawJson == null || rawJson.isEmpty()) {
                return cleanJsonResponse(response);
            }
            return cleanJsonResponse(rawJson);
        } catch (Exception e) {
            System.err.println("Gemini Response Parse Error: " + e.getMessage());
            return cleanJsonResponse(response);
        }
    }

    private String getGeminiResponse(String prompt, int maxRetries, int initialWait) {
        int waitTime = initialWait;

        for (int i = 0; i <= maxRetries; i++) {
            try {
                Map<String, Object> body = Map.of(
                        "contents", List.of(
                                Map.of("parts", List.of(
                                        Map.of("text", prompt)))));

                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);

                String trimmedModel = (model != null && !model.isBlank()) ? model.trim() : "gemini-1.5-flash";
                String url = BASE_URL + trimmedModel + ":generateContent?key=" + apiKey;
                System.out.println(">>> GEMINI CALL START <<<");
                System.out.println(">>> URL: " + url.replace(apiKey, "REDACTED"));
                System.out.println(">>> MODEL: [" + trimmedModel + "]");
                System.out.println(">>> PROMPT LENS: " + (prompt != null ? prompt.length() : "NULL"));

                ResponseEntity<String> response = restTemplate.postForEntity(url, new HttpEntity<>(body, headers),
                        String.class);
                System.out.println(">>> GEMINI CALL SUCCESS (Status: " + response.getStatusCode() + ")");
                return response.getBody();

            } catch (org.springframework.web.client.HttpStatusCodeException e) {
                if (e.getStatusCode().value() == 429 && i < maxRetries) {
                    logger.warn("Gemini Rate Limit (429) hit. Retrying in {}ms... (Attempt {}/{})", waitTime, i + 1,
                            maxRetries);
                    try {
                        Thread.sleep(waitTime);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                    }
                    waitTime *= 2; // Exponential backoff
                    continue;
                }
                // If it's 429 and we are out of retries, or if it's another error, print and
                // fail.
                logger.error("Gemini HTTP Error: {} - Body: {}", e.getStatusCode(), e.getResponseBodyAsString());

                if (e.getStatusCode().value() != 429) {
                    System.err.println("Gemini HTTP Error: " + e.getStatusCode() + " - " + e.getResponseBodyAsString());
                }
                throw new RuntimeException("Gemini API HTTP failure: " + e.getStatusCode());
            } catch (Exception e) {
                System.err.println("Gemini Connection/Processing Error: " + e.getMessage());
                throw new RuntimeException("Gemini API failed", e);
            }
        }
        throw new RuntimeException("Gemini API failed after multiple retries");
    }

    private String getGeminiResponseWithMedia(String prompt, byte[] data, String mimeType, int maxRetries,
            int initialWait) {
        String base64Data = Base64.getEncoder().encodeToString(data);
        // Valid model from updated list
        String trimmedModel = (model != null && !model.isBlank()) ? model.trim() : "gemini-1.5-flash";

        for (int i = 0; i <= maxRetries; i++) {
            try {
                Map<String, Object> partText = Map.of("text", prompt);
                Map<String, Object> partMedia = Map.of("inline_data", Map.of(
                        "mime_type", mimeType,
                        "data", base64Data));

                Map<String, Object> body = Map.of(
                        "contents", List.of(
                                Map.of("parts", List.of(partText, partMedia))));

                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);

                String url = BASE_URL + trimmedModel + ":generateContent?key=" + apiKey;
                logger.debug("Calling Gemini Multimodal API: {} (model: {})", url.replace(apiKey, "REDACTED"),
                        trimmedModel);
                // Headers already defined above, reused here
                HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

                ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);
                if (response.getStatusCode() == HttpStatus.OK) {
                    return response.getBody();
                }
            } catch (Exception e) {
                if (i == maxRetries)
                    throw e;
                try {
                    Thread.sleep(initialWait * (long) Math.pow(2, i));
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                }
            }
        }
        return "{}";
    }

    public String generateFormattedCv(String candidateName, String resumeText, byte[] resumeData, String mimeType) {
        String prompt = """
                You are an expert Resume Re-writer and Executive Branding Consultant.
                Your task is to take the provided resume data and transform it into a HIGH-CONVERSION, PROFESSIONALLY FORMATTED CV.

                **BRANDING GUIDELINES**:
                1. Use a clean, enterprise-standard layout.
                2. Standardize section headers: SUMMARY, CORE COMPETENCIES, PROFESSIONAL EXPERIENCE, EDUCATION.
                3. Rewrite bullet points to focus on ACHIEVEMENTS and IMPACT (using the STAR method: Situation, Task, Action, Result).
                4. Ensure perfect grammar and high-impact action verbs.
                5. Remove any personal photos, excessive colors, or distracting fonts from the text representation.
                6. THE OUTPUT MUST BE IN VALID MARKDOWN.

                Candidate Name: %s
                Input Resume Content:
                """
                .formatted(candidateName) + (resumeText != null ? resumeText : "See attached document");

        String response;
        if (resumeData != null && resumeData.length > 0 && mimeType != null) {
            response = getGeminiResponseWithMedia(prompt, resumeData, mimeType, 2, 3000);
        } else {
            response = getGeminiResponse(prompt, 2, 2000);
        }

        try {
            JsonNode root = mapper.readTree(response);
            if (root.has("candidates") && root.get("candidates").isArray()) {
                JsonNode firstCandidate = root.get("candidates").get(0);
                if (firstCandidate.has("content")) {
                    return firstCandidate.at("/content/parts/0/text").asText();
                }
            }
            return "Internal Error: Could not format CV.";
        } catch (Exception e) {
            logger.error("Failed to parse Gemini Formatted CV response", e);
            return "Error formatting CV: " + e.getMessage();
        }
    }
    public String generateCandidateReply(String candidateName, String candidateRole, String candidateSkills, String recruiterMessage) {
        String prompt = """
                You are a job candidate named %s. 
                You are a %s with skills in %s.
                
                You just received the following message from a recruiter:
                \"\"\"
                %s
                \"\"\"
                
                Your task is to craft a professional, enthusiastic, and contextual reply to this message. 
                
                **CONSTRAINTS**:
                1. Keep the tone professional but human.
                2. Address specific points mentioned in the recruiter's message.
                3. Mention one of your relevant skills or experience if it fits.
                4. End with a proactive closing (e.g., asking for a meeting, expressing interest).
                5. Output ONLY the message text. NO markdown backticks, NO "Candidate: " prefix.
                """.formatted(candidateName, candidateRole, candidateSkills, recruiterMessage);

        String response = getGeminiResponse(prompt, 2, 2000);
        
        try {
            JsonNode root = mapper.readTree(response);
            if (root.has("candidates") && root.get("candidates").isArray()) {
                JsonNode firstCandidate = root.get("candidates").get(0);
                if (firstCandidate.has("content")) {
                    return firstCandidate.at("/content/parts/0/text").asText().trim();
                }
            }
            return cleanJsonResponse(response);
        } catch (Exception e) {
            logger.error("Failed to parse Gemini Candidate Reply response", e);
            return "Hi there! Thank you for reaching out. I'm definitely interested in learning more about this opportunity.";
        }
    }
}
