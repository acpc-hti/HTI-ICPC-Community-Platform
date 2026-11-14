# HTI ICPC Community Platform - System Architecture & Technical Specifications

## 1. Architectural Overview

The **HTI ICPC Community Platform** is built with a clean, decoupled architecture:
1. **Frontend Presentation Layer**: Modern responsive Web Application (HTML5, Bootstrap 5, Font Awesome, Chart.js, ES6 Modules/Vanilla JS) adhering to the dark modern university branding guidelines.
2. **Backend API Layer**: Google Apps Script (GAS) Web App exposing RESTful JSON endpoints (`doGet`, `doPost`), secured with token-based authentication and role-based access control (RBAC).
3. **Database Layer**: Google Sheets structured into 11 distinct relational-style tables with unique deterministic IDs, foreign key references, and schema validation.
4. **Email Automation Layer**: Google Apps Script `MailApp` / `GmailApp` with transactional HTML templates, duplicate prevention, and execution logging.
5. **Universal Client Support**: The frontend features a unified API client (`api.js`) that supports both direct connection to the Google Apps Script Web App backend and an instant zero-config Mock/IndexedDB provider for local testing and demoing without live cloud credentials.

```
+-------------------------------------------------------------------------+
|                         Frontend Client (SPA)                           |
|  - Public Portal: Home, About, Activities, Training, Team, News, Apply |
|  - Application Tracking Page                                            |
|  - Student Member Portal (Protected)                                    |
|  - Multi-Admin Dashboard (RBAC Protected)                               |
+-------------------------------------------------------------------------+
                                   |
                         HTTPS REST / JSON API
                                   |
+-------------------------------------------------------------------------+
|                  Google Apps Script (GAS) Web App                       |
|  - Code.gs: Central Router (doGet & doPost Action Dispatcher)           |
|  - Auth.gs: Session tokens, SHA-256 salted hashing, RBAC enforcement    |
|  - Applications.gs: Registration, Duplicate Checks, Concurrency Lock   |
|  - Members.gs: Membership state transitions, member profiles            |
|  - Events.gs: Training sessions, announcements, contests CRUD           |
|  - Email.gs: HTML templates, retry safety, EmailLogs recording          |
|  - Database.gs: Sheet CRUD, schema enforcement, LockService concurrency |
+-------------------------------------------------------------------------+
                                   |
                         Google Apps Script API
                                   |
+-------------------------------------------------------------------------+
|                 Google Sheets Database (11 Tables)                      |
|  Registrations | Members | Admins | AccessTokens | StatusHistory       |
|  AdminActivityLogs | EmailLogs | Announcements | TrainingSessions      |
|  Events | Settings                                                      |
+-------------------------------------------------------------------------+
```

---

## 2. Role-Based Access Control (RBAC) Matrix

| Permission / Action | Super Admin | Admin | Reviewer | Viewer | Member | Public |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| View Public Pages & Events | Yes | Yes | Yes | Yes | Yes | Yes |
| Submit Application | Yes | Yes | Yes | Yes | Yes | Yes |
| Track Application Status | By ID | By ID | By ID | By ID | By ID | By ID |
| View Admin Dashboard & Stats | Yes | Yes | Yes | Yes | No | No |
| View Applications List | Yes | Yes | Yes | Yes | No | No |
| Add Internal Review Notes | Yes | Yes | Yes | No | No | No |
| Mark Application Under Review | Yes | Yes | Yes | No | No | No |
| Approve / Reject / Waitlist | Yes | Yes | No | No | No | No |
| View Members Directory | Yes | Yes | Yes | Yes | No | No |
| Activate / Deactivate Members | Yes | Yes | No | No | No | No |
| Manage Events & Trainings | Yes | Yes | No | No | No | No |
| Manage Announcements | Yes | Yes | No | No | No | No |
| Create / Edit Admins & Roles | Yes | No | No | No | No | No |
| View Audit Activity Logs | Yes | No | No | No | No | No |
| Access Student Member Portal | Yes | Yes | No | No | Yes | No |

---

## 3. Concurrency & Data Integrity Strategy

1. **Google Apps Script `LockService`**: All write operations in Google Apps Script (application submission, status changes, member promotion, admin modifications) utilize `LockService.getScriptLock()` with a 15-second timeout window. This prevents race conditions and duplicate approvals.
2. **Duplicate Prevention**:
   - `studentId` and `universityEmail` are strictly checked before inserting new registrations.
   - Applications that are already `Approved` or `Rejected` cannot be approved a second time.
3. **Resilient Email Pipeline**: Email dispatch is performed in a `try...catch` block separate from database transactions. If Google Mail quota is exhausted or an email fails to deliver, the database approval is committed safely, and the failure is logged to `EmailLogs` for retry.
4. **Permanent Unique Identifiers**: No system feature relies on spreadsheet row numbers. System uses deterministic, collision-resistant identifiers:
   - Applications: `APP-YYYY-XXXXX`
   - Members: `MEM-YYYY-XXXXX`
   - Admins: `ADM-XXXXX`
   - Tokens: `TKN-UUID4-CRYPTOGRAPHIC`
   - History: `HST-UUID`
   - Logs: `LOG-UUID`

---

## 4. Security & Cryptography

1. **Password Protection**: Passwords are never stored in plaintext. They are hashed using `SHA-256(password + salt)` with a unique 32-character random salt generated per user.
2. **Session Tokens**: Active sessions are tracked in `AccessTokens` with a 24-hour expiration timestamp. Every protected API request validates token authenticity, expiration, and user permissions on the server.
3. **Sanitization & XSS Prevention**: All frontend outputs are escaped before DOM insertion. Backend sanitizes all input strings against injection.
4. **Private Student Data**: Application tracking only reveals the applicant's name, ID, status timeline, and public instructions. Administrative notes and reviewer identities are strictly redacted on tracking queries.

