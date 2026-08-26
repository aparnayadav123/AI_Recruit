# RecruitAI — End-to-End Requirements Document

**Product:** RecruitAI — AI-Powered Applicant Tracking System (ATS)
**Prepared for:** Project / Hiring stakeholders
**Status:** Implemented (development build)

---

## 1. Purpose & Vision

RecruitAI is a recruitment platform that manages the **entire candidate lifecycle** — from
a job being created and published, through application, screening, interviews, and a final
hire/reject decision — while **never losing candidate data**. Its differentiator is an
**AI rediscovery engine** that automatically resurfaces past candidates (including people
previously rejected) who now fit a newly opened role.

**One-line goal:** *Track every candidate's full hiring journey, automatically re-find past
talent that now fits open roles, and give managers complete visibility and exportable reports.*

---

## 2. Scope

**In scope**
- Job requisition management and publishing to a public careers site.
- Candidate capture from multiple sources (careers page, LinkedIn, email, manual).
- Full application lifecycle, interview pipeline, hire/reject with reasons.
- AI candidate–job matching, rediscovery, and reconsideration.
- Dashboards, reports/analytics, and Excel/CSV exports.
- Role-based access (Admin / HR Manager / HR).

**Out of scope (current build)**
- Production-grade authentication hardening (currently dev mode).
- Paid third-party email/Zoom unless configured (graceful fallbacks provided).
- Offer-letter generation, payroll, onboarding.

---

## 3. Users & Roles

| Role | Responsibilities |
|------|------------------|
| **Admin** | Full access; system/demo administration. |
| **HR Manager** | Create/close jobs, approve deletions, hire/reject, view all reports. |
| **HR** | Manage candidates, schedule interviews, record outcomes. |
| **Candidate (external)** | Applies via the public careers page (no login to RecruitAI). |

Demo logins (development only): `demo@recruitai.com / admin123`, `hr@recruitai.com / hr1234`,
`manager@recruitai.com / manager1234`.

---

## 4. Architecture & Technology

| Layer | Technology | Port |
|------|------------|------|
| Admin web app | React + Vite + TypeScript + Tailwind | 3000 |
| Backend API | Spring Boot (Java) | 8089 |
| Database | MongoDB | 27017 |
| Careers site | OryFolks (Vite) | 5173 |
| Careers API | Express (Node) | 5000 |
| Browser add-on | LinkedIn Chrome extension (Manifest V3) | — |

**Flow:** Careers page → backend → RecruitAI database → admin app. The LinkedIn extension
pushes profiles into the backend. AI features use a deterministic engine with an optional
Gemini/OpenAI enhancement (falls back automatically if no key is set).

---

## 5. Functional Requirements (by Module)

### 5.1 Authentication & Authorization
- FR-1: Users log in with email/password; a JWT is issued and stored.
- FR-2: Google and Outlook social login supported.
- FR-3: Role-based menus/actions (Admin / Manager / HR).

### 5.2 Job Management
- FR-4: Create, edit, and view job requisitions (title, department, location, employment type,
  experience required, salary range in INR, required skills + weights, hiring manager, description).
- FR-5: Publish / unpublish a job to the public careers page (explicit per-job action only).
- FR-6: Job lifecycle: **Open/Active, Hold, Closed, Cancelled, Archived, Reopen**.
  Closed/Cancelled/Archived automatically drop the job off the careers page.
- FR-7: Live applicant count per job; status badges color-coded.
- FR-8: Salary accepts flexible Indian-rupee formats.

### 5.3 Candidate Capture & Management
- FR-9: Capture candidates from **Careers page, LinkedIn extension, email import, manual entry**.
- FR-10: Unique, consecutive candidate IDs (CAN001, CAN002…).
- FR-11: Search by candidate ID/name/email/role/skills; filter by status, skill, job, source.
- FR-12: Candidate profile: contact, skills, experience, resume, current org, notice period,
  languages, fit score.
- FR-13: Resume upload (PDF/DOCX/TXT) with parsing; deterministic fallback if AI unavailable.

### 5.4 Application Lifecycle & History (mandatory)
- FR-14: A candidate may apply to **multiple jobs over time**; **every application is preserved**.
- FR-15: Each application has its own status, stage, match score, and timeline.
- FR-16: **Candidate History** view shows: profile, all applications, interview history,
  rejection history, hire history, experience timeline, and audit trail.
- FR-17: **No physical deletion** — soft-delete only; history is append-only.

### 5.5 Interview Pipeline
- FR-18: Structured stages: **Technical 1 → Technical 2 → Manager → HR → Hold → Offer**.
- FR-19: Each candidate shows their **current round** clearly (labeled, "Stage X of Y").
- FR-20: Schedule an interview (date/time/type), pick the round, attach a meeting link.
- FR-21: Meeting links: real Zoom link if configured, otherwise a free Jitsi link (always works).
- FR-22: Interviewer joins via a **Join Meeting** button (candidate page + upcoming-interview popup).
- FR-23: Record per-stage outcome (Pass/Fail/Hold), interviewer, rating, feedback.

### 5.6 Hire / Reject
- FR-24: **Hire** a candidate (sets status Hired; reflects in dashboard + Hired list + history).
- FR-25: **Reject** with a structured reason (Experience Less, Skill Mismatch, Technical/Manager
  Round Failed, Communication Issue, Salary Expectation High, Position Closed, Candidate Not
  Interested, Other) + who + date — recorded in history/audit.

