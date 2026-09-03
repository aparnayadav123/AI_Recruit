package com.recruitai.agent.service;

import com.recruitai.agent.entity.Candidate;
import com.recruitai.agent.entity.JobApplication;
import com.recruitai.agent.repository.CandidateRepository;
import com.recruitai.agent.repository.JobApplicationRepository;
import com.recruitai.agent.repository.SkillMatrixRepository;
import com.recruitai.agent.repository.ResumeRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.annotation.PostConstruct;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class CandidateService {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(CandidateService.class);

    @Autowired
    private CandidateRepository candidateRepository;

    @Autowired
    private JobApplicationRepository applicationRepository;

    @Autowired
    private SkillMatrixRepository skillMatrixRepository;

    @Autowired
    private ResumeRepository resumeRepository;

    @Autowired
    private com.recruitai.agent.repository.InterviewRepository interviewRepository;

    @Autowired
    private com.recruitai.agent.repository.JobRepository jobRepository;

    @Autowired
    private FitScoreService fitScoreService;

    @Autowired
    @org.springframework.context.annotation.Lazy
    private SkillMatrixService skillMatrixService;

    @Autowired
    private com.recruitai.agent.repository.NotificationRepository notificationRepository;

    @Autowired
    private SequenceService sequenceService;

    // Phase 1 lifecycle layer — derives JobApplication history records. Lazy + best-effort so
    // it can never affect candidate creation/assignment if it fails.
    @Autowired
    @org.springframework.context.annotation.Lazy
    private CandidateLifecycleService lifecycleService;

    // Backfill moved to SequenceService — running both raced and could collide
    // a new counter-allocated seq with one this routine had just written.

    public synchronized void fixMissingSequenceIds() {
        log.info("📊 Fetching all candidates to check for missing or duplicate sequence IDs...");
        List<Candidate> all = candidateRepository.findAll();
        
        java.util.Set<Long> seenIds = new java.util.HashSet<>();
        List<Candidate> toFix = new java.util.ArrayList<>();
        long maxId = 0;

        for (Candidate c : all) {
            Long sid = c.getSequenceId();
            if (sid == null || seenIds.contains(sid)) {
                toFix.add(c);
            } else {
                seenIds.add(sid);
                if (sid > maxId) maxId = sid;
            }
        }
            
        log.info("📊 Total candidates: {}, Candidates to fix: {}", all.size(), toFix.size());
        if (toFix.isEmpty()) return;

        long nextId = maxId + 1;
        
        log.info("🔢 Starting re-assignment from ID: {}", nextId);

        for (Candidate c : toFix) {
            c.setSequenceId(nextId++);
            candidateRepository.save(c);
        }
        log.info("✅ ID RESOLUTION COMPLETED. Total processed: {}", toFix.size());
    }

    /** True when the string is non-null and not just whitespace. */
    private static boolean isFilled(String s) {
        return s != null && !s.isBlank();
    }

    // ✅ CREATE (COLLECTION WILL BE CREATED HERE)
    public Candidate createCandidate(Candidate candidate) {
        // STRICT DUPLICATE CHECK: Global Email Uniqueness
        if (candidateRepository.existsByEmail(candidate.getEmail())) {
            throw new com.recruitai.agent.exception.DuplicateResourceException(
                    "Candidate with email " + candidate.getEmail() + " already exists in the system.");
        }

        // STRICT DUPLICATE CHECK: Global LinkedIn Uniqueness
        if (candidate.getLinkedinUrl() != null && !candidate.getLinkedinUrl().isBlank()) {
            if (candidateRepository.existsByLinkedinUrl(candidate.getLinkedinUrl())) {
                throw new com.recruitai.agent.exception.DuplicateResourceException(
                        "Candidate with LinkedIn URL " + candidate.getLinkedinUrl() + " already exists in the system.");
            }
        }

        candidate.setCreatedAt(LocalDateTime.now());

        // Smallest unused number → consecutive, gap-free IDs (reclaims slots freed by deletes).
        candidate.setSequenceId(sequenceService.nextConsecutiveSeq());

        recomputeFitScore(candidate);
        Candidate created = candidateRepository.save(candidate);

        // Generate initial skill proficiency matrix (best-effort)
        try {
            skillMatrixService.calculateAndSave(created, created.getJobId());
        } catch (Exception e) {
            log.warn("Initial skill matrix failed for {}: {}", created.getId(), e.getMessage());
        }

        // Fire an "Applications" notification so the bell icon picks it up.
        try {
            String role = created.getRole();
            String message = role != null && !role.isBlank()
                    ? created.getName() + " applied for " + role
                    : created.getName() + " applied";
            com.recruitai.agent.entity.Notification n =
                    new com.recruitai.agent.entity.Notification(
                            "Candidate Applied",
                            message,
                            com.recruitai.agent.entity.Notification.CATEGORY_CANDIDATE,
                            created.getName(),
                            "INFO");
            n.setRelatedEntityId(created.getId());
            notificationRepository.save(n);
        } catch (Exception e) {
            log.warn("Application notification failed for {}: {}", created.getId(), e.getMessage());
        }

        // Additive: record/maintain the JobApplication history row. Never breaks creation.
        try {
            lifecycleService.syncApplication(created);
        } catch (Exception e) {
            log.warn("Lifecycle sync (create) skipped for {}: {}", created.getId(), e.getMessage());
        }

        return created;
    }

    // ✅ ASSIGN JOB — sets jobId, role/assignedTo, recalculates fit score
    public Candidate assignJob(String id, String jobId, String role, String jobAssignedBy) {
        Candidate candidate = candidateRepository.findById(id)
                .orElseThrow(() -> new com.recruitai.agent.exception.ResourceNotFoundException("Candidate", id));

        boolean unassign = (jobId == null || jobId.isBlank());

        // Validate the target job actually exists — silently accepting an unknown
        // jobId would leave the candidate pointing at nothing (F4 bug).
        if (!unassign && !jobRepository.existsById(jobId)) {
            throw new com.recruitai.agent.exception.ResourceNotFoundException("Job", jobId);
        }

        // Explicit UN-ASSIGN: clear the assignment and do NOT auto-reassign. Previously
        // recomputeFitScore() would scan open jobs and re-attach the "best" one, so
        // un-assigning was instantly undone.
        if (unassign) {
            candidate.setJobId(null);
            candidate.setAssignedTo(null);
            candidate.setJobAssignedBy(null);
            candidate.setFitScore(0);
            candidate.setUpdatedAt(LocalDateTime.now());
            Candidate saved = candidateRepository.save(candidate);
            try {
                lifecycleService.syncApplication(saved);
            } catch (Exception e) {
                log.warn("Lifecycle sync (unassign) skipped for {}: {}", saved.getId(), e.getMessage());
            }
            return saved;
        }

        candidate.setJobId(jobId);
        if (role != null && !role.isBlank()) {
            candidate.setRole(role);
            candidate.setAssignedTo(role);
        }
        if (jobAssignedBy != null && !jobAssignedBy.isBlank()) {
            candidate.setJobAssignedBy(jobAssignedBy);
            // Keep assignedBy in sync — UI shows both as the same person today
            if (candidate.getAssignedBy() == null || candidate.getAssignedBy().isBlank()) {
                candidate.setAssignedBy(jobAssignedBy);
            }
        }
        candidate.setUpdatedAt(LocalDateTime.now());

        recomputeFitScore(candidate);
        Candidate saved = candidateRepository.save(candidate);

        // Additive: maintain the JobApplication history row for the (new) job assignment.
        try {
            lifecycleService.syncApplication(saved);
        } catch (Exception e) {
            log.warn("Lifecycle sync (assign) skipped for {}: {}", saved.getId(), e.getMessage());
        }
        return saved;
    }

    // ✅ REJECT — capture structured rejection reason + who, mirror to the application + audit.
    public Candidate rejectCandidate(String id, String reason, String by) {
        Candidate c = candidateRepository.findById(id)
                .orElseThrow(() -> new com.recruitai.agent.exception.ResourceNotFoundException("Candidate", id));
        String from = c.getStatus();
        c.setStatus("Rejected");
        if (reason != null && !reason.isBlank()) {
            c.setRejectionReason(reason);
        }
        c.setUpdatedAt(LocalDateTime.now());
        Candidate saved = candidateRepository.save(c);
        try {
            lifecycleService.recordRejection(saved, reason, by);
            lifecycleService.audit(saved.getId(), "REJECT", reason, by, from, "Rejected", saved.getJobId());
        } catch (Exception e) {
            log.warn("Reject lifecycle skipped for {}: {}", id, e.getMessage());
        }
        return saved;
    }

    // ✅ BLOCK — flag a fake / inappropriate candidate; permanently excluded from
    // shortlisting & rediscovery until explicitly unblocked.
    public Candidate blockCandidate(String id, String reason, String by) {
        Candidate c = candidateRepository.findById(id)
                .orElseThrow(() -> new com.recruitai.agent.exception.ResourceNotFoundException("Candidate", id));
        c.setBlocked(true);
        c.setBlockReason(reason);
        c.setBlockedBy(by);
        c.setBlockedDate(LocalDateTime.now().toString());
        c.setShortlisted(false); // pull them out of any current shortlist
        c.setUpdatedAt(LocalDateTime.now());
        Candidate saved = candidateRepository.save(c);
        try {
            lifecycleService.audit(saved.getId(), "BLOCK", reason, by, c.getStatus(), c.getStatus(), saved.getJobId());
        } catch (Exception e) {
            log.warn("Block audit skipped for {}: {}", id, e.getMessage());
        }
        return saved;
    }

    public Candidate unblockCandidate(String id, String by) {
        Candidate c = candidateRepository.findById(id)
                .orElseThrow(() -> new com.recruitai.agent.exception.ResourceNotFoundException("Candidate", id));
        c.setBlocked(false);
        c.setBlockReason(null);
        c.setBlockedBy(null);
        c.setBlockedDate(null);
        c.setUpdatedAt(LocalDateTime.now());
        Candidate saved = candidateRepository.save(c);
        try {
            lifecycleService.audit(saved.getId(), "UNBLOCK", null, by, c.getStatus(), c.getStatus(), saved.getJobId());
        } catch (Exception e) {
            log.warn("Unblock audit skipped for {}: {}", id, e.getMessage());
        }
        return saved;
    }

    // ✅ RECONSIDER — reopen a candidate (optionally reassign to a new job), clear rejection,
    // move back into the active pipeline, recompute fit, and write an audit entry.
    public Candidate reconsiderCandidate(String id, String newJobId, String role, String by) {
        Candidate c = candidateRepository.findById(id)
                .orElseThrow(() -> new com.recruitai.agent.exception.ResourceNotFoundException("Candidate", id));
        String from = c.getStatus();
        if (newJobId != null && !newJobId.isBlank()) {
            if (!jobRepository.existsById(newJobId)) {
                throw new com.recruitai.agent.exception.ResourceNotFoundException("Job", newJobId);
            }
            c.setJobId(newJobId);
            if (role != null && !role.isBlank()) {
                c.setRole(role);
                c.setAssignedTo(role);
            }
        }
        c.setStatus("Screening");
        c.setRejectionReason(null);
        c.setUpdatedAt(LocalDateTime.now());
        recomputeFitScore(c);
        Candidate saved = candidateRepository.save(c);
        try {
            lifecycleService.syncApplication(saved);
            String detail = (newJobId != null && !newJobId.isBlank())
                    ? "Reopened & reassigned to job " + newJobId
                    : "Reopened for reconsideration";
            lifecycleService.audit(saved.getId(), "RECONSIDER", detail, by, from, "Screening", saved.getJobId());
        } catch (Exception e) {
            log.warn("Reconsider lifecycle skipped for {}: {}", id, e.getMessage());
        }
        return saved;
    }

    /**
     * Compute fitScore against the candidate's currently-assigned job. If the
     * candidate has no jobId, fall back to scanning open jobs and auto-assign
     * the best match — so every candidate ends up with a meaningful score
     * without manual intervention.
     */
    private void recomputeFitScore(Candidate candidate) {
        String jobId = candidate.getJobId();
        try {
            if (jobId != null && !jobId.isBlank()) {
                java.util.Optional<com.recruitai.agent.entity.Job> opt = jobRepository.findById(jobId);
                if (opt.isPresent()) {
                    int score = fitScoreService.calculateFitScore(candidate, opt.get());
                    if (score > 0) {
                        // Current assignment is meaningful — keep it
                        candidate.setFitScore(score);
                    } else {
                        // Score 0 against current job — try auto-match for a better fit
                        // (preserves manual assignment if no better match exists)
                        autoAssignBestJob(candidate);
                    }
                } else {
                    // Pointed at a deleted job — drop and re-match
                    candidate.setJobId(null);
                    autoAssignBestJob(candidate);
                }
            } else {
                autoAssignBestJob(candidate);
            }
        } catch (Exception e) {
            log.warn("FitScore calculation failed for candidate {}: {}", candidate.getId(), e.getMessage());
            // Leave existing score in place rather than zeroing — don't lose data on a transient error
        }
    }

    /**
     * Find the best-fitting Open job for this candidate, link them, and set fitScore.
     * No-op if no Open jobs exist or the candidate matches none of them (score 0 across the board).
     */
    private void autoAssignBestJob(Candidate candidate) {
        if (candidate == null) return;
        // Project treats "Open" and "Active" as hireable (see JobService.getJobStatistics)
        List<com.recruitai.agent.entity.Job> openJobs =
                jobRepository.findByStatusIn(java.util.List.of("Open", "Active"));
        if (openJobs == null || openJobs.isEmpty()) {
            candidate.setFitScore(0);
            return;
        }
        com.recruitai.agent.entity.Job best = fitScoreService.findBestJobMatch(candidate, openJobs);
        if (best == null) {
            // No job matched — keep candidate unassigned but make the score honest
            candidate.setFitScore(0);
            return;
        }
        candidate.setJobId(best.getId());
        // Only fill role/assignedTo when they're blank — never overwrite a recruiter's manual edits
        if (candidate.getRole() == null || candidate.getRole().isBlank() || "Not Matched".equalsIgnoreCase(candidate.getRole())) {
            candidate.setRole(best.getTitle());
        }
        if (candidate.getAssignedTo() == null || candidate.getAssignedTo().isBlank()) {
            candidate.setAssignedTo(best.getTitle());
        }
        if (candidate.getJobAssignedBy() == null || candidate.getJobAssignedBy().isBlank()) {
            candidate.setJobAssignedBy("Auto-Match");
        }
        candidate.setFitScore(fitScoreService.calculateFitScore(candidate, best));
    }

    /**
     * Recalculate fit scores for every candidate currently assigned to this job.
     * Called by JobService.updateJob() so skill/experience requirement changes ripple out.
     */
    public int recomputeFitScoresForJob(String jobId) {
        if (jobId == null || jobId.isBlank()) return 0;
        List<Candidate> linked = candidateRepository.findByJobId(jobId);
        int updated = 0;
        for (Candidate c : linked) {
            Integer prev = c.getFitScore();
            recomputeFitScore(c);
            if (!java.util.Objects.equals(prev, c.getFitScore())) {
                c.setUpdatedAt(LocalDateTime.now());
                candidateRepository.save(c);
                updated++;
            }
        }
        return updated;
    }

    /**
     * One-shot backfill — recompute fitScore for every candidate, and auto-assign
     * a best-fit job to anyone who is still unassigned. Used by the migration
     * runner on startup so the whole table shows real numbers without any
     * manual recruiter action.
     */
    public int backfillFitScores() {
        List<Candidate> all = candidateRepository.findAll();
        int updated = 0;
        for (Candidate c : all) {
            Integer prevScore = c.getFitScore();
            String prevJobId  = c.getJobId();
            recomputeFitScore(c);
            boolean scoreChanged = !java.util.Objects.equals(prevScore, c.getFitScore());
            boolean jobChanged   = !java.util.Objects.equals(prevJobId, c.getJobId());
            if (scoreChanged || jobChanged) {
                c.setUpdatedAt(LocalDateTime.now());
                candidateRepository.save(c);
                updated++;
            }
        }
        return updated;
    }

    /**
     * Manual trigger — rescan every candidate and re-run the auto-match logic.
     * Exposed via a controller endpoint so recruiters can refresh after job edits.
     */
    public int rescoreAllCandidates() {
        return backfillFitScores();
    }

    /**
     * Aggressive: ignore current assignments entirely and put every candidate
     * on the job they score highest against. Useful for "reset to optimal"
     * after big seed-data changes or to surface clearly wrong assignments.
     */
    public int deepRematchAllCandidates() {
        List<Candidate> all = candidateRepository.findAll();
        int updated = 0;
        for (Candidate c : all) {
            String prevJobId  = c.getJobId();
            Integer prevScore = c.getFitScore();
            // Clear current assignment so autoAssignBestJob picks the global optimum
            c.setJobId(null);
            autoAssignBestJob(c);
            boolean changed = !java.util.Objects.equals(prevJobId, c.getJobId())
                          || !java.util.Objects.equals(prevScore, c.getFitScore());
            if (changed) {
                c.setUpdatedAt(LocalDateTime.now());
                candidateRepository.save(c);
                updated++;
            }
        }
        return updated;
    }

    // ✅ READ
    public Optional<Candidate> getCandidateById(String id) {
        return candidateRepository.findById(id);
    }

    public Optional<Candidate> getCandidateByEmail(String email) {
        return candidateRepository.findByEmail(email);
    }

    public Page<Candidate> getAllCandidates(Pageable pageable) {
        return candidateRepository.findAll(pageable);
    }

    public Page<Candidate> getCandidatesByStatus(String status, Pageable pageable) {
        return candidateRepository.findByStatus(status, pageable);
    }

    public Page<Candidate> searchCandidates(String search, Pageable pageable) {
        return candidateRepository.searchCandidates(search, pageable);
    }

    public List<Candidate> getCandidatesByExperience(Double minYears) {
        return candidateRepository.findByExperienceGreaterThanEqual(minYears);
    }

    public List<Candidate> getCandidatesBySkills(String skill) {
        return candidateRepository.findBySkillsContaining(skill);
    }

    // ✅ UPDATE
    public Candidate updateCandidate(String id, Candidate candidateDetails) {
        return candidateRepository.findById(id)
                .map(candidate -> {

                    if (!candidate.getEmail().equals(candidateDetails.getEmail())
                            && candidateRepository.existsByEmail(candidateDetails.getEmail())) {
                        throw new com.recruitai.agent.exception.DuplicateResourceException(
                                "Candidate with email " + candidateDetails.getEmail() + " already exists");
                    }

                    candidate.setName(candidateDetails.getName());
                    candidate.setEmail(candidateDetails.getEmail());
                    candidate.setRole(candidateDetails.getRole());
                    candidate.setPhone(candidateDetails.getPhone());
                    candidate.setSkills(candidateDetails.getSkills());
                    // Education was previously skipped by the update flow — meaning
                    // the LinkedIn extension's PUT could never persist degrees.
                    if (candidateDetails.getEducation() != null && !candidateDetails.getEducation().isEmpty()) {
                        candidate.setEducation(candidateDetails.getEducation());
                    }
                    candidate.setExperience(candidateDetails.getExperience());
                    // fitScore is server-computed — ignore the incoming value, recompute below
                    candidate.setResumeId(candidateDetails.getResumeId());
                    candidate.setAvatar(candidateDetails.getAvatar());
                    candidate.setStatus(candidateDetails.getStatus());

                    // Update Interview Fields
                    candidate.setInterviewDate(candidateDetails.getInterviewDate());
                    candidate.setInterviewTime(candidateDetails.getInterviewTime());
                    candidate.setInterviewType(candidateDetails.getInterviewType());
                    candidate.setInterviewNotes(candidateDetails.getInterviewNotes());
                    candidate.setInterviewMeetingLink(candidateDetails.getInterviewMeetingLink());
                    candidate.setRejectionReason(candidateDetails.getRejectionReason());
                    // Preserve-on-null: the generic edit form may PUT these as null, which
                    // would otherwise wipe a round set when scheduling an interview.
                    //
                    // interviewRound + roundStatus are a per-round pair: a round's outcome
                    // ("Passed"/"Rejected") belongs ONLY to that round. When a candidate MOVES
                    // to a different round, the previous outcome must NOT carry over — the new
                    // round starts fresh as "Scheduled" (Waiting) until it is evaluated.
                    // Clients save by spreading the whole candidate object, so the stale
                    // roundStatus rides along in the payload; reset it here on any round change.
                    // (Without this, a candidate passed in Round 1 shows "Passed" in every
                    // later stage without the reviewer ever clicking it.)
                    String incomingRound = candidateDetails.getInterviewRound();
                    boolean roundChanged = isFilled(incomingRound)
                            && !incomingRound.equals(candidate.getInterviewRound());
                    if (isFilled(incomingRound)) candidate.setInterviewRound(incomingRound);
                    if (roundChanged) {
                        candidate.setRoundStatus("Scheduled");
                    } else if (isFilled(candidateDetails.getRoundStatus())) {
                        candidate.setRoundStatus(candidateDetails.getRoundStatus());
                    }

                    // Preserve-on-null behaviour for LinkedIn-fillable fields — the
                    // generic candidate-edit form on the admin page may PUT the
                    // candidate with these as null, which would otherwise blow
                    // away the values the extension scraped earlier.
                    if (isFilled(candidateDetails.getCurrentOrganization())) candidate.setCurrentOrganization(candidateDetails.getCurrentOrganization());
                    if (candidateDetails.getNoticePeriod() != null && candidateDetails.getNoticePeriod() > 0) candidate.setNoticePeriod(candidateDetails.getNoticePeriod());
                    if (isFilled(candidateDetails.getPostalCode())) candidate.setPostalCode(candidateDetails.getPostalCode());
                    if (isFilled(candidateDetails.getCurrentEmploymentStatus())) candidate.setCurrentEmploymentStatus(candidateDetails.getCurrentEmploymentStatus());
                    if (candidateDetails.getLanguageSkills() != null && !candidateDetails.getLanguageSkills().isEmpty()) candidate.setLanguageSkills(candidateDetails.getLanguageSkills());
                    if (isFilled(candidateDetails.getCurrentSalary())) candidate.setCurrentSalary(candidateDetails.getCurrentSalary());
                    if (isFilled(candidateDetails.getSalaryExpectation())) candidate.setSalaryExpectation(candidateDetails.getSalaryExpectation());
                    if (candidateDetails.getRelevantExperience() != null && candidateDetails.getRelevantExperience() > 0) candidate.setRelevantExperience(candidateDetails.getRelevantExperience());
                    if (isFilled(candidateDetails.getCountry())) candidate.setCountry(candidateDetails.getCountry());
                    if (isFilled(candidateDetails.getAvailableFrom())) candidate.setAvailableFrom(candidateDetails.getAvailableFrom());
                    if (isFilled(candidateDetails.getSalaryType())) candidate.setSalaryType(candidateDetails.getSalaryType());
                    if (isFilled(candidateDetails.getLocality())) candidate.setLocality(candidateDetails.getLocality());
                    candidate.setWillingToRelocate(candidateDetails.isWillingToRelocate());
                    if (isFilled(candidateDetails.getSummary())) candidate.setSummary(candidateDetails.getSummary());
                    if (isFilled(candidateDetails.getIndustry())) candidate.setIndustry(candidateDetails.getIndustry());
                    if (isFilled(candidateDetails.getSource())) candidate.setSource(candidateDetails.getSource());
                    // Preserve linkedinUrl if the caller didn't send one — only the
                    // LinkedIn extension populates this field, and the generic
                    // candidate-edit form posts null which would otherwise wipe it.
                    if (candidateDetails.getLinkedinUrl() != null && !candidateDetails.getLinkedinUrl().isBlank()) {
                        candidate.setLinkedinUrl(candidateDetails.getLinkedinUrl());
                    }
                    candidate.setHotlist(candidateDetails.getHotlist());
                    // Multi-hotlist (FR-204). Preserve-on-null: only overwrite the list when the
                    // caller actually sends one, so a generic edit form that omits it can't wipe
                    // a candidate's hotlist memberships.
                    if (candidateDetails.getHotlists() != null) {
                        candidate.setHotlists(candidateDetails.getHotlists());
                    }
                    candidate.setAssignedBy(candidateDetails.getAssignedBy());
                    candidate.setAssignedTo(candidateDetails.getAssignedTo());
                    candidate.setUploadedBy(candidateDetails.getUploadedBy());
                    
                    candidate.setJapaneseLanguageProficiency(candidateDetails.getJapaneseLanguageProficiency());
                    candidate.setVisaType(candidateDetails.getVisaType());
                    candidate.setVisaValidity(candidateDetails.getVisaValidity());
                    candidate.setReasonForChange(candidateDetails.getReasonForChange());
                    candidate.setRecentlyAppliedCompanies(candidateDetails.getRecentlyAppliedCompanies());

                    candidate.setUpdatedAt(LocalDateTime.now());

                    // Skills or experience may have changed → keep fitScore in sync
                    recomputeFitScore(candidate);

                    Candidate saved = candidateRepository.save(candidate);

                    // Skills changed → regenerate the proficiency matrix (best-effort)
                    try {
                        skillMatrixService.calculateAndSave(saved, saved.getJobId());
                    } catch (Exception e) {
                        log.warn("Skill matrix regen failed for {}: {}", saved.getId(), e.getMessage());
                    }

                    // Additive: keep the application history (incl. status/rejection) in sync
                    // so a status change made via the edit form is reflected everywhere.
                    try {
                        lifecycleService.syncApplication(saved);
                    } catch (Exception e) {
                        log.warn("Lifecycle sync (update) skipped for {}: {}", saved.getId(), e.getMessage());
                    }

                    return saved;
                })
                .orElseThrow(() -> new com.recruitai.agent.exception.ResourceNotFoundException("Candidate", id));
    }

    public Candidate updateCandidateStatus(String id, String status) {
        return candidateRepository.findById(id)
                .map(candidate -> {
                    String previous = candidate.getStatus();
                    candidate.setStatus(status);
                    candidate.setUpdatedAt(LocalDateTime.now());
                    Candidate saved = candidateRepository.save(candidate);

                    // Additive: reflect the status change in the application history.
                    try {
                        lifecycleService.syncApplication(saved);
                    } catch (Exception e) {
                        log.warn("Lifecycle sync (status) skipped for {}: {}", saved.getId(), e.getMessage());
                    }

                    // Fire a notification when a candidate moves into a major
                    // pipeline state — Shortlisted / Offer / Hired / Rejected.
                    try {
                        if (status != null && !status.equalsIgnoreCase(previous)) {
                            String title = "Candidate " + status;
                            String body = saved.getName() + " is now " + status
                                    + (previous != null && !previous.isBlank() ? " (was " + previous + ")" : "");
                            String level = "Hired".equalsIgnoreCase(status) || "Shortlisted".equalsIgnoreCase(status) || "Offer".equalsIgnoreCase(status)
                                    ? "SUCCESS"
                                    : "Rejected".equalsIgnoreCase(status) ? "WARNING" : "INFO";
                            com.recruitai.agent.entity.Notification n =
                                    new com.recruitai.agent.entity.Notification(
                                            title, body,
                                            com.recruitai.agent.entity.Notification.CATEGORY_CANDIDATE,
                                            saved.getName(),
                                            level);
                            n.setRelatedEntityId(saved.getId());
                            notificationRepository.save(n);
                        }
                    } catch (Exception e) {
                        log.warn("Status-change notification failed for {}: {}", saved.getId(), e.getMessage());
                    }

                    return saved;
                })
                .orElseThrow(() -> new com.recruitai.agent.exception.ResourceNotFoundException("Candidate", id));
    }

    // ✅ DELETE (Compliance-aware: removes active candidate while preserving application history NFR-006)
    public void deleteCandidate(String id) {
        Candidate candidate = candidateRepository.findById(id)
                .orElseThrow(() -> new com.recruitai.agent.exception.ResourceNotFoundException("Candidate", id));

        // Preserve application history for compliance (NFR-006 / NFRU04 / BR-01)
        List<JobApplication> apps = applicationRepository.findByCandidateId(id);
        for (JobApplication a : apps) {
            if (a.getCandidateName() == null || a.getCandidateName().isBlank()) {
                a.setCandidateName(candidate.getName());
            }
            if (a.getJobTitle() == null || a.getJobTitle().isBlank()) {
                a.setJobTitle(candidate.getRole());
            }
            applicationRepository.save(a);
        }

        skillMatrixRepository.deleteByCandidateId(id);
        interviewRepository.deleteByCandidateId(id);

        if (candidate.getResumeId() != null) {
            resumeRepository.deleteById(candidate.getResumeId());
        }

        candidateRepository.deleteById(id);
    }

    // ✅ COUNTS
    public long getTotalCandidatesCount() {
        return candidateRepository.count();
    }

    public long getCandidatesCountByStatus(String status) {
        return candidateRepository.countByStatus(status);
    }

    public List<Candidate> getAllActiveCandidates() {
        return candidateRepository.findByStatus("New");
    }

    public long getCandidatesCreatedSince(LocalDateTime date) {
        return candidateRepository.countByCreatedAtAfter(date);
    }

    public List<Candidate> getCandidatesByJobId(String jobId) {
        return candidateRepository.findByJobId(jobId);
    }

    public long getCandidatesCountByStatusIn(List<String> statuses) {
        return candidateRepository.countByStatusIn(statuses);
    }

    public java.util.Map<String, Long> getDailyCandidateCounts(int days) {
        LocalDateTime startDate = LocalDateTime.now().minusDays(days);
        List<Candidate> candidates = candidateRepository.findByCreatedAtAfter(startDate);

        java.util.Map<String, Long> counts = new java.util.LinkedHashMap<>();

        // Initialize map with all dates
        for (int i = days - 1; i >= 0; i--) {
            String date = LocalDateTime.now().minusDays(i).toLocalDate().toString();
            counts.put(date, 0L);
        }

        // Fill with actual counts
        for (Candidate c : candidates) {
            if (c.getCreatedAt() != null) {
                String date = c.getCreatedAt().toLocalDate().toString();
                counts.put(date, counts.getOrDefault(date, 0L) + 1);
            }
        }
        return counts;
    }

    /**
     * Same as {@link #getDailyCandidateCounts} but also breaks the count down by
     * source bucket so the dashboard tooltip can show where each day's
     * applicants came from. Raw {@code source} strings vary per ingestion path
     * (LinkedIn extension, OryFolks careers form, email inbox, etc.); they're
     * normalised to five user-facing buckets here.
     *
     * Outer key: ISO date (yyyy-MM-dd). Inner map keys: "total", "Browser",
     * "Career Page", "OryFolks", "Email", "LinkedIn".
     */
    private static final java.util.List<String> SOURCE_BUCKETS = java.util.List.of(
            "Browser", "Career Page", "OryFolks", "Email", "LinkedIn");

    private static String normaliseSourceBucket(String raw) {
        if (raw == null) return "Browser";
        String s = raw.toLowerCase();
        if (s.contains("linkedin")) return "LinkedIn";
        if (s.contains("oryfolks")) return "OryFolks";
        if (s.contains("career") || s.contains("website")) return "Career Page";
        if (s.contains("email") || s.contains("gmail") || s.contains("inbox")) return "Email";
        // Anything else (manual upload, direct, internal, etc.) lands in Browser.
        return "Browser";
    }

    public java.util.Map<String, java.util.Map<String, Long>> getDailyCandidateCountsBySource(int days) {
        LocalDateTime startDate = LocalDateTime.now().minusDays(days);
        List<Candidate> candidates = candidateRepository.findByCreatedAtAfter(startDate);

        java.util.Map<String, java.util.Map<String, Long>> out = new java.util.LinkedHashMap<>();
        // Initialise each date with zero counts for every source bucket so the
        // frontend never has to guess at missing keys.
        for (int i = days - 1; i >= 0; i--) {
            String date = LocalDateTime.now().minusDays(i).toLocalDate().toString();
            java.util.Map<String, Long> row = new java.util.LinkedHashMap<>();
            row.put("total", 0L);
            for (String bucket : SOURCE_BUCKETS) row.put(bucket, 0L);
            out.put(date, row);
        }

        for (Candidate c : candidates) {
            if (c.getCreatedAt() == null) continue;
            String date = c.getCreatedAt().toLocalDate().toString();
            java.util.Map<String, Long> row = out.get(date);
            if (row == null) continue; // candidate older than the window
            String bucket = normaliseSourceBucket(c.getSource());
            row.merge("total", 1L, Long::sum);
            row.merge(bucket, 1L, Long::sum);
        }
        return out;
    }
}
