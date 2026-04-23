package com.recruitai.agent.service;

import com.recruitai.agent.entity.Candidate;
import com.recruitai.agent.entity.Resume;
import com.recruitai.agent.parser.ResumeParserAgent;
import com.recruitai.agent.parser.model.ParsedResume;
import com.recruitai.agent.repository.CandidateRepository;
import com.recruitai.agent.repository.ResumeRepository;
import org.apache.tika.Tika;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import com.recruitai.agent.ats.service.GeminiAgentService;
// Wait, I see other fully qualified names in the file lines 42, 45.
// Let's just add the specific import for GeminiAgentService and fix line 39 first.

@Service
@Transactional
public class ResumeService implements org.springframework.beans.factory.InitializingBean {

    private static final Logger logger = LoggerFactory.getLogger(ResumeService.class);

    @Autowired
    private ResumeRepository resumeRepository;

    @Autowired
    private CandidateRepository candidateRepository;

    @Autowired
    private ResumeParserAgent parserAgent;

    @Autowired
    private GeminiAgentService geminiAgentService;

    @Autowired
    private com.recruitai.agent.repository.AuditLogRepository auditLogRepository;

    @Autowired
    private com.recruitai.agent.repository.JobRepository jobRepository;

    @Autowired
    private PhoneExtractionService phoneExtractionService;

    @Autowired
    private SkillMatrixService skillMatrixService;

    @Autowired
    private com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    /**
     * PRODUCTION CLEANUP: Automatically delete invalid "NOT_FOUND" records on
     * startup.
     */
    @Override
    public void afterPropertiesSet() throws Exception {
        logger.info("Executing Production Cleanup: Removing invalid candidates...");
        List<Candidate> invalidCandidates = candidateRepository.findAll().stream()
                .filter(c -> c.getName() == null
                        || c.getName().contains("NOT_FOUND")
                        || "Unknown Candidate".equalsIgnoreCase(c.getName())
                        || (c.getEmail() == null || c.getEmail().contains("placeholder")))
                .collect(java.util.stream.Collectors.toList());

        if (!invalidCandidates.isEmpty()) {
            candidateRepository.deleteAll(invalidCandidates);
            logger.info("CLEANUP SUCCESS: Deleted " + invalidCandidates.size() + " invalid/ghost candidates.");
        } else {
            logger.info("CLEANUP: System is clean.");
        }
    }

    public Candidate uploadAndParseResume(MultipartFile file, String source) throws IOException {
        return uploadAndParseResume(file, source, null, null);
    }

