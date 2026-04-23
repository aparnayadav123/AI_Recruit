package com.recruitai.agent.service;

import com.recruitai.agent.entity.Job;
import com.recruitai.agent.repository.JobRepository;
import com.recruitai.agent.repository.CandidateRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@Transactional
public class JobService {

    @Autowired
    private JobRepository jobRepository;

    @Autowired
    private CandidateRepository candidateRepository;

    // ✅ CREATE (COLLECTION WILL BE CREATED HERE)
    public Job createJob(Job job) {

        if (job.getId() == null || job.getId().isEmpty()) {
            job.setId("JOB-" + System.currentTimeMillis());
        }

        if (job.getPostedDate() == null || job.getPostedDate().isEmpty()) {
            job.setPostedDate("Just now");
        }

        if (job.getCreatedAt() == null) {
            job.setCreatedAt(LocalDateTime.now());
        }

        job.setUpdatedAt(LocalDateTime.now());

        return jobRepository.save(job); // 🔥 MongoDB "jobs" collection created here
    }

    // ✅ READ
    public Job getJobById(String id) {
        return jobRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Job not found with id: " + id));
    }

    public Page<Job> getAllJobs(Pageable pageable) {
        return jobRepository.findAll(pageable);
    }

    public List<Job> getJobsByStatus(String status) {
        return jobRepository.findByStatus(status);
    }

    public Page<Job> getJobsByStatus(String status, Pageable pageable) {
        return jobRepository.findByStatus(status, pageable);
    }

    public List<Job> getJobsByEmploymentType(String employmentType) {
        return jobRepository.findByEmploymentType(employmentType);
    }

    public List<Job> getJobsByLocation(String location) {
        return jobRepository.findByLocationContainingIgnoreCase(location);
    }

    public List<Job> getJobsByDepartment(String department) {
        return jobRepository.findByDepartment(department);
    }

    public Page<Job> searchJobs(String search, Pageable pageable) {
        return jobRepository.searchJobs(search, pageable);
    }

    // ✅ UPDATE
    public Job updateJob(String id, Job jobDetails) {
        return jobRepository.findById(id)
                .map(job -> {

                    job.setTitle(jobDetails.getTitle());
                    job.setDescription(jobDetails.getDescription());
                    job.setCompany(jobDetails.getCompany());
                    job.setLocation(jobDetails.getLocation());
                    job.setDepartment(jobDetails.getDepartment());
                    job.setEmploymentType(jobDetails.getEmploymentType());
                    job.setSalary(jobDetails.getSalary());
                    job.setExperienceLevel(jobDetails.getExperienceLevel());
                    job.setSkills(jobDetails.getSkills());
                    job.setEducation(jobDetails.getEducation());
                    job.setIndustry(jobDetails.getIndustry());
                    job.setBenefits(jobDetails.getBenefits());
                    job.setRemote(jobDetails.isRemote());
                    job.setDeadline(jobDetails.getDeadline());
                    job.setStatus(jobDetails.getStatus());
                    job.setPostedDate(jobDetails.getPostedDate());
                    job.setApplicants(jobDetails.getApplicants());
                    job.setUpdatedAt(LocalDateTime.now());

                    return jobRepository.save(job);
                })
                .orElseThrow(() -> new RuntimeException("Job not found with id: " + id));
    }

    // ✅ DELETE
    public void deleteJob(String id) {
        if (!jobRepository.existsById(id)) {
            throw new RuntimeException("Job not found with id: " + id);
        }
        // Cascade: Unlink candidates first
        List<com.recruitai.agent.entity.Candidate> candidates = candidateRepository.findByJobId(id);
        if (!candidates.isEmpty()) {
            candidates.forEach(c -> {
                c.setJobId(null);
                c.setRole("Not Matched");
                candidateRepository.save(c);
            });
        }
        jobRepository.deleteById(id);
    }

