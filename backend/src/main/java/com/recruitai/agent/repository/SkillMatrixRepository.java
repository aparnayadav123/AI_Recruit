package com.recruitai.agent.repository;

import com.recruitai.agent.entity.SkillMatrix;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface SkillMatrixRepository extends MongoRepository<SkillMatrix, String> {
    List<SkillMatrix> findByCandidateId(String candidateId);

    void deleteByCandidateId(String candidateId);

    List<SkillMatrix> findByJobId(String jobId);

    List<SkillMatrix> findByCandidateIdAndJobId(String candidateId, String jobId);
}
