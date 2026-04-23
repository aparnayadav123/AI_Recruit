package com.recruitai.agent.ats.model;

public class AtsRequest {
    private String source;
    private String jobId;
    private String filterKeywords;
    private boolean autoParse;

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public String getJobId() {
        return jobId;
    }

    public void setJobId(String jobId) {
        this.jobId = jobId;
    }

    public String getFilterKeywords() {
        return filterKeywords;
    }

    public void setFilterKeywords(String filterKeywords) {
        this.filterKeywords = filterKeywords;
    }

    public boolean isAutoParse() {
        return autoParse;
    }

    public void setAutoParse(boolean autoParse) {
        this.autoParse = autoParse;
    }
}
