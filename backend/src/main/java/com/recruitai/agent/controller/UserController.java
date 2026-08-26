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
            byte[] bytes = file.getBytes();
            String contentType = file.getContentType();
            if (contentType == null || contentType.isBlank() || contentType.equals("application/octet-stream")) {
                String name = file.getOriginalFilename();
                if (name != null && (name.toLowerCase().endsWith(".jpg") || name.toLowerCase().endsWith(".jpeg"))) {
                    contentType = "image/jpeg";
                } else if (name != null && name.toLowerCase().endsWith(".png")) {
                    contentType = "image/png";
                } else if (name != null && name.toLowerCase().endsWith(".webp")) {
                    contentType = "image/webp";
                } else if (name != null && name.toLowerCase().endsWith(".gif")) {
                    contentType = "image/gif";
                } else {
                    contentType = "image/jpeg";
                }
            }
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

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@RequestBody User userRequest,
            @RequestParam(value = "currentEmail", required = false) String currentEmail) {
        try {
            // Identify the account by its CURRENT email (id is stable, email is editable).
            // The body's email carries the possibly-new value, so we must not look up by it.
            String lookupEmail = (currentEmail != null && !currentEmail.isBlank())
                    ? currentEmail : userRequest.getEmail();
            Optional<User> userOpt = userRepository.findByEmail(lookupEmail);
            if (userOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            User user = userOpt.get();
            if (userRequest.getName() != null) {
                user.setName(userRequest.getName());
            }

            // Persist an email change (Settings > My Profile lets the user edit it).
            String newEmail = userRequest.getEmail();
            if (newEmail != null && !newEmail.isBlank() && !newEmail.equalsIgnoreCase(user.getEmail())) {
                if (!EMAIL_PATTERN.matcher(newEmail.trim()).matches()) {
                    return ResponseEntity.badRequest()
                            .body(java.util.Map.of("message", "Please enter a valid email address."));
                }
                Optional<User> existing = userRepository.findByEmail(newEmail);
                if (existing.isPresent() && !existing.get().getId().equals(user.getId())) {
                    return ResponseEntity.badRequest().body("Email already in use");
                }
                user.setEmail(newEmail);
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
