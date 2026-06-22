package com.recruitai.agent.util;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.Period;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.regex.Pattern;
import java.util.regex.Matcher;
import java.util.ArrayList;
import java.util.List;

/**
 * Deterministic experience calculator from employment date ranges
 * Returns 0 for freshers, never randomizes or estimates
 */
@Component
public class ExperienceCalculator {

    private static final Logger logger = LoggerFactory.getLogger(ExperienceCalculator.class);

    // Common date formats in resumes
    private static final DateTimeFormatter[] DATE_FORMATTERS = {
            DateTimeFormatter.ofPattern("MM/yyyy"),
            DateTimeFormatter.ofPattern("MMM yyyy"),
            DateTimeFormatter.ofPattern("MMMM yyyy"),
            DateTimeFormatter.ofPattern("yyyy-MM"),
            DateTimeFormatter.ofPattern("yyyy/MM")
    };

    /**
     * Calculate total experience from resume text
     * Uses deterministic parsing - never estimates or randomizes
     * 
     * @param resumeText Full resume text
     * @return Total years of experience (0 if none found)
     */
    public double calculateFromText(String resumeText) {
        if (resumeText == null || resumeText.trim().isEmpty()) {
            logger.debug("Resume text is empty - returning 0 experience");
            return 0.0;
        }

        // Try explicit experience statements first
        Double explicitExperience = extractExplicitExperience(resumeText);
        if (explicitExperience != null && explicitExperience > 0) {
            logger.info("Found explicit experience statement: {} years", explicitExperience);
            return explicitExperience;
        }

        // Try to calculate from employment date ranges
        Double calculatedExperience = calculateFromDateRanges(resumeText);
        if (calculatedExperience != null && calculatedExperience > 0) {
            logger.info("Calculated experience from date ranges: {} years", calculatedExperience);
            return calculatedExperience;
        }

        // No experience found - return 0 (fresher)
        logger.info("No experience information found - returning 0 (fresher)");
        return 0.0;
    }

    /**
     * Extract explicit experience statements like "5 years of experience"
     */
    private Double extractExplicitExperience(String text) {
        // Patterns for explicit experience statements
        Pattern[] patterns = {
                Pattern.compile("(\\d+(?:\\.\\d+)?)\\s*(?:\\+)?\\s*years?\\s+(?:of\\s+)?experience",
                        Pattern.CASE_INSENSITIVE),
                Pattern.compile("experience\\s*:?\\s*(\\d+(?:\\.\\d+)?)\\s*(?:\\+)?\\s*years?",
                        Pattern.CASE_INSENSITIVE),
                Pattern.compile("total\\s+experience\\s*:?\\s*(\\d+(?:\\.\\d+)?)\\s*(?:\\+)?\\s*years?",
                        Pattern.CASE_INSENSITIVE),
                Pattern.compile("(\\d+(?:\\.\\d+)?)\\s*(?:\\+)?\\s*yrs?\\s+(?:of\\s+)?exp", Pattern.CASE_INSENSITIVE)
        };

        for (Pattern pattern : patterns) {
            Matcher matcher = pattern.matcher(text);
            if (matcher.find()) {
                try {
                    double years = Double.parseDouble(matcher.group(1));
                    if (years >= 0 && years <= 50) { // Sanity check
                        return years;
                    }
                } catch (NumberFormatException e) {
                    logger.debug("Failed to parse experience value: {}", matcher.group(1));
                }
            }
        }

        return null;
    }

    /**
     * Calculate experience from employment date ranges
     */
    private Double calculateFromDateRanges(String text) {
        // Pattern to find date ranges like "Jan 2020 - Dec 2023" or "01/2020 - Present"
        Pattern dateRangePattern = Pattern.compile(
                "(\\d{1,2}[/-]\\d{4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\s+\\d{4})\\s*[-–—to]+\\s*(\\d{1,2}[/-]\\d{4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\s+\\d{4}|Present|Current|Till\\s+Date)",
                Pattern.CASE_INSENSITIVE);

        Matcher matcher = dateRangePattern.matcher(text);
        List<Double> durations = new ArrayList<>();

        while (matcher.find()) {
            String startDateStr = matcher.group(1);
            String endDateStr = matcher.group(2);

            try {
                LocalDate startDate = parseDate(startDateStr);
                LocalDate endDate = parseEndDate(endDateStr);

                if (startDate != null && endDate != null) {
                    Period period = Period.between(startDate, endDate);
                    double years = period.getYears() + (period.getMonths() / 12.0);

                    if (years >= 0 && years <= 50) { // Sanity check
                        durations.add(years);
                        logger.debug("Found employment period: {} to {} = {} years",
                                startDateStr, endDateStr, years);
                    }
                }
            } catch (Exception e) {
                logger.debug("Failed to parse date range: {} - {}", startDateStr, endDateStr);
            }
        }

        // Sum all employment durations (may have overlaps, but this is deterministic)
        if (!durations.isEmpty()) {
            double total = durations.stream().mapToDouble(Double::doubleValue).sum();
            return Math.round(total * 10.0) / 10.0; // Round to 1 decimal place
        }

        return null;
    }

    /**
     * Parse date string to LocalDate
     */
    private LocalDate parseDate(String dateStr) {
        if (dateStr == null || dateStr.trim().isEmpty()) {
            return null;
        }

        String normalized = normalizeDate(dateStr);

        for (DateTimeFormatter formatter : DATE_FORMATTERS) {
            try {
                return LocalDate.parse(normalized, formatter).withDayOfMonth(1);
            } catch (DateTimeParseException e) {
                // Try next formatter
            }
        }

        logger.debug("Could not parse date: {}", dateStr);
        return null;
    }

    /**
     * Parse end date (handles "Present", "Current", etc.)
     */
    private LocalDate parseEndDate(String dateStr) {
        if (dateStr == null) {
            return null;
        }

        String lower = dateStr.trim().toLowerCase();
        if (lower.equals("present") || lower.equals("current") || lower.contains("till date")) {
            return LocalDate.now();
        }

        return parseDate(dateStr);
    }

    /**
     * Normalize date string for parsing
     */
    private String normalizeDate(String dateStr) {
        return dateStr.trim()
                .replaceAll("\\s+", " ")
                .replaceAll("\\.", "");
    }

    /**
     * Validate experience value
     */
    public boolean isValidExperience(Double experience) {
        return experience != null && experience >= 0 && experience <= 50;
    }
}
