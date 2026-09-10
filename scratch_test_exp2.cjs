const MONTH_MAP = { jan:1, feb:2, mar:3, apr:4, may:5, jun:6, jul:7, aug:8, sep:9, oct:10, nov:11, dec:12 };
const currentYear = 2026;
const currentMonth = 9;

function parseDateRangeMonths(text) {
    if (!text) return 0;
    const clean = String(text).replace(/[\u00A0\u200B\u200C\u200D\uFEFF]/g, ' ').trim();
    
    // 1. Month Year - Month Year / Present (e.g. Jan 2022 - Present or Jan 2022 to Mar 2024 or 01/2022 - Present)
    const rangeMatch = clean.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{4})\s*[-–—至~–—\/\s]+(?:to|-–—至~|\s+)\s*(Present|Current|Now|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{4}))/i)
        || clean.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{4})\s*[-–—至~]\s*(Present|Current|Now|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{4}))/i);
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

    // 2. Year Only - Year Only / Present (e.g. 2022 - 2024, 2023 - Present, 2022 to 2024)
    const yearOnlyMatch = clean.match(/\b(19\d{2}|20\d{2})\s*(?:[-–—至~]|to)\s*(Present|Current|Now|19\d{2}|20\d{2})\b/i);
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
    const clean = String(text).replace(/[\u00A0\u200B\u200C\u200D\uFEFF]/g, ' ').trim();
    // '3 yrs 9 mos', '3 years 9 months', '3 yr 9 mo'
    const mFull = clean.match(/(\d+)\s*(?:yrs?|years?)\s*(?:and|,|·|•|-)?\s*(\d+)\s*(?:mos?|months?)/i);
    if (mFull) return (parseInt(mFull[1], 10) * 12) + parseInt(mFull[2], 10);
    // '3.5 yrs', '3 yrs', '3 years'
    const mYr = clean.match(/(\d+(?:\.\d+)?)\s*(?:yrs?|years?)/i);
    if (mYr) return Math.round(parseFloat(mYr[1]) * 12);
    // '9 mos', '9 months'
    const mMo = clean.match(/(?:^|[·•\-\(\s])(\d+)\s*(?:mos?|months?)/i);
    if (mMo) return parseInt(mMo[1], 10);
    const dateMonths = parseDateRangeMonths(clean);
    if (dateMonths > 0) return dateMonths;
    return 0;
}

// Comprehensive experience extractor that scans structured blocks, sliced lines, and the full document
function extractExperienceFromDocument(rawText, expSectionText = '') {
    const combined = (expSectionText + '\n' + rawText).replace(/[\u00A0\u200B\u200C\u200D\uFEFF]/g, ' ');
    const lines = combined.split('\n').map(l => l.trim()).filter(Boolean);

    let totalMonths = 0;
    let earliestCareerYear = 9999;
    let earliestCareerMonth = 1;

    // 1. Explicit mention check in About/Headline/Summary (e.g. "3+ years of experience", "having 2.5 yrs exp", "3.8 years in React")
    const explicitExpPatterns = [
        /(?:overall|total|have|having|with)?\s*(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)\s*(?:of\s*)?(?:total\s*)?(?:experience|exp|in\s+software|as\s+a\s+\w+)/i,
        /(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)\s*(?:of\s*)?experience/i,
        /experience\s*[:=-]?\s*(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)/i
    ];
    for (const pat of explicitExpPatterns) {
        const m = combined.match(pat);
        if (m && parseFloat(m[1]) > 0 && parseFloat(m[1]) <= 40) {
            const expFromExplicit = Math.round(parseFloat(m[1]) * 12);
            totalMonths = Math.max(totalMonths, expFromExplicit);
        }
    }

    // 2. Track all 4-digit years in the text (excluding obvious education/graduation years if marked)
    const dateMatches = combined.matchAll(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{4})\b/gi);
    for (const dm of dateMatches) {
        const mStr = dm[1].substr(0, 3).toLowerCase();
        const m = MONTH_MAP[mStr] || 1;
        const y = parseInt(dm[2], 10);
        if (y >= 1995 && y <= currentYear) {
            if (y < earliestCareerYear || (y === earliestCareerYear && m < earliestCareerMonth)) {
                earliestCareerYear = y;
                earliestCareerMonth = m;
            }
        }
    }

    // Also look for starting years in date ranges (e.g. "2021 - Present" or "2021 – 2024")
    const yearMatches = combined.matchAll(/\b(19\d{2}|20\d{2})\s*[-–—至~]\s*(Present|Current|Now|19\d{2}|20\d{2})\b/gi);
    for (const ym of yearMatches) {
        const y = parseInt(ym[1], 10);
        if (y >= 1995 && y <= currentYear && y < earliestCareerYear) {
            earliestCareerYear = y;
            earliestCareerMonth = 1;
        }
    }

    // 3. Scan lines for company durations & date ranges
    const companyDurations = [];
    let inEducationSection = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Toggle education flag
        if (/^education$/i.test(line) || /^(degrees?|academic\s+background)/i.test(line)) {
            inEducationSection = true;
        }
        if (/^(experience|work\s+experience|skills|licenses|certifications|projects)/i.test(line)) {
            inEducationSection = false;
        }

        // If in education, don't count degree dates towards work experience
        if (inEducationSection && /(bachelor|master|b\.tech|m\.tech|b\.sc|m\.sc|university|college|school|cbse|ssc|intermediate)/i.test(line)) {
            continue;
        }

        // Parse duration from line
        const dur = parseDur(line);
        if (dur > 0 && dur <= 480) {
            companyDurations.push(dur);
        } else {
            const dateDur = parseDateRangeMonths(line);
            if (dateDur > 0 && dateDur <= 480) {
                companyDurations.push(dateDur);
            }
        }
    }

    if (companyDurations.length > 0) {
        const sumMonths = companyDurations.reduce((sum, d) => sum + d, 0);
        totalMonths = Math.max(totalMonths, sumMonths);
    }

    // 4. If totalMonths is 0 or less than the career span, cross-check with earliest verified start date
    if (earliestCareerYear < 9999 && earliestCareerYear <= currentYear) {
        const careerSpanMonths = ((currentYear - earliestCareerYear) * 12) + (currentMonth - earliestCareerMonth) + 1;
        if (careerSpanMonths > 0 && careerSpanMonths <= 480) {
            if (totalMonths === 0 || (careerSpanMonths - totalMonths) > 24) {
                totalMonths = Math.max(totalMonths, careerSpanMonths);
            }
        }
    }

    return totalMonths > 0 ? parseFloat((totalMonths / 12).toFixed(1)) : 0;
}

// Test cases
console.log("Test 1 (Sunitha line 'Sep 2022 - Present · 2 yrs'):", extractExperienceFromDocument("Experience\nReact Developer\nSep 2022 - Present · 2 yrs\n"));
console.log("Test 2 (Explicit About text '3.5+ years of experience in React'):", extractExperienceFromDocument("About\nPassionate React developer with 3.5+ years of experience in building modern web applications."));
console.log("Test 3 (Year only '2021 – 2024'):", extractExperienceFromDocument("Experience\nCompany ABC\n2021 – 2024\n"));
console.log("Test 4 (Multiple companies):", extractExperienceFromDocument("Experience\nCompany A\nJan 2021 - Dec 2022 · 2 yrs\nCompany B\nJan 2023 - Present · 1 yr 9 mos"));
console.log("Test 5 (Career span from Jan 2022):", extractExperienceFromDocument("Experience\nSoftware Engineer\nJan 2022 - Present"));
