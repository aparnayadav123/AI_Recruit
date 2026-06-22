const http = require('http');

function testEndpoint(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 8080,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (body) {
      options.headers['Content-Length'] = Buffer.byteLength(body);
    }

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (body) {
      req.write(body);
    }
    
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing Spring Boot Backend Endpoints...\n');

  try {
    // Test health endpoint
    console.log('1. Testing /api/health...');
    const health = await testEndpoint('/api/health');
    console.log(`   Status: ${health.statusCode}`);
    console.log(`   Response: ${health.body}\n`);

    // Test candidates endpoint
    console.log('2. Testing /api/candidates...');
    const candidates = await testEndpoint('/api/candidates');
    console.log(`   Status: ${candidates.statusCode}`);
    console.log(`   Response: ${candidates.body.substring(0, 100)}...\n`);

    // Test jobs endpoint
    console.log('3. Testing /api/jobs...');
    const jobs = await testEndpoint('/api/jobs');
    console.log(`   Status: ${jobs.statusCode}`);
    console.log(`   Response: ${jobs.body.substring(0, 100)}...\n`);

    // Test job creation
    console.log('4. Testing POST /api/jobs...');
    const jobData = JSON.stringify({
      title: "Test Job from Script",
      description: "Testing job creation",
      location: "Remote",
      department: "Engineering",
      employmentType: "FULL_TIME",
      requirements: "JavaScript, Node.js"
    });
    
    const createJob = await testEndpoint('/api/jobs', 'POST', jobData);
    console.log(`   Status: ${createJob.statusCode}`);
    console.log(`   Response: ${createJob.body}\n`);

    if (createJob.statusCode === 201) {
      console.log('✅ SUCCESS: Spring Boot backend is working correctly!');
      console.log('🗄️  Jobs are being stored in MongoDB');
    } else {
      console.log('❌ ISSUE: Job creation failed');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

runTests();
