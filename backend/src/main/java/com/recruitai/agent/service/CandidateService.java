package com.recruitai.agent.service;

import com.recruitai.agent.entity.Candidate;
import com.recruitai.agent.repository.CandidateRepository;
import com.recruitai.agent.repository.JobApplicationRepository;
import com.recruitai.agent.repository.SkillMatrixRepository;
import com.recruitai.agent.repository.ResumeRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.annotation.PostConstruct;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class CandidateService {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(CandidateService.class);

    @Autowired
    private CandidateRepository candidateRepository;

    @Autowired
    private JobApplicationRepository applicationRepository;

    @Autowired
    private SkillMatrixRepository skillMatrixRepository;

    @Autowired
    private ResumeRepository resumeRepository;

    @Autowired
    private com.recruitai.agent.repository.InterviewRepository interviewRepository;
    
    @PostConstruct
    public void init() {
        log.info("🔍 STARTING CANDIDATE ID BACKFILL CHECK...");
        fixMissingSequenceIds();
    }

    public synchronized void fixMissingSequenceIds() {
        log.info("📊 Fetching all candidates to check for missing or duplicate sequence IDs...");
        List<Candidate> all = candidateRepository.findAll();
        
        java.util.Set<Long> seenIds = new java.util.HashSet<>();
        List<Candidate> toFix = new java.util.ArrayList<>();
        long maxId = 0;

        for (Candidate c : all) {
            Long sid = c.getSequenceId();
            if (sid == null || seenIds.contains(sid)) {
                toFix.add(c);
            } else {
                seenIds.add(sid);
                if (sid > maxId) maxId = sid;
            }
        }
            
        log.info("📊 Total candidates: {}, Candidates to fix: {}", all.size(), toFix.size());
        if (toFix.isEmpty()) return;

        long nextId = maxId + 1;
        
        log.info("🔢 Starting re-assignment from ID: {}", nextId);

        for (Candidate c : toFix) {
            c.setSequenceId(nextId++);
            candidateRepository.save(c);
        }
        log.info("✅ ID RESOLUTION COMPLETED. Total processed: {}", toFix.size());
    }

    // ✅ CREATE (COLLECTION WILL BE CREATED HERE)
    public Candidate createCandidate(Candidate candidate) {
        // STRICT DUPLICATE CHECK: Global Email Uniqueness
        if (candidateRepository.existsByEmail(candidate.getEmail())) {
            throw new RuntimeException(
                    "Candidate with email " + candidate.getEmail() + " already exists in the system.");
        }
        candidate.setCreatedAt(LocalDateTime.now());
        
        // Auto-increment sequenceId
        long nextId = 1;
        Optional<Candidate> top = candidateRepository.findTopByOrderBySequenceIdDesc();
        if (top.isPresent() && top.get().getSequenceId() != null) {
            nextId = top.get().getSequenceId() + 1;
        }
        candidate.setSequenceId(nextId);

        return candidateRepository.save(candidate);
    }

    // ✅ READ
    public Optional<Candidate> getCandidateById(String id) {
        return candidateRepository.findById(id);
    }

    public Optional<Candidate> getCandidateByEmail(String email) {
        return candidateRepository.findByEmail(email);
    }

    public Page<Candidate> getAllCandidates(Pageable pageable) {
        return candidateRepository.findAll(pageable);
    }

    public Page<Candidate> getCandidatesByStatus(String status, Pageable pageable) {
        return candidateRepository.findByStatus(status, pageable);
    }

    public Page<Candidate> searchCandidates(String search, Pageable pageable) {
        return candidateRepository.searchCandidates(search, pageable);
    }

    public List<Candidate> getCandidatesByExperience(Double minYears) {
        return candidateRepository.findByExperienceGreaterThanEqual(minYears);
    }

    public List<Candidate> getCandidatesBySkills(String skill) {
        return candidateRepository.findBySkillsContaining(skill);
    }

    // ✅ UPDATE
    public Candidate updateCandidate(String id, Candidate candidateDetails) {
        return candidateRepository.findById(id)
                .map(candidate -> {

                    if (!candidate.getEmail().equals(candidateDetails.getEmail())
                            && candidateRepository.existsByEmail(candidateDetails.getEmail())) {
                        throw new RuntimeException(
                                "Candidate with email " + candidateDetails.getEmail() + " already exists");
                    }

                    candidate.setName(candidateDetails.getName());
                    candidate.setEmail(candidateDetails.getEmail());
                    candidate.setRole(candidateDetails.getRole());
                    candidate.setPhone(candidateDetails.getPhone());
                    candidate.setSkills(candidateDetails.getSkills());
                    candidate.setExperience(candidateDetails.getExperience());
                    candidate.setFitScore(candidateDetails.getFitScore());
                    candidate.setResumeId(candidateDetails.getResumeId());
                    candidate.setAvatar(candidateDetails.getAvatar());
                    candidate.setStatus(candidateDetails.getStatus());

                    // Update Interview Fields
                    candidate.setInterviewDate(candidateDetails.getInterviewDate());
                    candidate.setInterviewTime(candidateDetails.getInterviewTime());
                    candidate.setInterviewType(candidateDetails.getInterviewType());
                    candidate.setInterviewNotes(candidateDetails.getInterviewNotes());
                    candidate.setInterviewMeetingLink(candidateDetails.getInterviewMeetingLink());
                    candidate.setRejectionReason(candidateDetails.getRejectionReason());
                    candidate.setInterviewRound(candidateDetails.getInterviewRound());
                    candidate.setRoundStatus(candidateDetails.getRoundStatus());

                    candidate.setCurrentOrganization(candidateDetails.getCurrentOrganization());
                    candidate.setNoticePeriod(candidateDetails.getNoticePeriod());
                    candidate.setPostalCode(candidateDetails.getPostalCode());
                    candidate.setCurrentEmploymentStatus(candidateDetails.getCurrentEmploymentStatus());
                    candidate.setLanguageSkills(candidateDetails.getLanguageSkills());
                    candidate.setCurrentSalary(candidateDetails.getCurrentSalary());
                    candidate.setSalaryExpectation(candidateDetails.getSalaryExpectation());
                    candidate.setRelevantExperience(candidateDetails.getRelevantExperience());
                    candidate.setCountry(candidateDetails.getCountry());
                    candidate.setAvailableFrom(candidateDetails.getAvailableFrom());
                    candidate.setSalaryType(candidateDetails.getSalaryType());
                    candidate.setLocality(candidateDetails.getLocality());
                    candidate.setWillingToRelocate(candidateDetails.isWillingToRelocate());
                    candidate.setSummary(candidateDetails.getSummary());
                    candidate.setHotlist(candidateDetails.getHotlist());
                    candidate.setAssignedBy(candidateDetails.getAssignedBy());
                    candidate.setAssignedTo(candidateDetails.getAssignedTo());
                    candidate.setUploadedBy(candidateDetails.getUploadedBy());
                    
                    candidate.setJapaneseLanguageProficiency(candidateDetails.getJapaneseLanguageProficiency());
                    candidate.setVisaType(candidateDetails.getVisaType());
                    candidate.setVisaValidity(candidateDetails.getVisaValidity());
                    candidate.setReasonForChange(candidateDetails.getReasonForChange());
                    candidate.setRecentlyAppliedCompanies(candidateDetails.getRecentlyAppliedCompanies());

                    candidate.setUpdatedAt(LocalDateTime.now());

                    return candidateRepository.save(candidate);
                })
                .orElseThrow(() -> new RuntimeException("Candidate not found with id: " + id));
    }

    public Candidate updateCandidateStatus(String id, String status) {
        return candidateRepository.findById(id)
                .map(candidate -> {
                    candidate.setStatus(status);
                    candidate.setUpdatedAt(LocalDateTime.now());
                    return candidateRepository.save(candidate);
                })
                .orElseThrow(() -> new RuntimeException("Candidate not found with id: " + id));
    }

    // ✅ DELETE (CASCADE STYLE)
    public void deleteCandidate(String id) {
        Candidate candidate = candidateRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Candidate not found with id: " + id));

        applicationRepository.deleteByCandidateId(id);
        skillMatrixRepository.deleteByCandidateId(id);
        interviewRepository.deleteByCandidateId(id);

        if (candidate.getResumeId() != null) {
            resumeRepository.deleteById(candidate.getResumeId());
        }

        candidateRepository.deleteById(id);
    }

    // ✅ COUNTS
    public long getTotalCandidatesCount() {
        return candidateRepository.count();
    }

    public long getCandidatesCountByStatus(String status) {
        return candidateRepository.countByStatus(status);
    }

    public List<Candidate> getAllActiveCandidates() {
        return candidateRepository.findByStatus("New");
    }

    public long getCandidatesCreatedSince(LocalDateTime date) {
        return candidateRepository.countByCreatedAtAfter(date);
    }

    public List<Candidate> getCandidatesByJobId(String jobId) {
        return candidateRepository.findByJobId(jobId);
    }

    public long getCandidatesCountByStatusIn(List<String> statuses) {
        return candidateRepository.countByStatusIn(statuses);
    }

    public java.util.Map<String, Long> getDailyCandidateCounts(int days) {
        LocalDateTime startDate = LocalDateTime.now().minusDays(days);
        List<Candidate> candidates = candidateRepository.findByCreatedAtAfter(startDate);

        java.util.Map<String, Long> counts = new java.util.LinkedHashMap<>();

        // Initialize map with all dates
        for (int i = days - 1; i >= 0; i--) {
            String date = LocalDateTime.now().minusDays(i).toLocalDate().toString();
            counts.put(date, 0L);
        }

        // Fill with actual counts
        for (Candidate c : candidates) {
            if (c.getCreatedAt() != null) {
                String date = c.getCreatedAt().toLocalDate().toString();
                counts.put(date, counts.getOrDefault(date, 0L) + 1);
            }
        }
        return counts;
    }
}
