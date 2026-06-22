package com.recruitai.agent.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.recruitai.agent.entity.*;
import com.recruitai.agent.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import java.io.File;
import java.io.IOException;
import java.util.List;

@Service
public class DataBackupService {

    private static final Logger logger = LoggerFactory.getLogger(DataBackupService.class);
    private static final String DATA_DIR = "data";

    @Autowired
    private CandidateRepository candidateRepository;

    @Autowired
    private JobRepository jobRepository;

    @Autowired
    private ResumeRepository resumeRepository;

    @Autowired
    private InterviewRepository interviewRepository;

    @Autowired
    private SkillMatrixRepository skillMatrixRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @jakarta.annotation.PostConstruct
    public void startupRestore() {
        logger.info("DataBackupService initialized. Performing startup restore...");
        restoreData();
    }

    @jakarta.annotation.PreDestroy
    public void shutdownBackup() {
        logger.info("Application shutting down. Performing final data backup...");
        backupData();
    }

    /**
     * Periodically backup data every 2 minutes for increased persistence
     */
    @Scheduled(fixedRate = 120000)
    public void backupData() {
        logger.info("Starting scheduled data backup...");

        File directory = new File(DATA_DIR);
        if (!directory.exists()) {
            directory.mkdirs();
        }

        backupEntity("candidates", candidateRepository.findAll());
        backupEntity("jobs", jobRepository.findAll());
        backupEntity("resumes", resumeRepository.findAll());
        backupEntity("interviews", interviewRepository.findAll());
        backupEntity("skillmatrices", skillMatrixRepository.findAll());
        backupEntity("auditlogs", auditLogRepository.findAll());
        backupEntity("notifications", notificationRepository.findAll());

        logger.info("Data backup completed successfully.");
    }

    private void backupEntity(String entityName, List<?> data) {
        try {
            if (data == null || data.isEmpty())
                return;
            File file = new File(DATA_DIR, entityName + "_dump.json");
            objectMapper.writeValue(file, data);
            logger.info("Backed up {} {} records to {}", data.size(), entityName, file.getAbsolutePath());
        } catch (IOException e) {
            logger.error("Failed to backup {}: {}", entityName, e.getMessage());
        }
    }

    public void restoreData() {
        File directory = new File(DATA_DIR);
        if (!directory.exists()) {
            logger.warn("No data directory found at {}. Skipping restore.", directory.getAbsolutePath());
            return;
        }

        logger.info("Checking repositories for existing data before restore...");

        if (candidateRepository.count() == 0) {
            restoreEntity("candidates", new TypeReference<List<Candidate>>() {
            }, candidateRepository);
        }

        if (jobRepository.count() == 0) {
            restoreEntity("jobs", new TypeReference<List<Job>>() {
            }, jobRepository);
        }

        if (resumeRepository.count() == 0)

        {
            restoreEntity("resumes", new TypeReference<List<Resume>>() {
            }, resumeRepository);
        }

        if (interviewRepository.count() == 0) {
            restoreEntity("interviews", new TypeReference<List<Interview>>() {
            }, interviewRepository);
        }

        if (skillMatrixRepository.count() == 0) {
            restoreEntity("skillmatrices", new TypeReference<List<SkillMatrix>>() {
            }, skillMatrixRepository);
        }

        if (auditLogRepository.count() == 0) {
            restoreEntity("auditlogs", new TypeReference<List<AuditLog>>() {
            }, auditLogRepository);
        }

        if (notificationRepository.count() == 0) {
            restoreEntity("notifications", new TypeReference<List<Notification>>() {
            }, notificationRepository);
        }
    }

    private <T> void restoreEntity(String entityName, TypeReference<List<T>> typeRef,
            org.springframework.data.mongodb.repository.MongoRepository<T, String> repository) {
        File file = new File(DATA_DIR, entityName + "_dump.json");
        if (file.exists()) {
            try {
                logger.info("Restoring {} from path: {}", entityName, file.getAbsolutePath());
                String content = new String(java.nio.file.Files.readAllBytes(file.toPath()),
                        java.nio.charset.StandardCharsets.UTF_8);

                if (content.trim().isEmpty())
                    return;

                // AUTOMATIC REPAIR LOGIC: Clean corrupted date formats before parsing
                // Fixes issues like 2026-02-13T09:28:32.320.32.3 -> 2026-02-13T09:28:32.320
                String repairedContent = content.replaceAll(
                        "(\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,3})?)(?:(?:\\.\\d+)+|Z|[+-]\\d{2}:?\\d{2})",
                        "$1");

                List<T> data = objectMapper.readValue(repairedContent, typeRef);
                if (data != null && !data.isEmpty()) {
                    logger.info("Found {} records for {}. Saving to MongoDB...", data.size(), entityName);
                    repository.saveAll(data);
                    logger.info("Successfully restored {} {} records.", data.size(), entityName);
                }
            } catch (Exception e) {
                logger.error("CRITICAL: Failed to restore {}: {}", entityName, e.getMessage());
            }
        }
    }
}
