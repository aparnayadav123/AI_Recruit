package com.recruitai.agent.repository;

import com.recruitai.agent.entity.CandidateNote;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CandidateNoteRepository extends MongoRepository<CandidateNote, String> {
    List<CandidateNote> findByCandidateIdOrderByCreatedAtDesc(String candidateId);
}
