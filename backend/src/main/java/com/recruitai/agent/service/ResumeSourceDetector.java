package com.recruitai.agent.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Service to detect and validate resume source from metadata
 * Supports: Local System, Naukri, LinkedIn, Email, ATS
 */
@Service
public class ResumeSourceDetector {

    private static final Logger logger = LoggerFactory.getLogger(ResumeSourceDetector.class);

    public enum ResumeSource {
        LOCAL_SYSTEM("Local System"),
        NAUKRI("Naukri"),
        LINKEDIN("LinkedIn"),
        EMAIL("Email"),
        ATS("ATS"),
        UNKNOWN("Unknown");

        private final String displayName;

        ResumeSource(String displayName) {
            this.displayName = displayName;
        }

        public String getDisplayName() {
            return displayName;
        }
    }

    /**
     * Detect resume source from metadata string
     * 
     * @param sourceMetadata Source identifier from upload
     * @return Standardized resume source
     */
    public ResumeSource detectSource(String sourceMetadata) {
        if (sourceMetadata == null || sourceMetadata.trim().isEmpty()) {
            logger.debug("No source metadata provided - defaulting to LOCAL_SYSTEM");
            return ResumeSource.LOCAL_SYSTEM;
        }

        String normalized = sourceMetadata.trim().toLowerCase();

        // Map various input formats to standardized sources
        if (normalized.contains("naukri") || normalized.equals("naukri.com")) {
            logger.info("Detected resume source: Naukri");
            return ResumeSource.NAUKRI;
        } else if (normalized.contains("linkedin") || normalized.equals("linkedin.com")) {
            logger.info("Detected resume source: LinkedIn");
            return ResumeSource.LINKEDIN;
        } else if (normalized.contains("email") || normalized.contains("mail")) {
            logger.info("Detected resume source: Email");
            return ResumeSource.EMAIL;
        } else if (normalized.contains("ats") || normalized.equals("applicant tracking system")) {
            logger.info("Detected resume source: ATS");
            return ResumeSource.ATS;
        } else if (normalized.contains("local") || normalized.contains("upload") || normalized.contains("system")) {
            logger.info("Detected resume source: Local System");
            return ResumeSource.LOCAL_SYSTEM;
        } else {
            logger.warn("Unknown resume source: {} - defaulting to LOCAL_SYSTEM", sourceMetadata);
            return ResumeSource.LOCAL_SYSTEM;
        }
    }

    /**
     * Get display name for source
     */
    public String getSourceDisplayName(String sourceMetadata) {
        return detectSource(sourceMetadata).getDisplayName();
    }

    /**
     * Validate if source is from external platform
     */
    public boolean isExternalSource(String sourceMetadata) {
        ResumeSource source = detectSource(sourceMetadata);
        return source == ResumeSource.NAUKRI ||
                source == ResumeSource.LINKEDIN ||
                source == ResumeSource.EMAIL;
    }

    /**
     * Get source icon/badge identifier for frontend
     */
    public String getSourceIcon(String sourceMetadata) {
        ResumeSource source = detectSource(sourceMetadata);

        switch (source) {
            case NAUKRI:
                return "naukri-icon";
            case LINKEDIN:
                return "linkedin-icon";
            case EMAIL:
                return "email-icon";
            case ATS:
                return "ats-icon";
            case LOCAL_SYSTEM:
            default:
                return "upload-icon";
        }
    }
}
