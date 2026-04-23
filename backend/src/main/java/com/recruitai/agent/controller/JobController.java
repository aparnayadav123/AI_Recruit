package com.recruitai.agent.controller;

import com.recruitai.agent.entity.Job;
import com.recruitai.agent.service.JobService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;

@RestController
@RequestMapping("/api/jobs")

public class JobController {

    @Autowired
    private JobService jobService;

    @GetMapping
    public ResponseEntity<Page<Job>> getAllJobs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size, // Increased default size to show all mock data equivalent
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {

        Sort.Direction direction = sortDir.equalsIgnoreCase("desc") ? Sort.Direction.DESC : Sort.Direction.ASC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));

        Page<Job> jobs = jobService.getAllJobs(pageable);
        return ResponseEntity.ok(jobs);
    }

    @PostMapping
    public ResponseEntity<Job> createJob(@Valid @RequestBody Job job) {
        Job createdJob = jobService.createJob(job);
        return ResponseEntity.status(201).body(createdJob);
    }

    @PostMapping("/reset")
    public ResponseEntity<String> resetJobs() {
        jobService.resetAndSeedJobs();
        return ResponseEntity.ok("Jobs Reset and Seeded Successfully");
    }

    @GetMapping("/{id}")
    public ResponseEntity<Job> getJobById(@PathVariable String id) {
        Job job = jobService.getJobById(id);
        return ResponseEntity.ok(job);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Job> updateJob(@PathVariable String id, @Valid @RequestBody Job job) {
        Job updatedJob = jobService.updateJob(id, job);
        return ResponseEntity.ok(updatedJob);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteJob(@PathVariable String id) {
        jobService.deleteJob(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/search")
    public ResponseEntity<Page<Job>> searchJobs(
            @RequestParam String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Job> jobs = jobService.searchJobs(search, pageable);
        return ResponseEntity.ok(jobs);
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<Page<Job>> getJobsByStatus(
            @PathVariable String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Job> jobs = jobService.getJobsByStatus(status, pageable);
        return ResponseEntity.ok(jobs);
    }

    @GetMapping("/department/{department}")
    public ResponseEntity<List<Job>> getJobsByDepartment(@PathVariable String department) {
        List<Job> jobs = jobService.getJobsByDepartment(department);
        return ResponseEntity.ok(jobs);
    }

    @GetMapping("/statistics")
    public ResponseEntity<?> getJobStatistics() {
        return ResponseEntity.ok(jobService.getJobStatistics());
    }

    @GetMapping("/distribution")
    public ResponseEntity<java.util.Map<String, Long>> getJobDistribution() {
        return ResponseEntity.ok(jobService.getJobsByDepartmentDistribution());
    }
}
