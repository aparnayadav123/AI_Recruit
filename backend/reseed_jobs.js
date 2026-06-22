const axios = require('axios');

const API_BASE_URL = 'http://localhost:8089/api/jobs';

const jobsToCreate = [
    {
        title: "Full Stack Developer",
        requiredSkills: "HTML, CSS, JavaScript, React, Angular, Java, Python, Node.js, REST APIs, SQL, Git",
        type: "Full-time",
        experience: "2+ years"
    },
    {
        title: "Backend Developer",
        requiredSkills: "Java, Python, Node.js, Spring Boot, Django, Express, REST APIs, SQL, NoSQL, Security",
        type: "Full-time",
        experience: "2+ years"
    },
    {
        title: "Frontend Developer",
        requiredSkills: "HTML, CSS, JavaScript, React, Angular, Vue, UI/UX Basics",
        type: "Full-time",
        experience: "2+ years"
    },
    {
        title: "Software Tester (Manual)",
        requiredSkills: "Test Cases, SDLC, Bug Tracking, Functional Testing",
        type: "Full-time",
        experience: "1+ years"
    },
    {
        title: "Software Tester (Automation)",
        requiredSkills: "Selenium, Cypress, Java, Python, TestNG, JUnit, CI/CD",
        type: "Full-time",
        experience: "2+ years"
    },
    {
        title: "QA Engineer",
        requiredSkills: "Manual Testing, Automation Testing, Test Planning, Tools",
        type: "Full-time",
        experience: "2+ years"
    },
    {
        title: "Testing Intern",
        requiredSkills: "Manual Testing Basics, Test Cases, SDLC",
        type: "Internship",
        experience: "Fresher"
    },
    {
        title: "Full Stack Intern",
        requiredSkills: "HTML, CSS, JavaScript, Basic Backend, Git",
        type: "Internship",
        experience: "Fresher"
    },
    {
        title: "Backend Intern",
        requiredSkills: "Core Java, Python, SQL, APIs",
        type: "Internship",
        experience: "Fresher"
    },
    {
        title: "Frontend Intern",
        requiredSkills: "HTML, CSS, JavaScript Basics",
        type: "Internship",
        experience: "Fresher"
    }
];

async function run() {
    try {
        console.log("Fetching existing jobs...");
        const response = await axios.get(API_BASE_URL);
        const jobs = response.data.content || [];
        console.log(`Found ${jobs.length} jobs. Deleting...`);

        for (const job of jobs) {
            await axios.delete(`${API_BASE_URL}/${job.id}`);
            console.log(`Deleted job: ${job.title} (${job.id})`);
        }

        console.log("Creating new jobs...");
        for (const jobData of jobsToCreate) {
            const skillList = jobData.requiredSkills.split(',').map(s => ({
                name: s.trim(),
                weight: 10
            }));

            const payload = {
                title: jobData.title,
                description: `Responsible for ${jobData.title} tasks and collaborating with the team.`,
                company: "RecruitAI",
                location: "Hyderabad",
                department: "Engineering",
                employmentType: jobData.type,
                experienceLevel: jobData.experience,
                status: "Active",
                salary: "Competitive",
                skills: skillList,
                industry: "Technology",
                postedDate: "Today",
                deadline: "2026-12-31"
            };

            const createRes = await axios.post(API_BASE_URL, payload);
            console.log(`Created job: ${createRes.data.title}`);
        }

        console.log("All tasks completed successfully!");
    } catch (error) {
        console.error("An error occurred:", error.response ? error.response.data : error.message);
    }
}

run();
