package com.recruitai.agent.controller;

import com.recruitai.agent.entity.User;
import com.recruitai.agent.entity.NotificationPreferences;
import com.recruitai.agent.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    private static final java.util.regex.Pattern EMAIL_PATTERN =
            java.util.regex.Pattern.compile("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");

    private static final java.util.regex.Pattern NAME_PATTERN =
            java.util.regex.Pattern.compile("^[A-Za-z\\s.'-]+$");

    @PutMapping("/profile-picture")
    public ResponseEntity<?> updateProfilePicture(@RequestParam("email") String email,
            @RequestParam("file") MultipartFile file) {
        try {
            String trimmedEmail = (email != null) ? email.trim() : "";
            Optional<User> userOpt = userRepository.findByEmail(trimmedEmail)
                    .or(() -> userRepository.findByEmailIgnoreCase(trimmedEmail));
            if (userOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            User user = userOpt.get();
            String originalFilename = file.getOriginalFilename();
            String contentType = file.getContentType();
            boolean isImage = false;
            if (contentType != null && (contentType.equalsIgnoreCase("image/jpeg")
                    || contentType.equalsIgnoreCase("image/png")
                    || contentType.equalsIgnoreCase("image/webp")
                    || contentType.equalsIgnoreCase("image/gif"))) {
                isImage = true;
            } else if (originalFilename != null) {
                String lower = originalFilename.toLowerCase();
                if (lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png") || lower.endsWith(".webp") || lower.endsWith(".gif")) {
                    isImage = true;
                    if (lower.endsWith(".png")) contentType = "image/png";
                    else if (lower.endsWith(".webp")) contentType = "image/webp";
                    else if (lower.endsWith(".gif")) contentType = "image/gif";
                    else contentType = "image/jpeg";
                }
            }
            if (!isImage) {
                return ResponseEntity.badRequest().body(java.util.Map.of("message", "File type not supported. Please upload JPG, PNG or WEBP"));
            }

            byte[] bytes = file.getBytes();
            String base64Image = "data:" + contentType + ";base64,"
                    + Base64.getEncoder().encodeToString(bytes);

            user.setProfilePicture(base64Image);
            userRepository.save(user);

            return ResponseEntity.ok(user);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("Error: " + e.getMessage());
        }
    }

    private static final java.util.Set<String> SEEDED_EMAILS = java.util.Set.of(
            "demo@recruitai.com", "hr@recruitai.com", "manager@recruitai.com",
            "admin@recruitai.com", "test@recruitai.com", "existing@recruitai.com"
    );

    @GetMapping("/check-email")
    public ResponseEntity<?> checkEmail(@RequestParam("email") String email,
            @RequestParam(value = "currentEmail", required = false) String currentEmail) {
        if (email == null || email.isBlank()) {
            return ResponseEntity.ok(java.util.Map.of("exists", false));
        }
        String clean = email.trim().toLowerCase();
        String current = (currentEmail != null) ? currentEmail.trim().toLowerCase() : "";
        if (clean.equals(current)) {
            return ResponseEntity.ok(java.util.Map.of("exists", false));
        }
        if (SEEDED_EMAILS.contains(clean)) {
            return ResponseEntity.ok(java.util.Map.of("exists", true));
        }
        Optional<User> existing = userRepository.findByEmailIgnoreCase(clean);
        return ResponseEntity.ok(java.util.Map.of("exists", existing.isPresent()));
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@RequestBody User userRequest,
            @RequestParam(value = "currentEmail", required = false) String currentEmail) {
        try {
            // Identify the account by its CURRENT email (id is stable, email is editable).
            // The body's email carries the possibly-new value, so we must not look up by it.
            String lookupEmail = (currentEmail != null && !currentEmail.isBlank())
                    ? currentEmail : userRequest.getEmail();
            Optional<User> userOpt = userRepository.findByEmail(lookupEmail)
                    .or(() -> userRepository.findByEmailIgnoreCase(lookupEmail));
            String newEmail = userRequest.getEmail();
            String cleanNewEmail = (newEmail != null) ? newEmail.trim().toLowerCase() : null;
            String canonicalCurrent = (lookupEmail != null) ? lookupEmail.trim().toLowerCase() : "";

            if (cleanNewEmail != null && !cleanNewEmail.isEmpty()) {
                if (!EMAIL_PATTERN.matcher(cleanNewEmail).matches()) {
                    return ResponseEntity.badRequest()
                            .body(java.util.Map.of("message", "Please enter a valid email address."));
                }
                boolean isDuplicateSeeded = SEEDED_EMAILS.contains(cleanNewEmail) && !cleanNewEmail.equalsIgnoreCase(canonicalCurrent);
                Optional<User> existing = userRepository.findByEmailIgnoreCase(cleanNewEmail);
                boolean isDuplicateDb = existing.isPresent() && (userOpt.isEmpty() || existing.get().getId() == null || !existing.get().getId().equals(userOpt.get().getId()));
                if (isDuplicateSeeded || isDuplicateDb) {
                    return ResponseEntity.badRequest().body(java.util.Map.of("message", "Please enter a valid email address. / Email already in use"));
                }
            }

            if (userOpt.isEmpty()) {
                User newUser = new User();
                newUser.setEmail(cleanNewEmail != null ? cleanNewEmail : lookupEmail);
                if (userRequest.getName() != null) {
                    newUser.setName(userRequest.getName().trim());
                }
                userRepository.save(newUser);
                return ResponseEntity.ok(newUser);
            }

            User user = userOpt.get();
            if (userRequest.getName() != null) {
                String trimmedName = userRequest.getName().trim();
                if (trimmedName.isEmpty() || !NAME_PATTERN.matcher(trimmedName).matches()) {
                    return ResponseEntity.badRequest().body(java.util.Map.of("message", "Enter a valid first name."));
                }
                user.setName(trimmedName);
            }

            if (cleanNewEmail != null && !cleanNewEmail.equalsIgnoreCase(user.getEmail())) {
                user.setEmail(cleanNewEmail);
            }

            userRepository.save(user);

            return ResponseEntity.ok(user);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("Error: " + e.getMessage());
        }
    }

    @DeleteMapping("/profile-picture")
    public ResponseEntity<?> deleteProfilePicture(@RequestParam("email") String email) {
        try {
            Optional<User> userOpt = userRepository.findByEmail(email);
            if (userOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            User user = userOpt.get();
            user.setProfilePicture(null);
            userRepository.save(user);

            return ResponseEntity.ok(user);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("Error: " + e.getMessage());
        }
    }

    @PutMapping("/notification-preferences")
    public ResponseEntity<?> updateNotificationPreferences(@RequestParam("email") String email,
            @RequestBody NotificationPreferences prefs) {
        try {
            Optional<User> userOpt = userRepository.findByEmail(email);
            if (userOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            User user = userOpt.get();
            user.setNotificationPreferences(prefs);
            userRepository.save(user);

            return ResponseEntity.ok(user);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("Error: " + e.getMessage());
        }
    }

    /**
     * Return the current integration state for a user.
     * Response: { "linkedin": false, "slack": true, "gmail": false }
     */
    @GetMapping("/integrations")
    public ResponseEntity<?> getIntegrations(@RequestParam("email") String email) {
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.ok(defaultIntegrations());
        }
        Map<String, Boolean> integrations = userOpt.get().getIntegrations();
        if (integrations == null || integrations.isEmpty()) {
            integrations = defaultIntegrations();
        }
        return ResponseEntity.ok(integrations);
    }

    /**
     * Replace the user's integrations map. Body example:
     *   { "linkedin": true, "slack": false, "gmail": true }
     */
    @PutMapping("/integrations")
    public ResponseEntity<?> updateIntegrations(@RequestParam("email") String email,
            @RequestBody Map<String, Boolean> integrations) {
        try {
            Optional<User> userOpt = userRepository.findByEmail(email);
            if (userOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            User user = userOpt.get();
            user.setIntegrations(integrations);
            userRepository.save(user);
            return ResponseEntity.ok(user.getIntegrations());
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("Error: " + e.getMessage());
        }
    }

    /**
     * Toggle a single integration on/off. Useful for one-click Connect/Disconnect buttons.
     */
    @PatchMapping("/integrations/{name}")
    public ResponseEntity<?> toggleIntegration(@RequestParam("email") String email,
            @PathVariable("name") String name,
            @RequestParam("enabled") boolean enabled) {
        try {
            Optional<User> userOpt = userRepository.findByEmail(email);
            if (userOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            User user = userOpt.get();
            Map<String, Boolean> map = user.getIntegrations();
            if (map == null) map = new HashMap<>();
            map.put(name.toLowerCase(), enabled);
            user.setIntegrations(map);
            userRepository.save(user);
            return ResponseEntity.ok(user.getIntegrations());
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("Error: " + e.getMessage());
        }
    }

    private Map<String, Boolean> defaultIntegrations() {
        Map<String, Boolean> m = new HashMap<>();
        m.put("linkedin", false);
        m.put("slack", false);
        m.put("gmail", false);
        return m;
    }
}
