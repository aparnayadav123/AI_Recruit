const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');

const app = express();
const port = 8089;

// In-memory data store
const collections = {
  candidates: [],
  jobs: [],
  job_applications: [],
  skill_matrix: []
};

let nextId = 1000;
const DB_FILE = 'recruits_db_v2.json';

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:3001', 'http://localhost:3003'],
  credentials: true
}));
app.use(express.json());

// --- PERSISTENCE HELPERS ---
const saveCandidates = () => {
  try {
    const data = {
      content: collections.candidates,
      totalElements: collections.candidates.length,
      totalPages: 1,
      size: collections.candidates.length,
      number: 0
    };
    const jsonStr = JSON.stringify(data, null, 2);
    fs.writeFileSync(DB_FILE, jsonStr);

    // Auto-backup
    if (!fs.existsSync('backups')) fs.mkdirSync('backups');
    const backupPath = path.join('backups', `candidates_${Date.now()}.json`);
    fs.writeFileSync(backupPath, jsonStr);

    console.log(`💾 Saved ${collections.candidates.length} candidates to ${DB_FILE} (and backup)`);
  } catch (err) {
    console.error('❌ Failed to save candidates:', err);
  }
};

// HELPER: Extract Info from Text
const extractInfoFromText = (text, availableJobs) => {
  const info = {
    name: '',
    email: '',
    phone: '',
    skills: [],
    experience: 0,
    role: 'Fresher',
    fitScore: 0
  };

  const textLower = text.toLowerCase();
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // 1. ADVANCED NAME EXTRACTION
  for (let i = 0; i < Math.min(15, lines.length); i++) {
    const line = lines[i];
    if (line.length < 5 || line.length > 35) continue;
    if (/resume|curriculum|vitae|profile|email|phone|contact|address|phone|mobile|summary|objective/i.test(line)) continue;
    if (/\d/.test(line)) continue;

    const words = line.split(/\s+/);
    if (words.length >= 2 && words.length <= 4) {
      const isTitleCase = words.every(w => /^[A-Z]/.test(w));
      if (isTitleCase || i < 3) {
        info.name = line.replace(/[^\w\s]/g, '').trim();
        break;
      }
    }
  }

  // 2. EMAIL EXTRACTION
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emails = text.match(emailRegex);
  if (emails) info.email = emails[0].toLowerCase();

  // 3. PHONE EXTRACTION
  const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  const phones = text.match(phoneRegex);
  if (phones) info.phone = phones[0].replace(/[^0-9+]/g, '');

  // 4. EXTENSIVE SKILL EXTRACTION
  const skillsList = [
    "Java", "Python", "JavaScript", "TypeScript", "C#", "C++", "Golang", "Go", "Rust", "Swift", "Kotlin", "PHP", "Ruby", "Scale", "Dart",
    "React", "React.js", "Angular", "Vue", "Vue.js", "Next.js", "Nuxt.js", "Svelte", "Redux", "Zustand", "Tailwind", "Bootstrap", "HTML5", "CSS3", "SASS", "LESS", "Webpack", "Vite", "Material UI", "Chakra UI",
    "Node.js", "Express", "NestJS", "Spring Boot", "Spring Cloud", "Django", "Flask", "FastAPI", "Laravel", "Rails", "ASP.NET", ".NET Core", "Hibernate", "Entity Framework",
    "MySQL", "PostgreSQL", "MongoDB", "Redis", "Elasticsearch", "Cassandra", "DynamoDB", "Firebase", "Oracle", "SQL Server", "SQLite", "MariaDB",
    "AWS", "Azure", "GCP", "Google Cloud", "DigitalOcean", "Heroku", "Lambda", "EC2", "S3", "CloudFront", "Docker", "Kubernetes", "Jenkins", "Terraform", "Ansible", "Nginx", "Linux", "Ubuntu", "Debian",
    "Machine Learning", "Deep Learning", "Artificial Intelligence", "AI", "NLP", "Computer Vision", "TensorFlow", "PyTorch", "Scikit-Learn", "Pandas", "NumPy", "OpenCV", "Generative AI", "LLM", "Agentic AI", "OpenAI",
    "OAuth2", "JWT", "Auth0", "CI/CD", "Git", "GitHub", "GitLab CI", "CircleCI", "Splunk", "Grafana", "Prometheus",
    "Selenium", "Cypress", "Jest", "Mocha", "Playwright", "JUnit", "Unit Testing", "Automation Testing", "Manual Testing", "Cucumber",
    "Jira", "Confluence", "Agile", "Scrum", "Kanban", "Figma", "Adobe Photoshop", "Canva", "Trello", "Slack"
  ];

  info.skills = skillsList.filter(skill => {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    return regex.test(text);
  });
  info.skills = [...new Set(info.skills)];

  // 5. EVIDENCE-BASED EXPERIENCE EXTRACTION
  let totalExp = 0;

  // A. Explicit Mentions (High Confidence)
  // "Subject: 5 years experience" or "Total Exp: 4.5 Years"
  const explicitMatch = text.match(/(?:total|overall|relevant|work)?\s*experience\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(?:years?|yrs?)/i) ||
    text.match(/(?:summary|profile)[\s\S]{0,100}(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)\s*(?:of)?\s*experience/i);

  if (explicitMatch) {
    totalExp = parseFloat(explicitMatch[1]);
  } else {
    // B. Date Range Calculation (Medium Confidence)
    // Looks for "Month YYYY - Month YYYY" or "Present"
    // Regex matches: (Jan...Dec) (YYYY) ... (Jan...Dec|Present) (YYYY)
    const dateRegex = /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[-.\s,']+(\d{4})\s*[-–to]+(?:\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[-.\s,']+(\d{4})|Present|Current|Now)\b/gi;

    let ranges = [];
    let match;
    while ((match = dateRegex.exec(text)) !== null) {
      // Context Check: Ignore if line contains education terms
      const snippet = text.substring(Math.max(0, match.index - 60), Math.min(text.length, match.index + 60)).toLowerCase();
      if (snippet.includes('education') || snippet.includes('bachelor') || snippet.includes('master') || snippet.includes('degree') || snippet.includes('university') || snippet.includes('college') || snippet.includes('school')) {
        continue;
      }

      const startYear = parseInt(match[1]);
      let endYear = match[2] ? parseInt(match[2]) : new Date().getFullYear();

      // Sanity check: Start year > 1980, End year <= Current + 1
      if (startYear > 1980 && endYear <= new Date().getFullYear() + 1 && endYear >= startYear) {
        ranges.push(endYear - startYear);
      }
    }

    if (ranges.length > 0) {
      // Sum non-overlapping ranges (simplified: just largest single range for now to avoid duplications)
      // Or sum them? Let's take the max range as a safe floor, or sum if clearly distinct. 
      // For simplicity and safety: Sum, but cap at 10 if heuristic.
      totalExp = ranges.reduce((a, b) => a + b, 0);
    }
  }

  // C. Keyword Overrides
  const isFresher = /(?:fresh|entry level|graduate trainee|internship only)/i.test(text);
  if (isFresher && totalExp > 1) {
    totalExp = 0; // Force fresher if explicitly stated
  }

  // D. Sanity Limits
  if (totalExp > 40) totalExp = 0; // Garbage value
  info.experience = Math.round(totalExp * 10) / 10;

  // 6. DYNAMIC JOB MATCHING
  let bestJob = null;
  let maxScore = 0;

  collections.jobs.forEach(job => {
    let score = 0;
    const reqSkills = job.requiredSkills || job.skills?.map(s => s.name || s) || [];

    if (reqSkills.length > 0) {
      const matched = info.skills.filter(s =>
        reqSkills.some(req => s.toLowerCase() === req.toLowerCase() || req.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(req.toLowerCase()))
      );
      score += (matched.length / Math.min(reqSkills.length, 10)) * 60;
    } else score += 30;

    const jobMinExp = job.minExperience || 0;
    if (info.experience >= jobMinExp) score += 30;
    else score += (info.experience / Math.max(jobMinExp, 1)) * 30;

    if (textLower.includes(job.title.toLowerCase())) score += 10;

    if (score > maxScore) {
      maxScore = score;
      bestJob = job;
    }
  });

  if (bestJob) {
    info.role = bestJob.title;
    info.fitScore = Math.min(Math.round(maxScore), 98);
  } else {
    if (info.skills.includes("React")) info.role = "Frontend Developer";
    else if (info.skills.includes("Node.js")) info.role = "Backend Developer";
    else info.role = "Software Professional";
    info.fitScore = Math.min(30 + info.skills.length * 2, 45);
  }

  if (info.experience < 1 && !info.role.includes("Intern")) info.role += " Intern";
  // 7. DYNAMIC SKILL SCORING (For Matrix)
  // Calculate individual skill proficiency based on experience + frequency in text
  info.skillScores = {};
  const baseScore = info.experience < 1 ? 60 : Math.min(60 + (info.experience * 5), 85);

  info.skills.forEach(skill => {
    // Count occurrences (rough proxy for emphasis/proficiency)
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const count = (text.match(new RegExp(`\\b${escaped}\\b`, 'gi')) || []).length;

    // Logic: Base + (Frequency * 2) + Variance
    let score = baseScore + (count * 2);

    // Boost specifically mentioned "primary" skills if context suggests (simplified)
    if (count > 5) score += 5;

    // Final Strict Cap at 100
    if (score > 100) score = 100;

    info.skillScores[skill] = Math.round(score);
  });

  return info;
};

