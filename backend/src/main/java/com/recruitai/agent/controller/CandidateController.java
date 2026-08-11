package com.recruitai.agent.controller;

import com.recruitai.agent.dto.CandidateDto;
import com.recruitai.agent.entity.Candidate;
import com.recruitai.agent.service.CandidateService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
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

    @Autowired
    private com.recruitai.agent.service.SequenceService sequenceService;

    @Autowired
    private com.recruitai.agent.service.CandidateLifecycleService lifecycleService;

    @Autowired
    private com.recruitai.agent.repository.CandidateNoteRepository noteRepository;

    // ---------------- CANDIDATE NOTES (Call Discussion / Face-to-Face Meeting / …) ----------------
    @GetMapping("/{id}/notes")
    public ResponseEntity<?> getCandidateNotes(@PathVariable String id) {
        return ResponseEntity.ok(noteRepository.findByCandidateIdOrderByCreatedAtDesc(id));
    }

    @PostMapping("/{id}/notes")
    public ResponseEntity<?> addCandidateNote(@PathVariable String id,
            @RequestBody Map<String, Object> body) {
        if (!candidateRepository.existsById(id)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Candidate not found: " + id));
        }
        String message = body == null ? null : (String) body.get("message");
        if (message == null || message.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Note message is required."));
        }
        com.recruitai.agent.entity.CandidateNote note = new com.recruitai.agent.entity.CandidateNote();
        note.setCandidateId(id);
        note.setType(body.get("type") == null ? "Note" : (String) body.get("type"));
        note.setMessage(message.trim());
        note.setAuthor(body.get("author") == null ? "HR" : (String) body.get("author"));
        return ResponseEntity.status(201).body(noteRepository.save(note));
    }

    // ---------------- CANDIDATE HISTORY (Phase 1, read-only) ----------------
    // Full lifecycle for one candidate: profile + every application (across jobs/time) +
    // interview history + rejection/hire slices. Never deletes or mutates anything.
    @GetMapping("/{id}/history")
    public ResponseEntity<?> getCandidateHistory(@PathVariable String id) {
        if (!candidateRepository.existsById(id)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Candidate not found: " + id));
        }
        return ResponseEntity.ok(lifecycleService.getHistory(id));
    }

    // Reject with a structured reason + who (mirrors to the application + writes audit).
    @PostMapping("/{id}/reject")
    public ResponseEntity<?> rejectCandidate(@PathVariable String id,
            @RequestBody(required = false) Map<String, Object> body) {
        String reason = body == null ? null : (String) body.get("reason");
        String by = body == null ? null : (String) body.get("rejectedBy");
        return ResponseEntity.ok(candidateService.rejectCandidate(id, reason, by));
    }

    // Reconsideration: reopen (optionally reassign to a new job) + audit trail.
    @PostMapping("/{id}/reconsider")
    public ResponseEntity<?> reconsiderCandidate(@PathVariable String id,
            @RequestBody(required = false) Map<String, Object> body) {
        String jobId = body == null ? null : (String) body.get("jobId");
        String role = body == null ? null : (String) body.get("role");
        String by = body == null ? null : (String) body.get("by");
        return ResponseEntity.ok(candidateService.reconsiderCandidate(id, jobId, role, by));
    }

    @GetMapping("/{id}/audit")
    public ResponseEntity<?> getCandidateAudit(@PathVariable String id) {
        return ResponseEntity.ok(lifecycleService.getAudit(id));
    }

    // Block a fake / inappropriate candidate — permanently excluded from shortlisting.
    @PostMapping("/{id}/block")
    public ResponseEntity<?> blockCandidate(@PathVariable String id,
            @RequestBody(required = false) Map<String, Object> body) {
        String reason = body == null ? null : (String) body.get("reason");
        String by = body == null ? null : (String) body.get("by");
        return ResponseEntity.ok(candidateService.blockCandidate(id, reason, by));
    }

    @PostMapping("/{id}/unblock")
    public ResponseEntity<?> unblockCandidate(@PathVariable String id,
            @RequestBody(required = false) Map<String, Object> body) {
        String by = body == null ? null : (String) body.get("by");
        return ResponseEntity.ok(candidateService.unblockCandidate(id, by));
    }

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
        // No local catch-all here — let typed exceptions (DuplicateResourceException,
        // ResourceNotFoundException, IllegalArgumentException) bubble up to the
        // GlobalExceptionHandler which maps each to the correct HTTP status (409/404/400).
        Candidate candidate = convertToEntity(candidateDto);
        Candidate createdCandidate = candidateService.createCandidate(candidate);
        return ResponseEntity.status(HttpStatus.CREATED).body(convertToDto(createdCandidate));
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
            @RequestParam(defaultValue = "10") int size,
            // Honor the client's sort (e.g. the dashboard sends "createdAt,desc" so
            // Recent Activity shows the newest candidates first). This param was
            // previously ignored, so the feed returned candidates in Mongo's natural
            // insertion order — surfacing the OLDEST entries (typically the original
            // locally-uploaded ones) and hiding newer LinkedIn/Email candidates.
            // Candidate source is never filtered here: every candidate is eligible.
            @RequestParam(defaultValue = "createdAt,desc") String sort) {

        Pageable pageable = PageRequest.of(page, size, parseSort(sort));
        Page<Candidate> candidates = candidateService.getAllCandidates(pageable);
        return ResponseEntity.ok(candidates.map(this::convertToDto));
    }

    /**
     * Parse a "field,dir" sort string (e.g. "createdAt,desc") into a {@link Sort}.
     * Falls back to newest-first by createdAt when the value is missing or malformed.
     */
    private Sort parseSort(String sort) {
        if (sort == null || sort.isBlank()) {
            return Sort.by(Sort.Direction.DESC, "createdAt");
        }
        String[] parts = sort.split(",");
        String field = parts[0].trim();
        if (field.isEmpty()) {
            field = "createdAt";
        }
        Sort.Direction dir = (parts.length > 1 && "asc".equalsIgnoreCase(parts[1].trim()))
                ? Sort.Direction.ASC
                : Sort.Direction.DESC;
        return Sort.by(dir, field);
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

    // ---------------- UPDATE ----------------
    @PutMapping("/{id}")
    public ResponseEntity<CandidateDto> updateCandidate(
            @PathVariable String id,
            @Valid @RequestBody CandidateDto candidateDto) {

        Candidate updatedCandidate = candidateService.updateCandidate(id, convertToEntity(candidateDto));
        return ResponseEntity.ok(convertToDto(updatedCandidate));
    }

    @PostMapping("/renumber")
    public ResponseEntity<?> renumberAll() {
        return ResponseEntity.ok(sequenceService.renumberAllFromOne());
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<CandidateDto> updateCandidateStatus(
            @PathVariable String id,
            @RequestParam String status) {

        Candidate updatedCandidate = candidateService.updateCandidateStatus(id, status);
        return ResponseEntity.ok(convertToDto(updatedCandidate));
    }

    @PatchMapping("/{id}/assign-job")
    public ResponseEntity<CandidateDto> assignCandidateJob(
            @PathVariable String id,
            @RequestParam String jobId,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String jobAssignedBy) {

        Candidate updated = candidateService.assignJob(id, jobId, role, jobAssignedBy);
        return ResponseEntity.ok(convertToDto(updated));
    }

    /**
     * Re-run the ATS auto-match and fit-score formula across every candidate.
     * Useful after editing job requirements or importing new candidates.
     */
    @PostMapping("/rescore-all")
    public ResponseEntity<Map<String, Object>> rescoreAllCandidates() {
        int updated = candidateService.rescoreAllCandidates();
        return ResponseEntity.ok(Map.of(
                "updated", updated,
                "message", "Recomputed fit scores for " + updated + " candidate(s)"
        ));
    }

    /**
     * Aggressively re-assign every candidate to the best-fit job across the
     * entire Open + Active job pool, regardless of current assignment. Use
     * when seed data changes drastically or to reset to optimal placement.
     */
    @PostMapping("/deep-rematch")
    public ResponseEntity<Map<String, Object>> deepRematchAll() {
        int updated = candidateService.deepRematchAllCandidates();
        return ResponseEntity.ok(Map.of(
                "updated", updated,
                "message", "Re-assigned " + updated + " candidate(s) to their best-fit jobs"
        ));
    }

    // ---------------- DELETE ----------------
    // HR users can't delete directly — they must submit a deletion request that
    // a Manager approves. See DeletionRequestController. MANAGER and ADMIN go
    // straight through.
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteCandidate(@PathVariable String id) {
        org.springframework.security.core.Authentication auth =
            org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        String role = null;
        if (auth != null) {
            for (org.springframework.security.core.GrantedAuthority a : auth.getAuthorities()) {
                String s = a.getAuthority();
                if (s != null && s.startsWith("ROLE_")) { role = s.substring(5); break; }
            }
        }
        boolean canDeleteDirectly = role != null
            && ("MANAGER".equalsIgnoreCase(role) || "ADMIN".equalsIgnoreCase(role));
        if (!canDeleteDirectly) {
            return ResponseEntity.status(403).body(Map.of(
                "message", "HR users cannot delete candidates directly. Submit a deletion request for Manager approval.",
                "code", "DELETE_FORBIDDEN_HR"
            ));
        }
        candidateService.deleteCandidate(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/statistics")
    public ResponseEntity<Map<String, Long>> getCandidateStatistics() {

        Map<String, Long> stats = new HashMap<>();

        try {
            stats.put("total", candidateService.getTotalCandidatesCount());
            stats.put("active", candidateService.getCandidatesCountByStatusIn(
                    List.of("New", "Screening", "Shortlisted", "Interview", "Offer")));
            stats.put("screening", candidateService.getCandidatesCountByStatusIn(List.of("New", "Screening")));
            stats.put("shortlisted", candidateService.getCandidatesCountByStatus("Shortlisted"));
            stats.put("interview", candidateService.getCandidatesCountByStatus("Interview"));
            stats.put("offer", candidateService.getCandidatesCountByStatus("Offer"));
            stats.put("hired", candidateService.getCandidatesCountByStatus("Hired"));
            stats.put("rejected", candidateService.getCandidatesCountByStatus("Rejected"));
        } catch (Exception e) {
            log.error("Error fetching candidate stats: ", e);
        }

        return ResponseEntity.ok(stats);
    }

    @GetMapping("/trends")
    public ResponseEntity<Map<String, Long>> getCandidateTrends(@RequestParam(defaultValue = "7") int days) {
        return ResponseEntity.ok(candidateService.getDailyCandidateCounts(days));
    }

    /**
     * Daily candidate counts with a per-source breakdown for the dashboard
     * Candidate Trends chart's tooltip. See
     * {@link com.recruitai.agent.service.CandidateService#getDailyCandidateCountsBySource}
     * for the shape of each row.
     */
    @GetMapping("/trends-by-source")
    public ResponseEntity<Map<String, Map<String, Long>>> getCandidateTrendsBySource(
            @RequestParam(defaultValue = "7") int days) {
        return ResponseEntity.ok(candidateService.getDailyCandidateCountsBySource(days));
    }

    // ---------------- MAPPERS ----------------
    private Candidate convertToEntity(CandidateDto dto) {
        Candidate candidate = new Candidate();
        candidate.setId(dto.getId());
        candidate.setName(dto.getName());
        candidate.setEmail(dto.getEmail());
        candidate.setRole(dto.getRole());
        candidate.setSkills(dto.getSkills());
        candidate.setExperience(dto.getExperience());
        candidate.setStatus(dto.getStatus() != null ? dto.getStatus() : "New");
        candidate.setJobId(dto.getJobId());
        candidate.setLinkedinUrl(dto.getLinkedinUrl());
        // Education, language, location, and visa-related fields were silently
        // dropped here before — meaning the LinkedIn extension's PUT update
        // could never populate them on the candidate page.
        candidate.setEducation(dto.getEducation());
        candidate.setLanguageSkills(dto.getLanguageSkills());
        candidate.setCountry(dto.getCountry());
        candidate.setLocality(dto.getLocality());
        candidate.setPostalCode(dto.getPostalCode());
        candidate.setCurrentOrganization(dto.getCurrentOrganization());
        candidate.setSummary(dto.getSummary());
        candidate.setJapaneseLanguageProficiency(dto.getJapaneseLanguageProficiency());
        candidate.setPhone(dto.getPhone());
        // Remaining fields the LinkedIn extension sends — copying these means
        // Industry / Notice Period / Visa / Employment Status / Source /
        // Owner attribution survive PUT round-trips instead of being NULLed out.
        candidate.setIndustry(dto.getIndustry());
        candidate.setSource(dto.getSource());
        candidate.setCurrentEmploymentStatus(dto.getCurrentEmploymentStatus());
        candidate.setNoticePeriod(dto.getNoticePeriod());
        candidate.setRelevantExperience(dto.getRelevantExperience());
        candidate.setCurrentSalary(dto.getCurrentSalary());
        candidate.setSalaryExpectation(dto.getSalaryExpectation());
        candidate.setSalaryType(dto.getSalaryType());
        candidate.setAvailableFrom(dto.getAvailableFrom());
        candidate.setWillingToRelocate(dto.isWillingToRelocate());
        candidate.setVisaType(dto.getVisaType());
        candidate.setVisaValidity(dto.getVisaValidity());
        candidate.setReasonForChange(dto.getReasonForChange());
        candidate.setRecentlyAppliedCompanies(dto.getRecentlyAppliedCompanies());
        candidate.setHotlist(dto.getHotlist());
        candidate.setAssignedBy(dto.getAssignedBy());
        candidate.setJobAssignedBy(dto.getJobAssignedBy());
        candidate.setAssignedTo(dto.getAssignedTo());
        candidate.setUploadedBy(dto.getUploadedBy());
        // Interview-pipeline fields were dropped here — so a PUT could never persist a
        // candidate's interview round / round status (Dashboard + Interview Pipeline
        // therefore never reflected a scheduled round). Carry them through.
        candidate.setInterviewRound(dto.getInterviewRound());
        candidate.setRoundStatus(dto.getRoundStatus());
        return candidate;
    }

    private CandidateDto convertToDto(Candidate candidate) {
        CandidateDto dto = new CandidateDto();
        dto.setId(candidate.getId());
        dto.setSequenceId(candidate.getSequenceId());
        dto.setName(candidate.getName());
        dto.setEmail(candidate.getEmail());
        dto.setPhone(candidate.getPhone());
        dto.setRole(candidate.getRole());
        dto.setSkills(candidate.getSkills());
        dto.setExperience(candidate.getExperience());
        dto.setStatus(candidate.getStatus());
        dto.setJobId(candidate.getJobId());
        dto.setFitScore(candidate.getFitScore() == null ? 0 : candidate.getFitScore());
        dto.setResumeId(candidate.getResumeId());
        dto.setSource(candidate.getSource());
        dto.setHotlist(candidate.getHotlist());
        dto.setAssignedBy(candidate.getAssignedBy());
        dto.setAssignedTo(candidate.getAssignedTo());
        dto.setJobAssignedBy(candidate.getJobAssignedBy());
        dto.setUploadedBy(candidate.getUploadedBy());
        dto.setCurrentOrganization(candidate.getCurrentOrganization());
        dto.setLocality(candidate.getLocality());
        dto.setLinkedinUrl(candidate.getLinkedinUrl());
        // Fields the LinkedIn extension fills — make sure the candidate detail
        // page can read them after they're saved.
        dto.setEducation(candidate.getEducation());
        dto.setLanguageSkills(candidate.getLanguageSkills());
        dto.setCountry(candidate.getCountry());
        dto.setPostalCode(candidate.getPostalCode());
        dto.setSummary(candidate.getSummary());
        dto.setJapaneseLanguageProficiency(candidate.getJapaneseLanguageProficiency());
        // Round out the rest of the LinkedIn-fillable fields so the candidate
        // details page reflects everything we persisted.
        dto.setIndustry(candidate.getIndustry());
        dto.setCurrentEmploymentStatus(candidate.getCurrentEmploymentStatus());
        dto.setNoticePeriod(candidate.getNoticePeriod());
        dto.setRelevantExperience(candidate.getRelevantExperience());
        dto.setCurrentSalary(candidate.getCurrentSalary());
        dto.setSalaryExpectation(candidate.getSalaryExpectation());
        dto.setSalaryType(candidate.getSalaryType());
        dto.setAvailableFrom(candidate.getAvailableFrom());
        dto.setWillingToRelocate(candidate.isWillingToRelocate());
        dto.setVisaType(candidate.getVisaType());
        dto.setVisaValidity(candidate.getVisaValidity());
        dto.setReasonForChange(candidate.getReasonForChange());
        dto.setRecentlyAppliedCompanies(candidate.getRecentlyAppliedCompanies());
        // Interview-pipeline fields — without these the Dashboard pipeline and the
        // Interview Pipeline page never saw the candidate's round (always empty).
        dto.setInterviewRound(candidate.getInterviewRound());
        dto.setRoundStatus(candidate.getRoundStatus());
        dto.setBlocked(candidate.isBlocked());
        dto.setBlockReason(candidate.getBlockReason());
        dto.setBlockedBy(candidate.getBlockedBy());
        dto.setBlockedDate(candidate.getBlockedDate());
        if (candidate.getCreatedAt() != null) {
            dto.setAppliedDate(candidate.getCreatedAt().toLocalDate().toString());
            // Full ISO timestamp WITH the server's zone offset (e.g. "…Z" / "…+05:30") for
            // client-side relative-time formatting. A zone-less string is read by the browser
            // as its own local time, making a just-added candidate show as "6 hours ago" when
            // the server (UTC) and viewer (e.g. IST) differ.
            dto.setCreatedAt(candidate.getCreatedAt()
                    .atZone(java.time.ZoneId.systemDefault()).toOffsetDateTime().toString());
        }
        return dto;
    }
}
