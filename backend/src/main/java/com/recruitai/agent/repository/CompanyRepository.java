package com.recruitai.agent.repository;

import com.recruitai.agent.entity.Company;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.Optional;

public interface CompanyRepository extends MongoRepository<Company, String> {
    Optional<Company> findTopByOrderByIdAsc();
}
