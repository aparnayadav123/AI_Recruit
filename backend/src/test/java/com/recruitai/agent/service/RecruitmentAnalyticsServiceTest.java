package com.recruitai.agent.service;

import com.recruitai.agent.entity.InterviewStage;
import com.recruitai.agent.entity.JobApplication;
import com.recruitai.agent.entity.JobApplication.ApplicationStatus;
import com.recruitai.agent.repository.JobApplicationRepository;
import com.recruitai.agent.repository.JobRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.lenient;

/**
 * REP-001 — Reports, Analytics & Shortlist Report.
 *
 * Verifies that Interview / Hire / Rejection rates are computed exactly as
 * {@code count / total} from the underlying application records, and that a
 * candidate is only counted as "interviewed" once they progress past the
 * initial Screening step into a real interview round.
 *
 * Requirement: FR-701 (FR-36). Manual calc for the known dataset:
 *   Interview Rate = 4/10 = 40%,  Hire Rate = 0/10 = 0%,  Rejection Rate = 1/10 = 10%.
 */
@ExtendWith(MockitoExtension.class)
class RecruitmentAnalyticsServiceTest {

    @Mock
    private JobApplicationRepository applicationRepository;
    @Mock
    private JobRepository jobRepository;

    @InjectMocks
    private RecruitmentAnalyticsService service;

    // ---------------- helpers ----------------

    private static InterviewStage stage(String name, String outcome) {
        InterviewStage s = new InterviewStage(name);
        s.setOutcome(outcome);
        return s;
    }

    /** Application seeded with the given (already-outcomed) stages. */
    private static JobApplication app(ApplicationStatus status, InterviewStage... stages) {
        JobApplication a = new JobApplication("CAN-x", "JOB-x");
        a.setStatus(status);
        List<InterviewStage> list = new ArrayList<>();
        for (InterviewStage s : stages) {
            list.add(s);
        }
        a.setStages(list);
        return a;
    }

    /**
     * The REP-001 "known dataset": 10 applications, 4 reaching an interview round,
     * 0 hires, 1 rejection (rejected at screening — never interviewed).
     */
    private List<JobApplication> rep001Dataset() {
        List<JobApplication> apps = new ArrayList<>();

        // 4 apps that reached a real interview round (Tech Round 1 conducted).
        for (int i = 0; i < 4; i++) {
            apps.add(app(ApplicationStatus.UNDER_REVIEW,
                    stage("Screening", "PASS"),
                    stage("Tech Round 1", "PASS")));
        }

        // 1 app rejected during Screening — NOT an interview.
        JobApplication rejected = app(ApplicationStatus.REJECTED, stage("Screening", "FAIL"));
        rejected.setRejectionReason("Did not meet basic criteria");
        apps.add(rejected);

        // 2 apps still in resume review (Screening passed, no interview yet).
        for (int i = 0; i < 2; i++) {
            apps.add(app(ApplicationStatus.UNDER_REVIEW, stage("Screening", "PASS")));
        }

        // 3 apps freshly applied, no stages recorded.
        for (int i = 0; i < 3; i++) {
            apps.add(app(ApplicationStatus.PENDING));
        }

        return apps; // total = 10
    }

    // ---------------- tests ----------------

    @Test
    @DisplayName("REP-001: Interview=40%, Hire=0%, Rejection=10% — matches manual calculation")
    void rep001Rates() {
        lenient().when(applicationRepository.findAll()).thenReturn(rep001Dataset());
        lenient().when(jobRepository.findAll()).thenReturn(new ArrayList<>());
        lenient().when(jobRepository.count()).thenReturn(3L);

        Map<String, Object> overview = service.getOverview();

        assertThat(overview.get("totalApplications")).isEqualTo(10L);
        assertThat(overview.get("interviewed")).isEqualTo(4L);
        assertThat(overview.get("hired")).isEqualTo(0L);
        assertThat(overview.get("rejected")).isEqualTo(1L);

        // Rates == manual calculation exactly.
        assertThat(overview.get("interviewConversionRate")).isEqualTo(40.0);
        assertThat(overview.get("hiringConversionRate")).isEqualTo(0.0);
        assertThat(overview.get("rejectionRate")).isEqualTo(10.0);
    }

    @Test
    @DisplayName("Screening activity alone must NOT count as an interview")
    void screeningIsNotAnInterview() {
        List<JobApplication> apps = new ArrayList<>();
        apps.add(app(ApplicationStatus.UNDER_REVIEW, stage("Screening", "PASS"))); // screened only
        apps.add(app(ApplicationStatus.REJECTED, stage("Screening", "FAIL")));     // rejected at screening

        lenient().when(applicationRepository.findAll()).thenReturn(apps);
        lenient().when(jobRepository.findAll()).thenReturn(new ArrayList<>());
        lenient().when(jobRepository.count()).thenReturn(1L);

        Map<String, Object> overview = service.getOverview();

        assertThat(overview.get("interviewed")).isEqualTo(0L);
        assertThat(overview.get("interviewConversionRate")).isEqualTo(0.0);
    }

    @Test
    @DisplayName("A conducted interview round (or HIRED) counts as interviewed")
    void realRoundCounts() {
        List<JobApplication> apps = new ArrayList<>();
        apps.add(app(ApplicationStatus.UNDER_REVIEW, stage("Screening", "PASS"), stage("Manager Round", "HOLD")));
        apps.add(app(ApplicationStatus.HIRED, stage("Screening", "PASS"), stage("HR Round", "PASS")));

        lenient().when(applicationRepository.findAll()).thenReturn(apps);
        lenient().when(jobRepository.findAll()).thenReturn(new ArrayList<>());
        lenient().when(jobRepository.count()).thenReturn(1L);

        Map<String, Object> overview = service.getOverview();

        assertThat(overview.get("interviewed")).isEqualTo(2L);
        assertThat(overview.get("interviewConversionRate")).isEqualTo(100.0);
    }
}
