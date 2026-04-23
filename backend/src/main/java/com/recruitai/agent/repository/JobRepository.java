package com.recruitai.agent.repository;

import com.recruitai.agent.entity.Job;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface JobRepository extends MongoRepository<Job, String> {

    List<Job> findByStatus(String status);

    Page<Job> findByStatus(String status, Pageable pageable);

    List<Job> findByEmploymentType(String employmentType);

    Page<Job> findByEmploymentType(String employmentType, Pageable pageable);

    List<Job> findByLocationContainingIgnoreCase(String location);

    List<Job> findByDepartment(String department);

    @Query("{ '$or': [ " +
            "{ 'title': { '$regex': ?0, '$options': 'i' } }, " +
            "{ 'description': { '$regex': ?0, '$options': 'i' } }, " +
            "{ 'company': { '$regex': ?0, '$options': 'i' } }, " +
            "{ 'skills.name': { '$regex': ?0, '$options': 'i' } } " +
            "] }")
    Page<Job> searchJobs(String search, Pageable pageable);

    @Query(value = "{ 'status': ?0 }", count = true)
    long countByStatus(String status);
}
