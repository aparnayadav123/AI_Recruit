const sarveshText = `
Experience
SRM Technologies
Full-time · 1 yr 7 mos
Chennai, Tamil Nadu, India · On-site
Programming Analyst
Dec 2025 - Present · 10 mos
Frontend-focused Programming Analyst with strong expertise in React.js, JavaScript, HTML, and CSS.
Experienced in REST API integration, Redux state management, and building responsive UI... more
HTML, JavaScript and +6 skills
Internship Trainee
Mar 2025 - Dec 2025 · 10 mos
Learned the fundamentals of Frontend Development using HTML5, CSS3, and JavaScript, focusing on responsive and user-friendly UI design.... more
HTML, Cascading Style Sheets (CSS) and +2 skills
SKOLAR
6 mos
Bengaluru, Karnataka, India · On-site
Business Development Specialist
Full-time
Jun 2024 - Aug 2024 · 3 mos
Business Development Trainee
Internship
Mar 2024 - May 2024 · 3 mos
`;

const palivelaText = `
Experience
SGR Info Systems Pvt Ltd
Full-time · 2 yrs 2 mos
Chennai, Tamil Nadu, India · On-site
Scrum Master
Jul 2024 - Present · 2 yrs 2 mos

TEKsystems
Full-time · 1 yr 11 mos
Hyderabad, Telangana, India
Scrum Master
Aug 2022 - Jun 2024 · 1 yr 11 mos

Mclansys Solutions
Full-time · 8 yrs 7 mos
Hyderabad, Telangana, India
Scrum Master
Jan 2018 - Jul 2022 · 4 yrs 7 mos
Senior Software Engineer
Jan 2015 - Dec 2017 · 3 yrs
Software Engineer
Jan 2014 - Dec 2014 · 1 yr

Synformatica
Full-time · 1 yr 2 mos
Software Engineer
Jan 2013 - Feb 2014 · 1 yr 2 mos
`;

function parseDurationString(text) {
    if (!text) return 0;
    const clean = text.replace(/[\u00A0\u200B\u200C\u200D\uFEFF]/g, ' ').trim();
    
    // Match 'X yrs Y mos', 'X years Y months', 'X yr Y mo'
    const fullMatch = clean.match(/(\d+)\s*(?:yrs?|years?)\s*(?:and|,|·|•|-)?\s*(\d+)\s*(?:mos?|months?)/i);
    if (fullMatch) {
        return (parseInt(fullMatch[1], 10) * 12) + parseInt(fullMatch[2], 10);
    }
    // Match 'X yrs' or 'X years'
    const yrMatch = clean.match(/(\d+)\s*(?:yrs?|years?)/i);
    if (yrMatch) {
        return parseInt(yrMatch[1], 10) * 12;
    }
    // Match 'X mos' or 'X months'
    const moMatch = clean.match(/(?:^|[·•\-\(\s])(\d+)\s*(?:mos?|months?)/i);
    if (moMatch) {
        return parseInt(moMatch[1], 10);
    }
    return 0;
}

function calculateTotalExperienceFromBlock(block) {
    if (!block) return 0;
    const cleanBlock = block.replace(/[\u00A0\u200B\u200C\u200D\uFEFF]/g, ' ');
    const lines = cleanBlock.split('\n').map(l => l.trim()).filter(Boolean);
    let totalMonths = 0;
    let earliestYear = 9999;
    let earliestMonth = 1;
    const curYear = 2026;
    const curMonth = 9;

    const MONTH_MAP = { jan:1, feb:2, mar:3, apr:4, may:5, jun:6, jul:7, aug:8, sep:9, oct:10, nov:11, dec:12 };
    const dateMatches = cleanBlock.matchAll(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})\b/gi);
    for (const dm of dateMatches) {
        const mStr = dm[1].substr(0, 3).toLowerCase();
        const m = MONTH_MAP[mStr] || 1;
        const y = parseInt(dm[2], 10);
        if (y >= 1990 && y <= curYear) {
            if (y < earliestYear || (y === earliestYear && m < earliestMonth)) {
                earliestYear = y;
                earliestMonth = m;
            }
        }
    }

    const companyDurations = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const hasDurationPattern = /\b\d+\s*(?:yrs?|years?|mos?|months?)\b/i.test(line);
        if (!hasDurationPattern) continue;

        const hasDateRange = /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{4})\s*[-–—至~]/i.test(line);
        if (!hasDateRange) {
            const dur = parseDurationString(line);
            if (dur > 0) {
                companyDurations.push({ line, dur });
            }
        }
    }

    console.log("Found Company Durations:", companyDurations);

    if (companyDurations.length > 0) {
        totalMonths = companyDurations.reduce((sum, d) => sum + d.dur, 0);
    } else {
        const dateRangeRegex = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})\s*[-–—至~]\s*(Present|Current|Now|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4}))/gi;
        const ranges = [...cleanBlock.matchAll(dateRangeRegex)];
        for (const r of ranges) {
            const sM = MONTH_MAP[r[1].substr(0, 3).toLowerCase()] || 1;
            const sY = parseInt(r[2], 10);
            let eM = curMonth;
            let eY = curYear;
            if (!/present|current|now/i.test(r[3])) {
                eY = parseInt(r[4], 10);
                const emStr = r[3].match(/^[a-zA-Z]+/);
                if (emStr) eM = MONTH_MAP[emStr[0].substr(0, 3).toLowerCase()] || 1;
            }
            if (sY >= 1990 && eY >= sY) {
                totalMonths += Math.max(1, ((eY - sY) * 12) + (eM - sM) + 1);
            }
        }
    }

    if (earliestYear < 9999 && earliestYear <= curYear) {
        const careerSpanMonths = ((curYear - earliestYear) * 12) + (curMonth - earliestMonth) + 1;
        if (totalMonths === 0 || (careerSpanMonths - totalMonths) > 24) {
            totalMonths = Math.max(totalMonths, careerSpanMonths);
        }
    }

    return totalMonths > 0 ? parseFloat((totalMonths / 12).toFixed(1)) : 0;
}

console.log("Sarvesh Total Experience:", calculateTotalExperienceFromBlock(sarveshText), "Years");
console.log("Palivela Total Experience:", calculateTotalExperienceFromBlock(palivelaText), "Years");

