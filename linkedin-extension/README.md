# RecruitAI LinkedIn Connector (Chrome Extension)

A production-ready Chrome Extension to bridge LinkedIn profiles directly into your RecruitAI CRM.

## 📁 Folder Structure
- `manifest.json`: Extension configuration (MV3).
- `popup/`: UI files for the extension dropdown.
- `scripts/`: Logic for data extraction and API communication.
- `icons/`: (Place your icons here - 16, 48, 128 px).

## 🚀 Installation
1. Open Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** (top right).
3. Click **Load unpacked**.
4. Select the `linkedin-extension` folder.

## 🔑 Authentication
The extension requires a JWT token to communicate with the backend. 
To sync your token:
1. Log in to your RecruitAI Web App (`http://localhost:3000`).
2. Open the **Console** (F12).
3. Run the following command (replace `EXTENSION_ID` with the ID from chrome://extensions):
   ```javascript
   chrome.runtime.sendMessage("EXTENSION_ID", { 
     action: "SYNC_TOKEN", 
     token: localStorage.getItem('token') 
   }, (response) => console.log('Sync Status:', response));
   ```

## 🛠 Features
- **Smart Extraction**: Scrapes Name, Headline, Location, and Experience.
- **Background Processing**: Handles API calls securely via Service Workers.
- **Manifest V3**: Compliant with the latest Chrome standards.
- **CRM Integration**: Directly saves into the PostgreSQL/MongoDB backend.

## 📡 Backend API Schema (Assumption)
`POST /api/candidates`
```json
{
  "name": "Full Name",
  "email": "auto-generated or extracted",
  "role": "Headline",
  "skills": ["Skill 1", "Skill 2"],
  "experience": 5.0,
  "source": "LinkedIn Extension",
  "extraDetails": "{...raw json string...}"
}
```
