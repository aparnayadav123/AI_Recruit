package com.recruitai.agent.service;

import com.recruitai.agent.entity.Interview;
import com.recruitai.agent.entity.Candidate;
import com.recruitai.agent.repository.InterviewRepository;
import com.recruitai.agent.repository.CandidateRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class DatabaseSyncService {

    @Autowired
    private InterviewRepository interviewRepository;

    @Autowired
    private CandidateRepository candidateRepository;

    @PostConstruct
    public void syncData() {
        System.out.println("Starting Database Synchronization...");
        try {
            List<Interview> interviews = interviewRepository.findAll();
            int updatedCount = 0;

            for (Interview interview : interviews) {
                Candidate candidate = candidateRepository.findById(interview.getCandidateId()).orElse(null);

                if (candidate != null) {
                    boolean needsUpdate = false;

                    // Check if Candidate is missing interview data but has an interview needed
                    if (candidate.getInterviewDate() == null || candidate.getStatus().equals("New")) {
                        candidate.setStatus("Interview");

                        try {
                            java.time.LocalDateTime dt = interview.getStartTime();
                            if (dt != null) {
                                candidate.setInterviewDate(dt.toLocalDate().toString());
                                candidate.setInterviewTime(dt.toLocalTime().toString());
                            } else {
                                candidate.setInterviewDate("Unknown");
                            }
                        } catch (Exception e) {
                            candidate.setInterviewDate("Synced Date");
                        }

                        candidate.setInterviewType(interview.getType());
                        candidate.setInterviewNotes(interview.getNotes());
                        needsUpdate = true;
                    }

                    if (needsUpdate) {
                        candidateRepository.save(candidate);
                        updatedCount++;
                    }
                }
            }
            System.out.println(
                    "Database Sync Complete. Updated " + updatedCount + " candidates with missing interview data.");
        } catch (Exception e) {
            System.err.println("Database Sync Failed: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
