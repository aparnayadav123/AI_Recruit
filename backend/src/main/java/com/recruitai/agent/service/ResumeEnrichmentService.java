package com.recruitai.agent.service;

import com.recruitai.agent.entity.Candidate;
import com.recruitai.agent.entity.Job;
import com.recruitai.agent.parser.model.ParsedResume;
import com.recruitai.agent.repository.CandidateRepository;
import com.recruitai.agent.repository.JobRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.recruitai.agent.ats.service.GeminiAgentService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Heavy AI work moved off the resume-upload request thread so the UI gets a
 * fresh candidate back in under a second. Each call to {@link #enrich} runs on
 * Spring's default async executor and only fills fields the deterministic
 * pre-pass left empty, so a user editing the candidate in parallel won't have
 * their input clobbered.
 */
@Service
public class ResumeEnrichmentService {

    private static final Logger logger = LoggerFactory.getLogger(ResumeEnrichmentService.class);

    @Autowired private CandidateRepository candidateRepository;
    @Autowired private JobRepository jobRepository;
    @Autowired private GeminiAgentService geminiAgentService;
    @Autowired private SkillMatrixService skillMatrixService;
    @Autowired private com.recruitai.agent.parser.ResumeParserAgent parserAgent;
    @Autowired private ObjectMapper objectMapper;

    @Async
    public void enrich(String candidateId, String tikaText, byte[] resumeBytes, String mimeType) {
        long t0 = System.currentTimeMillis();
        try {
            ParsedResume ai = parserAgent.parse(tikaText, resumeBytes, mimeType);

            String aiJobId = null;
            String aiRole = null;
            Integer aiFitScore = null;
            List<Job> allJobs = jobRepository.findAll();
            if (!allJobs.isEmpty() && ai != null) {
                try {
                    List<Map<String, Object>> simplifiedJobs = allJobs.stream().limit(15).map(job -> {
                        Map<String, Object> m = new HashMap<>();
                        m.put("job_id", job.getId());
                        m.put("title", job.getTitle());
                        m.put("required_skills", job.getRequiredSkills());
                        m.put("min_experience", job.getMinExperience());
                        return m;
                    }).collect(java.util.stream.Collectors.toList());
                    String jobsJson = objectMapper.writeValueAsString(simplifiedJobs);
                    String name = ai.getName() != null ? ai.getName() : "Candidate";
                    Double exp = ai.getExperience() != null ? ai.getExperience() : 0.0;
                    String contextText = (tikaText != null && tikaText.length() > 50) ? tikaText
                            : "Skills: " + (ai.getSkills() != null ? String.join(", ", ai.getSkills()) : "");
                    String fitScoreJson = geminiAgentService.calculateFitScore(name, contextText, exp, jobsJson);
                    JsonNode node = objectMapper.readTree(fitScoreJson);
                    aiJobId = node.path("job_id").asText(null);
                    aiRole = node.path("assigned_role").asText(null);
                    aiFitScore = node.path("fit_score").asInt(0);
                } catch (Exception e) {
                    logger.warn("enrich: fit-score failed for {}: {}", candidateId, e.getMessage());
                }
            }

            final String fJobId = aiJobId;
            final String fRole = aiRole;
            final Integer fFitScore = aiFitScore;
            candidateRepository.findById(candidateId).ifPresent(c -> {
                boolean changed = false;

                if (ai != null) {
                    if ((c.getSkills() == null || c.getSkills().isEmpty()) && ai.getSkills() != null && !ai.getSkills().isEmpty()) {
                        c.setSkills(ai.getSkills()); changed = true;
                    } else if (ai.getSkills() != null) {
                        // Union missing skills
                        List<String> merged = new java.util.ArrayList<>(c.getSkills());
                        for (String s : ai.getSkills()) {
                            boolean exists = merged.stream().anyMatch(x -> x.equalsIgnoreCase(s));
                            if (!exists) { merged.add(s); changed = true; }
                        }
                        c.setSkills(merged);
                    }
                    if ((c.getExperience() == null || c.getExperience() == 0.0) && ai.getExperience() != null) {
                        c.setExperience(ai.getExperience()); changed = true;
                    }
                    if ((c.getEducation() == null || c.getEducation().isEmpty()) && ai.getEducation() != null && !ai.getEducation().isEmpty()) {
                        c.setEducation(ai.getEducation()); changed = true;
                    }
                    if ((c.getSummary() == null || c.getSummary().isBlank()) && ai.getSummary() != null) {
                        c.setSummary(ai.getSummary()); changed = true;
                    }
                    if ((c.getVisaType() == null || c.getVisaType().isBlank()) && ai.getVisaType() != null) {
                        c.setVisaType(ai.getVisaType()); changed = true;
                    }
                    if ((c.getVisaValidity() == null || c.getVisaValidity().isBlank()) && ai.getVisaValidity() != null) {
                        c.setVisaValidity(ai.getVisaValidity()); changed = true;
                    }
                    if ((c.getReasonForChange() == null || c.getReasonForChange().isBlank()) && ai.getReasonForChange() != null) {
                        c.setReasonForChange(ai.getReasonForChange()); changed = true;
                    }
                    if ((c.getRecentlyAppliedCompanies() == null || c.getRecentlyAppliedCompanies().isBlank()) && ai.getRecentlyAppliedCompanies() != null) {
                        c.setRecentlyAppliedCompanies(ai.getRecentlyAppliedCompanies()); changed = true;
                    }
                    if (ai.getConfidenceScore() != null && c.getConfidenceScore() == null) {
                        c.setConfidenceScore("HIGH".equals(ai.getConfidenceScore()) ? 90.0 : 40.0);
                        changed = true;
                    }
                }

                // Only assign a job if the fast path didn't already match one
                if ((c.getJobId() == null || c.getJobId().isBlank()) && fJobId != null && !fJobId.isBlank()) {
                    c.setJobId(fJobId);
                    if (c.getRole() == null || "Not Matched".equalsIgnoreCase(c.getRole()) || c.getRole().isBlank()) {
                        c.setRole(fRole != null ? fRole : c.getRole());
                    }
                    if (fFitScore != null) {
                        c.setFitScore(fFitScore);
                        c.setShortlisted(fFitScore >= 70);
                    }
                    c.setJobAssignedBy("AI");
                    changed = true;
                }

                if (changed) {
                    c.setUpdatedAt(LocalDateTime.now());
                    candidateRepository.save(c);
                }

                // Skill matrix is deterministic (no API call), regenerate so the UI sees
                // the enriched skill set.
                try {
                    skillMatrixService.calculateAndSave(c, c.getJobId());
                } catch (Exception e) {
                    logger.warn("enrich: skill matrix regen failed for {}: {}", c.getId(), e.getMessage());
                }
            });

            logger.info("enrich: candidate {} enriched in {} ms", candidateId, System.currentTimeMillis() - t0);
        } catch (Exception e) {
            logger.error("enrich: failed for {}: {}", candidateId, e.getMessage());
        }
    }
}