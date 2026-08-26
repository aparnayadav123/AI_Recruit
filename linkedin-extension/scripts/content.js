/**
 * LinkedIn Profile Content Scraper
 */

console.log('[RecruitAI] Content Script Loaded');

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'EXTRACT_PROFILE') {
        try {
            const profileData = extractData();
            sendResponse({ status: 'success', data: profileData });
        } catch (error) {
            sendResponse({ status: 'error', message: error.message });
        }
    }
    if (request.action === 'TOGGLE_SIDEBAR') {
        const sidebar = document.getElementById('recruitai-sidebar');
        const toggleBtn = document.getElementById('recruitai-toggle-btn');
        if (sidebar) {
            sidebar.classList.toggle('open');
            if (toggleBtn) {
                toggleBtn.style.right = sidebar.classList.contains('open') ? '420px' : '0';
            }
            sendResponse({ status: 'success', open: sidebar.classList.contains('open') });
        } else {
            sendResponse({ status: 'error', message: 'Sidebar not found. Refresh the page.' });
        }
    }
    return true; // Keep message channel open
});


// LinkedIn page text that EXCLUDES the injected RecruitAI panel. The panel lives in
// <body> as a sibling of <main>, so reading <main> gives the profile content only â€”
// without this, the text parsers matched our OWN UI labels ("Candidate", "Notes",
// "Contact Info") as if they were profile data.
function raiPageText() {
    const main = document.querySelector('main');
    return (main && main.innerText) ? main.innerText : (document.body.innerText || '');
}

// ROBUST PRIMARY SOURCE: LinkedIn embeds a structured Person object as JSON-LD
// (and og: meta tags) for SEO. These DON'T depend on CSS class names, so they
// survive LinkedIn's frequent markup changes â€” unlike the selector scraping below.
function extractFromStructuredData(data) {
    // 1) JSON-LD â€” the most reliable source
    try {
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');
        for (const s of scripts) {
            let json;
            try { json = JSON.parse(s.textContent); } catch (_) { continue; }
            const graph = json['@graph'] || (Array.isArray(json) ? json : [json]);
            const person = (graph || []).find(o => {
                const t = o && o['@type'];
                return t === 'Person' || (Array.isArray(t) && t.includes('Person'));
            });
            if (!person) continue;

            if (person.name) {
                data.name = String(person.name)
                    .replace(/\s*[\(\[\ï¼ˆ\ã€].*?[\)\]\ï¼‰\ã€‘]\s*/g, ' ').replace(/\s+/g, ' ').trim();
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
                const locality = addr.addressLocality || '';
                const region = addr.addressRegion || '';
                let country = addr.addressCountry || '';
                if (country && typeof country === 'object') country = country.name || '';
                const parts = [locality, region, country].filter(Boolean);
                if (parts.length) {
                    data.location = parts.join(', ');
                    data.locality = [locality, region].filter(Boolean).join(', ') || locality;
                    data.country = country || data.country;
                }
            }
            const works = person.worksFor;
            if (works) {
                const w = Array.isArray(works) ? works[0] : works;
                if (w && w.name) data.currentOrganization = String(w.name).trim();
            }
            if (person.knowsLanguage) {
                const langs = Array.isArray(person.knowsLanguage) ? person.knowsLanguage : [person.knowsLanguage];
                const names = langs.map(l => (l && typeof l === 'object') ? l.name : l).filter(Boolean);
                if (names.length) data.languages = names;
            }
            console.log('âœ… JSON-LD extracted:', { name: data.name, role: data.headline, location: data.location, org: data.currentOrganization });
            break;
        }
    } catch (e) { console.warn('JSON-LD parse failed', e); }

    // 2) og:title meta fallback for the headline ("Name - Headline | LinkedIn")
    if (!data.headline) {
        const ogTitle = (document.querySelector('meta[property="og:title"]') || {}).content || '';
        const dash = ogTitle.indexOf(' - ');
        if (dash > 0) {
            const tail = ogTitle.substring(dash + 3).replace(/\s*\|\s*LinkedIn.*$/i, '').trim();
            if (tail.length > 2) {
                data.headline = tail.split('||')[0].replace(/JLPT\s*N[1-5].*$/i, '').trim();
                data.role = data.role || data.headline;
                data.primaryRole = data.primaryRole || data.headline;
            }
        }
    }
}

