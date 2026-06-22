package com.recruitai.agent.controller;

import com.recruitai.agent.config.JwtUtils;
import com.recruitai.agent.dto.AuthRequest;
import com.recruitai.agent.dto.AuthResponse;
import com.recruitai.agent.entity.User;
import com.recruitai.agent.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @PostMapping("/social-login")
    public ResponseEntity<?> socialLogin(@RequestBody AuthRequest request) {
        String email = request.getEmail();
        Optional<User> existingUser = userRepository.findByEmail(email);
        User user;

        if (existingUser.isPresent()) {
            user = existingUser.get();
        } else {
            user = new User(email, null, request.getName(), "USER", "ACTIVE");
            userRepository.save(user);
        }

        String token = jwtUtils.generateToken(user.getEmail(), user.getRole());
        return ResponseEntity.ok(
                new AuthResponse(token, user.getRole(), user.getEmail(), user.getName(), user.getProfilePicture()));
    }

    private static final java.util.regex.Pattern EMAIL_PATTERN =
            java.util.regex.Pattern.compile("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody AuthRequest request) {
        // Validation — previously the endpoint happily created a user with
        // email=null / password=null because the DTO had no annotations and the
        // service didn't check.
        String validationError = validateRegister(request);
        if (validationError != null) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", validationError));
        }

        if (userRepository.findByEmail(request.getEmail().trim().toLowerCase()).isPresent()) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.CONFLICT)
                    .body(java.util.Map.of("message", "An account with that email already exists. Please sign in."));
        }

        User user = new User(
                request.getEmail().trim().toLowerCase(),
                passwordEncoder.encode(request.getPassword()),
                request.getName().trim(),
                "USER",
                "ACTIVE");
        userRepository.save(user);
        String token = jwtUtils.generateToken(user.getEmail(), user.getRole());
        return ResponseEntity.ok(new AuthResponse(token, user.getRole(), user.getEmail(), user.getName(), null));
    }

    private String validateRegister(AuthRequest r) {
        if (r == null) return "Empty request body.";
        if (r.getEmail() == null    || r.getEmail().isBlank())    return "Email is required.";
        if (!EMAIL_PATTERN.matcher(r.getEmail().trim()).matches()) return "Please enter a valid email address.";
        if (r.getPassword() == null || r.getPassword().length() < 6) return "Password must be at least 6 characters long.";
        if (r.getName() == null     || r.getName().isBlank())     return "Full name is required.";
        return null;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AuthRequest request) {
        try {
            // Basic input checks — never let null reach the matcher.
            if (request == null || request.getEmail() == null || request.getEmail().isBlank()
                    || request.getPassword() == null || request.getPassword().isEmpty()) {
                return ResponseEntity.badRequest().body(java.util.Map.of("message", "Email and password are required."));
            }
            String email = request.getEmail().trim().toLowerCase();

            // MASTER BYPASS: Always allow demo login
            if ("demo@recruitai.com".equals(email) && "admin123".equals(request.getPassword())) {
                String token = jwtUtils.generateToken("demo@recruitai.com", "ADMIN");
                return ResponseEntity.ok(new AuthResponse(token, "ADMIN", "demo@recruitai.com", "Demo User", null));
            }

            // Demo HR account — same shape as the demo bypass above, so testing the
            // deletion-request workflow doesn't require seeding a real user.
            if ("hr@recruitai.com".equals(email) && "hr1234".equals(request.getPassword())) {
                String token = jwtUtils.generateToken("hr@recruitai.com", "HR");
                return ResponseEntity.ok(new AuthResponse(token, "HR", "hr@recruitai.com", "HR Demo", null));
            }

            // Demo Manager account
            if ("manager@recruitai.com".equals(email) && "manager1234".equals(request.getPassword())) {
                String token = jwtUtils.generateToken("manager@recruitai.com", "MANAGER");
                return ResponseEntity.ok(new AuthResponse(token, "MANAGER", "manager@recruitai.com", "Manager Demo", null));
            }

            Optional<User> userOpt = userRepository.findByEmail(email);
            if (userOpt.isPresent()) {
                User user = userOpt.get();
                if (user.getPassword() != null && passwordEncoder.matches(request.getPassword(), user.getPassword())) {
                    String token = jwtUtils.generateToken(user.getEmail(), user.getRole());
                    return ResponseEntity.ok(new AuthResponse(token, user.getRole(), user.getEmail(), user.getName(), user.getProfilePicture()));
                }
            }
            return ResponseEntity.status(401)
                    .body(java.util.Map.of("message", "Invalid email or password."));
        } catch (Exception e) {
            logger.error("Login exception for {}: {}", request != null ? request.getEmail() : "null", e.getMessage());
            return ResponseEntity.internalServerError()
                    .body(java.util.Map.of("message", "An unexpected error occurred. Please try again."));
        }
    }
}
