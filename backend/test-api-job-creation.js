const http = require('http');

function testJobCreation() {
  const jobData = JSON.stringify({
    title: "API Test Job",
    description: "Created via API test",
    location: "Remote",
    department: "Engineering",
    employmentType: "FULL_TIME",
    requirements: "JavaScript, Node.js"
  });

  const options = {
    hostname: 'localhost',
    port: 8080,
    path: '/api/jobs',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': jobData.length
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log(`📊 Status Code: ${res.statusCode}`);
      console.log(`📋 Response: ${data}`);
      
      if (res.statusCode === 201) {
        console.log('✅ Job created successfully via API!');
        console.log('🔍 Check MongoDB Compass to see this new job!');
      } else {
        console.log('❌ Job creation failed');
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Request error:', error.message);
  });

  req.write(jobData);
  req.end();
}

console.log('🚀 Testing job creation via API...');
testJobCreation();
