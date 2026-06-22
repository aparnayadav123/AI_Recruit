package com.recruitai.agent.repository;

import com.recruitai.agent.entity.CandidateAuditEvent;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CandidateAuditEventRepository extends MongoRepository<CandidateAuditEvent, String> {
    List<CandidateAuditEvent> findByCandidateIdOrderByTimestampDesc(String candidateId);
}
