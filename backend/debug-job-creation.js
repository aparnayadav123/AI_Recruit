const { MongoClient } = require('mongodb');

async function debugJobCreation() {
  const client = new MongoClient('mongodb://localhost:27017/recruitai');
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('recruitai');
    
    // Check current jobs
    const currentJobs = await db.collection('jobs').find({}).toArray();
    console.log(`\n📋 Current jobs in database: ${currentJobs.length}`);
    currentJobs.forEach((job, index) => {
      console.log(`  ${index + 1}. ID: ${job.id}, Title: ${job.title}`);
    });
    
    // Test creating a job with minimal required fields
    console.log('\n🔧 Testing job creation with minimal fields...');
    const testJob = {
      id: currentJobs.length + 1,
      title: 'Test Job ' + Date.now(),
      description: 'This is a test job',
      employmentType: 'FULL_TIME',
      status: 'OPEN',
      posted_date: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    };
    
    try {
      const result = await db.collection('jobs').insertOne(testJob);
      console.log('✅ Test job created successfully!');
      console.log(`   ID: ${testJob.id}`);
      console.log(`   MongoDB _id: ${result.insertedId}`);
      
      // Verify it was inserted
      const insertedJob = await db.collection('jobs').findOne({ id: testJob.id });
      if (insertedJob) {
        console.log('✅ Job verified in database');
      } else {
        console.log('❌ Job not found after insertion');
      }
      
    } catch (insertError) {
      console.error('❌ Error inserting job:', insertError.message);
    }
    
    // Check collection validation rules
    console.log('\n🔍 Checking collection validation rules...');
    try {
      const collections = await db.listCollections().toArray();
      const jobsCollection = collections.find(c => c.name === 'jobs');
      if (jobsCollection && jobsCollection.options.validator) {
        console.log('📋 Jobs collection has validation rules:');
        console.log(JSON.stringify(jobsCollection.options.validator, null, 2));
      } else {
        console.log('📋 Jobs collection has no validation rules');
      }
    } catch (error) {
      console.log('❌ Error checking validation:', error.message);
    }
    
    console.log('\n🎯 Debugging complete!');
    console.log('💡 If you created a job recently, check:');
    console.log('   1. MongoDB Compass is connected to mongodb://localhost:27017/recruitai');
    console.log('   2. You are looking at the "jobs" collection');
    console.log('   3. Refresh the Compass view');
    
  } catch (error) {
    console.error('❌ Connection error:', error);
  } finally {
    await client.close();
  }
}

debugJobCreation();
