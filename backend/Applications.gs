/**
 * HTI ICPC Community Platform - Applications Management & Approval Workflow
 * Backend: Google Apps Script
 */

const Applications = {
  /**
   * Submits a student registration
   */
  submit: function(formData) {
    const lock = LockService.getScriptLock();
    try {
      // 15 seconds lock wait for concurrency safety
      lock.waitLock(15000);

      // Validate Required Fields
      const requiredFields = ['fullName', 'universityEmail', 'studentId', 'phoneNumber', 'department', 'academicYear', 'whyJoin'];
      for (const field of requiredFields) {
        if (!formData[field] || String(formData[field]).trim() === '') {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      const studentId = String(formData.studentId).trim();
      const universityEmail = String(formData.universityEmail).trim().toLowerCase();

      if (!Utils.isValidEmail(universityEmail)) {
        throw new Error('Please enter a valid university email address.');
      }

      // Check duplicates
      const existingByStudentId = Database.findOne(TABLES.REGISTRATIONS, 'studentId', studentId);
      if (existingByStudentId) {
        throw new Error(`An application has already been submitted with Student ID: ${studentId}. Application ID is ${existingByStudentId.applicationId}.`);
      }

      const existingByEmail = Database.findOne(TABLES.REGISTRATIONS, 'universityEmail', universityEmail);
      if (existingByEmail) {
        throw new Error(`An application has already been submitted with Email: ${universityEmail}.`);
      }

      const now = new Date().toISOString();
      const applicationId = Utils.generatePrefixedId('APP');
      const trackingToken = Utils.generateSecureToken(32);

      const applicationRecord = {
        applicationId: applicationId,
        trackingToken: trackingToken,
        fullName: Utils.sanitize(formData.fullName),
        universityEmail: universityEmail,
        personalEmail: Utils.sanitize(formData.personalEmail || ''),
        phoneNumber: Utils.sanitize(formData.phoneNumber),
        studentId: studentId,
        department: Utils.sanitize(formData.department),
        academicYear: Utils.sanitize(formData.academicYear),
        programmingExperience: Utils.sanitize(formData.programmingExperience || 'Beginner'),
        programmingLanguages: Utils.sanitize(formData.programmingLanguages || ''),
        previousContestExperience: Utils.sanitize(formData.previousContestExperience || 'No'),
        codeforcesUsername: Utils.sanitize(formData.codeforcesUsername || ''),
        leetcodeProfile: Utils.sanitize(formData.leetcodeProfile || ''),
        githubProfile: Utils.sanitize(formData.githubProfile || ''),
        whyJoin: Utils.sanitize(formData.whyJoin),
        goals: Utils.sanitize(formData.goals || ''),
        expectations: Utils.sanitize(formData.expectations || ''),
        regularAttendanceCommitment: Boolean(formData.regularAttendanceCommitment),
        status: 'Pending',
        internalNotes: '',
        assignedReviewer: '',
        createdAt: now,
        updatedAt: now
      };

      Database.insert(TABLES.REGISTRATIONS, applicationRecord);

      // Record initial status history
      Database.insert(TABLES.STATUS_HISTORY, {
        historyId: Utils.generateUUID(),
        applicationId: applicationId,
        previousStatus: 'None',
        newStatus: 'Pending',
        changedByAdminId: 'SYSTEM',
        changedByAdminName: 'Applicant Self-Service',
        note: 'Application submitted',
        timestamp: now
      });

      // Dispatch Confirmation Email (asynchronously resilient)
      EmailService.sendApplicationReceived(applicationRecord);

      return {
        applicationId: applicationId,
        trackingToken: trackingToken,
        fullName: applicationRecord.fullName,
        studentId: applicationRecord.studentId,
        status: 'Pending',
        createdAt: now
      };
    } finally {
      lock.releaseLock();
    }
  },

  /**
   * Tracks an application securely without revealing internal administrative notes
   */
  track: function(applicationId, trackingToken) {
    if (!applicationId || !trackingToken) {
      throw new Error('Application ID and Tracking Token are required.');
    }

    const app = Database.findOne(TABLES.REGISTRATIONS, 'applicationId', applicationId.trim());
    if (!app) {
      throw new Error('Application not found. Please verify your Application ID.');
    }

    if (app.trackingToken !== trackingToken.trim()) {
      throw new Error('Invalid tracking token for this Application ID.');
    }

    // Retrieve public status history
    const history = Database.find(TABLES.STATUS_HISTORY, 'applicationId', applicationId.trim());
    const publicHistory = history.map(h => ({
      status: h.newStatus,
      timestamp: h.timestamp,
      publicNote: h.newStatus === 'Under Review' ? 'Your application is currently being evaluated by the committee.' :
                  h.newStatus === 'Approved' ? 'Application approved! Please check your email for portal activation details.' :
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
      history: publicHistory
    };
  },

  /**
   * Lists all applications for administrators
   */
  list: function(adminUser, filters = {}) {
    Auth.requireRole(adminUser, [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.REVIEWER, ROLES.VIEWER]);

    let apps = Database.getAll(TABLES.REGISTRATIONS);

    // Apply Filters
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
      const q = String(filters.search).toLowerCase();
      apps = apps.filter(a =>
        String(a.fullName).toLowerCase().includes(q) ||
        String(a.studentId).toLowerCase().includes(q) ||
        String(a.universityEmail).toLowerCase().includes(q) ||
        String(a.applicationId).toLowerCase().includes(q) ||
        String(a.codeforcesUsername).toLowerCase().includes(q)
      );
    }

    // Sort by createdAt descending
    apps.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return apps;
  },

  /**
   * Updates application status with concurrency protection and approval workflow
   */
  updateStatus: function(adminUser, applicationId, newStatus, note = '', reviewerName = '') {
    // Permission guard
    if (['Approved', 'Rejected', 'Waitlisted'].includes(newStatus)) {
      Auth.requireRole(adminUser, [ROLES.SUPER_ADMIN, ROLES.ADMIN]);
    } else {
      Auth.requireRole(adminUser, [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.REVIEWER]);
    }

    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(15000);

      const app = Database.findOne(TABLES.REGISTRATIONS, 'applicationId', applicationId);
      if (!app) throw new Error(`Application ${applicationId} not found.`);

      const oldStatus = app.status;

      // Prevent duplicate approval / rejection
      if (oldStatus === newStatus) {
        throw new Error(`Application is already in status "${newStatus}".`);
      }

      const now = new Date().toISOString();
      const updates = {
        status: newStatus,
        updatedAt: now,
        assignedReviewer: reviewerName || adminUser.fullName
      };

      if (note) {
        updates.internalNotes = (app.internalNotes ? app.internalNotes + '\n' : '') +
          `[${now} by ${adminUser.fullName}]: ${note}`;
      }

      // Update registration row
      Database.update(TABLES.REGISTRATIONS, 'applicationId', applicationId, updates);

      // Record in StatusHistory
      Database.insert(TABLES.STATUS_HISTORY, {
        historyId: Utils.generateUUID(),
        applicationId: applicationId,
        previousStatus: oldStatus,
        newStatus: newStatus,
        changedByAdminId: adminUser.adminId,
        changedByAdminName: adminUser.fullName,
        note: note || `Status changed from ${oldStatus} to ${newStatus}`,
        timestamp: now
      });

      // Record in AdminActivityLogs
      Database.insert(TABLES.ADMIN_ACTIVITY_LOGS, {
        logId: Utils.generateUUID(),
        adminId: adminUser.adminId,
        adminName: adminUser.fullName,
        actionType: 'STATUS_UPDATE',
        targetEntity: 'Application',
        targetId: applicationId,
        details: `Updated status to ${newStatus}. Note: ${note}`,
        timestamp: now
      });

      // Handle Workflow Specific Actions
      if (newStatus === 'Approved') {
        // Create or activate member record
        Members.promoteApplicantToMember(app);
        // Send acceptance email
        EmailService.sendApplicationApproved(app);
      } else if (newStatus === 'Rejected') {
        EmailService.sendApplicationRejected(app, note);
      } else if (newStatus === 'Waitlisted') {
        EmailService.sendApplicationWaitlisted(app);
      } else {
        EmailService.sendStatusUpdated(app, newStatus, note);
      }

      return {
        success: true,
        applicationId: applicationId,
        oldStatus: oldStatus,
        newStatus: newStatus,
        updatedAt: now
      };
    } finally {
      lock.releaseLock();
    }
  }
};

