package com.recruitai.agent.service;

import com.recruitai.agent.entity.Candidate;
import com.recruitai.agent.entity.Interview;
import com.recruitai.agent.repository.CandidateRepository;
import com.recruitai.agent.repository.InterviewRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class InterviewReminderService {
    private static final Logger logger = LoggerFactory.getLogger(InterviewReminderService.class);

    @Autowired
    private InterviewRepository interviewRepository;

    @Autowired
    private CandidateRepository candidateRepository;

    @Autowired
    private com.recruitai.agent.repository.NotificationRepository notificationRepository;

    @Autowired
    private EmailService emailService;

    /**
     * Periodically checks for interviews starting in ~1 hour and sends reminder
     * emails.
     * Checks every minute.
     */
    @Scheduled(fixedRate = 30000)
    public void sendInterviewReminders() {
        logger.debug("Checking for interviews requiring 1-hour reminders...");
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime oneHourFromNow = now.plusHours(1);

        // Search window: Interviews starting between 55 and 65 minutes from now.
        // This ensures we catch them even if the scheduler skips a beat.
        LocalDateTime startRange = oneHourFromNow.minusMinutes(5);
        LocalDateTime endRange = oneHourFromNow.plusMinutes(5);

        List<Interview> upcomingInterviews = interviewRepository.findByStatusAndReminderSentFalseAndStartTimeBetween(
                "Scheduled", startRange, endRange);

        for (Interview interview : upcomingInterviews) {
            try {
                Candidate candidate = candidateRepository.findById(interview.getCandidateId()).orElse(null);

                // 1. Send Email (Requires full candidate profile + email)
                if (candidate != null && candidate.getEmail() != null) {
                    sendReminderEmail(candidate, interview);
                }

                // 2. Create In-App Notification (Always possible since we have name/id in
                // interview)
                String displayName = candidate != null ? candidate.getName() : interview.getCandidateName();
                com.recruitai.agent.entity.Notification notification = new com.recruitai.agent.entity.Notification(
                        "Interview Reminder: " + displayName + " in 1 hour (" +
                                interview.getStartTime().format(DateTimeFormatter.ofPattern("hh:mm a")) + ")",
                        "INFO");
                notification.setCategory("INTERVIEW_REMINDER");
                notification.setRelatedEntityId(interview.getCandidateId());
                notificationRepository.save(notification);

                interview.setReminderSent(true);
                interviewRepository.save(interview);

                logger.info("Successfully triggered 1-hour reminder for interview: ID={}, Candidate={}",
                        interview.getId(), displayName);
            } catch (Exception e) {
                logger.error("Failed to process reminder for interview {}: {}", interview.getId(), e.getMessage());
            }
        }
    }

    private void sendReminderEmail(Candidate candidate, Interview interview) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MMM dd, yyyy 'at' hh:mm a");
        String formattedTime = interview.getStartTime().format(formatter);

        String subject = "Reminder: Interview with RecruitAI in 1 Hour";
        String body = "Dear " + candidate.getName() + ",\n\n" +
                "This is a reminder that your " + interview.getType() + " interview for the position of " +
                candidate.getRole() + " is scheduled to start in 1 hour.\n\n" +
                "Details:\n" +
                " - Time: " + formattedTime + "\n" +
                " - Type: " + interview.getType() + "\n" +
                " - Meeting Link: "
                + (interview.getMeetingLink() != null ? interview.getMeetingLink() : "Not Applicable") + "\n\n" +
                "Please be ready 5 minutes early. Good luck!\n\n" +
                "Best Regards,\n" +
                "RecruitAI Team";

        emailService.sendSimpleMessage(candidate.getEmail(), subject, body);
        logger.info("Successfully sent 1-hour reminder email to {}", candidate.getEmail());
    }
}
