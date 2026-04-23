package com.recruitai.agent.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

@Service
public class ZoomService {
    private static final Logger logger = LoggerFactory.getLogger(ZoomService.class);

    @Value("${zoom.account.id}")
    private String accountId;

    @Value("${zoom.client.id}")
    private String clientId;

    @Value("${zoom.client.secret}")
    private String clientSecret;

    @Value("${zoom.api.base-url:https://api.zoom.us/v2}")
    private String zoomApiBaseUrl;

    @Value("${zoom.oauth.url:https://zoom.us/oauth/token}")
    private String zoomOAuthUrl;

    private final RestTemplate restTemplate = new RestTemplate();
    private String cachedToken = null;
    private long tokenExpiry = 0;

    /**
     * Obtains an Access Token using Server-to-Server OAuth.
     * Tokens are cached for their duration (usually 1 hour).
     */
    private String getAccessToken() {
        if (cachedToken != null && System.currentTimeMillis() < tokenExpiry) {
            return cachedToken;
        }

        if ("YOUR_ZOOM_CLIENT_ID".equals(clientId) || clientId == null || clientId.isEmpty()) {
            logger.warn("Zoom credentials not configured. Skipping automated meeting creation.");
            return null;
        }

        try {
            String auth = clientId + ":" + clientSecret;
            String encodedAuth = Base64.getEncoder().encodeToString(auth.getBytes());

            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "Basic " + encodedAuth);
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

            String body = "grant_type=account_credentials&account_id=" + accountId;
            HttpEntity<String> request = new HttpEntity<>(body, headers);

            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    zoomOAuthUrl,
                    HttpMethod.POST,
                    request,
                    new org.springframework.core.ParameterizedTypeReference<Map<String, Object>>() {
                    });

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                Map<String, Object> bodyMap = response.getBody();
                cachedToken = (String) bodyMap.get("access_token");
                Integer expiresIn = (Integer) bodyMap.get("expires_in");
                tokenExpiry = System.currentTimeMillis() + (expiresIn * 1000) - 60000; // Expire 1 min early
                return cachedToken;
            }
        } catch (Exception e) {
            logger.error("Failed to get Zoom access token: " + e.getMessage());
        }
        return null;
    }

    /**
     * Creates a Zoom Meeting for an interview.
     * 
     * @param topic     Meeting title
     * @param startTime ISO format start time
     * @param duration  Duration in minutes
     * @return The join_url or null if failed
     */
    public String createMeeting(String topic, String startTime, int duration) {
        String token = getAccessToken();
        if (token == null)
            return null;

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(token);
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, Object> meetingData = new HashMap<>();
            meetingData.put("topic", topic);
            meetingData.put("type", 2); // Scheduled meeting
            meetingData.put("start_time", startTime);
            meetingData.put("duration", duration);
            meetingData.put("timezone", "UTC");

            Map<String, Object> settings = new HashMap<>();
            settings.put("join_before_host", true);
            settings.put("mute_upon_entry", true);
            settings.put("waiting_room", false);
            meetingData.put("settings", settings);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(meetingData, headers);

            // POST /users/me/meetings creates a meeting for the account holder
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    zoomApiBaseUrl + "/users/me/meetings",
                    HttpMethod.POST,
                    request,
                    new org.springframework.core.ParameterizedTypeReference<Map<String, Object>>() {
                    });

            if (response.getStatusCode() == HttpStatus.CREATED && response.getBody() != null) {
                Map<String, Object> bodyMap = response.getBody();
                String joinUrl = (String) bodyMap.get("join_url");
                logger.info("Successfully created Zoom meeting: {}", joinUrl);
                return joinUrl;
            }
        } catch (Exception e) {
            logger.error("Failed to create Zoom meeting: " + e.getMessage());
        }
        return null;
    }
}