function extractData() {
    const data = {
        name: '',
        headline: '',
        location: '',
        country: '',
        about: '',
        experience: [],
        education: [],
        currentOrganization: '',
        locality: '',
        skills: [],
        languages: [],
        japaneseLanguageProficiency: '',
        postalCode: '',
        noticePeriod: 0,
        salaryExpectation: '',
        email: '',
        phone: '',
        profileUrl: window.location.href.split('?')[0],
        extractedAt: new Date().toISOString()
    };

    // Fill from LinkedIn's embedded structured data FIRST (class-agnostic, reliable).
    // The CSS-selector scraping below then only overrides when it finds something.
    extractFromStructuredData(data);

    const nameSelectors = [
        'h1.text-heading-xlarge',
        '.pv-top-card-layout__title',
        'h1.v-align-middle',
        '.pv-text-details__left-panel h1',
        '.top-card-layout__title',
        'main h1',
        '#ember35'
    ];

    for (const selector of nameSelectors) {
        const el = document.querySelector(selector);
        if (el) {
            let text = el.innerText || (el.getAttribute && el.getAttribute('alt')) || '';
            if (text && text.trim().length > 1) {
                // Remove brackets (Standard and Full-width) and everything inside them
                data.name = text.replace(/\s*[\(\[\ï¼ˆ\ã€].*?[\)\]\ï¼‰\ã€‘]\s*/g, ' ').replace(/\s+/g, ' ').trim();
                if (data.name.toLowerCase() === 'linkedin member') continue; 
                break;
            }
        }
    }

    if (!data.name || data.name === 'undefined' || data.name.length < 2) {
        const titleParts = document.title.split('|');
        if (titleParts.length > 0) {
            data.name = titleParts[0].replace(' | LinkedIn', '').replace(') LinkedIn', '').trim();
            data.name = data.name.replace(/^\(\d+\)\s*/, '');
            // Repeat cleanup for title with expanded regex
            data.name = data.name.replace(/\s*[\(\[\ï¼ˆ\ã€].*?[\)\]\ï¼‰\ã€‘]\s*/g, ' ').trim();
        }
    }

    console.log('ðŸ” Extracted Name:', data.name);

    // 2. Extract Headline / Role â€” LinkedIn moved this DOM around in 2024+, so
    // we now hunt across many shapes plus the document title.
    let headlineText = "";
    const headlineSelectors = [
        '.pv-text-details__left-panel .text-body-medium.break-words',
        '.pv-text-details__left-panel .text-body-medium',
        '.text-body-medium.break-words',
        '.top-card-layout__headline',
        '.profile-info-subheader__headline',
        '[data-test-id="headline"]',
        '.flex-1.mr5 h2',
        '.pv-text-details__left-panel div:nth-child(2)',
        // Last-resort fallback â€” find any element under <main> whose text
        // looks like a job title (not the location, not the name).
        'main section .text-body-medium',
    ];

    for (const sel of headlineSelectors) {
        const el = document.querySelector(sel);
        if (el && el.innerText && el.innerText.trim().length > 3) {
            const candidate = el.innerText.trim();
            // Reject location-only strings ("Bengaluru, Karnataka, India") and
            // connection-count badges that share the same class name.
            if (/(connections|followers)/i.test(candidate)) continue;
            headlineText = candidate;
            data.rawHeadline = candidate;
            // Keep BOTH the cleaned title (for role) and the full string (for
            // currentOrganization parsing later in this function).
            data.headline = candidate
                .replace(/JLPT\s*N[1-5],?\s*/i, '')
                .split(/ in | at | @ | - | \| /i)[0]
                .trim();
            break;
        }
    }

    // Final fallback â€” the page title is reliably "<Name> - <Headline> | LinkedIn"
    // even when the DOM selectors miss.
    if (!data.headline || data.headline.length < 3) {
        const t = (document.title || '').replace(/\s*\|\s*LinkedIn$/, '');
        const dashIdx = t.indexOf(' - ');
        if (dashIdx > 0) {
            const tail = t.substring(dashIdx + 3).trim();
            if (tail.length > 3) {
                data.headline = tail.split(/ at | @ /i)[0].trim();
                data.rawHeadline = data.rawHeadline || tail;
                console.log('ðŸ” Headline pulled from <title>:', data.headline);
            }
        }
    }

    // Make headline available as the role downstream â€” background.js reads
    // profileData.primaryRole || profileData.headline, but the upper case path
    // (writing data.role too) makes the popup display populate correctly.
    if (data.headline) {
        data.role = data.headline;
        data.primaryRole = data.headline;
    }
    console.log('ðŸ” Cleaned Headline:', data.headline);

    // 3. Extract Location â€” many class variants exist depending on LinkedIn
    // experiment cohort. Walk them and accept the first non-position one.
    const locSelectors = [
        '.pv-text-details__left-panel .text-body-small.inline.t-black--light.break-words',
        '.pv-text-details__left-panel .text-body-small.inline',
        '.text-body-small.inline.t-black--light.break-words',
        '.text-body-small.inline.break-words',
        '.top-card-layout__first-subline .profile-info-subheader span:first-child',
        '.pv-text-details__left-panel span.text-body-small:not(.text-body-medium)',
        // Newer 2024+ DOM
        'main section span.text-body-small.inline.t-black--light',
    ];

    for (const sel of locSelectors) {
        const els = document.querySelectorAll(sel);
        for (const el of els) {
            const raw = (el.innerText || '')
                .split('Â·')[0]
                .split('Contact info')[0]
                .trim();
            // Skip role-like strings (the same class can wrap an experience subtitle)
            // and connection-count badges.
            if (raw.length < 3) continue;
            if (/JLPT|connections|followers/i.test(raw)) continue;
            if (/engineer|developer|analyst|manager|designer|consultant|lead|architect/i.test(raw) && !/,/.test(raw)) continue;
            data.location = raw;
            break;
        }
        if (data.location) break;
    }

    // Split "Bengaluru, Karnataka, India" â†’ locality + country. The last comma-
    // separated segment is the country; everything before it joined back is the
    // locality. Without this, candidate.country was always empty.
    if (data.location) {
        const parts = data.location.split(',').map(s => s.trim()).filter(Boolean);
        if (parts.length >= 2) {
            data.country = parts[parts.length - 1];
            data.locality = parts.slice(0, -1).join(', ');
        } else {
            data.locality = parts[0] || data.location;
        }
    }
    console.log('ðŸ“ Final Location:', data.location, 'â†’ locality:', data.locality, 'country:', data.country);

    // ---- ROBUST TOP-CARD FALLBACK (class-agnostic) ----
    // LinkedIn renames CSS classes per experiment cohort, which breaks the selectors
    // above and leaves Role/Location blank. As a safety net, read the raw text block
    // under the name <h1> and pick the headline + location by shape, not by class.
    if (!data.headline || !data.location) {
        const h1el = document.querySelector('main h1') || document.querySelector('h1');
        // Walk UP from the name until we reach the container that also holds the
        // "Contact info" link / connection count â€” that's the full top card and it
        // contains the headline + location regardless of CSS class names.
        let card = h1el;
        for (let i = 0; i < 8 && card; i++) {
            const t = card.innerText || '';
            if (/contact info/i.test(t) || /\bconnection/i.test(t)) break;
            card = card.parentElement;
        }
        if (card) {
            const firstName = (data.name || '').split(' ')[0];
            // Drop blank lines and the stray "Â·" separators LinkedIn renders.
            const lines = (card.innerText || '').split('\n').map(s => s.trim())
                .filter(s => s && s !== 'Â·');
            const isNoise = (l) =>
                /^(He\/Him|She\/Her|They\/Them)$/i.test(l) ||
                /(connection|follower|mutual|^message$|^follow$|^more$|pending|contact info|status is|Â·\s*(1st|2nd|3rd)|^(1st|2nd|3rd)$)/i.test(l) ||
                /^\d+(st|nd|rd|th)?\+?$/.test(l) ||
                (data.name && l === data.name);
            const looksLikeOrg = (l) => /university|college|institute|school|ltd|inc\.?|llc|pvt|technolog|solutions|services|systems|labs|corp/i.test(l);
            const looksLikeLocation = (l) =>
                (/\barea\b|metropolitan|region|greater\s/i.test(l) ||
                 (/,/.test(l) && l.split(',').length >= 2)) &&
                l.length < 60 && !looksLikeOrg(l);

            const ciIdx = lines.findIndex(l => /contact info/i.test(l));
            const nameIdx = lines.findIndex(l => l === data.name || (firstName && l.includes(firstName)));

            // HEADLINE: first substantive, non-location, non-org line after the name.
            if (!data.headline) {
                for (let i = (nameIdx >= 0 ? nameIdx + 1 : 0); i < lines.length; i++) {
                    const l = lines[i];
                    if (isNoise(l) || looksLikeLocation(l) || looksLikeOrg(l)) continue;
                    if (l.length >= 4 && /[A-Za-z]{3,}/.test(l) && !/^[^A-Za-z0-9]*\d+(st|nd|rd|th)\b/i.test(l)) {
                        data.headline = l.split('||')[0].split('|')[0].replace(/JLPT\s*N[1-5].*$/i, '').trim();
                        data.role = data.role || data.headline;
                        data.primaryRole = data.primaryRole || data.headline;
                        break;
                    }
                }
            }
            // LOCATION: prefer a location-shaped line; else the line just before "Contact info".
            if (!data.location) {
                let loc = lines.find(l => looksLikeLocation(l) && l !== data.headline);
                if (!loc && ciIdx >= 0) {
                    for (let j = ciIdx - 1; j >= 0; j--) {
                        const l = lines[j];
                        if (!isNoise(l) && l !== data.headline && !looksLikeOrg(l) && l.length > 2 && /[a-zA-Z]/.test(l)) { loc = l; break; }
                    }
                }
                if (loc) data.location = loc;
            }
            if (data.location && !data.locality) {
                const parts = data.location.split(',').map(s => s.trim()).filter(Boolean);
                if (parts.length >= 2) { data.country = parts[parts.length - 1]; data.locality = parts.slice(0, -1).join(', '); }
                else data.locality = parts[0];
            }
            console.log('ðŸªª Top-card fallback â†’ headline:', data.headline, '| location:', data.location);
        }
    }

    // ---- BODY-TEXT FALLBACK (no DOM elements/classes at all) ----
    // Most bulletproof: the top card reads "Name / pronouns / Headline / [school] /
    // Location Â· Contact info / N connections". Anchor on the "Contact info" text in
    // the full page text and read headline + location relative to the name.
    if (!data.headline || !data.location) {
        const allLines = (raiPageText() || '').split('\n').map(s => s.trim()).filter(Boolean);
        const firstName = (data.name || '').split(' ')[0];
        const isNoise = (l) =>
            /^(He\/Him|She\/Her|They\/Them)$/i.test(l) ||
            /(connection|follower|mutual|^message$|^follow$|^more$|^connect$|^save$|pending|status is|Â·\s*(1st|2nd|3rd)|^(1st|2nd|3rd)$)/i.test(l) ||
            /^[Â·â€¢]$/.test(l) || /^\d+(st|nd|rd|th)?\+?$/.test(l) ||
            (data.name && l === data.name);
        const looksLikeOrg = (l) => /university|college|institute|school|ltd|inc\.?|llc|pvt|technolog|solutions|services|systems|labs|\bcorp/i.test(l);

        const ciIdx = allLines.findIndex(l => /contact info/i.test(l));
        if (ciIdx > 0) {
            // LOCATION: the "Contact info" line's prefix, else the nearest text line above it.
            if (!data.location) {
                let loc = allLines[ciIdx].split(/Â·|â€¢/)[0].replace(/contact info/i, '').trim();
                if (!loc || loc.length < 2 || isNoise(loc)) {
                    for (let j = ciIdx - 1; j >= Math.max(0, ciIdx - 5); j--) {
                        const l = allLines[j].split(/Â·|â€¢/)[0].trim();
                        if (l.length > 2 && !isNoise(l) && !looksLikeOrg(l)) { loc = l; break; }
                    }
                }
                if (loc && loc.length > 2 && !isNoise(loc)) data.location = loc;
            }
            // HEADLINE: first substantive line after the name (within the window above Contact info).
            if (!data.headline) {
                const winStart = Math.max(0, ciIdx - 12);
                const rel = allLines.slice(winStart, ciIdx).findIndex(l => l === data.name || (firstName && l.includes(firstName)));
                const nameIdx = rel >= 0 ? winStart + rel : winStart;
                for (let i = nameIdx + 1; i < ciIdx; i++) {
                    const l = allLines[i];
                    if (isNoise(l) || looksLikeOrg(l) || l === data.location || /contact info/i.test(l)) continue;
                    if (l.length >= 4 && /[A-Za-z]{3,}/.test(l) && !/^[^A-Za-z0-9]*\d+(st|nd|rd|th)\b/i.test(l)) {
                        data.headline = l.split('||')[0].split('|')[0].replace(/JLPT\s*N[1-5].*$/i, '').trim();
                        data.role = data.role || data.headline;
                        data.primaryRole = data.primaryRole || data.headline;
                        break;
                    }
                }
            }
            if (data.location && !data.locality) {
                const parts = data.location.split(',').map(s => s.trim()).filter(Boolean);
                if (parts.length >= 2) { data.country = parts[parts.length - 1]; data.locality = parts.slice(0, -1).join(', '); }
                else data.locality = parts[0];
            }
        }
        console.log('ðŸ§¾ Body-text fallback â†’ headline:', data.headline, '| location:', data.location);
    }

    // 4. Extract Organization (ULTIMATE EXPERIENCE SCAN)
    const orgSelectors = [
        'ul.pv-text-details__right-panel li.pv-text-details__right-panel-item:first-child',
        'button[aria-label^="Current company"]',
        '[data-tracking-control-name="public_profile_topcard-current-company"]'
    ];
    
    for (const sel of orgSelectors) {
        const el = document.querySelector(sel);
        if (el && el.innerText.trim().length > 1 && !el.innerText.includes('connections')) {
            data.currentOrganization = el.innerText.trim().split('\n')[0];
            break;
        }
    }

    // NUCLEAR EXPERIENCE PARSER: Find the specific 'Present' entry
    if (!data.currentOrganization || data.currentOrganization === 'N/A') {
        const expSection = document.querySelector('#experience')?.parentElement;
        if (expSection) {
            const expItems = expSection.querySelectorAll('li.artdeco-list__item');
            for (const item of expItems) {
                if (item.innerText.includes('Present')) {
                    // Current structure: 1st line is Title, 2nd is Company
                    const lines = item.innerText.split('\n').map(l => l.trim()).filter(l => l.length > 1);
                    if (lines.length > 1) {
                        // Logic: Company is usually 2nd if Title is 1st.
                        // But sometimes it's grouped.
                        const companyLine = lines.find(l => l.includes('Tata') || l.includes('Services') || l.includes('Japan') || l.length > 5 && !l.includes('Present'));
                        if (companyLine) data.currentOrganization = companyLine;
                        break;
                    }
                }
            }
        }
    }

    // Previously hard-renamed Tata â†’ TCS / Business Machines â†’ IBM which stripped
    // useful suffixes like "Japan Branch". Keep the org name as LinkedIn shows it.
    
    // Japanese Proficiency Extraction (from headline if found)
    const jlptMatch = headlineText.match(/JLPT\s*N[1-5]/i);
    if (jlptMatch && (!data.japaneseLanguageProficiency || data.japaneseLanguageProficiency === 'N/A')) {
        data.japaneseLanguageProficiency = jlptMatch[0].toUpperCase();
    }
    
    console.log('ðŸ¢ Final Org:', data.currentOrganization);

    if (!data.currentOrganization || data.currentOrganization === 'N/A') {
        const rawHeadline = data.rawHeadline || headlineText;
        const atMatch = rawHeadline.match(/\b(?:at|@)\s+([^,|-|\||Â·]+)/i);
        if (atMatch) data.currentOrganization = atMatch[1].trim();
    }
    console.log('ðŸ¢ Organization:', data.currentOrganization);

    // 4. Extract About & Global Text Scan (Fallback)
    const aboutSection = document.querySelector('#about');
    if (aboutSection) {
        const aboutText = aboutSection.parentElement.querySelector('.inline-show-more-text');
        data.about = aboutText ? aboutText.innerText.trim() : '';

        // Advanced Email Regex
        const emailMatch = data.about.match(/[a-zA-Z0-9+_.-]+@[a-zA-Z0-9.-]+\.[a-zA-Z0-9-]{2,}/);
        if (emailMatch) {
            data.email = emailMatch[0];
            console.log("ðŸ“§ Found email in About:", data.email);
        }

        // Phone â€” require either an explicit country code (+91â€¦) or a "phone"/
        // "mobile" / "contact" keyword nearby so we don't pick up year ranges or
        // post-IDs that happen to be 10 digits long.
        const phoneInCtx = data.about.match(/(?:phone|mobile|cell|contact|whatsapp|tel)[^\d+]{0,12}(\+?\d[\d\s().-]{8,16}\d)/i);
        const internationalPhone = data.about.match(/\+\d{1,3}[\s.-]?\d[\d\s().-]{7,14}\d/);
        const phoneMatch = phoneInCtx || internationalPhone;
        if (phoneMatch) {
            data.phone = (phoneMatch[1] || phoneMatch[0]).trim();
            console.log("ðŸ“± Found phone in About:", data.phone);
        }

        // SMART SALARY & NOTICE PERIOD DETECTION
        const salaryMatch = data.about.match(/salary\s*(?:expectations?|expectation|desired)?\s*[:=-]?\s*([â‚¹$Â¥â‚¬]?\d+[kKmMbB]?\+?)/i) || 
                            data.about.match(/lpa\s*[:=-]?\s*(\d+\+?)/i);
        if (salaryMatch) {
            data.salaryExpectation = salaryMatch[1];
            console.log("ðŸ’° Found salary in About:", data.salaryExpectation);
        }

        const noticeMatch = data.about.match(/(\d+)\s*days?\s*notice/i) || 
                            data.about.match(/notice\s*period\s*[:=-]?\s*(\d+)\s*days?/i) ||
                            data.about.match(/(immediately|available now)/i);
        if (noticeMatch) {
            data.noticePeriod = noticeMatch[1].toLowerCase() === 'immediately' ? 0 : parseInt(noticeMatch[1]);
            console.log("â²ï¸ Found notice period in About:", data.noticePeriod);
        }
    }

    // FINAL FALLBACK: Scan entire page for email if still missing
    if (!data.email || !data.email.includes('@')) {
        const pageText = raiPageText();
        const globalEmailMatch = pageText.match(/[a-zA-Z0-9+_.-]+@[a-zA-Z0-9.-]+\.[a-zA-Z0-9-]{2,}/);
        if (globalEmailMatch) {
            data.email = globalEmailMatch[0];
            console.log("ðŸŽ¯ Found email via Global Page Scan:", data.email);
        }
    }

    // 5. Extract Experience & Total Years
    const experienceSection = document.querySelector('#experience');
    const roleNoise = ['Full-time', 'Part-time', 'Self-employed', 'Freelance', 'Contract', 'Internship', 'Apprenticeship', 'Seasonal', 'Remote', 'On-site', 'Hybrid'];

    let totalMonths = 0;

    if (experienceSection) {
        const expItems = experienceSection.parentElement.querySelectorAll('li.artdeco-list__item');
        console.log(`ðŸ” Found ${expItems.length} experience items`);

        expItems.forEach((item, index) => {
            if (index > 15) return; 

            const isPresent = item.innerText.includes('Present');

            // Parse Duration for total years
            const durationMatch = item.innerText.match(/(\d+)\s*yrs?\s*(\d+)\s*mos?|(\d+)\s*yrs?|(\d+)\s*mos?/);
            if (durationMatch) {
                let yrs = parseInt(durationMatch[1] || durationMatch[3] || 0);
                let mos = parseInt(durationMatch[2] || durationMatch[4] || 0);
                totalMonths += (yrs * 12) + mos;
            }

            // --- Robust Role/Company Extraction ---
            let role = '';
            let company = '';

            // Update selectors for expanded compatibility
            const roleEl = item.querySelector('.display-flex.align-items-center.mr1.t-bold span[aria-hidden="true"], div > div > span[aria-hidden="true"]');
            const companyEl = item.querySelector('.t-14.t-normal span[aria-hidden="true"], .t-14.t-normal.t-black--light span[aria-hidden="true"]');
            
            const isGroup = item.querySelector('.pvs-entity__sub-components, .pvs-list__item--line-separated');
            if (isGroup && item.innerText.includes('roles')) {
                const topCompanyEl = item.querySelector('.display-flex.align-items-center.mr1.t-bold span[aria-hidden="true"]');
                company = topCompanyEl ? topCompanyEl.innerText.split('Â·')[0].trim() : '';
                
                const roles = item.querySelectorAll('.pvs-list__item--line-separated');
                if (roles.length > 0) {
                    const latestRoleEl = roles[0].querySelector('span[aria-hidden="true"]');
                    role = latestRoleEl ? latestRoleEl.innerText.trim() : '';
                }
            } else if (roleEl && companyEl) {
                role = roleEl.innerText.trim();
                company = companyEl.innerText.split('Â·')[0].trim();
            } else {
                const textContent = item.innerText.split('\n').map(t => t.trim()).filter(t => t.length > 1);
                role = textContent[0] || '';
                company = textContent[1] || '';
            }

            // Robust Cleaning & Company Extraction
            const isProbablyCompany = (text) => {
                if (!text) return false;
                const kw = ['pvt', 'ltd', 'limited', 'inc', 'technologies', 'services', 'global', 'solutions', 'systems', 'corporation', 'corp', 'solutions', 'pvt.', 'ltd.', 'india', 'private', 'college', 'university', 'institute', 'software', 'bank', 'consulting', 'group', 'industries'];
                const regex = new RegExp(`\\b(${kw.join('|')})\\b`, 'i');
                return regex.test(text);
            };

            if (role && company) {
                if (isProbablyCompany(role) && !isProbablyCompany(company)) {
                    [role, company] = [company, role];
                }
            }
            
            // If we found a company but no role, or role looks like a company name
            if (company && (!role || isProbablyCompany(role))) {
                const headerText = item.querySelector('.display-flex.align-items-center.mr1.t-bold span[aria-hidden="true"]')?.innerText || '';
                if (headerText && !isProbablyCompany(headerText)) {
                    role = headerText;
                }
            }

            if (role && !roleNoise.includes(role) && role.length > 2) {
                role = role.split(' at ')[0].split(' @ ')[0].split(' - ')[0].trim();
                
                if (role && (company || isPresent)) {
                    data.experience.push({ title: role, company: company || 'Current Project', isPresent: isPresent });
                    
                    if (isPresent) {
                        data.primaryRole = role;
                        data.currentOrganization = company || data.currentOrganization;
                    } else if (!data.primaryRole) {
                         data.primaryRole = role;
                         data.currentOrganization = company || data.currentOrganization;
                    }
                }
            }
        });
    }

    // Ultimate Organization Fallback: Check Top Card and Education
    if (!data.currentOrganization || data.currentOrganization === 'N/A') {
        const topCardCompany = document.querySelector('.pv-text-details__right-panel-list button, button[aria-label^="Current company"], .Experience-link');
        if (topCardCompany) {
            data.currentOrganization = topCardCompany.innerText.split('\n')[0].trim();
            console.log('ðŸ›ï¸ Organization found in Top Card:', data.currentOrganization);
        }
    }

    // Convert months to decimal years (e.g., 2 yrs 6 mos -> 2.5)
    data.totalExperienceYears = totalMonths > 0 ? parseFloat((totalMonths / 12).toFixed(1)) : 0;
    
    // Fallback if sum is 0 but we have items
    if (data.totalExperienceYears === 0 && data.experience.length > 0) {
        data.totalExperienceYears = data.experience.length; // Fallback to item count if parsing failed
    }

    // Ultimate Locality Fallback: Use profile location if specific job location not found
    if (!data.locality && data.location) {
        data.locality = data.location.split('Â·')[0].trim();
        if (data.locality.includes(',')) {
            data.locality = data.locality.split(',')[0].trim(); // Get just the city
        }
    }

    // Postal code â€” only accept when it's introduced by an explicit keyword in
    // the About section. The previous loose `\d{3}-\d{4}` regex matched random
    // dates and IDs anywhere on the page.
    if (data.about) {
        const pcMatch = data.about.match(/\b(?:postal\s*code|pin\s*code|zip(?:\s*code)?)\s*[:\-]?\s*(\d{3}[- ]?\d{3,4})\b/i);
        if (pcMatch) data.postalCode = pcMatch[1].replace(/\s/g, '');
    }

    // 6. Extract Skills (Technical focus)
    const skillsAnchor = document.querySelector('#skills');
    const commonSoftSkills = [
        'Communication', 'Leadership', 'Management', 'Teamwork', 'Problem Solving',
        'Adaptability', 'Time Management', 'Creativity', 'Interpersonal Skills',
        'Public Speaking', 'Customer Service', 'Negotiation', 'Conflict Resolution',
        'Decision Making', 'Emotional Intelligence', 'Microsoft Office', 'English',
        'Hindi', 'Telugu', 'Spanish', 'French', 'Japanese', 'Bengali', 'Marathi', 'Tamil', 'Urdu'
    ];

    if (skillsAnchor) {
        const skillsContainer = skillsAnchor.closest('.pvs-list__outer-container') || skillsAnchor.parentElement;
        if (skillsContainer) {
            const listItems = skillsContainer.querySelectorAll('li.artdeco-list__item, .pvs-list__item--line-separated');
            listItems.forEach(item => {
                const skillTitle = item.querySelector('span[aria-hidden="true"]') || item.querySelector('.mr1 span');
                if (skillTitle) {
                    const skill = skillTitle.innerText.trim();
                    if (skill && !skill.includes('Endorsement') && !skill.match(/^\+\d+$/) && skill.length > 1) {
                        // Filter out common soft skills to lean towards "Technical"
                        if (!commonSoftSkills.some(soft => skill.toLowerCase() === soft.toLowerCase())) {
                            data.skills.push(skill);
                        }
                    }
                }
            });
        }
    }

    // Global search for skills across the whole page text as fallback
    if (data.skills.length < 5) {
        const pageText = raiPageText();
        const commonTech = ['Java', 'Python', 'React', 'Angular', 'AWS', 'Azure', 'SQL', 'Node', 'Spring', 'Docker', 'Kubernetes', 'Manual Testing', 'Automation', 'Selenium', 'Jira', 'Agile', 'DevOps', 'CI/CD'];
        commonTech.forEach(k => {
            if (pageText.toLowerCase().includes(k.toLowerCase()) && !data.skills.includes(k)) {
                data.skills.push(k);
            }
        });
    }

    // 6b. Extract Education â€” degree + institution per entry
    const educationAnchor = document.querySelector('#education');
    if (educationAnchor) {
        const eduContainer = educationAnchor.closest('.pvs-list__outer-container') || educationAnchor.parentElement;
        if (eduContainer) {
            const eduItems = eduContainer.querySelectorAll('li.artdeco-list__item, .pvs-list__item--line-separated');
            eduItems.forEach((item, i) => {
                if (i > 8) return;
                const lines = item.innerText.split('\n').map(l => l.trim()).filter(Boolean);
                if (lines.length === 0) return;
                const institution = lines[0];
                const degree = lines[1] || '';
                const entry = degree ? `${degree}, ${institution}` : institution;
                if (entry.length > 3 && !entry.toLowerCase().includes('endorse')) {
                    data.education.push(entry);
                }
            });
            data.education = [...new Set(data.education)].slice(0, 5);
        }
    }
    console.log('ðŸŽ“ Education:', data.education);

    // 7. Extract Languages
    const languagesAnchor = document.querySelector('#languages') ||
                            document.querySelector('section[id="languages"]') ||
                            [...document.querySelectorAll('h2')].find(h2 => h2.innerText.includes('Languages'));
    
    if (languagesAnchor) {
        const languagesContainer = languagesAnchor.closest('.pvs-list__outer-container') || languagesAnchor.parentElement;
        if (languagesContainer) {
            const listItems = languagesContainer.querySelectorAll('li.artdeco-list__item, .pvs-list__item--line-separated');
            listItems.forEach(item => {
                const langTitle = item.querySelector('span[aria-hidden="true"], .mr1 span');
                if (langTitle) {
                    const lang = langTitle.innerText.trim();
                    if (lang && lang.length > 1 && !lang.includes('Show all')) {
                        data.languages.push(lang);
                    }
                }
            });
        }
    }

    // If the structured section yielded nothing, read ONLY the profile's "Languages"
    // section from the page text: scan from the "Languages" heading until the next
    // section, and accept a line ONLY if it exactly matches a real language name.
    // This avoids both (a) the old page-wide scan that matched language words anywhere,
    // and (b) over-strict proficiency matching that missed languages with no proficiency
    // line shown.
    if (data.languages.length === 0) {
        const KNOWN_LANGUAGES = ['English','Hindi','Telugu','Tamil','Kannada','Malayalam','Marathi','Gujarati','Punjabi','Bengali','Urdu','Odia','Assamese','Konkani','Sanskrit','Nepali','Sinhala',
            'Spanish','French','German','Italian','Portuguese','Dutch','Russian','Polish','Swedish','Norwegian','Danish','Finnish','Greek','Czech','Hungarian','Romanian','Ukrainian','Bulgarian','Serbian','Croatian',
            'Japanese','Chinese','Mandarin','Cantonese','Korean','Vietnamese','Thai','Indonesian','Malay','Tagalog','Filipino','Burmese','Khmer','Lao',
            'Arabic','Hebrew','Persian','Farsi','Turkish','Swahili','Pashto','Dari'];
        const lns = (raiPageText() || '').split('\n').map(s => s.trim()).filter(Boolean);
        const head = lns.findIndex(l => /^languages$/i.test(l));
        if (head >= 0) {
            const nextSection = /^(skills|experience|education|licenses|certifications|projects|recommendations|interests|causes|honors|awards|publications|volunteer|courses|organizations|test scores|activity|people also viewed|you might|promoted|featured|about)$/i;
            for (let i = head + 1; i < lns.length && i < head + 50; i++) {
                const l = lns[i];
                if (nextSection.test(l)) break;
                const match = KNOWN_LANGUAGES.find(k => k.toLowerCase() === l.toLowerCase());
                if (match && !data.languages.includes(match)) data.languages.push(match);
            }
        }
    }

    // Specific Japanese Proficiency scan
    const japMatch = raiPageText().match(/JLPT\s*(N[1-5])|Japanese\s*(?:Proficiency|Proficient|Native|Fluent|N[1-5])/i);
    if (japMatch) {
        data.japaneseLanguageProficiency = japMatch[0].trim();
    }

    // Deduplicate
    data.skills = [...new Set(data.skills)].slice(0, 50);
    data.languages = [...new Set(data.languages)];

    // Smart Fallback for Role
    if (!data.primaryRole && data.headline) {
        // DETECT KEYWORD HEADLINES: If headline has many commas/pipes, it's a skill list
        const isSkillList = (data.headline.match(/[,|]/g) || []).length > 3;
        
        if (isSkillList) {
            // Option A: Try to find a role-like string (Software Engineer, QA, etc.)
            const roleKeywords = ['Engineer', 'Developer', 'Architect', 'Manager', 'Lead', 'Consultant', 'QA', 'Analyst', 'Scientist', 'Testing', 'Tester', 'Specialist', 'Lead'];
            const foundRole = data.headline.split(/[,|]/).find(part => roleKeywords.some(kw => part.toLowerCase().includes(kw.toLowerCase())));
            
            if (foundRole) {
                data.primaryRole = foundRole.trim();
            } else if (data.about) {
                // Option B: Search first sentence of About section
                const firstSentence = data.about.split(/[.!?]/)[0];
                const aboutRoleMatch = firstSentence.match(/(?:working as a|I am a|passionate|Experienced)\s+([^,.]+)/i);
                if (aboutRoleMatch) data.primaryRole = aboutRoleMatch[1].trim();
            }
        }

        // Final generic cleanup if still using headline parts
        if (!data.primaryRole) {
            const firstPart = data.headline.split(/[,|@]/)[0].trim();
            data.primaryRole = firstPart;
        }
        
        if (data.primaryRole.length < 2) data.primaryRole = 'Professional';
    }

    // 8. Map About to Summary
    data.summary = data.about;

    // 9. Global Page Scan for Email/Phone (Fallback if modal not opened)
    const pageText = raiPageText();
    
    if (!data.email) {
        const emailMatch = pageText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (emailMatch) {
            data.email = emailMatch[0];
            console.log('ðŸ“§ Auto-detected Email from page text:', data.email);
        }
    }

    if (!data.phone) {
        // Only accept a phone if it has an explicit `+` country code prefix.
        // The looser pattern was matching 10-digit IDs / years on the page.
        const phoneMatch = pageText.match(/\+\d{1,3}[\s.-]?\d[\d\s().-]{7,14}\d/);
        if (phoneMatch) {
            data.phone = phoneMatch[0].trim();
            console.log('ðŸ“ž Auto-detected Phone from page text:', data.phone);
        }
    }

    console.log('ðŸ“Š Full Extracted Data:', data);

    // Diagnostic â€” a one-liner the user can quote back when reporting an
    // extraction problem. Tells us which fields filled and which didn't.
    console.log('ðŸ©º Extraction summary:', {
        name: !!data.name,
        headline_role: !!data.headline,
        location: !!data.location,
        locality: !!data.locality,
        country: !!data.country,
        currentOrganization: !!data.currentOrganization,
        skills: (data.skills || []).length,
        languages: (data.languages || []).length,
        experience_items: (data.experience || []).length,
        email: !!data.email,
        phone: !!data.phone,
        linkedinUrl: !!data.profileUrl,
    });

    return data;
}

