# HTI ICPC COMMUNITY PLATFORM

> **Official University Competitive Programming Platform**  
> **Higher Technological Institute – Beni Suef**  
> *"Think. Code. Compete. Win."*

---

## 🚀 Overview

The **HTI ICPC Community Platform** is a full-featured, production-ready digital platform that manages the entire lifecycle of a collegiate competitive programming organization:
1. **Public Website**: Hero showcase, about section, activities, training paths, contests, leadership team, dynamic statistics, and announcements.
2. **Student Application System**: Comprehensive multi-step registration with client-side & server-side validation, duplicate prevention, and automated tracking token generation.
3. **Application Tracking**: Real-time status lookup with status timeline, guidance banners, and private notes redaction.
4. **Multi-Admin Dashboard**: Role-Based Access Control (**Super Admin**, **Admin**, **Reviewer**, **Viewer**), interactive Chart.js analytics, searchable application review queue, decision approvals, internal notes, CSV data export, and immutable audit logs.
5. **Approval Workflow & Member Automation**: Concurrency-protected state transitions that automatically promote approved students into active community members and trigger customized transactional emails.
6. **Student Member Portal**: Dedicated hub for approved members featuring curated roadmaps (Levels 0, 1, 2), upcoming training schedules, contest gym announcements, and direct WhatsApp / Discord invitations.
7. **Google Sheets Database**: 11 structured tables with permanent deterministic identifiers.
8. **Dual-Mode Architecture**: Works out-of-the-box locally with a high-fidelity local Mock/Storage provider or seamlessly connects to a live Google Apps Script Web App by entering one URL in `config.js`.

---

## 📂 Project Structure

```
HTI_ICPC_COMMUNITY/
├── frontend/
│   ├── index.html              # Main Public Website (Home, About, Activities, Team, etc.)
│   ├── apply.html              # Student Registration Form & Confirmation
│   ├── track.html              # Application Status Tracking
│   ├── portal.html             # Student Member Portal
│   ├── admin.html              # Multi-Admin Dashboard & Review Suite
│   ├── css/
│   │   └── styles.css          # Dark Modern University Design System
│   └── js/
│       ├── config.js           # Centralized Configuration (GAS URL & settings)
│       ├── mock-db.js          # In-Browser Local Mock Database Provider
│       ├── api.js              # Unified Client API Service
│       ├── main.js             # Public Landing Page Controller
│       ├── apply.js            # Registration Form Controller
│       ├── track.js            # Tracking Controller
│       ├── portal.js           # Member Portal Controller
│       └── admin.js            # Admin Dashboard Controller
│
├── backend/                    # Google Apps Script Source Files
│   ├── Code.gs                 # Main API Router (doGet & doPost)
│   ├── Database.gs             # Sheet Relational Engine & LockService
│   ├── Auth.gs                 # Salted SHA-256 Hashing, RBAC & Tokens
│   ├── Applications.gs         # Application Submission & Review Pipeline
│   ├── Members.gs              # Member Promotion & Directory Management
│   ├── Events.gs               # Contests, Trainings & Announcements CRUD
│   ├── Email.gs                # Transactional HTML Email Dispatch
│   └── Utils.gs                # Cryptographic Helpers & Sanitization
│
├── database/
│   └── schema.md               # 11-Sheet Relational Database Schema
│
├── documentation/
│   ├── architecture.md         # System Architecture & Concurrency Model
│   ├── setup.md                # Quickstart & Google Apps Script Setup
│   ├── deployment.md           # Hosting & Production Deployment Guide
│   └── testing.md              # Quality Assurance & Test Verification Report
│
├── test/
│   └── test-runner.js          # Automated End-to-End Test Suite
│
└── README.md
```

---

## ⚡ Quick Start (Instant Local Preview)

No dependencies required! Simply open the `frontend/` directory in any modern browser or run a lightweight local server:

```bash
# Using Python
python -m http.server 8000 --directory frontend

# Or using Node.js
npx serve frontend
```

### Pre-Configured Staff Accounts:
Password for all test accounts: `Admin@HTI2026!`
- **Super Admin**: `superadmin@hti-icpc.org` (Full system control)
- **Admin**: `admin@hti-icpc.org` (Approvals & member management)
- **Reviewer**: `reviewer@hti-icpc.org` (Candidate review & internal notes)
- **Viewer**: `viewer@hti-icpc.org` (Read-only observation)

---

## 📊 Database Schema (11 Sheets)

The database utilizes Google Sheets organized into 11 tables with header validation and row-locking:
1. `Registrations` (Student applications)
2. `Members` (Accepted active members)
3. `Admins` (Staff accounts with role permissions)
4. `AccessTokens` (Session management)
5. `StatusHistory` (Application audit trail)
6. `AdminActivityLogs` (Administrative action tracking)
7. `EmailLogs` (Dispatched email logs)
8. `Announcements` (Public & member news)
9. `TrainingSessions` (Weekly training curriculum)
10. `Events` (Contests & bootcamps)
11. `Settings` (Community links and configuration)

---

## 🛡️ Security & Reliability

- **Salted Password Hashing**: `SHA-256(password + salt)` with individual random 32-character salts.
- **Role-Based Authorization**: Every protected API route enforces permissions on the server.
- **Privacy Protection**: Administrative notes and reviewer identities are strictly redacted on student tracking queries.
- **Concurrency Locks**: Powered by Google Apps Script `LockService` with a 15-second timeout window.
- **Resilient Email Dispatch**: Failures in third-party mail quotas are safely logged without rolling back database state transitions.

---

## 🧪 Testing

To run the automated test suite verifying duplicate prevention, RBAC, salted authentication, and member auto-promotion:
```bash
node test/test-runner.js
```

---

## 📜 License
Developed for the **Higher Technological Institute – Beni Suef** ICPC Community.
All rights reserved © 2026.

