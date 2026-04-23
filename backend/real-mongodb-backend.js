const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
const port = 8080;

// MongoDB connection
const mongoUri = 'mongodb://localhost:27017/recruitai';
const client = new MongoClient(mongoUri);
let db;

// Connect to MongoDB
async function connectToMongoDB() {
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB successfully!');
    db = client.db('recruitai');
    
    // Create collections with validation
    await db.createCollection('candidates', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['firstName', 'lastName', 'email'],
          properties: {
            firstName: { bsonType: 'string', description: 'must be a string' },
            lastName: { bsonType: 'string', description: 'must be a string' },
            email: { bsonType: 'string', description: 'must be a string' },
            phone: { bsonType: 'string' },
            skills: { bsonType: 'string' },
            experienceYears: { bsonType: 'int' },
            resumeUrl: { bsonType: 'string' },
            status: { bsonType: 'string', enum: ['ACTIVE', 'INACTIVE', 'HIRED', 'REJECTED'] }
          }
        }
      }
    });

    await db.createCollection('jobs', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['title', 'description', 'employmentType'],
          properties: {
            title: { bsonType: 'string' },
            description: { bsonType: 'string' },
            location: { bsonType: 'string' },
            department: { bsonType: 'string' },
            employmentType: { bsonType: 'string', enum: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'REMOTE'] },
            minSalary: { bsonType: 'double' },
            maxSalary: { bsonType: 'double' },
            requirements: { bsonType: 'string' },
            status: { bsonType: 'string', enum: ['OPEN', 'CLOSED', 'DRAFT', 'ON_HOLD'] }
          }
        }
      }
    });

    await db.createCollection('job_applications', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['candidateId', 'jobId'],
          properties: {
            candidateId: { bsonType: 'long' },
            jobId: { bsonType: 'long' },
            status: { bsonType: 'string', enum: ['PENDING', 'UNDER_REVIEW', 'SHORTLISTED', 'REJECTED', 'HIRED', 'WITHDRAWN'] },
            appliedDate: { bsonType: 'date' },
            resumeUrl: { bsonType: 'string' },
            coverLetter: { bsonType: 'string' },
            notes: { bsonType: 'string' }
          }
        }
      }
    });

    console.log('✅ Collections created/validated successfully');
    console.log('🗄️  Database: recruitai');
    console.log('📊 Collections: candidates, jobs, job_applications');
    
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:3001', 'http://localhost:3003'],
  credentials: true
}));
app.use(express.json());

// Helper function to generate IDs
let nextId = 1;
async function getNextId(collectionName) {
  const lastDoc = await db.collection(collectionName).find().sort({ id: -1 }).limit(1).toArray();
  return lastDoc.length > 0 ? lastDoc[0].id + 1 : 1;
}

