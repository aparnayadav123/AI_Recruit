package com.recruitai.agent.controller;

import com.recruitai.agent.entity.Candidate;
import com.recruitai.agent.entity.Job;
import com.recruitai.agent.entity.SkillMatrix;
import com.recruitai.agent.entity.Interview;
import com.recruitai.agent.repository.CandidateRepository;
import com.recruitai.agent.repository.JobRepository;
import com.recruitai.agent.repository.SkillMatrixRepository;
import com.recruitai.agent.repository.InterviewRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Single endpoint that scans every searchable collection and returns
 * categorized matches for the global top-bar search.
 *
 *   GET /api/global-search?q=react&limit=10
 *
 * Response shape:
 *   {
 *     query: "react",
 *     totalResults: 17,
 *     candidates: [{ id, name, subtitle, matched, navigateTo }, ...],
 *     jobs:       [{ id, title, subtitle, matched, navigateTo }, ...],
 *     skills:     [{ id, name, subtitle, matched, navigateTo }, ...],
 *     interviews: [{ id, title, subtitle, matched, navigateTo }, ...]
 *   }
 */
@RestController
@RequestMapping("/api/global-search")
public class GlobalSearchController {

    @Autowired private CandidateRepository candidateRepository;
    @Autowired private JobRepository jobRepository;
    @Autowired private SkillMatrixRepository skillMatrixRepository;
    @Autowired private InterviewRepository interviewRepository;

    public static class SearchHit {
        public String id;
        public String type;       // candidate | job | skill | interview
        public String title;      // primary line
        public String subtitle;   // secondary line
        public String matched;    // which field matched (e.g., "skill: React")
        public String navigateTo; // frontend route to open
        public String parentId;   // optional — e.g., the candidate id behind a skill row
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> search(
            @RequestParam("q") String q,
            @RequestParam(value = "limit", defaultValue = "10") int limit) {

        Map<String, Object> response = new LinkedHashMap<>();
        if (q == null || q.trim().isEmpty()) {
            response.put("query", "");
            response.put("totalResults", 0);
            response.put("candidates", List.of());
            response.put("jobs", List.of());
            response.put("skills", List.of());
            response.put("interviews", List.of());
            return ResponseEntity.ok(response);
        }

        String needle = q.trim().toLowerCase();
        int perCategory = Math.max(1, Math.min(50, limit));

        List<SearchHit> candidateHits = searchCandidates(needle, perCategory);
        List<SearchHit> jobHits       = searchJobs(needle, perCategory);
        List<SearchHit> skillHits     = searchSkills(needle, perCategory);
        List<SearchHit> interviewHits = searchInterviews(needle, perCategory);

        int total = candidateHits.size() + jobHits.size() + skillHits.size() + interviewHits.size();

        response.put("query", q);
        response.put("totalResults", total);
        response.put("candidates", candidateHits);
        response.put("jobs", jobHits);
        response.put("skills", skillHits);
        response.put("interviews", interviewHits);
        return ResponseEntity.ok(response);
    }

    // ============================================================
    // Per-collection scanners
    // ============================================================

    private List<SearchHit> searchCandidates(String needle, int limit) {
        List<Candidate> all = candidateRepository.findAll();
        List<SearchHit> hits = new ArrayList<>();
        for (Candidate c : all) {
            String matched = whatMatched(c, needle);
            if (matched == null) continue;

            SearchHit h = new SearchHit();
            h.id = c.getId();
            h.type = "candidate";
            h.title = nullSafe(c.getName(), "Unnamed candidate");
            h.subtitle = (nullSafe(c.getRole(), "") + (c.getEmail() != null ? " · " + c.getEmail() : "")).trim();
            h.matched = matched;
            h.navigateTo = "/candidates/" + c.getId();
            hits.add(h);
            if (hits.size() >= limit) break;
        }
        return hits;
    }

    private String whatMatched(Candidate c, String needle) {
        if (containsIgnoreCase(c.getName(), needle))   return "name: " + c.getName();
        if (containsIgnoreCase(c.getEmail(), needle))  return "email: " + c.getEmail();
        if (containsIgnoreCase(c.getRole(), needle))   return "role: " + c.getRole();
        if (containsIgnoreCase(c.getPhone(), needle))  return "phone: " + c.getPhone();
        if (containsIgnoreCase(c.getStatus(), needle)) return "status: " + c.getStatus();
        if (containsIgnoreCase(c.getCurrentOrganization(), needle))
            return "organization: " + c.getCurrentOrganization();
        if (c.getSkills() != null) {
            for (String s : c.getSkills()) {
                if (containsIgnoreCase(s, needle)) return "skill: " + s;
            }
        }
        if (containsIgnoreCase(c.getSummary(), needle)) return "summary";
        if (containsIgnoreCase(c.getId(), needle))      return "id: " + c.getId();
        return null;
    }

