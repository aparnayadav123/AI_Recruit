package com.recruitai.agent.service;

import com.recruitai.agent.entity.Job;
import com.recruitai.agent.entity.Candidate;
import com.recruitai.agent.ats.service.GeminiAgentService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Set;
import java.util.stream.Collectors;

@Service
public class FitScoreService {

    @Autowired
    private GeminiAgentService geminiAgentService;

    @Autowired
    private ObjectMapper objectMapper;

    public int calculateFitScore(Candidate candidate, Job job) {
        try {
            String jobSkills = job.getSkills().stream().map(s -> s.getName()).collect(Collectors.joining(", "));
            String candSkills = String.join(", ", candidate.getSkills());

            // Check for empty values to avoid API errors
            if (jobSkills.isEmpty() || candSkills.isEmpty())
                return 0;

            // Updated to match new GeminiAgentService signature
            String jsonResponse = geminiAgentService.calculateFitScore(
                    candidate.getName(),
                    "", // resumeText not available here
                    candidate.getExperience(),
                    "[{\"job_id\":\"" + job.getId() + "\",\"title\":\"" + job.getTitle()
                            + "\",\"required_skills\":[]}]");

            JsonNode node = objectMapper.readTree(jsonResponse);
            return node.path("best_match_job").path("fit_score").asInt(0);
        } catch (Exception e) {
            System.err.println("Gemini Fit Score Failed: " + e.getMessage());
            // Fallback to basic size-based matching
            return calculateFallbackScore(candidate, job);
        }
    }

    public int calculateFallbackScore(Candidate candidate, Job job) {
        if (job.getSkills() == null || candidate.getSkills() == null || job.getSkills().isEmpty())
            return 0;

        Set<String> cSkills = candidate.getSkills().stream()
                .map(String::toLowerCase)
                .map(String::trim)
                .collect(Collectors.toSet());

        long matchCount = job.getSkills().stream()
                .map(s -> s.getName().toLowerCase().trim())
                .filter(jobSkill -> {
                    if (cSkills.contains(jobSkill))
                        return true;
                    return cSkills.stream()
                            .anyMatch(candSkill -> candSkill.contains(jobSkill) || jobSkill.contains(candSkill));
                })
                .count();

        double ratio = (double) matchCount / job.getSkills().size();
        return (int) (ratio * 100.0);
    }
}