// Root endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'RecruitAI Backend API (Real MongoDB)',
    version: '1.0.0',
    database: 'MongoDB',
    connection: mongoUri,
    collections: ['candidates', 'jobs', 'job_applications'],
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
app.get('/api/health', async (req, res) => {
  try {
    await db.admin().ping();
    res.json({
      ok: true,
      service: 'recruitai-agent-mongodb',
      database: 'MongoDB',
      connected: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      service: 'recruitai-agent-mongodb',
      database: 'MongoDB',
      connected: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/health/echo', (req, res) => {
  res.json({ received: req.body });
});

// Candidates endpoints
app.get('/api/candidates', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 0;
    const size = parseInt(req.query.size) || 10;
    const skip = page * size;
    
    const candidates = await db.collection('candidates')
      .find({})
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(size)
      .toArray();
    
    const total = await db.collection('candidates').countDocuments();
    
    res.json({
      content: candidates,
      totalElements: total,
      totalPages: Math.ceil(total / size),
      size: size,
      number: page
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/candidates', async (req, res) => {
  try {
    const candidate = {
      id: await getNextId('candidates'),
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      phone: req.body.phone,
      skills: req.body.skills,
      experienceYears: req.body.experienceYears,
      resumeUrl: req.body.resumeUrl,
      status: req.body.status || 'ACTIVE',
      created_at: new Date(),
      updated_at: new Date()
    };
    
    const result = await db.collection('candidates').insertOne(candidate);
    candidate._id = result.insertedId;
    
    console.log(`✅ Candidate created: ${candidate.firstName} ${candidate.lastName}`);
    res.status(201).json(candidate);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/candidates/:id', async (req, res) => {
  try {
    const candidate = await db.collection('candidates').findOne({ id: parseInt(req.params.id) });
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }
    res.json(candidate);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/candidates/:id', async (req, res) => {
  try {
    const updateData = {
      ...req.body,
      updated_at: new Date()
    };
    
    const result = await db.collection('candidates').updateOne(
      { id: parseInt(req.params.id) },
      { $set: updateData }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Candidate not found' });
    }
    
    const updatedCandidate = await db.collection('candidates').findOne({ id: parseInt(req.params.id) });
    res.json(updatedCandidate);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/candidates/:id', async (req, res) => {
  try {
    const result = await db.collection('candidates').deleteOne({ id: parseInt(req.params.id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Candidate not found' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Jobs endpoints
app.get('/api/jobs', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 0;
    const size = parseInt(req.query.size) || 10;
    const skip = page * size;
    
    const jobs = await db.collection('jobs')
      .find({})
      .sort({ posted_date: -1 })
      .skip(skip)
      .limit(size)
      .toArray();
    
    const total = await db.collection('jobs').countDocuments();
    
    res.json({
      content: jobs,
      totalElements: total,
      totalPages: Math.ceil(total / size),
      size: size,
      number: page
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/jobs', async (req, res) => {
  try {
    const job = {
      id: await getNextId('jobs'),
      title: req.body.title,
      description: req.body.description,
      location: req.body.location,
      department: req.body.department,
      employmentType: req.body.employmentType,
      minSalary: req.body.minSalary,
      maxSalary: req.body.maxSalary,
      requirements: req.body.requirements,
      status: req.body.status || 'OPEN',
      posted_date: new Date(),
      closing_date: req.body.closingDate ? new Date(req.body.closingDate) : null,
      created_at: new Date(),
      updated_at: new Date()
    };
    
    const result = await db.collection('jobs').insertOne(job);
    job._id = result.insertedId;
    
    console.log(`✅ Job created: ${job.title}`);
    res.status(201).json(job);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Job Applications endpoints
app.get('/api/applications', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 0;
    const size = parseInt(req.query.size) || 10;
    const skip = page * size;
    
    const applications = await db.collection('job_applications')
      .find({})
      .sort({ applied_date: -1 })
      .skip(skip)
      .limit(size)
      .toArray();
    
    const total = await db.collection('job_applications').countDocuments();
    
    res.json({
      content: applications,
      totalElements: total,
      totalPages: Math.ceil(total / size),
      size: size,
      number: page
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/applications', async (req, res) => {
  try {
    const application = {
      id: await getNextId('job_applications'),
      candidateId: req.body.candidateId,
      jobId: req.body.jobId,
      status: req.body.status || 'PENDING',
      appliedDate: new Date(),
      resumeUrl: req.body.resumeUrl,
      coverLetter: req.body.coverLetter,
      notes: req.body.notes,
      created_at: new Date(),
      updated_at: new Date()
    };
    
    const result = await db.collection('job_applications').insertOne(application);
    application._id = result.insertedId;
    
    console.log(`✅ Application created for candidate ${application.candidateId} to job ${application.jobId}`);
    res.status(201).json(application);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Statistics endpoints
app.get('/api/candidates/statistics', async (req, res) => {
  try {
    const pipeline = [
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $group: { _id: null, statuses: { $push: { k: '$_id', v: '$count' } }, total: { $sum: '$count' } } },
      { $project: { 
        total: 1,
        active: { $arrayElemAt: [{ $filter: { input: '$statuses', cond: { $eq: ['$$this.k', 'ACTIVE'] } } }, 0].v },
        inactive: { $arrayElemAt: [{ $filter: { input: '$statuses', cond: { $eq: ['$$this.k', 'INACTIVE'] } } }, 0].v },
        hired: { $arrayElemAt: [{ $filter: { input: '$statuses', cond: { $eq: ['$$this.k', 'HIRED'] } } }, 0].v },
        rejected: { $arrayElemAt: [{ $filter: { input: '$statuses', cond: { $eq: ['$$this.k', 'REJECTED'] } } }, 0].v }
      }}
    ];
    
    const stats = await db.collection('candidates').aggregate(pipeline).toArray();
    res.json(stats[0] || { total: 0, active: 0, inactive: 0, hired: 0, rejected: 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search endpoints
app.get('/api/candidates/search', async (req, res) => {
  try {
    const search = req.query.search;
    const searchRegex = new RegExp(search, 'i');
    
    const candidates = await db.collection('candidates').find({
      $or: [
        { firstName: { $regex: searchRegex } },
        { lastName: { $regex: searchRegex } },
        { email: { $regex: searchRegex } },
        { skills: { $regex: searchRegex } }
      ]
    }).toArray();
    
    res.json({
      content: candidates,
      totalElements: candidates.length,
      totalPages: Math.ceil(candidates.length / 10),
      size: 10,
      number: 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(port, async () => {
  await connectToMongoDB();
  console.log(`🚀 RecruitAI Real MongoDB Backend running on http://localhost:${port}`);
  console.log(`📊 Health endpoint: http://localhost:${port}/api/health`);
  console.log(`👥 Candidates endpoint: http://localhost:${port}/api/candidates`);
  console.log(`💼 Jobs endpoint: http://localhost:${port}/api/jobs`);
  console.log(`📋 Applications endpoint: http://localhost:${port}/api/applications`);
  console.log(`🗄️  Database: MongoDB (Connected to Compass)`);
  console.log(`🔗 Ready for frontend connections!`);
  console.log(`💾 Data will be stored in MongoDB Compass!`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🔄 Closing MongoDB connection...');
  await client.close();
  process.exit(0);
});
