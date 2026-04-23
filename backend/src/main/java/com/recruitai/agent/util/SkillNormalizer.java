package com.recruitai.agent.util;

import java.util.*;
import java.util.stream.Collectors;

public class SkillNormalizer {

    private static final Map<String, String> NORMALIZATION_MAP = Map.ofEntries(
            Map.entry("reactjs", "React"),
            Map.entry("nodejs", "Node.js"),
            Map.entry("springboot", "Spring Boot"),
            Map.entry("js", "JavaScript"),
            Map.entry("mongodb", "MongoDB"),
            Map.entry("mysql", "MySQL"),
            Map.entry("postgres", "PostgreSQL"),
            Map.entry("aws", "AWS"),
            Map.entry("docker", "Docker"),
            Map.entry("kubernetes", "Kubernetes"));

    public static List<String> normalize(List<String> skills) {
        if (skills == null)
            return List.of();

        return skills.stream()
                .map(s -> s.trim().toLowerCase())
                .map(s -> NORMALIZATION_MAP.getOrDefault(s.replaceAll("[^a-z0-9]", ""), s))
                .map(SkillNormalizer::capitalizeDefault)
                .distinct()
                .sorted()
                .collect(Collectors.toList());
    }

    private static String capitalizeDefault(String s) {
        if (s == null || s.isEmpty())
            return s;
        // If it was already in our map, it's already capitalized as we want.
        // Otherwise, do a basic capitalization if it's just a raw lowercase string.
        if (NORMALIZATION_MAP.containsValue(s))
            return s;

        // Basic capitalization for others (e.g., "java" -> "Java")
        return s.substring(0, 1).toUpperCase() + s.substring(1);
    }

    /**
     * Normalize a single skill (for use in matching)
     */
    public static String normalizeSkill(String skill) {
        if (skill == null || skill.trim().isEmpty()) {
            return "";
        }

        String normalized = skill.trim().toLowerCase();
        String withoutSpecialChars = normalized.replaceAll("[^a-z0-9]", "");

        // Check if it's in our normalization map
        if (NORMALIZATION_MAP.containsKey(withoutSpecialChars)) {
            return NORMALIZATION_MAP.get(withoutSpecialChars);
        }

        // Otherwise return capitalized version
        return capitalizeDefault(normalized);
    }
}
