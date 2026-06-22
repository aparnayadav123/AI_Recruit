package com.recruitai.agent.service;

import com.recruitai.agent.repository.NotificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class NotificationCleanupService {

    @Autowired
    private NotificationRepository notificationRepository;

    /**
     * Periodically deletes interview notifications older than 24 hours.
     * Runs every hour.
     */
    @Scheduled(fixedRate = 3600000) // 1 Hour
    public void cleanupOldInterviewNotifications() {
        System.out.println("Running Notification Cleanup Task...");
        LocalDateTime cutoff = LocalDateTime.now().minusHours(24);

        // Cleanup explicit "INTERVIEW" category notifications if implemented, or
        // fallback to message content
        // Since we didn't add 'category' to the Repo query yet, let's use message
        // patterns or type

        // 1. Delete by Type/Category if distinct
        // We use type "SUCCESS" for new inteviews usually, but let's be safe and target
        // message content

        // Target: "New Interview Scheduled" messages
        try {
            notificationRepository.deleteByCreatedAtBeforeAndMessageContaining(cutoff, "New Interview Scheduled");
            System.out.println("Deleted old 'New Interview Scheduled' notifications older than custom cutoff.");
        } catch (Exception e) {
            System.err.println("Failed to cleanup old 'New Interview Scheduled' notifications: " + e.getMessage());
        }

        // Target: "Interview Reminder" messages (from the reminder service)
        try {
            notificationRepository.deleteByCreatedAtBeforeAndMessageContaining(cutoff, "Interview Reminder");
            System.out.println("Deleted old 'Interview Reminder' notifications older than custom cutoff.");
        } catch (Exception e) {
            System.err.println("Failed to cleanup old 'Interview Reminder' notifications: " + e.getMessage());
        }
    }
}
