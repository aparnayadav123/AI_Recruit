const MONTH_MAP = { jan:1, feb:2, mar:3, apr:4, may:5, jun:6, jul:7, aug:8, sep:9, oct:10, nov:11, dec:12 };
const currentYear = 2026;
const currentMonth = 9;

function parseDateRangeMonths(text) {
    if (!text) return 0;
    const clean = String(text).replace(/[\u00A0\u200B\u200C\u200D\uFEFF]/g, ' ');
    
    // 1. Month Year - Month Year / Present
    const rangeMatch = clean.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})\s*[-–—至~]\s*(Present|Current|Now|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4}))/i);
    if (rangeMatch) {
        const startMonth = MONTH_MAP[rangeMatch[1].substr(0, 3).toLowerCase()] || 1;
        const startYear = parseInt(rangeMatch[2], 10);
        let endMonth = currentMonth;
        let endYear = currentYear;
        if (!/present|current|now/i.test(rangeMatch[3])) {
            endYear = parseInt(rangeMatch[4], 10);
            const endMStr = rangeMatch[3].match(/^[a-zA-Z]+/);
            if (endMStr && MONTH_MAP[endMStr[0].substr(0, 3).toLowerCase()] !== undefined) {
                endMonth = MONTH_MAP[endMStr[0].substr(0, 3).toLowerCase()];
            }
        }
        if (startYear >= 1990 && endYear >= startYear) {
            const totalM = ((endYear - startYear) * 12) + (endMonth - startMonth) + 1;
            return Math.max(1, totalM);
        }
    }

    // 2. Year Only - Year Only / Present
    const yearOnlyMatch = clean.match(/\b(19\d{2}|20\d{2})\s*[-–—至~]\s*(Present|Current|Now|19\d{2}|20\d{2})\b/i);
    if (yearOnlyMatch) {
        const startYear = parseInt(yearOnlyMatch[1], 10);
        let endYear = currentYear;
        let endMonth = currentMonth;
        if (!/present|current|now/i.test(yearOnlyMatch[2])) {
            endYear = parseInt(yearOnlyMatch[2], 10);
            endMonth = 12;
        }
        if (startYear >= 1990 && endYear >= startYear) {
            const totalM = ((endYear - startYear) * 12) + (endMonth - 1) + 1;
            return Math.max(1, totalM);
        }
    }

    return 0;
}

