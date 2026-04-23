package com.recruitai.agent.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import java.time.LocalDateTime;

@Document(collection = "users")
public class User {
    @Id
    private String id;

    @Field("email")
    private String email;

    @Field("name")
    private String name;

    @Field("role")
    private String role; // "HR" or "CANDIDATE"

    @Field("status")
    private String status; // "ACTIVE", "INACTIVE"

    @Field("created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @Field("password")
    private String password;

    @Field("profile_picture")
    private String profilePicture;

    @Field("notification_preferences")
    private NotificationPreferences notificationPreferences = new NotificationPreferences();

    public User() {
    }

    public NotificationPreferences getNotificationPreferences() {
        return notificationPreferences;
    }

    public void setNotificationPreferences(NotificationPreferences notificationPreferences) {
        this.notificationPreferences = notificationPreferences;
    }

    // Constructor for all fields except ID
    public User(String email, String password, String name, String role, String status) {
        this.email = email;
        this.password = password;
        this.name = name;
        this.role = role;
        this.status = status;
        this.createdAt = LocalDateTime.now();
    }

    // Legacy constructor compatibility
    public User(String email, String password, String role, String status) {
        this(email, password, null, role, status);
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public String getProfilePicture() {
        return profilePicture;
    }

    public void setProfilePicture(String profilePicture) {
        this.profilePicture = profilePicture;
    }
}
