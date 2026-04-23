/**
 * Service Worker for API Communication
 */

const API_BASE_URL = 'http://localhost:8089/api';

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

    if (!token) throw new Error('Authentication required');

    const res = await fetch(`${API_BASE_URL}/ats/parse-profile`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text: text, source: 'LINKEDIN_DYNAMIC' })
    });

    if (!res.ok) throw new Error('AI Parsing failed: ' + await res.text());
    return await res.json();
}

// Sync token from Web App
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
    if (request.action === 'SYNC_TOKEN') {
        chrome.storage.local.set({ jwt_token: request.token }, () => {
            console.log('🔑 JWT Token synced from web app');
            sendResponse({ status: 'success' });
        });
        return true;
    }
});

async function saveToCRM(profileData) {
    // 1. Get JWT from storage
    const storage = await chrome.storage.local.get(['jwt_token']);
    const token = storage.jwt_token;

    if (!token) {
        throw new Error('Authentication required. Please log in to RecruitAI first.');
    }

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

        const uploadRes = await fetch(`${API_BASE_URL}/resumes/upload`, {
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
            const historyRes = await fetch(`${API_BASE_URL}/candidates/history?email=${encodeURIComponent(profileData.email)}`, {
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
            const searchRes = await fetch(`${API_BASE_URL}/candidates/search?search=${encodeURIComponent(profileData.name)}`, {
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
        languageSkills: (profileData.languageSkills && profileData.languageSkills.length > 0) ? profileData.languageSkills : (initialCandidate?.languageSkills || []),
        experience: profileData.totalExperienceYears || (initialCandidate?.experience || 0),
        industry: profileData.industry || initialCandidate?.industry || 'Professional Services',
        country: profileData.country || initialCandidate?.country || '',
        locality: profileData.locality || profileData.location || initialCandidate?.locality || '',
        postalCode: profileData.postalCode || initialCandidate?.postalCode || '',
        japaneseLanguageProficiency: profileData.japaneseLanguageProficiency || initialCandidate?.japaneseLanguageProficiency || '',
        currentSalary: profileData.currentSalary || initialCandidate?.currentSalary || '',
        salaryExpectation: profileData.salaryExpectation || initialCandidate?.salaryExpectation || '',
        noticePeriod: profileData.noticePeriod || initialCandidate?.noticePeriod || 0,
        relevantExperience: profileData.relevantExperience || initialCandidate?.relevantExperience || 0,
        visaType: profileData.visaType || initialCandidate?.visaType || '',
        summary: profileData.summary || initialCandidate?.summary || '',
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
        response = await fetch(`${API_BASE_URL}/candidates/${candidateId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });
    } else {
        // Create new candidate (No resume)
        response = await fetch(`${API_BASE_URL}/candidates`, {
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