### 5.7 Rejected Candidates
- FR-26: Dedicated dashboard of all rejections (name, job, reason, rejected-by, date).
- FR-27: Filter by reason/search; **Reconsider** any candidate; **Export to Excel**.

### 5.8 AI Rediscovery & Suggested Candidates (mandatory)
- FR-28: On selecting a target job, scan the candidate pool and surface a **ranked** suggested list.
- FR-29: Detect **Experience-Upgrade** candidates — previously rejected for low experience who now
  meet the requirement.
- FR-30: Show match % and a human-readable reason; badges for "Experience Upgrade" /
  "Previously Rejected".
- FR-31: **Reconsider for this job** moves a suggested candidate back into the pipeline (audited).

### 5.9 AI Matching Engine
- FR-32: Compute a deterministic **fit/match score** from skills + experience vs. the job.
- FR-33: Optional Gemini/OpenAI enhancement; deterministic fallback if no key.

### 5.10 Dashboards & Reporting
- FR-34: **Dashboard**: Candidates, Active Jobs, Interviews, Hired (clickable drill-down),
  6-stage interview pipeline counts, recent activity, source trends, role distribution.
- FR-35: **Application Tracker**: master table of every application (candidate × job × status ×
  stage × dates × match) with search/filter and **Export to Excel**.
- FR-36: **Reports & Analytics**: interview rate, hire rate, rejection rate, **time-to-hire**,
  candidate-source analysis, department hiring, rejection-reason breakdown.
- FR-37: **Excel/CSV export** on Candidates, per-Job applicants, Application Tracker, Rejected.

### 5.11 Notifications & Workflow
- FR-38: In-app notifications (bell) for applications, interviews, status changes.
- FR-39: Upcoming-interview popup ~15 minutes before start with Join link.
- FR-40: **Deletion-request workflow**: HR requests deletion → Manager/Admin approves (soft-delete).

### 5.12 LinkedIn Chrome Extension
- FR-41: On a LinkedIn profile, scrape name/role/location/skills/experience/languages.
- FR-42: Save the candidate to RecruitAI; handles stale-context gracefully.

### 5.13 Careers Site (OryFolks)
- FR-43: Public careers page lists only **explicitly published** jobs.
- FR-44: Candidates apply with name, email, phone, resume, skills, experience, company, location.
- FR-45: Applications flow into RecruitAI automatically.

### 5.14 Branding & Profile
- FR-46: OryFolks logo on login, sidebar, profile (upload button), and company settings.
- FR-47: Editable profile name and profile picture (persists locally for demo accounts).

---

## 6. Non-Functional Requirements

| Area | Requirement |
|------|-------------|
| **Data retention** | Candidate/application/interview data is never physically deleted (soft-delete + append-only audit). |
| **Security** | Secrets via environment variables only (no keys committed). JWT auth. *Dev caveat:* backend currently `permitAll` — must be locked down before production. |
| **Resilience** | Graceful fallbacks: AI → deterministic parser; Zoom → Jitsi; email disabled by default. |
| **Usability** | Responsive UI; Excel-friendly exports (UTF-8 BOM); clear status badges and tables. |
| **Auditability** | Lifecycle actions (reject/reconsider/reopen) recorded with who/what/when. |
| **Performance** | List views paginate; counts derived server-side. (Scale review recommended for 10k+ candidates.) |

---

## 7. Data Model (key collections)

- **Candidate** — profile, skills, experience, status, fit score, source, sequence ID.
- **Job** — requisition fields, status, hiring manager, publishedToCareers.
- **JobApplication** — candidate × job; status, stage, match score, interview stages, rejection/hire info (append-only).
- **InterviewStage** (embedded) — stage name, outcome, interviewer, rating, feedback.
- **Interview** — scheduled meeting (time, type, link, status).
- **CandidateAuditEvent** — action, actor, from→to, timestamp.
- **Resume**, **SkillMatrix**, **Notification**, **DeletionRequest**, **User**, **Company**.

---

## 8. Key Workflows

1. **Hire flow:** Job created → published → candidate applies (careers) → screened → interview
   rounds (Pass/Fail/Hold) → **Hired** → reflected in dashboard/history.
2. **Reject + Rediscovery:** Candidate rejected (reason recorded) → later their experience grows
   → a new matching job is opened → candidate auto-appears under **Suggested Candidates**
   (Experience Upgrade) → **Reconsider** → back in pipeline.
3. **Reporting:** Manager opens **Application Tracker / Reports** → filters → **Export to Excel**.

---

## 9. Assumptions & Constraints

- Single-tenant, local deployment (MongoDB on localhost) for the current build.
- AI keys, Zoom, and SMTP are optional; the system runs fully without them.
- The LinkedIn extension must be loaded **unpacked** and the LinkedIn tab refreshed after reload.

---

## 10. Future Enhancements (recommended)

- Lock down authentication/authorization for production (replace `permitAll`).
- Offer-letter generation, onboarding, and email/SMS notifications.
- Scalability review for large candidate volumes (indexing, server-side search/pagination).
- Role-based field visibility and richer audit reporting.
- Configurable interview-stage templates per job/department.

---

*Document reflects the implemented development build of RecruitAI.*
