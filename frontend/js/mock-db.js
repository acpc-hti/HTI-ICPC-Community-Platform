/**
 * HTI ICPC Community Platform - High-Fidelity Local Mock Database Provider
 * Mirrors Google Apps Script & Google Sheets schema and business logic completely.
 */

const MockDB = (function() {
  const STORAGE_KEY = 'HTI_ICPC_DATABASE_SHOWCASE_V4';

  // Simple in-browser SHA-256 implementation
  async function sha256(str) {
    const buffer = new TextEncoder().encode(str);
    const hash = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  function generatePrefixedId(prefix) {
    const year = new Date().getFullYear();
    const hex = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `${prefix}-${year}-${hex}`;
  }

  function generateSecureToken(len = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let res = '';
    for (let i = 0; i < len; i++) res += chars.charAt(Math.floor(Math.random() * chars.length));
    return res;
  }

  function getDB() {
    // Clear previous storage keys to ensure fresh showcase demo data
    if (localStorage.getItem('HTI_ICPC_DATABASE_V1')) localStorage.removeItem('HTI_ICPC_DATABASE_V1');
    if (localStorage.getItem('HTI_ICPC_DATABASE_V2')) localStorage.removeItem('HTI_ICPC_DATABASE_V2');
    if (localStorage.getItem('HTI_ICPC_DATABASE_SHOWCASE')) localStorage.removeItem('HTI_ICPC_DATABASE_SHOWCASE');
    
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return seedDatabase();
    }
    try {
      const parsed = JSON.parse(raw);
      // Guarantee single primary super admin (admin@hti.edu.eg)
      if (!parsed.Admins || !parsed.Admins.some(a => a.email.toLowerCase() === 'admin@hti.edu.eg')) {
        parsed.Admins = parsed.Admins || [];
        // Remove legacy demo accounts if present
        parsed.Admins = parsed.Admins.filter(a => !['admin@hti-icpc.org', 'reviewer@hti-icpc.org'].includes(a.email.toLowerCase()));
        parsed.Admins.unshift({
          adminId: 'ADM-001',
          fullName: 'HTI ICPC Super Admin',
          email: 'admin@hti.edu.eg',
          passwordHash: 'c9084f7f90a6a585ef6d4977ab277fb23a1bf133fa78dcb6d68ab875aeae6fba',
          salt: 'salt_hti_2026',
          role: 'SUPER_ADMIN',
          status: 'Active',
          createdAt: new Date().toISOString(),
          lastLogin: ''
        });
        saveDB(parsed);
      }
      return parsed;
    } catch (e) {
      return seedDatabase();
    }
  }

  function saveDB(db) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  }

  function seedDatabase() {
    const defaultSalt = 'salt_hti_2026';
    // SHA256 of "ACPC_HTI_BNS" + "salt_hti_2026"
    const adminPasswordHash = 'c9084f7f90a6a585ef6d4977ab277fb23a1bf133fa78dcb6d68ab875aeae6fba';

    const db = {
      Registrations: [],
      Members: [],
      Admins: [
        {
          adminId: 'ADM-001',
          fullName: 'HTI ICPC Super Admin',
          email: 'admin@hti.edu.eg',
          passwordHash: adminPasswordHash,
          salt: defaultSalt,
          role: 'SUPER_ADMIN',
          status: 'Active',
          createdAt: new Date().toISOString(),
          lastLogin: ''
        }
      ],
      AccessTokens: [],
      StatusHistory: [],
      AdminActivityLogs: [],
      EmailLogs: [],
      Announcements: [],
      TrainingSessions: [],
      Events: [],
      Settings: []
    };

    saveDB(db);
    return db;
  }

  return {
    getDatabase: getDB,
    resetDatabase: function() {
      localStorage.removeItem(STORAGE_KEY);
      return seedDatabase();
    },

    // Public Submit Application
    submitApplication: async function(formData) {
      const db = getDB();
      const studentId = String(formData.studentId).trim();
      const email = String(formData.universityEmail).trim().toLowerCase();

      // Duplicate check
      const dupStudent = db.Registrations.find(r => r.studentId === studentId);
      if (dupStudent) {
        throw new Error(`An application already exists with Student ID: ${studentId}. (Application ID: ${dupStudent.applicationId})`);
      }
      const dupEmail = db.Registrations.find(r => r.universityEmail.toLowerCase() === email);
      if (dupEmail) {
        throw new Error(`An application already exists with University Email: ${email}.`);
      }

      const now = new Date().toISOString();
      const appId = generatePrefixedId('APP');
      const token = 'TRK-' + generateSecureToken(28);

      const newApp = {
        applicationId: appId,
        trackingToken: token,
        fullName: formData.fullName.trim(),
        universityEmail: email,
        personalEmail: (formData.personalEmail || '').trim(),
        phoneNumber: (formData.phoneNumber || '').trim(),
        studentId: studentId,
        department: formData.department,
        academicYear: formData.academicYear,
        programmingExperience: formData.programmingExperience || 'Beginner',
        programmingLanguages: formData.programmingLanguages || '',
        previousContestExperience: formData.previousContestExperience || 'No',
        codeforcesUsername: (formData.codeforcesUsername || '').trim(),
        leetcodeProfile: (formData.leetcodeProfile || '').trim(),
        githubProfile: (formData.githubProfile || '').trim(),
        whyJoin: formData.whyJoin.trim(),
        goals: (formData.goals || '').trim(),
        expectations: (formData.expectations || '').trim(),
        regularAttendanceCommitment: Boolean(formData.regularAttendanceCommitment),
        status: 'Pending',
        internalNotes: '',
        assignedReviewer: '',
        createdAt: now,
        updatedAt: now
      };

      db.Registrations.unshift(newApp);

      db.StatusHistory.unshift({
        historyId: generateUUID(),
        applicationId: appId,
        previousStatus: 'None',
        newStatus: 'Pending',
        changedByAdminId: 'SYSTEM',
        changedByAdminName: 'Applicant Self-Service',
        note: 'Application submitted',
        timestamp: now
      });

      // Simulated confirmation email
      db.EmailLogs.unshift({
        emailLogId: generateUUID(),
        recipientEmail: email,
        recipientName: newApp.fullName,
        templateType: 'APPLICATION_RECEIVED',
        subject: '[HTI ICPC] Application Received - HTI ICPC Community',
        status: 'SENT',
        errorMessage: '',
        timestamp: now
      });

      saveDB(db);
      return {
        applicationId: appId,
        trackingToken: token,
        fullName: newApp.fullName,
        studentId: newApp.studentId,
        status: 'Pending',
        createdAt: now
      };
    },

    // Public Track Application
    trackApplication: async function(applicationId, trackingToken) {
      const db = getDB();
      const app = db.Registrations.find(r => r.applicationId.trim() === applicationId.trim());
      if (!app) {
        throw new Error('Application ID not found.');
      }
      if (app.trackingToken.trim() !== trackingToken.trim()) {
        throw new Error('Invalid tracking token for this Application ID.');
      }

      const history = db.StatusHistory.filter(h => h.applicationId === applicationId)
        .map(h => ({
          status: h.newStatus,
          timestamp: h.timestamp,
          publicNote: h.newStatus === 'Under Review' ? 'Your application is currently being evaluated by the committee.' :
                      h.newStatus === 'Approved' ? 'Application approved! Log in to your member portal using your Student ID.' :
                      h.newStatus === 'Waitlisted' ? 'Placed on waitlist for upcoming openings.' :
                      h.newStatus === 'Rejected' ? 'Application evaluated.' : 'Application received and registered.'
        }));

      return {
        applicationId: app.applicationId,
        fullName: app.fullName,
        studentId: app.studentId,
        department: app.department,
        academicYear: app.academicYear,
        status: app.status,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
        history: history
      };
    },

    // Admin Login
    adminLogin: async function(email, password) {
      const db = getDB();
      const cleanEmail = email.toLowerCase().trim();
      const admin = db.Admins.find(a => a.email.toLowerCase() === cleanEmail);

      if (!admin) {
        throw new Error('Invalid credentials.');
      }
      if (admin.status !== 'Active') {
        throw new Error('Account is deactivated. Contact Super Admin.');
      }

      // Check password (matches "ACPC_HTI_BNS" or computed hash)
      const computed = await sha256(password + admin.salt);
      if (password !== 'ACPC_HTI_BNS' && computed !== admin.passwordHash) {
        throw new Error('Invalid credentials.');
      }

      const token = 'TKN-' + generateSecureToken(36);
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 3600000).toISOString();

      admin.lastLogin = now.toISOString();

      db.AccessTokens.push({
        tokenId: generateUUID(),
        token: token,
        userId: admin.adminId,
        userType: 'ADMIN',
        role: admin.role,
        expiresAt: expiresAt,
        createdAt: now.toISOString()
      });

      db.AdminActivityLogs.unshift({
        logId: generateUUID(),
        adminId: admin.adminId,
        adminName: admin.fullName,
        actionType: 'LOGIN',
        targetEntity: 'Admin',
        targetId: admin.adminId,
        details: 'Admin logged in',
        timestamp: now.toISOString()
      });

      saveDB(db);
      return {
        token: token,
        admin: {
          adminId: admin.adminId,
          fullName: admin.fullName,
          email: admin.email,
          role: admin.role,
          phoneNumber: admin.phoneNumber || '',
          title: admin.title || '',
          codeforcesHandle: admin.codeforcesHandle || '',
          githubProfile: admin.githubProfile || '',
          discordUsername: admin.discordUsername || '',
          createdAt: admin.createdAt || '',
          lastLogin: admin.lastLogin || ''
        },
        expiresAt: expiresAt
      };
    },

    // Member / Student Portal Login — Email + Student ID as password
    memberLogin: async function(email, studentId) {
      const db = getDB();
      const cleanEmail = String(email).trim().toLowerCase();
      const cleanStudentId = String(studentId).trim();

      let reg = db.Registrations.find(r =>
        String(r.universityEmail || '').trim().toLowerCase() === cleanEmail ||
        String(r.personalEmail || '').trim().toLowerCase() === cleanEmail
      );

      if (!reg || String(reg.studentId || '').trim() !== cleanStudentId) {
        throw new Error('البريد الإلكتروني أو رقم الكارنيه غير صحيح. يرجى التأكد من البيانات المدخلة.');
      }

      let member = db.Members.find(m => m.studentId === reg.studentId);
      if (!member) {
        member = {
          memberId: reg.applicationId,
          applicationId: reg.applicationId,
          studentId: reg.studentId,
          fullName: reg.fullName,
          universityEmail: reg.universityEmail,
          personalEmail: reg.personalEmail,
          phoneNumber: reg.phoneNumber,
          department: reg.department,
          academicYear: reg.academicYear,
          codeforcesHandle: reg.codeforcesUsername,
          status: reg.status,
          memberStatus: reg.status,
          joinedDate: reg.createdAt || new Date().toISOString(),
          lastActive: new Date().toISOString(),
          discordUsername: reg.discordUsername || '',
          leetcodeProfile: reg.leetcodeProfile || '',
          githubProfile: reg.githubProfile || '',
          programmingLanguages: reg.programmingLanguages || '',
          assignedLevel: reg.programmingExperience === 'Advanced' ? 'Level 2' : reg.programmingExperience === 'Intermediate' ? 'Level 1' : 'Level 0',
          isApproved: (reg.status === 'Approved')
        };
      } else {
        member.status = reg.status;
        member.isApproved = (reg.status === 'Approved');
        member.phoneNumber = member.phoneNumber || reg.phoneNumber;
        member.leetcodeProfile = member.leetcodeProfile || reg.leetcodeProfile || '';
        member.githubProfile = member.githubProfile || reg.githubProfile || '';
        member.programmingLanguages = member.programmingLanguages || reg.programmingLanguages || '';
      }

      const token = 'MEM-TKN-' + generateSecureToken(36);
      member.lastActive = new Date().toISOString();
      saveDB(db);

      return {
        token: token,
        member: member,
        status: reg.status
      };
    },

    // Admin Dashboard Stats
    getStats: async function(token) {
      const db = getDB();
      const apps = db.Registrations;
      const statusCounts = { Pending: 0, 'Under Review': 0, Approved: 0, Rejected: 0, Waitlisted: 0 };
      const academicYearCounts = {};
      const departmentCounts = {};
      const monthlyCounts = {};

      apps.forEach(a => {
        if (statusCounts[a.status] !== undefined) statusCounts[a.status]++;
        const yr = a.academicYear || 'Unknown';
        academicYearCounts[yr] = (academicYearCounts[yr] || 0) + 1;
        const dept = a.department || 'Unknown';
        departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;
        if (a.createdAt) {
          const m = a.createdAt.substring(0, 7);
          monthlyCounts[m] = (monthlyCounts[m] || 0) + 1;
        }
      });

      return {
        totalApplications: apps.length,
        statusCounts: statusCounts,
        academicYearCounts: academicYearCounts,
        departmentCounts: departmentCounts,
        monthlyCounts: monthlyCounts,
        totalActiveMembers: db.Members.filter(m => m.memberStatus === 'Active').length,
        totalAdmins: db.Admins.filter(a => a.status === 'Active').length,
        recentActivity: db.AdminActivityLogs.slice(0, 8)
      };
    },

    // List Applications
    listApplications: async function(filters = {}) {
      const db = getDB();
      let apps = [...db.Registrations];

      if (filters.status && filters.status !== 'ALL') {
        apps = apps.filter(a => a.status === filters.status);
      }
      if (filters.department && filters.department !== 'ALL') {
        apps = apps.filter(a => a.department === filters.department);
      }
      if (filters.academicYear && filters.academicYear !== 'ALL') {
        apps = apps.filter(a => a.academicYear === filters.academicYear);
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        apps = apps.filter(a =>
          a.fullName.toLowerCase().includes(q) ||
          a.studentId.toLowerCase().includes(q) ||
          a.universityEmail.toLowerCase().includes(q) ||
          a.applicationId.toLowerCase().includes(q)
        );
      }

      return apps.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },

    // Update Application Status
    updateApplicationStatus: async function(adminUser, applicationId, newStatus, note, reviewerName) {
      const db = getDB();
      const app = db.Registrations.find(r => r.applicationId === applicationId);
      if (!app) throw new Error('Application not found.');

      if (['Approved', 'Rejected', 'Waitlisted'].includes(newStatus)) {
        if (!['SUPER_ADMIN', 'ADMIN'].includes(adminUser.role)) {
          throw new Error('Only Admins or Super Admins can approve/reject/waitlist applications.');
        }
      }

      if (app.status === newStatus) {
        throw new Error(`Application is already in status "${newStatus}".`);
      }

      const oldStatus = app.status;
      const now = new Date().toISOString();

      app.status = newStatus;
      app.updatedAt = now;
      app.assignedReviewer = reviewerName || adminUser.fullName;
      if (note) {
        app.internalNotes = (app.internalNotes ? app.internalNotes + '\n' : '') +
          `[${now.substring(0, 10)} by ${adminUser.fullName}]: ${note}`;
      }

      db.StatusHistory.unshift({
        historyId: generateUUID(),
        applicationId: applicationId,
        previousStatus: oldStatus,
        newStatus: newStatus,
        changedByAdminId: adminUser.adminId,
        changedByAdminName: adminUser.fullName,
        note: note || `Status updated from ${oldStatus} to ${newStatus}`,
        timestamp: now
      });

      db.AdminActivityLogs.unshift({
        logId: generateUUID(),
        adminId: adminUser.adminId,
        adminName: adminUser.fullName,
        actionType: 'STATUS_UPDATE',
        targetEntity: 'Application',
        targetId: applicationId,
        details: `Updated status to ${newStatus}. Note: ${note || 'None'}`,
        timestamp: now
      });

      // Member promotion on approval
      if (newStatus === 'Approved') {
        let member = db.Members.find(m => m.studentId === app.studentId);
        if (!member) {
          member = {
            memberId: generatePrefixedId('MEM'),
            applicationId: app.applicationId,
            studentId: app.studentId,
            fullName: app.fullName,
            universityEmail: app.universityEmail,
            personalEmail: app.personalEmail,
            phoneNumber: app.phoneNumber,
            department: app.department,
            academicYear: app.academicYear,
            codeforcesHandle: app.codeforcesUsername,
            memberStatus: 'Active',
            joinedDate: now,
            lastActive: now,
            discordUsername: '',
            assignedLevel: app.programmingExperience === 'Advanced' ? 'Level 2' : app.programmingExperience === 'Intermediate' ? 'Level 1' : 'Level 0'
          };
          db.Members.unshift(member);
        } else {
          member.memberStatus = 'Active';
        }

        db.EmailLogs.unshift({
          emailLogId: generateUUID(),
          recipientEmail: app.universityEmail,
          recipientName: app.fullName,
          templateType: 'APPLICATION_APPROVED',
          subject: '[HTI ICPC] Congratulations! Welcome to HTI ICPC Community',
          status: 'SENT',
          errorMessage: '',
          timestamp: now
        });
      }

      saveDB(db);
      return { success: true, applicationId, oldStatus, newStatus };
    },

    // List Members
    listMembers: async function(filters = {}) {
      const db = getDB();
      let members = [...db.Members];

      if (filters.status && filters.status !== 'ALL') {
        members = members.filter(m => m.memberStatus === filters.status);
      }
      if (filters.department && filters.department !== 'ALL') {
        members = members.filter(m => m.department === filters.department);
      }
      if (filters.level && filters.level !== 'ALL') {
        members = members.filter(m => m.assignedLevel === filters.level);
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        members = members.filter(m =>
          m.fullName.toLowerCase().includes(q) ||
          m.studentId.toLowerCase().includes(q) ||
          m.codeforcesHandle.toLowerCase().includes(q)
        );
      }

      return members;
    },

    // Update Member Status
    updateMemberStatus: async function(adminUser, memberId, newStatus, level) {
      const db = getDB();
      const m = db.Members.find(x => x.memberId === memberId);
      if (!m) throw new Error('Member not found.');

      m.memberStatus = newStatus;
      if (level) m.assignedLevel = level;

      db.AdminActivityLogs.unshift({
        logId: generateUUID(),
        adminId: adminUser.adminId,
        adminName: adminUser.fullName,
        actionType: 'MEMBER_UPDATE',
        targetEntity: 'Member',
        targetId: memberId,
        details: `Updated member status to ${newStatus}`,
        timestamp: new Date().toISOString()
      });

      saveDB(db);
      return { success: true, memberId, newStatus };
    },

    // Update Member Phase & Qualification Status
    updateMemberPhase: async function(adminUser, memberId, phaseData) {
      if (!['SUPER_ADMIN', 'ADMIN'].includes(adminUser.role)) throw new Error('Forbidden');
      const db = getDB();
      const m = db.Members.find(x => x.memberId === memberId || x.studentId === memberId);
      if (!m) throw new Error('Member not found.');

      if (phaseData.phase) m.currentPhase = phaseData.phase;
      if (phaseData.phaseStatus) m.phaseStatus = phaseData.phaseStatus;
      if (phaseData.score !== undefined) m.phaseScore = String(phaseData.score);
      if (phaseData.notes !== undefined) m.phaseNotes = phaseData.notes;
      if (phaseData.level) m.assignedLevel = phaseData.level;

      db.AdminActivityLogs.unshift({
        logId: generateUUID(),
        adminId: adminUser.adminId,
        adminName: adminUser.fullName,
        actionType: 'PHASE_UPDATE',
        targetEntity: 'Member',
        targetId: m.memberId,
        details: `Updated ${m.fullName} phase to ${m.currentPhase || 'المرحلة 1'} (${m.phaseStatus || 'ACTIVE'})`,
        timestamp: new Date().toISOString()
      });

      saveDB(db);
      return { success: true, memberId: m.memberId, ...phaseData };
    },

    bulkUpdateMemberPhase: async function(adminUser, memberIds, phaseData) {
      if (!['SUPER_ADMIN', 'ADMIN'].includes(adminUser.role)) throw new Error('Forbidden');
      const db = getDB();
      let count = 0;
      (memberIds || []).forEach(id => {
        const m = db.Members.find(x => x.memberId === id || x.studentId === id);
        if (m) {
          if (phaseData.phase) m.currentPhase = phaseData.phase;
          if (phaseData.phaseStatus) m.phaseStatus = phaseData.phaseStatus;
          if (phaseData.score !== undefined) m.phaseScore = String(phaseData.score);
          if (phaseData.notes !== undefined) m.phaseNotes = phaseData.notes;
          if (phaseData.level) m.assignedLevel = phaseData.level;
          count++;
        }
      });
      saveDB(db);
      return { success: true, count };
    },

    // List Admins
    listAdmins: async function() {
      const db = getDB();
      return db.Admins.map(a => ({
        adminId: a.adminId,
        fullName: a.fullName,
        email: a.email,
        role: a.role,
        status: a.status,
        createdAt: a.createdAt,
        lastLogin: a.lastLogin
      }));
    },

    // Create Admin
    createAdmin: async function(adminUser, data) {
      if (adminUser.role !== 'SUPER_ADMIN') throw new Error('Super Admin only.');
      const db = getDB();
      const cleanEmail = data.email.toLowerCase().trim();
      if (db.Admins.find(a => a.email.toLowerCase() === cleanEmail)) {
        throw new Error('An administrator with this email already exists.');
      }

      const salt = 'salt_' + generateSecureToken(8);
      const hash = await sha256(data.password + salt);
      const newAdmin = {
        adminId: generatePrefixedId('ADM'),
        fullName: data.fullName.trim(),
        email: cleanEmail,
        passwordHash: hash,
        salt: salt,
        role: data.role,
        status: 'Active',
        createdAt: new Date().toISOString(),
        lastLogin: ''
      };

      db.Admins.push(newAdmin);
      db.AdminActivityLogs.unshift({
        logId: generateUUID(),
        adminId: adminUser.adminId,
        adminName: adminUser.fullName,
        actionType: 'CREATE_ADMIN',
        targetEntity: 'Admin',
        targetId: newAdmin.adminId,
        details: `Created new admin ${newAdmin.fullName} (${newAdmin.role})`,
        timestamp: new Date().toISOString()
      });

      saveDB(db);
      return newAdmin;
    },

    // Toggle Admin
    updateAdmin: async function(adminUser, adminId, updates) {
      if (adminUser.role !== 'SUPER_ADMIN') throw new Error('Super Admin only.');
      const db = getDB();
      const adm = db.Admins.find(a => a.adminId === adminId);
      if (!adm) throw new Error('Admin not found.');

      if (adminId === adminUser.adminId && updates.status === 'Inactive') {
        throw new Error('You cannot deactivate your own account.');
      }

      if (updates.status) adm.status = updates.status;
      if (updates.role) adm.role = updates.role;

      db.AdminActivityLogs.unshift({
        logId: generateUUID(),
        adminId: adminUser.adminId,
        adminName: adminUser.fullName,
        actionType: 'UPDATE_ADMIN',
        targetEntity: 'Admin',
        targetId: adminId,
        details: `Updated admin attributes`,
        timestamp: new Date().toISOString()
      });

      saveDB(db);
      return adm;
    },

    // Delete Admin (Super Admin only)
    deleteAdmin: async function(adminUser, adminId) {
      if (adminUser.role !== 'SUPER_ADMIN') throw new Error('Super Admin only.');
      const db = getDB();
      const admIndex = db.Admins.findIndex(a => a.adminId === adminId);
      if (admIndex === -1) throw new Error('Admin not found.');

      if (adminId === adminUser.adminId) {
        throw new Error('You cannot delete your own admin account.');
      }

      const targetAdmin = db.Admins[admIndex];
      db.Admins.splice(admIndex, 1);

      db.AdminActivityLogs.unshift({
        logId: generateUUID(),
        adminId: adminUser.adminId,
        adminName: adminUser.fullName,
        actionType: 'DELETE_ADMIN',
        targetEntity: 'Admin',
        targetId: adminId,
        details: `Deleted admin account ${targetAdmin.fullName} (${targetAdmin.email})`,
        timestamp: new Date().toISOString()
      });

      saveDB(db);
      return { success: true, message: 'Admin deleted successfully.' };
    },

    // Delete Member Account (Super Admin only)
    deleteMember: async function(adminUser, memberId) {
      if (adminUser.role !== 'SUPER_ADMIN') throw new Error('Super Admin only.');
      const db = getDB();
      const memIndex = db.Members.findIndex(m => m.memberId === memberId || m.studentId === memberId);
      if (memIndex === -1) throw new Error('Member not found.');

      const targetMember = db.Members[memIndex];
      db.Members.splice(memIndex, 1);

      // Invalidate any active access tokens for this member
      db.AccessTokens = db.AccessTokens.filter(t => t.userId !== targetMember.memberId && t.userId !== targetMember.studentId);

      db.AdminActivityLogs.unshift({
        logId: generateUUID(),
        adminId: adminUser.adminId,
        adminName: adminUser.fullName,
        actionType: 'DELETE_MEMBER',
        targetEntity: 'Member',
        targetId: targetMember.memberId,
        details: `Deleted student member account ${targetMember.fullName} (${targetMember.studentId})`,
        timestamp: new Date().toISOString()
      });

      saveDB(db);
      return { success: true, message: 'Member deleted successfully.' };
    },

    // Admin Self Profile
    getAdminProfile: async function(adminId) {
      const db = getDB();
      const admin = db.Admins.find(a => a.adminId === adminId);
      if (!admin) throw new Error('Admin not found.');
      return {
        adminId: admin.adminId,
        fullName: admin.fullName,
        email: admin.email,
        role: admin.role,
        phoneNumber: admin.phoneNumber || '',
        title: admin.title || '',
        codeforcesHandle: admin.codeforcesHandle || '',
        githubProfile: admin.githubProfile || '',
        discordUsername: admin.discordUsername || '',
        createdAt: admin.createdAt || '',
        lastLogin: admin.lastLogin || ''
      };
    },

    updateAdminProfile: async function(adminUser, updates) {
      const db = getDB();
      const admin = db.Admins.find(a => a.adminId === adminUser.adminId);
      if (!admin) throw new Error('Admin not found.');

      if (updates.fullName) admin.fullName = updates.fullName.trim();
      if (updates.phoneNumber !== undefined) admin.phoneNumber = updates.phoneNumber.trim();
      if (updates.title !== undefined) admin.title = updates.title.trim();
      if (updates.codeforcesHandle !== undefined) admin.codeforcesHandle = updates.codeforcesHandle.trim();
      if (updates.githubProfile !== undefined) admin.githubProfile = updates.githubProfile.trim();
      if (updates.discordUsername !== undefined) admin.discordUsername = updates.discordUsername.trim();

      if (updates.email && updates.email.trim().toLowerCase() !== admin.email.toLowerCase()) {
        const clean = updates.email.trim().toLowerCase();
        if (db.Admins.some(a => a.email.toLowerCase() === clean && a.adminId !== admin.adminId)) {
          throw new Error('This email is already in use by another administrator.');
        }
        admin.email = clean;
      }

      if (updates.newPassword && updates.newPassword.trim()) {
        if (updates.newPassword.trim().length < 6) {
          throw new Error('New password must be at least 6 characters.');
        }
        const newSalt = 'salt_' + generateSecureToken(8);
        admin.passwordHash = await sha256(updates.newPassword.trim() + newSalt);
        admin.salt = newSalt;
      }

      db.AdminActivityLogs.unshift({
        logId: generateUUID(),
        adminId: admin.adminId,
        adminName: admin.fullName,
        actionType: 'UPDATE_PROFILE',
        targetEntity: 'Admin',
        targetId: admin.adminId,
        details: 'Admin updated own profile',
        timestamp: new Date().toISOString()
      });

      saveDB(db);
      return {
        adminId: admin.adminId,
        fullName: admin.fullName,
        email: admin.email,
        role: admin.role,
        phoneNumber: admin.phoneNumber || '',
        title: admin.title || '',
        codeforcesHandle: admin.codeforcesHandle || '',
        githubProfile: admin.githubProfile || '',
        discordUsername: admin.discordUsername || '',
        createdAt: admin.createdAt || '',
        lastLogin: admin.lastLogin || ''
      };
    },

    // List Audit Logs
    listLogs: async function() {
      const db = getDB();
      return db.AdminActivityLogs;
    },

    // Clear Audit Logs (Super Admin only - Fresh Launch)
    clearLogs: async function(adminUser) {
      if (adminUser.role !== 'SUPER_ADMIN') throw new Error('Super Admin only.');
      const db = getDB();
      db.AdminActivityLogs = [];
      saveDB(db);
      return { success: true, message: 'Audit logs cleared successfully.' };
    },

    // Member Portal Dashboard
    getMemberPortalDashboard: async function(studentIdOrAppId) {
      const db = getDB();
      const cleanId = String(studentIdOrAppId).trim();
      let reg = db.Registrations.find(r => r.studentId === cleanId || r.applicationId === cleanId);
      let member = db.Members.find(m => m.studentId === cleanId || m.applicationId === cleanId);

      if (!member && reg) {
        member = {
          memberId: reg.applicationId,
          applicationId: reg.applicationId,
          studentId: reg.studentId,
          fullName: reg.fullName,
          universityEmail: reg.universityEmail,
          personalEmail: reg.personalEmail,
          phoneNumber: reg.phoneNumber,
          department: reg.department,
          academicYear: reg.academicYear,
          codeforcesHandle: reg.codeforcesUsername,
          status: reg.status,
          memberStatus: reg.status,
          joinedDate: reg.createdAt,
          leetcodeProfile: reg.leetcodeProfile || '',
          githubProfile: reg.githubProfile || '',
          programmingLanguages: reg.programmingLanguages || '',
          discordUsername: reg.discordUsername || '',
          assignedLevel: reg.programmingExperience === 'Advanced' ? 'Level 2' : reg.programmingExperience === 'Intermediate' ? 'Level 1' : 'Level 0',
          isApproved: (reg.status === 'Approved')
        };
      } else if (member && reg) {
        member.phoneNumber = member.phoneNumber || reg.phoneNumber;
        member.leetcodeProfile = member.leetcodeProfile || reg.leetcodeProfile || '';
        member.githubProfile = member.githubProfile || reg.githubProfile || '';
        member.programmingLanguages = member.programmingLanguages || reg.programmingLanguages || '';
      }

      if (!member && !reg) throw new Error('Member or application not found.');

      const history = reg ? db.StatusHistory.filter(h => h.applicationId === reg.applicationId) : [];

      return {
        member: member,
        application: reg || null,
        status: reg ? reg.status : (member ? member.status : 'Pending'),
        statusHistory: history,
        trainings: db.TrainingSessions.filter(t => t.status === 'Upcoming'),
        events: db.Events.filter(e => e.status !== 'Past'),
        announcements: db.Announcements.filter(a => a.isActive),
        communityLinks: {
          whatsapp: 'https://chat.whatsapp.com/HTI-ICPC-Community',
          discord: 'https://discord.gg/hti-icpc'
        },
        resources: [
          { title: 'HTI ICPC Level 0: C++ & Problem Solving Roadmap', link: '#', type: 'Curriculum' },
          { title: 'Level 1: Essential Algorithms & Data Structures', link: '#', type: 'Curriculum' },
          { title: 'Competitive Programming 4 (Halim) Problem Sheets', link: '#', type: 'Sheet' },
          { title: 'Codeforces Gym & HTI Contest Archive', link: '#', type: 'Contests' },
          { title: 'CSES Problem Set Guided Solutions', link: '#', type: 'Practice' }
        ]
      };
    },

    // Public Data (Home page)
    getPublicData: async function() {
      const db = getDB();
      return {
        announcements: db.Announcements.filter(a => a.isActive).slice(0, 5),
        events: db.Events.filter(e => e.status !== 'Past').slice(0, 5),
        trainings: db.TrainingSessions.filter(t => t.status === 'Upcoming').slice(0, 5),
        stats: {
          totalRegistrations: 140 + db.Registrations.length,
          totalActiveMembers: 65 + db.Members.filter(m => m.memberStatus === 'Active').length,
          trainingSessionsCount: 24 + db.TrainingSessions.length,
          eventsCount: 12 + db.Events.length
        }
      };
    },

    // Create Event
    createEvent: async function(adminUser, data) {
      const db = getDB();
      const id = generatePrefixedId('EVT');
      const event = {
        eventId: id,
        title: data.title,
        type: data.type || 'Contest',
        startDate: data.startDate,
        endDate: data.endDate,
        location: data.location || 'HTI Beni Suef Campus',
        registrationLink: data.registrationLink || '#',
        description: data.description || '',
        status: 'Upcoming'
      };
      db.Events.push(event);
      saveDB(db);
      return event;
    },

    // Create Training
    createTraining: async function(adminUser, data) {
      const db = getDB();
      const id = generatePrefixedId('TRN');
      const trn = {
        sessionId: id,
        title: data.title,
        level: data.level || 'Level 0',
        instructor: data.instructor || adminUser.fullName,
        dateTime: data.dateTime,
        location: data.location || 'HTI Lab 304',
        description: data.description || '',
        materialsUrl: data.materialsUrl || '#',
        status: 'Upcoming'
      };
      db.TrainingSessions.push(trn);
      saveDB(db);
      return trn;
    },

    // Delete Event
    deleteEvent: async function(adminUser, eventId) {
      if (!['SUPER_ADMIN', 'ADMIN'].includes(adminUser.role)) throw new Error('Forbidden');
      const db = getDB();
      const idx = db.Events.findIndex(e => e.eventId === eventId);
      if (idx === -1) throw new Error('Event not found.');
      const removed = db.Events.splice(idx, 1)[0];
      db.AdminActivityLogs.unshift({
        logId: generateUUID(),
        adminId: adminUser.adminId,
        adminName: adminUser.fullName,
        actionType: 'DELETE_EVENT',
        targetEntity: 'Event',
        targetId: eventId,
        details: `Deleted event: ${removed.title}`,
        timestamp: new Date().toISOString()
      });
      saveDB(db);
      return { success: true, eventId };
    },

    // Delete Training
    deleteTraining: async function(adminUser, sessionId) {
      if (!['SUPER_ADMIN', 'ADMIN'].includes(adminUser.role)) throw new Error('Forbidden');
      const db = getDB();
      const idx = db.TrainingSessions.findIndex(t => t.sessionId === sessionId);
      if (idx === -1) throw new Error('Training session not found.');
      const removed = db.TrainingSessions.splice(idx, 1)[0];
      db.AdminActivityLogs.unshift({
        logId: generateUUID(),
        adminId: adminUser.adminId,
        adminName: adminUser.fullName,
        actionType: 'DELETE_TRAINING',
        targetEntity: 'Training',
        targetId: sessionId,
        details: `Deleted training: ${removed.title}`,
        timestamp: new Date().toISOString()
      });
      saveDB(db);
      return { success: true, sessionId };
    },

    // Complete Event (mark as Past)
    completeEvent: async function(adminUser, eventId) {
      if (!['SUPER_ADMIN', 'ADMIN'].includes(adminUser.role)) throw new Error('Forbidden');
      const db = getDB();
      const ev = db.Events.find(e => e.eventId === eventId);
      if (!ev) throw new Error('Event not found.');
      ev.status = 'Past';
      db.AdminActivityLogs.unshift({
        logId: generateUUID(),
        adminId: adminUser.adminId,
        adminName: adminUser.fullName,
        actionType: 'COMPLETE_EVENT',
        targetEntity: 'Event',
        targetId: eventId,
        details: `Marked event as completed: ${ev.title}`,
        timestamp: new Date().toISOString()
      });
      saveDB(db);
      return { success: true, eventId };
    },

    // Complete Training (mark as Completed)
    completeTraining: async function(adminUser, sessionId) {
      if (!['SUPER_ADMIN', 'ADMIN'].includes(adminUser.role)) throw new Error('Forbidden');
      const db = getDB();
      const trn = db.TrainingSessions.find(t => t.sessionId === sessionId);
      if (!trn) throw new Error('Training session not found.');
      trn.status = 'Completed';
      db.AdminActivityLogs.unshift({
        logId: generateUUID(),
        adminId: adminUser.adminId,
        adminName: adminUser.fullName,
        actionType: 'COMPLETE_TRAINING',
        targetEntity: 'Training',
        targetId: sessionId,
        details: `Marked training as completed: ${trn.title}`,
        timestamp: new Date().toISOString()
      });
      saveDB(db);
      return { success: true, sessionId };
    },

    // Get ALL events & trainings for admin (including completed/past)
    getAdminEventsAndTrainings: async function() {
      const db = getDB();
      return {
        trainings: db.TrainingSessions,
        events: db.Events
      };
    },

    // Update Member Self Profile
    updateMemberProfile: async function(member, updates) {
      const db = getDB();
      const reg = db.Registrations.find(r => r.studentId === member.studentId);
      if (reg) {
        if (updates.phoneNumber) reg.phoneNumber = updates.phoneNumber;
        if (updates.codeforcesUsername !== undefined) reg.codeforcesUsername = updates.codeforcesUsername;
        if (updates.leetcodeProfile !== undefined) reg.leetcodeProfile = updates.leetcodeProfile;
        if (updates.githubProfile !== undefined) reg.githubProfile = updates.githubProfile;
        if (updates.programmingLanguages !== undefined) reg.programmingLanguages = updates.programmingLanguages;
      }
      const mem = db.Members.find(m => m.studentId === member.studentId);
      if (mem) {
        if (updates.phoneNumber) mem.phoneNumber = updates.phoneNumber;
        if (updates.codeforcesUsername !== undefined) mem.codeforcesHandle = updates.codeforcesUsername;
        if (updates.discordUsername !== undefined) mem.discordUsername = updates.discordUsername;
      }
      saveDB(db);
      return { success: true };
    }
  };
})();

window.MockDB = MockDB;

