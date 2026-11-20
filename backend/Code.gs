/**
 * HTI ICPC Community Platform - Main Application Router & Entry Point
 * Backend: Google Apps Script Web App
 */

/**
 * Handles HTTP GET requests
 */
function doGet(e) {
  try {
    const params = (e && e.parameter) ? e.parameter : {};
    const action = params.action || 'ping';

    // Health check
    if (action === 'ping') {
      return Utils.successResponse({
        name: 'HTI ICPC Community API',
        version: '1.0.0',
        status: 'OPERATIONAL',
        timestamp: new Date().toISOString()
      }, 'API is live');
    }

    // Public Application Tracking
    if (action === 'track') {
      const { applicationId, trackingToken } = params;
      const result = Applications.track(applicationId, trackingToken);
      return Utils.successResponse(result, 'Application tracking details retrieved');
    }

    // Public community activities, announcements & upcoming events
    if (action === 'public_data') {
      const announcements = EventsService.listAnnouncements(true);
      const events = EventsService.listEvents().filter(ev => ev.status !== 'Past');
      const trainings = EventsService.listTrainings().filter(t => t.status === 'Upcoming');
      const apps = Database.getAll(TABLES.REGISTRATIONS);
      const members = Database.getAll(TABLES.MEMBERS);

      const stats = {
        totalRegistrations: apps.length,
        totalActiveMembers: members.filter(m => m.memberStatus === 'Active').length,
        trainingSessionsCount: trainings.length,
        eventsCount: events.length
      };

      return Utils.successResponse({
        announcements: announcements.slice(0, 5),
        events: events.slice(0, 5),
        trainings: trainings.slice(0, 5),
        stats: stats
      });
    }

    // Authenticated: Admin Dashboard Overview & Charts
    if (action === 'get_stats') {
      const admin = Auth.validateAdminSession(params.token);
      const apps = Database.getAll(TABLES.REGISTRATIONS);
      const members = Database.getAll(TABLES.MEMBERS);
      const admins = Database.getAll(TABLES.ADMINS);

      const statusCounts = {
        Pending: 0,
        'Under Review': 0,
        Approved: 0,
        Rejected: 0,
        Waitlisted: 0
      };

      const academicYearCounts = {};
      const departmentCounts = {};
      const monthlyCounts = {};

      apps.forEach(a => {
        // Status distribution
        if (statusCounts[a.status] !== undefined) statusCounts[a.status]++;
        
        // Year distribution
        const yr = a.academicYear || 'Unknown';
        academicYearCounts[yr] = (academicYearCounts[yr] || 0) + 1;

        // Department distribution
        const dept = a.department || 'Unknown';
        departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;

        // Monthly applications
        if (a.createdAt) {
          const monthKey = a.createdAt.substring(0, 7); // YYYY-MM
          monthlyCounts[monthKey] = (monthlyCounts[monthKey] || 0) + 1;
        }
      });

      const recentActivity = Database.getAll(TABLES.ADMIN_ACTIVITY_LOGS)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 10);

      return Utils.successResponse({
        totalApplications: apps.length,
        statusCounts: statusCounts,
        academicYearCounts: academicYearCounts,
        departmentCounts: departmentCounts,
        monthlyCounts: monthlyCounts,
        totalActiveMembers: members.filter(m => m.memberStatus === 'Active').length,
        totalAdmins: admins.filter(a => a.status === 'Active').length,
        recentActivity: recentActivity
      });
    }

    // Authenticated: List Applications (Admin/Reviewer)
    if (action === 'list_applications') {
      const admin = Auth.validateAdminSession(params.token);
      const filters = {
        status: params.status,
        department: params.department,
        academicYear: params.academicYear,
        search: params.search
      };
      const apps = Applications.list(admin, filters);
      return Utils.successResponse(apps);
    }

    // Authenticated: List Members
    if (action === 'list_members') {
      const admin = Auth.validateAdminSession(params.token);
      const filters = {
        status: params.status,
        department: params.department,
        academicYear: params.academicYear,
        level: params.level,
        search: params.search
      };
      const members = Members.list(admin, filters);
      return Utils.successResponse(members);
    }

    // Authenticated: Super Admin List Admins
    if (action === 'list_admins') {
      const admin = Auth.validateAdminSession(params.token);
      Auth.requireRole(admin, [ROLES.SUPER_ADMIN]);
      const admins = Database.getAll(TABLES.ADMINS).map(a => ({
        adminId: a.adminId,
        fullName: a.fullName,
        email: a.email,
        role: a.role,
        status: a.status,
        createdAt: a.createdAt,
        lastLogin: a.lastLogin
      }));
      return Utils.successResponse(admins);
    }

    // Authenticated: Super Admin List Audit Logs
    if (action === 'list_logs') {
      const admin = Auth.validateAdminSession(params.token);
      Auth.requireRole(admin, [ROLES.SUPER_ADMIN]);
      const logs = Database.getAll(TABLES.ADMIN_ACTIVITY_LOGS)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 100);
      return Utils.successResponse(logs);
    }

    // Authenticated: Student Member Portal Dashboard
    if (action === 'member_portal') {
      const member = Auth.validateMemberSession(params.token);
      const portalData = Members.getPortalDashboard(member);
      return Utils.successResponse(portalData);
    }

    // Authenticated: Admin Self Profile
    if (action === 'admin_profile') {
      const admin = Auth.validateAdminSession(params.token);
      return Utils.successResponse(admin);
    }

    return Utils.errorResponse(`Unknown action: ${action}`, 404);
  } catch (err) {
    return Utils.errorResponse(err.message, 500);
  }
}

