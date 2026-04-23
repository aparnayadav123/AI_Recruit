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
        logger.info("Social Login Attempt - Provider: {}, Email: {}, Name: {}", 
            request.getProvider(), request.getEmail(), request.getName());
        try {
            String email = request.getEmail();
            if (email == null || email.isEmpty()) {
                logger.error("Social login failed: Email is null or empty");
                return ResponseEntity.badRequest().body("Error: Email is required");
            }

            Optional<User> existingUser = userRepository.findByEmail(email);
            User user;

            if (existingUser.isPresent()) {
                user = existingUser.get();
                logger.info("Social login: Found existing user {}", email);
            } else {
                logger.info("Social login: Creating new user {}", email);
                String role = "USER";
                user = new User(email, null, request.getName(), role, "ACTIVE");
                userRepository.save(user);
            }

            String token = jwtUtils.generateToken(user.getEmail(), user.getRole());
            logger.info("Social login successful for {}", email);
            return ResponseEntity.ok(
                    new AuthResponse(token, user.getRole(), user.getEmail(), user.getName(), user.getProfilePicture()));
        } catch (Exception e) {
            logger.error("Critical error during social login for {}: {}", request.getEmail(), e.getMessage(), e);
            return ResponseEntity.internalServerError().body("Error: " + e.getMessage());
        }
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody AuthRequest request) {
        System.out.println("DEBUG: Registration attempt for: " + request.getEmail());
        try {
            if (userRepository.findByEmail(request.getEmail()).isPresent()) {
                System.out.println("DEBUG: Registration failed - Email exists: " + request.getEmail());
                return ResponseEntity.badRequest().body("Error: Email is already associated with an account!");
            }

            String role = "USER";

            User user = new User(request.getEmail(),
                    passwordEncoder.encode(request.getPassword()),
                    request.getName(),
                    role,
                    "ACTIVE");
            userRepository.save(user);

            System.out.println("DEBUG: Registration successful - User created: " + request.getEmail());
            String token = jwtUtils.generateToken(user.getEmail(), user.getRole());
            return ResponseEntity.ok(
                    new AuthResponse(token, user.getRole(), user.getEmail(), user.getName(), user.getProfilePicture()));
        } catch (Exception e) {
            System.err.println("DEBUG: Registration Exception: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("Error: " + e.getMessage());
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AuthRequest request) {
        System.out.println("DEBUG: Login attempt for: " + request.getEmail());
        try {
            Optional<User> userOpt = userRepository.findByEmail(request.getEmail());

            // Self-healing: If admin account is missing, create it!
            if (userOpt.isEmpty() && "admin@recruitai.com".equalsIgnoreCase(request.getEmail())) {
                System.out.println("DEBUG: Admin user missing during login. Creating on-the-fly...");
                User admin = new User("admin@recruitai.com",
                        passwordEncoder.encode("Admin@123"),
                        "System Admin",
                        "HR",
                        "ACTIVE");
                userRepository.save(admin);
                userOpt = Optional.of(admin);
            }

            if (userOpt.isEmpty()) {
                System.out.println("DEBUG: Login failed - User totally not found: " + request.getEmail());
                return ResponseEntity.status(401).body("Error: Invalid email or password");
            }

            User user = userOpt.get();
            System.out.println(
                    "DEBUG: User found. Role: " + user.getRole() + ", HasPassword: " + (user.getPassword() != null));

            if (user.getPassword() == null || !passwordEncoder.matches(request.getPassword(), user.getPassword())) {
                System.out.println("DEBUG: Login failed - Password mismatch for: " + request.getEmail());
                return ResponseEntity.status(401).body("Error: Invalid email or password");
            }

            String token = jwtUtils.generateToken(user.getEmail(), user.getRole());
            System.out.println("DEBUG: Login successful for: " + request.getEmail());
            return ResponseEntity.ok(
                    new AuthResponse(token, user.getRole(), user.getEmail(), user.getName(), user.getProfilePicture()));
        } catch (Exception e) {
            System.err.println("DEBUG: Login Exception: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("Error: " + e.getMessage());
        }
    }
}
