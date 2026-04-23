package com.recruitai.agent.repository;

import com.recruitai.agent.entity.Notification;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface NotificationRepository extends MongoRepository<Notification, String> {
    List<Notification> findByReadFalseOrderByCreatedAtDesc();

    List<Notification> findAllByOrderByCreatedAtDesc();

    void deleteByCreatedAtBeforeAndType(java.time.LocalDateTime cutoff, String type);

    void deleteByCreatedAtBeforeAndMessageContaining(java.time.LocalDateTime cutoff, String messagePart);
}