/**
 * Handles HTTP POST requests
 */
function doPost(e) {
  try {
    let payload = {};
    if (e && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        payload = e.parameter || {};
      }
    } else if (e && e.parameter) {
      payload = e.parameter;
    }

    const action = payload.action;

    // 1. Student Application Submission (Public)
    if (action === 'apply') {
      const result = Applications.submit(payload);
      return Utils.successResponse(result, 'Your application has been submitted successfully!');
    }

    // 2. Admin Login
    if (action === 'admin_login') {
      const result = Auth.loginAdmin(payload.email, payload.password);
      return Utils.successResponse(result, 'Admin login successful');
    }

    // 3. Member Login (Student Portal) — Email + Student ID as password
    if (action === 'member_login') {
      const emailInput = payload.email || payload.identifier;
      const studentIdInput = payload.studentId || payload.password;
      const result = Auth.loginMember(emailInput, studentIdInput);
      return Utils.successResponse(result, 'Member login successful');
    }

    // 4. Update Application Status (Approve / Reject / Waitlist / Under Review)
    if (action === 'update_status') {
      const admin = Auth.validateAdminSession(payload.token);
      const result = Applications.updateStatus(
        admin,
        payload.applicationId,
        payload.status,
        payload.note || '',
        payload.reviewerName || ''
      );
      return Utils.successResponse(result, `Application status updated to ${payload.status}`);
    }

    // 5. Update Member Status
    if (action === 'update_member') {
      const admin = Auth.validateAdminSession(payload.token);
      const result = Members.updateStatus(
        admin,
        payload.memberId,
        payload.memberStatus,
        payload.assignedLevel || null
      );
      return Utils.successResponse(result, 'Member record updated');
    }

    // 6. Manage Admins (Super Admin only)
    if (action === 'create_admin') {
      const admin = Auth.validateAdminSession(payload.token);
      Auth.requireRole(admin, [ROLES.SUPER_ADMIN]);

      if (!payload.email || !payload.password || !payload.fullName || !payload.role) {
        throw new Error('All admin fields (fullName, email, password, role) are required.');
      }

      const existing = Database.findOne(TABLES.ADMINS, 'email', payload.email.toLowerCase().trim());
      if (existing) throw new Error('An administrator with this email already exists.');

      const salt = Utils.generateSecureToken(16);
      const passwordHash = Utils.hashPassword(payload.password, salt);
      const newAdmin = {
        adminId: Utils.generatePrefixedId('ADM'),
        fullName: Utils.sanitize(payload.fullName),
        email: payload.email.toLowerCase().trim(),
        passwordHash: passwordHash,
        salt: salt,
        role: payload.role,
        status: 'Active',
        createdAt: new Date().toISOString(),
        lastLogin: ''
      };
      Database.insert(TABLES.ADMINS, newAdmin);

      Database.insert(TABLES.ADMIN_ACTIVITY_LOGS, {
        logId: Utils.generateUUID(),
        adminId: admin.adminId,
        adminName: admin.fullName,
        actionType: 'CREATE_ADMIN',
        targetEntity: 'Admin',
        targetId: newAdmin.adminId,
        details: `Created new ${newAdmin.role}: ${newAdmin.fullName} (${newAdmin.email})`,
        timestamp: new Date().toISOString()
      });

      return Utils.successResponse({ adminId: newAdmin.adminId, email: newAdmin.email }, 'Admin created successfully');
    }

    // 7. Toggle Admin Status or Role (Super Admin only)
    if (action === 'update_admin') {
      const admin = Auth.validateAdminSession(payload.token);
      Auth.requireRole(admin, [ROLES.SUPER_ADMIN]);

      if (payload.adminId === admin.adminId && payload.status === 'Inactive') {
        throw new Error('You cannot deactivate your own account.');
      }

      const updates = {};
      if (payload.status) updates.status = payload.status;
      if (payload.role) updates.role = payload.role;

      Database.update(TABLES.ADMINS, 'adminId', payload.adminId, updates);

      Database.insert(TABLES.ADMIN_ACTIVITY_LOGS, {
        logId: Utils.generateUUID(),
        adminId: admin.adminId,
        adminName: admin.fullName,
        actionType: 'UPDATE_ADMIN',
        targetEntity: 'Admin',
        targetId: payload.adminId,
        details: `Updated admin attributes: ${JSON.stringify(updates)}`,
        timestamp: new Date().toISOString()
      });

      return Utils.successResponse({ adminId: payload.adminId }, 'Admin updated');
    }

    // 7b. Delete Admin Account (Super Admin only)
    if (action === 'delete_admin') {
      const admin = Auth.validateAdminSession(payload.token);
      Auth.requireRole(admin, [ROLES.SUPER_ADMIN]);

      if (!payload.adminId) throw new Error('adminId is required');
      if (payload.adminId === admin.adminId) {
        throw new Error('You cannot delete your own admin account.');
      }

      const success = Database.delete(TABLES.ADMINS, 'adminId', payload.adminId);
      if (!success) throw new Error('Admin not found or could not be deleted.');

      Database.insert(TABLES.ADMIN_ACTIVITY_LOGS, {
        logId: Utils.generateUUID(),
        adminId: admin.adminId,
        adminName: admin.fullName,
        actionType: 'DELETE_ADMIN',
        targetEntity: 'Admin',
        targetId: payload.adminId,
        details: `Deleted admin account ${payload.adminId}`,
        timestamp: new Date().toISOString()
      });

      return Utils.successResponse({ adminId: payload.adminId }, 'Admin account deleted successfully');
    }

    // 7c. Delete Member Account (Super Admin only)
    if (action === 'delete_member') {
      const admin = Auth.validateAdminSession(payload.token);
      Auth.requireRole(admin, [ROLES.SUPER_ADMIN]);

      if (!payload.memberId) throw new Error('memberId is required');

      const success = Database.delete(TABLES.MEMBERS, 'memberId', payload.memberId);
      if (!success) throw new Error('Member not found or could not be deleted.');

      Database.insert(TABLES.ADMIN_ACTIVITY_LOGS, {
        logId: Utils.generateUUID(),
        adminId: admin.adminId,
        adminName: admin.fullName,
        actionType: 'DELETE_MEMBER',
        targetEntity: 'Member',
        targetId: payload.memberId,
        details: `Deleted member account ${payload.memberId}`,
        timestamp: new Date().toISOString()
      });

      return Utils.successResponse({ memberId: payload.memberId }, 'Member account deleted successfully');
    }

    // 7d. Clear Audit Activity Logs (Super Admin only - Fresh Launch)
    if (action === 'clear_logs') {
      const admin = Auth.validateAdminSession(payload.token);
      Auth.requireRole(admin, [ROLES.SUPER_ADMIN]);

      const ss = Database.getSpreadsheet();
      const sheet = ss.getSheetByName(TABLES.ADMIN_ACTIVITY_LOGS);
      if (sheet && sheet.getLastRow() > 1) {
        sheet.deleteRows(2, sheet.getLastRow() - 1);
      }

      Database.insert(TABLES.ADMIN_ACTIVITY_LOGS, {
        logId: Utils.generateUUID(),
        adminId: admin.adminId,
        adminName: admin.fullName,
        actionType: 'SYSTEM_RESET',
        targetEntity: 'AuditLogs',
        targetId: 'SYSTEM',
        details: 'Audit logs cleared by Super Admin for fresh launch',
        timestamp: new Date().toISOString()
      });

      return Utils.successResponse({}, 'Audit logs cleared successfully');
    }

    // 8. Event Management
    if (action === 'create_event') {
      const admin = Auth.validateAdminSession(payload.token);
      const res = EventsService.createEvent(admin, payload);
      return Utils.successResponse(res, 'Event created successfully');
    }

    if (action === 'update_event') {
      const admin = Auth.validateAdminSession(payload.token);
      const res = EventsService.updateEvent(admin, payload.eventId, payload);
      return Utils.successResponse(res, 'Event updated successfully');
    }

    if (action === 'delete_event') {
      const admin = Auth.validateAdminSession(payload.token);
      const res = EventsService.deleteEvent(admin, payload.eventId);
      return Utils.successResponse(res, 'Event deleted successfully');
    }

    if (action === 'complete_event') {
      const admin = Auth.validateAdminSession(payload.token);
      const res = EventsService.updateEvent(admin, payload.eventId, { status: 'Past' });
      return Utils.successResponse(res, 'Event marked as past successfully');
    }

    // 9. Training Management
    if (action === 'create_training') {
      const admin = Auth.validateAdminSession(payload.token);
      const res = EventsService.createTraining(admin, payload);
      return Utils.successResponse(res, 'Training session created successfully');
    }

    if (action === 'update_training') {
      const admin = Auth.validateAdminSession(payload.token);
      const res = EventsService.updateTraining(admin, payload.sessionId, payload);
      return Utils.successResponse(res, 'Training session updated successfully');
    }

    if (action === 'delete_training') {
      const admin = Auth.validateAdminSession(payload.token);
      const res = EventsService.deleteTraining(admin, payload.sessionId);
      return Utils.successResponse(res, 'Training session deleted successfully');
    }

    if (action === 'complete_training') {
      const admin = Auth.validateAdminSession(payload.token);
      const res = EventsService.updateTraining(admin, payload.sessionId, { status: 'Completed' });
      return Utils.successResponse(res, 'Training session marked as completed successfully');
    }

    if (action === 'admin_events_trainings') {
      const admin = Auth.validateAdminSession(payload.token);
      return Utils.successResponse({
        trainings: EventsService.listTrainings(),
        events: EventsService.listEvents(),
        announcements: EventsService.listAnnouncements(false)
      }, 'Events, trainings and announcements retrieved successfully');
    }

    // 10. Announcement Management
    if (action === 'create_announcement') {
      const admin = Auth.validateAdminSession(payload.token);
      const res = EventsService.createAnnouncement(admin, payload);
      return Utils.successResponse(res, 'Announcement created successfully');
    }

    if (action === 'update_announcement') {
      const admin = Auth.validateAdminSession(payload.token);
      const res = EventsService.updateAnnouncement(admin, payload.announcementId, payload);
      return Utils.successResponse(res, 'Announcement updated successfully');
    }

    if (action === 'delete_announcement') {
      const admin = Auth.validateAdminSession(payload.token);
      const res = EventsService.deleteAnnouncement(admin, payload.announcementId);
      return Utils.successResponse(res, 'Announcement deleted successfully');
    }

    // 11. Student Member Self Profile Update
    if (action === 'update_profile') {
      const member = Auth.validateMemberSession(payload.token);
      const res = Members.updateProfile(member, payload);
      return Utils.successResponse(res, 'تم تحديث الملف الشخصي بنجاح');
    }

    // 12. Admin Self Profile Update
    if (action === 'update_admin_profile') {
      const admin = Auth.validateAdminSession(payload.token);
      const res = Auth.updateAdminProfile(admin, payload);
      return Utils.successResponse(res, 'تم تحديث الملف الشخصي للأدمن بنجاح');
    }

    // 13. Update Member Phase & Qualification Status
    if (action === 'update_phase') {
      const admin = Auth.validateAdminSession(payload.token);
      const res = Members.updateMemberPhase(admin, payload.memberId || payload.studentId, payload);
      return Utils.successResponse(res, 'تم تحديث مرحلة وتصفية العضو بنجاح');
    }

    // 14. Bulk Update Member Phase
    if (action === 'bulk_update_phase') {
      const admin = Auth.validateAdminSession(payload.token);
      const res = Members.bulkUpdateMemberPhase(admin, payload.memberIds, payload);
      return Utils.successResponse(res, 'تم تحديث مرحلة الأعضاء المحددين بنجاح');
    }

    return Utils.errorResponse(`Unknown POST action: ${action}`, 404);
  } catch (err) {
    return Utils.errorResponse(err.message, 500);
  }
}

