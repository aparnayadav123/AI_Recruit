const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8089;
const UPSTREAM_URL = process.env.UPSTREAM_URL || 'https://recruitai-backend-bvo0.onrender.com/api';

app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

// Raw body parser for proxying so we preserve exact payloads
app.use(express.raw({ type: '*/*', limit: '50mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'recruitai-backend-local',
    upstream: UPSTREAM_URL,
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ ok: true, status: 'UP' });
});

// Proxy all requests under /api to Upstream (Render Spring Boot + MongoDB)
app.use('/api', async (req, res) => {
  const targetSubpath = req.path;
  const queryString = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
  const targetUrl = `${UPSTREAM_URL}${targetSubpath}${queryString}`;

  const forwardHeaders = { ...req.headers };
  delete forwardHeaders.host;
  delete forwardHeaders['content-length'];

  try {
    const fetchOptions = {
      method: req.method,
      headers: forwardHeaders,
    };

    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body && req.body.length > 0) {
      fetchOptions.body = req.body;
    }

    const upstreamResponse = await fetch(targetUrl, fetchOptions);

    res.status(upstreamResponse.status);
    upstreamResponse.headers.forEach((value, key) => {
      if (!['transfer-encoding', 'content-encoding', 'content-length'].includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });

    const arrayBuffer = await upstreamResponse.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (error) {
    console.error(`Proxy error for ${req.method} ${targetUrl}:`, error.message);
    res.status(502).json({
      error: 'Bad Gateway',
      message: error.message,
      targetUrl
    });
  }
});

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'RecruitAI Backend API',
    status: 'running',
    port: PORT,
    endpoints: {
      health: `http://localhost:${PORT}/api/health`,
      jobs: `http://localhost:${PORT}/api/jobs/public`,
      candidates: `http://localhost:${PORT}/api/candidates`
    }
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 RecruitAI Backend running on http://localhost:${PORT}`);
  console.log(`🔗 Upstream Spring Boot / MongoDB connected: ${UPSTREAM_URL}`);
  console.log(`✅ Health check: http://localhost:${PORT}/api/health`);
});
