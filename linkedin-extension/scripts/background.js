/**
 * Service Worker for API Communication
 */

// Backend base URL.
//  • Development: defaults to localhost:8089.
//  • Deployment: set your production backend ONCE and the extension uses it
//    everywhere — no code edits needed. Set it either by:
//      (a) editing PROD_BACKEND below, or
//      (b) running in the extension's service-worker console:
//          chrome.storage.local.set({ backend_url: 'https://api.yourdomain.com' })
//      (c) the web app syncing it via the SYNC_TOKEN message (handled below).
const PROD_BACKEND = ''; // e.g. 'https://api.yourdomain.com' — leave '' to use localhost in dev
let API_BASE_URL = (PROD_BACKEND ? PROD_BACKEND.replace(/\/+$/, '') : 'http://localhost:8089') + '/api';

// Pick up a deployed URL stored at runtime (survives restarts), overriding the default.
try {
    chrome.storage.local.get(['backend_url'], (r) => {
        if (r && r.backend_url) API_BASE_URL = String(r.backend_url).replace(/\/+$/, '') + '/api';
    });
} catch (e) { /* storage unavailable — keep default */ }

/**
 * Wraps fetch with a per-call timeout. Default 20 seconds — long enough for the
 * resume-upload flow (Gemini parse can take 10-15s), short enough that the
 * sidebar's 30-second watchdog still wins the race when something genuinely
 * hangs (backend offline, mid-network glitch, etc.).
 */
function fetchWithTimeout(url, opts = {}, timeoutMs = 20000) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    return fetch(url, { ...opts, signal: ctrl.signal })
        .then(res => { clearTimeout(timer); return res; })
        .catch(err => {
            clearTimeout(timer);
            if (err && err.name === 'AbortError') {
                throw new Error(`Request to ${url} timed out after ${timeoutMs / 1000}s. Is the recruit-ai backend running at ${API_BASE_URL.replace('/api', '')}?`);
            }
            throw err;
        });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'SAVE_CANDIDATE') {
        saveToCRM(request.data)
            .then(result => sendResponse({ status: 'success', data: result }))
            .catch(error => sendResponse({ status: 'error', message: error.message }));
        return true; // async response
    }
    
    if (request.action === 'PARSE_PROFILE') {
        parseProfileAI(request.text)
            .then(result => sendResponse({ status: 'success', data: result }))
            .catch(error => sendResponse({ status: 'error', message: error.message }));
        return true;
    }
});

async function parseProfileAI(text) {
    const storage = await chrome.storage.local.get(['jwt_token']);
    const token = storage.jwt_token;

    // Token is OPTIONAL. The backend runs in permissive dev mode, and the web-app
    // token sync only succeeds when the (hardcoded) extension ID matches — which it
    // won't for an unpacked extension. Proceed without it so enrichment still works
    // and the candidate fields actually populate.
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetchWithTimeout(`${API_BASE_URL}/ats/parse-profile`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ text: text, source: 'LINKEDIN_DYNAMIC' })
    });

    if (!res.ok) throw new Error('AI Parsing failed: ' + await res.text());
    return await res.json();
}

// Sync token (and optionally the backend URL) from the Web App.
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
    if (request.action === 'SYNC_TOKEN') {
        const toStore = { jwt_token: request.token };
        // When deployed, the web app can pass its backend URL so the extension talks
        // to production automatically instead of localhost.
        if (request.backendUrl) toStore.backend_url = request.backendUrl;
        chrome.storage.local.set(toStore, () => {
            if (request.backendUrl) {
                API_BASE_URL = String(request.backendUrl).replace(/\/+$/, '') + '/api';
            }
            console.log('🔑 JWT Token synced from web app');
            sendResponse({ status: 'success' });
        });
        return true;
    }
});

