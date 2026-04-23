package com.recruitai.agent.repository;

import com.recruitai.agent.entity.Interview;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface InterviewRepository extends MongoRepository<Interview, String> {
    List<Interview> findByCandidateId(String candidateId);

    List<Interview> findByInterviewer(String interviewer);

    List<Interview> findByStatusAndReminderSentFalseAndStartTimeBetween(String status, java.time.LocalDateTime start,
            java.time.LocalDateTime end);

    void deleteByCandidateId(String candidateId);

    long countByStartTimeBetween(java.time.LocalDateTime start, java.time.LocalDateTime end);

    long countByStatus(String status);

    long countByStatusAndStartTimeAfter(String status, java.time.LocalDateTime start);

    long countByStatusAndStartTimeBetween(String status, java.time.LocalDateTime start, java.time.LocalDateTime end);
}
