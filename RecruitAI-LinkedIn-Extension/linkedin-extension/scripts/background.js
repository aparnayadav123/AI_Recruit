/**
 * Service Worker for API Communication
 */

const PROD_BACKEND = 'https://recruitai-backend-bvo0.onrender.com';

async function getApiBaseUrl() {
    try {
        const storage = await chrome.storage.local.get(['backend_url']);
        if (storage && storage.backend_url) {
            return String(storage.backend_url).replace(/\/+$/, '') + '/api';
        }
    } catch (e) {}
    return PROD_BACKEND + '/api';
}

function fetchWithTimeout(url, opts = {}, timeoutMs = 25000) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    return fetch(url, { ...opts, signal: ctrl.signal })
        .then(res => { clearTimeout(timer); return res; })
        .catch(err => {
            clearTimeout(timer);
            if (err && err.name === 'AbortError') {
                throw new Error(`Request to backend timed out after ${timeoutMs / 1000}s.`);
            }
            throw err;
        });
}

async function fetchWithFallback(pathAndQuery, opts = {}, timeoutMs = 25000) {
    const primaryBase = await getApiBaseUrl();
    const primaryUrl = `${primaryBase}${pathAndQuery}`;
    try {
        return await fetchWithTimeout(primaryUrl, opts, timeoutMs);
    } catch (err) {
        const fallbackUrl = `${PROD_BACKEND}/api${pathAndQuery}`;
        if (primaryUrl !== fallbackUrl) {
            console.warn(`Primary URL ${primaryUrl} failed (${err.message}). Retrying fallback ${fallbackUrl}...`);
            return await fetchWithTimeout(fallbackUrl, opts, timeoutMs);
        }
        throw err;
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'SAVE_CANDIDATE') {
        saveToCRM(request.data)
            .then(result => sendResponse({ status: 'success', data: result }))
            .catch(error => sendResponse({ status: 'error', message: error.message || 'Failed to save' }));
        return true; // async response
    }
    
    if (request.action === 'PARSE_PROFILE') {
        parseProfileAI(request.text)
            .then(result => sendResponse({ status: 'success', data: result }))
            .catch(error => sendResponse({ status: 'error', message: error.message || 'AI Parsing failed' }));
        return true;
    }

    if (request.action === 'CHECK_DUPLICATE') {
        checkDuplicate(request.linkedinUrl)
            .then(result => sendResponse({ status: 'success', data: result }))
            .catch(error => sendResponse({ status: 'error', message: error.message || 'Duplicate check failed' }));
        return true;
    }
});

async function checkDuplicate(linkedinUrl) {
    try {
        const storage = await chrome.storage.local.get(['jwt_token']);
        const token = storage.jwt_token || '';
        const res = await fetchWithFallback(`/candidates/check-duplicate?linkedinUrl=${encodeURIComponent(linkedinUrl)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        }, 8000);

        if (!res.ok) {
            if (res.status === 404) return null;
            return null;
        }
        return await res.json();
    } catch (e) {
        console.warn('Duplicate check warning:', e);
        return null; // Non-fatal: allow save to proceed even if duplicate check fails
    }
}

async function parseProfileAI(text) {
    const storage = await chrome.storage.local.get(['jwt_token']);
    const token = storage.jwt_token;

    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetchWithFallback(`/ats/parse-profile`, {
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
        if (request.backendUrl) toStore.backend_url = request.backendUrl;
        chrome.storage.local.set(toStore, () => {
            console.log('🔑 JWT Token synced from web app');
            sendResponse({ status: 'success' });
        });
        return true;
    }
});

async function saveToCRM(profileData) {
    // 1. Get JWT from storage
    const storage = await chrome.storage.local.get(['jwt_token']);
    const token = storage.jwt_token || '';

    let candidateId = null;
    let initialCandidate = null;

    if (profileData.status && profileData.status !== 'New' && profileData.id) {
        candidateId = profileData.id;
        initialCandidate = profileData;
    }

    // 2. UPLOAD RESUME IF PRESENT
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

        const uploadRes = await fetchWithFallback(`/resumes/upload`, {
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
        // Name/Email based lookup fallback if candidate exists
        if (!candidateId && (profileData.email || profileData.name)) {
            const query = profileData.email && !profileData.email.startsWith('linkedin-')
                ? profileData.email
                : profileData.name;
            try {
                const searchRes = await fetchWithFallback(`/candidates/search?search=${encodeURIComponent(query)}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }, 8000);
                if (searchRes.ok) {
                    const searchResults = await searchRes.json();
                    const match = searchResults.content?.find(c =>
                        (profileData.email && c.email && c.email.toLowerCase() === profileData.email.toLowerCase()) ||
                        (profileData.name && c.name && c.name.toLowerCase() === profileData.name.toLowerCase())
                    );
                    if (match) {
                        initialCandidate = match;
                        candidateId = initialCandidate.id;
                        console.log('🔄 Found existing candidate:', candidateId);
                    }
                }
            } catch (e) {
                console.warn('Existing candidate lookup skipped:', e);
            }
        }
    }

    // 3. PREPARE FINAL PAYLOAD (Merge LinkedIn Data)
    const payload = {
        ...(initialCandidate || {}),
        id: candidateId, 
        name: profileData.name || initialCandidate?.name || 'LinkedIn Candidate',
        email: profileData.email || initialCandidate?.email || `linkedin-${Math.random().toString(36).substr(2, 5)}@recruitai.com`,
        phone: profileData.phone || initialCandidate?.phone || '',
        role: profileData.primaryRole || profileData.headline || initialCandidate?.role || 'Professional',
        company: profileData.company || initialCandidate?.company || '',
        currentOrganization: profileData.currentOrganization || profileData.company || initialCandidate?.currentOrganization || '',
        skills: (profileData.skills && profileData.skills.length > 0) ? profileData.skills : (initialCandidate?.skills || []),
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

    // 4. CREATE OR UPDATE CANDIDATE
    let response;
    if (candidateId) {
        response = await fetchWithFallback(`/candidates/${candidateId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });
    } else {
        response = await fetchWithFallback(`/candidates`, {
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

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'GET_STATUS') {
        chrome.storage.local.get(['jwt_token', 'backend_url'], (r) => {
            sendResponse({ hasToken: !!r.jwt_token, backendUrl: r.backend_url || null });
        });
        return true;
    }
    if (request.action === 'CLEAR_TOKEN') {
        chrome.storage.local.remove(['jwt_token', 'backend_url'], () => sendResponse({ status: 'cleared' }));
        return true;
    }
});
