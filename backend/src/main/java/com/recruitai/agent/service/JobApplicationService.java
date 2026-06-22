package com.recruitai.agent.service;

import com.recruitai.agent.entity.JobApplication;
import com.recruitai.agent.entity.JobApplication.ApplicationStatus;
import com.recruitai.agent.entity.InterviewStage;
import java.util.ArrayList;
import com.recruitai.agent.repository.JobApplicationRepository;
import com.recruitai.agent.repository.CandidateRepository;
import com.recruitai.agent.repository.JobRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

import java.util.Optional;

@Service
@Transactional
public class JobApplicationService {

    @Autowired
    private JobApplicationRepository applicationRepository;

    @Autowired
    private CandidateRepository candidateRepository;

    @Autowired
    private JobRepository jobRepository;

    public JobApplication createApplication(JobApplication application) {
        // Validate candidate exists
        if (!candidateRepository.existsById(application.getCandidateId())) {
            throw new RuntimeException("Candidate not found with id: " + application.getCandidateId());
        }

        // Validate job exists
        if (!jobRepository.existsById(application.getJobId())) {
            throw new RuntimeException("Job not found with id: " + application.getJobId());
        }

        // Check if candidate has already applied for this job
        Optional<JobApplication> existingApplication = applicationRepository
                .findByCandidateIdAndJobId(application.getCandidateId(), application.getJobId());

        if (existingApplication.isPresent()) {
            throw new RuntimeException("Candidate has already applied for this job");
        }

        if (application.getAppliedDate() == null) {
            application.setAppliedDate(LocalDateTime.now());
        }

        return applicationRepository.save(application);
    }

    public Optional<JobApplication> getApplicationById(String id) {
        return applicationRepository.findById(id);
    }

    public List<JobApplication> getApplicationsByCandidate(String candidateId) {
        return applicationRepository.findByCandidateId(candidateId);
    }

    public List<JobApplication> getApplicationsByJob(String jobId) {
        return applicationRepository.findByJobId(jobId);
    }

    public Optional<JobApplication> getApplicationByCandidateAndJob(String candidateId, String jobId) {
        return applicationRepository.findByCandidateIdAndJobId(candidateId, jobId);
    }

    public List<JobApplication> getApplicationsByStatus(ApplicationStatus status) {
        return applicationRepository.findByStatus(status);
    }

    public Page<JobApplication> getApplicationsByStatus(ApplicationStatus status, Pageable pageable) {
        return applicationRepository.findByStatus(status, pageable);
    }

    public Page<JobApplication> getAllApplications(Pageable pageable) {
        return applicationRepository.findAll(pageable);
    }

    public List<JobApplication> getCandidateApplicationsByStatus(String candidateId, ApplicationStatus status) {
        return applicationRepository.findByCandidateIdAndStatus(candidateId, status);
    }

    public List<JobApplication> getJobApplicationsByStatus(String jobId, ApplicationStatus status) {
        return applicationRepository.findByJobIdAndStatus(jobId, status);
    }

    public JobApplication updateApplication(String id, JobApplication applicationDetails) {
        return applicationRepository.findById(id)
                .map(application -> {
                    application.setStatus(applicationDetails.getStatus());
                    application.setResumeUrl(applicationDetails.getResumeUrl());
                    application.setCoverLetter(applicationDetails.getCoverLetter());
                    application.setNotes(applicationDetails.getNotes());
                    application.setStage(applicationDetails.getStage());
                    application.setStageDate(applicationDetails.getStageDate());
                    application.setRemarks(applicationDetails.getRemarks());
                    return applicationRepository.save(application);
                })
                .orElseThrow(() -> new RuntimeException("Application not found with id: " + id));
    }

    public JobApplication updateApplicationStatus(String id, ApplicationStatus status) {
        return applicationRepository.findById(id)
                .map(application -> {
                    application.setStatus(status);
                    return applicationRepository.save(application);
                })
                .orElseThrow(() -> new RuntimeException("Application not found with id: " + id));
    }

    public void deleteApplication(String id) {
        if (!applicationRepository.existsById(id)) {
            throw new RuntimeException("Application not found with id: " + id);
        }
        applicationRepository.deleteById(id);
    }

    public long getTotalApplicationsCount() {
        return applicationRepository.count();
    }

    public long getApplicationsCountByJob(String jobId) {
        return applicationRepository.countByJobId(jobId);
    }

    public long getApplicationsCountByJobAndStatus(String jobId, ApplicationStatus status) {
        return applicationRepository.countByJobIdAndStatus(jobId, status);
    }

    public long getApplicationsCountByCandidate(String candidateId) {
        return applicationRepository.countByCandidateId(candidateId);
    }

    public List<JobApplication> getRecentApplications(int days) {
        LocalDateTime date = LocalDateTime.now().minusDays(days);
        return applicationRepository.findApplicationsAfter(date);
    }

