const { MongoClient } = require('mongodb');

async function testMongoDB() {
  const client = new MongoClient('mongodb://localhost:27017/recruitai');
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('recruitai');
    
    // Test inserting a job directly
    const job = {
      id: 1,
      title: 'Senior Java Developer',
      description: 'Looking for experienced Java developer',
      location: 'Remote',
      department: 'Engineering',
      employmentType: 'FULL_TIME',
      requirements: 'Java, Spring Boot, MongoDB',
      status: 'OPEN',
      posted_date: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    };
    
    const result = await db.collection('jobs').insertOne(job);
    console.log('✅ Job inserted with ID:', result.insertedId);
    
    // Verify the job was inserted
    const insertedJob = await db.collection('jobs').findOne({ id: 1 });
    console.log('✅ Found job:', insertedJob.title);
    
    console.log('🎉 MongoDB is working! Check MongoDB Compass to see the data.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

testMongoDB();
