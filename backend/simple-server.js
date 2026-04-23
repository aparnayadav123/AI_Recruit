const express = require('express');
const cors = require('cors');

const app = express();
const port = 8080;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3003', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'recruitai-agent-server',
    timestamp: new Date().toISOString()
  });
});

// Echo endpoint
app.post('/api/health/echo', (req, res) => {
  res.json({ received: req.body });
});

// Start server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  console.log(`Health endpoint: http://localhost:${port}/api/health`);
});
