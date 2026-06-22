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
    
    // Check if collections exist, if not create them
    const collections = await db.listCollections().toArray();
    const existingCollections = collections.map(c => c.name);
    
    console.log('📋 Existing collections:', existingCollections);
    
    // Create collections only if they don't exist
    if (!existingCollections.includes('candidates')) {
      await db.createCollection('candidates');
      console.log('✅ Created candidates collection');
    } else {
      console.log('📋 Candidates collection already exists');
    }
    
    if (!existingCollections.includes('jobs')) {
      await db.createCollection('jobs');
      console.log('✅ Created jobs collection');
    } else {
      console.log('📋 Jobs collection already exists');
    }
    
    if (!existingCollections.includes('job_applications')) {
      await db.createCollection('job_applications');
      console.log('✅ Created job_applications collection');
    } else {
      console.log('📋 Job_applications collection already exists');
    }
    
    console.log('🗄️  Database: recruitai');
    console.log('📊 Collections: candidates, jobs, job_applications');
    console.log('🔧 Validation: None (Flexible)');
    
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    // Don't exit, try to continue with existing collections
    if (error.code === 48) { // NamespaceExists error
      console.log('⚠️  Collections already exist with different options, continuing anyway...');
      db = client.db('recruitai');
    } else {
      process.exit(1);
    }
  }
}

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:3001', 'http://localhost:3003'],
  credentials: true
}));
app.use(express.json());

// Helper function to generate IDs
async function getNextId(collectionName) {
  try {
    const lastDoc = await db.collection(collectionName).find().sort({ id: -1 }).limit(1).toArray();
    return lastDoc.length > 0 ? lastDoc[0].id + 1 : 1;
  } catch (error) {
    return 1; // Start with 1 if collection is empty or error
  }
}

// Root endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'RecruitAI Backend API (Robust MongoDB)',
    version: '1.0.0',
    database: 'MongoDB',
    connection: mongoUri,
    collections: ['candidates', 'jobs', 'job_applications'],
    validation: 'None (Flexible)',
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
      service: 'recruitai-agent-mongodb-robust',
      database: 'MongoDB',
      connected: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      service: 'recruitai-agent-mongodb-robust',
      database: 'MongoDB',
      connected: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
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
      firstName: req.body.firstName || req.body.first_name,
      lastName: req.body.lastName || req.body.last_name,
      email: req.body.email,
      phone: req.body.phone,
      skills: req.body.skills,
      experienceYears: req.body.experienceYears || req.body.experience_years,
      resumeUrl: req.body.resumeUrl || req.body.resume_url,
      status: req.body.status || 'ACTIVE',
      created_at: new Date(),
      updated_at: new Date()
    };
    
    const result = await db.collection('candidates').insertOne(candidate);
    candidate._id = result.insertedId;
    
    console.log(`✅ Candidate created: ${candidate.firstName} ${candidate.lastName}`);
    res.status(201).json(candidate);
  } catch (error) {
    console.error('❌ Candidate creation error:', error);
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
    console.log('📝 Creating job with data:', JSON.stringify(req.body, null, 2));
    
    const job = {
      id: await getNextId('jobs'),
      title: req.body.title,
      description: req.body.description,
      location: req.body.location,
      department: req.body.department,
      employmentType: req.body.employmentType || req.body.employment_type,
      minSalary: req.body.minSalary || req.body.min_salary,
      maxSalary: req.body.maxSalary || req.body.max_salary,
      requirements: req.body.requirements,
      status: req.body.status || 'OPEN',
      posted_date: new Date(),
      closing_date: req.body.closingDate ? new Date(req.body.closingDate) : null,
      created_at: new Date(),
      updated_at: new Date()
    };
    
    console.log('🔧 Processed job object:', JSON.stringify(job, null, 2));
    
    const result = await db.collection('jobs').insertOne(job);
    job._id = result.insertedId;
    
    console.log(`✅ Job created: ${job.title} (ID: ${job.id})`);
    console.log(`🗄️  MongoDB _id: ${result.insertedId}`);
    res.status(201).json(job);
  } catch (error) {
    console.error('❌ Job creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/jobs/:id', async (req, res) => {
  try {
    const job = await db.collection('jobs').findOne({ id: parseInt(req.params.id) });
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.json(job);
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
      candidateId: req.body.candidateId || req.body.candidate_id,
      jobId: req.body.jobId || req.body.job_id,
      status: req.body.status || 'PENDING',
      appliedDate: new Date(),
      resumeUrl: req.body.resumeUrl || req.body.resume_url,
      coverLetter: req.body.coverLetter || req.body.cover_letter,
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
  console.log(`🚀 RecruitAI Robust MongoDB Backend running on http://localhost:${port}`);
  console.log(`📊 Health endpoint: http://localhost:${port}/api/health`);
  console.log(`👥 Candidates endpoint: http://localhost:${port}/api/candidates`);
  console.log(`💼 Jobs endpoint: http://localhost:${port}/api/jobs`);
  console.log(`📋 Applications endpoint: http://localhost:${port}/api/applications`);
  console.log(`🗄️  Database: MongoDB (Handles existing collections)`);
  console.log(`🔗 Ready for frontend connections!`);
  console.log(`💾 All data will be stored in MongoDB Compass!`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🔄 Closing MongoDB connection...');
  await client.close();
  process.exit(0);
});
