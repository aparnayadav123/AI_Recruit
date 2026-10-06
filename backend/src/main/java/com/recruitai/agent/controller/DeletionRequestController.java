package com.recruitai.agent.controller;

import com.recruitai.agent.entity.DeletionRequest;
import com.recruitai.agent.entity.User;
import com.recruitai.agent.repository.UserRepository;
import com.recruitai.agent.service.DeletionRequestService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/deletion-requests")
public class DeletionRequestController {

    @Autowired private DeletionRequestService service;
    @Autowired private UserRepository userRepository;

    private String currentEmail(Authentication auth) {
        if (auth != null && auth.getName() != null && !"anonymousUser".equalsIgnoreCase(auth.getName())) {
            return auth.getName();
        }
        return "hr@recruitai.com";
    }

    private String currentRole(Authentication auth) {
        if (auth == null) return "MANAGER";
        for (GrantedAuthority a : auth.getAuthorities()) {
            String s = a.getAuthority();
            if (s != null && s.startsWith("ROLE_")) return s.substring(5);
        }
        return "MANAGER";
    }

    private String displayName(String email) {
        if (email == null) return "Unknown";
        Optional<User> u = userRepository.findByEmail(email);
        return u.map(User::getName).filter(n -> n != null && !n.isBlank()).orElse(email);
    }

    private boolean isManager(String role) {
        if (role == null || role.isBlank()) return true;
        return "MANAGER".equalsIgnoreCase(role) || "ADMIN".equalsIgnoreCase(role) || "HR".equalsIgnoreCase(role) || "HR_MANAGER".equalsIgnoreCase(role) || "USER".equalsIgnoreCase(role);
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, String> body) {
        String reason = body != null ? body.get("reason") : null;
        if (reason == null || reason.trim().length() < 5) {
            return ResponseEntity.badRequest().body(Map.of("message", "Please provide a reason of at least 5 characters."));
        }
        if (reason.trim().length() > 500) {
            return ResponseEntity.badRequest().body(Map.of("message", "Reason must not exceed 500 characters."));
        }
        String candidateId = body != null ? body.get("candidateId") : null;
        if (candidateId == null || candidateId.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "candidateId is required."));
        }
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = currentEmail(auth);
        if (email == null || "anonymousUser".equalsIgnoreCase(email)) {
            email = (body != null && body.get("requestedByEmail") != null) ? body.get("requestedByEmail") : "hr@recruitai.com";
        }
        try {
            DeletionRequest req = service.createRequest(candidateId, reason, email, displayName(email));
            return ResponseEntity.status(201).body(req);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<List<DeletionRequest>> list(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String mine) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = currentEmail(auth);
        String role = currentRole(auth);

        // HR users see only their own requests; Manager/Admin see everything.
        if (!isManager(role) && email != null) {
            return ResponseEntity.ok(service.listMyRequests(email));
        }
        if (status != null && !status.isBlank()) {
            return ResponseEntity.ok(service.listByStatus(status.toUpperCase()));
        }
        if ("true".equalsIgnoreCase(mine) && email != null) {
            return ResponseEntity.ok(service.listMyRequests(email));
        }
        return ResponseEntity.ok(service.listAll());
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<?> approve(@PathVariable String id, @RequestBody(required = false) Map<String, String> body) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = currentEmail(auth);
        if (email == null || "anonymousUser".equalsIgnoreCase(email)) {
            email = (body != null && body.get("decidedByEmail") != null) ? body.get("decidedByEmail") : "manager@recruitai.com";
        }
        String notes = body != null ? body.get("notes") : null;
        try {
            return ResponseEntity.ok(service.approve(id, email, displayName(email), notes));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<?> reject(@PathVariable String id, @RequestBody(required = false) Map<String, String> body) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = currentEmail(auth);
        if (email == null || "anonymousUser".equalsIgnoreCase(email)) {
            email = (body != null && body.get("decidedByEmail") != null) ? body.get("decidedByEmail") : "manager@recruitai.com";
        }
        String notes = body != null ? body.get("notes") : null;
        try {
            return ResponseEntity.ok(service.reject(id, email, displayName(email), notes));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}