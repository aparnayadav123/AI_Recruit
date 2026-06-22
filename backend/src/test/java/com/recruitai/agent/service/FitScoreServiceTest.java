package com.recruitai.agent.service;

import com.recruitai.agent.entity.Candidate;
import com.recruitai.agent.entity.Job;
import com.recruitai.agent.entity.SkillWeight;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Pure-logic unit tests for the ATS Fit-Score algorithm.
 *
 *   skillsScore     = (matched / totalRequired) × 100 × 0.75
 *   experienceScore = min(candidateExp / requiredExp, 1) × 100 × 0.25
 *   fitScore        = clamp(round(skillsScore + experienceScore), 0, 100)
 */
class FitScoreServiceTest {

    private final FitScoreService service = new FitScoreService();

    // ------- helpers -------

    private static Candidate cand(String name, Double years, String... skills) {
        Candidate c = new Candidate();
        c.setId("CAN-" + name.toLowerCase());
        c.setName(name);
        c.setExperience(years);
        c.setSkills(new ArrayList<>(Arrays.asList(skills)));
        return c;
    }

    private static Job job(String title, String expLevel, String... skills) {
        Job j = new Job();
        j.setId("JOB-" + title.toLowerCase().replaceAll("\\s+", "-"));
        j.setTitle(title);
        j.setExperienceLevel(expLevel);
        List<SkillWeight> sws = new ArrayList<>();
        for (String s : skills) sws.add(new SkillWeight(s, 50));
        j.setSkills(sws);
        return j;
    }

    // =====================================================================
    // Happy path
    // =====================================================================

    @Nested
    @DisplayName("Happy path — formula matches the spec exactly")
    class HappyPath {

        @Test
        @DisplayName("Perfect skill match + meets experience → 100%")
        void perfectMatch() {
            Candidate c = cand("Alice", 5.0, "React", "Node.js", "MongoDB", "JavaScript");
            Job j = job("Full Stack", "Mid Level (1-3 years)", "React", "Node.js", "MongoDB", "JavaScript");
            int score = service.calculateFitScore(c, j);
            assertThat(score).isEqualTo(100);
        }

        @Test
        @DisplayName("Half skill match + meets exp → 50×0.75 + 25 = 62.5 → rounded 63")
        void halfSkills() {
            Candidate c = cand("Bob", 3.0, "React", "JavaScript", "CSS");
            Job j = job("FE", "Mid Level (1-3 years)", "React", "Node.js", "MongoDB", "JavaScript");
            // matched = React, JavaScript (2 of 4) → 50% × 0.75 = 37.5
            // exp 3y >= mid(2y) → 100% × 0.25 = 25
            // total = 62.5 → 63 (rounded)
            int score = service.calculateFitScore(c, j);
            assertThat(score).isEqualTo(63);
        }

        @Test
        @DisplayName("Partial exp (3 of 4 yrs) + 0 skills → (3/4)×100×0.25 = 18.75 → rounded 19")
        void partialExp() {
            Candidate c = cand("Carol", 3.0, "Photoshop");
            Job j = job("Backend", "4 years", "Java", "Spring", "SQL", "Kafka");
            int score = service.calculateFitScore(c, j);
            assertThat(score).isEqualTo(19);
        }
    }

    // =====================================================================
    // Spec-exact example
    // =====================================================================

    @Test
    @DisplayName("Spec example: React+JS+CSS vs React/Node/Mongo/JS, exp 3 vs 4 → 56%")
    void specExample() {
        // From the user's original spec:
        // Required: React, Node.js, MongoDB, JavaScript    (4 skills)
        // Candidate: React, JavaScript, CSS                (3 skills)
        // matched = 2 → skills% = 50, skillsScore = 37.5
        // requiredExp = 4, candidateExp = 3 → exp% = 75, expScore = 18.75
        // fitScore = 56.25 → 56
        Candidate c = cand("Spec", 3.0, "React", "JavaScript", "CSS");
        Job j = job("FS", "4 years", "React", "Node.js", "MongoDB", "JavaScript");
        int score = service.calculateFitScore(c, j);
        assertThat(score).isEqualTo(56);
    }

