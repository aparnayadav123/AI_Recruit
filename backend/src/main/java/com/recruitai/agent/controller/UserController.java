package com.recruitai.agent.controller;

import com.recruitai.agent.entity.User;
import com.recruitai.agent.entity.NotificationPreferences;
import com.recruitai.agent.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.Base64;
import java.util.Optional;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @PutMapping("/profile-picture")
    public ResponseEntity<?> updateProfilePicture(@RequestParam("email") String email,
            @RequestParam("file") MultipartFile file) {
        try {
            Optional<User> userOpt = userRepository.findByEmail(email);
            if (userOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            User user = userOpt.get();
            byte[] bytes = file.getBytes();
            String base64Image = "data:" + file.getContentType() + ";base64,"
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
    public ResponseEntity<?> updateProfile(@RequestBody User userRequest) {
        try {
            Optional<User> userOpt = userRepository.findByEmail(userRequest.getEmail());
            if (userOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            User user = userOpt.get();
            user.setName(userRequest.getName());
            // You can add more fields here like role update etc if needed, but for now name
            // is the main one in settings
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
}
