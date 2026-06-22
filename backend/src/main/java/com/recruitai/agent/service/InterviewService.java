package com.recruitai.agent.service;

import com.recruitai.agent.entity.Interview;
import com.recruitai.agent.repository.InterviewRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class InterviewService {
    @Autowired
    private InterviewRepository interviewRepository;

    @Autowired
    private com.recruitai.agent.repository.CandidateRepository candidateRepository;

    @Autowired
    private com.recruitai.agent.repository.NotificationRepository notificationRepository;

    @Autowired
    private EmailService emailService;

    @Autowired
    private ZoomService zoomService;

    public Interview scheduleInterview(Interview interview) {
        // Blocked candidates (fake / inappropriate) are NOT eligible for interviews.
        // Guard here too — the UI blocks it, but a direct API call must be rejected as well.
        com.recruitai.agent.entity.Candidate blockCheck = (interview.getCandidateId() == null) ? null
                : candidateRepository.findById(interview.getCandidateId()).orElse(null);
        if (blockCheck != null && blockCheck.isBlocked()) {
            // Mapped to HTTP 400 by GlobalExceptionHandler (IllegalArgumentException).
            throw new IllegalArgumentException("Candidate is blocked and not eligible for interview.");
        }

        // AUTOMATION: Auto-create Zoom link for Video calls if not provided
        if (interview.getType() != null && interview.getType().toLowerCase().contains("video")) {
            if (interview.getMeetingLink() == null || interview.getMeetingLink().trim().isEmpty()) {
                String zoomLink = zoomService.createMeeting(
                        "Interview: " + interview.getCandidateName(),
                        interview.getStartTime() != null ? interview.getStartTime().toString()
                                : java.time.LocalDateTime.now().toString(),
                        60 // Default 1 hour
                );
                if (zoomLink != null) {
                    interview.setMeetingLink(zoomLink);
                }
            }
        }

        // Cleanup: Cancel any existing 'Scheduled' interviews for this candidate to
        // prevent duplicates
        try {
            List<Interview> existingInterviews = interviewRepository.findByCandidateId(interview.getCandidateId());
            for (Interview existing : existingInterviews) {
                if ("Scheduled".equalsIgnoreCase(existing.getStatus())) {
                    existing.setStatus("Rescheduled");
                    interviewRepository.save(existing);
                }
            }
        } catch (Exception e) {
            System.err.println("Warning: Failed to cleanup old interviews: " + e.getMessage());
        }

        Interview saved = interviewRepository.save(interview);

        // Update Candidate Status and Interview Details
        try {
            com.recruitai.agent.entity.Candidate candidate = candidateRepository.findById(interview.getCandidateId())
                    .orElse(null);
            if (candidate != null) {
                candidate.setStatus("Interview");
                // Extract date and time parts
                try {
                    java.time.LocalDateTime dt = interview.getStartTime();
                    if (dt != null) {
                        candidate.setInterviewDate(dt.toLocalDate().toString());
                        candidate.setInterviewTime(dt.toLocalTime().toString());
                    } else {
                        // Fallback
                        candidate.setInterviewDate("Unknown");
                        candidate.setInterviewTime("Unknown");
                    }
                } catch (Exception e) {
                    // Fallback if issues
                    candidate.setInterviewDate("Error");
                }

                candidate.setInterviewType(interview.getType());
                candidate.setInterviewNotes(interview.getNotes());
                candidate.setInterviewMeetingLink(interview.getMeetingLink());
                candidateRepository.save(candidate);
            }
        } catch (Exception e) {
            System.err.println("Failed to update candidate status: " + e.getMessage());
        }

        // Create Notification with Formatted Date
        try {
            java.time.LocalDateTime dt = interview.getStartTime();
            String formattedDate = "Unknown Date";
            if (dt != null) {
                java.time.format.DateTimeFormatter formatter = java.time.format.DateTimeFormatter
                        .ofPattern("MMM dd, yyyy 'at' hh:mm a");
                formattedDate = dt.format(formatter);
            }

            com.recruitai.agent.entity.Notification notification =
                    new com.recruitai.agent.entity.Notification(
                            "Interview Scheduled",
                            "Interview with " + interview.getCandidateName() + " is scheduled for " + formattedDate,
                            com.recruitai.agent.entity.Notification.CATEGORY_INTERVIEW,
                            interview.getCandidateName(),
                            "SUCCESS");
            notification.setRelatedEntityId(interview.getCandidateId());
            notificationRepository.save(notification);
        } catch (Exception e) {
            System.err.println("Failed to create notification: " + e.getMessage());
        }

        // Email notifications removed — SMTP is not configured in this environment.
        // The join link is surfaced in-app (candidate page "Join Meeting" button,
        // the upcoming-interview popup, and stored on candidate.interviewMeetingLink).

        return saved;
    }

    public String generateMeetingLink(String candidateName) {
        return zoomService.createMeeting(
                "Interview: " + candidateName,
                java.time.LocalDateTime.now().toString(),
                60);
    }

    public List<Interview> getAllInterviews() {
        return interviewRepository.findAll();
    }

    public List<Interview> getInterviewsByCandidate(String candidateId) {
        return interviewRepository.findByCandidateId(candidateId);
    }

    /**
     * Transition an interview to a new status. Also keeps the linked candidate's
     * Candidate.status in sync where it makes sense (Completed → "Interview" stays,
     * Cancelled → back to "Screening", etc.) and fires an in-app notification.
     */
    public Interview updateStatus(String interviewId, String newStatus) {
        if (newStatus == null || newStatus.isBlank()) return null;
        // Normalise to Title case so equality checks elsewhere keep working
        String normalized = newStatus.substring(0, 1).toUpperCase()
                + newStatus.substring(1).toLowerCase();
        java.util.Set<String> allowed = java.util.Set.of(
                "Scheduled", "Rescheduled", "Completed", "Cancelled");
        if (!allowed.contains(normalized)) return null;

        java.util.Optional<Interview> opt = interviewRepository.findById(interviewId);
        if (opt.isEmpty()) return null;

        Interview interview = opt.get();
        String previous = interview.getStatus();
        interview.setStatus(normalized);
        Interview saved = interviewRepository.save(interview);

        // Keep candidate in sync — when an interview is cancelled, drop them out of
        // the Interview stage; when completed, leave them at "Interview" so the
        // recruiter can decide the next move.
        try {
            com.recruitai.agent.entity.Candidate candidate =
                    candidateRepository.findById(interview.getCandidateId()).orElse(null);
            if (candidate != null) {
                if ("Cancelled".equals(normalized) && "Interview".equalsIgnoreCase(candidate.getStatus())) {
                    candidate.setStatus("Screening");
                    candidate.setInterviewDate(null);
                    candidate.setInterviewTime(null);
                    candidate.setInterviewMeetingLink(null);
                    candidateRepository.save(candidate);
                }
            }
        } catch (Exception e) {
            System.err.println("Status sync failed for interview " + interviewId + ": " + e.getMessage());
        }

        // In-app notification so the bell icon picks it up
        try {
            String title = "Interview " + normalized;
            String msg = "Interview with " + interview.getCandidateName() + " marked " + normalized
                    + (previous != null ? " (was " + previous + ")" : "");
            String level = "Cancelled".equals(normalized) ? "WARNING"
                    : "Completed".equals(normalized) ? "SUCCESS" : "INFO";
            com.recruitai.agent.entity.Notification n =
                    new com.recruitai.agent.entity.Notification(
                            title, msg,
                            com.recruitai.agent.entity.Notification.CATEGORY_INTERVIEW,
                            interview.getCandidateName(),
                            level);
            n.setRelatedEntityId(interview.getCandidateId());
            notificationRepository.save(n);
        } catch (Exception e) {
            System.err.println("Notification failed: " + e.getMessage());
        }
        return saved;
    }

    public boolean deleteInterview(String id) {
        if (!interviewRepository.existsById(id)) return false;
        interviewRepository.deleteById(id);
        return true;
    }

    public java.util.Map<String, Long> getInterviewStatistics() {
        java.time.LocalDateTime now = java.time.LocalDateTime.now();
        java.time.LocalDateTime startOfDay = now.toLocalDate().atStartOfDay();
        java.time.LocalDateTime endOfDay = now.toLocalDate().atTime(java.time.LocalTime.MAX);

        // Counts driven purely by Interview.status so the dashboard reflects
        // every PATCH /status transition immediately. Previously "upcoming"
        // counted every future row regardless of status, so a Cancelled or
        // Completed row stayed in the bucket and "completed" only fired for
        // interviews whose scheduled time was already in the past.
        long today = interviewRepository.countByStartTimeBetween(startOfDay, endOfDay);
        long upcoming    = interviewRepository.countByStatusAndStartTimeAfter("Scheduled", now)
                         + interviewRepository.countByStatusAndStartTimeAfter("Rescheduled", now);
        long completed   = interviewRepository.countByStatus("Completed");
        long cancelled   = interviewRepository.countByStatus("Cancelled");
        long rescheduled = interviewRepository.countByStatus("Rescheduled");

        return java.util.Map.of(
                "today", today,
                "upcoming", upcoming,
                "completed", completed,
                "cancelled", cancelled,
                "rescheduled", rescheduled);
    }
}
