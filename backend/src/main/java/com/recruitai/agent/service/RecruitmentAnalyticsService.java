package com.recruitai.agent.service;

import com.recruitai.agent.entity.JobApplication;
import com.recruitai.agent.entity.JobApplication.ApplicationStatus;
import com.recruitai.agent.repository.JobApplicationRepository;
import com.recruitai.agent.repository.JobRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Reports & Analytics — recruitment funnel metrics computed from the (additive) application
 * records. Read-only; does not affect any existing data or behavior.
 */
@Service
public class RecruitmentAnalyticsService {

    @Autowired
    private JobRepository jobRepository;
    @Autowired
    private JobApplicationRepository applicationRepository;

    public Map<String, Object> getOverview() {
        Map<String, Object> out = new LinkedHashMap<>();

        List<JobApplication> apps = new ArrayList<>(applicationRepository.findAll());
        apps.removeIf(JobApplication::isDeleted);
        long total = apps.size();

        long interviewed = apps.stream().filter(this::reachedInterview).count();
        long hired = apps.stream().filter(a -> a.getStatus() == ApplicationStatus.HIRED).count();
        long rejected = apps.stream().filter(a -> a.getStatus() == ApplicationStatus.REJECTED).count();

        out.put("totalJobs", jobRepository.count());
        out.put("totalApplications", total);
        out.put("interviewConversionRate", pct(interviewed, total));
        out.put("hiringConversionRate", pct(hired, total));
        out.put("rejectionRate", pct(rejected, total));
        out.put("interviewed", interviewed);
        out.put("hired", hired);
        out.put("rejected", rejected);
        out.put("avgTimeToHireDays", avgTimeToHireDays(apps));
        out.put("sourceAnalysis", sourceAnalysis(apps));
        out.put("departmentHiring", departmentHiring(apps));
        out.put("rejectionReasons", rejectionReasons(apps));
        return out;
    }

    private boolean reachedInterview(JobApplication a) {
        ApplicationStatus s = a.getStatus();
        if (s == ApplicationStatus.UNDER_REVIEW || s == ApplicationStatus.SHORTLISTED
                || s == ApplicationStatus.HIRED) {
            return true;
        }
        return a.getStages() != null && a.getStages().stream()
                .anyMatch(st -> st.getOutcome() != null && !"PENDING".equalsIgnoreCase(st.getOutcome()));
    }

    private double pct(long part, long whole) {
        if (whole <= 0) {
            return 0.0;
        }
        return Math.round((part * 1000.0) / whole) / 10.0;
    }

    private double avgTimeToHireDays(List<JobApplication> apps) {
        long count = 0;
        long totalDays = 0;
        for (JobApplication a : apps) {
            if (a.getStatus() == ApplicationStatus.HIRED && a.getAppliedDate() != null && a.getHiredDate() != null) {
                long days = Duration.between(a.getAppliedDate(), a.getHiredDate()).toDays();
                if (days >= 0) {
                    totalDays += days;
                    count++;
                }
            }
        }
        return count == 0 ? 0.0 : Math.round((totalDays * 10.0) / count) / 10.0;
    }

    private Map<String, Long> sourceAnalysis(List<JobApplication> apps) {
        Map<String, Long> m = new LinkedHashMap<>();
        for (JobApplication a : apps) {
            String src = (a.getSource() == null || a.getSource().isBlank()) ? "Unknown" : a.getSource();
            m.merge(src, 1L, Long::sum);
        }
        return m;
    }

    private Map<String, Long> departmentHiring(List<JobApplication> apps) {
        Map<String, String> jobDept = new HashMap<>();
        jobRepository.findAll().forEach(j -> jobDept.put(j.getId(),
                j.getDepartment() == null || j.getDepartment().isBlank() ? "General" : j.getDepartment()));

        Map<String, Long> m = new LinkedHashMap<>();
        for (JobApplication a : apps) {
            if (a.getStatus() == ApplicationStatus.HIRED) {
                String dept = jobDept.getOrDefault(a.getJobId(), "General");
                m.merge(dept, 1L, Long::sum);
            }
        }
        return m;
    }

    private Map<String, Long> rejectionReasons(List<JobApplication> apps) {
        Map<String, Long> m = new LinkedHashMap<>();
        for (JobApplication a : apps) {
            if (a.getStatus() == ApplicationStatus.REJECTED) {
                String reason = (a.getRejectionReason() == null || a.getRejectionReason().isBlank())
                        ? "Not recorded" : a.getRejectionReason();
                m.merge(reason, 1L, Long::sum);
            }
        }
        return m;
    }
}
