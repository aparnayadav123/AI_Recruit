const http = require('http');

const jobData = JSON.stringify({
  title: "Test Job from Simple Script",
  description: "This job is created via simple test script",
  location: "Remote",
  department: "Engineering",
  employmentType: "FULL_TIME",
  requirements: "JavaScript, Node.js, MongoDB"
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
    console.log(`Status Code: ${res.statusCode}`);
    console.log(`Response: ${data}`);
  });
});

req.on('error', (error) => {
  console.error('Error:', error.message);
});

req.write(jobData);
req.end();
