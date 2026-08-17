package com.recruitai.agent.config;

import com.recruitai.agent.entity.User;
import com.recruitai.agent.repository.UserRepository;
import org.bson.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Component;

import java.util.Date;
import java.util.Optional;

/**
 * One-shot bootstrap: promotes the owner of this dev environment from the
 * default USER role to MANAGER so they can approve HR deletion requests. The
 * deletion-approval workflow assumes a real Manager account exists; without
 * this the only Manager would be the demo bypass (manager@recruitai.com).
 *
 * <p>Idempotent — guarded by a marker doc in {@code system_meta}, and the
 * update only fires if the user's current role is anything other than MANAGER
 * or ADMIN.</p>
 */
@Component
public class PromoteAparnaToManager implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(PromoteAparnaToManager.class);
    private static final String MIGRATION_ID = "promote_aparna_to_manager_v1";
    private static final String META_COLLECTION = "system_meta";
    private static final String[] OWNER_EMAILS = {"projects@oryfolks.com", "aparnaboligerla@gmail.com"};

    private final UserRepository userRepository;
    private final MongoTemplate mongoTemplate;

    public PromoteAparnaToManager(UserRepository userRepository, MongoTemplate mongoTemplate) {
        this.userRepository = userRepository;
        this.mongoTemplate = mongoTemplate;
    }

    @Override
    public void run(String... args) {
        // Wrapped so a transient MongoDB outage at boot can never abort startup
        // (an unhandled exception here would crash-loop the whole backend).
        try {
            if (mongoTemplate.exists(Query.query(Criteria.where("_id").is(MIGRATION_ID)), META_COLLECTION)) {
                return;
            }
            int promoted = 0;
            for (String email : OWNER_EMAILS) {
                Optional<User> opt = userRepository.findByEmail(email);
                if (opt.isPresent()) {
                    User u = opt.get();
                    String r = u.getRole();
                    if (!"MANAGER".equalsIgnoreCase(r) && !"ADMIN".equalsIgnoreCase(r)) {
                        u.setRole("MANAGER");
                        userRepository.save(u);
                        log.info("Promoted {} from {} to MANAGER.", email, r);
                        promoted++;
                    }
                }
            }
            mongoTemplate.getCollection(META_COLLECTION).insertOne(new Document("_id", MIGRATION_ID)
                    .append("appliedAt", new Date())
                    .append("promoted", promoted));
        } catch (Exception e) {
            log.warn("{} skipped: {}", MIGRATION_ID, e.getMessage());
        }
    }
}