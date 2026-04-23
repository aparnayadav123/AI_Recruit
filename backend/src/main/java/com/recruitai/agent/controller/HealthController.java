package com.recruitai.agent.controller;

import com.recruitai.agent.repository.JobRepository;
import com.recruitai.agent.repository.CandidateRepository;
import com.recruitai.agent.repository.InterviewRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.bson.Document;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.ArrayList;

@RestController
@RequestMapping("/health")
public class HealthController {

    @Autowired
    private MongoTemplate mongoTemplate;

    @Autowired
    private JobRepository jobRepository;

    @Autowired
    private CandidateRepository candidateRepository;

    @Autowired
    private InterviewRepository interviewRepository;

    @GetMapping
    public ResponseEntity<Map<String, Object>> healthCheck() {
        Map<String, Object> response = Map.of(
                "ok", true,
                "service", "recruitai-agent-server",
                "timestamp", LocalDateTime.now().toString());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/raw-jobs")
    public ResponseEntity<List<Document>> getRawJobs() {
        return ResponseEntity.ok(mongoTemplate.findAll(Document.class, "jobs"));
    }

    @GetMapping("/raw-candidates")
    public ResponseEntity<List<Document>> getRawCandidates() {
        return ResponseEntity.ok(mongoTemplate.findAll(Document.class, "candidates"));
    }

    @GetMapping("/raw-interviews")
    public ResponseEntity<List<Document>> getRawInterviews() {
        return ResponseEntity.ok(mongoTemplate.findAll(Document.class, "interviews"));
    }

    @GetMapping("/raw-applications")
    public ResponseEntity<List<Document>> getRawApplications() {
        return ResponseEntity.ok(mongoTemplate.findAll(Document.class, "job_applications"));
    }

    @GetMapping("/raw-skills-matrix")
    public ResponseEntity<List<Document>> getRawSkillsMatrix() {
        return ResponseEntity.ok(mongoTemplate.findAll(Document.class, "skill_matrix"));
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getGlobalStats() {
        return ResponseEntity.ok(Map.of(
                "jobs", jobRepository.count(),
                "candidates", candidateRepository.count(),
                "interviews", interviewRepository.count(),
                "applications", mongoTemplate.getCollection("job_applications").countDocuments(),
                "skills_matrix", mongoTemplate.getCollection("skill_matrix").countDocuments()));
    }

    @GetMapping("/migrate-jobs")
    public ResponseEntity<Map<String, Object>> migrateJobs() {
        List<Document> jobs = mongoTemplate.findAll(Document.class, "jobs");
        int fixedCount = 0;
        List<String> log = new ArrayList<>();

        for (Document job : jobs) {
            Object skills = job.get("skills");
            String jobId = job.get("_id").toString();

            if (skills instanceof List) {
                List<?> skillList = (List<?>) skills;
                if (!skillList.isEmpty()) {
                    Object firstSkill = skillList.get(0);
                    if (firstSkill instanceof String) {
                        List<Document> newSkills = skillList.stream()
                                .map(s -> new Document("name", s).append("weight", 50))
                                .collect(Collectors.toList());
                        job.put("skills", newSkills);
                        mongoTemplate.save(job, "jobs");
                        fixedCount++;
                        log.add("Job " + jobId + ": Migrated string skills to objects");
                    }
                }
            }
        }
        return ResponseEntity.ok(Map.of(
                "status", "success",
                "fixed_count", fixedCount,
                "total_checked", jobs.size()));
    }
}
