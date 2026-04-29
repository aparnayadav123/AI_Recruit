/**
 * RecruitAI Token Sync Content Script
 * Runs on http://localhost:3000/* to automatically sync the JWT token
 * from the web app's localStorage into chrome.storage.local.
 * This allows the LinkedIn extension to authenticate API calls.
 */

(function syncToken() {
    const token = localStorage.getItem('token');

    if (!token) {
        console.log('[RecruitAI] No token found in localStorage. User may not be logged in.');
        return;
    }

    chrome.runtime.sendMessage({ action: 'SYNC_TOKEN_INTERNAL', token }, (response) => {
        if (chrome.runtime.lastError) {
            console.warn('[RecruitAI] Token sync error:', chrome.runtime.lastError.message);
        } else if (response && response.status === 'success') {
            console.log('[RecruitAI] ✅ JWT token successfully synced to extension storage.');
        }
    });
})();

// Also watch for storage changes (e.g. login/logout after page load)
window.addEventListener('storage', (event) => {
    if (event.key === 'token') {
        const newToken = event.newValue;
        if (newToken) {
            chrome.runtime.sendMessage({ action: 'SYNC_TOKEN_INTERNAL', token: newToken }, (response) => {
                if (chrome.runtime.lastError) {
                    // Silently ignore
                    void chrome.runtime.lastError;
                } else {
                    console.log('[RecruitAI] ✅ Token re-synced after login.');
                }
            });
        } else {
            // Token was removed (logout) — clear from extension storage too
            chrome.runtime.sendMessage({ action: 'CLEAR_TOKEN' }, () => {
                void chrome.runtime.lastError;
            });
        }
    }
});
