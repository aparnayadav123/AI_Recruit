package com.recruitai.agent.repository;

import com.recruitai.agent.entity.JobApplication;
import com.recruitai.agent.entity.JobApplication.ApplicationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface JobApplicationRepository extends MongoRepository<JobApplication, String> {

    List<JobApplication> findByCandidateId(String candidateId);

    List<JobApplication> findByJobId(String jobId);

    void deleteByCandidateId(String candidateId);

    Optional<JobApplication> findByCandidateIdAndJobId(String candidateId, String jobId);

    List<JobApplication> findByStatus(ApplicationStatus status);

    Page<JobApplication> findByStatus(ApplicationStatus status, Pageable pageable);

    @Query("{ 'candidate_id': ?0, 'status': ?1 }")
    List<JobApplication> findByCandidateIdAndStatus(String candidateId, ApplicationStatus status);

    @Query("{ 'job_id': ?0, 'status': ?1 }")
    List<JobApplication> findByJobIdAndStatus(String jobId, ApplicationStatus status);

    @Query(value = "{ 'job_id': ?0 }", count = true)
    long countByJobId(String jobId);

    @Query(value = "{ 'job_id': ?0, 'status': ?1 }", count = true)
    long countByJobIdAndStatus(String jobId, ApplicationStatus status);

    @Query(value = "{ 'candidate_id': ?0 }", count = true)
    long countByCandidateId(String candidateId);

    @Query("{ 'applied_date': { '$gte': ?0 } }")
    List<JobApplication> findApplicationsAfter(LocalDateTime date);

    @Query("{ 'applied_date': { '$gte': ?0, '$lte': ?1 } }")
    List<JobApplication> findApplicationsBetweenDates(LocalDateTime startDate, LocalDateTime endDate);

    @org.springframework.data.mongodb.repository.Aggregation(pipeline = {
            "{ '$group': { '_id': '$status', 'count': { '$sum': 1 } } }" })
    List<Object[]> countApplicationsByStatus();
}
