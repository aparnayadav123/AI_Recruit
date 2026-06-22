import { PublicClientApplication } from "@azure/msal-browser";
import { msalConfig } from "../authConfig";

export const msalInstance = new PublicClientApplication(msalConfig);

let isInitialized = false;
let initializationPromise: Promise<void> | null = null;

export const initializeMsal = async () => {
    if (isInitialized) return;
    if (initializationPromise) return initializationPromise;

    initializationPromise = msalInstance.initialize()
        .then(async () => {
            try {
                // handleRedirectPromise is crucial for clearing stuck interaction flags
                await msalInstance.handleRedirectPromise();
            } catch (p) {
                console.error("MSAL Redirect Handle Error:", p);
            }
            isInitialized = true;
            initializationPromise = null;
        })
        .catch((error) => {
            initializationPromise = null;
            throw error;
        });

    return initializationPromise;
};

// Start initialization immediately
initializeMsal().catch(console.error);