    public Candidate uploadAndParseResume(MultipartFile file, String source, String jobId, String assignedBy) throws IOException {

        Resume resume = new Resume();
        resume.setId("RES-" + UUID.randomUUID().toString().substring(0, 8));
        resume.setFileName(file.getOriginalFilename());
        resume.setContentType(file.getContentType());
        resume.setSize(file.getSize());
        resume.setData(file.getBytes());
        resume.setSource(source);
        resumeRepository.save(resume);

        String text = "";
        try {
            text = new Tika().parseToString(new ByteArrayInputStream(file.getBytes()));
            if (text == null)
                text = "";
        } catch (Exception e) {
            logger.error("Resume text extraction failed", e);
        }

        // Clean text if it looks like binary garbage
        if (text.length() < 10 || isPoisoned(text)) {
            text = "";
        }

        // 1. PARSE (Generative AI + Vision)
        ParsedResume parsed = parserAgent.parse(text, file.getBytes(), file.getContentType());

        // 2. AUDIT LOG
        if (parsed.getAuditLog() != null) {
            com.recruitai.agent.entity.AuditLog auditLog = parsed.getAuditLog();
            auditLog.setResumeId(resume.getId());
            auditLogRepository.save(auditLog);
        }

        // VALIDATION: Fail early if no data
        if (parsed.getName() == null && parsed.getEmail() == null) {
            throw new RuntimeException("Validation Failed: Could not extract Name or Email from resume.");
        }

        // DUPLICATE CHECK: Fail if candidate with this email already exists
        if (parsed.getEmail() != null) {
            java.util.Optional<Candidate> existing = candidateRepository.findByEmail(parsed.getEmail());
            // If checking globally, use findByEmail. If checking per job, logic differs.
            // Requirement: "if i upload ... same existed user ... throw message that
            // candidate is already existed"
            // We assume global uniqueness for this error.
            if (existing.isPresent()) {
                throw new RuntimeException("Candidate already exists with email: " + parsed.getEmail());
            }
        }

        // 3. JOB MATCHING & ROLE ASSIGNMENT (Determined before creating/loading
        // candidate)
        String lookupEmail = (parsed.getEmail() != null) ? parsed.getEmail()
                : "pending-" + resume.getId() + "@placeholder.com";
        String candidateName = parsed.getName();
        if (candidateName == null || candidateName.trim().isEmpty()) {
            String safeName = (file.getOriginalFilename() != null) ? file.getOriginalFilename() : "Unknown_Resume";
            if (safeName.contains("."))
                safeName = safeName.substring(0, safeName.lastIndexOf('.'));
            candidateName = safeName.replace("_", " ").replace("-", " ");
        }

        // Create a temporary candidate to run matching logic
        Candidate tempMatch = new Candidate();
        tempMatch.setName(candidateName);
        tempMatch.setEmail(lookupEmail);
        tempMatch.setSkills(parsed.getSkills());
        tempMatch.setExperience(parsed.getExperience());

        try {
            List<com.recruitai.agent.entity.Job> allJobs = jobRepository.findAll();
            if (!allJobs.isEmpty()) {
                // Determine Job Matching
                try {
                    List<java.util.Map<String, Object>> simplifiedJobs = allJobs.stream().limit(15).map(job -> {
                        java.util.Map<String, Object> map = new java.util.HashMap<>();
                        map.put("job_id", job.getId());
                        map.put("title", job.getTitle());
                        map.put("required_skills", job.getRequiredSkills());
                        map.put("min_experience", job.getMinExperience());
                        return map;
                    }).collect(java.util.stream.Collectors.toList());

                    String jobsJson = objectMapper.writeValueAsString(simplifiedJobs);
                    String textContext = (text != null && text.length() > 50) ? text
                            : "Skills: "
                                    + (tempMatch.getSkills() != null ? String.join(", ", tempMatch.getSkills()) : "");
                    Double experience = (parsed.getExperience() != null) ? parsed.getExperience() : 0.0;
                    String fitScoreJson = geminiAgentService.calculateFitScore(candidateName, textContext, experience,
                            jobsJson);
                    com.fasterxml.jackson.databind.JsonNode fitNode = objectMapper.readTree(fitScoreJson);

                    tempMatch.setJobId(fitNode.path("job_id").asText(null));
                    tempMatch.setRole(fitNode.path("assigned_role").asText("Not Matched"));
                    tempMatch.setFitScore(fitNode.path("fit_score").asInt(0));
                } catch (Exception e) {
                    logger.error("AI Matching Suggestion Failed during upload: {}", e.getMessage());
                }

                // Deterministic refinement
                performDeterministicMatch(tempMatch);
            }
        } catch (Exception e) {
            logger.error("Role matching failure: {}", e.getMessage());
        }

        // 4. GET OR CREATE CANDIDATE (Based on Email AND JobId)
        String assignedJobId = tempMatch.getJobId();
        Candidate candidate = candidateRepository.findByEmailAndJobId(lookupEmail, assignedJobId)
                .orElse(null);

        if (candidate != null) {
            logger.info("Updating existing application for {} - Job: {}", lookupEmail, assignedJobId);
            // Re-uploading for SAME JOB: Reset status to New
            candidate.setStatus("New");
            candidate.setInterviewDate(null);
            candidate.setInterviewTime(null);
            candidate.setInterviewType(null);
            candidate.setInterviewNotes(null);
            candidate.setInterviewMeetingLink(null);
        } else {
            logger.info("Creating new application record for {} - Job: {}", lookupEmail, assignedJobId);
            candidate = new Candidate();
            candidate.setId("CAN-" + UUID.randomUUID().toString().substring(0, 8));
            candidate.setCreatedAt(LocalDateTime.now());
            candidate.setStatus("New");
        }

        // Apply metadata and matched data
        candidate.setName(candidateName);
        candidate.setEmail(parsed.getEmail() != null ? parsed.getEmail() : lookupEmail);
        candidate.setSkills(parsed.getSkills());
        candidate.setExperience(parsed.getExperience());
        candidate.setEducation(parsed.getEducation());
        candidate.setPhone(phoneExtractionService.extractPhone(text, parsed.getAuditLog()));
        candidate.setSource(source);
        candidate.setResumeId(resume.getId());
        candidate.setUpdatedAt(LocalDateTime.now());
        candidate.setVisaType(parsed.getVisaType());
        candidate.setVisaValidity(parsed.getVisaValidity());
        candidate.setReasonForChange(parsed.getReasonForChange());
        candidate.setRecentlyAppliedCompanies(parsed.getRecentlyAppliedCompanies());
        candidate.setSummary(parsed.getSummary());

        if (assignedBy != null && !assignedBy.trim().isEmpty()) {
            candidate.setAssignedBy(assignedBy);
            candidate.setUploadedBy(assignedBy);
        }

        // Copy match results from tempMatch
        candidate.setJobId(tempMatch.getJobId());
        candidate.setRole(tempMatch.getRole());
        candidate.setFitScore(tempMatch.getFitScore());
        candidate.setMatchReason(tempMatch.getMatchReason());
        if (tempMatch.getJobId() != null) {
            candidate.setJobAssignedBy("AI");
        }
        candidate.setShortlisted(candidate.getFitScore() >= 70);

        if (parsed.getConfidenceScore() != null) {
            candidate.setConfidenceScore("HIGH".equals(parsed.getConfidenceScore()) ? 90.0 : 40.0);
        }

        if (parsed.getAuditLog() != null) {
            candidate.setAuditLogId(parsed.getAuditLog().getId());
            parsed.getAuditLog().setCandidateId(candidate.getId());
            auditLogRepository.save(parsed.getAuditLog());
        }

        candidateRepository.save(candidate);

        // 5. SKILL MATRIX GENERATION (Detailed Analysis)
        try {
            skillMatrixService.calculateAndSave(candidate, candidate.getJobId());
            logger.info("Skill Matrix generated successfully for {}", candidate.getName());
        } catch (Exception e) {
            logger.error("Failed to generate Skill Matrix for {}: {}", candidate.getName(), e.getMessage());
        }

        return candidate;
    }