// REPAIR FUNCTION
const repairCandidates = async () => {
  const log = (msg) => {
    console.log(msg);
    fs.appendFileSync('repair.log', `[${new Date().toISOString()}] ${msg}\n`);
  };

  log('🚀 Starting Deep Resume-Based Repair...');

  // 1. Process each candidate against their SPECIFIC resume if linked
  let repairCount = 0;
  for (const candidate of collections.candidates) {
    if (candidate.resumeId && fs.existsSync(path.join('uploads', candidate.resumeId))) {
      log(`📄 Processing attached resume for ${candidate.name}: ${candidate.resumeId}`);
      try {
        const filePath = path.join('uploads', candidate.resumeId);
        let text = '';

        if (candidate.resumeId.endsWith('.pdf')) {
          const data = await pdf(fs.readFileSync(filePath));
          text = data.text;
        } else if (candidate.resumeId.endsWith('.docx')) {
          const result = await mammoth.extractRawText({ path: filePath });
          text = result.value;
        } else {
          try { text = fs.readFileSync(filePath, 'utf8'); } catch (e) { }
        }

        if (text) {
          const extracted = extractInfoFromText(text, collections.jobs);
          // Apply updates - Force update valid fields
          if (extracted.name && extracted.name.length > 2) candidate.name = extracted.name;
          if (extracted.email) candidate.email = extracted.email;
          if (extracted.phone && extracted.phone.length > 5) candidate.phone = extracted.phone;
          candidate.skills = extracted.skills;
          candidate.experience = extracted.experience;
          candidate.role = extracted.role;
          candidate.fitScore = extracted.fitScore;
          candidate.skillScores = extracted.skillScores; // New field

          repairCount++;
          log(`✅ Updated ${candidate.name} from resume file.`);
        }
      } catch (e) {
        log(`❌ Failed to parse ${candidate.resumeId}: ${e.message}`);
      }
    } else {
      // Fallback: Global search (Existing logic) is skipped if resumeId is missing to avoid bad matches, 
      // or we can keep it if you prefer. For now, strict ResumeID is safer.
      log(`⚠️ No linked resume found for ${candidate.name} (${candidate.id})`);
    }
  }

  if (repairCount > 0) {
    log(`✅ Successfully repaired/updated ${repairCount} candidates.`);
    saveCandidates();
  } else {
    log('No candidates were updated.');
  }
};


