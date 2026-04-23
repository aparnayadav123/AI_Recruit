package com.recruitai.agent.controller;

import com.recruitai.agent.entity.Candidate;
import com.recruitai.agent.service.ResumeService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;

@RestController
@RequestMapping("/api/ingestion")
public class IngestionController {
    private static final Logger logger = LoggerFactory.getLogger(IngestionController.class);

    @Autowired
    private ResumeService resumeService;

    @PostMapping("/naukri")
    public ResponseEntity<Candidate> ingestFromNaukri(@RequestParam("file") MultipartFile file,
            @RequestParam(value = "jobId", required = false) String jobId) throws IOException {
        logger.info("Ingesting resume from Naukri: {}", file.getOriginalFilename());
        return ResponseEntity.ok(resumeService.uploadAndParseResume(file, "Naukri", jobId, null));
    }

    @PostMapping("/linkedin")
    public ResponseEntity<Candidate> ingestFromLinkedIn(@RequestParam("file") MultipartFile file,
            @RequestParam(value = "jobId", required = false) String jobId) throws IOException {
        logger.info("Ingesting resume from LinkedIn: {}", file.getOriginalFilename());
        return ResponseEntity.ok(resumeService.uploadAndParseResume(file, "LinkedIn", jobId, null));
    }

    @PostMapping("/website")
    public ResponseEntity<Candidate> ingestFromWebsite(@RequestParam("file") MultipartFile file,
            @RequestParam(value = "jobId", required = false) String jobId) throws IOException {
        logger.info("Ingesting resume from Website: {}", file.getOriginalFilename());
        return ResponseEntity.ok(resumeService.uploadAndParseResume(file, "Website", jobId, null));
    }

    @PostMapping("/email")
    public ResponseEntity<Candidate> ingestFromEmail(@RequestParam("file") MultipartFile file,
            @RequestParam(value = "jobId", required = false) String jobId) throws IOException {
        logger.info("Ingesting resume from Email: {}", file.getOriginalFilename());
        return ResponseEntity.ok(resumeService.uploadAndParseResume(file, "Email", jobId, null));
    }

    @PostMapping("/generic")
    public ResponseEntity<Candidate> ingestGeneric(@RequestParam("file") MultipartFile file,
            @RequestParam("source") String source,
            @RequestParam(value = "jobId", required = false) String jobId) throws IOException {
        logger.info("Ingesting resume from {}: {}", source, file.getOriginalFilename());
        return ResponseEntity.ok(resumeService.uploadAndParseResume(file, source, jobId, null));
    }
}
