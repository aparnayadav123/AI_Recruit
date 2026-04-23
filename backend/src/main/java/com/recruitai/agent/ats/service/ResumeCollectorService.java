package com.recruitai.agent.ats.service;

import com.recruitai.agent.ats.model.ResumeSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class ResumeCollectorService {
    private static final Logger logger = LoggerFactory.getLogger(ResumeCollectorService.class);

    @Autowired
    private ResumeSourceAgent sourceAgent;

    public void collectFromSource(ResumeSource source, String jobId) {
        logger.info("Starting collection from source: {} for Job: {}", source, jobId);
        sourceAgent.fetchResumes(source, jobId);
    }
}