/**
 * Direct Setup Script for Google Apps Script Editor
 * Run this function once in the Apps Script IDE to initialize all 11 sheets and seed the Super Admin account!
 */
function setupInitialDatabase() {
  Database.initDatabase();
  const res = Auth.ensureSuperAdmin('admin@hti.edu.eg', 'ACPC_HTI_BNS', 'HTI ICPC Super Admin');
  Logger.log('HTI ICPC Platform Initialized: ' + JSON.stringify(res));
  return 'SUCCESS';
}

/**
 * دالة إنشاء حساب أدمن خاص بك بكلمة المرور والإيميل الخاص بك
 * يمكنك تغيير الإيميل والباسورد والاسم بالأسفل ثم اختيار الدالة وتشغيلها من Apps Script
 */
function createMySuperAdmin() {
  const email = "admin@hti.edu.eg";       // الإيميل المطلوب
  const password = "ACPC_HTI_BNS";        // كلمة المرور المطلوبة
  const fullName = "HTI ICPC Super Admin"; // اسم الأدمن الرئيسي

  const salt = Utils.generateSecureToken(16);
  const passwordHash = Utils.hashPassword(password, salt);
  const adminId = Utils.generatePrefixedId('ADM');

  const newAdmin = {
    adminId: adminId,
    fullName: fullName,
    email: email.toLowerCase().trim(),
    passwordHash: passwordHash,
    salt: salt,
    role: ROLES.SUPER_ADMIN,
    status: 'Active',
    createdAt: new Date().toISOString(),
    lastLogin: ''
  };

  Database.insert(TABLES.ADMINS, newAdmin);
  Logger.log('تم إنشاء الأدمن بنجاح: ' + email + ' برقم: ' + adminId);
  return 'SUCCESS: Created Admin for ' + email;
}

/**
 * دالة تفريغ سجل العمليات والأمان بالكامل للبدء من الصفر
 * يمكنك اختيارها وتشغيلها من محرر Apps Script مباشرة
 */
function clearAllAuditLogs() {
  const ss = Database.getSpreadsheet();
  const sheet = ss.getSheetByName(TABLES.ADMIN_ACTIVITY_LOGS);
  if (sheet && sheet.getLastRow() > 1) {
    sheet.deleteRows(2, sheet.getLastRow() - 1);
  }
  Logger.log('تم تفريغ سجل العمليات AdminActivityLogs بنجاح والبدء من الصفر.');
  return 'SUCCESS: Audit logs cleared';
}