// DATA LOADING
const loadData = async () => {
  console.log('🔄 Starting deep data recovery...');
  try {
    if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

    // Recovery order for Job Data
    const jobSources = ['jobs.json', 'jobs_v2.json', 'jobs_v3.json', 'jobs_dump.json', 'jobs_clean.json', 'jobs_final.json', 'jobs_list.json'];
    for (const source of jobSources) {
      if (fs.existsSync(source)) {
        try {
          let data = fs.readFileSync(source, 'utf8');
          if (data.charCodeAt(0) === 0xFEFF) data = data.slice(1);
          if (data.trim() && data !== '[object Object]') {
            const json = JSON.parse(data);
            const content = json.content || json || [];
            if (Array.isArray(content) && content.length > collections.jobs.length) {
              collections.jobs = content;
              console.log(`✅ Loaded ${collections.jobs.length} jobs from ${source}`);
            }
          }
        } catch (e) { /* next */ }
      }
    }

    // Recovery order for Candidate Data
    let loadedFromActive = false;
    if (fs.existsSync(DB_FILE)) {
      try {
        let data = fs.readFileSync(DB_FILE, 'utf8');
        if (data.charCodeAt(0) === 0xFEFF) data = data.slice(1);
        if (data.trim() && data.length > 5 && data !== '[object Object]') {
          const json = JSON.parse(data);
          collections.candidates = json.content || json || [];
          if (collections.candidates.length > 0) {
            loadedFromActive = true;
            console.log(`✅ Loaded ${collections.candidates.length} candidates from active DB.`);
          }
        }
      } catch (e) { console.warn('⚠️ Active DB failed, trying seeds...'); }
    }

    if (!loadedFromActive || collections.candidates.length === 0) {
      const candidateSeeds = ['candidates_v3.json', 'candidates_dump.json', 'candidates_final.json', 'candidates_clean.json'];
      for (const seed of candidateSeeds) {
        if (fs.existsSync(seed)) {
          try {
            console.log(`🔍 Trying recovery from ${seed}...`);
            let data = fs.readFileSync(seed, 'utf8');
            if (data.charCodeAt(0) === 0xFEFF) data = data.slice(1);
            if (data.trim() && data !== '[object Object]') {
              const json = JSON.parse(data);
              const content = json.content || json || [];
              if (Array.isArray(content) && content.length > collections.candidates.length) {
                collections.candidates = content;
                console.log(`🎯 Successfully recovered ${collections.candidates.length} candidates from ${seed}`);
              }
            }
          } catch (e) { /* try next */ }
        }
      }

      if (collections.candidates.length > 0) {
        console.log('💾 Persisting recovered data to active DB...');
        saveCandidates();
      }
    }

    // Initialize nextId
    collections.candidates.forEach(c => {
      const parts = String(c.id).split('-');
      if (parts.length > 1) {
        const num = parseInt(parts[1]);
        if (!isNaN(num) && num >= nextId) nextId = num + 1;
      }
    });

    // Matrix Recovery
    if (fs.existsSync('matrix_utf8.json')) {
      try {
        const data = fs.readFileSync('matrix_utf8.json', 'utf8');
        if (data.trim() && data !== '[object Object]') {
          const json = JSON.parse(data);
          collections.skill_matrix = json.content || json || [];
          console.log(`📊 Loaded ${collections.skill_matrix.length} matrix records.`);
        }
      } catch (e) { console.warn('⚠️ Matrix load skipped.'); }
    }

    await repairCandidates();
  } catch (err) {
    console.error('❌ Critical Error during loadData:', err.message);
    fs.appendFileSync('simulator_error.log', `[${new Date().toISOString()}] Critical Load Error: ${err.message}\n`);
  }
};

