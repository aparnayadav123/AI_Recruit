import axios from "axios";

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
