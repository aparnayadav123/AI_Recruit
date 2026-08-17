package com.recruitai.agent.config;

import com.mongodb.client.result.UpdateResult;
import com.recruitai.agent.entity.Job;
import org.bson.Document;
import org.springframework.boot.CommandLineRunner;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Component;

import java.util.Date;

/**
 * Runs once per database. Marks every job that is currently status="Open"
 * as publishedToCareers=true, so existing live careers-page listings survive
 * the introduction of the approval gate. Future jobs default to false and must
 * be published explicitly via POST /api/jobs/{id}/publish-to-careers.
 */
@Component
public class JobsPublishMigration implements CommandLineRunner {

    private static final String MIGRATION_ID = "jobs_published_to_careers_v1";
    private static final String META_COLLECTION = "system_meta";

    private final MongoTemplate mongoTemplate;

    public JobsPublishMigration(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @Override
    public void run(String... args) {
        // Wrapped so a transient MongoDB outage at boot can never abort startup
        // (an unhandled exception here would crash-loop the whole backend).
        try {
            Query alreadyApplied = Query.query(Criteria.where("_id").is(MIGRATION_ID));
            if (mongoTemplate.exists(alreadyApplied, META_COLLECTION)) {
                return;
            }

            Query openJobs = Query.query(Criteria.where("status").is("Open"));
            Update markPublished = Update.update("published_to_careers", true);
            UpdateResult result = mongoTemplate.updateMulti(openJobs, markPublished, Job.class);

            Document marker = new Document("_id", MIGRATION_ID)
                    .append("appliedAt", new Date())
                    .append("matched", result.getMatchedCount())
                    .append("modified", result.getModifiedCount());
            mongoTemplate.getCollection(META_COLLECTION).insertOne(marker);

            System.out.println("[migration] " + MIGRATION_ID
                    + " applied — matched=" + result.getMatchedCount()
                    + " modified=" + result.getModifiedCount());
        } catch (Exception e) {
            System.err.println("[migration] " + MIGRATION_ID + " skipped: " + e.getMessage());
        }
    }
}