    // =====================================================================
    // Fuzzy matching
    // =====================================================================

    @Nested
    @DisplayName("Fuzzy skill matching (case + spacing + substring)")
    class FuzzyMatching {

        @Test
        @DisplayName("Case-insensitive: react matches REACT")
        void caseInsensitive() {
            Candidate c = cand("X", 5.0, "react", "node.JS");
            Job j = job("Y", "Mid Level (1-3 years)", "REACT", "Node.js");
            assertThat(service.calculateFitScore(c, j)).isEqualTo(100);
        }

        @Test
        @DisplayName("Whitespace stripped: 'Spring boot' matches 'SpringBoot'")
        void whitespaceStripped() {
            Candidate c = cand("X", 5.0, "Spring boot");
            Job j = job("Y", "Mid Level (1-3 years)", "SpringBoot");
            assertThat(service.calculateFitScore(c, j)).isEqualTo(100);
        }

        @Test
        @DisplayName("Substring contained: 'Azure' matches 'Azure Services'")
        void substringContained() {
            Candidate c = cand("X", 5.0, "Azure");
            Job j = job("Y", "Mid Level (1-3 years)", "Azure Services");
            assertThat(service.calculateFitScore(c, j)).isEqualTo(100);
        }

        @Test
        @DisplayName("Punctuation stripped: 'Node.js' matches 'Node'")
        void punctuationStripped() {
            Candidate c = cand("X", 5.0, "Node.js");
            Job j = job("Y", "Mid Level (1-3 years)", "Node");
            assertThat(service.calculateFitScore(c, j)).isEqualTo(100);
        }

        @Test
        @DisplayName("Empty skill string is ignored")
        void emptySkillIgnored() {
            Candidate c = cand("X", 5.0, "", "  ", "React");
            Job j = job("Y", "Mid Level (1-3 years)", "React");
            assertThat(service.calculateFitScore(c, j)).isEqualTo(100);
        }
    }

    // =====================================================================
    // Negative / edge cases
    // =====================================================================

    @Nested
    @DisplayName("Negative tests — formula must not explode on bad data")
    class Negative {

        @Test
        @DisplayName("Null candidate → 0 (no crash)")
        void nullCandidate() {
            assertThat(service.calculateFitScore(null, job("X", "Mid Level", "Java"))).isZero();
        }

        @Test
        @DisplayName("Null job → 0 (no crash)")
        void nullJob() {
            assertThat(service.calculateFitScore(cand("X", 5.0, "Java"), null)).isZero();
        }

        @Test
        @DisplayName("Both null → 0")
        void bothNull() {
            assertThat(service.calculateFitScore(null, null)).isZero();
        }

        @Test
        @DisplayName("Empty job skills + no exp requirement → still 25 (full exp credit)")
        void emptyJobSkills() {
            Candidate c = cand("X", 5.0, "React");
            Job j = job("Y", "Entry Level"); // no skills
            // skills percent = 0 → 0
            // requiredExp = 0 (entry) → expPercent = 100 → 25
            assertThat(service.calculateFitScore(c, j)).isEqualTo(25);
        }

        @Test
        @DisplayName("Candidate with no skills → 0 + full exp score (25)")
        void noCandidateSkills() {
            Candidate c = cand("X", 5.0);
            c.setSkills(Collections.emptyList());
            Job j = job("Y", "Mid Level (1-3 years)", "Java");
            // 0 skills match + meets mid exp → 25
            assertThat(service.calculateFitScore(c, j)).isEqualTo(25);
        }

        @Test
        @DisplayName("Null candidate skills list is handled")
        void nullSkillsList() {
            Candidate c = cand("X", 5.0);
            c.setSkills(null);
            Job j = job("Y", "Mid Level (1-3 years)", "Java");
            assertThat(service.calculateFitScore(c, j)).isEqualTo(25);
        }

