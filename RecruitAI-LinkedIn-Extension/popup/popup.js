/**
 * RecruitAI LinkedIn Connector — Popup Logic v1.1
 */

const PROD_APP_URL = 'https://ai-recruit-eight.vercel.app';
const DEV_APP_URL  = 'http://localhost:3000';
const PROD_CRM_URL = PROD_APP_URL;

document.addEventListener('DOMContentLoaded', async () => {

    // ── DOM refs ────────────────────────────────────────────────
    const notLinkedInView   = document.getElementById('not-linkedin-view');
    const loginView         = document.getElementById('login-view');
    const profileView       = document.getElementById('profile-view');

    const authBadge         = document.getElementById('auth-badge');
    const authBadgeLabel    = document.getElementById('auth-badge-label');

    const openLinkedInBtn   = document.getElementById('open-linkedin-btn');
    const gotoDashboardBtn  = document.getElementById('goto-dashboard-btn');
    const manualToken       = document.getElementById('manual-token');
    const toggleTokenVis    = document.getElementById('toggle-token-vis');
    const saveTokenBtn      = document.getElementById('save-token-btn');
    const logoutBtn         = document.getElementById('logout-btn');

    const preExtractState   = document.getElementById('pre-extract-state');
    const postExtractState  = document.getElementById('post-extract-state');
    const savedState        = document.getElementById('saved-state');

    const extractBtn        = document.getElementById('extract-btn');
    const extractBtnText    = document.getElementById('extract-btn-text');
    const extractLoader     = document.getElementById('extract-loader');

    const profileAvatar     = document.getElementById('profile-avatar');
    const profileName       = document.getElementById('profile-name');
    const profileRole       = document.getElementById('profile-role');
    const profileLocation   = document.getElementById('profile-location');
    const profileDetails    = document.getElementById('profile-details');

    const saveBtn           = document.getElementById('save-btn');
    const saveBtnText       = document.getElementById('save-btn-text');
    const saveLoader        = document.getElementById('save-loader');
    const reExtractBtn      = document.getElementById('re-extract-btn');

    const savedName         = document.getElementById('saved-name');
    const viewInCrmBtn      = document.getElementById('view-in-crm-btn');
    const extractAnotherBtn = document.getElementById('extract-another-btn');

    const statusToast       = document.getElementById('status-toast');

    // ── State ────────────────────────────────────────────────────
    let extractedData = null;
    let savedCandidateId = null;
    let currentTab = null;
    let appBaseUrl = PROD_APP_URL;

    // ── Helpers ──────────────────────────────────────────────────
    function showView(v) {
        [notLinkedInView, loginView, profileView].forEach(el => el && el.classList.add('hidden'));
        v && v.classList.remove('hidden');
    }
    function showSubState(s) {
        [preExtractState, postExtractState, savedState].forEach(el => el && el.classList.add('hidden'));
        s && s.classList.remove('hidden');
    }
    function showToast(msg, type = 'info') {
        statusToast.textContent = msg;
        statusToast.className = `status-toast toast-${type}`;
        statusToast.classList.remove('hidden');
        setTimeout(() => statusToast.classList.add('hidden'), 3500);
    }
    function setExtractLoading(on) {
        extractBtn.disabled = on;
        extractBtnText.textContent = on ? 'Extracting...' : 'Extract Profile';
        on ? extractLoader.classList.remove('hidden') : extractLoader.classList.add('hidden');
    }
    function setSaveLoading(on) {
        saveBtn.disabled = on;
        saveBtnText.textContent = on ? 'Saving...' : 'Save to RecruitAI';
        on ? saveLoader.classList.remove('hidden') : saveLoader.classList.add('hidden');
    }
    function renderProfile(data) {
        const initial = (data.name || '?').charAt(0).toUpperCase();
        profileAvatar.textContent = initial;
        profileName.textContent   = data.name || 'Unknown Name';

        let cleanRole = data.primaryRole || data.headline || '';
        cleanRole = cleanRole.replace(/verify\s*in\s*\d+\s*minutes?|verified|she\/her|he\/him|they\/them/i, '').trim();
        profileRole.textContent   = cleanRole;
        profileLocation.textContent = data.locality || data.location || '';

        // Detail rows
        const rows = [];
        const org = data.currentOrganization || data.company;
        if (org && org !== 'N/A') {
            rows.push({ label: 'Company', value: org });
        }
        if (data.email && !data.email.startsWith('linkedin-')) {
            rows.push({ label: 'Email', value: data.email });
        }
        if (data.phone) {
            rows.push({ label: 'Phone', value: data.phone });
        }
        if (data.totalExperienceYears !== undefined && data.totalExperienceYears !== null) {
            rows.push({ label: 'Experience', value: `${data.totalExperienceYears} yrs` });
        }
        if (data.skills && data.skills.length > 0) {
            rows.push({ label: `Skills (${data.skills.length})`, value: null, skills: data.skills.slice(0, 15), totalCount: data.skills.length });
        }
        if (data.about && data.about.length > 10) {
            const truncatedAbout = data.about.length > 120 ? data.about.substring(0, 120) + '...' : data.about;
            rows.push({ label: 'About', value: truncatedAbout });
        }

        profileDetails.innerHTML = rows.map(r => {
            if (r.skills) {
                let chips = r.skills.map(s => `<span class="skill-chip">${s}</span>`).join('');
                if (r.totalCount > 15) {
                    chips += `<span class="skill-chip font-bold">+${r.totalCount - 15} more</span>`;
                }
                return `<div class="detail-row"><span class="detail-label">${r.label}</span></div><div class="skill-chips">${chips}</div>`;
            }
            return `<div class="detail-row"><span class="detail-label">${r.label}</span><span class="detail-value">${r.value}</span></div>`;
        }).join('');
    }
    function sendExtractMessage(tabId, callback) {
        chrome.tabs.sendMessage(tabId, { action: 'EXTRACT_PROFILE' }, (resp) => {
            if (chrome.runtime.lastError) {
                // If content script was disconnected (e.g. after extension reload), automatically inject and retry
                chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    files: ['scripts/content.js']
                }, () => {
                    if (chrome.runtime.lastError) {
                        callback(null, 'Please refresh this LinkedIn tab (F5) and try again.');
                        return;
                    }
                    setTimeout(() => {
                        chrome.tabs.sendMessage(tabId, { action: 'EXTRACT_PROFILE' }, (resp2) => {
                            if (chrome.runtime.lastError) {
                                callback(null, 'Please refresh this LinkedIn tab (F5) and try again.');
                                return;
                            }
                            callback(resp2, null);
                        });
                    }, 250);
                });
                return;
            }
            callback(resp, null);
        });
    }

    // ── Initialise ───────────────────────────────────────────────
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tab;

    // Detect which environment user is on
    if (tab && tab.url && tab.url.includes('localhost')) {
        appBaseUrl = DEV_APP_URL;
    }
    gotoDashboardBtn && (gotoDashboardBtn.onclick = () =>
        chrome.tabs.create({ url: `${appBaseUrl}/settings` })
    );
    openLinkedInBtn && (openLinkedInBtn.onclick = () =>
        chrome.tabs.create({ url: 'https://www.linkedin.com/in/' })
    );

    // Check auth token
    const storage = await chrome.storage.local.get(['jwt_token']);
    const hasToken = !!storage.jwt_token;

    if (hasToken) {
        authBadge.classList.remove('hidden');
        authBadgeLabel.textContent = 'Connected';
    }

    // Routing
    if (!tab || !tab.url || !tab.url.includes('linkedin.com/in/')) {
        showView(notLinkedInView);
    } else if (!hasToken) {
        showView(loginView);
    } else {
        showView(profileView);
        showSubState(preExtractState);
    }

    // ── Token UI ─────────────────────────────────────────────────
    toggleTokenVis && toggleTokenVis.addEventListener('click', () => {
        manualToken.type = manualToken.type === 'password' ? 'text' : 'password';
    });

    saveTokenBtn && saveTokenBtn.addEventListener('click', () => {
        const token = (manualToken.value || '').trim();
        if (!token || token.split('.').length < 3) {
            showToast('Invalid token format. Paste the full JWT.', 'error');
            return;
        }
        chrome.storage.local.set({ jwt_token: token }, () => {
            showToast('Extension activated!', 'success');
            authBadge.classList.remove('hidden');
            setTimeout(() => {
                showView(profileView);
                showSubState(preExtractState);
            }, 800);
        });
    });

    logoutBtn && logoutBtn.addEventListener('click', () => {
        chrome.storage.local.remove(['jwt_token', 'backend_url'], () => {
            authBadge.classList.add('hidden');
            showView(loginView);
            showToast('Disconnected', 'info');
        });
    });

    // ── Self-Contained Async LinkedIn DOM Extractor Function ──────────
    // Executes directly in the LinkedIn tab context via chrome.scripting.executeScript
    async function directExtractLinkedInDOM() {
        try {
            window.scrollBy(0, 400);
            window.scrollBy(0, -400);
        } catch (_) {}

        const data = {
            name: '',
            headline: '',
            role: '',
            primaryRole: '',
            rawHeadline: '',
            location: '',
            country: '',
            locality: '',
            currentOrganization: '',
            company: '',
            email: '',
            phone: '',
            totalExperienceYears: 0,
            experience: 0,
            skills: [],
            languages: [],
            about: '',
            summary: '',
            profileUrl: window.location.href.split('?')[0].replace(/\/overlay\/.*$/, ''),
            extractedAt: new Date().toISOString()
        };

        // Constants and Helpers
        const MONTH_MAP = { jan:1, feb:2, mar:3, apr:4, may:5, jun:6, jul:7, aug:8, sep:9, oct:10, nov:11, dec:12 };
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;
        let earliestCareerYear = 9999;
        let earliestCareerMonth = 1;

        // Generic email filter
        function isGenericEmail(mail) {
            if (!mail || !mail.includes('@')) return true;
            const prefix = mail.split('@')[0].toLowerCase();
            const bad = ['hr','careers','career','jobs','job','info','support','admin','contact','help','sales','press','media','marketing','team','privacy','legal','security','notifications','no-reply','noreply','hello','welcome','office','enquiry','inquiries','feedback','billing'];
            return bad.includes(prefix);
        }

        // Clean company name
        function cleanOrg(raw) {
            if (!raw) return '';
            let text = String(raw).trim();
            text = text.replace(/^(?:You\s+both\s+(?:work|worked)\s+at|You\s+and\s+[\w\s]+\s+(?:work|worked)\s+at|Works?\s+at|Working\s+at)\s+/i, '');
            text = text.replace(/^(?:Current\s+Company|Company)\s*[:=-]?\s*/i, '');
            text = text.replace(/\s+(?:started\s+at|after\s+you\s+did|before\s+you\s+did).*$/i, '');
            text = text.replace(/\s*·.*$/, '');
            text = text.replace(/\s+(?:and|&)\s+\d+\s+other.*$/i, '');
            return text.replace(/^[•·\s\-]+/, '').trim();
        }

        // Date Range parser
        function parseDateRangeMonths(text) {
            if (!text) return 0;
            const clean = String(text).replace(/[\u00A0\u200B\u200C\u200D\uFEFF]/g, ' ');
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
            return 0;
        }

        function parseDur(text) {
            if (!text) return 0;
            const clean = String(text).replace(/[\u00A0\u200B\u200C\u200D\uFEFF]/g, ' ').trim();
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
            const cleanBlock = String(block).replace(/[\u00A0\u200B\u200C\u200D\uFEFF]/g, ' ');
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
                    if (y < earliestCareerYear || (y === earliestCareerYear && m < earliestCareerMonth)) {
                        earliestCareerYear = y;
                        earliestCareerMonth = m;
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
                    const dur = parseDur(line);
                    if (dur > 0) companyDurations.push(dur);
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

            if (earliestYear < 9999 && earliestYear <= currentYear) {
                const careerSpanMonths = ((currentYear - earliestYear) * 12) + (currentMonth - earliestMonth) + 1;
                if (totalMonths === 0 || (careerSpanMonths - totalMonths) > 24) {
                    totalMonths = Math.max(totalMonths, careerSpanMonths);
                }
            }

            return totalMonths;
        }

        // Helper: Universal Clean Role Extraction across all LinkedIn profiles
        function extractCleanRole(rawHeadline, aboutText, experienceList, skillsList) {
            let raw = (rawHeadline || '').trim();
            if (!raw && aboutText) {
                const firstSentence = aboutText.split(/[.!?\n]/)[0];
                const m = firstSentence.match(/(?:working as an?|I am an?|passionate|experienced)\s+([^,.]+)/i);
                if (m) raw = m[1].trim();
            }
            
            const segments = (raw || '').split(/[|·•\/\n–—]/).map(s => s.trim()).filter(s => s.length > 1);

            const roleKeywordRegex = /\b(Full[\s-]?Stack\s+Developer|Full[\s-]?Stack\s+Engineer|Frontend\s+Developer|Frontend\s+Engineer|Front-End\s+Developer|Backend\s+Developer|Backend\s+Engineer|Web\s+Developer|Software\s+Developer|Software\s+Engineer|Application\s+Developer|Java\s+Developer|Python\s+Developer|React\s+Developer|Node(?:\.js)?\s+Developer|DevOps\s+Engineer|Cloud\s+Engineer|Site\s+Reliability\s+Engineer|SRE|QA\s+Engineer|Automation\s+Engineer|Test\s+Engineer|SDET|Manual\s+Tester|Scrum\s+Master|Agile\s+Coach|Product\s+Owner|Product\s+Manager|Project\s+Manager|Program\s+Manager|Data\s+Engineer|Data\s+Scientist|Data\s+Analyst|Business\s+Analyst|UI\/UX\s+Designer|Product\s+Designer|Graphic\s+Designer|Systems?\s+Engineer|Network\s+Engineer|Database\s+Administrator|DBA|Technical\s+Lead|Engineering\s+Manager|Solution\s+Architect|Cloud\s+Architect|Enterprise\s+Architect|Programmer\s+Analyst|Systems\s+Analyst|Consultant|Specialist|Intern|Trainee|Graduate\s+Engineer\s+Trainee|Student|Researcher)\b/i;

            for (const seg of segments) {
                const match = seg.match(roleKeywordRegex);
                if (match) {
                    let cleaned = seg.replace(/\s+(?:at|@)\s+.*$/i, '').trim();
                    cleaned = cleaned.replace(/^(?:Aspiring|Passionate\s+about|Working\s+as\s+an?|I'm\s+an?)\s+/i, '').trim();
                    cleaned = cleaned.replace(/\s*·.*$/, '').trim();
                    if (cleaned.length > 2) return cleaned;
                }
            }

            const singleRoleKeywords = ['Developer', 'Engineer', 'Architect', 'Manager', 'Lead', 'Consultant', 'QA', 'Analyst', 'Scientist', 'Tester', 'Specialist', 'Designer', 'Master', 'Admin', 'Intern', 'Student', 'Trainee', 'Programmer'];
            for (const seg of segments) {
                if (singleRoleKeywords.some(kw => new RegExp(`\\b${kw}\\b`, 'i').test(seg))) {
                    let cleaned = seg.replace(/\s+(?:at|@)\s+.*$/i, '').trim();
                    cleaned = cleaned.replace(/^(?:Aspiring|Passionate\s+about|Working\s+as\s+an?|I'm\s+an?)\s+/i, '').trim();
                    if (cleaned.length > 2) return cleaned;
                }
            }

            const skills = (skillsList || []).map(s => String(s).toLowerCase());
            const hasSkill = (k) => skills.some(s => s.includes(k));

            if (hasSkill('react') || hasSkill('html') || hasSkill('css') || hasSkill('vue') || hasSkill('angular') || hasSkill('frontend') || hasSkill('tailwind')) {
                if (hasSkill('node') || hasSkill('express') || hasSkill('java') || hasSkill('spring') || hasSkill('python') || hasSkill('sql') || hasSkill('mongodb')) {
                    return 'Full Stack Developer';
                }
                return 'Frontend Developer';
            }
            if (hasSkill('node') || hasSkill('express') || hasSkill('java') || hasSkill('spring') || hasSkill('python') || hasSkill('django') || hasSkill('fastapi') || hasSkill('backend') || hasSkill('sql')) {
                return 'Backend Developer';
            }
            if (hasSkill('qa') || hasSkill('selenium') || hasSkill('cypress') || hasSkill('testing') || hasSkill('test')) {
                return 'QA Engineer';
            }
            if (hasSkill('scrum') || hasSkill('agile') || hasSkill('jira')) {
                return 'Scrum Master';
            }
            if (hasSkill('aws') || hasSkill('azure') || hasSkill('docker') || hasSkill('kubernetes') || hasSkill('devops')) {
                return 'DevOps Engineer';
            }
            if (hasSkill('machine learning') || hasSkill('ai') || hasSkill('pandas') || hasSkill('deep learning')) {
                return 'Data Scientist';
            }
            if (skills.length > 0) {
                return 'Software Developer';
            }

            if (segments.length > 0 && segments[0].length > 1) {
                return segments[0].replace(/\s+(?:at|@)\s+.*$/i, '').trim();
            }

            return 'Software Developer';
        }

        // Helper: Extract contact fields from any modal element
        function parseContactFromModal(modal) {
            if (!modal) return;
            const text = modal.innerText || '';

            // Email extraction
            const mailto = modal.querySelector('a[href^="mailto:"]');
            if (mailto) {
                const m = (mailto.getAttribute('href') || mailto.innerText || '').replace(/^mailto:/i, '').split('?')[0].trim();
                if (m.includes('@') && !isGenericEmail(m)) data.email = m;
            }
            if (!data.email) {
                const matches = text.match(/[a-zA-Z0-9+_.-]+@[a-zA-Z0-9.-]+\.[a-zA-Z0-9-]{2,}/g) || [];
                for (const m of matches) {
                    if (!isGenericEmail(m)) { data.email = m.trim(); break; }
                }
            }

            // Phone extraction
            const tel = modal.querySelector('a[href^="tel:"]');
            if (tel) {
                const p = (tel.getAttribute('href') || tel.innerText || '').replace(/^tel:/i, '').replace(/\s*\([^)]*\)/g, '').trim();
                if (p.replace(/\D/g, '').length >= 7) data.phone = p;
            }

            // DOM Section for Phone
            if (!data.phone) {
                const phoneSection = modal.querySelector('section.ci-phone, .pv-contact-info__contact-type.ci-phone, [class*="ci-phone"]')
                    || Array.from(modal.querySelectorAll('section, div')).find(s => /phone|mobile/i.test(s.querySelector('h3, h4, span, header')?.innerText || ''));
                if (phoneSection) {
                    const secText = phoneSection.innerText || '';
                    const m10 = secText.match(/\b(?:\+?91[\s-]?)?[6-9]\d{9}\b/);
                    if (m10) {
                        data.phone = m10[0].replace(/^\+91[\s-]*/, '').trim();
                    } else {
                        const cleaned = secText.replace(/phone|mobile/gi, '').replace(/\([^)]*\)/g, '').trim();
                        if (cleaned.replace(/\D/g, '').length >= 7) {
                            data.phone = cleaned.split('\n').map(l => l.trim()).find(l => l.replace(/\D/g, '').length >= 7) || cleaned;
                        }
                    }
                }
            }

            // Labeled text match (e.g. "Phone\n6304930942 (Mobile)")
            if (!data.phone) {
                const pMatch = text.match(/(?:Phone|Mobile|Contact Number|Tel)\s*[\n\r:]+\s*([^\n\r<]+)/i);
                if (pMatch) {
                    const cleaned = pMatch[1].replace(/\s*\([^)]*\)/g, '').trim();
                    if (cleaned.replace(/\D/g, '').length >= 7 && !/^(address|email|birthday|connected|website|profile)$/i.test(cleaned)) {
                        data.phone = cleaned;
                    }
                }
            }

            // Indian 10-digit mobile number pattern (e.g. 6304930942 or +91 6304930942)
            if (!data.phone) {
                const m10 = text.match(/\b(?:\+?91[\s-]?)?[6-9]\d{9}\b/);
                if (m10) {
                    data.phone = m10[0].replace(/^\+91[\s-]*/, '').trim();
                }
            }

            // General phone number pattern in modal
            if (!data.phone) {
                const numMatches = text.match(/(?:\+?\d{1,4}[-.\s]?)?\(?\d{2,5}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,5}/g) || [];
                for (const num of numMatches) {
                    const digits = num.replace(/\D/g, '');
                    if (digits.length >= 8 && digits.length <= 15) {
                        data.phone = num.trim();
                        break;
                    }
                }
            }
        }

        // 1. JSON-LD Structured Data
        try {
            const scripts = document.querySelectorAll('script[type="application/ld+json"]');
            for (const s of scripts) {
                let json;
                try { json = JSON.parse(s.textContent); } catch (_) { continue; }
                const graph = json['@graph'] || (Array.isArray(json) ? json : [json]);
                const person = (graph || []).find(o => o && (o['@type'] === 'Person' || (Array.isArray(o['@type']) && o['@type'].includes('Person'))));
                if (!person) continue;

                if (person.name) {
                    data.name = String(person.name).replace(/\s*[\(\[\（\【].*?[\)\]\）\】]\s*/g, ' ').replace(/\s+/g, ' ').trim();
                }
                if (person.jobTitle) {
                    const jt = Array.isArray(person.jobTitle) ? person.jobTitle[0] : person.jobTitle;
                    if (jt) {
                        data.headline = String(jt).split('||')[0].replace(/JLPT\s*N[1-5].*$/i, '').trim();
                        data.role = data.headline; data.primaryRole = data.headline;
                    }
                }
                const addr = person.address;
                if (addr && typeof addr === 'object') {
                    const loc = addr.addressLocality || '';
                    const reg = addr.addressRegion || '';
                    let c = addr.addressCountry || '';
                    if (c && typeof c === 'object') c = c.name || '';
                    data.location = [loc, reg, c].filter(Boolean).join(', ');
                    data.locality = [loc, reg].filter(Boolean).join(', ') || loc;
                    data.country = c;
                }
                const works = person.worksFor;
                if (works) {
                    const w = Array.isArray(works) ? works[0] : works;
                    if (w && w.name) data.currentOrganization = cleanOrg(w.name);
                }
                break;
            }
        } catch (_) {}

        // 2. Name
        if (!data.name) {
            const nameEl = document.querySelector('h1.text-heading-xlarge, .pv-top-card-layout__title, h1.v-align-middle, .pv-text-details__left-panel h1, main h1');
            if (nameEl && nameEl.innerText && nameEl.innerText.trim().length > 1) {
                data.name = nameEl.innerText.replace(/[\(\[\（\【][^\)\]\）\】]*[\)\]\）\】]/g, ' ').replace(/\s+/g, ' ').trim();
            }
        }
        if (!data.name) {
            const t = (document.title || '').split('|')[0].replace('LinkedIn', '').replace(/^\(\d+\)\s*/, '').replace(/[\(\[\（\【][^\)\]\）\】]*[\)\]\）\】]/g, ' ').trim();
            if (t.length > 1) data.name = t;
        }

        // 3. Headline / Role
        const headSelectors = [
            'main section [data-view-name="profile-top-card"] .text-body-medium',
            'main section:first-of-type .text-body-medium',
            '.pv-text-details__left-panel .text-body-medium.break-words',
            '.pv-text-details__left-panel .text-body-medium',
            '.text-body-medium.break-words',
            '.top-card-layout__headline',
            '.profile-info-subheader__headline',
            '[data-test-id="headline"]',
            '.flex-1.mr5 h2',
            '.pv-text-details__left-panel div:nth-child(2)',
            'main section .text-body-medium',
        ];

        for (const sel of headSelectors) {
            const headEl = document.querySelector(sel);
            if (headEl && headEl.innerText && headEl.innerText.trim().length > 2) {
                const candidate = headEl.innerText.trim();
                if (/(connections|followers|contact info)/i.test(candidate)) continue;
                if (candidate === data.name) continue;
                data.rawHeadline = candidate;
                break;
            }
        }

        if (!data.rawHeadline || data.rawHeadline.length < 2) {
            const nameH1 = document.querySelector('h1.text-heading-xlarge, .pv-top-card-layout__title, h1');
            if (nameH1) {
                const container = nameH1.closest('.pv-text-details__left-panel') || nameH1.parentElement;
                if (container) {
                    const candidates = container.querySelectorAll('div, h2, span, p');
                    for (const c of candidates) {
                        const txt = (c.innerText || '').trim();
                        if (txt && txt.length > 2 && txt !== data.name && !/(connections|followers|contact info)/i.test(txt)) {
                            data.rawHeadline = txt;
                            break;
                        }
                    }
                }
            }
        }

        if (!data.rawHeadline || data.rawHeadline.length < 2) {
            const t = (document.title || '').replace(/^\(\d+\)\s*/, '').replace(/\s*\|\s*LinkedIn$/i, '').trim();
            const sepMatch = t.match(/\s+[-–—|:]\s+(.+)$/);
            if (sepMatch && sepMatch[1]) {
                data.rawHeadline = sepMatch[1].trim();
            }
        }

        // 4. Location
        if (!data.location) {
            const locEl = document.querySelector('.pv-text-details__left-panel .text-body-small.inline, .top-card-layout__first-subline span');
            if (locEl && locEl.innerText) {
                data.location = locEl.innerText.split('·')[0].split('Contact info')[0].trim();
                data.locality = data.location;
            }
        }

        // 5. Current Organization / Company
        if (!data.currentOrganization) {
            const orgEl = document.querySelector('.pv-text-details__right-panel button span, .pv-text-details__right-panel a span, button[aria-label^="Current company"], a[href*="/company/"]');
            if (orgEl && orgEl.innerText) {
                data.currentOrganization = cleanOrg(orgEl.innerText.split('\n')[0]);
            }
        }
        data.company = data.currentOrganization;

        // 6. Contact Info Modal
        let openedModal = false;
        let existingModal = document.querySelector('#artdeco-modal-outlet [role="dialog"], .artdeco-modal, .pv-contact-info');
        if (!existingModal) {
            const contactLink = document.querySelector('a[href*="/overlay/contact-info/"], #top-card-text-details-contact-info, a[data-control-name="contact_info"]');
            if (contactLink) {
                try {
                    contactLink.click();
                    openedModal = true;
                    await new Promise(r => setTimeout(r, 200));
                    existingModal = document.querySelector('#artdeco-modal-outlet [role="dialog"], .artdeco-modal, .pv-contact-info');
                } catch (_) {}
            }
        }
        if (existingModal) {
            parseContactFromModal(existingModal);
            if (openedModal) {
                try {
                    const closeBtn = document.querySelector('button[aria-label="Dismiss"], button[aria-label="Close"], .artdeco-modal__dismiss');
                    if (closeBtn) closeBtn.click();
                } catch (_) {}
            }
        }

        // 7. Check mailto & tel links across the page
        if (!data.email) {
            const mailto = document.querySelector('a[href^="mailto:"]');
            if (mailto) {
                const m = (mailto.getAttribute('href') || mailto.innerText || '').replace(/^mailto:/i, '').split('?')[0].trim();
                if (m.includes('@') && !isGenericEmail(m)) data.email = m;
            }
        }
        if (!data.phone) {
            const tel = document.querySelector('a[href^="tel:"]');
            if (tel) {
                const p = (tel.getAttribute('href') || tel.innerText || '').replace(/^tel:/i, '').replace(/\s*\([^)]*\)/g, '').trim();
                if (p.replace(/\D/g, '').length >= 7) data.phone = p;
            }
        }

        // 8. Text Regex Scanning across About / Page for Email and Phone
        if (!data.email) {
            const allTxt = document.body.innerText || '';
            const mMatch = allTxt.match(/[a-zA-Z0-9+_.-]+@[a-zA-Z0-9.-]+\.[a-zA-Z0-9-]{2,}/g) || [];
            for (const m of mMatch) {
                if (!isGenericEmail(m)) { data.email = m.trim(); break; }
            }
        }
        if (!data.phone) {
            const allTxt = document.body.innerText || '';
            const m10 = allTxt.match(/\b(?:\+?91[\s-]?)?[6-9]\d{9}\b/);
            if (m10) data.phone = m10[0].replace(/^\+91[\s-]*/, '').trim();
        }

        // 9. Experience Duration Parsing
        let totalMonths = 0;
        const expSection = document.querySelector('#experience')?.closest('section')
                        || document.querySelector('section:has(#experience)')
                        || document.querySelector('#experience')?.parentElement
                        || Array.from(document.querySelectorAll('section')).find(s => {
                            const h = s.querySelector('h2, h3, span');
                            return h && /^experience$/i.test((h.innerText || '').trim());
                        });

        if (expSection) {
            const expText = expSection.innerText || '';
            const months = calculateTotalExperienceFromBlock(expText);
            if (months > 0) totalMonths = months;
        }

        if (totalMonths === 0) {
            const allText = document.body.innerText || '';
            const lines = allText.split('\n').map(l => l.trim()).filter(Boolean);
            const expIdx = lines.findIndex(l => /^experience$/i.test(l));
            if (expIdx >= 0) {
                const expLines = [];
                for (let i = expIdx + 1; i < lines.length && i < expIdx + 120; i++) {
                    if (/^(education|skills|languages|licenses|certifications)/i.test(lines[i])) break;
                    expLines.push(lines[i]);
                }
                const block = expLines.join('\n');
                totalMonths = calculateTotalExperienceFromBlock(block);
            }
        }

        if (totalMonths === 0) {
            const highlights = (document.querySelector('.pv-highlights-section')?.innerText || '') + '\n' + (document.querySelector('#about')?.closest('section')?.innerText || '');
            totalMonths = Math.max(parseDur(highlights), parseDateRangeMonths(highlights));
        }

        data.totalExperienceYears = totalMonths > 0 ? parseFloat((totalMonths / 12).toFixed(1)) : 0;
        data.experience = data.totalExperienceYears;

        if (earliestCareerYear < 9999 && earliestCareerYear <= currentYear) {
            const spanYears = parseFloat(((currentYear - earliestCareerYear) + (currentMonth / 12)).toFixed(1));
            if (spanYears > 0 && spanYears <= 40) {
                if (data.totalExperienceYears === 0 || Math.abs(spanYears - data.totalExperienceYears) > 4) {
                    data.totalExperienceYears = Math.max(data.totalExperienceYears, spanYears);
                    data.experience = data.totalExperienceYears;
                }
            }
        }

        // 10. Skills Extractor
        const skillsSection = document.querySelector('#skills')?.closest('section');
        if (skillsSection) {
            const items = skillsSection.querySelectorAll('li, div[data-view-name="profile-component-entity"]');
            items.forEach(it => {
                const s = (it.querySelector('span[aria-hidden="true"], .hoverable-link-text')?.innerText || it.innerText || '').split('\n')[0].trim();
                if (s && s.length > 1 && s.length < 35 && !/show all|endorse|\+\d+/i.test(s)) {
                    const clean = s.replace(/^[•·\s]+/, '').trim();
                    if (clean && !data.skills.includes(clean)) data.skills.push(clean);
                }
            });
        }

        const masterSkills = ['HTML','CSS','JavaScript','TypeScript','React','React.js','Next.js','Vue','Angular','Redux','Tailwind CSS','Java','Spring','Spring Boot','Hibernate','Python','Django','Flask','FastAPI','Node.js','Express','Go','Golang','Rust','C#','.NET','C++','C','PHP','SQL','MySQL','PostgreSQL','MongoDB','Redis','Oracle','Cassandra','DynamoDB','Elasticsearch','Kafka','RabbitMQ','AWS','Azure','GCP','Docker','Kubernetes','Git','GitHub','Linux','AI','Machine Learning','Deep Learning','OpenAI','Japanese','JLPT N1','JLPT N2','JLPT N3','JLPT N4','JLPT N5'];
        const pageLower = (document.body.innerText || '').toLowerCase();
        masterSkills.forEach(sk => {
            const reg = new RegExp(`\\b${sk.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
            if (reg.test(pageLower) && !data.skills.some(s => s.toLowerCase() === sk.toLowerCase())) {
                data.skills.push(sk);
            }
        });
        data.skills = [...new Set(data.skills)].slice(0, 30);

        // 11. About
        const aboutEl = document.querySelector('#about')?.closest('section');
        if (aboutEl) {
            data.about = (aboutEl.innerText || '').replace(/…see more|see less/gi, '').trim();
            data.summary = data.about;
        }

        // 12. Final Clean Role Assignment
        data.primaryRole = extractCleanRole(data.rawHeadline || data.headline, data.about, [], data.skills);
        data.role = data.primaryRole;
        data.headline = data.primaryRole;

        return data;
    }

    // ── Extract Flow (Fast Direct DOM Scraper + Auto-Fallback) ──────────────────────
    extractBtn && extractBtn.addEventListener('click', async () => {
        setExtractLoading(true);
        try {
            const activeTab = currentTab || (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
            const tabId = activeTab?.id;
            if (!tabId) {
                setExtractLoading(false);
                showToast('No active LinkedIn tab found. Please open a profile.', 'error');
                return;
            }

            // 1. Fast path: Direct DOM execution in the page context
            try {
                const results = await chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    func: directExtractLinkedInDOM
                });
                if (results && results[0] && results[0].result && results[0].result.name) {
                    setExtractLoading(false);
                    onExtracted(results[0].result);
                    return;
                }
            } catch (scriptErr) {
                console.warn('Direct DOM scraper fallback triggered:', scriptErr);
            }

            // 2. Fallback path: Message content script
            sendExtractMessage(tabId, async (resp, err) => {
                setExtractLoading(false);
                if (resp && resp.status === 'success' && resp.data && resp.data.name) {
                    onExtracted(resp.data);
                } else {
                    showToast(err || 'Please refresh this LinkedIn tab (F5) and try again.', 'error');
                }
            });
        } catch (e) {
            setExtractLoading(false);
            showToast(e?.message || 'Extraction failed. Please refresh the page.', 'error');
        }
    });

    function onExtracted(data) {
        extractedData = data;
        renderProfile(data);
        showSubState(postExtractState);

        // First, if it already had a status from AI parsing (sidebar flow)
        if (data.status && data.status !== 'New') {
            showToast('This candidate is already in the candidates page!', 'info');
            if (saveBtnText) saveBtnText.textContent = 'Update Candidate';
            return;
        }

        // If local DOM scraping (popup flow), we need to ask backend if URL exists
        const lnUrl = data.profileUrl || data.linkedinUrl;
        if (lnUrl) {
            chrome.runtime.sendMessage({ action: 'CHECK_DUPLICATE', linkedinUrl: lnUrl }, (resp) => {
                if (resp && resp.status === 'success' && resp.data) {
                    // Backend found the candidate!
                    const existing = resp.data;
                    extractedData.id = existing.id;
                    extractedData.status = existing.status;
                    if (existing.email && !extractedData.email) extractedData.email = existing.email;
                    showToast('This candidate is already in the candidates page!', 'info');
                    if (saveBtnText) saveBtnText.textContent = 'Update Candidate';
                } else {
                    showToast('Profile extracted successfully!', 'success');
                }
            });
        } else {
            showToast('Profile extracted successfully!', 'success');
        }
    }

    reExtractBtn && reExtractBtn.addEventListener('click', () => {
        extractedData = null;
        showSubState(preExtractState);
    });

    // ── Direct Save Helper (Auto-detects Existing Candidate for PUT Update) ──
    async function directSaveCandidate(profileData) {
        const storage = await chrome.storage.local.get(['jwt_token']);
        const token = storage.jwt_token || '';

        const lnUrl = profileData.profileUrl || profileData.linkedinUrl || '';
        let existingId = profileData.id;
        let existingEmail = profileData.email;

        // If no ID yet, check if candidate already exists in backend by LinkedIn URL
        if (!existingId && lnUrl) {
            try {
                const checkRes = await fetch(`https://recruitai-backend-bvo0.onrender.com/api/candidates/check-duplicate?linkedinUrl=${encodeURIComponent(lnUrl)}`, {
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                });
                if (checkRes.ok) {
                    const existing = await checkRes.json();
                    if (existing && existing.id) {
                        existingId = existing.id;
                        if (existing.email) existingEmail = existing.email;
                    }
                }
            } catch (e) {
                console.warn('Duplicate check skipped:', e);
            }
        }

        // If still no ID, check by name
        if (!existingId && profileData.name) {
            try {
                const searchRes = await fetch(`https://recruitai-backend-bvo0.onrender.com/api/candidates/search?search=${encodeURIComponent(profileData.name)}`, {
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                });
                if (searchRes.ok) {
                    const searchResults = await searchRes.json();
                    const match = searchResults.content?.find(c =>
                        (profileData.name && c.name && c.name.toLowerCase() === profileData.name.toLowerCase())
                    );
                    if (match && match.id) {
                        existingId = match.id;
                        if (match.email) existingEmail = match.email;
                    }
                }
            } catch (e) {}
        }

        const isUpdate = !!existingId;
        const targetUrl = isUpdate
            ? `https://recruitai-backend-bvo0.onrender.com/api/candidates/${existingId}`
            : 'https://recruitai-backend-bvo0.onrender.com/api/candidates';

        const finalEmail = (profileData.email && profileData.email.includes('@'))
            ? profileData.email
            : (existingEmail && existingEmail.includes('@'))
                ? existingEmail
                : `linkedin-${Math.random().toString(36).substr(2, 5)}@recruitai.com`;

        const payload = {
            id: existingId || undefined,
            name: profileData.name || 'LinkedIn Candidate',
            email: finalEmail,
            phone: profileData.phone || '',
            role: profileData.primaryRole || profileData.role || profileData.headline || 'Software Developer',
            company: profileData.company || profileData.currentOrganization || '',
            currentOrganization: profileData.currentOrganization || profileData.company || '',
            skills: profileData.skills || [],
            languageSkills: profileData.languages || profileData.languageSkills || [],
            experience: (profileData.totalExperienceYears !== undefined && profileData.totalExperienceYears !== null) ? profileData.totalExperienceYears : (profileData.experience || 0),
            locality: profileData.locality || profileData.location || '',
            country: profileData.country || '',
            linkedinUrl: lnUrl,
            source: 'LinkedIn Extension'
        };

        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(targetUrl, {
            method: isUpdate ? 'PUT' : 'POST',
            headers,
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`API Error (${res.status}): ${errorText}`);
        }
        return await res.json();
    }

    // ── Save Flow ────────────────────────────────────────────────
    saveBtn && saveBtn.addEventListener('click', async () => {
        if (!extractedData) return;
        setSaveLoading(true);

        try {
            chrome.runtime.sendMessage({ action: 'SAVE_CANDIDATE', data: extractedData }, async (resp) => {
                if (chrome.runtime.lastError || !resp || resp.status !== 'success') {
                    console.warn('Background save message failed, attempting direct save...', chrome.runtime.lastError || resp);
                    try {
                        const saved = await directSaveCandidate(extractedData);
                        setSaveLoading(false);
                        savedCandidateId = saved?.id;
                        savedName.textContent = `"${extractedData.name}" has been added to your CRM.`;
                        showSubState(savedState);
                        showToast('Candidate saved!', 'success');
                        return;
                    } catch (directErr) {
                        setSaveLoading(false);
                        console.error('Direct save error:', directErr);
                        showToast(directErr.message || 'Failed to save candidate.', 'error');
                        return;
                    }
                }
                setSaveLoading(false);
                savedCandidateId = resp.data?.id;
                savedName.textContent = `"${extractedData.name}" has been added to your CRM.`;
                showSubState(savedState);
                showToast('Candidate saved!', 'success');
            });
        } catch (outerErr) {
            try {
                const saved = await directSaveCandidate(extractedData);
                setSaveLoading(false);
                savedCandidateId = saved?.id;
                savedName.textContent = `"${extractedData.name}" has been added to your CRM.`;
                showSubState(savedState);
                showToast('Candidate saved!', 'success');
            } catch (err) {
                setSaveLoading(false);
                showToast(err.message || 'Failed to save candidate.', 'error');
            }
        }
    });

    viewInCrmBtn && viewInCrmBtn.addEventListener('click', () => {
        const url = savedCandidateId
            ? `${appBaseUrl}/candidates?id=${savedCandidateId}`
            : `${appBaseUrl}/candidates`;
        chrome.tabs.create({ url });
    });

    extractAnotherBtn && extractAnotherBtn.addEventListener('click', () => {
        extractedData = null;
        savedCandidateId = null;
        showSubState(preExtractState);
    });

});