    public Resume getResumeById(String id) {
        return resumeRepository.findById(id).orElse(null);
    }

    public String generateFormattedCv(String resumeId) {
        Resume resume = getResumeById(resumeId);
        if (resume == null)
            return "Resume not found.";

        Candidate candidate = candidateRepository.findAll().stream()
                .filter(c -> resumeId.equals(c.getResumeId()))
                .findFirst().orElse(null);

        String candidateName = (candidate != null) ? candidate.getName() : "Candidate";
        String extractedText = "";
        try {
            extractedText = new Tika().parseToString(new ByteArrayInputStream(resume.getData()));
        } catch (Exception e) {
            logger.warn("Could not extract text for CV formatting, using multimodal fallback.");
        }

        return geminiAgentService.generateFormattedCv(
                candidateName,
                extractedText,
                resume.getData(),
                resume.getContentType());
    }

    private boolean isPoisoned(String text) {
        if (text == null || text.isBlank())
            return false;
        if (text.contains("FlateDecode") || text.contains("/Obj") || text.contains("/Filter")
                || text.contains("/Stream"))
            return true;
        long nonAscii = text.chars().filter(c -> c > 127).count();
        double ratio = (double) nonAscii / text.length();
        return ratio > 0.2 || text.length() > 30000;
    }