        @Test
        @DisplayName("Null candidate experience → treated as 0")
        void nullExp() {
            Candidate c = cand("X", null, "Java");
            Job j = job("Y", "5 years", "Java");
            // skills: 1/1 = 100 → 75
            // exp 0 vs 5 → 0% → 0
            // total = 75
            assertThat(service.calculateFitScore(c, j)).isEqualTo(75);
        }

        @Test
        @DisplayName("Negative experience clamped to 0")
        void negativeExp() {
            Candidate c = cand("X", -2.0, "Java");
            Job j = job("Y", "3 years", "Java");
            int score = service.calculateFitScore(c, j);
            assertThat(score).isBetween(70, 80); // skills full, exp ~0
        }

        @Test
        @DisplayName("Final score is always clamped to [0, 100]")
        void clamping() {
            // Construct extreme case: every skill matches, decade of experience
            Candidate c = cand("X", 100.0, "React", "Node", "Java", "Python", "SQL");
            Job j = job("Y", "Entry Level", "React", "Node", "Java", "Python", "SQL");
            int score = service.calculateFitScore(c, j);
            assertThat(score).isBetween(0, 100);
            assertThat(score).isEqualTo(100);
        }

        @Test
        @DisplayName("Null skill entries are skipped, not crashing")
        void nullSkillInList() {
            Candidate c = new Candidate();
            c.setExperience(5.0);
            c.setSkills(Arrays.asList(null, "React"));
            Job j = job("Y", "Mid Level (1-3 years)", "React");
            assertThat(service.calculateFitScore(c, j)).isEqualTo(100);
        }
    }

    // =====================================================================
    // FitScoreResult (the detailed breakdown the spec requires)
    // =====================================================================

    @Test
    @DisplayName("calculateATSFitScore returns the per-component breakdown")
    void breakdown() {
        Candidate c = cand("Spec", 3.0, "React", "JavaScript", "CSS");
        Job j = job("FS", "4 years", "React", "Node.js", "MongoDB", "JavaScript");
        FitScoreService.FitScoreResult r = service.calculateATSFitScore(c, j);
        assertThat(r.getSkillsPercentage()).isEqualTo(50.0);
        assertThat(r.getExperiencePercentage()).isEqualTo(75.0);
        assertThat(r.getFitScore()).isEqualTo(56);
    }

    // =====================================================================
    // findBestJobMatch
    // =====================================================================

    @Nested
    @DisplayName("findBestJobMatch — picks the highest-scoring job")
    class BestMatch {

        @Test
        @DisplayName("Returns the job with the highest score across the list")
        void picksHighest() {
            Candidate c = cand("Dev", 5.0, "React", "JavaScript");
            Job a = job("Backend Dev",  "Mid Level (1-3 years)", "Java", "Spring");
            Job b = job("Frontend Dev", "Mid Level (1-3 years)", "React", "JavaScript", "CSS");
            Job pick = service.findBestJobMatch(c, Arrays.asList(a, b));
            assertThat(pick).isSameAs(b);
        }

        @Test
        @DisplayName("Returns null when candidate scores 0 against every job")
        void returnsNullOnZeroEverywhere() {
            Candidate c = cand("X", 0.0, "ZZZNothing");
            Job a = job("A", "10 years", "Java");
            Job b = job("B", "10 years", "Python");
            Job pick = service.findBestJobMatch(c, Arrays.asList(a, b));
            assertThat(pick).isNull();
        }

        @Test
        @DisplayName("Returns null on empty job list")
        void emptyList() {
            assertThat(service.findBestJobMatch(cand("X", 1.0, "Java"), Collections.emptyList()))
                    .isNull();
        }

        @Test
        @DisplayName("Returns null on null inputs")
        void nullInputs() {
            assertThat(service.findBestJobMatch(null, Collections.emptyList())).isNull();
            assertThat(service.findBestJobMatch(cand("X", 1.0, "Java"), null)).isNull();
        }
    }
}
