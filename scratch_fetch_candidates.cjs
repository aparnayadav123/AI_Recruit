async function run() {
    try {
        console.log('--- Testing Port 5040 ---');
        try {
            const r5040 = await fetch('http://localhost:5040/api/candidates?size=100');
            const d5040 = await r5040.json();
            const l5040 = Array.isArray(d5040) ? d5040 : (d5040.content || []);
            console.log(`Port 5040: Found ${l5040.length} candidates.`);
            l5040.slice(0, 5).forEach(c => console.log(`[5040] ${c.id} - ${c.name} - ${c.role} - ${c.experience}`));
        } catch(e) { console.log('5040 error:', e.message); }

        console.log('--- Testing Render Backend ---');
        try {
            const rRender = await fetch('https://recruitai-backend-bvo0.onrender.com/api/candidates?size=100');
            const dRender = await rRender.json();
            const lRender = Array.isArray(dRender) ? dRender : (dRender.content || []);
            console.log(`Render: Found ${lRender.length} candidates.`);
            lRender.forEach(c => {
                if (c.name.includes('Sarvesh') || c.name.includes('Palivela') || c.sequenceId >= 28) {
                    console.log(`[Render] ${c.id} (CAN0${c.sequenceId}) - ${c.name} - ${c.role} - ${c.experience}y - ${c.email}`);
                }
            });
        } catch(e) { console.log('Render error:', e.message); }
    } catch (e) {
        console.error('Error:', e);
    }
}
run();