    // ✅ RESET & SEED
    public void resetAndSeedJobs() {
        try {
            // Step 1: Unlink ALL candidates from jobs
            List<com.recruitai.agent.entity.Candidate> allCandidates = candidateRepository.findAll();
            for (com.recruitai.agent.entity.Candidate c : allCandidates) {
                if (c.getJobId() != null) {
                    c.setJobId(null);
                    c.setRole("Not Matched");
                    candidateRepository.save(c);
                }
            }

            // Step 2: Delete ALL jobs
            jobRepository.deleteAll();

            // Step 3: Seed New Data
            Object[][] matrix = {
                    { "Software Developer / Engineer", "Java, Python, C++, OOP, Data Structures, Git, Debugging, SDLC",
                            "Engineering" },
                    { "Frontend Developer", "HTML, CSS, JavaScript, React, Angular, Vue, Responsive Design, UI/UX",
                            "Engineering" },
                    { "Backend Developer",
                            "Java, Node.js, Python, REST APIs, Spring Boot, Express, Databases (SQL/NoSQL)",
                            "Engineering" },
                    { "Full Stack Developer",
                            "React, Angular, Node.js, Java, Spring Boot, MongoDB, MySQL, SQL, REST APIs, Git, Cloud Basics",
                            "Engineering" },
                    { "Java Developer", "Java, Spring, Spring Boot, Hibernate, REST APIs, SQL, Git", "Engineering" },
                    { "Python Developer", "Python, Django / Flask, APIs, SQL, Pandas, NumPy", "Engineering" },
                    { "DevOps Engineer", "AWS / Azure, Docker, Kubernetes, CI/CD, Linux, Git, Terraform", "DevOps" },
                    { "Cloud Engineer", "AWS, Azure, GCP, IAM, Networking, Virtual Machines, Storage", "Cloud" },
                    { "Data Analyst", "Excel, SQL, Python, Power BI, Tableau, Data Visualization, Statistics", "Data" },
                    { "Data Scientist", "Python, Machine Learning, Pandas, NumPy, TensorFlow, Data Modeling", "Data" },
                    { "Machine Learning Engineer", "Python, ML Algorithms, TensorFlow, PyTorch, APIs, MLOps", "Data" },
                    { "AI Engineer", "Python, GenAI, LLMs, LangChain, RAG, OpenAI API, Vector DB", "Data" },
                    { "Cybersecurity Engineer", "Network Security, Firewalls, SIEM, Ethical Hacking, Risk Management",
                            "Security" },
                    { "QA Engineer / Tester",
                            "Manual Testing, Selenium, Cucumber, Test Cases, Bug Tracking, Jira, Agile, SQL, API Testing",
                            "QA" },
                    { "Automation Tester",
                            "Selenium, Cypress, Playwright, Java, Python, CI/CD, Jenkins, Maven, TestNG, Rest Assured, Git",
                            "QA" },
                    { "Mobile App Developer", "Android, iOS, Flutter, React Native, REST APIs", "Engineering" },
                    { "UI/UX Designer", "Figma, Adobe XD, Wireframing, Prototyping, User Research", "Design" },
                    { "System Administrator", "Linux, Windows Server, Networking, Bash, Monitoring", "IT" },
                    { "Network Engineer", "TCP/IP, Routing, Switching, Firewalls, VPN", "IT" },
                    { "Database Administrator (DBA)", "MySQL, PostgreSQL, Oracle, Backup, Performance Tuning", "IT" },
                    { "Business Analyst (IT)", "Requirements Gathering, SQL, Documentation, Agile, Jira", "Business" },
                    { "Project Manager (IT)", "Project Planning, Agile, Scrum, Jira, Risk Management, SDLC",
                            "Management" },
                    { "Product Manager (Tech)", "Roadmaps, Agile, Jira, Stakeholder Management, Tech Basics",
                            "Management" },
                    // SPECIALIZED ROLES (Requested by User)
                    { "RPA Developer", "UiPath, Blue Prism, Automation Anywhere, Power Automate, .NET, VBA",
                            "Automation" },
                    { "Salesforce Developer", "Salesforce, Apex, Visualforce, Lightning Web Components, SOQL, CRM",
                            "Enterprise" },
                    { "Technical Support Engineer",
                            "Troubleshooting, Linux, Windows, Networking, Ticket Management, ITIL, Service Desk",
                            "Support" },
                    { "React Native Developer",
                            "React Native, JavaScript, TypeScript, Redux, Mobile Development, Android, iOS",
                            "Engineering" },
                    { "Software Engineer Trainee", "Java / Python / C, OOP Basics, Git, Problem Solving",
                            "Internship" },
                    { "Frontend Developer Intern", "HTML, CSS, JavaScript, React Basics, Responsive Design",
                            "Internship" },
                    { "Backend Developer Intern", "Java / Node.js / Python, REST APIs, SQL Basics", "Internship" },
                    { "Full Stack Developer Intern",
                            "HTML, CSS, JavaScript, React, Node.js, Java, Spring Boot, SQL, Databases", "Internship" }
            };

            for (Object[] row : matrix) {
                Job job = new Job();
                job.setTitle((String) row[0]);
                job.setDescription("Role for " + row[0]);

                String[] skillNames = ((String) row[1]).split(", ");
                java.util.List<com.recruitai.agent.entity.SkillWeight> skillList = new java.util.ArrayList<>();
                for (String s : skillNames) {
                    skillList.add(new com.recruitai.agent.entity.SkillWeight(s, 50));
                }
                job.setSkills(skillList);

                job.setDepartment((String) row[2]);

                // Defaut Values
                job.setCompany("RecruitAI Tech");
                job.setLocation("Remote");
                job.setEmploymentType(((String) row[0]).contains("Intern") ? "Internship" : "Full-time");
                job.setExperienceLevel(((String) row[0]).contains("Intern") ? "Entry" : "Mid-Senior");
                job.setSalary(((String) row[0]).contains("Intern") ? "$20,000 - $40,000" : "$80,000 - $120,000"); // Standardized
                                                                                                                  // on
                                                                                                                  // 'salary'
                job.setPostedDate("Just now");
                job.setStatus("Open");
                job.setCreatedAt(LocalDateTime.now());
                job.setUpdatedAt(LocalDateTime.now());

                // Dummy Requirements & Responsibilities
                if (((String) row[0]).contains("Intern")) {
                    job.setRequirements(java.util.List.of(
                            "Currently pursuing a degree in Computer Science or related field",
                            "Basic understanding of programming logic",
                            "Willingness to learn and adapt",
                            "Strong problem-solving skills"));
                    job.setResponsibilities(java.util.List.of(
                            "Assist in coding and debugging",
                            "Participate in code reviews",
                            "Collaborate with team members on projects",
                            "Document technical specifications"));
                    job.setBenefits(java.util.List.of("Mentorship", "Flexible Hours", "Certificate"));
                } else {
                    job.setRequirements(java.util.List.of(
                            "Bachelor's degree in Computer Science or relevant field",
                            "3+ years of experience in similar role",
                            "Proficiency in required technologies",
                            "Excellent communication skills"));
                    job.setResponsibilities(java.util.List.of(
                            "Develop and maintain high-quality software",
                            "Lead technical design discussions",
                            "Mentor junior developers",
                            "Optimize applications for performance"));
                    job.setBenefits(java.util.List.of("Health Insurance", "Remote Work", "401k", "Paid Time Off"));
                }

                createJob(job);
            }
            System.out.println("JOBS RESET AND SEEDED SUCCESSFULLY");
        } catch (Exception e) {
            System.err.println("RESET FAILED: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Reset Failed", e);
        }
    }

    // ✅ STATISTICS
    public Map<String, Long> getJobStatistics() {
        long totalJobs = jobRepository.count();
        long openJobs = jobRepository.countByStatus("Open") + jobRepository.countByStatus("Active");
        long closedJobs = jobRepository.countByStatus("Closed");
        long holdJobs = jobRepository.countByStatus("Hold") + jobRepository.countByStatus("Draft");

        return Map.of(
                "total", totalJobs,
                "open", openJobs,
                "closed", closedJobs,
                "hold", holdJobs,
                "draft", holdJobs); // Keep draft key for backward compatibility if needed
    }

    public Map<String, Long> getJobsByDepartmentDistribution() {
        List<Job> allJobs = jobRepository.findAll();
        java.util.Map<String, Long> distribution = new java.util.HashMap<>();
        for (Job job : allJobs) {
            String dept = (job.getDepartment() == null || job.getDepartment().isBlank()) ? "Other"
                    : job.getDepartment();
            distribution.merge(dept, 1L, Long::sum);
        }
        return distribution;
    }
}
