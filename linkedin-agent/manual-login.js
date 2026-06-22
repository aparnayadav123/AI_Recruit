const axios = require('axios');
console.log('🔗 Launching Login Window...');
axios.post('http://localhost:8090/agent/login')
    .then(() => console.log('✅ Login Window Launched! Please check your taskbar properly. Sign in to LinkedIn in that window.'))
    .catch(err => console.error('❌ Failed to launch:', err.message));
