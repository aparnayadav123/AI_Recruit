const express = require('express');
const cors = require('cors');

const app = express();
const port = 8080;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:3003'],
  credentials: true
}));
app.use(express.json());

// In-memory data store
let candidates = [];
let jobs = [];
let applications = [];
let nextId = 1;

// Root endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'RecruitAI Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      candidates: '/api/candidates',
      jobs: '/api/jobs',
      applications: '/api/applications'
    },
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// Health check endpoints
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'recruitai-agent-server',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/health/echo', (req, res) => {
  res.json({ received: req.body });
});

// Candidate endpoints
app.get('/api/candidates', (req, res) => {
  const page = parseInt(req.query.page) || 0;
  const size = parseInt(req.query.size) || 10;
  const start = page * size;
  const end = start + size;
  
  const paginatedCandidates = candidates.slice(start, end);
  res.json({
    content: paginatedCandidates,
    totalElements: candidates.length,
    totalPages: Math.ceil(candidates.length / size),
    size: size,
    number: page
  });
});

app.post('/api/candidates', (req, res) => {
  const candidate = {
    id: nextId++,
    ...req.body,
    status: req.body.status || 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  candidates.push(candidate);
  res.status(201).json(candidate);
});

app.get('/api/candidates/:id', (req, res) => {
  const candidate = candidates.find(c => c.id === parseInt(req.params.id));
  if (!candidate) {
    return res.status(404).json({ error: 'Candidate not found' });
  }
  res.json(candidate);
});

app.put('/api/candidates/:id', (req, res) => {
  const index = candidates.findIndex(c => c.id === parseInt(req.params.id));
  if (index === -1) {
    return res.status(404).json({ error: 'Candidate not found' });
  }
  candidates[index] = { ...candidates[index], ...req.body, updatedAt: new Date().toISOString() };
  res.json(candidates[index]);
});

app.patch('/api/candidates/:id/status', (req, res) => {
  const index = candidates.findIndex(c => c.id === parseInt(req.params.id));
  if (index === -1) {
    return res.status(404).json({ error: 'Candidate not found' });
  }
  candidates[index].status = req.query.status;
  candidates[index].updatedAt = new Date().toISOString();
  res.json(candidates[index]);
});

app.delete('/api/candidates/:id', (req, res) => {
  const index = candidates.findIndex(c => c.id === parseInt(req.params.id));
  if (index === -1) {
    return res.status(404).json({ error: 'Candidate not found' });
  }
  candidates.splice(index, 1);
  res.status(204).send();
});

app.get('/api/candidates/search', (req, res) => {
  const search = req.query.search.toLowerCase();
  const filtered = candidates.filter(c => 
    c.firstName.toLowerCase().includes(search) ||
    c.lastName.toLowerCase().includes(search) ||
    c.email.toLowerCase().includes(search) ||
    (c.skills && c.skills.toLowerCase().includes(search))
  );
  res.json({
    content: filtered,
    totalElements: filtered.length,
    totalPages: Math.ceil(filtered.length / 10),
    size: 10,
    number: 0
  });
});

app.get('/api/candidates/statistics', (req, res) => {
  const stats = {
    total: candidates.length,
    active: candidates.filter(c => c.status === 'ACTIVE').length,
    inactive: candidates.filter(c => c.status === 'INACTIVE').length,
    hired: candidates.filter(c => c.status === 'HIRED').length,
    rejected: candidates.filter(c => c.status === 'REJECTED').length
  };
  res.json(stats);
});

// Job endpoints
app.get('/api/jobs', (req, res) => {
  const page = parseInt(req.query.page) || 0;
  const size = parseInt(req.query.size) || 10;
  const start = page * size;
  const end = start + size;
  
  const paginatedJobs = jobs.slice(start, end);
  res.json({
    content: paginatedJobs,
    totalElements: jobs.length,
    totalPages: Math.ceil(jobs.length / size),
    size: size,
    number: page
  });
});

app.post('/api/jobs', (req, res) => {
  const job = {
    id: nextId++,
    ...req.body,
    status: req.body.status || 'OPEN',
    postedDate: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  jobs.push(job);
  res.status(201).json(job);
});

// Start server
app.listen(port, () => {
  console.log(`🚀 RecruitAI Backend Server running on http://localhost:${port}`);
  console.log(`📊 Health endpoint: http://localhost:${port}/api/health`);
  console.log(`👥 Candidates endpoint: http://localhost:${port}/api/candidates`);
  console.log(`💼 Jobs endpoint: http://localhost:${port}/api/jobs`);
  console.log(`🔗 Ready for frontend connections!`);
});