    /**
     * Deterministic Matching Engine
     * Calculates exact fit scores and ensures correct role assignment from database
     * jobs.
     */
    private void performDeterministicMatch(com.recruitai.agent.entity.Candidate candidate) {
        List<com.recruitai.agent.entity.Job> allJobs = jobRepository.findAll();
        com.recruitai.agent.entity.Job bestJob = null;
        int bestScore = -1;

        List<String> candidateSkills = (candidate.getSkills() != null)
                ? candidate.getSkills().stream().map(String::toLowerCase).map(String::trim)
                        .collect(java.util.stream.Collectors.toList())
                : new java.util.ArrayList<>();

        String aiSuggestedRole = candidate.getRole(); // Role assigned by Gemini initially

        for (com.recruitai.agent.entity.Job job : allJobs) {
            List<String> jobSkills = job.getRequiredSkills().stream()
                    .map(String::toLowerCase).map(String::trim).collect(java.util.stream.Collectors.toList());

            if (jobSkills.isEmpty())
                continue;

            // 1. Calculate Skill Match (Base Score - How many job requirements are
            // covered?)
            long jobSkillsCovered = jobSkills.stream()
                    .filter(js -> candidateSkills.stream().anyMatch(cs -> isSkillMatch(cs, js)))
                    .count();

            double skillCoverage = (double) jobSkillsCovered / jobSkills.size();
            int score = (int) (skillCoverage * 60.0); // Skills are 60% of total score

            // 2. Skill Priority Bonuses (Top 3 skills in job definition)
            int weightedBonus = 0;
            for (int i = 0; i < Math.min(jobSkills.size(), 3); i++) {
                String requiredSkill = jobSkills.get(i);
                if (candidateSkills.stream().anyMatch(s -> isSkillMatch(s, requiredSkill))) {
                    if (i == 0)
                        weightedBonus += 15; // Primary Domain
                    else if (i == 1)
                        weightedBonus += 10; // Secondary
                    else
                        weightedBonus += 5; // Tertiary
                }
            }
            score += weightedBonus;

            // 3. Experience Match (20%)
            Double requiredExp = job.getMinExperience();
            Double candidateExp = (candidate.getExperience() != null) ? candidate.getExperience() : 0.0;

            if (candidateExp >= requiredExp) {
                score += 10;
                double diff = candidateExp - requiredExp;
                score += (int) Math.min(10, diff * 2);
            } else if (candidateExp > 0) {
                score += (int) ((candidateExp / requiredExp) * 10.0);
            }

            // 4. Role Appropriateness
            boolean isInternRole = job.getTitle().toLowerCase().contains("intern")
                    || job.getTitle().toLowerCase().contains("trainee");
            if (candidateExp < 1.0 && !isInternRole) {
                score -= 30;
            } else if (candidateExp >= 2.0 && isInternRole) {
                score -= 40;
            }

            // 5. AI Alignment Bonus (Tie-breaker)
            if (aiSuggestedRole != null && job.getTitle().toLowerCase().contains(aiSuggestedRole.toLowerCase())) {
                score += 10;
            }

            // 6. Hard Kill
            if (jobSkillsCovered == 0 && skillCoverage < 0.20) {
                score = 0;
            }

            score = Math.max(0, Math.min(100, score));

            if (score > bestScore && (score >= 40 || jobSkillsCovered >= 2)) {
                bestScore = score;
                bestJob = job;
            }
        }

        if (bestJob != null) {
            candidate.setJobId(bestJob.getId());
            candidate.setRole(bestJob.getTitle());
            candidate.setFitScore(bestScore);
            candidate.setMatchReason("Verified Match: " + bestJob.getTitle() + " (Requirement coverage Score)");
            logger.info("Deterministic match found: {} ({}%)", bestJob.getTitle(), bestScore);
        } else {
            if ("Not Matched".equalsIgnoreCase(candidate.getRole()) || candidate.getRole() == null
                    || candidate.getFitScore() < 30) {
                candidate.setRole("Not Matched");
                candidate.setFitScore(0);
                candidate.setJobId(null);
                candidate.setMatchReason("No suitable job match found after verification.");
            }
        }
    }

    private boolean isSkillMatch(String cs, String js) {
        if (cs == null || js == null)
            return false;
        cs = cs.toLowerCase().trim();
        js = js.toLowerCase().trim();

        if (cs.equals(js))
            return true;

        // Smart Synonyms for Automation/QA
        if (js.equals("automation") && (cs.contains("selenium") || cs.contains("cucumber") || cs.contains("cypress"))) {
            return true;
        }

        // Word Boundary for short strings (Avoid "SQL" matching "MySQL" too loosely in
        // some contexts)
        if (js.length() <= 3) {
            return cs.equals(js) || cs.startsWith(js + " ") || cs.endsWith(" " + js) || cs.contains(" " + js + " ");
        }

        return cs.contains(js) || js.contains(cs);
    }
}
