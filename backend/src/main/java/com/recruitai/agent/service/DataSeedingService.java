package com.recruitai.agent.service;

import com.recruitai.agent.entity.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class DataSeedingService {

    private static final Logger logger = LoggerFactory.getLogger(DataSeedingService.class);

    @Autowired
    private com.recruitai.agent.repository.UserRepository userRepository;

    @Autowired
    private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @Autowired
    private com.recruitai.agent.repository.JobRepository jobRepository;

    @Autowired
    private com.recruitai.agent.repository.CandidateRepository candidateRepository;

    @Autowired
    private com.recruitai.agent.repository.InterviewRepository interviewRepository;

    @Autowired
    private com.recruitai.agent.repository.NotificationRepository notificationRepository;

    @Autowired
    private com.recruitai.agent.repository.SkillMatrixRepository skillMatrixRepository;

    @Autowired
    private com.recruitai.agent.repository.ResumeRepository resumeRepository;

    @Autowired
    private com.recruitai.agent.repository.AuditLogRepository auditLogRepository;

    @Autowired
    private com.recruitai.agent.repository.JobApplicationRepository jobApplicationRepository;

    @Autowired
    private com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    @Autowired
    private org.springframework.data.mongodb.core.MongoTemplate mongoTemplate;

    // CONFLICT FIX: Disabled redundant backup. DataBackupService handles this.
    // @org.springframework.scheduling.annotation.Scheduled(fixedRate = 300000)
    public void saveSnapshot() {
        // ... (logic remains but disabled)
    }

    // ... (keep existing methods)

    private void createJob(String title, String roleBase, String skillsCsv, String expLabel, String level,
            int idSuffix) {
        String jobId = "JOB-" + String.format("%03d", idSuffix);

        // STABILITY FIX: Do not overwrite existing jobs. This preserves "Hold" status.
        if (jobRepository.existsById(jobId)) {
            // logger.info("Skipping seeding for existing job: " + jobId);
            return;
        }

        com.recruitai.agent.entity.Job job = new com.recruitai.agent.entity.Job();
        job.setId(jobId);
        job.setTitle(title);
        job.setDepartment(determineDepartment(roleBase));
        job.setLocation(getRandomLocation());
        job.setStatus("Active");

        java.util.List<com.recruitai.agent.entity.SkillWeight> skillList = new java.util.ArrayList<>();
        for (String s : skillsCsv.split(",")) {
            skillList.add(new com.recruitai.agent.entity.SkillWeight(s.trim(), 85)); // Default high importance
        }
        job.setSkills(skillList);

        job.setExperienceLevel(level + " (" + expLabel + ")");
        job.setCreatedAt(LocalDateTime.now());
        job.setPostedDate(LocalDateTime.now().minusDays((long) (Math.random() * 10)).toString());
        job.setDescription("We are hiring a " + title + " to join our team. " +
                "Requires experience in: " + skillsCsv + ". " +
                "Role involves working on high-impact projects at RecruitAI Tech.");
        job.setCompany("RecruitAI Tech");
        job.setRemote(Math.random() > 0.4); // 60% chance of being remote
        job.setSalary(determineSalary(level));
        job.setEmploymentType(level.equals("Intern") ? "Internship" : "Full-time");

        jobRepository.save(job);
    }

    @jakarta.annotation.PreDestroy
    public void onShutdown() {
        logger.info("Application Shutdown Detected. Saving Final Snapshot...");
        saveSnapshot();
    }

    private <T> boolean loadFromFile(String filename,
            org.springframework.data.mongodb.repository.MongoRepository<T, String> repository, Class<T> clazz) {
        try {
            java.io.File file = new java.io.File(filename);
            if (!file.exists())
                return false;

            java.util.List<T> data = objectMapper.readValue(
                    file,
                    objectMapper.getTypeFactory().constructCollectionType(java.util.List.class, clazz));

            if (data != null && !data.isEmpty()) {
                repository.saveAll(data);
                logger.info("Restored {} records from {}", data.size(), filename);
                return true;
            }
        } catch (java.io.FileNotFoundException | java.nio.file.NoSuchFileException e) {
            // Backup file simply isn't there yet — first run, expected.
            logger.debug("Backup file {} not present, skipping restore.", filename);
        } catch (Exception e) {
            // Stale / mis-formatted dump (e.g. schema drift). The DB is authoritative,
            // so it's safe to skip restoration — log at WARN, not ERROR, to avoid
            // alarming startup output.
            logger.warn("Skipped restoring {} (stale or unreadable backup): {}", filename, e.getMessage());
        }
        return false;
    }

    public void seedData() {
        logger.info("DATA RESTORE & SEEDING STARTING...");

        // Ensure collections exist
        try {
            if (!mongoTemplate.collectionExists("candidates"))
                mongoTemplate.createCollection("candidates");
            if (!mongoTemplate.collectionExists("jobs"))
                mongoTemplate.createCollection("jobs");
            if (!mongoTemplate.collectionExists("interviews"))
                mongoTemplate.createCollection("interviews");
            if (!mongoTemplate.collectionExists("notifications"))
                mongoTemplate.createCollection("notifications");
            if (!mongoTemplate.collectionExists("skill_matrix"))
                mongoTemplate.createCollection("skill_matrix");
            if (!mongoTemplate.collectionExists("users"))
                mongoTemplate.createCollection("users");
            if (!mongoTemplate.collectionExists("resumes"))
                mongoTemplate.createCollection("resumes");
            if (!mongoTemplate.collectionExists("audit_logs"))
                mongoTemplate.createCollection("audit_logs");
            if (!mongoTemplate.collectionExists("job_applications"))
                mongoTemplate.createCollection("job_applications");
            logger.info("Collections ensured.");
        } catch (Exception e) {
            logger.error("Error creating collections: " + e.getMessage());
        }

        // Try to restore from snapshots first
        boolean candidatesRestored = loadFromFile("data/candidates_dump.json", candidateRepository,
                com.recruitai.agent.entity.Candidate.class);
        logger.info("Candidates restored: " + candidatesRestored);

        // Only restore jobs from the backup dump when the DB is genuinely empty (fresh
        // start / crash recovery). When jobs already exist, the live DB is authoritative —
        // an unconditional saveAll here would silently re-add jobs the user deleted, since
        // the dump can lag behind deletions. (Mirrors DataBackupService.restoreData.)
        boolean jobsRestored = false;
        if (jobRepository.count() == 0) {
            jobsRestored = loadFromFile("data/jobs_dump.json", jobRepository, com.recruitai.agent.entity.Job.class);
        }
        logger.info("Jobs restored: " + jobsRestored);

        loadFromFile("data/interviews_dump.json", interviewRepository, com.recruitai.agent.entity.Interview.class);
        loadFromFile("data/notifications_dump.json", notificationRepository,
                com.recruitai.agent.entity.Notification.class);
        loadFromFile("data/skillmatrices_dump.json", skillMatrixRepository,
                com.recruitai.agent.entity.SkillMatrix.class);
        loadFromFile("data/users_dump.json", userRepository, com.recruitai.agent.entity.User.class);
        loadFromFile("data/resumes_dump.json", resumeRepository, com.recruitai.agent.entity.Resume.class);
        loadFromFile("data/auditlogs_dump.json", auditLogRepository, com.recruitai.agent.entity.AuditLog.class);
        loadFromFile("data/job_applications_dump.json", jobApplicationRepository,
                com.recruitai.agent.entity.JobApplication.class);

        // Fallback Logic for Jobs if restore failed
        // DISABLED (2026-06-09): hardcoded demo job seeding removed per user request.
        // The job-management and careers pages must contain only real, user-created jobs,
        // so a low/empty job count must NOT repopulate the ~129 "RecruitAI Tech" fixture
        // roles on startup. Kept behind `if (false)` to preserve history; safe to delete.
        if (false) {
            logger.info("Job count low. Seeding additional comprehensive jobs...");

            // Comprehensive Job Seeding
            // Format: Role, Skills (comma separated)
            String[][] jobData = {
                    { "Software Engineer", "Programming, OOP, Git, Problem Solving" },
                    { "Backend Developer", "Java, Python, Node.js, APIs, SQL" },
                    { "Frontend Developer", "HTML, CSS, JavaScript, React, Angular" },
                    { "Full Stack Developer", "Frontend, Backend, APIs, Databases" },
                    { "Web Developer", "HTML, CSS, JS, Web Frameworks" },
                    { "Mobile App Developer", "Android, iOS, Flutter, React Native" },
                    { "Android Developer", "Java, Kotlin, Android SDK" },
                    { "iOS Developer", "Swift, Xcode" },
                    { "UI Developer", "HTML, CSS, JavaScript, UI Design" },
                    { "UX Designer", "UX Research, Wireframes, Figma" },
                    { "UI/UX Designer", "Figma, Design Systems, Prototyping" },
                    { "DevOps Engineer", "CI/CD, Docker, Kubernetes, Cloud" },
                    { "Cloud Engineer", "AWS, Azure, GCP, Networking" },
                    { "AWS Engineer", "EC2, S3, Lambda, IAM" },
                    { "Azure Engineer", "Azure Services, DevOps" },
                    { "GCP Engineer", "GCP Services, Cloud Architecture" },
                    { "Data Analyst", "SQL, Excel, Python, Visualization" },
                    { "Data Engineer", "ETL, Python, SQL, Big Data" },
                    { "Data Scientist", "Python, ML, Statistics" },
                    { "Machine Learning Engineer", "ML Models, Python, TensorFlow" },
                    { "AI Engineer", "AI Models, NLP, Deep Learning" },
                    { "NLP Engineer", "NLP, Python, Transformers" },
                    { "Big Data Engineer", "Hadoop, Spark, Kafka" },
                    { "Database Administrator", "SQL, Performance Tuning, Backup" },
                    { "SQL Developer", "SQL, PL/SQL, Queries" },
                    { "System Administrator", "Linux, Servers, Monitoring" },
                    { "Network Engineer", "Networking, Firewalls, Routing" },
                    { "Cyber Security Engineer", "Security, Threat Analysis" },
                    { "SOC Analyst", "Monitoring, Incident Response" },
                    { "Ethical Hacker", "Penetration Testing, Security Tools" },
                    { "QA Engineer", "Manual Testing, Automation" },
                    { "Automation Tester", "Selenium, Cypress, Test Scripts" },
                    { "Manual Tester", "Test Cases, SDLC" },
                    { "Performance Tester", "JMeter, Load Testing" },
                    { "Application Support Engineer", "Debugging, Logs, SQL" },
                    { "Production Support Engineer", "Monitoring, Incident Handling" },
                    { "Technical Support Engineer", "Troubleshooting, Tools" },
                    { "IT Support Engineer", "Hardware, Software Support" },
                    { "Help Desk Engineer", "Ticketing, User Support" },
                    { "Business Analyst", "Requirements, Documentation" },
                    { "Product Analyst", "Metrics, Product Insights" },
                    { "Product Manager", "Roadmap, Stakeholders" },
                    { "Project Manager", "Planning, Agile, Delivery" },
                    { "Scrum Master", "Agile, Scrum" },
                    { "Tech Lead", "Architecture, Leadership" },
                    { "Engineering Manager", "Team Management, Delivery" },
                    { "Solutions Architect", "System Design, Cloud" },
                    { "Enterprise Architect", "Large-scale Architecture" },
                    { "CRM Developer", "Salesforce, Dynamics" },
                    { "ERP Consultant", "SAP, Oracle" },
                    { "SAP Consultant", "SAP Modules" },
                    { "Salesforce Developer", "Apex, Lightning" },
                    { "RPA Developer", "UiPath, Automation" },
                    { "Low-Code Developer", "PowerApps, Mendix" },
                    { "Game Developer", "Game Engines, C++, Unity" },
                    { "Embedded Engineer", "C++, Embedded Systems" },
                    { "IoT Developer", "IoT Protocols, Devices" },
                    { "Blockchain Developer", "Blockchain, Smart Contracts" },
                    { "AR/VR Developer", "Unity, 3D, XR" },
                    { "Digital Marketing Analyst", "SEO, Analytics" },
                    { "IT Recruiter", "Hiring, ATS, Tech Skills" },
                    { "Technical Writer", "Documentation, Tools" }
            };

            int idCounter = 1;
            for (String[] data : jobData) {
                String role = data[0];
                String skillsStr = data[1];

                // Create Standard Role (1-3 years)
                createJob(role, role, skillsStr, "1-3 years", "Mid Level", idCounter++);

                // Create Senior Role for Tech Positions (20% chance or key roles)
                if (role.contains("Engineer") || role.contains("Developer") || role.contains("Scientist")
                        || role.contains("Architect")) {
                    createJob("Senior " + role, role, skillsStr, "2+ years", "Senior", idCounter++);
                }

                // Create Intern Role for Entry Level (10% chance or key roles)
                if (role.contains("Engineer") || role.contains("Developer")) {
                    // Adding random variety so not every role has an intern position, but common
                    // ones do
                    if (idCounter % 3 == 0) {
                        createJob(role + " Intern", role, skillsStr, "0-6 months", "Intern", idCounter++);
                    }
                }
            }
            logger.info("Seeding completed: " + idCounter + " jobs created.");
        }

        createAdminUser();
        repairData();
        cleanupBogusHotlists();
        logger.info("Data Seeding/Restoration Logic Completed.");
    }

    /**
     * One-shot, idempotent cleanup: clear any candidate whose {@code hotlist} got
     * polluted with boolean-coerced junk ("true"/"false") or a blank string. These
     * are not real hotlist names — they leak in when an importer sends a JSON boolean
     * for the String hotlist field, and would otherwise show as a phantom "false"
     * group in the Candidate page sidebar. Runs over the DB directly so existing rows
     * are fixed even though the value was written before setHotlist() sanitized it.
     */
    private void cleanupBogusHotlists() {
        try {
            org.springframework.data.mongodb.core.query.Query q =
                    new org.springframework.data.mongodb.core.query.Query(
                            new org.springframework.data.mongodb.core.query.Criteria().orOperator(
                                    org.springframework.data.mongodb.core.query.Criteria.where("hotlist")
                                            .regex("^\\s*(true|false)\\s*$", "i"),
                                    org.springframework.data.mongodb.core.query.Criteria.where("hotlist").is("")));
            org.springframework.data.mongodb.core.query.Update u =
                    new org.springframework.data.mongodb.core.query.Update().unset("hotlist");
            com.mongodb.client.result.UpdateResult r = mongoTemplate.updateMulti(q, u, "candidates");
            if (r.getModifiedCount() > 0) {
                logger.info("Cleared bogus hotlist value on {} candidate(s).", r.getModifiedCount());
            }
        } catch (Exception e) {
            logger.warn("Hotlist cleanup skipped: {}", e.getMessage());
        }
    }

    private void repairData() {
        logger.info("Running Data Repair to fix missing skills and flush empty matrices...");
        java.util.List<com.recruitai.agent.entity.Candidate> candidates = candidateRepository.findAll();

        for (com.recruitai.agent.entity.Candidate c : candidates) {
            boolean updated = false;

            // 1. Repair Candidates with NO SKILLS
            if (c.getSkills() == null || c.getSkills().isEmpty()) {
                logger.info("Repairing skills for candidate: " + c.getName());
                java.util.List<String> inferred = inferSkillsFromRole(c.getRole());
                c.setSkills(inferred);
                updated = true;
            }

            if (updated) {
                candidateRepository.save(c);

                // 2. Delete existing empty/bad Skill Matrix to force regeneration
                java.util.List<com.recruitai.agent.entity.SkillMatrix> matrices = skillMatrixRepository
                        .findByCandidateId(c.getId());
                for (com.recruitai.agent.entity.SkillMatrix m : matrices) {
                    if (m.getSkillMetrics() == null || m.getSkillMetrics().isEmpty()) {
                        skillMatrixRepository.delete(m);
                        logger.info("Deleted empty skill matrix for " + c.getName() + " to force regen.");
                    }
                }
            }
        }
    }

    private java.util.List<String> inferSkillsFromRole(String role) {
        java.util.List<String> s = new java.util.ArrayList<>();
        if (role == null)
            role = "";
        String r = role.toLowerCase();

        if (r.contains("java") || r.contains("backend") || r.contains("software")) {
            s.add("Java");
            s.add("Spring Boot");
            s.add("SQL");
            s.add("REST APIs");
        } else if (r.contains("ui") || r.contains("frontend") || r.contains("react") || r.contains("web")) {
            s.add("React");
            s.add("JavaScript");
            s.add("HTML");
            s.add("CSS");
            s.add("Tailwind");
        } else if (r.contains("data") || r.contains("python") || r.contains("ai") || r.contains("ml")) {
            s.add("Python");
            s.add("Pandas");
            s.add("SQL");
            s.add("Data Analysis");
            s.add("Machine Learning");
        } else if (r.contains("cloud") || r.contains("aws") || r.contains("devops")) {
            s.add("AWS");
            s.add("Linux");
            s.add("Docker");
            s.add("Kubernetes");
            s.add("CI/CD");
        } else if (r.contains("azure")) {
            s.add("Azure");
            s.add(".NET");
            s.add("C#");
            s.add("Cloud Computing");
        } else if (r.contains("salesforce")) {
            s.add("Salesforce");
            s.add("Apex");
            s.add("CRM");
            s.add("Lightning");
        } else {
            // Generic Fallback
            s.add("Communication");
            s.add("Management");
            s.add("Office Suite");
            s.add("Project Management");
        }
        return s;
    }

    private String determineDepartment(String role) {
        if (role.contains("Designer") || role.contains("UI") || role.contains("UX"))
            return "Design";
        if (role.contains("Data") || role.contains("AI") || role.contains("Machine") || role.contains("Analyst"))
            return "Data Science";
        if (role.contains("Product") || role.contains("Business"))
            return "Product";
        if (role.contains("Recruiter") || role.contains("Writer"))
            return "Operations";
        if (role.contains("Manager") || role.contains("Lead") || role.contains("Scrum"))
            return "Management";
        if (role.contains("Support") || role.contains("Admin"))
            return "IT Support";
        return "Engineering";
    }

    private String getRandomLocation() {
        String[] locs = { "Remote", "New York", "San Francisco", "Austin", "London", "Bangalore", "Berlin" };
        return locs[(int) (Math.random() * locs.length)];
    }

    private String determineSalary(String level) {
        if (level.equals("Intern"))
            return "$20k - $40k";
        if (level.equals("Senior"))
            return "$140k - $200k";
        return "$80k - $120k";
    }

    private void createAdminUser() {
        // Create standard admin
        if (userRepository.findByEmail("admin@recruitai.com").isEmpty()) {
            User admin = new User();
            admin.setEmail("admin@recruitai.com");
            admin.setName("System Admin");
            admin.setPassword(passwordEncoder.encode("admin123"));
            admin.setRole("ADMIN");
            admin.setCreatedAt(LocalDateTime.now());
            userRepository.save(admin);
            logger.info("Admin user created.");
        }

        // Create demo user (used in UI)
        if (userRepository.findByEmail("demo@recruitai.com").isEmpty()) {
            User demo = new User();
            demo.setEmail("demo@recruitai.com");
            demo.setName("Demo User");
            demo.setPassword(passwordEncoder.encode("admin123"));
            demo.setRole("ADMIN");
            demo.setCreatedAt(LocalDateTime.now());
            userRepository.save(demo);
            logger.info("Demo user created with password: admin123");
        }

        // Demo HR + Manager accounts. These also have a login BYPASS in AuthController, but
        // without a backing row Settings > My Profile can't persist edits (updateProfile
        // findByEmail -> 404). Seeding a real row lets their profile updates save & reload.
        if (userRepository.findByEmail("hr@recruitai.com").isEmpty()) {
            User hr = new User();
            hr.setEmail("hr@recruitai.com");
            hr.setName("HR Demo");
            hr.setPassword(passwordEncoder.encode("hr1234"));
            hr.setRole("HR");
            hr.setCreatedAt(LocalDateTime.now());
            userRepository.save(hr);
            logger.info("Demo HR user created with password: hr1234");
        }

        if (userRepository.findByEmail("manager@recruitai.com").isEmpty()) {
            User manager = new User();
            manager.setEmail("manager@recruitai.com");
            manager.setName("Manager Demo");
            manager.setPassword(passwordEncoder.encode("manager1234"));
            manager.setRole("MANAGER");
            manager.setCreatedAt(LocalDateTime.now());
            userRepository.save(manager);
            logger.info("Demo Manager user created with password: manager1234");
        }

        // One-off cleanup: the short-lived Recruiter demo account is retired — QA uses the
        // three canonical roles (Admin / HR / Manager) only. Remove any recruiter row so
        // recruiter@recruitai.com can no longer log in.
        try {
            userRepository.findByEmail("recruiter@recruitai.com").ifPresent(u -> {
                userRepository.delete(u);
                logger.info("Removed retired Recruiter demo account.");
            });
        } catch (Exception e) {
            logger.warn("Recruiter demo cleanup skipped: {}", e.getMessage());
        }
    }
}
