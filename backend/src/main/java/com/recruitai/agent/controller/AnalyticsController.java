package com.recruitai.agent.controller;

import com.recruitai.agent.service.RecruitmentAnalyticsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Reports & Analytics endpoints (read-only). */
@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    @Autowired
    private RecruitmentAnalyticsService analyticsService;

    @GetMapping("/overview")
    public ResponseEntity<?> getOverview() {
        return ResponseEntity.ok(analyticsService.getOverview());
    }
}
