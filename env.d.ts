/// <reference types="vite/client" />

// Optional: declare the specific env vars you use for better type safety
interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID: string;
  readonly VITE_OUTLOOK_CLIENT_ID: string;
  // Absolute base URL of the hosted backend API (e.g. https://…onrender.com/api).
  // Unset in local dev, where requests fall back to the "/api" Vite proxy.
  readonly VITE_API_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
