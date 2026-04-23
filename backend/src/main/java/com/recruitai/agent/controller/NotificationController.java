package com.recruitai.agent.controller;

import com.recruitai.agent.entity.Notification;
import com.recruitai.agent.repository.NotificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    @Autowired
    private NotificationRepository notificationRepository;

    @GetMapping
    public List<Notification> getNotifications(
            @RequestParam(required = false, defaultValue = "false") boolean unreadOnly) {
        try {
            if (unreadOnly) {
                return notificationRepository.findByReadFalseOrderByCreatedAtDesc();
            }
            return notificationRepository.findAllByOrderByCreatedAtDesc();
        } catch (Exception e) {
            System.err.println("Notification Fetch Error: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<Notification> markAsRead(@PathVariable String id) {
        return notificationRepository.findById(id)
                .map(notification -> {
                    notification.setRead(true);
                    return ResponseEntity.ok(notificationRepository.save(notification));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteNotification(@PathVariable String id) {
        if (notificationRepository.existsById(id)) {
            notificationRepository.deleteById(id);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }
}
