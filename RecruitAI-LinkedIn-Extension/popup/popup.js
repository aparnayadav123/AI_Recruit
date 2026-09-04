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
            if (chrome.runtime.lastError) { callback(null, chrome.runtime.lastError.message); return; }
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
            skills: [],
            languages: [],
            about: '',
            summary: '',
            profileUrl: window.location.href.split('?')[0].replace(/\/overlay\/.*$/, ''),
            extractedAt: new Date().toISOString()
        };

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
        if (!data.headline) {
            const headEl = document.querySelector('.pv-text-details__left-panel .text-body-medium, .text-body-medium.break-words, .top-card-layout__headline');
            if (headEl && headEl.innerText) {
                data.rawHeadline = headEl.innerText.trim();
                data.headline = data.rawHeadline.replace(/JLPT\s*N[1-5],?\s*/i, '').split(/ in | at | @ | - | \| /i)[0].trim();
                data.role = data.headline;
                data.primaryRole = data.headline;
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

        // 6. Check if Contact Info Modal is already open
        const existingModal = document.querySelector('#artdeco-modal-outlet, [role="dialog"], .artdeco-modal, .pv-contact-info');
        if (existingModal) {
            parseContactFromModal(existingModal);
        }

        // 7. Auto-open Contact Info Modal if email or phone is missing
        if (!data.email || !data.phone) {
            const contactLink = document.querySelector('a[href*="/overlay/contact-info/"], #top-card-text-details-contact-info, a[data-control-name="contact_info"]')
                || Array.from(document.querySelectorAll('a, button')).find(a => /contact\s*info/i.test(a.innerText || ''));

            if (contactLink) {
                try {
                    contactLink.scrollIntoView({ behavior: 'instant', block: 'center' });
                    contactLink.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
                    
                    // Wait for modal to render in DOM
                    for (let t = 0; t < 10; t++) {
                        await new Promise(r => setTimeout(r, 250));
                        const modal = document.querySelector('#artdeco-modal-outlet, [role="dialog"], .artdeco-modal, .pv-contact-info');
                        if (modal && modal.innerText.length > 20) {
                            parseContactFromModal(modal);
                            // Close modal cleanly once we got what we need or reached last attempt
                            if (data.email && data.phone) {
                                const closeBtn = modal.querySelector('button[aria-label="Dismiss"], button.artdeco-modal__dismiss, [aria-label*="close" i]');
                                if (closeBtn) closeBtn.click();
                                break;
                            }
                        }
                    }
                    const modalToClose = document.querySelector('#artdeco-modal-outlet, [role="dialog"], .artdeco-modal, .pv-contact-info');
                    if (modalToClose) {
                        const closeBtn = modalToClose.querySelector('button[aria-label="Dismiss"], button.artdeco-modal__dismiss, [aria-label*="close" i]');
                        if (closeBtn) closeBtn.click();
                    }
                } catch (e) {}
            }
        }

        // Fallback email from mailto links or about
        if (!data.email) {
            const mailto = document.querySelector('a[href^="mailto:"]');
            if (mailto) {
                const m = (mailto.getAttribute('href') || mailto.innerText || '').replace(/^mailto:/i, '').split('?')[0].trim();
                if (m.includes('@') && !isGenericEmail(m)) data.email = m;
            }
        }

        // 8. Experience Duration Parsing (Strictly scoped, avoids Education degree contamination)
        const MONTH_MAP = { jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11 };
        function parseDateRangeMonths(text) {
            if (!text) return 0;
            const rangeMatch = text.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})\s*[-–—至]\s*(Present|Current|Now|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4}))/i);
            if (rangeMatch) {
                const startMonth = MONTH_MAP[rangeMatch[1].substr(0, 3).toLowerCase()] || 0;
                const startYear = parseInt(rangeMatch[2], 10);
                let endMonth = new Date().getMonth();
                let endYear = new Date().getFullYear();
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
            const mFull = text.match(/(\d+)\s*(?:yrs?|years?)\s*(?:and|,)?\s*(\d+)\s*(?:mos?|months?)/i);
            if (mFull) return (parseInt(mFull[1], 10) * 12) + parseInt(mFull[2], 10);
            const mYr = text.match(/(\d+)\s*(?:yrs?|years?)(?!\s*(?:and|,)?\s*\d+\s*(?:mos?|months?))/i);
            if (mYr) return parseInt(mYr[1], 10) * 12;
            const mMo = text.match(/(?:^|\s|\(|·)(\d+)\s*(?:mos?|months?)/i);
            if (mMo) return parseInt(mMo[1], 10);
            const dateMonths = parseDateRangeMonths(text);
            if (dateMonths > 0) return dateMonths;
            return 0;
        }

        let totalMonths = 0;
        const expSection = document.querySelector('#experience')?.closest('section')
                        || document.querySelector('section:has(#experience)')
                        || document.querySelector('#experience')?.parentElement
                        || Array.from(document.querySelectorAll('section')).find(s => {
                            const h = s.querySelector('h2, h3, span');
                            return h && /^experience$/i.test((h.innerText || '').trim());
                        });

        if (expSection) {
            const items = expSection.querySelectorAll('li, div[data-view-name="profile-component-entity"], .pvs-list__paged-list-item');
            for (const it of items) {
                const text = it.innerText || '';
                const m = Math.max(parseDur(text), parseDateRangeMonths(text));
                if (m > totalMonths) totalMonths = m;
            }
            if (totalMonths === 0) {
                const expText = expSection.innerText || '';
                totalMonths = Math.max(parseDur(expText), parseDateRangeMonths(expText));
            }
        }

        if (totalMonths === 0) {
            // Sliced text between Experience and Education
            const allText = document.body.innerText || '';
            const lines = allText.split('\n').map(l => l.trim()).filter(Boolean);
            const expIdx = lines.findIndex(l => /^experience$/i.test(l));
            if (expIdx >= 0) {
                const expLines = [];
                for (let i = expIdx + 1; i < lines.length && i < expIdx + 80; i++) {
                    if (/^(education|skills|languages|licenses|certifications)/i.test(lines[i])) break;
                    expLines.push(lines[i]);
                }
                const block = expLines.join('\n');
                totalMonths = Math.max(parseDur(block), parseDateRangeMonths(block));
            }
        }

        if (totalMonths === 0) {
            const highlights = (document.querySelector('.pv-highlights-section')?.innerText || '') + '\n' + (document.querySelector('#about')?.closest('section')?.innerText || '');
            totalMonths = Math.max(parseDur(highlights), parseDateRangeMonths(highlights));
        }

        data.totalExperienceYears = totalMonths > 0 ? parseFloat((totalMonths / 12).toFixed(1)) : 0;

        // 9. Skills Extractor
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

        // 10. About
        const aboutEl = document.querySelector('#about')?.closest('section');
        if (aboutEl) {
            data.about = (aboutEl.innerText || '').replace(/…see more|see less/gi, '').trim();
            data.summary = data.about;
        }

        return data;
    }

    // ── Extract Flow (Direct DOM Execution) ──────────────────────
    extractBtn && extractBtn.addEventListener('click', async () => {
        setExtractLoading(true);

        try {
            // 1. Get active tab
            const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
            const activeTab = (tabs && tabs[0]) || currentTab;

            if (!activeTab || !activeTab.id) {
                setExtractLoading(false);
                showToast('Please open a LinkedIn profile tab.', 'error');
                return;
            }

            // 2. Direct DOM execution via chrome.scripting.executeScript
            chrome.scripting.executeScript({
                target: { tabId: activeTab.id },
                func: directExtractLinkedInDOM
            }, (results) => {
                setExtractLoading(false);

                if (chrome.runtime.lastError || !results || !results[0] || !results[0].result) {
                    console.warn('Direct execution fallback to message passing...', chrome.runtime.lastError);
                    // Fallback to message passing
                    sendExtractMessage(activeTab.id, (resp, err) => {
                        if (err || !resp || resp.status !== 'success') {
                            showToast('Please refresh the LinkedIn profile page and click Extract again.', 'error');
                            return;
                        }
                        onExtracted(resp.data);
                    });
                    return;
                }

                // SUCCESS! Directly render the extracted profile
                const extractedProfileData = results[0].result;
                onExtracted(extractedProfileData);
            });
        } catch (err) {
            setExtractLoading(false);
            console.error('Extract error:', err);
            showToast('Extraction error. Please refresh the page.', 'error');
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

        // If no ID yet, check if candidate already exists in backend by LinkedIn URL
        if (!existingId && lnUrl) {
            try {
                const checkRes = await fetch(`https://recruitai-backend-bvo0.onrender.com/api/candidates/check-duplicate?linkedinUrl=${encodeURIComponent(lnUrl)}`, {
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                });
                if (checkRes.ok) {
                    const existing = await checkRes.json();
                    if (existing && existing.id) existingId = existing.id;
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
                    if (match && match.id) existingId = match.id;
                }
            } catch (e) {}
        }

        const isUpdate = !!existingId;
        const targetUrl = isUpdate
            ? `https://recruitai-backend-bvo0.onrender.com/api/candidates/${existingId}`
            : 'https://recruitai-backend-bvo0.onrender.com/api/candidates';

        const payload = {
            id: existingId || undefined,
            name: profileData.name || 'LinkedIn Candidate',
            email: (profileData.email && !profileData.email.startsWith('linkedin-')) ? profileData.email : (isUpdate ? undefined : `linkedin-${Math.random().toString(36).substr(2, 5)}@recruitai.com`),
            phone: profileData.phone || '',
            role: profileData.primaryRole || profileData.headline || 'Professional',
            company: profileData.company || profileData.currentOrganization || '',
            currentOrganization: profileData.currentOrganization || profileData.company || '',
            skills: profileData.skills || [],
            languageSkills: profileData.languages || profileData.languageSkills || [],
            experience: profileData.totalExperienceYears !== undefined ? profileData.totalExperienceYears : (profileData.experience || 0),
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