    private List<SearchHit> searchJobs(String needle, int limit) {
        List<Job> all = jobRepository.findAll();
        List<SearchHit> hits = new ArrayList<>();
        for (Job j : all) {
            String matched = null;
            if (containsIgnoreCase(j.getTitle(), needle))       matched = "title: " + j.getTitle();
            else if (containsIgnoreCase(j.getDepartment(), needle)) matched = "department: " + j.getDepartment();
            else if (containsIgnoreCase(j.getDescription(), needle)) matched = "description";
            else if (containsIgnoreCase(j.getLocation(), needle))    matched = "location: " + j.getLocation();
            else if (containsIgnoreCase(j.getCompany(), needle))     matched = "company: " + j.getCompany();
            else if (containsIgnoreCase(j.getId(), needle))          matched = "id: " + j.getId();
            else if (j.getSkills() != null) {
                for (com.recruitai.agent.entity.SkillWeight sw : j.getSkills()) {
                    if (sw != null && containsIgnoreCase(sw.getName(), needle)) {
                        matched = "skill: " + sw.getName();
                        break;
                    }
                }
            }
            if (matched == null) continue;

            SearchHit h = new SearchHit();
            h.id = j.getId();
            h.type = "job";
            h.title = nullSafe(j.getTitle(), "Untitled job");
            h.subtitle = (nullSafe(j.getDepartment(), "") + (j.getLocation() != null ? " · " + j.getLocation() : "")).trim();
            h.matched = matched;
            h.navigateTo = "/jobs?highlight=" + j.getId();
            hits.add(h);
            if (hits.size() >= limit) break;
        }
        return hits;
    }

    private List<SearchHit> searchSkills(String needle, int limit) {
        List<SkillMatrix> all = skillMatrixRepository.findAll();
        List<SearchHit> hits = new ArrayList<>();
        for (SkillMatrix sm : all) {
            if (sm.getSkillMetrics() == null) continue;
            // Find the highest-scoring skill that matches the query
            SkillMatrix.SkillMetric best = sm.getSkillMetrics().stream()
                    .filter(m -> containsIgnoreCase(m.getSkill(), needle))
                    .max(Comparator.comparingInt(SkillMatrix.SkillMetric::getPercentage))
                    .orElse(null);
            if (best == null) {
                // Or candidate-name match in the matrix
                if (!containsIgnoreCase(sm.getCandidateName(), needle)) continue;
                best = sm.getSkillMetrics().isEmpty() ? null : sm.getSkillMetrics().get(0);
            }

            SearchHit h = new SearchHit();
            h.id = sm.getId();
            h.type = "skill";
            h.title = best != null
                    ? best.getSkill() + " — " + best.getPercentage() + "%"
                    : "Skill matrix";
            h.subtitle = nullSafe(sm.getCandidateName(), "Candidate");
            h.matched = best != null ? "skill: " + best.getSkill() : "candidate: " + sm.getCandidateName();
            h.parentId = sm.getCandidateId();
            h.navigateTo = "/skills-matrix?highlight=" + sm.getCandidateId();
            hits.add(h);
            if (hits.size() >= limit) break;
        }
        return hits;
    }

    private List<SearchHit> searchInterviews(String needle, int limit) {
        List<Interview> all = interviewRepository.findAll();
        return all.stream()
                .filter(i -> containsIgnoreCase(i.getCandidateName(), needle)
                          || containsIgnoreCase(i.getType(), needle)
                          || containsIgnoreCase(i.getNotes(), needle)
                          || containsIgnoreCase(i.getInterviewer(), needle))
                .limit(limit)
                .map(i -> {
                    SearchHit h = new SearchHit();
                    h.id = i.getId();
                    h.type = "interview";
                    h.title = nullSafe(i.getCandidateName(), "Interview");
                    String startStr = i.getStartTime() != null ? i.getStartTime().toString() : "";
                    h.subtitle = (nullSafe(i.getType(), "") +
                            (!startStr.isEmpty() ? " · " + startStr : "")).trim();
                    h.matched = containsIgnoreCase(i.getCandidateName(), needle)
                            ? "candidate: " + i.getCandidateName()
                            : (containsIgnoreCase(i.getType(), needle)
                                ? "type: " + i.getType()
                                : "notes");
                    h.parentId = i.getCandidateId();
                    h.navigateTo = "/interview-pipeline?highlight=" + i.getCandidateId();
                    return h;
                })
                .collect(Collectors.toList());
    }

    // ============================================================
    // Helpers
    // ============================================================

    private boolean containsIgnoreCase(String haystack, String needle) {
        return haystack != null && haystack.toLowerCase().contains(needle);
    }

    private String nullSafe(String s, String fallback) {
        return (s == null || s.isBlank()) ? fallback : s;
    }
}
