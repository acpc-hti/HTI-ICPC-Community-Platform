# HTI ICPC Community Platform - Setup Guide

## 1. Local Development & Instant Testing

The frontend is architected to run immediately with zero external dependencies via the included **High-Fidelity Mock Provider** (`mock-db.js`).

### Quick Start:
1. Open the project in any browser or launch an HTTP server:
   ```bash
   npx serve frontend
   # or
   python -m http.server 8000 --directory frontend
   ```
2. Navigate to `http://localhost:8000`:
   - **Public Site**: `http://localhost:8000/index.html`
   - **Student Application**: `http://localhost:8000/apply.html`
   - **Application Tracking**: `http://localhost:8000/track.html`
   - **Student Member Portal**: `http://localhost:8000/portal.html`
   - **Multi-Admin Dashboard**: `http://localhost:8000/admin.html`

### Pre-Configured Administrator Accounts:
| Role | Email | Password | Permissions |
|---|---|---|---|
| **Super Admin** | `superadmin@hti-icpc.org` | `Admin@HTI2026!` | Full administrative control, admin account creation, audit logs |
| **Admin** | `admin@hti-icpc.org` | `Admin@HTI2026!` | Approve/Reject/Waitlist applications, manage members, analytics |
| **Reviewer** | `reviewer@hti-icpc.org` | `Reviewer@HTI2026!` | Review applications, add internal reviewer notes, mark Under Review |
| **Viewer** | `viewer@hti-icpc.org` | `Viewer@HTI2026!` | Read-only inspection of dashboard, applications, and members |

---

## 2. Google Sheets & Google Apps Script Setup

To connect the platform to your live university Google Sheets database:

### Step 1: Create the Google Spreadsheet
1. Go to [Google Sheets](https://sheets.new) and create a new blank spreadsheet.
2. Name it **"HTI ICPC Community Platform Database"**.
3. Copy the Spreadsheet ID from the URL:
   `https://docs.google.com/spreadsheets/d/<SPREADSHEET_ID>/edit`

### Step 2: Create the Google Apps Script Project
1. Open [Google Apps Script](https://script.google.com/home).
2. Click **New Project** and name it **"HTI ICPC Backend API"**.
3. In Project Settings, set Script Properties:
   - `SPREADSHEET_ID`: `<YOUR_SPREADSHEET_ID>` (or bind script directly to the sheet via **Extensions > Apps Script**).

### Step 3: Copy Backend Code
Create the following `.gs` script files in the Apps Script editor and copy the corresponding code from `backend/`:
- `Utils.gs`
- `Database.gs`
- `Auth.gs`
- `Applications.gs`
- `Members.gs`
- `Events.gs`
- `Email.gs`
- `Code.gs`

### Step 4: Run Initial Database Setup
1. In the Apps Script IDE, select `setupInitialDatabase` from the function dropdown.
2. Click **Run**.
3. Grant required Google Workspace permissions (Spreadsheet read/write, MailApp).
4. Apps Script will automatically generate all 11 sheets with appropriate formatting, headers, and seed the default Super Admin account (`admin@hti-icpc.org`).

---

## 3. Connecting Frontend to Google Apps Script

1. In the Apps Script IDE, click **Deploy > New Deployment**.
2. Select type **Web app**:
   - **Execute as:** `Me` (your Google account)
   - **Who has access:** `Anyone` (essential for public student registration)
3. Copy the generated Web App URL:
   `https://script.google.com/macros/s/AKfycbx.../exec`
4. Open `frontend/js/config.js` and paste your URL into `GAS_API_URL`:
   ```javascript
   const CONFIG = {
     COMMUNITY_NAME: 'HTI ICPC Community',
     GAS_API_URL: 'https://script.google.com/macros/s/AKfycbx.../exec',
     ...
   };
   ```
5. Save the file. All frontend actions now immediately sync to your Google Sheets database in real-time!

