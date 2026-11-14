# HTI ICPC Community Platform - Database Schema

This document details the complete 11-sheet Google Sheets database design for the HTI ICPC Community Management Platform.

---

## Google Spreadsheet Structure

All sheets use row 1 as the header row. IDs are permanent unique strings (e.g., `APP-2026-XXXX`, `MEM-2026-XXXX`, `ADM-XXXX`, `LOG-XXXX`). Spreadsheet row numbers are never used as identifiers.

---

### Sheet 1: `Registrations` (Applications)
Stores student applications to join the community.

| Column | Header | Type | Description |
|---|---|---|---|
| A | `applicationId` | String | Unique ID, e.g. `APP-2026-0001` |
| B | `trackingToken` | String | 32-char secure tracking token |
| C | `fullName` | String | Student full name |
| D | `universityEmail` | String | Official HTI email (@hti.edu.eg) |
| E | `personalEmail` | String | Backup personal email |
| F | `phoneNumber` | String | Egyptian mobile number (01xxxxxxxxx) |
| G | `studentId` | String | HTI Student ID (e.g. 20210045) |
| H | `department` | String | CS, IS, AI, Mechatronics, etc. |
| I | `academicYear` | String | Year 1, Year 2, Year 3, Year 4, Year 5 |
| J | `programmingExperience` | String | Beginner / Intermediate / Advanced |
| K | `programmingLanguages` | String | C++, Python, Java, etc. |
| L | `previousContestExperience`| String | Yes / No + details |
| M | `codeforcesUsername` | String | Codeforces handle |
| N | `leetcodeProfile` | String | LeetCode URL or handle |
| O | `githubProfile` | String | GitHub URL or handle |
| P | `whyJoin` | String | Motivation statement |
| Q | `goals` | String | Personal competitive programming goals |
| R | `expectations` | String | Expectations from community |
| S | `regularAttendanceCommitment` | Boolean | True / False |
| T | `status` | String | `Pending`, `Under Review`, `Approved`, `Rejected`, `Waitlisted` |
| U | `internalNotes` | String | Private admin notes |
| V | `assignedReviewer` | String | Admin ID or Name |
| W | `createdAt` | ISO DateTime | Application submission timestamp |
| X | `updatedAt` | ISO DateTime | Last status change timestamp |

---

### Sheet 2: `Members`
Active and alumni members who have been accepted into the community.

| Column | Header | Type | Description |
|---|---|---|---|
| A | `memberId` | String | Unique ID, e.g. `MEM-2026-0001` |
| B | `applicationId` | String | Linked `applicationId` |
| C | `studentId` | String | Unique HTI Student ID |
| D | `fullName` | String | Member full name |
| E | `universityEmail` | String | University email |
| F | `personalEmail` | String | Personal email |
| G | `phoneNumber` | String | Contact phone |
| H | `department` | String | Department |
| I | `academicYear` | String | Academic Year |
| J | `codeforcesHandle` | String | Codeforces profile |
| K | `memberStatus` | String | `Active`, `Inactive`, `Alumni`, `Suspended` |
| L | `joinedDate` | ISO DateTime | Acceptance date |
| M | `lastActive` | ISO DateTime | Last member portal login |
| N | `discordUsername` | String | Community Discord/WhatsApp contact |
| O | `assignedLevel` | String | Level 0 (Basics), Level 1 (Algorithms), Level 2 (Advanced) |

---

### Sheet 3: `Admins`
Administrative accounts with role-based access control.

| Column | Header | Type | Description |
|---|---|---|---|
| A | `adminId` | String | Unique ID, e.g. `ADM-001` |
| B | `fullName` | String | Administrator full name |
| C | `email` | String | Login email |
| D | `passwordHash` | String | SHA-256 salted hash of password |
| E | `salt` | String | Cryptographic salt |
| F | `role` | String | `SUPER_ADMIN`, `ADMIN`, `REVIEWER`, `VIEWER` |
| G | `status` | String | `Active`, `Inactive` |
| H | `createdAt` | ISO DateTime | Account creation date |
| I | `lastLogin` | ISO DateTime | Last successful login |

---

### Sheet 4: `AccessTokens`
Active session tokens for administrators and members.

| Column | Header | Type | Description |
|---|---|---|---|
| A | `tokenId` | String | Unique token identifier |
| B | `token` | String | Cryptographic secure token |
| C | `userId` | String | `adminId` or `memberId` |
| D | `userType` | String | `ADMIN` or `MEMBER` |
| E | `role` | String | Admin role or `MEMBER` |
| F | `expiresAt` | ISO DateTime | Expiration timestamp |
| G | `createdAt` | ISO DateTime | Issue timestamp |

