package com.recruitai.agent.dto;

public class AuthResponse {
    private String token;
    private String role;
    private String email;
    private String name;
    private String profilePicture;

    public AuthResponse(String token, String role, String email, String name, String profilePicture) {
        this.token = token;
        this.role = role;
        this.email = email;
        this.name = name;
        this.profilePicture = profilePicture;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
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

    public String getProfilePicture() {
        return profilePicture;
    }

    public void setProfilePicture(String profilePicture) {
        this.profilePicture = profilePicture;
    }
}
