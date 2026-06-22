# RecruitAI — AI-Powered Applicant Tracking System

A full-stack ATS that tracks the entire candidate lifecycle — from application through
interview, hiring, rejection, and **AI-driven rediscovery** of past candidates who now fit
open roles.

## Tech Stack
- **Backend:** Spring Boot (Java), MongoDB — REST API on port `8089`
- **Frontend:** React + Vite + TypeScript + Tailwind CSS — dev server on port `3000`
- **Careers site:** separate OryFolks Vite app (`:5173`) + Express API (`:5000`)

## Key Features
- **Job Management** — create / edit / publish to careers, plus **Close / Cancel / Reopen** lifecycle.
- **Candidate lifecycle & History** — every application across jobs/time is preserved (never deleted).
- **Structured Interview Pipeline** — Technical 1 → Technical 2 → Manager → HR → Hold → Offer, with per-stage outcomes.
- **Hire / Reject** with structured rejection reasons + audit trail.
- **AI Suggested Candidates (Rediscovery)** — resurfaces past candidates (incl. "experience-upgrade") who now fit a job.
- **Reports & Analytics** — interview/hire/rejection rates, time-to-hire, source & department breakdowns.
- **Application Tracker** + **Excel/CSV export** across Candidates, Applications, Rejected, and per-Job.
- **LinkedIn Chrome extension** to import profiles into the CRM.

## Getting Started

### Prerequisites
- Java 17+ and Maven, Node.js 18+, MongoDB running locally on `:27017`.

### 1. Configure environment
Copy `.env.example` → `.env` and fill in any values you need (all AI/Zoom/SMTP keys are
optional — the app falls back gracefully if they're blank).

### 2. Backend
```bash
cd backend
mvn spring-boot:run        # starts on http://localhost:8089
```

### 3. Frontend
```bash
npm install
npm run dev                # starts on http://localhost:3000
```

## Demo Logins
| Role    | Email                     | Password      |
|---------|---------------------------|---------------|
| Admin   | `demo@recruitai.com`      | `admin123`    |
| HR      | `hr@recruitai.com`        | `hr1234`      |
| Manager | `manager@recruitai.com`   | `manager1234` |

## Security Notes
- **No secrets are committed.** Zoom/SMTP/AI keys come from environment variables
  (`application.properties` uses `${VAR:}` placeholders).
- The demo logins above are for development only — change them and lock down
  `SecurityConfig` before any production deployment.
