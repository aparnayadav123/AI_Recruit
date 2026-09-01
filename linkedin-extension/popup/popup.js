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
        profileRole.textContent   = data.primaryRole || data.headline || '';
        profileLocation.textContent = data.locality || data.location || '';

        // Detail rows
        const rows = [];
        if (data.company || data.currentOrganization) {
            rows.push({ label: 'Company', value: data.currentOrganization || data.company });
        }
        if (data.email && !data.email.startsWith('linkedin-')) {
            rows.push({ label: 'Email', value: data.email });
        }
        if (data.totalExperienceYears) {
            rows.push({ label: 'Experience', value: `${data.totalExperienceYears} yrs` });
        }
        if (data.skills && data.skills.length > 0) {
            rows.push({ label: 'Skills', value: null, skills: data.skills.slice(0, 6) });
        }

        profileDetails.innerHTML = rows.map(r => {
            if (r.skills) {
                const chips = r.skills.map(s => `<span class="skill-chip">${s}</span>`).join('');
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

    // ── Extract Flow ─────────────────────────────────────────────
    extractBtn && extractBtn.addEventListener('click', async () => {
        setExtractLoading(true);
        const tabId = currentTab.id;

        sendExtractMessage(tabId, (resp, err) => {
            if (err || !resp) {
                // Content script not yet injected — inject it then retry
                chrome.scripting.executeScript({ target: { tabId }, files: ['scripts/content.js'] }, () => {
                    if (chrome.runtime.lastError) {
                        setExtractLoading(false);
                        showToast('Cannot inject script. Refresh the LinkedIn page.', 'error');
                        return;
                    }
                    setTimeout(() => {
                        sendExtractMessage(tabId, (resp2, err2) => {
                            setExtractLoading(false);
                            if (err2 || !resp2 || resp2.status !== 'success') {
                                showToast(err2 || resp2?.message || 'Extraction failed. Refresh the page.', 'error');
                                return;
                            }
                            onExtracted(resp2.data);
                        });
                    }, 600);
                });
                return;
            }
            setExtractLoading(false);
            if (!resp || resp.status !== 'success') {
                showToast(resp?.message || 'Extraction failed. Is the page fully loaded?', 'error');
                return;
            }
            onExtracted(resp.data);
        });
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

    // ── Save Flow ────────────────────────────────────────────────
    saveBtn && saveBtn.addEventListener('click', () => {
        if (!extractedData) return;
        setSaveLoading(true);
        chrome.runtime.sendMessage({ action: 'SAVE_CANDIDATE', data: extractedData }, (resp) => {
            setSaveLoading(false);
            if (!resp || resp.status !== 'success') {
                showToast(resp?.message || 'Failed to save. Check backend is running.', 'error');
                return;
            }
            savedCandidateId = resp.data?.id;
            savedName.textContent = `"${extractedData.name}" has been added to your CRM.`;
            showSubState(savedState);
            showToast('Candidate saved!', 'success');
        });
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

