package com.recruitai.agent.repository;

import com.recruitai.agent.entity.Candidate;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CandidateRepository extends MongoRepository<Candidate, String> {

    Optional<Candidate> findTopByOrderBySequenceIdDesc();
    List<Candidate> findBySequenceIdIsNull();

    Optional<Candidate> findByEmail(String email);

    List<Candidate> findAllByEmail(String email);

    boolean existsByEmail(String email);

    boolean existsByEmailAndJobId(String email, String jobId);

    Optional<Candidate> findByEmailAndJobId(String email, String jobId);

    List<Candidate> findByStatus(String status);

    Page<Candidate> findByStatus(String status, Pageable pageable);

    @Query("{ '$or': [ " +
            "{ 'id': { '$regex': ?0, '$options': 'i' } }, " +
            "{ 'name': { '$regex': ?0, '$options': 'i' } }, " +
            "{ 'email': { '$regex': ?0, '$options': 'i' } }, " +
            "{ 'role': { '$regex': ?0, '$options': 'i' } }, " +
            "{ 'skills': { '$regex': ?0, '$options': 'i' } } " +
            "] }")
    Page<Candidate> searchCandidates(String search, Pageable pageable);

    @Query("{ 'experience': { '$gte': ?0 } }")
    List<Candidate> findByExperienceGreaterThanEqual(Double minYears);

    @Query("{ 'skills': { '$regex': ?0, '$options': 'i' } }")
    List<Candidate> findBySkillsContaining(String skill);

    long countByStatus(String status);

    long countByCreatedAtAfter(java.time.LocalDateTime date);

    List<Candidate> findByCreatedAtAfter(java.time.LocalDateTime date);

    long countByStatusIn(List<String> statuses);

    List<Candidate> findByJobId(String jobId);
}
