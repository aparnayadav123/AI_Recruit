# RecruitAI - Tech Stack and Setup Guide

This document outlines the architecture, technology stack, and local installation requirements for running the **RecruitAI** platform ecosystem.

## 💻 Tech Stack Details

The RecruitAI platform is a highly modular full-stack application split into three main components:

### 1. Frontend Web Application (Dashboard/UI)
* **Framework:** React 18, Vite
* **Language:** TypeScript (`.tsx`, `.ts`)
* **Styling:** Tailwind CSS (Vanilla PostCSS integration)
* **Routing:** React Router v6 (`react-router-dom`)
* **Icons:** Lucide-React
* **HTTP Client:** Axios (proxied to `/api` locally)

### 2. Spring Boot API Backend
* **Core Framework:** Spring Boot 3+ (Java 17+)
* **Build Tool:** Maven (or internal IDE wrappers)
* **Database:** Embedded MongoDB (Flapdoodle) - handles dynamic storage seamlessly.
* **Date Parsing Structure:** Standard ISO-8601 parsing (`java.time.LocalDateTime`) using Jackson.
* **Role/AI parsing:** Spring AI or native REST components (depends on setup).

### 3. LinkedIn Extension & Autonomous Agents
* **Extension:** Standard Chrome Manifest V3 extension containing `popup.js`, `content.js`, and `background.js` (written in raw HTML/JS/CSS).
* **Node Agent (linkedin-agent):** A secondary lightweight Node.js Express server to facilitate real-time streaming operations connecting the browser extension with the overarching Java backend.

---

## 🛠 Required Software Checklist

Before starting the system locally, ensure you have the following installed on your host machine:

1. **Java Development Kit (JDK):** Version 17 or higher (Required to compile and run the backend).
2. **Node.js & npm:** Version 18+ (Required to run the Vite dev server and Node agent).
3. **PowerShell:** Required for triggering unified start scripts.
4. **Git (Optional):** For version control capabilities.

---

## 🚀 How to Run the Code

We provide automated and isolated script pathways to bring the system up effortlessly.

### Option A: Fully Automated (Recommended)
You can launch the **Frontend**, **Backend**, and the **Node Agent** all at once using the unified entrypoint script on your machine.

1. Open PowerShell or Command Prompt.
2. Navigate to the project root directory.
3. Run the master start script:
   ```powershell
   powershell.exe -ExecutionPolicy Bypass -File .\START_SYSTEM.ps1
   ```
4. This script elegantly forks out individual terminal windows:
   * **Frontend:** Binds to `http://localhost:3000`
   * **Backend API:** Binds to `http://localhost:8089`
   * **Node Agent App:** Binds to `http://localhost:8090` (Internal background engine)
   
*Note: If port `3000` or `8089` are currently locked by hanging processes, use the dedicated workflows below to force-clean them.*

### Option B: Running Dedicated Components Manually
If you ever want to run or restart explicit components without touching the rest of the ecosystem:

**Restarting the Backend (Java):**
1. Navigate into the `backend/` folder: `cd backend`
2. Run the isolated powershell script that actively kills hovering background Java processes and boots it fresh:
   ```powershell
   powershell.exe -ExecutionPolicy Bypass -File .\restart_backend.ps1
   ```

**Restarting the Frontend (React):**
1. In the root directory:
   ```bash
   npm run dev
   ```
*(Or invoke `powershell.exe -ExecutionPolicy Bypass -File .\restart_frontend.ps1` to resolve Node conflicts!)*

---

## 📁 Loading the Chrome Extension
To utilize the seamless LinkedIn candidate synchronization tool:

1. Open exactly this URL in Google Chrome: `chrome://extensions/`
2. At the top right, turn **ON** the "Developer mode" toggle.
3. Click the **"Load unpacked"** button on the top left.
4. Select the `linkedin-extension` folder located inside the RecruitAI root directory.
5. The extension will appear in your Chrome toolbar immediately.
