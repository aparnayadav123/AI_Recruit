package com.recruitai.agent.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class RootController {

    @GetMapping("/")
    public Map<String, String> root() {
        return Map.of(
                "status", "UP",
                "message", "RecruitAI Backend API is running",
                "documentation", "/health",
                "api_base", "/api");
    }
}
