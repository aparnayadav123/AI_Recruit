package com.recruitai.agent.controller;

import com.recruitai.agent.dto.CandidateDto;
import com.recruitai.agent.entity.Candidate;
import com.recruitai.agent.service.CandidateService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/candidates")
public class CandidateController {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(CandidateController.class);

    @Autowired
    private CandidateService candidateService;

    @Autowired
    private com.recruitai.agent.repository.CandidateRepository candidateRepository;

    @Autowired
    private com.recruitai.agent.service.EmailService emailService;

    @Autowired
    private com.recruitai.agent.ats.service.GeminiAgentService geminiService;

    @Autowired
    private com.recruitai.agent.service.InterviewService interviewService;

    // ---------------- CREATE ----------------
    @PostMapping
    public ResponseEntity<?> createCandidate(@Valid @RequestBody CandidateDto candidateDto,
            org.springframework.validation.BindingResult bindingResult) {
        if (bindingResult.hasErrors()) {
            List<String> errors = bindingResult.getFieldErrors().stream()
                    .map(error -> error.getField() + ": " + error.getDefaultMessage())
                    .collect(Collectors.toList());
            log.error("Validation failed for candidate creation: {}", errors);
            return ResponseEntity.badRequest().body(Map.of("message", "Validation failed", "errors", errors));
        }

        log.debug("Received request to create candidate: {}", candidateDto.getName());
        try {
            Candidate candidate = convertToEntity(candidateDto);
            Candidate createdCandidate = candidateService.createCandidate(candidate);
            return ResponseEntity.status(HttpStatus.CREATED).body(convertToDto(createdCandidate));
        } catch (Exception e) {
            log.error("Error creating candidate: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Error creating candidate", "error", e.getMessage()));
        }
    }

    // ---------------- GET BY ID ----------------
    @GetMapping("/{id}")
    public ResponseEntity<CandidateDto> getCandidate(@PathVariable String id) {
        Optional<Candidate> candidate = candidateService.getCandidateById(id);
        return candidate.map(c -> ResponseEntity.ok(convertToDto(c)))
                .orElse(ResponseEntity.notFound().build());
    }

    // ---------------- GET ALL (PAGINATED) ----------------
    @GetMapping
    public ResponseEntity<Page<CandidateDto>> getAllCandidates(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        Pageable pageable = PageRequest.of(page, size);
        Page<Candidate> candidates = candidateService.getAllCandidates(pageable);
        return ResponseEntity.ok(candidates.map(this::convertToDto));
    }

    // ---------------- FILTERS ----------------
    @GetMapping("/status/{status}")
    public ResponseEntity<Page<CandidateDto>> getCandidatesByStatus(
            @PathVariable String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        Pageable pageable = PageRequest.of(page, size);
        Page<Candidate> candidates = candidateService.getCandidatesByStatus(status, pageable);
        return ResponseEntity.ok(candidates.map(this::convertToDto));
    }

    @GetMapping("/job/{jobId}")
    public ResponseEntity<List<CandidateDto>> getCandidatesByJob(@PathVariable String jobId) {
        return ResponseEntity.ok(
                candidateService.getCandidatesByJobId(jobId)
                        .stream()
                        .map(this::convertToDto)
                        .collect(Collectors.toList()));
    }

    @GetMapping("/search")
    public ResponseEntity<Page<CandidateDto>> searchCandidates(
            @RequestParam String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        Pageable pageable = PageRequest.of(page, size);
        Page<Candidate> candidates = candidateService.searchCandidates(search, pageable);
        return ResponseEntity.ok(candidates.map(this::convertToDto));
    }

    @GetMapping("/experience/{minYears}")
    public ResponseEntity<List<CandidateDto>> getCandidatesByExperience(@PathVariable Double minYears) {
        return ResponseEntity.ok(
                candidateService.getCandidatesByExperience(minYears)
                        .stream()
                        .map(this::convertToDto)
                        .collect(Collectors.toList()));
    }

    @GetMapping("/skills/{skill}")
    public ResponseEntity<List<CandidateDto>> getCandidatesBySkills(@PathVariable String skill) {
        return ResponseEntity.ok(
                candidateService.getCandidatesBySkills(skill)
                        .stream()
                        .map(this::convertToDto)
                        .collect(Collectors.toList()));
    }

    // ---------------- UPDATE ----------------
    @PutMapping("/{id}")
    public ResponseEntity<CandidateDto> updateCandidate(
            @PathVariable String id,
            @Valid @RequestBody CandidateDto candidateDto) {

        Candidate updatedCandidate = candidateService.updateCandidate(id, convertToEntity(candidateDto));
        return ResponseEntity.ok(convertToDto(updatedCandidate));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<CandidateDto> updateCandidateStatus(
            @PathVariable String id,
            @RequestParam String status) {

        Candidate updatedCandidate = candidateService.updateCandidateStatus(id, status);
        return ResponseEntity.ok(convertToDto(updatedCandidate));
    }

    @PatchMapping("/{id}/assign-job")
    public ResponseEntity<CandidateDto> assignJob(
            @PathVariable String id,
            @RequestParam String jobId,
            @RequestParam String role,
            @RequestParam(required = false) String jobAssignedBy) {

        Candidate candidate = candidateRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Candidate not found"));
        candidate.setJobId(jobId);
        // candidate.setRole(role); // STOP overwriting original role
        candidate.setAssignedTo(role); // Use assignedTo for the job title
        if (jobAssignedBy != null) {
            candidate.setJobAssignedBy(jobAssignedBy);
            candidate.setAssignedBy(jobAssignedBy); // Use assignedBy for the assigner name per requirement
        }
        candidate.setUpdatedAt(LocalDateTime.now());
        Candidate updatedCandidate = candidateRepository.save(candidate);

        return ResponseEntity.ok(convertToDto(updatedCandidate));
    }

    // ---------------- DELETE ----------------
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCandidate(@PathVariable String id) {
        candidateService.deleteCandidate(id);
        return ResponseEntity.noContent().build();
    }

    // ---------------- STATISTICS (MAP BASED – FIXED) ----------------
    // ---------------- STATISTICS (MAP BASED – FIXED) ----------------
    @PostMapping("/{id}/send-offer")
    public ResponseEntity<java.util.Map<String, String>> sendOfferLetter(@PathVariable String id) {
        Candidate candidate = candidateRepository.findById(id).orElse(null);
        if (candidate == null) {
            return ResponseEntity.notFound().build();
        }

        String jobTitle = candidate.getRole();

        String subject = "Job Offer: " + jobTitle + " at RecruitAI";
        String body = "Dear " + candidate.getName() + ",\n\n" +
                "We are delighted to move forward and offer you the position of " + jobTitle + " at RecruitAI!\n\n" +
                "We were very impressed with your skills and experience, and we believe you will be a valuable addition to our team.\n\n"
                +
                "Next Steps:\n" +
                "1. Please review this offer.\n" +
                "2. Reply to this email to confirm your acceptance.\n" +
                "3. We will send the formal contract shortly.\n\n" +
                "We look forward to having you on board!\n\n" +
                "Best Regards,\n" +
                "RecruitAI Hiring Team";

        emailService.sendSimpleMessage(candidate.getEmail(), subject, body);

        // Update status to Offer
        candidate.setStatus("Offer");
        candidateRepository.save(candidate);

        return ResponseEntity.ok(java.util.Map.of("message", "Offer letter sent to " + candidate.getEmail()));
    }

    @PostMapping("/{id}/request-update")
    public ResponseEntity<java.util.Map<String, String>> requestProfileUpdate(@PathVariable String id) {
        Candidate candidate = candidateRepository.findById(id).orElse(null);
        if (candidate == null) {
            return ResponseEntity.notFound().build();
        }

        String subject = "Action Required: Update Your Profile - RecruitAI";
        String body = "Dear " + candidate.getName() + ",\n\n" +
                "We are currently reviewing your profile for several exciting opportunities at RecruitAI.\n\n" +
                "To help us make the best match, could you please provide us with your most recent resume and update your professional details?\n\n"
                +
                "You can reply to this email with your updated CV or click the link below to update your profile on our portal.\n\n"
                +
                "Best Regards,\n" +
                "RecruitAI Talent Acquisition Team";

        emailService.sendSimpleMessage(candidate.getEmail(), subject, body);

        return ResponseEntity.ok(java.util.Map.of("message", "Profile update request sent to " + candidate.getEmail()));
    }

    @GetMapping("/statistics")
    public ResponseEntity<Map<String, Long>> getCandidateStatistics() {

        Map<String, Long> stats = new HashMap<>();

        try {
            stats.put("total", candidateService.getTotalCandidatesCount());
        } catch (Exception e) {
            stats.put("total", 0L);
        }

        try {
            // Active candidates are those in progress (not Hired or Rejected)
            stats.put("active", candidateService.getCandidatesCountByStatusIn(
                    List.of("New", "Screening", "Shortlisted", "Interview", "Offer")));

            // Pipeline Stages
            // Screening includes both New and Screening status
            stats.put("screening", candidateService.getCandidatesCountByStatusIn(List.of("New", "Screening")));

            stats.put("shortlisted", candidateService.getCandidatesCountByStatus("Shortlisted"));
            stats.put("interview", candidateService.getCandidatesCountByStatus("Interview"));
            stats.put("offer", candidateService.getCandidatesCountByStatus("Offer"));
            stats.put("hired", candidateService.getCandidatesCountByStatus("Hired"));
            stats.put("rejected", candidateService.getCandidatesCountByStatus("Rejected"));

        } catch (Exception e) {
            System.err.println("Error fetching candidate stats: " + e.getMessage());
            // Fallback to 0 if error
            stats.put("active", 0L);
            stats.put("screening", 0L);
            stats.put("shortlisted", 0L);
            stats.put("interview", 0L);
            stats.put("offer", 0L);
            stats.put("hired", 0L);
            stats.put("rejected", 0L);
        }

        try {
            stats.put("resumesToday", candidateService.getCandidatesCreatedSince(LocalDate.now().atStartOfDay()));
        } catch (Exception e) {
            stats.put("resumesToday", 0L);
        }
        
        // Add Interview stats for Dashboard
        try {
            Map<String, Long> interviewStats = interviewService.getInterviewStatistics();
            stats.put("upcomingInterviews", interviewStats.getOrDefault("upcoming", 0L));
            stats.put("completedInterviews", interviewStats.getOrDefault("completed", 0L));
            stats.put("cancelledInterviews", interviewStats.getOrDefault("cancelled", 0L));
            stats.put("rescheduledInterviews", interviewStats.getOrDefault("rescheduled", 0L));
        } catch (Exception e) {
            log.error("Error fetching interview stats for dashboard: {}", e.getMessage());
        }

        return ResponseEntity.ok(stats);
    }

    @GetMapping("/trends")
    public ResponseEntity<Map<String, Long>> getCandidateTrends(@RequestParam(defaultValue = "7") int days) {
        return ResponseEntity.ok(candidateService.getDailyCandidateCounts(days));
    }

    // ---------------- MAPPERS ----------------
    private Candidate convertToEntity(CandidateDto dto) {
        Candidate candidate = new Candidate();
        candidate.setId(dto.getId());
        candidate.setSequenceId(dto.getSequenceId());
        candidate.setName(dto.getName());
        candidate.setEmail(dto.getEmail());
        candidate.setRole(dto.getRole());
        candidate.setPhone(dto.getPhone());
        candidate.setSkills(dto.getSkills());
        candidate.setExperience(dto.getExperience());
        candidate.setFitScore(dto.getFitScore());
        candidate.setResumeId(dto.getResumeId());
        candidate.setAvatar(dto.getAvatar());
        candidate.setStatus(dto.getStatus() != null ? dto.getStatus() : "New");
        candidate.setSource(dto.getSource());
        candidate.setJobId(dto.getJobId());
        candidate.setRejectionReason(dto.getRejectionReason());
        candidate.setInterviewDate(dto.getInterviewDate());
        candidate.setInterviewTime(dto.getInterviewTime());
        candidate.setInterviewType(dto.getInterviewType());
        candidate.setInterviewNotes(dto.getInterviewNotes());
        candidate.setInterviewMeetingLink(dto.getInterviewMeetingLink());
        candidate.setInterviewRound(dto.getInterviewRound());
        candidate.setRoundStatus(dto.getRoundStatus());
        candidate.setEducation(dto.getEducation());
        candidate.setIndustry(dto.getIndustry());
        candidate.setMatchReason(dto.getMatchReason());
        candidate.setCurrentOrganization(dto.getCurrentOrganization());
        candidate.setNoticePeriod(dto.getNoticePeriod());
        candidate.setPostalCode(dto.getPostalCode());
        candidate.setCurrentEmploymentStatus(dto.getCurrentEmploymentStatus());
        candidate.setLanguageSkills(dto.getLanguageSkills());
        candidate.setCurrentSalary(dto.getCurrentSalary());
        candidate.setSalaryExpectation(dto.getSalaryExpectation());
        candidate.setRelevantExperience(dto.getRelevantExperience());
        candidate.setCountry(dto.getCountry());
        candidate.setAvailableFrom(dto.getAvailableFrom());
        candidate.setSalaryType(dto.getSalaryType());
        candidate.setLocality(dto.getLocality());
        candidate.setWillingToRelocate(dto.isWillingToRelocate());
        candidate.setSummary(dto.getSummary());
        candidate.setHotlist(dto.getHotlist());
        candidate.setAssignedBy(dto.getAssignedBy());
        candidate.setJobAssignedBy(dto.getJobAssignedBy());
        candidate.setAssignedTo(dto.getAssignedTo());
        candidate.setUploadedBy(dto.getUploadedBy());
        candidate.setJapaneseLanguageProficiency(dto.getJapaneseLanguageProficiency());
        candidate.setVisaType(dto.getVisaType());
        candidate.setVisaValidity(dto.getVisaValidity());
        candidate.setReasonForChange(dto.getReasonForChange());
        candidate.setRecentlyAppliedCompanies(dto.getRecentlyAppliedCompanies());
        return candidate;
    }

    private CandidateDto convertToDto(Candidate candidate) {
        CandidateDto dto = new CandidateDto();
        dto.setId(candidate.getId());
        dto.setSequenceId(candidate.getSequenceId());
        dto.setName(candidate.getName());
        dto.setEmail(candidate.getEmail());
        dto.setRole(candidate.getRole());
        dto.setPhone(candidate.getPhone());
        dto.setSkills(candidate.getSkills());
        dto.setExperience(candidate.getExperience());
        dto.setFitScore(candidate.getFitScore());
        dto.setResumeId(candidate.getResumeId());
        dto.setAvatar(candidate.getAvatar());
        dto.setStatus(candidate.getStatus());
        dto.setEducation(candidate.getEducation());
        dto.setIndustry(candidate.getIndustry());
        dto.setSource(candidate.getSource());
        dto.setJobId(candidate.getJobId());
        dto.setRejectionReason(candidate.getRejectionReason());
        dto.setInterviewDate(candidate.getInterviewDate());
        dto.setInterviewTime(candidate.getInterviewTime());
        dto.setInterviewType(candidate.getInterviewType());
        dto.setInterviewNotes(candidate.getInterviewNotes());
        dto.setInterviewMeetingLink(candidate.getInterviewMeetingLink());
        dto.setInterviewRound(candidate.getInterviewRound());
        dto.setRoundStatus(candidate.getRoundStatus());
        dto.setMatchReason(candidate.getMatchReason());

        dto.setCurrentOrganization(candidate.getCurrentOrganization());
        dto.setNoticePeriod(candidate.getNoticePeriod());
        dto.setPostalCode(candidate.getPostalCode());
        dto.setCurrentEmploymentStatus(candidate.getCurrentEmploymentStatus());
        dto.setLanguageSkills(candidate.getLanguageSkills());
        dto.setCurrentSalary(candidate.getCurrentSalary());
        dto.setSalaryExpectation(candidate.getSalaryExpectation());
        dto.setRelevantExperience(candidate.getRelevantExperience());
        dto.setCountry(candidate.getCountry());
        dto.setAvailableFrom(candidate.getAvailableFrom());
        dto.setSalaryType(candidate.getSalaryType());
        dto.setLocality(candidate.getLocality());
        dto.setWillingToRelocate(candidate.isWillingToRelocate());
        dto.setSummary(candidate.getSummary());
        dto.setHotlist(candidate.getHotlist());
        dto.setAssignedBy(candidate.getAssignedBy());
        dto.setJobAssignedBy(candidate.getJobAssignedBy());
        dto.setAssignedTo(candidate.getAssignedTo());
        dto.setUploadedBy(candidate.getUploadedBy());
        dto.setJapaneseLanguageProficiency(candidate.getJapaneseLanguageProficiency());
        dto.setVisaType(candidate.getVisaType());
        dto.setVisaValidity(candidate.getVisaValidity());
        dto.setReasonForChange(candidate.getReasonForChange());
        dto.setRecentlyAppliedCompanies(candidate.getRecentlyAppliedCompanies());

        // Map createdAt to appliedDate
        if (candidate.getCreatedAt() != null) {
            dto.setAppliedDate(candidate.getCreatedAt().toLocalDate().toString());
        }
        return dto;
    }

    @GetMapping("/history")
    public ResponseEntity<List<CandidateDto>> getCandidateHistory(@RequestParam String email) {
        List<Candidate> candidates = candidateRepository.findAllByEmail(email);
        List<CandidateDto> dtos = candidates.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @PostMapping("/{id}/generate-linkedin-reply")
    public ResponseEntity<Map<String, String>> generateLinkedInReply(@PathVariable String id, @RequestBody Map<String, String> body) {
        Candidate candidate = candidateRepository.findById(id).orElseThrow(() -> new RuntimeException("Candidate not found"));
        String recruiterMsg = body.get("message");
        
        String candidateSkills = candidate.getSkills() != null ? String.join(", ", candidate.getSkills()) : "Not available";
        
        String reply = geminiService.generateCandidateReply(
            candidate.getName(), 
            candidate.getRole(), 
            candidateSkills, 
            recruiterMsg
        );
        
        return ResponseEntity.ok(Map.of("reply", reply));
    }
}
