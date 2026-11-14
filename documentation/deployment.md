# HTI ICPC Community Platform - Deployment Guide

## Architecture Overview

The system is designed with a decoupled frontend/backend structure:
- **Frontend**: Static Web Application (HTML5, Bootstrap 5, Vanilla JS, Chart.js).
- **Backend API**: Google Apps Script Web App acting as a serverless REST gateway.
- **Data Store**: Google Sheets relational-style sheets.

---

## 1. Frontend Hosting Options

Because the frontend is static and connects to Google Apps Script via HTTPS JSON requests, it can be hosted on any static hosting platform.

### Option A: GitHub Pages (Recommended for Universities)
1. Initialize a Git repository in `frontend/` or the root:
   ```bash
   git init
   git add .
   git commit -m "Initial HTI ICPC Community Platform release"
   ```
2. Push to GitHub (`hti-icpc/platform`).
3. In repository Settings > **Pages**, set source to `main` branch `/frontend` (or root).
4. Custom domain setup: configure `icpc.hti.edu.eg` pointing to GitHub Pages CNAME.

### Option B: Netlify
1. Connect repository or run:
   ```bash
   npx netlify deploy --prod --dir=frontend
   ```
2. Set Custom Domain: `community.hti-icpc.org`.

### Option C: Google Apps Script Web App Direct HTML Delivery
If your institution forbids external static hosting, Google Apps Script can serve the HTML directly using `HtmlService.createHtmlOutputFromFile()`.

---

## 2. Production Security Checklist

- [x] **Salted Passwords**: Verify passwords are never stored in plaintext (`SHA-256(password + salt)`).
- [x] **Redaction of Administrative Fields**: Verify `Applications.track` strictly redacts `internalNotes` and `assignedReviewer` from student tracking queries.
- [x] **LockService Active**: Ensure all write transactions utilize `LockService.getScriptLock()` with a 15-second timeout.
- [x] **Duplicate Checks**: Confirm `studentId` and `universityEmail` uniqueness enforcement is active.
- [x] **Session Expiration**: Verify session tokens expire after 24 hours for administrators and 48 hours for student members.
- [x] **CORS & Form Submissions**: Ensure Google Apps Script Web App deployment is configured with access `Anyone`.

