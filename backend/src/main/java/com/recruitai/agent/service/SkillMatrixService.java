package com.recruitai.agent.service;

import com.recruitai.agent.entity.Candidate;
import com.recruitai.agent.entity.Job;
import com.recruitai.agent.entity.SkillMatrix;
import com.recruitai.agent.entity.Resume;
import com.recruitai.agent.repository.CandidateRepository;
import com.recruitai.agent.repository.JobRepository;
import com.recruitai.agent.repository.SkillMatrixRepository;
import com.recruitai.agent.repository.ResumeRepository;
import com.recruitai.agent.ats.service.GeminiAgentService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class SkillMatrixService {

    private static final Logger logger = LoggerFactory.getLogger(SkillMatrixService.class);

    // Concurrency control to prevent multiple AI calls for the same candidate
    // simultaneously
    private final Set<String> calculatingCandidates = Collections.synchronizedSet(new HashSet<>());

    @Autowired
    private SkillMatrixRepository skillMatrixRepository;

    @Autowired
    private CandidateRepository candidateRepository;

    @Autowired
    private JobRepository jobRepository;

    @Autowired
    private ResumeRepository resumeRepository;

    @Autowired
    private GeminiAgentService geminiAgentService;

    @Autowired
    private ObjectMapper objectMapper;

    // "Fresher" threshold is now handled dynamically by AI instruction,
    // but we can keep it as a fallback hint if needed.

    public SkillMatrix calculateAndSave(Candidate candidate, String jobId) {
        // DYNAMIC LOGIC: AI Analysis with Deterministic Fallback

        // 1. Check if we already have a matrix to update
        List<SkillMatrix> existing = skillMatrixRepository.findByCandidateId(candidate.getId());
        SkillMatrix matrix = existing.isEmpty() ? new SkillMatrix() : existing.get(0);

        matrix.setCandidateId(candidate.getId());
        matrix.setCandidateName(candidate.getName());
        matrix.setUpdatedAt(LocalDateTime.now());
        if (matrix.getCreatedAt() == null)
            matrix.setCreatedAt(LocalDateTime.now());
        matrix.setJobId(jobId);

        // 2. Pre-populate with Fallback (Immediate display safety)
        if (candidate.getSkills() != null && !candidate.getSkills().isEmpty()) {
            List<SkillMatrix.SkillMetric> fallbackMetrics = new ArrayList<>();
            List<String> skills = candidate.getSkills();
            boolean isFresher = (candidate.getExperience() == null || candidate.getExperience() < 2.0);
            int equalShare = (skills.size() > 0) ? (Math.max(1, 100 / skills.size())) : 0;

            for (int i = 0; i < skills.size(); i++) {
                SkillMatrix.SkillMetric metric = new SkillMatrix.SkillMetric();
                metric.setSkill(skills.get(i));
                metric.setConfidence("Initial");
                if (isFresher)
                    metric.setPercentage(equalShare);
                else {
                    if (i == 0)
                        metric.setPercentage(60);
                    else if (i == 1)
                        metric.setPercentage(40);
                    else
                        metric.setPercentage(30);
                }
                fallbackMetrics.add(metric);
            }
            matrix.setSkillMetrics(fallbackMetrics);
        }

        // 3. AI Enrichment (Multimodal)
        byte[] resumeData = null;
        String mimeType = null;
        if (candidate.getResumeId() != null) {
            Optional<Resume> resumeOpt = resumeRepository.findById(candidate.getResumeId());
            if (resumeOpt.isPresent()) {
                resumeData = resumeOpt.get().getData();
                mimeType = resumeOpt.get().getContentType();
            }
        }

        String skillsContext = "Extracted Skills: "
                + (candidate.getSkills() != null ? String.join(", ", candidate.getSkills()) : "None");
        String jobsJson = "[]";
        if (jobId != null) {
            Optional<Job> jobOpt = jobRepository.findById(jobId);
            if (jobOpt.isPresent()) {
                Job job = jobOpt.get();
                matrix.setJobTitle(job.getTitle());
                try {
                    jobsJson = objectMapper
                            .writeValueAsString(List.of(Map.of("id", job.getId(), "title", job.getTitle())));
                } catch (Exception e) {
                }
            }
        }

        try {
            // PHASE 1: Save Initial Fallback Matrix Immediately
            // This ensures the UI has data to show while waiting for AI enrichment.
            matrix = skillMatrixRepository.save(matrix);
            logger.info("Saved initial fallback matrix for {}", candidate.getName());

            // PHASE 2: AI Enrichment (Multimodal)
            logger.info("Calling Gemini for {} (Background Enrichment)...", candidate.getName());
            String aiResponse = geminiAgentService.calculateFitScore(candidate.getName(), skillsContext, resumeData,
                    mimeType, candidate.getExperience(), jobsJson);
            JsonNode root = objectMapper.readTree(aiResponse);

            if (root.has("skill_matrix") && root.get("skill_matrix").isArray()) {
                List<SkillMatrix.SkillMetric> aiMetrics = new ArrayList<>();
                for (JsonNode node : root.get("skill_matrix")) {
                    SkillMatrix.SkillMetric m = new SkillMatrix.SkillMetric();
                    m.setSkill(node.path("skill").asText("Unknown"));
                    m.setPercentage(node.path("percentage").asInt(0));
                    m.setConfidence(node.path("confidence").asText("High"));
                    aiMetrics.add(m);
                }
                aiMetrics.sort((a, b) -> b.getPercentage() - a.getPercentage());
                matrix.setSkillMetrics(aiMetrics);
                matrix.setUpdatedAt(LocalDateTime.now());
                logger.info("AI Analysis successful for {}", candidate.getName());
            }
        } catch (Exception e) {
            logger.warn("AI Analysis failed for {}: {}. Fallback remains.", candidate.getName(), e.getMessage());
        }

        matrix.setTotalScore(0);
        return skillMatrixRepository.save(matrix);
    }

    public SkillMatrix calculateDeterministic(Candidate candidate, String jobId) {
        // Alias for calculateAndSave now, since we moved logic to dynamic AI
        return calculateAndSave(candidate, jobId);
    }

    public List<SkillMatrix> getByCandidate(String candidateId) {
        List<SkillMatrix> existing = skillMatrixRepository.findByCandidateId(candidateId);

        // If it's already being calculated, just return what we have (don't block
        // again)
        if (calculatingCandidates.contains(candidateId)) {
            return existing;
        }

        boolean needsUpdate = existing.isEmpty() ||
                existing.get(0).getSkillMetrics() == null ||
                existing.get(0).getSkillMetrics().isEmpty();

        if (needsUpdate) {
            Candidate candidate = candidateRepository.findById(candidateId).orElse(null);
            if (candidate != null) {
                // Background calculation to keep API response fast
                new Thread(() -> {
                    if (calculatingCandidates.add(candidate.getId())) {
                        try {
                            calculateAndSave(candidate, candidate.getJobId());
                        } finally {
                            calculatingCandidates.remove(candidate.getId());
                        }
                    }
                }).start();

                // Return current state (even if empty) - the 10s frontend poll will pick it up
                return existing;
            }
        }

        if (existing.size() > 1) {
            existing.sort((a, b) -> b.getUpdatedAt().compareTo(a.getUpdatedAt()));
        }
        return existing;
    }

    public List<SkillMatrix> getByJob(String jobId) {
        if (jobId == null || jobId.isBlank())
            return new ArrayList<>();
        return skillMatrixRepository.findByJobId(jobId);
    }
}
