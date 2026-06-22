package com.recruitai.agent.config;

import com.recruitai.agent.service.CandidateLifecycleService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * One-time, idempotent backfill that ensures every existing candidate with an assigned job has
 * a JobApplication history row. Runs late (Order high) and is fully wrapped in try/catch so a
 * failure can never prevent the app from starting or affect existing data.
 */
@Component
@Order(100)
public class CandidateLifecycleBackfillRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(CandidateLifecycleBackfillRunner.class);

    private final CandidateLifecycleService lifecycleService;

    public CandidateLifecycleBackfillRunner(CandidateLifecycleService lifecycleService) {
        this.lifecycleService = lifecycleService;
    }

    @Override
    public void run(ApplicationArguments args) {
        try {
            int created = lifecycleService.backfillAll();
            log.info("CandidateLifecycle backfill complete — {} new application history row(s) created.", created);
        } catch (Exception e) {
            log.warn("CandidateLifecycle backfill skipped: {}", e.getMessage());
        }
    }
}
