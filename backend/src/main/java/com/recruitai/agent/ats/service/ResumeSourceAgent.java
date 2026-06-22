package com.recruitai.agent.ats.service;

import com.recruitai.agent.ats.model.ResumeSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class ResumeSourceAgent {
    private static final Logger logger = LoggerFactory.getLogger(ResumeSourceAgent.class);

    public void fetchResumes(ResumeSource source, String jobId) {
        switch (source) {
            case LINKEDIN:
                logger.info("Agent connecting to LinkedIn Recruiter...");
                break;
            case NAUKRI:
                logger.info("Agent logging into Naukri Portal...");
                break;
            case EMAIL:
                logger.info("Agent checking Inbox for 'Resume' or 'CV'...");
                break;
            case UPLOAD:
                logger.info("Processing manual uploads...");
                break;
            default:
                logger.info("Agent: Source {} not fully implemented in mock.", source);
        }
    }
}
