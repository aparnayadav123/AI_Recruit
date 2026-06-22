const fs = require('fs');

const candidates = [
    {
        "id": "CAN-216264",
        "name": "Anitha Boligerla",
        "email": "anithaboligerla1003@gmail.com",
        "phone": "9515057207",
        "role": "Automation Tester",
        "experience": 3,
        "skills": ["Java", "MySQL", "Selenium", "Jira"],
        "status": "New",
        "fitScore": 76,
        "resumeId": "1770380136507-B_Anitha_QA_Automation_Tester_2_Resume.pdf",
        "createdAt": "2026-02-06T12:15:36.804Z",
        "source": "Upload"
    },
    {
        "id": "CAN-216265",
        "name": "Mymoon Shaik",
        "email": "mymoonshaik004@gmail.com",
        "phone": "+919908648046",
        "role": "Backend Developer Intern",
        "experience": 0,
        "skills": ["Python", "React", "Node.js", "AI"],
        "status": "Shortlisted",
        "fitScore": 98,
        "resumeId": "1770380276834-Mymoon-Resume_2.pdf",
        "createdAt": "2026-02-06T12:17:57.042Z",
        "source": "Upload"
    },
    {
        "id": "CAN-216266",
        "name": "SHRIDHAR PATIL",
        "email": "shridharpatil.career@gmail.com",
        "phone": "+919665113160",
        "role": "DevOps Engineer Intern",
        "experience": 0,
        "skills": ["Python", "AWS", "Docker", "Kubernetes"],
        "status": "New",
        "fitScore": 77,
        "resumeId": "1770380341348-Shridhar_Patil_Resume_2025_2.docx",
        "createdAt": "2026-02-05T12:19:01.367Z",
        "source": "Upload"
    },
    {
        "id": "CAN-216267",
        "name": "MNSRESUME",
        "email": "maddanaprathap@gmail.com",
        "phone": "8919545342",
        "role": "Backend Developer Intern",
        "experience": 0,
        "skills": ["Java", "Oracle"],
        "status": "Interview",
        "fitScore": 60,
        "resumeId": "1770381156592-MNSRESUME.pdf",
        "createdAt": "2026-02-04T12:32:36.841Z",
        "source": "Upload"
    }
];

const jobs = [
    {
        "id": "JOB-1001",
        "title": "Software Engineer",
        "department": "Engineering",
        "status": "Open",
        "createdAt": "2026-02-01T10:00:00.000Z"
    },
    {
        "id": "JOB-1002",
        "title": "Data Scientist",
        "department": "Data",
        "status": "Open",
        "createdAt": "2026-02-02T11:00:00.000Z"
    }
];

fs.writeFileSync('recruits_db_v2.json', JSON.stringify({ content: candidates }, null, 2), 'utf8');
fs.writeFileSync('jobs_v2.json', JSON.stringify(jobs, null, 2), 'utf8');

console.log('Reset DB successfully.');
