/// <reference types="vite/client" />

// Optional: declare the specific env vars you use for better type safety
interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID: string;
  readonly VITE_OUTLOOK_CLIENT_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
