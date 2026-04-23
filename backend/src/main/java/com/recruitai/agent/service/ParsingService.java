package com.recruitai.agent.service;

import com.recruitai.agent.dto.CandidateDto;
import org.apache.tika.Tika;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import com.recruitai.agent.util.SkillNormalizer;

@Service
public class ParsingService {
    private static final Logger logger = LoggerFactory.getLogger(ParsingService.class);
    private final Tika tika = new Tika();

    private static final Pattern EMAIL_PATTERN = Pattern.compile("[a-zA-Z0-0._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,6}");
    private static final Pattern PHONE_PATTERN = Pattern
            .compile("(\\+?\\d{1,3}[-.\\s]?)?\\(?\\d{3}\\)?[-.\\s]?\\d{3}[-.\\s]?\\d{4}");

    // Expanded Skill List for better matching
    private static final List<String> COMMON_SKILLS = Arrays.asList(
            "Java", "Python", "React", "Node.js", "Spring Boot", "Docker", "Kubernetes", "SQL", "NoSQL",
            "TypeScript", "JavaScript", "AWS", "Azure", "GCP", "C++", "C#", ".Net", "Angular", "Vue",
            "MongoDB", "PostgreSQL", "MySQL", "Redis", "Kafka", "Microservices", "REST API", "GraphQL",
            "DevOps", "CI/CD", "Jenkins", "Git", "Linux", "Terraform", "Ansible", "Machine Learning",
            "AI", "Data Science", "Hibernate", "JPA", "HTML", "CSS", "SASS", "Redux", "Next.js");

    public CandidateDto parseResume(byte[] data, String fileName) {
        CandidateDto dto = new CandidateDto();
        try {
            String text = tika.parseToString(new ByteArrayInputStream(data));
            logger.info("Parsed text from {}: {} characters", fileName, text.length());

            // 1. Extract Email
            Matcher emailMatcher = EMAIL_PATTERN.matcher(text);
            if (emailMatcher.find()) {
                dto.setEmail(emailMatcher.group());
            }

            // 2. Extract Phone
            Matcher phoneMatcher = PHONE_PATTERN.matcher(text);
            if (phoneMatcher.find()) {
                dto.setPhone(phoneMatcher.group());
            }

            // 3. Extract Name (Heuristic: first non-empty line or before email)
            String[] lines = text.split("\\r?\\n");
            for (String line : lines) {
                if (!line.trim().isEmpty() && line.trim().length() < 50) {
                    dto.setName(line.trim());
                    break;
                }
            }

            // 4. Extract Skills
            List<String> foundSkills = new ArrayList<>();
            String lowerText = text.toLowerCase();
            for (String skill : COMMON_SKILLS) {
                if (lowerText.contains(skill.toLowerCase())) {
                    foundSkills.add(skill);
                }
            }
            dto.setSkills(SkillNormalizer.normalize(foundSkills));

            // 5. Extract Experience (Permissive regex: "experience" is optional)
            Pattern expPattern = Pattern.compile("(\\d+(\\.\\d+)?)\\s*(year|yr|month|mon)s?(\\s*experience)?",
                    Pattern.CASE_INSENSITIVE);
            Matcher expMatcher = expPattern.matcher(text);
            if (expMatcher.find()) {
                try {
                    double val = Double.parseDouble(expMatcher.group(1));
                    String unit = expMatcher.group(3).toLowerCase();
                    if (unit.startsWith("month") || unit.startsWith("mon")) {
                        val = val / 12.0;
                    }
                    dto.setExperience(val);
                    System.out.println("ParsingService: Extracted " + val + " (" + unit + ") from text");
                } catch (Exception e) {
                    dto.setExperience(0.0);
                }
            } else {
                dto.setExperience(0.0);
            }

            // 6. Role/Industry placeholders
            dto.setRole("Extracted Candidate");
            dto.setStatus("New");

        } catch (Exception e) {
            logger.error("Failed to parse resume: {}", fileName, e);
            // Don't produce "Unknown - filename" as it looks random/fake.
            // Leave name as null or empty so validation can catch it or UI shows blank.
            dto.setName(fileName); // Fallback to filename is acceptable, but not "Unknown -"
        }
        return dto;
    }
}
