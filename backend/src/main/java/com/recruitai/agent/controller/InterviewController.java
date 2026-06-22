package com.recruitai.agent.controller;

import com.recruitai.agent.entity.Interview;
import com.recruitai.agent.service.InterviewService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/interviews")
public class InterviewController {

    @Autowired
    private InterviewService interviewService;

    @PostMapping
    public ResponseEntity<Interview> scheduleInterview(@RequestBody Interview interview) {
        return ResponseEntity.ok(interviewService.scheduleInterview(interview));
    }

    @GetMapping
    public ResponseEntity<List<Interview>> getAllInterviews() {
        return ResponseEntity.ok(interviewService.getAllInterviews());
    }

    @GetMapping("/candidate/{candidateId}")
    public ResponseEntity<List<Interview>> getInterviewsByCandidateId(@PathVariable String candidateId) {
        return ResponseEntity.ok(interviewService.getInterviewsByCandidate(candidateId));
    }

    @GetMapping("/statistics")
    public ResponseEntity<java.util.Map<String, Long>> getInterviewStatistics() {
        return ResponseEntity.ok(interviewService.getInterviewStatistics());
    }

    @PostMapping("/generate-link")
    public ResponseEntity<java.util.Map<String, String>> generateMeetingLink(@RequestParam String candidateName) {
        String link = interviewService.generateMeetingLink(candidateName);
        java.util.Map<String, String> response = new java.util.HashMap<>();
        response.put("link", link != null ? link : "");
        return ResponseEntity.ok(response);
    }

    /**
     * Transition an interview to a new status.
     * Allowed values: Scheduled | Rescheduled | Completed | Cancelled
     *   PATCH /api/interviews/{id}/status?status=Completed
     */
    @PatchMapping("/{id}/status")
    public ResponseEntity<Interview> updateStatus(@PathVariable String id, @RequestParam String status) {
        Interview updated = interviewService.updateStatus(id, status);
        if (updated == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteInterview(@PathVariable String id) {
        boolean deleted = interviewService.deleteInterview(id);
        return deleted ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }
}