loadData();

// HELPER: Generate Mock Matrix Data
const generateMockMatrix = (candidate) => {
  collections.jobs.forEach(job => {
    const exists = collections.skill_matrix.find(m => m.candidateId === candidate.id && m.jobId === job.id);
    if (!exists) {
      collections.skill_matrix.push({
        id: Math.random().toString(36).substr(2, 9),
        candidateId: candidate.id,
        candidateName: candidate.name,
        jobId: job.id,
        jobTitle: job.title,
        totalScore: Math.floor(Math.random() * 40) + 60,
        skillMetrics: (job.skills || []).map(skill => ({
          skill: skill.name || skill,
          percentage: Math.floor(Math.random() * 40) + 60,
          justification: "Simulated match based on resume analysis."
        })),
        updatedAt: new Date().toISOString()
      });
    }
  });
};

/* ===================== ROUTES ===================== */

app.get('/api', (req, res) => res.json({ status: 'running', candidates: collections.candidates.length }));
app.get('/api/health', (req, res) => res.json({ ok: true }));

// --- DASHBOARD STATS (Must be before /api/candidates/:id) ---

app.get('/api/candidates/statistics', (req, res) => {
  try {
    console.log('GET /api/candidates/statistics called');
    const today = new Date().toISOString().split('T')[0];
    const stats = {
      total: collections.candidates.length,
      interview: collections.candidates.filter(c => c && (c.status === 'Interview' || c.status === 'Shortlisted')).length,
      shortlisted: collections.candidates.filter(c => c && c.status === 'Shortlisted').length,
      resumesToday: collections.candidates.filter(c => c && c.createdAt && typeof c.createdAt === 'string' && c.createdAt.startsWith(today)).length
    };
    console.log('Stats:', stats);
    res.json(stats);
  } catch (err) {
    console.error('Error in /api/candidates/statistics:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/jobs/statistics', (req, res) => {
  try {
    res.json({
      open: collections.jobs.filter(j => j && (j.status === 'Open' || !j.status)).length,
      total: collections.jobs.length
    });
  } catch (err) {
    console.error('Error in /api/jobs/statistics:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/jobs/distribution', (req, res) => {
  try {
    const distribution = {};
    const total = collections.jobs.length || 1;
    collections.jobs.forEach(j => {
      if (j) {
        const dept = j.department || 'Other';
        distribution[dept] = (distribution[dept] || 0) + 1;
      }
    });

    // Convert to percentages
    Object.keys(distribution).forEach(key => {
      distribution[key] = Math.round((distribution[key] / total) * 100);
    });

    res.json(distribution);
  } catch (err) {
    console.error('Error in /api/jobs/distribution:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/candidates/trends', (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const now = new Date();
    const trends = {};

    // Initialize map
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      trends[dateStr] = 0;
    }

    // Fill counts
    collections.candidates.forEach(c => {
      if (c && c.createdAt && typeof c.createdAt === 'string') {
        const dateStr = c.createdAt.split('T')[0];
        if (trends.hasOwnProperty(dateStr)) {
          trends[dateStr]++;
        }
      }
    });

    res.json(trends);
  } catch (err) {
    console.error('Error in /api/candidates/trends:', err);
    res.status(500).json({ error: err.message });
  }
});

// --- END DASHBOARD STATS ---

app.get('/api/candidates', (req, res) => {
  const page = parseInt(req.query.page) || 0;
  const size = parseInt(req.query.size) || 10;
  const sorted = [...collections.candidates].reverse();
  const paginated = sorted.slice(page * size, (page + 1) * size);
  res.json({
    content: paginated,
    totalElements: collections.candidates.length,
    totalPages: Math.ceil(collections.candidates.length / size),
    size: size,
    number: page
  });
});

app.post('/api/resumes/upload', multer({
  storage: multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`)
  })
}).single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    let extractedText = '';
    // Basic Handling for different file types
    if (req.file.mimetype === 'application/pdf') {
      const data = await pdf(fs.readFileSync(req.file.path));
      extractedText = data.text;
    } else {
      // For TXT or others, try reading as string
      try {
        extractedText = fs.readFileSync(req.file.path, 'utf8');
      } catch (e) { /* ignore */ }
    }

    const extracted = extractInfoFromText(extractedText, collections.jobs);
    const newCandidate = {
      id: `CAN-${nextId++}`,
      name: extracted.name || req.file.originalname.split('.')[0],
      email: extracted.email || 'pending@example.com',
      phone: extracted.phone || 'NOT_FOUND',
      role: extracted.role,
      experience: extracted.experience,
      skills: extracted.skills,
      status: 'New',
      fitScore: extracted.fitScore,
      resumeId: req.file.filename,
      createdAt: new Date().toISOString(),
      source: 'Upload'
    };
    collections.candidates.push(newCandidate);
    saveCandidates();
    generateMockMatrix(newCandidate);
    res.json(newCandidate);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/candidates/:id', (req, res) => {
  const c = collections.candidates.find(c => String(c.id) === String(req.params.id));
  c ? res.json(c) : res.status(404).send();
});

app.delete('/api/candidates/:id', (req, res) => {
  collections.candidates = collections.candidates.filter(c => String(c.id) !== String(req.params.id));
  saveCandidates();
  res.status(204).send();
});

app.get('/api/jobs', (req, res) => {
  res.json({ content: collections.jobs, totalElements: collections.jobs.length });
});

app.get('/api/skill-matrix/job/:id', (req, res) => {
  res.json(collections.skill_matrix.filter(m => String(m.jobId) === String(req.params.id)));
});

app.get('/api/resumes/:id', (req, res) => {
  const filePath = path.join(__dirname, 'uploads', req.params.id);
  if (fs.existsSync(filePath)) res.download(filePath);
  else res.status(404).send();
});

// Mock Endpoints to silence 404s
app.get('/api/interviews', (req, res) => res.json([]));
app.get('/api/notifications', (req, res) => res.json([]));

app.listen(port, () => console.log(`🚀 Simulator running on http://localhost:${port}`));
