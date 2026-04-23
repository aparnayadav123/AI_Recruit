package com.recruitai.agent.controller;

import com.recruitai.agent.entity.JobApplication;
import com.recruitai.agent.service.JobApplicationService;
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
@RequestMapping("/api/applications")

public class JobApplicationController {

    @Autowired
    private JobApplicationService applicationService;

    @GetMapping
    public ResponseEntity<Page<JobApplication>> getAllApplications(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "appliedDate") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {

        Sort.Direction direction = sortDir.equalsIgnoreCase("desc") ? Sort.Direction.DESC : Sort.Direction.ASC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));

        Page<JobApplication> applications = applicationService.getAllApplications(pageable);
        return ResponseEntity.ok(applications);
    }

    @PostMapping
    public ResponseEntity<JobApplication> createApplication(@Valid @RequestBody JobApplication application) {
        JobApplication createdApplication = applicationService.createApplication(application);
        return ResponseEntity.status(201).body(createdApplication);
    }

    @GetMapping("/{id}")
    public ResponseEntity<JobApplication> getApplicationById(@PathVariable String id) {
        return applicationService.getApplicationById(id)
                .map(application -> ResponseEntity.ok(application))
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<JobApplication> updateApplication(
            @PathVariable String id,
            @Valid @RequestBody JobApplication application) {
        JobApplication updatedApplication = applicationService.updateApplication(id, application);
        return ResponseEntity.ok(updatedApplication);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteApplication(@PathVariable String id) {
        applicationService.deleteApplication(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/candidate/{candidateId}")
    public ResponseEntity<List<JobApplication>> getApplicationsByCandidate(@PathVariable String candidateId) {
        List<JobApplication> applications = applicationService.getApplicationsByCandidate(candidateId);
        return ResponseEntity.ok(applications);
    }

    @GetMapping("/job/{jobId}")
    public ResponseEntity<List<JobApplication>> getApplicationsByJob(@PathVariable String jobId) {
        List<JobApplication> applications = applicationService.getApplicationsByJob(jobId);
        return ResponseEntity.ok(applications);
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<Page<JobApplication>> getApplicationsByStatus(
            @PathVariable String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "appliedDate"));
        Page<JobApplication> applications = applicationService.getApplicationsByStatus(status, pageable);
        return ResponseEntity.ok(applications);
    }

    @GetMapping("/statistics")
    public ResponseEntity<?> getApplicationStatistics() {
        return ResponseEntity.ok(applicationService.getApplicationStatistics());
    }

    @GetMapping("/trends")
    public ResponseEntity<java.util.Map<String, Long>> getApplicationTrends(
            @RequestParam(defaultValue = "7") int days) {
        return ResponseEntity.ok(applicationService.getDailyApplicationCounts(days));
    }
}
