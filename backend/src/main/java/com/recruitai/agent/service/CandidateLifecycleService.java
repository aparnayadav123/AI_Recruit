package com.recruitai.agent.service;

import com.recruitai.agent.entity.Candidate;
import com.recruitai.agent.entity.CandidateAuditEvent;
import com.recruitai.agent.entity.Interview;
import com.recruitai.agent.entity.Job;
import com.recruitai.agent.entity.JobApplication;
import com.recruitai.agent.entity.JobApplication.ApplicationStatus;
import com.recruitai.agent.repository.CandidateAuditEventRepository;
import com.recruitai.agent.repository.CandidateRepository;
import com.recruitai.agent.repository.InterviewRepository;
import com.recruitai.agent.repository.JobApplicationRepository;
import com.recruitai.agent.repository.JobRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Phase 1 lifecycle layer. PURELY ADDITIVE: it derives/maintains {@link JobApplication}
 * records from the existing Candidate flow and never mutates the Candidate document, so no
 * existing feature changes behavior. The Candidate remains the source of truth; applications
 * are the append-only history that powers the Candidate History page and (later) analytics.
 */
@Service
public class CandidateLifecycleService {

    private static final Logger log = LoggerFactory.getLogger(CandidateLifecycleService.class);

    @Autowired
    private JobApplicationRepository applicationRepository;
    @Autowired
    private CandidateRepository candidateRepository;
    @Autowired
    private JobRepository jobRepository;
    @Autowired
    private InterviewRepository interviewRepository;
    @Autowired
    private CandidateAuditEventRepository auditRepository;

    /**
     * Idempotently ensure a JobApplication exists for this candidate's current job, mirroring
     * the candidate's status. Returns null when the candidate has no job assigned yet (nothing
     * to track). Safe to call repeatedly — it upserts on (candidateId, jobId).
     */
    public JobApplication syncApplication(Candidate c) {
        if (c == null || c.getId() == null) {
            return null;
        }
        String jobId = c.getJobId();
        if (jobId == null || jobId.isBlank()) {
            return null;
        }

        JobApplication app = applicationRepository
                .findByCandidateIdAndJobId(c.getId(), jobId)
                .orElseGet(() -> new JobApplication(c.getId(), jobId));

        app.setCandidateName(c.getName());
        app.setSource(c.getSource());
        if (app.getExperienceAtApply() == null) {
            app.setExperienceAtApply(c.getExperience());
        }
        if (c.getFitScore() != null) {
            app.setMatchScore(c.getFitScore());
        }
        app.setJobTitle(jobRepository.findById(jobId).map(Job::getTitle).orElse(null));

        ApplicationStatus mapped = mapStatus(c.getStatus());
        app.setStatus(mapped);

        if (mapped == ApplicationStatus.REJECTED) {
            if (app.getRejectionReason() == null) {
                app.setRejectionReason(c.getRejectionReason());
            }
            if (app.getRejectedDate() == null) {
                app.setRejectedDate(LocalDateTime.now());
            }
        }
        if (mapped == ApplicationStatus.HIRED && app.getHiredDate() == null) {
            app.setHiredDate(LocalDateTime.now());
        }
        app.setUpdatedAt(LocalDateTime.now());
        return applicationRepository.save(app);
    }

    /** Maps the free-text Candidate.status onto the JobApplication status enum. */
    public ApplicationStatus mapStatus(String status) {
        if (status == null) {
            return ApplicationStatus.PENDING;
        }
        switch (status.trim().toLowerCase()) {
            case "rejected":
                return ApplicationStatus.REJECTED;
            case "hired":
                return ApplicationStatus.HIRED;
            case "offer":
            case "shortlisted":
                return ApplicationStatus.SHORTLISTED;
            case "interview":
            case "screening":
                return ApplicationStatus.UNDER_REVIEW;
            case "withdrawn":
                return ApplicationStatus.WITHDRAWN;
            case "new":
            default:
                return ApplicationStatus.PENDING;
        }
    }

    /**
     * Startup backfill: ensure every existing candidate with a job has a corresponding
     * application. Idempotent (only creates when missing) and best-effort per candidate.
     * Returns the number of NEW application records created.
     */
    public int backfillAll() {
        int created = 0;
        List<Candidate> all = candidateRepository.findAll();
        for (Candidate c : all) {
            try {
                if (c.getJobId() == null || c.getJobId().isBlank()) {
                    continue;
                }
                boolean existed = applicationRepository
                        .findByCandidateIdAndJobId(c.getId(), c.getJobId()).isPresent();
                syncApplication(c);
                if (!existed) {
                    created++;
                }
            } catch (Exception e) {
                log.warn("Backfill skipped candidate {}: {}", c.getId(), e.getMessage());
            }
        }
        return created;
    }

    /** Write one append-only audit event. Best-effort — never throws to the caller. */
    public void audit(String candidateId, String action, String detail, String actor,
                      String fromStatus, String toStatus, String jobId) {
        try {
            CandidateAuditEvent ev = new CandidateAuditEvent(candidateId, action, detail, actor);
            ev.setFromStatus(fromStatus);
            ev.setToStatus(toStatus);
            ev.setJobId(jobId);
            auditRepository.save(ev);
        } catch (Exception e) {
            log.warn("Audit write skipped ({} {}): {}", action, candidateId, e.getMessage());
        }
    }

    public List<CandidateAuditEvent> getAudit(String candidateId) {
        return auditRepository.findByCandidateIdOrderByTimestampDesc(candidateId);
    }

    /** Record a rejection on the candidate's current application (reason + who + when). */
    public void recordRejection(Candidate c, String reason, String by) {
        JobApplication app = syncApplication(c);
        if (app == null) {
            return;
        }
        app.setStatus(ApplicationStatus.REJECTED);
        app.setRejectionReason(reason);
        app.setRejectedBy(by);
        if (app.getRejectedDate() == null) {
            app.setRejectedDate(LocalDateTime.now());
        }
        applicationRepository.save(app);
    }

    /** Read-only aggregation powering the Candidate History page. Never deletes anything. */
    public Map<String, Object> getHistory(String candidateId) {
        Map<String, Object> out = new LinkedHashMap<>();

        Candidate candidate = candidateRepository.findById(candidateId).orElse(null);
        out.put("candidate", candidate);

        List<JobApplication> apps = new ArrayList<>(applicationRepository.findByCandidateId(candidateId));
        apps.removeIf(JobApplication::isDeleted);
        apps.sort(Comparator.comparing(JobApplication::getAppliedDate,
                Comparator.nullsLast(Comparator.reverseOrder())));
        out.put("applications", apps);

        List<Interview> interviews = interviewRepository.findByCandidateId(candidateId);
        out.put("interviews", interviews);

        out.put("rejections", apps.stream()
                .filter(a -> a.getStatus() == ApplicationStatus.REJECTED)
                .collect(Collectors.toList()));
        out.put("hires", apps.stream()
                .filter(a -> a.getStatus() == ApplicationStatus.HIRED)
                .collect(Collectors.toList()));
        out.put("audit", auditRepository.findByCandidateIdOrderByTimestampDesc(candidateId));
        out.put("totalApplications", apps.size());
        return out;
    }
}
