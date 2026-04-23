# Step-by-Step Guide: Adding Redirect URI to Azure AD App Registration

## Prerequisites
- Access to Azure Portal (portal.azure.com)
- Admin access to the Azure AD tenant (or be the owner of the app registration)
- Your app Client ID: `744bf6bb-88ba-46f7-8dcb-17492d41df11`

---

## Step 1: Navigate to Azure Portal

1. Open your web browser
2. Go to: **https://portal.azure.com**
3. Sign in with your Azure account

---

## Step 2: Find Your App Registration

1. In the Azure Portal, use the search bar at the top
2. Type: **"Azure Active Directory"** or **"Azure AD"**
3. Click on **"Azure Active Directory"** from the search results
4. In the left sidebar, click on **"App registrations"**
5. You'll see a list of all app registrations

---

## Step 3: Open Your App Registration

1. In the **App registrations** list, look for the app with Client ID: `744bf6bb-88ba-46f7-8dcb-17492d41df11`
   - You can also search for it using the search box at the top of the list
   - Or filter by the Client ID
2. Click on the app name to open it

---

## Step 4: Navigate to Authentication Settings

1. In the left sidebar menu of your app registration, click on **"Authentication"**
   - It's usually the 3rd or 4th item in the menu
   - Icon looks like a key or lock

---

## Step 5: Add Single-Page Application (SPA) Platform

1. Scroll down to the **"Platform configurations"** section
2. You'll see a list of configured platforms (if any)
3. Click the **"+ Add a platform"** button
   - This button is usually at the top of the Platform configurations section

---

## Step 6: Select Platform Type

1. A popup/modal will appear with platform options:
   - Web
   - Single-page application
   - Mobile and desktop applications
   - iOS/macOS
   - Android
2. Click on **"Single-page application"**
   - This is the correct platform type for React/Vite apps using MSAL

---

## Step 7: Configure Redirect URI

1. After selecting "Single-page application", a form will appear
2. In the **"Redirect URIs"** section, you'll see an input field
3. Type exactly: **`http://localhost:3000`**
   - ⚠️ **IMPORTANT**: No trailing slash (not `http://localhost:3000/`)
   - ⚠️ **IMPORTANT**: Use `http://` not `https://` for localhost
   - ⚠️ **IMPORTANT**: Make sure the port is `3000` (matching your Vite config)

---

## Step 8: Save Configuration

1. After entering the redirect URI, click the **"Configure"** button at the bottom of the form
2. The popup will close and you'll see the platform added to the list

---

## Step 9: Verify Configuration

1. In the **"Platform configurations"** section, you should now see:
   - **Platform**: Single-page application
   - **Redirect URIs**: `http://localhost:3000`
2. Make sure there are NO other redirect URIs with trailing slashes like `http://localhost:3000/`
   - If you see one with a trailing slash, click the **"..."** (three dots) next to it
   - Select **"Delete"** to remove it

---

## Step 10: Save All Changes

1. At the top of the Authentication page, click the **"Save"** button
   - This ensures all changes are persisted
2. Wait for the confirmation message that says "Successfully updated"

---

## Step 11: Additional Configuration (If Needed)

### If you see "Implicit grant and hybrid flows" section:
- **DO NOT** check "Access tokens" or "ID tokens"
- We're using Authorization Code Flow, not Implicit Flow
- Leave these unchecked

### If you see "Supported account types":
- Make sure it includes the accounts you want to support
- "Accounts in any organizational directory and personal Microsoft accounts" is usually fine

---

## Step 12: Test the Configuration

1. Go back to your application
2. Clear browser cache (Ctrl + Shift + R)
3. Restart your dev server:
   ```bash
   npm run dev
   ```
4. Try clicking "Sign in with Outlook"
5. The redirect URI error should be resolved!

---

## Troubleshooting

### If you still get redirect URI errors:

1. **Check the exact URI in the error message**
   - It should match exactly what you configured
   - Check for trailing slashes, http vs https, port numbers

2. **Verify the platform type**
   - Must be "Single-page application" (SPA)
   - NOT "Web" platform

3. **Check for multiple redirect URIs**
   - Remove any duplicates or incorrect ones
   - Keep only `http://localhost:3000` (without trailing slash)

4. **Wait a few minutes**
   - Azure AD changes can take 1-2 minutes to propagate

5. **Check browser console**
   - Open DevTools (F12) → Console tab
   - Look for any errors or warnings

---

## For Production Deployment

When you deploy to production, you'll need to add your production URL:

1. Follow the same steps above
2. In Step 7, add your production URL:
   - Example: `https://yourdomain.com`
   - Example: `https://app.yourdomain.com`
3. Make sure to use `https://` for production (not `http://`)

---

## Summary

✅ **Redirect URI to add**: `http://localhost:3000` (no trailing slash)  
✅ **Platform type**: Single-page application (SPA)  
✅ **Client ID**: `744bf6bb-88ba-46f7-8dcb-17492d41df11`  
✅ **Flow type**: Authorization Code Flow with PKCE (handled automatically by MSAL)

---

## Quick Reference: Where to Find Settings

```
Azure Portal
└── Azure Active Directory
    └── App registrations
        └── [Your App - 744bf6bb-88ba-46f7-8dcb-17492d41df11]
            └── Authentication
                └── Platform configurations
                    └── Single-page application
                        └── Redirect URIs: http://localhost:3000
```

---

**Need Help?** If you encounter any issues, check:
- Azure AD documentation: https://docs.microsoft.com/azure/active-directory
- MSAL documentation: https://github.com/AzureAD/microsoft-authentication-library-for-js

