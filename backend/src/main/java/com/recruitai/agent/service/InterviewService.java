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

            com.recruitai.agent.entity.Notification notification = new com.recruitai.agent.entity.Notification(
                    "New Interview Scheduled for " + interview.getCandidateName() + " on " + formattedDate,
                    "SUCCESS");

            // Add navigation metadata
            notification.setRelatedEntityId(interview.getCandidateId());
            notification.setCategory("INTERVIEW");

            notificationRepository.save(notification);
        } catch (Exception e) {
            System.err.println("Failed to create notification: " + e.getMessage());
        }

        // Send Email to Candidate
        try {
            com.recruitai.agent.entity.Candidate candidate = candidateRepository.findById(interview.getCandidateId())
                    .orElse(null);

            if (candidate != null && candidate.getEmail() != null && !candidate.getEmail().isEmpty()) {
                java.time.LocalDateTime dt = interview.getStartTime();
                String formattedDate = "Unknown Date";
                if (dt != null) {
                    java.time.format.DateTimeFormatter formatter = java.time.format.DateTimeFormatter
                            .ofPattern("MMM dd, yyyy 'at' hh:mm a");
                    formattedDate = dt.format(formatter);
                }

                String subject = "Interview Scheduled: " + interview.getType();
                String body = "Dear " + candidate.getName() + ",\n\n" +
                        "New Interview Scheduled for " + candidate.getName() + " on " + formattedDate + ".\n\n" +
                        "Type: " + interview.getType() + "\n" +
                        "Meeting Link: " + (interview.getMeetingLink() != null ? interview.getMeetingLink() : "N/A")
                        + "\n" +
                        "Notes: " + (interview.getNotes() != null ? interview.getNotes() : "N/A") + "\n\n" +
                        "Best Regards,\nRecruitAI Team";

                emailService.sendSimpleMessage(candidate.getEmail(), subject, body);
            } else {
                System.err.println("Candidate email not found, skipping email notification.");
            }
        } catch (Exception e) {
            System.err.println("Failed to send email: " + e.getMessage());
        }

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

    public java.util.Map<String, Long> getInterviewStatistics() {
        java.time.LocalDateTime now = java.time.LocalDateTime.now();
        java.time.LocalDateTime startOfDay = now.toLocalDate().atStartOfDay();
        java.time.LocalDateTime endOfDay = now.toLocalDate().atTime(java.time.LocalTime.MAX);
        java.time.LocalDateTime startOfWeek = now.minusDays(7);

        long today = interviewRepository.countByStartTimeBetween(startOfDay, endOfDay);
        long upcoming = interviewRepository.countByStartTimeBetween(now, now.plusYears(1)); // Reasonable future limit
        long completed = interviewRepository.countByStatusAndStartTimeBetween("Completed", startOfWeek, now);
        long cancelled = interviewRepository.countByStatus("Cancelled");
        long rescheduled = interviewRepository.countByStatus("Rescheduled");

        return java.util.Map.of(
                "today", today,
                "upcoming", upcoming,
                "completed", completed,
                "cancelled", cancelled,
                "rescheduled", rescheduled);
    }
}
