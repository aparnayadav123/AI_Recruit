package com.recruitai.agent.config;

import com.recruitai.agent.service.CandidateService;
import org.bson.Document;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Component;

import java.util.Date;

/**
 * Recompute fitScore once for every candidate that has a jobId, so existing
 * rows reflect the new deterministic ATS formula instead of stale 0% values
 * left behind by the old Gemini-based scorer.
 *
 * Idempotency: marker stored in the `system_meta` collection. Re-run by
 * deleting the marker (e.g. `db.system_meta.deleteOne({_id:"…"})`).
 */
@Component
@Order(20) // run after JobsPublishMigration
public class FitScoreBackfillMigration implements CommandLineRunner {

    // v4 — fuzzy skill matching (substring + alphanumeric-normalized) + re-match low-score assignments
    private static final String MIGRATION_ID = "fit_score_backfill_v4_fuzzy";
    private static final String META_COLLECTION = "system_meta";

    private final MongoTemplate mongoTemplate;
    private final CandidateService candidateService;

    public FitScoreBackfillMigration(MongoTemplate mongoTemplate, CandidateService candidateService) {
        this.mongoTemplate = mongoTemplate;
        this.candidateService = candidateService;
    }

    @Override
    public void run(String... args) {
        // Whole body wrapped so a transient MongoDB outage at boot (including the
        // exists() marker check) can never abort startup and crash-loop the backend.
        try {
            Query check = Query.query(Criteria.where("_id").is(MIGRATION_ID));
            if (mongoTemplate.exists(check, META_COLLECTION)) {
                return;
            }

            int updated = candidateService.backfillFitScores();

            Document marker = new Document("_id", MIGRATION_ID)
                    .append("appliedAt", new Date())
                    .append("updated", updated);
            mongoTemplate.getCollection(META_COLLECTION).insertOne(marker);

            System.out.println("[migration] " + MIGRATION_ID + " applied — updated " + updated + " candidates");
        } catch (Exception e) {
            // don't write the marker — let it retry next boot
            System.err.println("[migration] " + MIGRATION_ID + " skipped: " + e.getMessage());
        }
    }
}
