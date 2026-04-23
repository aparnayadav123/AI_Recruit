package com.recruitai.agent;

import com.recruitai.agent.service.DataSeedingService;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;

import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class RecruitAiAgentApplication implements CommandLineRunner {

    @Autowired
    private DataSeedingService seedingService;

    public static void main(String[] args) {
        SpringApplication.run(RecruitAiAgentApplication.class, args);
    }

    @Override
    public void run(String... args) throws Exception {
        seedingService.seedData();
    }
}
