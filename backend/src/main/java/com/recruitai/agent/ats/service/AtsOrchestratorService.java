package com.recruitai.agent.ats.service;

import com.recruitai.agent.ats.model.AtsRequest;
import com.recruitai.agent.ats.model.ResumeSource;
import com.recruitai.agent.entity.Candidate;
import com.recruitai.agent.service.ResumeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;

@Service
public class AtsOrchestratorService {

    @Autowired
    private ResumeCollectorService collectorService;

    @Autowired
    private ResumeService resumeService;

    @Autowired
    private GeminiAgentService geminiAgentService;

    @Autowired
    private com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    @Autowired
    private com.recruitai.agent.repository.CandidateRepository candidateRepository;

    public void triggerCollection(AtsRequest request) {
        try {
            ResumeSource source = ResumeSource.valueOf(request.getSource().toUpperCase());
            collectorService.collectFromSource(source, request.getJobId());
        } catch (Exception e) {
            // Log or handle invalid source
        }
    }

    public Candidate processSingleResume(MultipartFile file, String source, String jobId) throws IOException {
        return resumeService.uploadAndParseResume(file, source, jobId, null);
    }

    public Candidate parseProfileText(String text, String source) {
        // Use Gemini to parse the raw profile text
        String jsonResult = geminiAgentService.parseResume(text);
        
        try {
            com.fasterxml.jackson.databind.JsonNode parsed = objectMapper.readTree(jsonResult);
            
            Candidate candidate = new Candidate();
            candidate.setId("CAN-" + java.util.UUID.randomUUID().toString().substring(0, 8));
            candidate.setName(parsed.path("name").asText("Unknown Candidate"));
            candidate.setEmail(parsed.path("email").asText("pending-" + candidate.getId() + "@recruitai.com"));
            
            java.util.List<String> skills = new java.util.ArrayList<>();
            parsed.path("skills").forEach(s -> skills.add(s.asText()));
            candidate.setSkills(skills);
            
            candidate.setExperience(parsed.path("total_experience_years").asDouble(0.0));
            candidate.setRole(parsed.path("current_role").asText("Unknown Role"));
            candidate.setSummary(parsed.path("summary").asText(""));
            candidate.setVisaType(parsed.path("visa_type").asText(null));
            candidate.setSource(source);
            candidate.setCreatedAt(java.time.LocalDateTime.now());
            candidate.setStatus("New");

            // Check for existing candidate
            return candidateRepository.findByEmail(candidate.getEmail())
                    .orElseGet(() -> candidateRepository.save(candidate));
            
        } catch (Exception e) {
            throw new RuntimeException("AI Parsing failed: " + e.getMessage());
        }
    }
}
