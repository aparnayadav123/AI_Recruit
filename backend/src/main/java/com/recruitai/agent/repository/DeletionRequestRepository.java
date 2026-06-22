package com.recruitai.agent.repository;

import com.recruitai.agent.entity.DeletionRequest;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DeletionRequestRepository extends MongoRepository<DeletionRequest, String> {
    List<DeletionRequest> findByStatusOrderByCreatedAtDesc(String status);
    List<DeletionRequest> findAllByOrderByCreatedAtDesc();
    List<DeletionRequest> findByRequestedByEmailOrderByCreatedAtDesc(String email);
    long countByStatus(String status);
}