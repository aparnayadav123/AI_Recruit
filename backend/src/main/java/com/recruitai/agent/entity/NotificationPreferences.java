package com.recruitai.agent.entity;

public class NotificationPreferences {
    private boolean newApplications = true;
    private boolean interviewReminders = true;
    private boolean weeklyReports = true;
    private boolean teamMentions = true;

    public NotificationPreferences() {
    }

    public boolean isNewApplications() {
        return newApplications;
    }

    public void setNewApplications(boolean newApplications) {
        this.newApplications = newApplications;
    }

    public boolean isInterviewReminders() {
        return interviewReminders;
    }

    public void setInterviewReminders(boolean interviewReminders) {
        this.interviewReminders = interviewReminders;
    }

    public boolean isWeeklyReports() {
        return weeklyReports;
    }

    public void setWeeklyReports(boolean weeklyReports) {
        this.weeklyReports = weeklyReports;
    }

    public boolean isTeamMentions() {
        return teamMentions;
    }

    public void setTeamMentions(boolean teamMentions) {
        this.teamMentions = teamMentions;
    }
}
