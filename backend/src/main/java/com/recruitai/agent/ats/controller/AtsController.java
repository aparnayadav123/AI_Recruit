package com.recruitai.agent.ats.controller;

import com.recruitai.agent.ats.model.AtsRequest;
import com.recruitai.agent.ats.service.AtsOrchestratorService;
import com.recruitai.agent.entity.Candidate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;

@RestController
@RequestMapping("/api/ats")
public class AtsController {

    @Autowired
    private AtsOrchestratorService orchestratorService;

    @PostMapping("/collect")
    public ResponseEntity<String> triggerCollection(@RequestBody AtsRequest request) {
        orchestratorService.triggerCollection(request);
        return ResponseEntity.ok("ATS Collection Agent triggered for source: " + request.getSource());
    }

    @PostMapping("/upload")
    public ResponseEntity<Candidate> uploadResume(@RequestParam("file") MultipartFile file,
            @RequestParam(value = "source", defaultValue = "UPLOAD") String source,
            @RequestParam(value = "jobId", required = false) String jobId) {
        try {
            Candidate candidate = orchestratorService.processSingleResume(file, source, jobId);
            return ResponseEntity.ok(candidate);
        } catch (IOException e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping("/parse-profile")
    public ResponseEntity<Candidate> parseProfile(@RequestBody java.util.Map<String, String> payload) {
        String profileText = payload.get("text");
        String source = payload.getOrDefault("source", "LINKEDIN");
        
        Candidate candidate = orchestratorService.parseProfileText(profileText, source);
        return ResponseEntity.ok(candidate);
    }
}