function parseDur(text) {
    if (!text) return 0;
    const clean = text.replace(/[\u00A0\u200B\u200C\u200D\uFEFF]/g, ' ').trim();
    const mFull = clean.match(/(\d+)\s*(?:yrs?|years?)\s*(?:and|,|·|•|-)?\s*(\d+)\s*(?:mos?|months?)/i);
    if (mFull) return (parseInt(mFull[1], 10) * 12) + parseInt(mFull[2], 10);
    const mYr = clean.match(/(\d+)\s*(?:yrs?|years?)/i);
    if (mYr) return parseInt(mYr[1], 10) * 12;
    const mMo = clean.match(/(?:^|[·•\-\(\s])(\d+)\s*(?:mos?|months?)/i);
    if (mMo) return parseInt(mMo[1], 10);
    const dateMonths = parseDateRangeMonths(clean);
    if (dateMonths > 0) return dateMonths;
    return 0;
}

function calculateTotalExperienceFromBlock(block) {
    if (!block) return 0;
    const cleanBlock = block.replace(/[\u00A0\u200B\u200C\u200D\uFEFF]/g, ' ');
    const lines = cleanBlock.split('\n').map(l => l.trim()).filter(Boolean);
    let totalMonths = 0;
    let earliestYear = 9999;
    let earliestMonth = 1;

    const dateMatches = cleanBlock.matchAll(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})\b/gi);
    for (const dm of dateMatches) {
        const mStr = dm[1].substr(0, 3).toLowerCase();
        const m = MONTH_MAP[mStr] || 1;
        const y = parseInt(dm[2], 10);
        if (y >= 1990 && y <= currentYear) {
            if (y < earliestYear || (y === earliestYear && m < earliestMonth)) {
                earliestYear = y;
                earliestMonth = m;
            }
        }
    }

    // Also check 4-digit years
    const yearMatches = cleanBlock.matchAll(/\b(19\d{2}|20\d{2})\b/g);
    for (const ym of yearMatches) {
        const y = parseInt(ym[1], 10);
        if (y >= 1990 && y <= currentYear && y < earliestYear) {
            earliestYear = y;
        }
    }

    const companyDurations = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const dur = parseDur(line);
        if (dur > 0) {
            companyDurations.push(dur);
        } else {
            const dateDur = parseDateRangeMonths(line);
            if (dateDur > 0) companyDurations.push(dateDur);
        }
    }
    
    if (companyDurations.length > 0) {
        totalMonths = companyDurations.reduce((sum, d) => sum + d, 0);
    } else {
        const dateRangeRegex = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})\s*[-–—至~]\s*(Present|Current|Now|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4}))/gi;
        const ranges = [...cleanBlock.matchAll(dateRangeRegex)];
        for (const r of ranges) {
            const sM = MONTH_MAP[r[1].substr(0, 3).toLowerCase()] || 1;
            const sY = parseInt(r[2], 10);
            let eM = currentMonth;
            let eY = currentYear;
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

    if (totalMonths === 0 && earliestYear < 9999 && earliestYear <= currentYear) {
        totalMonths = ((currentYear - earliestYear) * 12) + (currentMonth - earliestMonth) + 1;
    }

    return totalMonths > 0 ? parseFloat((totalMonths / 12).toFixed(1)) : 0;
}

