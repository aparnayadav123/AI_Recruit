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
        return (auth != null && auth.getName() != null) ? auth.getName() : null;
    }

    private String currentRole(Authentication auth) {
        if (auth == null) return null;
        for (GrantedAuthority a : auth.getAuthorities()) {
            String s = a.getAuthority();
            if (s != null && s.startsWith("ROLE_")) return s.substring(5);
        }
        return null;
    }

    private String displayName(String email) {
        if (email == null) return "Unknown";
        Optional<User> u = userRepository.findByEmail(email);
        return u.map(User::getName).filter(n -> n != null && !n.isBlank()).orElse(email);
    }

    private boolean isManager(String role) {
        return "MANAGER".equalsIgnoreCase(role) || "ADMIN".equalsIgnoreCase(role);
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, String> body) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = currentEmail(auth);
        if (email == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentication required."));
        }
        String candidateId = body.get("candidateId");
        String reason = body.get("reason");
        if (candidateId == null || candidateId.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "candidateId is required."));
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
        String role = currentRole(auth);
        if (!isManager(role)) {
            return ResponseEntity.status(403).body(Map.of("message", "Only Manager or Admin can approve deletion requests."));
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
        String role = currentRole(auth);
        if (!isManager(role)) {
            return ResponseEntity.status(403).body(Map.of("message", "Only Manager or Admin can reject deletion requests."));
        }
        String notes = body != null ? body.get("notes") : null;
        try {
            return ResponseEntity.ok(service.reject(id, email, displayName(email), notes));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}