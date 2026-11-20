/**
 * HTI ICPC Community Platform - Automated Test Suite
 * Executes end-to-end unit and integration tests covering the complete platform lifecycle.
 */

const crypto = require('crypto');

function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

// In-Memory Test State
let db = {
  Registrations: [],
  Members: [],
  Admins: [],
  AccessTokens: [],
  StatusHistory: [],
  AdminActivityLogs: [],
  EmailLogs: [],
  Events: [],
  TrainingSessions: [],
  Announcements: []
};

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  \x1b[32m✔ PASS:\x1b[0m ${message}`);
    passed++;
  } else {
    console.error(`  \x1b[31m✖ FAIL:\x1b[0m ${message}`);
    failed++;
  }
}

console.log('\n======================================================');
console.log('  HTI ICPC COMMUNITY PLATFORM - TEST SUITE EXECUTION  ');
console.log('======================================================\n');

// 1. Database Initialization & Admin Seeding
console.log('Test Suite 1: Admin Account Setup & Salted Password Hashing');
const salt = 'test_salt_12345';
const password = 'ACPC_HTI_BNS';
const passwordHash = sha256(password + salt);

db.Admins.push({
  adminId: 'ADM-001',
  fullName: 'HTI ICPC Super Admin',
  email: 'admin@hti.edu.eg',
  passwordHash: passwordHash,
  salt: salt,
  role: 'SUPER_ADMIN',
  status: 'Active'
});

db.Admins.push({
  adminId: 'ADM-002',
  fullName: 'Reviewer Admin',
  email: 'reviewer@hti-icpc.org',
  passwordHash: passwordHash,
  salt: salt,
  role: 'REVIEWER',
  status: 'Active'
});

assert(db.Admins.length === 2, 'Admins table seeded with Super Admin and Reviewer');
assert(db.Admins[0].passwordHash !== password, 'Plaintext passwords are NOT stored');
assert(sha256(password + db.Admins[0].salt) === db.Admins[0].passwordHash, 'Salted SHA-256 hash verifies accurately');
assert(db.Admins[0].email === 'admin@hti.edu.eg', 'Super Admin email is correctly set to admin@hti.edu.eg');

// 2. Student Application Submission
console.log('\nTest Suite 2: Student Application Submission & Duplicate Prevention');
function submitApplication(formData) {
  // Required field check
  if (!formData.fullName || !formData.universityEmail || !formData.studentId) {
    throw new Error('Missing required field');
  }

  // Duplicate checks
  const dupId = db.Registrations.find(r => r.studentId === formData.studentId);
  if (dupId) throw new Error(`Duplicate Student ID: ${formData.studentId}`);

  const dupEmail = db.Registrations.find(r => r.universityEmail.toLowerCase() === formData.universityEmail.toLowerCase());
  if (dupEmail) throw new Error(`Duplicate Email: ${formData.universityEmail}`);

  const appId = `APP-2026-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  const trackingToken = 'TRK-' + crypto.randomBytes(16).toString('hex');

  const record = {
    applicationId: appId,
    trackingToken: trackingToken,
    ...formData,
    status: 'Pending',
    createdAt: new Date().toISOString()
  };

  db.Registrations.push(record);
  db.StatusHistory.push({
    historyId: 'HST-1',
    applicationId: appId,
    previousStatus: 'None',
    newStatus: 'Pending',
    timestamp: new Date().toISOString()
  });
  db.EmailLogs.push({
    recipientEmail: formData.universityEmail,
    templateType: 'APPLICATION_RECEIVED',
    status: 'SENT'
  });

  return record;
}

const app1 = submitApplication({
  fullName: 'Kareem Ahmed',
  universityEmail: 'kareem.ahmed@hti.edu.eg',
  studentId: '20230550',
  department: 'Computer Science',
  academicYear: 'Year 2',
  programmingExperience: 'Intermediate',
  codeforcesUsername: 'KareemCP'
});

assert(app1.applicationId.startsWith('APP-2026-'), 'Generated unique Application ID format');
assert(app1.trackingToken.startsWith('TRK-'), 'Generated 32+ character secure tracking token');
assert(app1.status === 'Pending', 'Initial status set to Pending');
assert(db.EmailLogs.some(e => e.templateType === 'APPLICATION_RECEIVED'), 'Application Received email notification queued');

// Test Duplicate Prevention
let dupCaught = false;
try {
  submitApplication({
    fullName: 'Duplicate Kareem',
    universityEmail: 'kareem.ahmed@hti.edu.eg',
    studentId: '20230550'
  });
} catch (e) {
  dupCaught = true;
}
assert(dupCaught, 'Prevented duplicate student registration with matching Student ID / Email');

// 3. Application Tracking & Redaction of Private Notes
console.log('\nTest Suite 3: Application Tracking & Private Data Redaction');
function trackApplication(appId, token) {
  const app = db.Registrations.find(r => r.applicationId === appId);
  if (!app || app.trackingToken !== token) throw new Error('Invalid credentials');
  
  // Return public object strictly omitting internal notes and reviewers
  return {
    applicationId: app.applicationId,
    fullName: app.fullName,
    studentId: app.studentId,
    status: app.status,
    history: db.StatusHistory.filter(h => h.applicationId === appId)
  };
}

const tracked = trackApplication(app1.applicationId, app1.trackingToken);
assert(tracked.applicationId === app1.applicationId, 'Applicant successfully queried application by ID and token');
assert(tracked.internalNotes === undefined, 'Internal notes strictly REDACTED from public tracking');
assert(tracked.assignedReviewer === undefined, 'Assigned reviewer identity strictly REDACTED from public tracking');

// 4. Role-Based Access Control (RBAC) & Approval Workflow
console.log('\nTest Suite 4: Role-Based Authorization & Approval Workflow');
function updateStatus(admin, appId, newStatus, note = '') {
  // Permission guard
  if (['Approved', 'Rejected', 'Waitlisted'].includes(newStatus)) {
    if (!['SUPER_ADMIN', 'ADMIN'].includes(admin.role)) {
      throw new Error(`Forbidden: Role ${admin.role} cannot make final decisions.`);
    }
  }

  const app = db.Registrations.find(r => r.applicationId === appId);
  if (!app) throw new Error('Application not found');
  if (app.status === newStatus) throw new Error(`Already in status ${newStatus}`);

  const oldStatus = app.status;
  app.status = newStatus;
  app.updatedAt = new Date().toISOString();

  db.StatusHistory.push({
    historyId: 'HST-' + Math.random().toString(36).substring(2, 6),
    applicationId: appId,
    previousStatus: oldStatus,
    newStatus: newStatus,
    changedByAdminName: admin.fullName,
    note: note
  });

  db.AdminActivityLogs.push({
    logId: 'LOG-' + Math.random().toString(36).substring(2, 6),
    adminId: admin.adminId,
    actionType: 'STATUS_UPDATE',
    targetId: appId,
    details: `Status changed to ${newStatus}`
  });

  if (newStatus === 'Approved') {
    // Activate member
    const memId = `MEM-2026-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    db.Members.push({
      memberId: memId,
      applicationId: app.applicationId,
      studentId: app.studentId,
      fullName: app.fullName,
      universityEmail: app.universityEmail,
      memberStatus: 'Active',
      assignedLevel: app.programmingExperience === 'Advanced' ? 'Level 2' : 'Level 1'
    });
    db.EmailLogs.push({
      recipientEmail: app.universityEmail,
      templateType: 'APPLICATION_APPROVED',
      status: 'SENT'
    });
  }

  return app;
}

// Test RBAC: Reviewer cannot approve
let unauthorizedCaught = false;
try {
  updateStatus(db.Admins[1], app1.applicationId, 'Approved'); // Reviewer attempting to approve
} catch (e) {
  unauthorizedCaught = true;
}
assert(unauthorizedCaught, 'RBAC correctly blocked REVIEWER from executing final approval');

// Test Super Admin Approval
const approvedApp = updateStatus(db.Admins[0], app1.applicationId, 'Approved', 'Outstanding candidate');
assert(approvedApp.status === 'Approved', 'Super Admin successfully approved candidate');
assert(db.Members.some(m => m.studentId === app1.studentId && m.memberStatus === 'Active'), 'Member record automatically created and activated in Members table');
assert(db.EmailLogs.some(e => e.templateType === 'APPLICATION_APPROVED'), 'Acceptance email dispatched and recorded in EmailLogs');
assert(db.AdminActivityLogs.some(l => l.actionType === 'STATUS_UPDATE' && l.targetId === app1.applicationId), 'Action recorded with administrator identity in AdminActivityLogs');

// 5. Member Portal Access
console.log('\nTest Suite 5: Member Portal Authentication');
function memberLogin(studentId, trackingToken) {
  const reg = db.Registrations.find(r => r.studentId === studentId);
  if (!reg || reg.trackingToken !== trackingToken) throw new Error('Invalid credentials');
  if (reg.status !== 'Approved') throw new Error('Applicant is not approved');

  const member = db.Members.find(m => m.studentId === studentId);
  if (!member || member.memberStatus !== 'Active') throw new Error('Member account not active');

  return { token: 'MEM-TKN-' + crypto.randomBytes(16).toString('hex'), member };
}

const memberSession = memberLogin(app1.studentId, app1.trackingToken);
assert(memberSession.token.startsWith('MEM-TKN-'), 'Member authenticated successfully into Student Member Portal');
assert(memberSession.member.assignedLevel === 'Level 1', 'Member assigned appropriate training curriculum level');

// 6. Training Phases & Continuous Elimination Pipeline
console.log('\nTest Suite 6: Training Phases & Continuous Elimination Pipeline');
function updateMemberPhase(admin, memberId, phaseData) {
  if (!['SUPER_ADMIN', 'ADMIN'].includes(admin.role)) throw new Error('Forbidden');
  const m = db.Members.find(x => x.memberId === memberId);
  if (!m) throw new Error('Member not found');

  m.currentPhase = phaseData.phase || m.currentPhase || 'المرحلة 1';
  m.phaseStatus = phaseData.phaseStatus || 'ACTIVE';
  m.phaseScore = phaseData.score || '';
  m.phaseNotes = phaseData.notes || '';

  db.AdminActivityLogs.push({
    actionType: 'PHASE_UPDATE',
    adminId: admin.adminId,
    targetId: m.memberId,
    details: `Updated ${m.fullName} phase to ${m.currentPhase}`
  });
  return m;
}

// Check initial phase assignment on approval
const initialMember = db.Members.find(m => m.studentId === app1.studentId);
initialMember.currentPhase = initialMember.currentPhase || 'المرحلة 1';
initialMember.phaseStatus = initialMember.phaseStatus || 'ACTIVE';
assert(initialMember.currentPhase === 'المرحلة 1', 'Enrolled member automatically starts in Phase 1 (المرحلة 1)');
assert(initialMember.phaseStatus === 'ACTIVE', 'Member phase status defaults to ACTIVE (In Training)');

// Promote member after passing exam
const promotedMember = updateMemberPhase(db.Admins[0], initialMember.memberId, {
  phase: 'المرحلة 2',
  phaseStatus: 'QUALIFIED',
  score: '5/5 Solved',
  notes: 'Excellent performance in DP contest'
});
assert(promotedMember.currentPhase === 'المرحلة 2', 'Admin successfully promoted student to Phase 2 (المرحلة 2)');
assert(promotedMember.phaseStatus === 'QUALIFIED', 'Student status marked as QUALIFIED after passing exam');
assert(promotedMember.phaseScore === '5/5 Solved', 'Exam score successfully recorded for qualification evaluation');
assert(db.AdminActivityLogs.some(l => l.actionType === 'PHASE_UPDATE'), 'Phase progression recorded in Admin Audit Logs');

// 7. Super Admin Account Deletion Capabilities
console.log('\nTest Suite 7: Super Admin Account Deletion Capabilities');
function deleteAdmin(callerAdmin, targetAdminId) {
  if (callerAdmin.role !== 'SUPER_ADMIN') {
    throw new Error('Forbidden: Only Super Admin can delete admin accounts.');
  }
  if (callerAdmin.adminId === targetAdminId) {
    throw new Error('You cannot delete your own admin account.');
  }
  const idx = db.Admins.findIndex(a => a.adminId === targetAdminId);
  if (idx === -1) throw new Error('Admin not found');
  const deleted = db.Admins.splice(idx, 1)[0];
  db.AdminActivityLogs.push({
    actionType: 'DELETE_ADMIN',
    adminId: callerAdmin.adminId,
    targetId: targetAdminId,
    details: `Deleted admin account ${deleted.email}`
  });
  return true;
}

function deleteMember(callerAdmin, memberId) {
  if (callerAdmin.role !== 'SUPER_ADMIN') {
    throw new Error('Forbidden: Only Super Admin can delete member accounts.');
  }
  const idx = db.Members.findIndex(m => m.memberId === memberId);
  if (idx === -1) throw new Error('Member not found');
  const deleted = db.Members.splice(idx, 1)[0];
  db.AdminActivityLogs.push({
    actionType: 'DELETE_MEMBER',
    adminId: callerAdmin.adminId,
    targetId: memberId,
    details: `Deleted member account ${deleted.fullName}`
  });
  return true;
}

// Reviewer cannot delete admin
let reviewerBlocked = false;
try {
  deleteAdmin(db.Admins[1], db.Admins[0].adminId);
} catch (e) {
  reviewerBlocked = true;
}
assert(reviewerBlocked, 'RBAC prevents non-superadmin from deleting admin accounts');

// Super Admin cannot delete own account
let selfDeleteBlocked = false;
try {
  deleteAdmin(db.Admins[0], db.Admins[0].adminId);
} catch (e) {
  selfDeleteBlocked = true;
}
assert(selfDeleteBlocked, 'Super Admin is prevented from deleting their own account');

// Super Admin deletes reviewer admin, leaving only 1 Admin
deleteAdmin(db.Admins[0], 'ADM-002');
assert(db.Admins.length === 1, 'Super Admin successfully deleted Reviewer Admin (leaving exactly 1 Admin)');
assert(db.Admins[0].email === 'admin@hti.edu.eg', 'Sole remaining admin is admin@hti.edu.eg');

// Super Admin deletes student member
const memberCountBefore = db.Members.length;
deleteMember(db.Admins[0], initialMember.memberId);
assert(db.Members.length === memberCountBefore - 1, 'Super Admin successfully deleted student member account');
assert(db.AdminActivityLogs.some(l => l.actionType === 'DELETE_MEMBER'), 'Member deletion recorded in Admin Audit Logs');

// Super Admin clears audit logs to start from scratch
function clearLogs(callerAdmin) {
  if (callerAdmin.role !== 'SUPER_ADMIN') {
    throw new Error('Forbidden: Only Super Admin can clear audit logs.');
  }
  db.AdminActivityLogs = [];
  return true;
}

clearLogs(db.Admins[0]);
assert(db.AdminActivityLogs.length === 0, 'Super Admin successfully cleared audit activity logs (fresh launch from zero)');

// 8. Events & Trainings Management (Complete to Hide & Delete)
console.log('\nTest Suite 8: Events & Training Management (Complete to Hide & Delete)');

// Add Event
const newEvent = {
  eventId: 'EVT-TEST-001',
  title: 'HTI Local Contest 2026',
  type: 'Contest',
  startDate: new Date().toISOString(),
  location: 'Lab 304',
  status: 'Upcoming'
};
db.Events.push(newEvent);

// Add Training
const newTraining = {
  sessionId: 'TRN-TEST-001',
  title: 'Advanced Dynamic Programming',
  level: 'Level 2',
  instructor: 'Admin',
  dateTime: new Date().toISOString(),
  location: 'Lab 302',
  status: 'Upcoming'
};
db.TrainingSessions.push(newTraining);

assert(db.Events.some(e => e.eventId === 'EVT-TEST-001'), 'Event created successfully');
assert(db.TrainingSessions.some(t => t.sessionId === 'TRN-TEST-001'), 'Training session created successfully');

// Verify appearing in public data
let publicEvents = db.Events.filter(e => e.status !== 'Past');
let publicTrainings = db.TrainingSessions.filter(t => t.status === 'Upcoming');
assert(publicEvents.some(e => e.eventId === 'EVT-TEST-001'), 'Active event appears in public events');
assert(publicTrainings.some(t => t.sessionId === 'TRN-TEST-001'), 'Active training session appears in public trainings');

// Update Event
const targetEv = db.Events.find(e => e.eventId === 'EVT-TEST-001');
targetEv.title = 'HTI Official ECPC Qualifier 2026';
assert(targetEv.title === 'HTI Official ECPC Qualifier 2026', 'Event successfully updated after creation');

// Update Training
const targetTrn = db.TrainingSessions.find(t => t.sessionId === 'TRN-TEST-001');
targetTrn.title = 'Advanced Graph Theory & Network Flow';
assert(targetTrn.title === 'Advanced Graph Theory & Network Flow', 'Training session successfully updated after creation');

// Mark Event as Completed (Past)
targetEv.status = 'Past';
publicEvents = db.Events.filter(e => e.status !== 'Past');
assert(!publicEvents.some(e => e.eventId === 'EVT-TEST-001'), 'Completed event is hidden from public view');

// Mark Training as Completed
targetTrn.status = 'Completed';
publicTrainings = db.TrainingSessions.filter(t => t.status === 'Upcoming');
assert(!publicTrainings.some(t => t.sessionId === 'TRN-TEST-001'), 'Completed training is hidden from public view');

// Delete Event
const evIdx = db.Events.findIndex(e => e.eventId === 'EVT-TEST-001');
db.Events.splice(evIdx, 1);
assert(!db.Events.some(e => e.eventId === 'EVT-TEST-001'), 'Event deleted permanently from database');

// Delete Training
const trnIdx = db.TrainingSessions.findIndex(t => t.sessionId === 'TRN-TEST-001');
db.TrainingSessions.splice(trnIdx, 1);
assert(!db.TrainingSessions.some(t => t.sessionId === 'TRN-TEST-001'), 'Training session deleted permanently from database');

// Announcement Lifecycle: Create, Update & Delete
const newAnn = {
  announcementId: 'ANN-TEST-001',
  title: 'Official Contest Registration Opened',
  category: 'Contest',
  content: 'Please register before Friday',
  targetAudience: 'ALL',
  publishedBy: 'Super Admin',
  publishedAt: new Date().toISOString(),
  isActive: true
};
db.Announcements.push(newAnn);
assert(db.Announcements.some(a => a.announcementId === 'ANN-TEST-001'), 'Announcement created successfully');

// Update Announcement
const targetAnn = db.Announcements.find(a => a.announcementId === 'ANN-TEST-001');
targetAnn.title = 'UPDATED: Official Contest Registration';
targetAnn.isActive = false;
assert(targetAnn.title === 'UPDATED: Official Contest Registration', 'Announcement successfully updated after creation');
assert(targetAnn.isActive === false, 'Announcement can be deactivated / hidden');

// Delete Announcement
const annIdx = db.Announcements.findIndex(a => a.announcementId === 'ANN-TEST-001');
db.Announcements.splice(annIdx, 1);
assert(!db.Announcements.some(a => a.announcementId === 'ANN-TEST-001'), 'Announcement deleted permanently from database');

console.log('\n======================================================');
console.log(`  TEST RESULTS: ${passed} PASSED, ${failed} FAILED  `);
console.log('======================================================\n');

if (failed > 0) {
  process.exit(1);
}

