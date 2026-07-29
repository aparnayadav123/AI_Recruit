package com.recruitai.agent.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * CORS for the API. Exposed as a {@link CorsConfigurationSource} (not a standalone
 * CorsFilter) so Spring Security wires it into its own filter chain and answers the
 * preflight OPTIONS correctly — a standalone filter runs too late and the browser sees
 * "No 'Access-Control-Allow-Origin' header". See SecurityConfig's .cors(...).
 *
 * Allowed origins use the "*" pattern so any front-end host works (the recruiter
 * dashboard on Vercel, the OryFolks site, localhost dev) without hard-coding URLs.
 */
@Configuration
public class CorsConfig {

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        // Pattern (not plain origins) so it can reflect the caller's origin while
        // still permitting credentials.
        config.setAllowedOriginPatterns(List.of("*"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
