import axios from "axios";
import { isSessionExpired, clearSession } from "./session";

// Best Practice: Centralized API Configuration
//
// Local dev: leave VITE_API_BASE_URL unset — requests hit "/api" and Vite proxies them
// to the local backend (see vite.config.ts).
// Production (Vercel): set VITE_API_BASE_URL to the always-on backend, e.g.
//   https://recruitai-backend.onrender.com/api
// so the deployed dashboard talks to the hosted server instead of a dev proxy.
const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
});

// Add a request interceptor to attach JWT token
api.interceptors.request.use(
    (config) => {
        // EXC-006 / NFRS01 — session expiry. Once the session has been idle past the
        // configured timeout, BLOCK a SAVE (so an unsaved in-progress edit is NOT
        // persisted) and send the user to re-authenticate; server-committed data is
        // untouched. See src/session.ts.
        //
        // Only WRITE requests (POST/PUT/PATCH/DELETE) trigger this — never GETs. That
        // way background polling and just viewing the dashboard can't bounce an
        // idle-but-present user to the login page; the re-auth prompt appears only when
        // they actually try to save something after the idle window. Auth calls are
        // exempt so the user can log back in.
        const method = (config.method || 'get').toLowerCase();
        const isMutation = method === 'post' || method === 'put' || method === 'patch' || method === 'delete';
        const isAuthCall = (config.url || '').includes('/auth/');
        if (isMutation && !isAuthCall && isSessionExpired()) {
            clearSession();
            if (!window.location.pathname.startsWith('/login')) {
                window.location.href = '/login?expired=1';
            }
            return Promise.reject(new axios.Cancel('Session expired — please sign in again.'));
        }
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add a response interceptor to handle 401 errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
