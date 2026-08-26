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

    @Autowired
    private com.recruitai.agent.parser.DeterministicResumeParser deterministicParser;

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
        // Prefer Gemini for the richest parse, but NEVER fail the request when it's
        // unavailable (rate-limit / quota / network). The LinkedIn extension calls this
        // just to enrich its panel, so a 500 leaves the panel empty. Fall back to the
        // deterministic parser instead so structured fields still come back.
        String jsonResult = null;
        try {
            jsonResult = geminiAgentService.parseResume(text);
        } catch (Exception geminiErr) {
            System.err.println("[parse-profile] Gemini unavailable, using deterministic fallback: " + geminiErr.getMessage());
        }

        if (jsonResult != null) {
            try {
                com.fasterxml.jackson.databind.JsonNode parsed = objectMapper.readTree(jsonResult);

                Candidate candidate = new Candidate();
                candidate.setId("CAN-" + java.util.UUID.randomUUID().toString().substring(0, 8));
                candidate.setName(parsed.path("name").asText("Unknown Candidate"));
                candidate.setEmail(parsed.path("email").asText("pending-" + candidate.getId() + "@recruitai.com"));

                // Try to extract LinkedIn URL directly from the text
                String extractedUrl = com.recruitai.agent.service.ResumeService.extractLinkedinUrl(text);
                if (extractedUrl != null) {
                    candidate.setLinkedinUrl(extractedUrl);
                }

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

                // Check for existing candidate by Email first
                Optional<Candidate> existingByEmail = candidateRepository.findByEmail(candidate.getEmail());
                if (existingByEmail.isPresent()) {
                    return existingByEmail.get();
                }

                // Fallback check by LinkedIn URL if Email wasn't a match (or was dummy)
                if (candidate.getLinkedinUrl() != null && !candidate.getLinkedinUrl().isBlank()) {
                    Optional<Candidate> existingByLinkedin = candidateRepository.findByLinkedinUrl(candidate.getLinkedinUrl());
                    if (existingByLinkedin.isPresent()) {
                        return existingByLinkedin.get();
                    }
                }

                return candidateRepository.save(candidate);
            } catch (Exception e) {
                System.err.println("[parse-profile] Gemini JSON unreadable, using deterministic fallback: " + e.getMessage());
            }
        }

        // ---- Deterministic fallback (no Gemini) ----
        // Enrichment only: returns best-effort parsed fields and is NOT persisted, so
        // simply opening the extension panel never creates a candidate row. Only fields
        // the parser actually found are set; the rest stay null so the extension's own
        // DOM scraping keeps whatever it already has.
        Candidate candidate = new Candidate();
        candidate.setSource(source);
        candidate.setStatus("New");
        try {
            com.recruitai.agent.parser.model.ParsedResume p = deterministicParser.parse(text);
            if (p != null) {
                if (p.getName() != null && !p.getName().isBlank())                 candidate.setName(p.getName());
                if (p.getEmail() != null && !p.getEmail().isBlank())               candidate.setEmail(p.getEmail());
                if (p.getPhone() != null && !p.getPhone().isBlank())               candidate.setPhone(p.getPhone());
                if (p.getSkills() != null && !p.getSkills().isEmpty())             candidate.setSkills(p.getSkills());
                if (p.getExperience() != null)                                     candidate.setExperience(p.getExperience());
                if (p.getCurrentRole() != null && !p.getCurrentRole().isBlank())   candidate.setRole(p.getCurrentRole());
                if (p.getSummary() != null && !p.getSummary().isBlank())           candidate.setSummary(p.getSummary());
                if (p.getVisaType() != null && !p.getVisaType().isBlank())         candidate.setVisaType(p.getVisaType());
                if (p.getEducation() != null && !p.getEducation().isEmpty())       candidate.setEducation(p.getEducation());
            }
        } catch (Exception e) {
            System.err.println("[parse-profile] Deterministic fallback failed: " + e.getMessage());
        }
        return candidate; // intentionally not saved
    }
}