---

### Sheet 5: `StatusHistory`
Audit trail of every application status change.

| Column | Header | Type | Description |
|---|---|---|---|
| A | `historyId` | String | Unique history record ID |
| B | `applicationId` | String | Target application ID |
| C | `previousStatus` | String | Old status |
| D | `newStatus` | String | New status |
| E | `changedByAdminId` | String | Admin who made the change |
| F | `changedByAdminName` | String | Name of administrator |
| G | `note` | String | Optional reason or note |
| H | `timestamp` | ISO DateTime | Action timestamp |

---

### Sheet 6: `AdminActivityLogs`
Comprehensive audit log of administrative actions.

| Column | Header | Type | Description |
|---|---|---|---|
| A | `logId` | String | Unique log ID |
| B | `adminId` | String | Responsible admin ID |
| C | `adminName` | String | Admin name |
| D | `actionType` | String | `LOGIN`, `STATUS_UPDATE`, `MEMBER_UPDATE`, `EVENT_CREATE`, etc. |
| E | `targetEntity` | String | Entity name (`Application`, `Member`, `Event`, `Admin`) |
| F | `targetId` | String | Target identifier |
| G | `details` | String | JSON or readable summary of changes |
| H | `timestamp` | ISO DateTime | Timestamp |

---

### Sheet 7: `EmailLogs`
Log of all system-dispatched emails.

| Column | Header | Type | Description |
|---|---|---|---|
| A | `emailLogId` | String | Unique email log ID |
| B | `recipientEmail` | String | Recipient address |
| C | `recipientName` | String | Recipient name |
| D | `templateType` | String | `APPLICATION_RECEIVED`, `APPLICATION_APPROVED`, etc. |
| E | `subject` | String | Email subject |
| F | `status` | String | `SENT`, `FAILED` |
| G | `errorMessage` | String | Error details if failed |
| H | `timestamp` | ISO DateTime | Dispatch timestamp |

---

### Sheet 8: `Announcements`
Public and community announcements.

| Column | Header | Type | Description |
|---|---|---|---|
| A | `announcementId` | String | Unique announcement ID |
| B | `title` | String | Announcement title |
| C | `content` | String | Full markdown/HTML content |
| D | `category` | String | `General`, `Contest`, `Training`, `Important` |
| E | `targetAudience` | String | `PUBLIC`, `MEMBERS_ONLY`, `ALL` |
| F | `publishedBy` | String | Admin name |
| G | `publishedAt` | ISO DateTime | Publication date |
| H | `isActive` | Boolean | True / False |

---

### Sheet 9: `TrainingSessions`
Weekly training sessions and workshops.

| Column | Header | Type | Description |
|---|---|---|---|
| A | `sessionId` | String | Unique session ID |
| B | `title` | String | Session topic (e.g., Dynamic Programming I) |
| C | `level` | String | `Level 0`, `Level 1`, `Level 2` |
| D | `instructor` | String | Instructor / Coach name |
| E | `dateTime` | ISO DateTime | Scheduled date and time |
| F | `location` | String | Room / Lab or Online Link |
| G | `description` | String | Session overview |
| H | `materialsUrl` | String | Slides / Problem set link |
| I | `status` | String | `Upcoming`, `Completed`, `Cancelled` |

---

### Sheet 10: `Events`
Contests, bootcamps, and official ICPC qualifications.

| Column | Header | Type | Description |
|---|---|---|---|
| A | `eventId` | String | Unique event ID |
| B | `title` | String | Event name |
| C | `type` | String | `Contest`, `Bootcamp`, `Workshop`, `ICPC Qualification` |
| D | `startDate` | ISO DateTime | Start timestamp |
| E | `endDate` | ISO DateTime | End timestamp |
| F | `location` | String | On-site lab or Online platform |
| G | `registrationLink`| String | Registration URL or Internal |
| H | `description` | String | Detailed description |
| I | `status` | String | `Upcoming`, `Ongoing`, `Past` |

---

### Sheet 11: `Settings`
Global community settings and metadata.

| Column | Header | Type | Description |
|---|---|---|---|
| A | `key` | String | Setting key (e.g. `REGISTRATION_OPEN`, `COMMUNITY_WHATSAPP`) |
| B | `value` | String | Setting value |
| C | `description` | String | Description of setting |
| D | `updatedAt` | ISO DateTime | Last update timestamp |

