package com.recruitai.agent.service;

import com.recruitai.agent.entity.Candidate;
import com.recruitai.agent.repository.CandidateRepository;
import jakarta.annotation.PostConstruct;
import org.bson.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

/**
 * Atomic, monotonic counter for the displayed CANxxxx sequence number.
 *
 * <p>The previous "max(sequenceId in current rows) + 1" approach reclaimed
 * sequence numbers after a deletion — delete CAN0004 and the next upload
 * became CAN0004 again. Once an ID has been displayed to a user that breaks
 * the "constant for life" promise.
 *
 * <p>This counter lives in its own document inside the {@code system_meta}
 * collection ({@code _id = "candidate_seq"}). {@link #nextCandidateSeq()}
 * uses {@code findAndModify} with {@code upsert + returnNew + $inc} so the
 * increment is one round-trip and safe under concurrent uploads.
 *
 * <p>{@link #seedFromExistingMax()} runs once at startup and bumps the
 * counter to the current max sequenceId in the candidates collection — so
 * pre-existing rows keep their numbers and the next allocation continues
 * past them.
 */
@Service
public class SequenceService {

    private static final Logger log = LoggerFactory.getLogger(SequenceService.class);
    private static final String META_COLLECTION = "system_meta";
    private static final String CANDIDATE_COUNTER_ID = "candidate_seq";

    @Autowired private MongoTemplate mongoTemplate;
    @Autowired private CandidateRepository candidateRepository;

    @PostConstruct
    public synchronized void seedFromExistingMax() {
        var allCandidates = candidateRepository.findAll();

        long currentMax = allCandidates.stream()
                .map(Candidate::getSequenceId)
                .filter(s -> s != null)
                .mapToLong(Long::longValue)
                .max()
                .orElse(0L);

        Document existing = mongoTemplate.getCollection(META_COLLECTION)
                .find(new Document("_id", CANDIDATE_COUNTER_ID)).first();
        long stored = (existing != null && existing.get("value") instanceof Number)
                ? ((Number) existing.get("value")).longValue() : 0L;

        long seededValue = Math.max(currentMax, stored);
        mongoTemplate.upsert(
            Query.query(Criteria.where("_id").is(CANDIDATE_COUNTER_ID)),
            new Update().set("value", seededValue),
            META_COLLECTION);
        log.info("Candidate-seq counter at {} (was {}, max in rows {})",
                seededValue, stored, currentMax);

        // Backfill any candidates that have no sequenceId — use the same atomic
        // counter so we never collide with a parallel upload.
        int filled = 0;
        for (Candidate c : allCandidates) {
            if (c.getSequenceId() == null) {
                c.setSequenceId(nextCandidateSeq());
                candidateRepository.save(c);
                filled++;
            }
        }
        if (filled > 0) {
            log.info("Backfilled sequenceId on {} candidate(s) via counter.", filled);
        }

        // Guarantee the displayed candidate ID (CANxxx, derived from sequenceId) is
        // unique at the database level. The counter logic above already prevents
        // collisions, but a unique index makes it impossible for any future path to
        // persist two candidates with the same sequenceId. Sparse so a transient
        // null (pre-backfill) is simply not indexed rather than colliding.
        try {
            mongoTemplate.indexOps(Candidate.class).ensureIndex(
                    new org.springframework.data.mongodb.core.index.Index()
                            .on("sequenceId", org.springframework.data.domain.Sort.Direction.ASC)
                            .unique()
                            .sparse());
            log.info("Ensured unique index on candidates.sequenceId.");
        } catch (Exception e) {
            // Don't fail startup if legacy duplicates exist — log so it can be cleaned up.
            log.warn("Could not create unique index on candidates.sequenceId (duplicate values?): {}",
                    e.getMessage());
        }
    }

    /**
     * One-shot admin operation: renumber every candidate in createdAt order
     * starting at 1, then reset the counter to the new max. Useful when the
     * user wants a clean CAN001, CAN002, ... sequence after deleting test
     * data — the per-row stability ("never reclaim after delete") kicks in
     * again immediately after this returns.
     */
    public synchronized java.util.Map<String, Object> renumberAllFromOne() {
        java.util.List<Candidate> all = new java.util.ArrayList<>(candidateRepository.findAll());
        // createdAt may be null on a few legacy rows — fall back to id sort for stability.
        all.sort((a, b) -> {
            var ta = a.getCreatedAt();
            var tb = b.getCreatedAt();
            if (ta != null && tb != null) return ta.compareTo(tb);
            if (ta != null) return -1;
            if (tb != null) return 1;
            return String.valueOf(a.getId()).compareTo(String.valueOf(b.getId()));
        });

        long n = 0L;
        for (Candidate c : all) {
            n++;
            c.setSequenceId(n);
            candidateRepository.save(c);
        }

        // Reset persistent counter to the new max so subsequent uploads continue from there.
        mongoTemplate.upsert(
            Query.query(Criteria.where("_id").is(CANDIDATE_COUNTER_ID)),
            new Update().set("value", n),
            META_COLLECTION);

        log.info("Renumbered {} candidate(s) starting at 1; counter reset to {}.", n, n);
        java.util.Map<String, Object> result = new java.util.HashMap<>();
        result.put("renumbered", n);
        result.put("counter", n);
        return result;
    }

    /**
     * Atomically increments the counter and returns the next value. Never
     * reuses a number, even after a candidate is deleted.
     */
    public long nextCandidateSeq() {
        Document result = mongoTemplate.getCollection(META_COLLECTION).findOneAndUpdate(
                new Document("_id", CANDIDATE_COUNTER_ID),
                new Document("$inc", new Document("value", 1L)),
                new com.mongodb.client.model.FindOneAndUpdateOptions()
                        .upsert(true)
                        .returnDocument(com.mongodb.client.model.ReturnDocument.AFTER));
        if (result == null || !(result.get("value") instanceof Number)) {
            // Defensive fallback — shouldn't happen because upsert+returnNew always returns the doc.
            log.warn("Candidate-seq counter returned no document; defaulting to 1");
            return 1L;
        }
        return ((Number) result.get("value")).longValue();
    }

    /**
     * Returns the smallest positive sequence number not currently used by any
     * candidate — so IDs stay CONSECUTIVE and gap-free. A deleted candidate's
     * number is reclaimed by the next new candidate (e.g. delete CAN002, then the
     * next upload becomes CAN002 again). Uniqueness is still guaranteed: the number
     * is, by construction, absent from the live set, and a DB unique index on
     * sequenceId is the final backstop.
     */
    public synchronized long nextConsecutiveSeq() {
        java.util.Set<Long> used = new java.util.HashSet<>();
        for (Candidate c : candidateRepository.findAll()) {
            if (c.getSequenceId() != null) used.add(c.getSequenceId());
        }
        long n = 1L;
        while (used.contains(n)) n++;
        // Keep the persistent counter in step so other paths don't fall behind.
        try {
            mongoTemplate.upsert(
                Query.query(Criteria.where("_id").is(CANDIDATE_COUNTER_ID)),
                new Update().max("value", n),
                META_COLLECTION);
        } catch (Exception ignored) {}
        return n;
    }
}