    public List<JobApplication> getApplicationsBetweenDates(LocalDateTime startDate, LocalDateTime endDate) {
        return applicationRepository.findApplicationsBetweenDates(startDate, endDate);
    }

    public List<Object[]> getApplicationStatistics() {
        return applicationRepository.countApplicationsByStatus();
    }

    public Page<JobApplication> getApplicationsByStatus(String status, Pageable pageable) {
        ApplicationStatus applicationStatus = ApplicationStatus.valueOf(status.toUpperCase());
        return applicationRepository.findByStatus(applicationStatus, pageable);
    }

    // ---------------- Structured interview pipeline (Phase 1, additive) ----------------

    /** Seed the 5 canonical stages on an application if it has none yet. Idempotent. */
    public JobApplication initStages(String id) {
        JobApplication app = applicationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Application not found with id: " + id));
        if (app.getStages() == null || app.getStages().isEmpty()) {
            List<InterviewStage> stages = new ArrayList<>();
            for (String name : InterviewStage.CANONICAL) {
                stages.add(new InterviewStage(name));
            }
            app.setStages(stages);
            app.setUpdatedAt(LocalDateTime.now());
            applicationRepository.save(app);
        }
        return app;
    }

    /**
     * Record the outcome of one interview stage (Pass/Fail/Hold + interviewer/rating/feedback).
     * Derives the application status from the stage outcomes. Only mutates the JobApplication —
     * the Candidate document is intentionally left untouched.
     */
    public JobApplication recordStage(String id, String stageName, String outcome, String interviewer,
                                      Integer rating, String feedback, String notes) {
        JobApplication app = applicationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Application not found with id: " + id));
        if (app.getStages() == null) {
            app.setStages(new ArrayList<>());
        }
        InterviewStage stage = app.getStages().stream()
                .filter(s -> s.getName() != null && s.getName().equalsIgnoreCase(stageName))
                .findFirst()
                .orElse(null);
        if (stage == null) {
            stage = new InterviewStage(stageName);
            app.getStages().add(stage);
        }
        if (outcome != null) {
            stage.setOutcome(outcome.trim().toUpperCase());
        }
        if (interviewer != null) {
            stage.setInterviewer(interviewer);
        }
        if (rating != null) {
            stage.setRating(rating);
        }
        if (feedback != null) {
            stage.setFeedback(feedback);
        }
        if (notes != null) {
            stage.setNotes(notes);
        }
        stage.setDate(LocalDateTime.now());

        deriveStatusFromStages(app);
        app.setStage(stageName);
        app.setStageDate(LocalDateTime.now());
        app.setUpdatedAt(LocalDateTime.now());
        return applicationRepository.save(app);
    }

    /** Any FAIL -> REJECTED; HR Round PASS -> HIRED; any HOLD -> SHORTLISTED; else UNDER_REVIEW. */
    private void deriveStatusFromStages(JobApplication app) {
        if (app.getStages() == null || app.getStages().isEmpty()) {
            return;
        }
        boolean anyFail = false;
        boolean anyHold = false;
        boolean hrPassed = false;
        for (InterviewStage s : app.getStages()) {
            String o = s.getOutcome() == null ? "" : s.getOutcome().trim().toUpperCase();
            if ("FAIL".equals(o)) {
                anyFail = true;
            }
            if ("HOLD".equals(o)) {
                anyHold = true;
            }
            if ("HR Round".equalsIgnoreCase(s.getName()) && "PASS".equals(o)) {
                hrPassed = true;
            }
        }
        if (anyFail) {
            app.setStatus(ApplicationStatus.REJECTED);
            if (app.getRejectedDate() == null) {
                app.setRejectedDate(LocalDateTime.now());
            }
        } else if (hrPassed) {
            app.setStatus(ApplicationStatus.HIRED);
            if (app.getHiredDate() == null) {
                app.setHiredDate(LocalDateTime.now());
            }
        } else if (anyHold) {
            app.setStatus(ApplicationStatus.SHORTLISTED);
        } else {
            app.setStatus(ApplicationStatus.UNDER_REVIEW);
        }
    }

    public java.util.Map<String, Long> getDailyApplicationCounts(int days) {
        LocalDateTime startDate = LocalDateTime.now().minusDays(days);
        List<JobApplication> applications = applicationRepository.findApplicationsAfter(startDate);

        java.util.Map<String, Long> counts = new java.util.LinkedHashMap<>();

        // Initialize map with all dates
        for (int i = days - 1; i >= 0; i--) {
            String date = LocalDateTime.now().minusDays(i).toLocalDate().toString();
            counts.put(date, 0L);
        }

        // Fill with actual counts
        for (JobApplication app : applications) {
            if (app.getAppliedDate() != null) {
                String date = app.getAppliedDate().toLocalDate().toString();
                counts.put(date, counts.getOrDefault(date, 0L) + 1);
            }
        }
        return counts;
    }
}