async function saveToCRM(profileData) {
    // 1. Get JWT from storage
    const storage = await chrome.storage.local.get(['jwt_token']);
    // Token is OPTIONAL (backend is permissive in dev). When present it's sent so the
    // "assignedBy" attribution works; when absent, saving still proceeds. The bad
    // "Bearer undefined" header is harmless — the JWT filter ignores invalid tokens.
    const token = storage.jwt_token || '';

    let candidateId = null;
    let initialCandidate = null;

    // 3. UPLOAD RESUME IF PRESENT
    if (profileData.hasResume && profileData.resumeData) {
        console.log('📄 Uploading Resume...');
        const blob = dataURLtoBlob(profileData.resumeData);
        const formData = new FormData();
        formData.append('file', blob, profileData.resumeName);
        formData.append('source', 'LinkedIn Extension');

        try {
            const tokenPayload = JSON.parse(atob(token.split('.')[1]));
            const fullName = tokenPayload.name || tokenPayload.sub || 'LinkedIn Agent';
            formData.append('assignedBy', fullName.split(' ')[0]);
        } catch (e) {
            formData.append('assignedBy', 'LinkedIn');
        }

        const uploadRes = await fetchWithTimeout(`${API_BASE_URL}/resumes/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!uploadRes.ok) {
            const err = await uploadRes.text();
            throw new Error(`Resume Upload Failed: ${err}`);
        }

        initialCandidate = await uploadRes.json();
        candidateId = initialCandidate.id;
        console.log('✅ Resume Uploaded. Candidate Created:', candidateId);
    } else {
        // Check for existing candidate if no resume was uploaded
        // Match strategy: Email first, then Name
        const isMockEmail = profileData.email && profileData.email.startsWith('linkedin-');
        if (!isMockEmail && profileData.email) {
            const historyRes = await fetchWithTimeout(`${API_BASE_URL}/candidates/history?email=${encodeURIComponent(profileData.email)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (historyRes.ok) {
                const history = await historyRes.json();
                if (history && history.length > 0) {
                    initialCandidate = history[0];
                    candidateId = initialCandidate.id;
                    console.log('🔄 Found existing candidate by email:', candidateId);
                }
            }
        }

        // Name-based fallback if no candidate found via email
        if (!candidateId && profileData.name) {
            const searchRes = await fetchWithTimeout(`${API_BASE_URL}/candidates/search?search=${encodeURIComponent(profileData.name)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (searchRes.ok) {
                const searchResults = await searchRes.json();
                // Simple exact name match check against the first few results
                const match = searchResults.content?.find(c => c.name.toLowerCase() === profileData.name.toLowerCase());
                if (match) {
                    initialCandidate = match;
                    candidateId = initialCandidate.id;
                    console.log('🔄 Found existing candidate by Name:', candidateId);
                }
            }
        }
    }

    // 4. PREPARE FINAL PAYLOAD (Merge LinkedIn Data)
    const payload = {
        ...(initialCandidate || {}), // Keep all existing fields (noticePeriod, salary, etc.)
        id: candidateId, 
        name: profileData.name || initialCandidate?.name,
        email: profileData.email || initialCandidate?.email || `linkedin-${Math.random().toString(36).substr(2, 5)}@recruitai.com`,
        phone: profileData.phone || initialCandidate?.phone || '',
        role: profileData.primaryRole || profileData.headline || initialCandidate?.role || 'Professional',
        company: profileData.company || initialCandidate?.company || '',
        currentOrganization: profileData.currentOrganization || profileData.company || initialCandidate?.currentOrganization || '',
        skills: (profileData.skills && profileData.skills.length > 0) ? profileData.skills : (initialCandidate?.skills || []),
        // content.js scrapes the Languages section into profileData.languages —
        // this field used to read profileData.languageSkills (which was never set)
        // so the Language column on the candidate page was always blank.
        languageSkills: (profileData.languages && profileData.languages.length > 0)
            ? profileData.languages
            : (profileData.languageSkills && profileData.languageSkills.length > 0)
                ? profileData.languageSkills
                : (initialCandidate?.languageSkills || []),
        experience: profileData.totalExperienceYears || (initialCandidate?.experience || 0),
        industry: profileData.industry || initialCandidate?.industry || 'Professional Services',
        country: profileData.country || initialCandidate?.country || '',
        locality: profileData.locality || profileData.location || initialCandidate?.locality || '',
        education: (profileData.education && profileData.education.length > 0)
            ? profileData.education
            : (initialCandidate?.education || []),
        postalCode: profileData.postalCode || initialCandidate?.postalCode || '',
        japaneseLanguageProficiency: profileData.japaneseLanguageProficiency || initialCandidate?.japaneseLanguageProficiency || '',
        currentSalary: profileData.currentSalary || initialCandidate?.currentSalary || '',
        salaryExpectation: profileData.salaryExpectation || initialCandidate?.salaryExpectation || '',
        noticePeriod: profileData.noticePeriod || initialCandidate?.noticePeriod || 0,
        relevantExperience: profileData.relevantExperience || initialCandidate?.relevantExperience || 0,
        visaType: profileData.visaType || initialCandidate?.visaType || '',
        summary: profileData.summary || initialCandidate?.summary || '',
        linkedinUrl: profileData.profileUrl || profileData.linkedinUrl || initialCandidate?.linkedinUrl || '',
        hotlist: (profileData.hotlist === "true" || profileData.hotlist === true) ? "true" : "false",
        source: initialCandidate?.source || 'LinkedIn Extension',
        updatedAt: new Date().toISOString()
    };

    try {
        const tokenPayload = JSON.parse(atob(token.split('.')[1]));
        const fullName = tokenPayload.name || tokenPayload.sub || 'LinkedIn Agent';
        payload.assignedBy = fullName.split(' ')[0];
    } catch (e) {
        payload.assignedBy = payload.assignedBy || 'LinkedIn';
    }

    console.log('📡 Sending/Updating Candidate Payload:', payload);

    // 5. CREATE OR UPDATE CANDIDATE
    let response;
    if (candidateId) {
        // Update existing candidate (merged from resume + linkedin)
        response = await fetchWithTimeout(`${API_BASE_URL}/candidates/${candidateId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });
    } else {
        // Create new candidate (No resume)
        response = await fetchWithTimeout(`${API_BASE_URL}/candidates`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });
    }

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    return await response.json();
}

// Helper to convert Base64 DataURL to Blob
function dataURLtoBlob(dataurl) {
    try {
        var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
            bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
    } catch (e) {
        console.error("Blob conversion failed", e);
        throw new Error("Failed to process file data.");
    }
}

// Toggle Sidebar on Extension Icon Click
chrome.action.onClicked.addListener((tab) => {
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
            const sidebar = document.getElementById('recruitai-sidebar');
            const btn = document.getElementById('recruitai-toggle-btn');
            if (sidebar) {
                sidebar.classList.toggle('open');
                if (sidebar.classList.contains('open')) {
                    btn.style.right = '420px';
                    // trigger population if needed
                    // window.populateSidebar(); // if accessible
                } else {
                    btn.style.right = '0';
                }
            } else {
                console.log('Sidebar not found. Refresh the page?');
            }
        }
    });
});
