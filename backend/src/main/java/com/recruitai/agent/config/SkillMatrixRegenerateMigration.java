package com.recruitai.agent.config;

import com.recruitai.agent.service.SkillMatrixService;
import org.bson.Document;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Component;

import java.util.Date;

/**
 * One-shot migration that regenerates the skill proficiency matrix for every
 * candidate using the new deterministic algorithm. Replaces the equal/percent
 * fallback values left behind by the Gemini-backed scorer.
 *
 * Idempotency: marker stored in `system_meta`. Re-run by deleting the marker
 * doc with `db.system_meta.deleteOne({_id:"…"})`.
 */
@Component
@Order(30) // after FitScoreBackfillMigration
public class SkillMatrixRegenerateMigration implements CommandLineRunner {

    // v2: rescore from real resume text (evidence-based) instead of skill-list position.
    private static final String MIGRATION_ID = "skill_matrix_regenerate_v2";
    private static final String META_COLLECTION = "system_meta";

    private final MongoTemplate mongoTemplate;
    private final SkillMatrixService skillMatrixService;

    public SkillMatrixRegenerateMigration(MongoTemplate mongoTemplate, SkillMatrixService skillMatrixService) {
        this.mongoTemplate = mongoTemplate;
        this.skillMatrixService = skillMatrixService;
    }

    @Override
    public void run(String... args) {
        // Whole body wrapped so a transient MongoDB outage at boot (including the
        // exists() marker check) can never abort startup and crash-loop the backend.
        try {
            Query check = Query.query(Criteria.where("_id").is(MIGRATION_ID));
            if (mongoTemplate.exists(check, META_COLLECTION)) return;

            int updated = skillMatrixService.regenerateAll();

            Document marker = new Document("_id", MIGRATION_ID)
                    .append("appliedAt", new Date())
                    .append("updated", updated);
            mongoTemplate.getCollection(META_COLLECTION).insertOne(marker);

            System.out.println("[migration] " + MIGRATION_ID
                    + " applied — regenerated matrices for " + updated + " candidate(s)");
        } catch (Exception e) {
            // don't write marker — let it retry next boot
            System.err.println("[migration] " + MIGRATION_ID + " skipped: " + e.getMessage());
        }
    }
}
