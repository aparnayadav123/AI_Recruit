package com.recruitai.agent.repository;

import com.recruitai.agent.entity.User;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.Optional;

public interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findByEmail(String email);

    Optional<User> findByEmailIgnoreCase(String email);

    Optional<User> findByDemoId(String demoId);

    boolean existsByEmail(String email);
}
