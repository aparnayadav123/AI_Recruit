package com.recruitai.agent.service;

import com.recruitai.agent.entity.Candidate;
import com.recruitai.agent.entity.Job;
import com.recruitai.agent.entity.JobApplication;
import com.recruitai.agent.entity.JobApplication.ApplicationStatus;
import com.recruitai.agent.repository.CandidateRepository;
import com.recruitai.agent.repository.JobApplicationRepository;
import com.recruitai.agent.repository.JobRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Module 8/9 — Future Candidate Rediscovery + AI Matching.
 *
 * For a given job, scans the candidate pool (with emphasis on previously-rejected candidates),
 * recomputes eligibility against the job's CURRENT requirements, and surfaces a ranked list of
 * suggested candidates. Detects "experience-upgrade" candidates who were once rejected for
 * insufficient experience but now clear the bar. Fully deterministic — reuses FitScoreService.
 *
 * Read-only / compute-on-demand: it never mutates candidates or applications, so it cannot
 * affect any existing behavior.
 */
@Service
public class RediscoveryService {

    private static final Logger log = LoggerFactory.getLogger(RediscoveryService.class);
    private static final int MATCH_THRESHOLD = 60; // % match to be worth suggesting
    private static final int MAX_RESULTS = 25;

    @Autowired
    private JobRepository jobRepository;
    @Autowired
    private CandidateRepository candidateRepository;
    @Autowired
    private JobApplicationRepository applicationRepository;
    @Autowired
    private FitScoreService fitScoreService;

    public List<Map<String, Object>> getSuggestedForJob(String jobId) {
        List<Map<String, Object>> out = new ArrayList<>();
        Job job = jobRepository.findById(jobId).orElse(null);
        if (job == null) {
            return out;
        }
        double required = job.getMinExperience() != null ? job.getMinExperience() : 0.0;

        // Rejection history across all jobs: candidateId -> joined reason text.
        Map<String, String> rejReason = new HashMap<>();
        Set<String> rejectedIds = new HashSet<>();
        for (JobApplication a : applicationRepository.findByStatus(ApplicationStatus.REJECTED)) {
            rejectedIds.add(a.getCandidateId());
            if (a.getRejectionReason() != null && !a.getRejectionReason().isBlank()) {
                rejReason.merge(a.getCandidateId(), a.getRejectionReason(), (x, y) -> x + "; " + y);
            }
        }

        // Candidates already active on THIS job are in-pipeline, not "suggestions".
        Set<String> onThisJob = new HashSet<>();
        for (JobApplication a : applicationRepository.findByJobId(jobId)) {
            if (a.getStatus() != ApplicationStatus.REJECTED && a.getStatus() != ApplicationStatus.WITHDRAWN) {
                onThisJob.add(a.getCandidateId());
            }
        }

        for (Candidate c : candidateRepository.findAll()) {
            if (c.getId() == null || onThisJob.contains(c.getId())) {
                continue;
            }
            // Blocked candidates (fake / inappropriate) are permanently excluded.
            if (c.isBlocked()) {
                continue;
            }
            int score = 0;
            try {
                score = fitScoreService.calculateFitScore(c, job);
            } catch (Exception e) {
                log.debug("Score failed for {}: {}", c.getId(), e.getMessage());
            }
            double exp = c.getExperience() != null ? c.getExperience() : 0.0;
            boolean prevRejected = rejectedIds.contains(c.getId());
            String reasons = rejReason.getOrDefault(c.getId(), "");
            boolean rejectedForExp = reasons.toLowerCase().contains("experience");
            boolean experienceUpgrade = rejectedForExp && required > 0 && exp >= required;

            boolean eligible = experienceUpgrade || score >= MATCH_THRESHOLD;
            if (!eligible) {
                continue;
            }

            String reason;
            if (experienceUpgrade) {
                reason = String.format(
                        "Experience now %.1fy meets the %.1fy requirement — previously rejected (%s)",
                        exp, required, reasons);
            } else if (prevRejected) {
                reason = String.format("%d%% match — worth reconsidering (previously rejected)", score);
            } else {
                reason = String.format("%d%% match for this role", score);
            }

            Map<String, Object> m = new LinkedHashMap<>();
            m.put("candidateId", c.getId());
            m.put("name", c.getName());
            m.put("role", c.getRole());
            m.put("email", c.getEmail());
            m.put("experience", exp);
            m.put("matchScore", score);
            m.put("previouslyRejected", prevRejected);
            m.put("experienceUpgrade", experienceUpgrade);
            m.put("reason", reason);
            out.add(m);
        }

        out.sort((a, b) -> Integer.compare((Integer) b.get("matchScore"), (Integer) a.get("matchScore")));
        return out.size() > MAX_RESULTS ? new ArrayList<>(out.subList(0, MAX_RESULTS)) : out;
    }
}
