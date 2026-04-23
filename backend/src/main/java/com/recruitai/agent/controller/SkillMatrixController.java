package com.recruitai.agent.controller;

import com.recruitai.agent.entity.SkillMatrix;
import com.recruitai.agent.entity.Candidate;
import com.recruitai.agent.repository.CandidateRepository;
import com.recruitai.agent.service.SkillMatrixService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/skill-matrix")
public class SkillMatrixController {

    @Autowired
    private SkillMatrixService skillMatrixService;

    @Autowired
    private CandidateRepository candidateRepository;

    @PostMapping("/calculate")
    public ResponseEntity<SkillMatrix> calculate(@RequestParam String candidateId, @RequestParam String jobId) {
        try {
            Candidate candidate = candidateRepository.findById(candidateId)
                    .orElseThrow(() -> new RuntimeException("Candidate not found"));
            return ResponseEntity.ok(skillMatrixService.calculateAndSave(candidate, jobId));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/candidate/{candidateId}")
    public ResponseEntity<List<SkillMatrix>> getByCandidate(@PathVariable String candidateId) {
        return ResponseEntity.ok(skillMatrixService.getByCandidate(candidateId));
    }

    @GetMapping("/job/{jobId}")
    public ResponseEntity<List<SkillMatrix>> getByJob(@PathVariable String jobId) {
        return ResponseEntity.ok(skillMatrixService.getByJob(jobId));
    }
}
