package com.recruitai.agent.service;

import com.recruitai.agent.entity.Candidate;
import com.recruitai.agent.entity.DeletionRequest;
import com.recruitai.agent.entity.Notification;
import com.recruitai.agent.exception.ResourceNotFoundException;
import com.recruitai.agent.repository.CandidateRepository;
import com.recruitai.agent.repository.DeletionRequestRepository;
import com.recruitai.agent.repository.NotificationRepository;
import com.recruitai.agent.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Orchestrates the HR-submits / Manager-approves deletion workflow. The actual
 * cascade delete still lives in {@link CandidateService#deleteCandidate} — this
 * service just gates when it's allowed to run and keeps an audit trail.
 */
@Service
public class DeletionRequestService {

    private static final Logger log = LoggerFactory.getLogger(DeletionRequestService.class);

    @Autowired private DeletionRequestRepository requestRepository;
    @Autowired private CandidateRepository candidateRepository;
    @Autowired private CandidateService candidateService;
    @Autowired private NotificationRepository notificationRepository;
    @Autowired private UserRepository userRepository;

    public DeletionRequest createRequest(String candidateId, String reason,
                                          String requestedByEmail, String requestedByName) {
        if (reason == null || reason.trim().length() < 5) {
            throw new IllegalArgumentException("A reason of at least 5 characters is required.");
        }
        Candidate candidate = candidateRepository.findById(candidateId)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate", candidateId));

        DeletionRequest req = new DeletionRequest();
        req.setCandidateId(candidate.getId());
        req.setCandidateName(candidate.getName());
        req.setRequestedByEmail(requestedByEmail);
        req.setRequestedByName(requestedByName != null ? requestedByName : requestedByEmail);
        req.setReason(reason.trim());
        req.setStatus(DeletionRequest.STATUS_PENDING);
        req.setCreatedAt(LocalDateTime.now());

        DeletionRequest saved = requestRepository.save(req);

        // Notify managers via the bell — no per-user routing today, so this lands
        // in the global notification feed under its own category that the review
        // page can also filter on.
        try {
            Notification n = new Notification(
                    "Deletion Request",
                    requestedByName + " requested deletion of " + candidate.getName()
                            + " — \"" + req.getReason() + "\"",
                    Notification.CATEGORY_APPROVAL,
                    candidate.getName(),
                    "WARNING");
            n.setRelatedEntityId(saved.getId());
            notificationRepository.save(n);
        } catch (Exception e) {
            log.warn("Notification dispatch failed for deletion-request {}: {}", saved.getId(), e.getMessage());
        }

        return saved;
    }

    public List<DeletionRequest> listAll() {
        return requestRepository.findAllByOrderByCreatedAtDesc();
    }

    public List<DeletionRequest> listByStatus(String status) {
        return requestRepository.findByStatusOrderByCreatedAtDesc(status);
    }

    public List<DeletionRequest> listMyRequests(String requesterEmail) {
        return requestRepository.findByRequestedByEmailOrderByCreatedAtDesc(requesterEmail);
    }

    public DeletionRequest approve(String requestId, String decidedByEmail, String decidedByName,
                                    String decisionNotes) {
        DeletionRequest req = requestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("DeletionRequest", requestId));
        if (!DeletionRequest.STATUS_PENDING.equals(req.getStatus())) {
            throw new IllegalStateException("Request is already " + req.getStatus().toLowerCase() + ".");
        }

        // Cascade-delete the candidate. If the candidate is already gone (race
        // with a manual delete), we still flip the request status so the row
        // doesn't dangle in pending forever.
        if (candidateRepository.existsById(req.getCandidateId())) {
            candidateService.deleteCandidate(req.getCandidateId());
            log.info("Approved deletion request {} — candidate {} deleted by {}",
                    req.getId(), req.getCandidateId(), decidedByEmail);
        } else {
            log.warn("Approved deletion request {} but candidate {} was already gone.",
                    req.getId(), req.getCandidateId());
        }

        req.setStatus(DeletionRequest.STATUS_APPROVED);
        req.setDecidedByEmail(decidedByEmail);
        req.setDecidedByName(decidedByName != null ? decidedByName : decidedByEmail);
        req.setDecidedAt(LocalDateTime.now());
        req.setDecisionNotes(decisionNotes);
        return requestRepository.save(req);
    }

    public DeletionRequest reject(String requestId, String decidedByEmail, String decidedByName,
                                   String decisionNotes) {
        DeletionRequest req = requestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("DeletionRequest", requestId));
        if (!DeletionRequest.STATUS_PENDING.equals(req.getStatus())) {
            throw new IllegalStateException("Request is already " + req.getStatus().toLowerCase() + ".");
        }
        req.setStatus(DeletionRequest.STATUS_REJECTED);
        req.setDecidedByEmail(decidedByEmail);
        req.setDecidedByName(decidedByName != null ? decidedByName : decidedByEmail);
        req.setDecidedAt(LocalDateTime.now());
        req.setDecisionNotes(decisionNotes);
        log.info("Rejected deletion request {} by {} — notes: {}",
                req.getId(), decidedByEmail, decisionNotes);
        return requestRepository.save(req);
    }
}