// --- Sidebar Injection Logic ---

let sidebarVisible = false;
let fileToUpload = null; // Store selected/dropped file here

function createSidebar() {
    // 1. Inject Styles
    const style = document.createElement('style');
    style.innerHTML = `

        #recruitai-sidebar {
            position: fixed;
            top: 20px; /* Floating style */
            right: -440px;
            width: 420px;
            height: calc(100vh - 40px);
            background: #ffffff;
            box-shadow: -10px 0 50px rgba(0,0,0,0.08);
            z-index: 2147483647;
            transition: right 0.4s cubic-bezier(0.16, 1, 0.3, 1);
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            display: flex;
            flex-direction: column;
            border: 2px solid #dbeafe; /* border-blue-100 */
            border-radius: 2.5rem 0 0 2.5rem;
            overflow: hidden;
        }
        #recruitai-sidebar.open {
            right: 0;
        }
        #recruitai-sidebar * {
            box-sizing: border-box;
        }

        /* Header Section */
        .rai-header {
            background: #eff6ff; /* bg-blue-50 */
            color: #1e3a8a; /* text-blue-900 */
            padding: 24px 28px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #dbeafe;
        }
        .rai-logo {
            font-size: 20px;
            font-weight: 800;
            letter-spacing: -0.5px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .rai-badge {
            background: #2563eb; /* blue-500 */
            color: white;
            font-size: 10px;
            padding: 2px 6px;
            border-radius: 6px;
            font-weight: 900;
            text-transform: uppercase;
        }
        .rai-header-title {
            font-size: 18px;
            font-weight: 600;
        }
        .rai-header-tabs {
            display: flex;
            background: white;
            padding: 0 16px;
            border-bottom: 1px solid #e5e7eb;
        }
        .rai-h-tab {
            padding: 14px 16px;
            font-size: 14px;
            font-weight: 500;
            color: #6b7280;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            border-bottom: 2px solid transparent;
        }
        .rai-h-tab.active {
            color: #1d4ed8;
            border-bottom-color: #1d4ed8;
        }

        /* Content Area */
        .rai-scroll-content {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
            background: #ffffff;
        }

        /* Status Box */
        .rai-status-box {
            background: #f0fdf4;
            border: 2px solid #dcfce7;
            padding: 16px;
            border-radius: 1.5rem;
            margin-bottom: 24px;
            font-size: 13px;
            color: #166534;
            line-height: 1.5;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }
        .rai-status-box strong {
            font-weight: 600;
        }
        .rai-status-link {
            color: #1d4ed8;
            text-decoration: none;
            font-weight: 500;
            cursor: pointer;
        }

        /* Action Icons */
        .rai-actions {
            display: flex;
            gap: 12px;
            margin-bottom: 24px;
        }
        .rai-action-btn {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            border: 1px solid #e5e7eb;
            background: white;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #6b7280;
            cursor: pointer;
            transition: all 0.2s;
        }
        .rai-action-btn:hover {
            color: #1d4ed8;
            border-color: #1d4ed8;
            background: #eff6ff;
        }

        /* Profile Section */
        .rai-profile-section {
            display: flex;
            gap: 16px;
            margin-bottom: 24px;
            align-items: flex-start;
        }
        .rai-avatar {
            width: 72px;
            height: 72px;
            border-radius: 50%;
            background: #e5e7eb;
            flex-shrink: 0;
            overflow: hidden;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .rai-avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .rai-avatar-placeholder {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            font-weight: 600;
            color: #6b7280;
            background: #f3f4f6;
        }
        .rai-info {
            flex: 1;
        }
        .rai-name {
            font-size: 18px;
            font-weight: 700;
            color: #111827;
            margin-bottom: 4px;
            line-height: 1.2;
        }
        .rai-role {
            font-size: 14px;
            color: #4b5563;
            margin-bottom: 12px;
            line-height: 1.4;
        }
        
        /* Contact Details */
        .rai-contact-row {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 8px;
            font-size: 13px;
            color: #4b5563;
        }
        .rai-contact-icon {
            width: 16px;
            color: #9ca3af;
        }

        /* Detail/Note Tabs */
        .rai-content-tabs {
            display: flex;
            border-bottom: 1px solid #e5e7eb;
            margin: 20px 0;
        }
        .rai-c-tab {
            flex: 1;
            text-align: center;
            padding: 10px;
            font-size: 14px;
            font-weight: 600;
            color: #6b7280;
            cursor: pointer;
        }
        .rai-c-tab.active {
            color: #1d4ed8;
            border-bottom: 2px solid #1d4ed8;
        }

        /* Form/Data */
        .rai-section-title {
            font-size: 12px;
            font-weight: 600;
            color: #6b7280;
            margin-bottom: 8px;
            text-transform: uppercase;
        }
        .rai-data-box {
            background: #f8fafc;
            padding: 16px;
            border-radius: 1rem;
            border: 2px solid #f1f5f9;
            font-size: 14px;
            color: #1f2937;
            margin-bottom: 20px;
        }

        /* New tabular form styling â€” labels on the left, inputs on the right
           with consistent row height, subtle dividers, and section banding. */
        .rai-form-card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 0;
            margin-bottom: 14px;
            overflow: hidden;
            box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
        }
        .rai-form-card__header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
            padding: 8px 14px;
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 0.15em;
            color: #475569;
            text-transform: uppercase;
        }
        .rai-form-card__header .rai-card-pill {
            font-size: 9px;
            font-weight: 800;
            letter-spacing: 0.1em;
            background: #eff6ff;
            color: #1d4ed8;
            border: 1px solid #dbeafe;
            border-radius: 999px;
            padding: 2px 8px;
        }
        .rai-row {
            display: grid;
            grid-template-columns: 120px 1fr;
            align-items: center;
            gap: 10px;
            padding: 9px 14px;
            border-bottom: 1px solid #f1f5f9;
            min-height: 44px;
        }
        .rai-row:last-child { border-bottom: none; }
        .rai-row__label {
            font-size: 11px;
            font-weight: 700;
            color: #475569;
            letter-spacing: 0.04em;
            text-transform: uppercase;
        }
        .rai-row__input,
        .rai-row__textarea {
            width: 100%;
            font-family: inherit;
            font-size: 13px;
            color: #0f172a;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 7px 10px;
            background: #ffffff;
            outline: none;
            transition: border-color 0.15s ease, box-shadow 0.15s ease;
            box-sizing: border-box;
        }
        .rai-row__input:focus,
        .rai-row__textarea:focus {
            border-color: #2563eb;
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
        }
        .rai-row__textarea {
            min-height: 60px;
            resize: vertical;
            line-height: 1.45;
        }
        .rai-row__input::placeholder,
        .rai-row__textarea::placeholder {
            color: #94a3b8;
        }
        .rai-row--split {
            grid-template-columns: 120px 1fr 1fr;
        }
        .rai-row--split .rai-row__input + .rai-row__input { margin-left: 0; }
        .rai-row--full {
            grid-template-columns: 1fr;
        }
        .rai-row--full .rai-row__label {
            margin-bottom: 4px;
        }

        /* Resume Upload */
        .rai-upload-box {
            border: 2px dashed #d1d5db;
            border-radius: 8px;
            padding: 30px 20px;
            text-align: center;
            background: #f9fafb;
            cursor: pointer;
            transition: all 0.2s;
            margin-top: 20px;
        }
        .rai-upload-box:hover {
            border-color: #1d4ed8;
            background: #eff6ff;
        }
        .rai-upload-icon {
            margin-bottom: 8px;
            color: #6b7280;
        }
        .rai-upload-text {
            font-size: 13px;
            color: #6b7280;
            font-weight: 500;
        }

        /* Toggle Button */
        #recruitai-toggle-btn {
            position: fixed;
            top: 50%;
            right: 0;
            transform: translateY(-50%);
            width: 52px;
            height: 52px;
            background: #2563eb; /* blue-500 */
            color: white;
            border-radius: 1.25rem 0 0 1.25rem;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 10000;
            box-shadow: -4px 0 20px rgba(14, 165, 233, 0.3);
            border: none;
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        #recruitai-toggle-btn:hover {
            width: 56px;
        }
    `;
    document.head.appendChild(style);

    // 2. Inject Toggle Button
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'recruitai-toggle-btn';
    toggleBtn.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
        </svg>`;
    toggleBtn.title = 'Open RecruitAI';
    toggleBtn.onclick = toggleSidebar;
    document.body.appendChild(toggleBtn);

    // 3. Inject Sidebar
    const sidebar = document.createElement('div');
    sidebar.id = 'recruitai-sidebar';
    sidebar.innerHTML = `
        <div class="rai-header" style="display:flex; justify-content:space-between; align-items:center;">
            <div class="rai-logo">RecruitAI <span class="rai-badge">PRO</span></div>
            <div style="display:flex; gap:12px;">
                <button id="rai-sync-btn" title="Sync All Info" style="background:none; border:none; color:#2563eb; cursor:pointer; display:flex; align-items:center; transition: all 0.3s ease; padding: 4px; border-radius: 8px;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M23 4v6h-6"></path><path d="M1 20v-6h6"></path><path d="M3.51 9a9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                </button>
                <button id="rai-close" class="rai-close-btn" style="background:none; border:none; color:#f43f5e; cursor:pointer; display:flex; align-items:center; transition: all 0.3s ease; padding: 4px; border-radius: 8px;">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>
        </div>
        
        <div class="rai-header-tabs">
            <div class="rai-h-tab active" data-view="candidate">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                Candidate
            </div>
            <div class="rai-h-tab" data-view="contact">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                Contact
            </div>
            <div class="rai-h-tab" data-view="company">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
                Company
            </div>
        </div>

        <div class="rai-scroll-content">
            <!-- VIEW: CONTACT (Initially Hidden) -->
            <div id="rai-view-contact" class="rai-main-view" style="display:none;">
                 <div class="rai-status-box" style="margin-bottom:20px; background:#f8fafc; border-color:#e2e8f0; color:#475569;">
                    <div style="display:flex; align-items:start; gap:10px;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:#2563eb;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                        <span>Looking for verified contact information? Use our advanced scraper to find hidden emails and numbers.</span>
                    </div>
                 </div>
                 <div style="padding:10px; background:#eff6ff; border:1px solid #dbeafe; border-radius:1rem; margin-bottom:20px;">
                    <p style="font-size:12px; color:#1d4ed8; font-weight:600; margin-bottom:10px;">Available Scrapers:</p>
                    <div style="display:flex; flex-direction:column; gap:8px;">
                        <button class="rai-action-btn" style="width:100%; justify-content:start; background:white; cursor:not-allowed; opacity:0.7;">
                             LinkedIn Basic Scraper <span style="margin-left:auto; font-size:10px; color:#10b981;">ACTIVE</span>
                        </button>
                        <button class="rai-action-btn" style="width:100%; justify-content:start; background:white; cursor:not-allowed; opacity:0.5;">
                             RocketReach API <span style="margin-left:auto; font-size:10px; color:#6b7280;">COMING SOON</span>
                        </button>
                    </div>
                 </div>
            </div>

            <!-- VIEW: COMPANY (Initially Hidden) -->
            <div id="rai-view-company" class="rai-main-view" style="display:none;">
                 <div style="padding:20px; text-align:center;">
                    <div style="width:64px; height:64px; background:#f1f5f9; border-radius:1rem; display:flex; align-items:center; justify-content:center; margin:0 auto 15px;">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="1.5"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
                    </div>
                    <h4 id="rai-company-view-title" style="font-size:16px; font-weight:700; color:#1e293b; margin-bottom:4px;">Organization Info</h4>
                    <p id="rai-company-view-subtitle" style="font-size:13px; color:#64748b;">Extracting firmographic data...</p>
                 </div>
                 <div class="rai-data-box" style="background:#f8fafc; border-radius:1rem; padding:15px; border:2px solid #f1f5f9;">
                    <div class="rai-contact-row">
                        <strong>Industry:</strong> <span id="rai-company-industry">Technology</span>
                    </div>
                    <div class="rai-contact-row">
                        <strong>Size:</strong> <span id="rai-company-size">1,001-5,000 employees</span>
                    </div>
                    <div class="rai-contact-row">
                        <strong>Headquarters:</strong> <span id="rai-company-hq">San Francisco, CA</span>
                    </div>
                 </div>
            </div>

            <!-- VIEW: CANDIDATE (Default) -->
            <div id="rai-view-candidate" class="rai-main-view">
            <!-- Status Box -->
            <div class="rai-status-box" id="rai-status-box">
                <div style="display:flex; align-items:start; gap:8px;">
                    <svg width="16" height="16" style="margin-top:2px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                    <span>
                        Candidate extracted successfully.<br>
                        <span id="rai-save-status">Ready to add to specific job pipeline.</span>
                    </span>
                </div>
            </div>

            <!-- Profile Overview (Editable) -->
            <div class="rai-profile-section" style="margin-bottom:15px;">
                <div class="rai-avatar">
                   <div class="rai-avatar-placeholder" id="rai-avatar-text">U</div>
                </div>
                <div class="rai-info" style="width:100%;">
                    <!-- Split Name Fields -->
                    <div style="display:flex; gap:8px; margin-bottom:6px;">
                        <input type="text" id="rai-fname-input" class="rai-input" placeholder="First Name" style="font-weight:600;">
                        <input type="text" id="rai-lname-input" class="rai-input" placeholder="Last Name" style="font-weight:600;">
                    </div>
                    
                    <input type="text" id="rai-role-input" class="rai-input" placeholder="Current Role" style="font-size:13px; margin-bottom:8px; color:#4b5563;">
                    
                    <div class="rai-contact-row" style="display:flex; align-items:center;">
                        <svg class="rai-contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                        <input type="text" id="rai-email-input" class="rai-input" placeholder="Email Address" style="flex:1;">
                        <span id="rai-fetch-email-btn" title="Fetch Email" style="cursor:pointer; padding:2px 6px; border-radius:4px; font-size:10px; color:#2563eb; background:#eff6ff; font-weight:700; margin-left:4px;">FETCH</span>
                    </div>
                    <div class="rai-contact-row" style="display:flex; align-items:center;">
                        <svg class="rai-contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                        <input type="text" id="rai-phone-input" class="rai-input" placeholder="Phone" style="flex:1;">
                        <span id="rai-fetch-phone-btn" title="Fetch Phone" style="cursor:pointer; padding:2px 6px; border-radius:4px; font-size:10px; color:#2563eb; background:#eff6ff; font-weight:700; margin-left:4px;">FETCH</span>
                    </div>
                    <div class="rai-contact-row">
                        <svg class="rai-contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                        <input type="text" id="rai-location-input" class="rai-input" placeholder="Location">
                    </div>
                </div>
            </div>

            <!-- Action Buttons Row (Removed as requested) -->
            <!-- <div class="rai-actions">
                <button class="rai-action-btn" title="View Resume"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg></button>
                <button class="rai-action-btn" title="View Jobs"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg></button>
                <button class="rai-action-btn" title="Sync Profile" id="rai-sync-btn"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6"></path><path d="M1 20v-6h6"></path><path d="M3.51 9a9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg></button>
            </div> -->

            <!-- Content Tabs -->
            <div class="rai-content-tabs" style="margin: 10px 0;">
                <div class="rai-c-tab active" data-tab="details" style="padding:8px;">Details</div>
                <div class="rai-c-tab" data-tab="notes" style="padding:8px;">Notes</div>
                <div class="rai-c-tab" data-tab="contact" style="padding:8px;">Contact Info</div>
            </div>

            <!-- TAB CONTENT: DETAILS â€” tabular form for a cleaner, professional look -->
            <div id="rai-tab-details" class="rai-tab-content">

                <!-- Section: Availability -->
                <div class="rai-form-card">
                    <div class="rai-form-card__header">
                        <span>Availability</span>
                    </div>
                    <div class="rai-row">
                        <div class="rai-row__label">Notice Period</div>
                        <input type="number" id="rai-notice-input" class="rai-row__input" placeholder="Days">
                    </div>
                    <div class="rai-row">
                        <div class="rai-row__label">Relevant Exp.</div>
                        <input type="number" id="rai-rel-exp-input" class="rai-row__input" placeholder="Years">
                    </div>
                </div>

                <!-- Section: Skills -->
                <div class="rai-form-card" id="rai-skills-container">
                    <div class="rai-form-card__header">
                        <span>Extracted Skills</span>
                        <span id="rai-skills-status" class="rai-card-pill">Scanningâ€¦</span>
                    </div>
                    <div class="rai-row rai-row--full">
                        <textarea id="rai-skills-input" class="rai-row__textarea" placeholder="Skills separated by commas"></textarea>
                    </div>
                </div>

                <!-- Section: Resume -->
                <div class="rai-form-card">
                    <div class="rai-form-card__header">
                        <span>Resume</span>
                        <label style="display:flex; align-items:center; gap:6px; font-size:11px; font-weight:700; color:#475569; cursor:pointer; text-transform:none; letter-spacing:0;">
                            <input type="checkbox" id="rai-save-resume-checkbox" checked style="accent-color:#1d4ed8; transform:scale(0.95);">
                            Save LinkedIn Resume
                        </label>
                    </div>
                    <div style="padding:12px 14px;">
                        <div class="rai-upload-box" id="rai-upload-zone" style="margin-top:0; padding:18px;">
                            <div class="rai-upload-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                            </div>
                            <div class="rai-upload-text" id="rai-upload-text">
                                Click or drag Resume/CV here
                                <div style="font-size:10px; color:#94a3b8; margin-top:2px;">PDF Â· DOCX Â· TXT &nbsp;Â·&nbsp; auto-generated if empty</div>
                            </div>
                        </div>
                        <input type="file" id="rai-file-input" style="display:none;" accept=".pdf,.doc,.docx,.txt">
                    </div>
                </div>
            </div>

            <!-- TAB CONTENT: NOTES -->
            <div id="rai-tab-notes" class="rai-tab-content" style="display:none;">
                <textarea class="rai-input" style="width:100%; height:200px; border:1px solid #e5e7eb; padding:10px;" placeholder="Add private notes about this candidate..."></textarea>
            </div>

            <!-- TAB CONTENT: CONTACT -->
            <div id="rai-tab-contact" class="rai-tab-content" style="display:none;">
                 <div class="rai-status-box" style="margin-bottom:10px; background:#fff7ed; border-color:#ffedd5; color:#9a3412;">
                    <strong>Note:</strong> Phone numbers are usually hidden. Click below to try and fetch from "Contact Info".
                 </div>
                 <button id="rai-fetch-contact" style="width:100%; padding:8px; background:#4b5563; color:white; border:none; border-radius:4px; cursor:pointer;">
                    Fetch Contact Details
                 </button>
            </div>

            <!-- Footer Actions â€” clean save panel -->
            <div style="margin-top:14px; padding:14px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px;">
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:14px;">
                    <label style="display:flex; align-items:center; gap:8px; font-size:12px; color:#475569; font-weight:600; cursor:pointer;">
                        <input type="checkbox" id="rai-contact-checkbox" style="accent-color:#475569; transform:scale(1.05);">
                        Save as Contact
                    </label>
                    <label style="display:flex; align-items:center; gap:8px; font-size:12px; color:#1d4ed8; font-weight:700; cursor:pointer;">
                        <input type="checkbox" id="rai-hotlist-checkbox" style="accent-color:#1d4ed8; transform:scale(1.05);">
                        Priority Hotlist
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" stroke-width="1"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>
                    </label>
                </div>

                <button id="rai-save-btn" style="width:100%; padding:13px; background:linear-gradient(135deg,#2563eb,#1d4ed8); color:white; border:none; border-radius:10px; font-weight:700; cursor:pointer; font-size:14px; letter-spacing:0.02em; transition:transform 0.15s ease, box-shadow 0.15s ease; box-shadow:0 8px 16px -6px rgba(37, 99, 235, 0.5);">
                    Save Candidate
                </button>
            </div>
          </div> <!-- Close rai-view-candidate -->
        </div>
    `;
    document.body.appendChild(sidebar);

    // 4. Attach Listeners
    document.getElementById('rai-close').onclick = toggleSidebar;
    document.getElementById('rai-save-btn').onclick = saveToCRM;
    document.getElementById('rai-fetch-contact').onclick = fetchContactInfo;
    document.getElementById('rai-fetch-email-btn').onclick = fetchContactInfo;
    document.getElementById('rai-fetch-phone-btn').onclick = fetchContactInfo;

    // Removal of premature auto-fetch (moved to populateSidebar)

    // Sync Button Logic
    const syncBtn = document.getElementById('rai-sync-btn');
    if (syncBtn) {
        syncBtn.onclick = async () => {
            const originalIcon = syncBtn.innerHTML;
            syncBtn.innerHTML = `<div style="animation: spin 1s linear infinite;">â†»</div>`;

            // Add style for spin if not exists
            if (!document.getElementById('rai-spin-style')) {
                const s = document.createElement('style');
                s.id = 'rai-spin-style';
                s.innerHTML = `@keyframes spin { 100% { transform: rotate(360deg); } }`;
                document.head.appendChild(s);
            }

            console.log('ðŸ”„ Syncing Profile...');
            try {
                populateSidebar(); // Sync main data
                await fetchContactInfo(); // Sync contact info
                // Re-trigger auto-enrich is handled by createSidebar's logic if re-run, 
                // but since we are just repopulating data, we might need to manually call it or depend on the initial load.
                // For simplicity in this context, we'll let the user rely on the initial auto-load.
            } catch (e) {
                console.error("Sync error:", e);
            } finally {
                setTimeout(() => {
                    syncBtn.innerHTML = originalIcon;
                }, 500);
            }
        };
    }

    // Top Header Navigation Tabs
    const hTabs = document.querySelectorAll('.rai-h-tab');
    hTabs.forEach(tab => {
        tab.onclick = () => {
            hTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Hide all main views
            document.querySelectorAll('.rai-main-view').forEach(v => v.style.display = 'none');

            // Show selected view
            const viewType = tab.getAttribute('data-view');
            document.getElementById('rai-view-' + viewType).style.display = 'block';
        };
    });

    const tabs = document.querySelectorAll('.rai-c-tab');
    tabs.forEach(tab => {
        tab.onclick = () => {
            // Remove active from all
            tabs.forEach(t => t.classList.remove('active'));
            // Add active to clicked
            tab.classList.add('active');

            // Hide all contents
            document.querySelectorAll('.rai-tab-content').forEach(c => c.style.display = 'none');

            // Show target
            const target = tab.getAttribute('data-tab');
            document.getElementById('rai-tab-' + target).style.display = 'block';
        };
    });

    // File Input Listener (Click)
    document.getElementById('rai-upload-zone').onclick = () => {
        document.getElementById('rai-file-input').click();
    };

    document.getElementById('rai-file-input').onchange = function (e) {
        if (e.target.files.length > 0) {
            fileToUpload = e.target.files[0]; // Unify storage
            updateUploadUI(fileToUpload.name);
        }
    };

    // Drag and Drop Listeners
    const dropZone = document.getElementById('rai-upload-zone');

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.background = '#eff6ff';
        dropZone.style.borderColor = '#1d4ed8';
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.style.background = '#f9fafb';
        dropZone.style.borderColor = '#d1d5db';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.background = '#f0fdf4';
        dropZone.style.borderColor = '#10b981';

        if (e.dataTransfer.files.length > 0) {
            fileToUpload = e.dataTransfer.files[0];
            updateUploadUI(fileToUpload.name);
            console.log("ðŸ“‚ File Dropped:", fileToUpload.name);
        }
    });

}

function updateUploadUI(fileName) {
    document.getElementById('rai-upload-text').innerHTML = `<strong>${fileName}</strong> selected<br><span style="font-size:11px; color:#10b981;">Ready to save</span>`;
    document.getElementById('rai-upload-zone').style.borderColor = '#10b981';
    document.getElementById('rai-upload-zone').style.background = '#f0fdf4';
}

function toggleSidebar() {
    const sidebar = document.getElementById('recruitai-sidebar');
    const btn = document.getElementById('recruitai-toggle-btn');

    if (sidebarVisible) {
        sidebar.classList.remove('open');
        btn.style.right = '0';
    } else {
        sidebar.classList.add('open');
        btn.style.right = '420px';

        // NOTE: contact info is fetched ONLY when the user clicks a FETCH button.
        // Auto-fetching on open used to pop LinkedIn's "Contact info" modal unprompted
        // and log a noisy "Contact modal polling timed out" error whenever the person
        // hadn't shared an email/phone â€” which is the common case.

        // Polling Extraction: Retries every second for 8 seconds to handle dynamic LinkedIn loading
        let attempts = 0;
        const maxAttempts = 8;
        populateSidebar(); // Immediate first try
        
        const pollExtract = setInterval(() => {
            // Stop immediately if this script is orphaned (extension reloaded while the
            // tab stayed open) â€” prevents the stale-context / chrome-extension://invalid
            // error loop.
            if (!chrome.runtime || !chrome.runtime.id) { clearInterval(pollExtract); return; }
            attempts++;
            const currentName = document.getElementById('rai-fname-input')?.value;
            const currentRole = document.getElementById('rai-role-input')?.value;
            const currentLoc = document.getElementById('rai-location-input')?.value;

            // Re-run only while critical fields are still missing (LinkedIn lazy-loads).
            // Was checking rai-company-input, which doesn't exist â†’ it always re-ran 8Ã—,
            // stacking duplicate status lines and firing 8 backend calls.
            if ((!currentName || !currentRole || !currentLoc) && attempts < maxAttempts) {
                console.log(`ðŸ”„ Re-extracting data (Attempt ${attempts}/8)...`);
                populateSidebar();
            } else {
                clearInterval(pollExtract);
            }
        }, 1000);
    }
    sidebarVisible = !sidebarVisible;
}

// Function to handle "Contact Info" scraping
async function fetchContactInfo() {
    const btn = document.getElementById('rai-fetch-contact');
    if (!btn) return; // sidebar not ready / element missing â€” never throw
    const originalText = btn.textContent;
    btn.textContent = 'Opening Contact Modal...';
    btn.style.background = '#6b7280';

    // 1. Find the "Contact info" link with multiple strategies
    let contactLink = document.querySelector('a[href*="contact-info"]') ||
        document.querySelector('#top-card-text-details-contact-info') ||
        document.querySelector('a[data-control-name="contact_info"]');

    if (!contactLink) {
        // Fallback: search by text
        const anchors = Array.from(document.querySelectorAll('a'));
        contactLink = anchors.find(a => a.textContent.toLowerCase().includes('contact info'));
    }

    if (contactLink) {
        // Use a more robust click method
        contactLink.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => {
            contactLink.dispatchEvent(new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window
            }));
        }, 300);

        // 2. Wait for modal to appear (Polling)
        let attempts = 0;
        const maxAttempts = 30; // 15 seconds max

        const poll = setInterval(() => {
            if (!chrome.runtime || !chrome.runtime.id) { clearInterval(poll); return; }
            attempts++;
            // Check for various modal wrappers
            const modal = document.querySelector('.artdeco-modal') || 
                          document.querySelector('[role="dialog"]') ||
                          document.querySelector('.pv-contact-info');

            if (modal && modal.innerText.length > 50) {
                clearInterval(poll);
                console.log("ðŸ” Scanning Contact Modal Text...");
                const fullText = modal.innerText;

                let foundAny = false;

                // Improved Email Regex
                const emailMatch = fullText.match(/[a-zA-Z0-9+_.-]+@[a-zA-Z0-9.-]+\.[a-zA-Z0-9-]{2,}/);
                if (emailMatch) {
                    const emailInput = document.getElementById('rai-email-input');
                    if (emailInput) emailInput.value = emailMatch[0];
                    foundAny = true;
                    console.log("âœ… Found Email in Modal:", emailMatch[0]);
                }

                // Generic Phone Regex (works better for various formats)
                const phoneMatch = fullText.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,5}\)?[-.\s]?\d{3,4}[-.\s]?\d{4,6}/);
                if (phoneMatch) {
                    const phoneInput = document.getElementById('rai-phone-input');
                    if (phoneInput) phoneInput.value = phoneMatch[0];
                    foundAny = true;
                    console.log("âœ… Found Phone in Modal:", phoneMatch[0]);
                }

                if (foundAny) {
                    btn.textContent = 'Contact Info Fetched!';
                    btn.style.background = '#059669';
                    const emailShortcut = document.getElementById('rai-fetch-email-btn');
                    const phoneShortcut = document.getElementById('rai-fetch-phone-btn');
                    if (emailShortcut && emailMatch) {
                        emailShortcut.textContent = 'DONE';
                        emailShortcut.style.background = '#dcfce7';
                        emailShortcut.style.color = '#15803d';
                    }
                    if (phoneShortcut && phoneMatch) {
                        phoneShortcut.textContent = 'DONE';
                        phoneShortcut.style.background = '#dcfce7';
                        phoneShortcut.style.color = '#15803d';
                    }
                    
                    // Trigger a re-extraction of other small details if needed
                    extractedProfile.email = emailMatch ? emailMatch[0] : extractedProfile.email;
                    extractedProfile.phone = phoneMatch ? phoneMatch[0] : extractedProfile.phone;
                } else {
                    btn.textContent = 'No Details Found';
                    btn.style.background = '#ef4444';
                }

                // Close modal after delay
                setTimeout(() => {
                    const closeBtn = modal.querySelector('button[aria-label="Dismiss"]') || 
                                     document.querySelector('button[aria-label="Dismiss"]') ||
                                     modal.querySelector('.artdeco-modal__dismiss');
                    if (closeBtn) closeBtn.click();
                    
                    if (!foundAny) {
                        setTimeout(() => { 
                            btn.textContent = originalText; 
                            btn.style.background = '#4b5563'; 
                        }, 2000);
                    }
                }, 1500);

            } else if (attempts >= maxAttempts) {
                clearInterval(poll);
                btn.textContent = 'No Contact Info';
                btn.style.background = '#6b7280';
                // Not an error â€” the person simply hasn't shared an email/phone.
                console.log("Contact modal not available (no shared contact info).");
                setTimeout(() => { 
                    btn.textContent = originalText; 
                    btn.style.background = '#4b5563'; 
                }, 3000);
            }
        }, 500);
    } else {
        btn.textContent = 'Link Not Found';
        btn.style.background = '#ef4444';
        console.error("âŒ Could not find Contact Info link on profile.");
        setTimeout(() => { btn.textContent = originalText; btn.style.background = '#4b5563'; }, 3000);
    }
}

let extractedProfile = null;

function populateSidebar() {
    // Show loading state...

    // Inject Input Styles
    if (!document.getElementById('rai-input-style')) {
        const style = document.createElement('style');
        style.id = 'rai-input-style';
        style.innerHTML = `
            .rai-input {
                width: 100%;
                border: 1px solid transparent;
                background: transparent;
                padding: 4px;
                border-radius: 4px;
                transition: all 0.2s;
                font-family: inherit;
                color: inherit;
            }
            .rai-input:hover {
                background: #f9fafb;
                border-color: #e5e7eb;
            }
            .rai-input:focus {
                background: white;
                border-color: #3b82f6;
                outline: none;
            }
        `;
        document.head.appendChild(style);
    }

    try {
        extractedProfile = extractData();

        // Reset the status line each run so the polling re-runs don't stack duplicate
        // "Found N languages" lines and AI badges.
        const statusReset = document.getElementById('rai-save-status');
        if (statusReset) statusReset.innerHTML = 'Ready to add to specific job pipeline.';

        // Split Name Logically
        document.getElementById('rai-fname-input').value = extractedProfile.name.split(' ')[0] || '';
        document.getElementById('rai-lname-input').value = extractedProfile.name.split(' ').slice(1).join(' ') || '';
        const roleInputEl = document.getElementById('rai-role-input');
        roleInputEl.value = extractedProfile.primaryRole || extractedProfile.headline || '';
        // Last-ditch role fallback: pull the headline from the page <title>
        // ("Name - Headline | LinkedIn") so Current Role is never left blank when
        // the profile DOM selectors miss on a given LinkedIn layout cohort.
        if (!roleInputEl.value) {
            const t = (document.title || '').replace(/^\(\d+\)\s*/, '').replace(/\s*\|\s*LinkedIn.*$/i, '');
            const dash = t.indexOf(' - ');
            if (dash > 0) {
                roleInputEl.value = t.substring(dash + 3).replace(/JLPT\s*N[1-5].*$/i, '').replace(/\|+$/, '').trim();
            }
        }
        document.getElementById('rai-location-input').value = extractedProfile.location || '';

        // Use extracted email or leave blank - NO PLACEHOLDERS
        if (extractedProfile.email && extractedProfile.email.includes('@')) {
            const emailInput = document.getElementById('rai-email-input');
            if (emailInput && !emailInput.value) emailInput.value = extractedProfile.email; 
        } else {
            const emailInput = document.getElementById('rai-email-input');
            if (emailInput && !emailInput.value) emailInput.placeholder = "Click FETCH to find email";
        }

        document.getElementById('rai-phone-input').value = extractedProfile.phone || '';
        if (!extractedProfile.phone) {
            document.getElementById('rai-phone-input').placeholder = "Phone not found";
        }

        const avatarText = document.getElementById('rai-avatar-text');
        avatarText.textContent = extractedProfile.name ? extractedProfile.name.charAt(0) : 'U';

        // Null-safe setter â€” several of these input ids (rai-company-input,
        // rai-locality-input, rai-postal-input, rai-japanese-input) don't
        // exist in the current sidebar HTML. Writing `.value` to a null lookup
        // threw a TypeError synchronously, breaking populateSidebar AND
        // saveToCRM (which froze the Save button at "Savingâ€¦" forever).
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val;
        };
        const extractedCompany = extractedProfile.currentOrganization || 'N/A';
        setVal('rai-company-input', extractedCompany);
        setVal('rai-locality-input', extractedProfile.locality || '');
        setVal('rai-postal-input', extractedProfile.postalCode || '');
        setVal('rai-japanese-input', extractedProfile.japaneseLanguageProficiency || '');

        // Populate new fields
        setVal('rai-notice-input', extractedProfile.noticePeriod || 0);
        setVal('rai-cur-salary-input', extractedProfile.currentSalary || '');
        setVal('rai-exp-salary-input', extractedProfile.salaryExpectation || '');
        setVal('rai-rel-exp-input', extractedProfile.relevantExperience || 0);
        setVal('rai-visa-input', extractedProfile.visaType || '');

        // Populate Company View
        document.getElementById('rai-company-view-title').textContent = extractedCompany;
        document.getElementById('rai-company-view-subtitle').textContent = extractedProfile.primaryRole || 'Current Organization';
        document.getElementById('rai-company-industry').textContent = extractedProfile.industry || 'Technology / Services';
        document.getElementById('rai-company-hq').textContent = extractedProfile.locality || extractedProfile.location || 'Global';

        // Skills
        const skillsText = extractedProfile.skills ? extractedProfile.skills.join(', ') : '';
        document.getElementById('rai-skills-input').value = skillsText;

        // Languages (Extra info in status or could add a field)
        const langCount = extractedProfile.languages ? extractedProfile.languages.length : 0;
        if (langCount > 0) {
            const statusSpan = document.getElementById('rai-save-status');
            statusSpan.innerHTML += `<br><span style="color:#2563eb; font-size:11px;">ðŸŒ Found ${langCount} languages: ${extractedProfile.languages.join(', ')}</span>`;
        }

        // FETCH ALL SKILLS (Async Enhancement)
        (async () => {
            const statusSpan = document.getElementById('rai-skills-status');
            if (!statusSpan) return;
            
            statusSpan.textContent = 'Fetching full list...';
            statusSpan.style.color = '#d97706';

            try {
                const allSkills = await enrichSkills(extractedProfile);
                if (allSkills && allSkills.length > extractedProfile.skills.length) {
                    extractedProfile.skills = allSkills;
                    document.getElementById('rai-skills-input').value = allSkills.join(', ');
                    statusSpan.textContent = `âœ… Found ${allSkills.length} skills`;
                    statusSpan.style.color = '#059669';
                } else {
                    const count = allSkills ? allSkills.length : extractedProfile.skills.length;
                    statusSpan.textContent = `(Found ${count})`;
                    statusSpan.style.color = '#6b7280';
                }
            } catch (e) {
                console.warn("Skill fetch attempt failed", e);
                statusSpan.textContent = '(limited list)';
                statusSpan.style.color = '#9ca3af';
            }
        })();
        // Removing broken auto-click reference to non-existent button

        // --- DYNAMIC AI ENRICHMENT (Advanced Pass) ---
        (async () => {
            const statusSpan = document.getElementById('rai-save-status');
            if (statusSpan) {
                const aiBadge = document.createElement('div');
                aiBadge.id = 'rai-ai-loading';
                aiBadge.innerHTML = 'âœ¨ AI analyzing profile...';
                aiBadge.style.cssText = 'font-size:10px; color:#7c3aed; margin-top:4px; font-weight:bold;';
                statusSpan.appendChild(aiBadge);

                try {
                    const rawText = raiPageText();
                    let aiResolved = false;
                    // Watchdog: in MV3 the service worker can be torn down before it
                    // replies, leaving this callback unfired. Never let the "analyzing"
                    // badge spin forever â€” clear it after 12s no matter what.
                    const aiTimeout = setTimeout(() => {
                        if (!aiResolved) { aiResolved = true; aiBadge.remove(); }
                    }, 12000);

                    chrome.runtime.sendMessage({ action: 'PARSE_PROFILE', text: rawText }, (response) => {
                        if (aiResolved) return;
                        aiResolved = true;
                        clearTimeout(aiTimeout);

                        // A dropped message channel / backend error surfaces here â€”
                        // bail cleanly instead of hanging the badge.
                        if (chrome.runtime.lastError) { aiBadge.remove(); return; }

                        if (response && response.status === 'success' && response.data) {
                            const aiData = response.data;
                            console.log("ðŸ¤– Dynamic AI Enrichment Data:", aiData);

                            // Update fields ONLY if AI found better info or current is empty.
                            // Null-safe: several of these ids don't exist in every layout.
                            const updateIfEmpty = (id, val) => {
                                const el = document.getElementById(id);
                                if (el && (!el.value || el.value === '0' || el.value === 'N/A') && val) {
                                    el.value = val;
                                    el.style.borderLeft = '2px solid #7c3aed'; // Highlight AI-enriched
                                }
                            };

                            // Fill the role from AI too â€” this was missing, so a profile
                            // whose headline didn't scrape was left with a blank role.
                            updateIfEmpty('rai-role-input', aiData.primaryRole || aiData.role || aiData.headline);
                            updateIfEmpty('rai-fname-input', aiData.name?.split(' ')[0]);
                            updateIfEmpty('rai-lname-input', aiData.name?.split(' ').slice(1).join(' '));
                            updateIfEmpty('rai-notice-input', aiData.noticePeriod);
                            updateIfEmpty('rai-rel-exp-input', aiData.experience);
                            updateIfEmpty('rai-visa-input', aiData.visaType);
                            updateIfEmpty('rai-summary-input', aiData.summary);
                            // Email / phone parsed from the page text by the backend
                            if (aiData.email && aiData.email.includes('@') && !aiData.email.startsWith('pending-')) {
                                updateIfEmpty('rai-email-input', aiData.email);
                            }
                            updateIfEmpty('rai-phone-input', aiData.phone);
                            // Skills â€” fill the box when DOM scraping left it empty
                            const skillsEl = document.getElementById('rai-skills-input');
                            if (skillsEl && (!skillsEl.value || !skillsEl.value.trim())
                                    && Array.isArray(aiData.skills) && aiData.skills.length) {
                                skillsEl.value = aiData.skills.join(', ');
                                skillsEl.style.borderLeft = '2px solid #7c3aed';
                            }

                            // Guard the notes textarea â€” it has no `rai-notes-text` id in
                            // the current sidebar, so the old unconditional write threw
                            // here and left the badge spinning forever.
                            if (aiData.summary) {
                                const notesEl = document.getElementById('rai-notes-text');
                                if (notesEl) notesEl.value = aiData.summary;
                            }

                            aiBadge.innerHTML = 'âœ¨ AI Analysis Complete';
                            aiBadge.style.color = '#059669';
                            setTimeout(() => aiBadge.remove(), 3000);
                        } else {
                            aiBadge.remove();
                        }
                    });
                } catch (e) {
                    // "Extension context invalidated" = the extension was reloaded while
                    // this tab stayed open, orphaning this script. Tell the user the fix
                    // (refresh the page) instead of failing silently.
                    const stale = String(e && e.message).toLowerCase().includes('context invalidated');
                    if (stale) {
                        aiBadge.innerHTML = 'ðŸ”„ Extension updated â€” press F5 to refresh this page';
                        aiBadge.style.color = '#d97706';
                    } else {
                        console.warn("AI Enrichment failed", e);
                        aiBadge.remove();
                    }
                }
            }
        })();

        const saveBtn = document.getElementById('rai-save-btn');
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Candidate';
        saveBtn.style.backgroundColor = '#2563eb'; // blue-500
        saveBtn.style.boxShadow = '0 10px 15px -3px rgba(14, 165, 233, 0.3)';

    } catch (e) {
        console.error(e);
    }
}

async function enrichSkills(initialData) {
    if (!initialData || !initialData.skills) return initialData ? (initialData.skills || []) : [];
    try {
        let skillsUrl = '';

        // 1. Get Skills URL
        const skillsSection = document.getElementById('skills');
        if (skillsSection) {
            const footer = skillsSection.closest('.pvs-list__outer-container')?.parentElement?.querySelector('.pvs-list__footer-wrapper');
            const link = footer?.querySelector('a');
            if (link && link.href) skillsUrl = link.href;
        }

        if (!skillsUrl) {
            const match = window.location.pathname.match(/^\/in\/[^/]+/);
            if (match) skillsUrl = window.location.origin + match[0] + '/details/skills/';
        }

        if (!skillsUrl) return initialData.skills;

        console.log(`ðŸ” Fetching full skills from: ${skillsUrl}`);
        const response = await fetch(skillsUrl);
        if (!response.ok) return initialData.skills;

        const text = await response.text();
        const doc = new DOMParser().parseFromString(text, 'text/html');

        // 2. NUCLEAR TEXT STRATEGY
        // Grab the *entire* text content of the main list container
        const mainContainer = doc.querySelector('.scaffold-layout__main') || doc.querySelector('.pvs-list__outer-container');
        if (!mainContainer) return initialData.skills;

        // Get innerText which respects line breaks (unlike textContent)
        const rawText = mainContainer.innerText;
        const lines = rawText.split('\n');

        const newSkills = [];
        const seen = new Set(initialData.skills.map(s => s.toLowerCase()));

        lines.forEach(line => {
            let txt = line.trim();
            if (!txt) return;

            // Strict Filter Logic
            if (txt.includes('Endorsed by')) return;
            if (txt.includes('experience across')) return; // "X years experience across..."
            if (txt.match(/^[\d+]+$/)) return; // numbers "1", "+5"
            // Filter nav items
            if (['Home', 'My Network', 'Jobs', 'Messaging', 'Notifications', 'Me', 'For Business'].includes(txt)) return;
            // Filter section headers if they appear as lines
            if (['Skills', 'Show all'].some(k => txt.startsWith(k))) return;

            // Heuristics for valid skills
            if (txt.length < 2) return;
            if (txt.length > 80) return;

            // Avoid duplicates immediately
            if (!seen.has(txt.toLowerCase())) {
                newSkills.push(txt);
                seen.add(txt.toLowerCase());
            }
        });

        if (newSkills.length > 0) {
            console.log(`âœ… Text-Scraped ${newSkills.length} new skills`);
            return [...initialData.skills, ...newSkills];
        } else {
            console.log("âš ï¸ No new skills found on detailed page.");
            return initialData.skills;
        }
    } catch (e) {
        console.warn("Could not fetch full skills page", e);
    }
    return initialData.skills;
}

function saveToCRM() {
    const btn = document.getElementById('rai-save-btn');
    const statusBoxContainer = document.getElementById('rai-status-box');

    btn.disabled = true;
    btn.textContent = 'Saving...';

    // Null-safe reader. Same reason as setVal above â€” some of these inputs
    // (rai-locality-input / rai-postal-input / rai-japanese-input /
    // rai-company-input) aren't present in the current sidebar HTML, and
    // accessing `.value` on the null they return threw synchronously, which
    // froze the Save button before chrome.runtime.sendMessage was even called.
    const valOf = (id, fallback = '') => {
        const el = document.getElementById(id);
        return el && el.value !== undefined ? el.value : fallback;
    };
    const checkedOf = (id) => {
        const el = document.getElementById(id);
        return !!(el && el.checked);
    };

    let finalData;
    try {
        const orgFromInput = valOf('rai-company-input', '');
        const orgFinal = orgFromInput || (extractedProfile && extractedProfile.currentOrganization) || '';
        finalData = {
            ...extractedProfile,
            name: `${valOf('rai-fname-input')} ${valOf('rai-lname-input')}`.trim(),
            primaryRole: valOf('rai-role-input'),
            email: valOf('rai-email-input'),
            phone: valOf('rai-phone-input'),
            location: valOf('rai-location-input'),
            locality: valOf('rai-locality-input') || (extractedProfile && extractedProfile.locality) || '',
            postalCode: valOf('rai-postal-input') || (extractedProfile && extractedProfile.postalCode) || '',
            japaneseLanguageProficiency: valOf('rai-japanese-input') || (extractedProfile && extractedProfile.japaneseLanguageProficiency) || '',
            currentSalary: valOf('rai-cur-salary-input'),
            salaryExpectation: valOf('rai-exp-salary-input'),
            noticePeriod: parseInt(valOf('rai-notice-input', '0')) || 0,
            relevantExperience: parseInt(valOf('rai-rel-exp-input', '0')) || 0,
            visaType: valOf('rai-visa-input'),
            country: extractedProfile && extractedProfile.country,
            skills: valOf('rai-skills-input').split(',').map(s => s.trim()).filter(s => s),
            company: orgFinal,
            currentOrganization: orgFinal,
            languageSkills: (extractedProfile && extractedProfile.languages) || [],
            summary: (extractedProfile && (extractedProfile.about || extractedProfile.summary)) || '',
            experienceDescription: (extractedProfile && extractedProfile.about) || '',
            hotlist: checkedOf('rai-hotlist-checkbox') ? 'true' : 'false',
        };
    } catch (err) {
        console.error('Save payload build failed:', err);
        btn.disabled = false;
        btn.textContent = 'Retry Save';
        btn.style.background = '#dc2626';
        alert('Could not build the save payload: ' + (err && err.message ? err.message : err));
        return;
    }

    if (fileToUpload) {
        console.log(`ðŸ“„ File attached: ${fileToUpload.name} (${(fileToUpload.size / 1024).toFixed(2)} KB)`);
        btn.textContent = 'Reading File...';
        btn.disabled = true;

        const reader = new FileReader();
        reader.onload = function (e) {
            if (e.target.readyState !== FileReader.DONE) return;

            console.log("âœ… File read successfully. Sending payload...");
            // Add file data to payload
            finalData.hasResume = true;
            finalData.resumeName = fileToUpload.name;
            finalData.resumeData = e.target.result; // Base64 String

            // Send to Background Script
            sendToBackground(finalData, btn);
        };
        reader.onerror = function (err) {
            console.error("âŒ File read error:", err);
            alert("Failed to read the file. Please try again.");
            btn.disabled = false;
            btn.textContent = 'Save Candidate';
            btn.style.background = '#ef4444';
        };
        reader.readAsDataURL(fileToUpload); // Read as Base64
    } else {
        console.log("â„¹ï¸ No file selected. Sending data only.");
        // No file, proceed normally
        sendToBackground(finalData, btn);
    }
}

function sendToBackground(payload, btn) {
    // Quality Check Before Sending
    if (!payload.name) {
        alert("Error: Candidate name is required.");
        btn.disabled = false;
        btn.textContent = 'Save Candidate';
        return;
    }

    console.log("ðŸš€ Dispatching SAVE_CANDIDATE to background:", payload);

    // Guard against Chrome MV3 service-worker shutdown during await â€” if the
    // background script doesn't respond in 30s, recover the button so the user
    // can retry instead of staring at "Saving..." forever.
    let responded = false;
    const watchdog = setTimeout(() => {
        if (responded) return;
        responded = true;
        console.warn("âŒ› Save Timeout â€” no response from service worker after 30s");
        btn.disabled = false;
        btn.textContent = 'Retry Save';
        btn.style.background = '#dc2626';
        btn.style.boxShadow = '0 10px 15px -3px rgba(220, 38, 38, 0.3)';
        alert(
            "Save timed out. Possible causes:\n" +
            " â€¢ Backend at http://localhost:8089 is not running\n" +
            " â€¢ You're not signed into Recruit AI at http://localhost:3000\n" +
            " â€¢ Chrome paused the extension's background worker â€” reload the extension at chrome://extensions and retry.\n\n" +
            "Open the extension's service-worker console (chrome://extensions â†’ Recruit AI â†’ \"service worker\") to see the actual error."
        );
    }, 30000);

    // Wrap sendMessage in try/catch because "Extension context invalidated"
    // throws SYNCHRONOUSLY â€” it happens when the extension was reloaded on
    // chrome://extensions while this LinkedIn tab was still open, so the
    // content script in this tab is now stale and can't reach the new
    // service worker. The fix is to refresh the LinkedIn page; the new
    // content.js will then talk to the new background worker correctly.
    const handleStaleContext = () => {
        if (responded) return;
        responded = true;
        clearTimeout(watchdog);
        btn.disabled = false;
        btn.textContent = 'Refresh LinkedIn Page';
        btn.style.background = '#d97706'; // amber-600
        btn.style.boxShadow = '0 10px 15px -3px rgba(217, 119, 6, 0.3)';
        alert(
            "The extension was reloaded while this LinkedIn tab was open, so the page's connection to the extension is stale.\n\n" +
            "Fix: press F5 (or Ctrl+R) on this LinkedIn tab to refresh it, then open the sidebar and click Save again."
        );
    };

    try {
        // Proactive guard: when the extension is reloaded/updated while this tab
        // stays open, `chrome.runtime` (or its `.id`) becomes undefined. Reading
        // `.sendMessage` off it would throw a confusing TypeError, so detect the
        // stale context first and tell the user to refresh.
        if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) {
            handleStaleContext();
            return;
        }
        chrome.runtime.sendMessage({ action: 'SAVE_CANDIDATE', data: payload }, (response) => {
        if (responded) return;
        responded = true;
        clearTimeout(watchdog);

        if (chrome.runtime.lastError) {
            const msg = chrome.runtime.lastError.message || '';
            if (msg.toLowerCase().includes('context invalidated')) {
                handleStaleContext();
                return;
            }
            console.error("Runtime Error:", chrome.runtime.lastError);
            btn.disabled = false;
            btn.textContent = 'Retry Save';
            btn.style.background = '#dc2626';
            alert("Extension communication error: " + msg + "\n\nTry reloading the extension at chrome://extensions and refreshing this LinkedIn page.");
            return;
        }

        if (response && response.status === 'success') {
            btn.textContent = 'Saved Successfully!';
            btn.style.background = '#059669'; // Emerald-600
            btn.style.boxShadow = '0 10px 15px -3px rgba(5, 150, 105, 0.3)';
            console.log("âœ¨ Save Success:", response.data);

            setTimeout(() => {
                btn.textContent = 'Save Candidate';
                btn.style.background = '#2563eb';
                btn.disabled = false;
            }, 3000);
        } else {
            console.error("Save failed:", response);
            btn.disabled = false;
            btn.textContent = 'Retry Save';
            btn.style.background = '#dc2626'; // Red-600
            btn.style.boxShadow = '0 10px 15px -3px rgba(220, 38, 38, 0.3)';
            alert("Save Failed: " + (response && response.message ? response.message : "Unknown error â€” open the service-worker console at chrome://extensions to see what went wrong."));
        }
        });
    } catch (err) {
        // "Extension context invalidated" throws synchronously here.
        console.error("Dispatch error:", err);
        const m = String(err && err.message).toLowerCase();
        const staleContext = m.includes('context invalidated')
            || m.includes("reading 'sendmessage'")
            || m.includes('reading "sendmessage"')
            || typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id;
        if (staleContext) {
            handleStaleContext();
        } else {
            if (!responded) {
                responded = true;
                clearTimeout(watchdog);
                btn.disabled = false;
                btn.textContent = 'Retry Save';
                btn.style.background = '#dc2626';
                alert("Could not send save request: " + (err && err.message ? err.message : err));
            }
        }
    }
}
// Initialize on Load â€” idempotent and crash-proof so a LinkedIn page refresh can
// never surface an extension error (re-injection, stale context, missing DOM, etc.).
function initRecruitAI() {
    try {
        if (document.getElementById('recruitai-sidebar')) return; // already injected
        createSidebar();
        console.log('ðŸš€ RecruitAI Sidebar & Scraper Loaded');
    } catch (e) {
        console.log('RecruitAI init skipped:', e && e.message);
    }
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRecruitAI);
} else {
    initRecruitAI();
}