// Test Role Extractor
function extractCleanRole(rawHeadline, aboutText, experienceList) {
    let raw = (rawHeadline || '').trim();
    raw = raw.replace(/\s*[\(\[\（\【][^\)\]\）\】]*[\)\]\）\】]\s*/g, ' ').trim();
    raw = raw.replace(/^(?:Aspiring|Passionate\s+about|Working\s+as\s+an?|I'm\s+an?|Experienced|Senior|Junior|Lead)?\s*(?:Seeking\s+opportunities|Open\s+to\s+work|Immediate\s+joiner|Looking\s+for\s+roles?)[,\s:|-]*/i, '').trim() || raw;
    raw = raw.replace(/^(?:Open\s+to\s+work|Seeking\s+opportunities|Actively\s+looking|Immediate\s+joiner)[\s:|-]*/i, '').trim();

    const segments = raw.split(/[|·•\/\n–—]/).map(s => s.trim()).filter(s => s.length > 1);

    const roleKeywordRegex = /\b(Full[\s-]?Stack\s+Developer|Full[\s-]?Stack\s+Engineer|Frontend\s+Developer|Frontend\s+Engineer|Front-End\s+Developer|Backend\s+Developer|Backend\s+Engineer|Web\s+Developer|Software\s+Developer|Software\s+Engineer|Application\s+Developer|Java\s+Developer|Python\s+Developer|React(?:\.js)?\s+Developer|Node(?:\.js)?\s+Developer|DevOps\s+Engineer|Cloud\s+Engineer|Site\s+Reliability\s+Engineer|SRE|QA\s+Engineer|Automation\s+Engineer|Test\s+Engineer|SDET|Manual\s+Tester|Scrum\s+Master|Agile\s+Coach|Product\s+Owner|Product\s+Manager|Project\s+Manager|Program\s+Manager|Data\s+Engineer|Data\s+Scientist|Data\s+Analyst|Business\s+Analyst|UI\/UX\s+Designer|Product\s+Designer|Graphic\s+Designer|Systems?\s+Engineer|Network\s+Engineer|Database\s+Administrator|DBA|Technical\s+Lead|Engineering\s+Manager|Solution\s+Architect|Cloud\s+Architect|Enterprise\s+Architect|Programmer\s+Analyst|Programming\s+Analyst|Systems\s+Analyst|Technical\s+Support\s+Engineer|IT\s+Support\s+Specialist|Consultant|Specialist|Intern|Trainee|Graduate\s+Engineer\s+Trainee|Student|Researcher)\b/i;

    for (const seg of segments) {
        const match = seg.match(roleKeywordRegex);
        if (match) {
            let cleaned = seg.replace(/\s+(?:at|@)\s+.*$/i, '').trim();
            cleaned = cleaned.replace(/^(?:Aspiring|Passionate\s+about|Working\s+as\s+an?|I'm\s+an?|Experienced)\s+/i, '').trim();
            cleaned = cleaned.replace(/\s*·.*$/, '').trim();
            if (cleaned.length > 2) return cleaned;
        }
    }

    const singleRoleKeywords = ['Developer', 'Engineer', 'Architect', 'Manager', 'Lead', 'Consultant', 'QA', 'Analyst', 'Scientist', 'Tester', 'Specialist', 'Designer', 'Master', 'Admin', 'Intern', 'Student', 'Trainee', 'Programmer', 'Associate', 'Executive', 'Officer'];
    for (const seg of segments) {
        if (singleRoleKeywords.some(kw => new RegExp(`\\b${kw}\\b`, 'i').test(seg))) {
            let cleaned = seg.replace(/\s+(?:at|@)\s+.*$/i, '').trim();
            cleaned = cleaned.replace(/^(?:Aspiring|Passionate\s+about|Working\s+as\s+an?|I'm\s+an?|Experienced)\s+/i, '').trim();
            if (cleaned.length > 2) return cleaned;
        }
    }

    if (experienceList && experienceList.length > 0 && experienceList[0].title) {
        const expTitle = experienceList[0].title.split(/\s+(?:at|@|-)\s+/i)[0].trim();
        if (expTitle.length > 2 && !/full-time|part-time|contract/i.test(expTitle)) {
            return expTitle;
        }
    }

    if (segments.length > 0 && segments[0].length > 1) {
        let segClean = segments[0].replace(/\s+(?:at|@)\s+.*$/i, '').trim();
        segClean = segClean.replace(/^(?:Aspiring|Passionate\s+about|Working\s+as\s+an?|I'm\s+an?|Experienced)\s+/i, '').trim();
        if (segClean.length > 2 && !/(connections|followers|contact info|verified|seeking|looking)/i.test(segClean)) {
            return segClean;
        }
    }

    if (aboutText) {
        const firstSentence = aboutText.split(/[.!?\n]/)[0];
        const m = firstSentence.match(/(?:working as an?|I am an?|experienced as an?)\s+([^,.]+)/i);
        if (m && m[1].trim().length > 2) return m[1].trim();
    }

    return 'Software Engineer';
}

// Tests
console.log("Test 1 (Sunitha React Dev headline):", extractCleanRole("React.js Developer | TypeScript, JavaScript, HTML, CSS", "", []));
console.log("Test 2 (Software Engineer at TechCorp):", extractCleanRole("Software Engineer at TechCorp | Cloud Practitioner", "", []));
console.log("Test 3 (Programmer Analyst):", extractCleanRole("Programmer Analyst @ SRM Technologies | FullStack Dev", "", []));
console.log("Test 4 (No headline, Experience title):", extractCleanRole("", "", [{ title: "Frontend Engineer" }]));
console.log("Test 5 (Year only date range 2022 - 2024):", calculateTotalExperienceFromBlock("Experience\nCompany ABC\n2022 - 2024 · 2 yrs"));
console.log("Test 6 (Year only date range 2023 - Present):", calculateTotalExperienceFromBlock("Experience\nCompany XYZ\n2023 - Present"));
