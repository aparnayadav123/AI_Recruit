/**
 * Popup Logic
 */

document.addEventListener('DOMContentLoaded', async () => {
    const saveBtn = document.getElementById('save-btn');
    const btnText = document.getElementById('btn-text');
    const loader = document.getElementById('loader');
    const statusMsg = document.getElementById('status-msg');
    const profileView = document.getElementById('profile-view');
    const profilePreview = document.getElementById('profile-preview');
    const initialState = document.getElementById('initial-state');
    const profileName = document.getElementById('profile-name');
    const profileHeadline = document.getElementById('profile-headline');
    const loginView = document.getElementById('login-view');
    const gotoLogin = document.getElementById('goto-login');
    const manualToken = document.getElementById('manual-token');
    const saveTokenBtn = document.getElementById('save-token-btn');

    let extractedData = null;

    // 1. Initial Check: Are we on LinkedIn Profile?
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (tab.url.includes('linkedin.com/in/')) {
        saveBtn.disabled = false;
        initialState.classList.add('hidden');
        profilePreview.classList.remove('hidden');
    } else {
        saveBtn.disabled = true;
        profilePreview.textContent = 'Please navigate to a LinkedIn Profile page.';
        profilePreview.classList.remove('hidden');
        initialState.classList.add('hidden');
    }

    // 2. Check Auth Status (from storage)
    chrome.storage.local.get(['jwt_token'], (result) => {
        if (!result.jwt_token) {
            profileView.classList.add('hidden');
            loginView.classList.remove('hidden');
        }
    });

    gotoLogin.addEventListener('click', () => {
        chrome.tabs.create({ url: 'http://localhost:3000/settings' });
    });

    // Manual Token Save
    saveTokenBtn.addEventListener('click', () => {
        const token = manualToken.value.trim();
        if (token) {
            chrome.storage.local.set({ jwt_token: token }, () => {
                showStatus('Extension Activated!', 'success');
                loginView.classList.add('hidden');
                profileView.classList.remove('hidden');
            });
        }
    });

    // 3. Extraction Flow
    saveBtn.addEventListener('click', async () => {
        if (!extractedData) {
            // First Click: Extract
            statusMsg.classList.add('hidden');
            startLoading('Extracting...');

            chrome.tabs.sendMessage(tab.id, { action: 'EXTRACT_PROFILE' }, (response) => {
                if (chrome.runtime.lastError) {
                    console.warn('Content script not ready. Injecting manually...');

                    // Attempt to inject script manually if it failed
                    chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        files: ['scripts/content.js']
                    }, () => {
                        if (chrome.runtime.lastError) {
                            stopLoading('Extract Profile');
                            showStatus('Connection failed. Please refresh the LinkedIn page.', 'error');
                            console.error('Injection error:', chrome.runtime.lastError.message);
                            return;
                        }

                        // Retry message after injection
                        setTimeout(() => {
                            chrome.tabs.sendMessage(tab.id, { action: 'EXTRACT_PROFILE' }, (resp) => {
                                stopLoading('Save to RecruitAI');
                                if (resp && resp.status === 'success') {
                                    extractedData = resp.data;
                                    profileName.textContent = extractedData.name;
                                    profileHeadline.textContent = extractedData.headline;
                                    showStatus('Profile data captured!', 'success');
                                } else {
                                    const errMsg = resp?.message || 'Data extraction failed. Ensure the page is fully loaded.';
                                    showStatus(errMsg, 'error');
                                    console.error('Extraction Error:', errMsg);
                                }
                            });
                        }, 500);
                    });
                    return;
                }

                stopLoading('Save to RecruitAI');

                if (response && response.status === 'success') {
                    extractedData = response.data;
                    profileName.textContent = extractedData.name;
                    profileHeadline.textContent = extractedData.headline;
                    showStatus('Profile data captured!', 'success');
                } else {
                    const errMsg = response?.message || 'Data extraction failed. Ensure the page is fully loaded.';
                    showStatus(errMsg, 'error');
                }
            });
        } else {
            // Second Click: Save to CRM
            startLoading('Saving...');

            chrome.runtime.sendMessage({ action: 'SAVE_CANDIDATE', data: extractedData }, (response) => {
                stopLoading('Saved!');

                if (response && response.status === 'success') {
                    showStatus('Candidate saved to CRM successfully!', 'success');
                    saveBtn.disabled = true;
                    btnText.textContent = '✓ Saved to CRM';
                } else {
                    showStatus(response.message || 'Error saving to CRM', 'error');
                }
            });
        }
    });

    function startLoading(text) {
        saveBtn.disabled = true;
        btnText.textContent = text;
        loader.classList.remove('hidden');
    }

    function stopLoading(text) {
        saveBtn.disabled = false;
        btnText.textContent = text;
        loader.classList.add('hidden');
    }

    function showStatus(msg, type) {
        statusMsg.textContent = msg;
        statusMsg.classList.remove('hidden', 'status-success', 'status-error');
        statusMsg.classList.add(`status-${type}`);

        setTimeout(() => {
            statusMsg.classList.add('hidden');
        }, 4000);
    }
});
