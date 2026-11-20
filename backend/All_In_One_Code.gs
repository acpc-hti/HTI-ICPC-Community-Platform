// HTI ICPC Platform - All-In-One Apps Script Bundle
// Generated at: 2026-11-14T21:59:39.579Z

// ==========================================================================
// FILE: Database.gs
// ==========================================================================

/**
 * HTI ICPC Community Platform - Database Management
 * Backend: Google Apps Script & Google Sheets
 */

const TABLES = {
  REGISTRATIONS: 'Registrations',
  MEMBERS: 'Members',
  ADMINS: 'Admins',
  ACCESS_TOKENS: 'AccessTokens',
  STATUS_HISTORY: 'StatusHistory',
  ADMIN_ACTIVITY_LOGS: 'AdminActivityLogs',
  EMAIL_LOGS: 'EmailLogs',
  ANNOUNCEMENTS: 'Announcements',
  TRAINING_SESSIONS: 'TrainingSessions',
  EVENTS: 'Events',
  SETTINGS: 'Settings'
};

const SCHEMAS = {
  [TABLES.REGISTRATIONS]: [
    'applicationId', 'trackingToken', 'fullName', 'universityEmail', 'personalEmail',
    'phoneNumber', 'studentId', 'department', 'academicYear', 'programmingExperience',
    'programmingLanguages', 'previousContestExperience', 'codeforcesUsername', 'leetcodeProfile',
    'githubProfile', 'whyJoin', 'goals', 'expectations', 'regularAttendanceCommitment',
    'status', 'internalNotes', 'assignedReviewer', 'createdAt', 'updatedAt'
  ],
  [TABLES.MEMBERS]: [
    'memberId', 'applicationId', 'studentId', 'fullName', 'universityEmail',
    'personalEmail', 'phoneNumber', 'department', 'academicYear', 'codeforcesHandle',
    'memberStatus', 'joinedDate', 'lastActive', 'discordUsername', 'assignedLevel',
    'currentPhase', 'phaseStatus', 'phaseScore', 'phaseNotes'
  ],
  [TABLES.ADMINS]: [
    'adminId', 'fullName', 'email', 'passwordHash', 'salt', 'role', 'status',
    'createdAt', 'lastLogin', 'phoneNumber', 'title', 'codeforcesHandle', 'githubProfile', 'discordUsername'
  ],
  [TABLES.ACCESS_TOKENS]: [
    'tokenId', 'token', 'userId', 'userType', 'role', 'expiresAt', 'createdAt'
  ],
  [TABLES.STATUS_HISTORY]: [
    'historyId', 'applicationId', 'previousStatus', 'newStatus', 'changedByAdminId',
    'changedByAdminName', 'note', 'timestamp'
  ],
  [TABLES.ADMIN_ACTIVITY_LOGS]: [
    'logId', 'adminId', 'adminName', 'actionType', 'targetEntity', 'targetId',
    'details', 'timestamp'
  ],
  [TABLES.EMAIL_LOGS]: [
    'emailLogId', 'recipientEmail', 'recipientName', 'templateType', 'subject',
    'status', 'errorMessage', 'timestamp'
  ],
  [TABLES.ANNOUNCEMENTS]: [
    'announcementId', 'title', 'content', 'category', 'targetAudience',
    'publishedBy', 'publishedAt', 'isActive'
  ],
  [TABLES.TRAINING_SESSIONS]: [
    'sessionId', 'title', 'level', 'instructor', 'dateTime', 'location',
    'description', 'materialsUrl', 'status'
  ],
  [TABLES.EVENTS]: [
    'eventId', 'title', 'type', 'startDate', 'endDate', 'location',
    'registrationLink', 'description', 'status'
  ],
  [TABLES.SETTINGS]: [
    'key', 'value', 'description', 'updatedAt'
  ]
};

const Database = {
  /**
   * Returns active spreadsheet. Uses bound sheet or ID from script properties.
   */
  getSpreadsheet: function() {
    const props = PropertiesService.getScriptProperties();
    const sheetId = props.getProperty('SPREADSHEET_ID');
    if (sheetId) {
      return SpreadsheetApp.openById(sheetId);
    }
    return SpreadsheetApp.getActiveSpreadsheet();
  },

  /**
   * Initializes all 11 sheets without destroying existing data.
   */
  initDatabase: function() {
    const ss = this.getSpreadsheet();
    if (!ss) {
      throw new Error('Spreadsheet not found or not bound to script.');
    }

    Object.keys(SCHEMAS).forEach(tableName => {
      let sheet = ss.getSheetByName(tableName);
      if (!sheet) {
        sheet = ss.insertSheet(tableName);
      }
      
      const expectedHeaders = SCHEMAS[tableName];
      const lastRow = sheet.getLastRow();
      const lastCol = sheet.getLastColumn();

      if (lastRow === 0 || lastCol === 0) {
        // Empty sheet, write headers
        sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
        sheet.getRange(1, 1, 1, expectedHeaders.length).setFontWeight('bold').setBackground('#1E293B').setFontColor('#F8FAFC');
        sheet.setFrozenRows(1);
      } else {
        // Verify or preserve existing headers
        const existingHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
        const missing = expectedHeaders.filter(h => !existingHeaders.includes(h));
        if (missing.length > 0) {
          // Append missing columns safely
          sheet.getRange(1, lastCol + 1, 1, missing.length).setValues([missing]);
        }
      }
    });

    // Populate Default Settings if empty
    this.ensureDefaultSettings();

    return { status: 'Database initialized successfully' };
  },

  /**
   * Seeds default settings
   */
  ensureDefaultSettings: function() {
    const settings = this.getAll(TABLES.SETTINGS);
    const defaultSettings = [
      { key: 'COMMUNITY_NAME', value: 'HTI ICPC Community', description: 'Official Community Name', updatedAt: new Date().toISOString() },
      { key: 'REGISTRATION_OPEN', value: 'TRUE', description: 'Enable/Disable Student Registration', updatedAt: new Date().toISOString() },
      { key: 'ACADEMIC_YEAR_CURRENT', value: '2026/2027', description: 'Current Academic Season', updatedAt: new Date().toISOString() },
      { key: 'COMMUNITY_WHATSAPP_LINK', value: 'https://chat.whatsapp.com/HTI-ICPC-Community', description: 'Accepted Member WhatsApp Group', updatedAt: new Date().toISOString() },
      { key: 'COMMUNITY_DISCORD_LINK', value: 'https://discord.gg/hti-icpc', description: 'Official Discord Server', updatedAt: new Date().toISOString() }
    ];

    defaultSettings.forEach(s => {
      const exists = settings.some(row => row.key === s.key);
      if (!exists) {
        this.insert(TABLES.SETTINGS, s);
      }
    });
  },

  /**
   * Retrieves all rows from a sheet as an array of objects
   */
  getAll: function(tableName) {
    const ss = this.getSpreadsheet();
    const sheet = ss.getSheetByName(tableName);
    if (!sheet) return [];

    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    if (lastRow <= 1 || lastCol === 0) return [];

    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    const rawData = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

    return rawData.map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index];
      });
      return obj;
    });
  },

  /**
   * Finds rows matching a key-value condition
   */
  find: function(tableName, key, value) {
    const all = this.getAll(tableName);
    return all.filter(item => String(item[key]) === String(value));
  },

  /**
   * Finds single row matching key-value condition
   */
  findOne: function(tableName, key, value) {
    const all = this.getAll(tableName);
    return all.find(item => String(item[key]) === String(value)) || null;
  },

  /**
   * Inserts an object into a sheet conforming to its schema
   */
  insert: function(tableName, data) {
    const ss = this.getSpreadsheet();
    const sheet = ss.getSheetByName(tableName);
    if (!sheet) throw new Error(`Sheet ${tableName} does not exist.`);

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const rowValues = headers.map(header => {
      let val = data[header];
      if (val === undefined || val === null) val = '';
      if (typeof val === 'object' && !(val instanceof Date)) val = JSON.stringify(val);
      return val;
    });

    sheet.appendRow(rowValues);
    return data;
  },

  /**
   * Updates a single row identified by idKey = idValue
   */
  update: function(tableName, idKey, idValue, updates) {
    const ss = this.getSpreadsheet();
    const sheet = ss.getSheetByName(tableName);
    if (!sheet) throw new Error(`Sheet ${tableName} does not exist.`);

    const lastRow = sheet.getLastRow();
    let lastCol = sheet.getLastColumn();
    if (lastRow <= 1) return null;

    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    const keyColIndex = headers.indexOf(idKey);
    if (keyColIndex === -1) throw new Error(`Primary key ${idKey} not found in headers.`);

    const keyValues = sheet.getRange(2, keyColIndex + 1, lastRow - 1, 1).getValues();
    let targetRowIndex = -1;

    for (let i = 0; i < keyValues.length; i++) {
      if (String(keyValues[i][0]) === String(idValue)) {
        targetRowIndex = i + 2; // Convert to 1-based sheet row index
        break;
      }
    }

    if (targetRowIndex === -1) return null;

    // Apply updates (dynamically appends column if not yet present in sheet)
    Object.keys(updates).forEach(colName => {
      let colIdx = headers.indexOf(colName);
      if (colIdx === -1) {
        lastCol++;
        sheet.getRange(1, lastCol).setValue(colName);
        headers.push(colName);
        colIdx = headers.length - 1;
      }
      let val = updates[colName];
      if (typeof val === 'object' && !(val instanceof Date)) val = JSON.stringify(val);
      sheet.getRange(targetRowIndex, colIdx + 1).setValue(val);
    });

    return { ...this.findOne(tableName, idKey, idValue), ...updates };
  },

  /**
   * Deletes a row by ID
   */
  delete: function(tableName, idKey, idValue) {
    const ss = this.getSpreadsheet();
    const sheet = ss.getSheetByName(tableName);
    if (!sheet) return false;

    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return false;

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const keyColIndex = headers.indexOf(idKey);
    if (keyColIndex === -1) return false;

    const keyValues = sheet.getRange(2, keyColIndex + 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < keyValues.length; i++) {
      if (String(keyValues[i][0]) === String(idValue)) {
        sheet.deleteRow(i + 2);
        return true;
      }
    }
    return false;
  }
};



// ==========================================================================
// FILE: Utils.gs
// ==========================================================================

/**
 * HTI ICPC Community Platform - Utilities & Helper Functions
 * Backend: Google Apps Script
 */

const Utils = {
  /**
   * Generates a cryptographically strong UUID
   */
  generateUUID: function() {
    return Utilities.getUuid();
  },

  /**
   * Generates a unique prefixed ID
   * e.g., APP-2026-A1B2C, MEM-2026-F9D2A
   */
  generatePrefixedId: function(prefix) {
    const year = new Date().getFullYear();
    const randomHex = Utilities.getUuid().substring(0, 5).toUpperCase();
    return `${prefix}-${year}-${randomHex}`;
  },

  /**
   * Generates a random secure alphanumeric token
   */
  generateSecureToken: function(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < length; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  },

  /**
   * Generates a SHA-256 salted hash
   */
  hashPassword: function(password, salt) {
    const combined = password + salt;
    const rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, combined, Utilities.Charset.UTF_8);
    let hashStr = '';
    for (let i = 0; i < rawHash.length; i++) {
      let byteValue = rawHash[i];
      if (byteValue < 0) byteValue += 256;
      let byteHex = byteValue.toString(16);
      if (byteHex.length == 1) byteHex = '0' + byteHex;
      hashStr += byteHex;
    }
    return hashStr;
  },

  /**
   * Sanitizes input to prevent XSS and formula injection
   */
  sanitize: function(input) {
    if (typeof input !== 'string') return input;
    // Prevent spreadsheet formula injection
    if (['=', '+', '-', '@'].includes(input.charAt(0))) {
      input = "'" + input;
    }
    return input.trim();
  },

  /**
   * Validates email format
   */
  isValidEmail: function(email) {
    if (!email || typeof email !== 'string') return false;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email.trim());
  },

  /**
   * Standard JSON Success Response
   */
  successResponse: function(data, message = 'Success') {
    const responsePayload = {
      success: true,
      message: message,
      data: data,
      timestamp: new Date().toISOString()
    };
    return ContentService.createTextOutput(JSON.stringify(responsePayload))
      .setMimeType(ContentService.MimeType.JSON);
  },

  /**
   * Standard JSON Error Response
   */
  errorResponse: function(message = 'An error occurred', statusCode = 400, details = null) {
    const responsePayload = {
      success: false,
      error: message,
      code: statusCode,
      details: details,
      timestamp: new Date().toISOString()
    };
    return ContentService.createTextOutput(JSON.stringify(responsePayload))
      .setMimeType(ContentService.MimeType.JSON);
  }
};



// ==========================================================================
// FILE: Auth.gs
// ==========================================================================

/**
 * HTI ICPC Community Platform - Authentication & Authorization
 * Backend: Google Apps Script
 */

const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  REVIEWER: 'REVIEWER',
  VIEWER: 'VIEWER'
};

const Auth = {
  /**
   * Creates initial Super Admin if no admins exist
   */
  ensureSuperAdmin: function(email, password, fullName = 'HTI ICPC Super Admin') {
    const existing = Database.getAll(TABLES.ADMINS);
    if (existing.length > 0) {
      // Find the super admin and update with new credentials if changed
      const superAdmin = existing.find(a => a.role === ROLES.SUPER_ADMIN) || existing[0];
      const salt = Utils.generateSecureToken(16);
      const passwordHash = Utils.hashPassword(password, salt);
      Database.update(TABLES.ADMINS, 'adminId', superAdmin.adminId, {
        fullName: fullName,
        email: email.toLowerCase().trim(),
        passwordHash: passwordHash,
        salt: salt,
        status: 'Active'
      });
      return { message: 'Super Admin updated successfully', email: email };
    }

    const salt = Utils.generateSecureToken(16);
    const passwordHash = Utils.hashPassword(password, salt);
    const admin = {
      adminId: 'ADM-001',
      fullName: fullName,
      email: email.toLowerCase().trim(),
      passwordHash: passwordHash,
      salt: salt,
      role: ROLES.SUPER_ADMIN,
      status: 'Active',
      createdAt: new Date().toISOString(),
      lastLogin: ''
    };

    Database.insert(TABLES.ADMINS, admin);
    return { message: 'Super Admin created successfully', email: admin.email };
  },

  /**
   * Authenticates an administrator
   */
  loginAdmin: function(email, password) {
    if (!email || !password) {
      throw new Error('Email and password are required.');
    }

    const cleanEmail = email.toLowerCase().trim();
    const admin = Database.findOne(TABLES.ADMINS, 'email', cleanEmail);

    if (!admin) {
      throw new Error('Invalid email or password.');
    }

    if (admin.status !== 'Active') {
      throw new Error('This account has been deactivated. Contact the Super Admin.');
    }

    const computedHash = Utils.hashPassword(password, admin.salt);
    if (computedHash !== admin.passwordHash) {
      throw new Error('Invalid email or password.');
    }

    // Generate secure session token
    const token = 'TKN-' + Utils.generateSecureToken(36);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    const tokenRecord = {
      tokenId: Utils.generateUUID(),
      token: token,
      userId: admin.adminId,
      userType: 'ADMIN',
      role: admin.role,
      expiresAt: expiresAt,
      createdAt: now.toISOString()
    };

    Database.insert(TABLES.ACCESS_TOKENS, tokenRecord);

    // Update lastLogin
    Database.update(TABLES.ADMINS, 'adminId', admin.adminId, {
      lastLogin: now.toISOString()
    });

    // Log Activity
    Database.insert(TABLES.ADMIN_ACTIVITY_LOGS, {
      logId: Utils.generateUUID(),
      adminId: admin.adminId,
      adminName: admin.fullName,
      actionType: 'LOGIN',
      targetEntity: 'Admin',
      targetId: admin.adminId,
      details: 'Administrator logged in successfully',
      timestamp: now.toISOString()
    });

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

  /**
   * Validates an Admin Session Token
   */
  validateAdminSession: function(token) {
    if (!token) throw new Error('Authentication token required.');

    const tokenRecord = Database.findOne(TABLES.ACCESS_TOKENS, 'token', token);
    if (!tokenRecord || tokenRecord.userType !== 'ADMIN') {
      throw new Error('Invalid or expired session.');
    }

    const now = new Date();
    const expiresAt = new Date(tokenRecord.expiresAt);
    if (now > expiresAt) {
      Database.delete(TABLES.ACCESS_TOKENS, 'token', token);
      throw new Error('Session has expired. Please log in again.');
    }

    const admin = Database.findOne(TABLES.ADMINS, 'adminId', tokenRecord.userId);
    if (!admin || admin.status !== 'Active') {
      throw new Error('Admin account is inactive or not found.');
    }

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

  /**
   * Updates an administrator's own profile and optionally their password
   */
  updateAdminProfile: function(admin, updates) {
    const adminRecord = Database.findOne(TABLES.ADMINS, 'adminId', admin.adminId);
    if (!adminRecord) throw new Error('Admin account not found.');

    const changes = {};

    if (updates.fullName && updates.fullName.trim()) {
      changes.fullName = Utils.sanitize(updates.fullName.trim());
    }

    if (updates.phoneNumber !== undefined) {
      changes.phoneNumber = Utils.sanitize(updates.phoneNumber.trim());
    }

    if (updates.title !== undefined) {
      changes.title = Utils.sanitize(updates.title.trim());
    }

    if (updates.codeforcesHandle !== undefined) {
      changes.codeforcesHandle = Utils.sanitize(updates.codeforcesHandle.trim());
    }

    if (updates.githubProfile !== undefined) {
      changes.githubProfile = Utils.sanitize(updates.githubProfile.trim());
    }

    if (updates.discordUsername !== undefined) {
      changes.discordUsername = Utils.sanitize(updates.discordUsername.trim());
    }

    // Optional email change
    if (updates.email && updates.email.trim().toLowerCase() !== adminRecord.email.toLowerCase()) {
      const cleanEmail = updates.email.trim().toLowerCase();
      const existing = Database.findOne(TABLES.ADMINS, 'email', cleanEmail);
      if (existing && existing.adminId !== admin.adminId) {
        throw new Error('This email is already in use by another administrator.');
      }
      changes.email = cleanEmail;
    }

    // Optional password change
    if (updates.newPassword && updates.newPassword.trim()) {
      const newPwd = updates.newPassword.trim();
      if (newPwd.length < 6) {
        throw new Error('New password must be at least 6 characters long.');
      }
      // If current password provided, verify it
      if (updates.currentPassword) {
        const curHash = Utils.hashPassword(updates.currentPassword, adminRecord.salt);
        if (curHash !== adminRecord.passwordHash) {
          throw new Error('Current password is incorrect.');
        }
      }
      const newSalt = Utils.generateSecureToken(16);
      changes.passwordHash = Utils.hashPassword(newPwd, newSalt);
      changes.salt = newSalt;
    }

    if (Object.keys(changes).length > 0) {
      Database.update(TABLES.ADMINS, 'adminId', admin.adminId, changes);

      // Activity log
      Database.insert(TABLES.ADMIN_ACTIVITY_LOGS, {
        logId: Utils.generateUUID(),
        adminId: admin.adminId,
        adminName: changes.fullName || admin.fullName,
        actionType: 'UPDATE_PROFILE',
        targetEntity: 'Admin',
        targetId: admin.adminId,
        details: `Administrator updated profile: ${Object.keys(changes).filter(k => k !== 'passwordHash' && k !== 'salt').join(', ')}`,
        timestamp: new Date().toISOString()
      });
    }

    const updated = Database.findOne(TABLES.ADMINS, 'adminId', admin.adminId);
    return {
      adminId: updated.adminId,
      fullName: updated.fullName,
      email: updated.email,
      role: updated.role,
      phoneNumber: updated.phoneNumber || '',
      title: updated.title || '',
      codeforcesHandle: updated.codeforcesHandle || '',
      githubProfile: updated.githubProfile || '',
      discordUsername: updated.discordUsername || '',
      createdAt: updated.createdAt || '',
      lastLogin: updated.lastLogin || ''
    };
  },

  /**
   * Role check guard
   */
  requireRole: function(admin, allowedRoles) {
    if (!allowedRoles.includes(admin.role)) {
      throw new Error(`Forbidden: You do not have permission to perform this action. Required: ${allowedRoles.join(' or ')}`);
    }
  },

  /**
   * Member/Student portal login via Email (university or personal) + Student ID as password
   */
  loginMember: function(email, studentId) {
    if (!email || !studentId) {
      throw new Error('يرجى إدخال البريد الإلكتروني ورقم الكارنيه.');
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanStudentId = String(studentId).trim();

    // Search in Registrations by universityEmail or personalEmail
    const allRegs = Database.getAll(TABLES.REGISTRATIONS);
    const reg = allRegs.find(r =>
      String(r.universityEmail || '').trim().toLowerCase() === cleanEmail ||
      String(r.personalEmail || '').trim().toLowerCase() === cleanEmail
    );

    if (!reg || String(reg.studentId || '').trim() !== cleanStudentId) {
      throw new Error('البريد الإلكتروني أو رقم الكارنيه غير صحيح. يرجى التأكد من البيانات المدخلة.');
    }

    // Check if official member record exists in Members table
    let member = Database.findOne(TABLES.MEMBERS, 'studentId', reg.studentId);
    if (!member) {
      member = {
        memberId: reg.applicationId,
        applicationId: reg.applicationId,
        studentId: reg.studentId,
        fullName: reg.fullName,
        universityEmail: reg.universityEmail,
        personalEmail: reg.personalEmail || '',
        phoneNumber: reg.phoneNumber,
        department: reg.department,
        academicYear: reg.academicYear,
        codeforcesHandle: reg.codeforcesUsername || '',
        status: reg.status,
        memberStatus: reg.status,
        assignedLevel: reg.programmingExperience === 'Advanced' ? 'Level 2' : reg.programmingExperience === 'Intermediate' ? 'Level 1' : 'Level 0',
        joinedDate: reg.createdAt,
        isApproved: (reg.status === 'Approved'),
        leetcodeProfile: reg.leetcodeProfile || '',
        githubProfile: reg.githubProfile || '',
        programmingLanguages: reg.programmingLanguages || '',
        discordUsername: reg.discordUsername || ''
      };
    } else {
      member.status = reg.status;
      member.isApproved = (reg.status === 'Approved');
      member.leetcodeProfile = member.leetcodeProfile || reg.leetcodeProfile || '';
      member.githubProfile = member.githubProfile || reg.githubProfile || '';
      member.programmingLanguages = member.programmingLanguages || reg.programmingLanguages || '';
      member.phoneNumber = member.phoneNumber || reg.phoneNumber || '';
    }

    // Generate member session token
    const token = 'MEM-TKN-' + Utils.generateSecureToken(36);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString(); // 48 hours

    Database.insert(TABLES.ACCESS_TOKENS, {
      tokenId: Utils.generateUUID(),
      token: token,
      userId: member.memberId || reg.studentId,
      userType: 'MEMBER',
      role: 'MEMBER',
      expiresAt: expiresAt,
      createdAt: now.toISOString()
    });

    if (member.memberId && member.memberId.startsWith('MEM-')) {
      try {
        Database.update(TABLES.MEMBERS, 'memberId', member.memberId, {
          lastActive: now.toISOString()
        });
      } catch (e) {}
    }

    return {
      token: token,
      member: member,
      status: reg.status,
      expiresAt: expiresAt
    };
  },

  /**
   * Validates a Member Session Token
   */
  validateMemberSession: function(token) {
    if (!token) throw new Error('Member token required.');

    const tokenRecord = Database.findOne(TABLES.ACCESS_TOKENS, 'token', token);
    if (!tokenRecord || tokenRecord.userType !== 'MEMBER') {
      throw new Error('Invalid or expired member session.');
    }

    if (new Date() > new Date(tokenRecord.expiresAt)) {
      Database.delete(TABLES.ACCESS_TOKENS, 'token', token);
      throw new Error('Member session has expired.');
    }

    let member = Database.findOne(TABLES.MEMBERS, 'memberId', tokenRecord.userId);
    if (!member) {
      const reg = Database.findOne(TABLES.REGISTRATIONS, 'studentId', tokenRecord.userId)
               || Database.findOne(TABLES.REGISTRATIONS, 'applicationId', tokenRecord.userId);
      if (reg) {
        return {
          memberId: reg.applicationId,
          applicationId: reg.applicationId,
          studentId: reg.studentId,
          fullName: reg.fullName,
          universityEmail: reg.universityEmail,
          personalEmail: reg.personalEmail || '',
          phoneNumber: reg.phoneNumber,
          department: reg.department,
          academicYear: reg.academicYear,
          codeforcesHandle: reg.codeforcesUsername || '',
          status: reg.status,
          memberStatus: reg.status,
          assignedLevel: reg.programmingExperience === 'Advanced' ? 'Level 2' : reg.programmingExperience === 'Intermediate' ? 'Level 1' : 'Level 0',
          joinedDate: reg.createdAt,
          isApproved: (reg.status === 'Approved'),
          leetcodeProfile: reg.leetcodeProfile || '',
          githubProfile: reg.githubProfile || '',
          programmingLanguages: reg.programmingLanguages || '',
          discordUsername: reg.discordUsername || ''
        };
      }
      throw new Error('Member account not found.');
    } else {
      const reg = Database.findOne(TABLES.REGISTRATIONS, 'studentId', member.studentId);
      if (reg) {
        member.leetcodeProfile = member.leetcodeProfile || reg.leetcodeProfile || '';
        member.githubProfile = member.githubProfile || reg.githubProfile || '';
        member.programmingLanguages = member.programmingLanguages || reg.programmingLanguages || '';
        member.phoneNumber = member.phoneNumber || reg.phoneNumber || '';
      }
    }

    return member;
  }
};



// ==========================================================================
// FILE: Applications.gs
// ==========================================================================

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



// ==========================================================================
// FILE: Members.gs
// ==========================================================================

/**
 * HTI ICPC Community Platform - Members Management & Student Portal Service
 * Backend: Google Apps Script
 */

const Members = {
  /**
   * Promotes an approved applicant to the Members table
   */
  promoteApplicantToMember: function(app) {
    const existing = Database.findOne(TABLES.MEMBERS, 'studentId', app.studentId);
    const now = new Date().toISOString();

    // Determine initial training level
    let assignedLevel = 'Level 0';
    if (app.programmingExperience === 'Intermediate') assignedLevel = 'Level 1';
    if (app.programmingExperience === 'Advanced') assignedLevel = 'Level 2';

    if (existing) {
      // Re-activate member if previously existed
      Database.update(TABLES.MEMBERS, 'memberId', existing.memberId, {
        memberStatus: 'Active',
        assignedLevel: assignedLevel,
        academicYear: app.academicYear,
        department: app.department,
        lastActive: now
      });
      return existing;
    }

    const memberId = Utils.generatePrefixedId('MEM');
    const memberRecord = {
      memberId: memberId,
      applicationId: app.applicationId,
      studentId: app.studentId,
      fullName: app.fullName,
      universityEmail: app.universityEmail,
      personalEmail: app.personalEmail || '',
      phoneNumber: app.phoneNumber,
      department: app.department,
      academicYear: app.academicYear,
      codeforcesHandle: app.codeforcesUsername || '',
      memberStatus: 'Active',
      joinedDate: now,
      lastActive: now,
      discordUsername: '',
      assignedLevel: assignedLevel,
      currentPhase: 'المرحلة 1',
      phaseStatus: 'ACTIVE',
      phaseScore: '',
      phaseNotes: ''
    };

    Database.insert(TABLES.MEMBERS, memberRecord);
    return memberRecord;
  },

  /**
   * Lists all members with filtering for Admins
   */
  list: function(adminUser, filters = {}) {
    Auth.requireRole(adminUser, [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.REVIEWER, ROLES.VIEWER]);

    let members = Database.getAll(TABLES.MEMBERS);

    if (filters.status && filters.status !== 'ALL') {
      members = members.filter(m => m.memberStatus === filters.status);
    }
    if (filters.department && filters.department !== 'ALL') {
      members = members.filter(m => m.department === filters.department);
    }
    if (filters.academicYear && filters.academicYear !== 'ALL') {
      members = members.filter(m => m.academicYear === filters.academicYear);
    }
    if (filters.level && filters.level !== 'ALL') {
      members = members.filter(m => m.assignedLevel === filters.level);
    }
    if (filters.search) {
      const q = String(filters.search).toLowerCase();
      members = members.filter(m =>
        String(m.fullName).toLowerCase().includes(q) ||
        String(m.studentId).toLowerCase().includes(q) ||
        String(m.codeforcesHandle).toLowerCase().includes(q) ||
        String(m.universityEmail).toLowerCase().includes(q)
      );
    }

    // Sort by joinedDate desc
    members.sort((a, b) => new Date(b.joinedDate) - new Date(a.joinedDate));
    return members;
  },

  /**
   * Updates member status (Active, Inactive, Alumni)
   */
  updateStatus: function(adminUser, memberId, newStatus, level = null) {
    Auth.requireRole(adminUser, [ROLES.SUPER_ADMIN, ROLES.ADMIN]);

    const member = Database.findOne(TABLES.MEMBERS, 'memberId', memberId);
    if (!member) throw new Error(`Member ${memberId} not found.`);

    const updates = { memberStatus: newStatus };
    if (level) updates.assignedLevel = level;

    Database.update(TABLES.MEMBERS, 'memberId', memberId, updates);

    Database.insert(TABLES.ADMIN_ACTIVITY_LOGS, {
      logId: Utils.generateUUID(),
      adminId: adminUser.adminId,
      adminName: adminUser.fullName,
      actionType: 'MEMBER_UPDATE',
      targetEntity: 'Member',
      targetId: memberId,
      details: `Updated member status to ${newStatus}${level ? ' level ' + level : ''}`,
      timestamp: new Date().toISOString()
    });

    return { success: true, memberId, newStatus };
  },

  /**
   * Retrieves all portal data for an authenticated active member or applicant
   */
  getPortalDashboard: function(member) {
    const reg = Database.findOne(TABLES.REGISTRATIONS, 'studentId', member.studentId)
             || (member.applicationId ? Database.findOne(TABLES.REGISTRATIONS, 'applicationId', member.applicationId) : null);

    if (reg) {
      member.phoneNumber = member.phoneNumber || reg.phoneNumber || '';
      member.codeforcesHandle = member.codeforcesHandle || reg.codeforcesUsername || '';
      member.leetcodeProfile = member.leetcodeProfile || reg.leetcodeProfile || '';
      member.githubProfile = member.githubProfile || reg.githubProfile || '';
      member.programmingLanguages = member.programmingLanguages || reg.programmingLanguages || '';
      member.discordUsername = member.discordUsername || reg.discordUsername || '';
      member.joinedDate = member.joinedDate || reg.createdAt;
      member.universityEmail = member.universityEmail || reg.universityEmail;
      member.currentPhase = member.currentPhase || reg.currentPhase || 'المرحلة 1';
      member.phaseStatus = member.phaseStatus || reg.phaseStatus || 'ACTIVE';
      member.phaseScore = member.phaseScore || reg.phaseScore || '';
      member.phaseNotes = member.phaseNotes || reg.phaseNotes || '';
    } else {
      member.currentPhase = member.currentPhase || 'المرحلة 1';
      member.phaseStatus = member.phaseStatus || 'ACTIVE';
      member.phaseScore = member.phaseScore || '';
      member.phaseNotes = member.phaseNotes || '';
    }

    const history = reg ? Database.find(TABLES.STATUS_HISTORY, 'applicationId', reg.applicationId) : [];

    const trainings = Database.getAll(TABLES.TRAINING_SESSIONS)
      .filter(t => t.status === 'Upcoming')
      .sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));

    const events = Database.getAll(TABLES.EVENTS)
      .filter(e => e.status !== 'Past')
      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

    const announcements = Database.getAll(TABLES.ANNOUNCEMENTS)
      .filter(a => a.isActive === true || a.isActive === 'TRUE')
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    const settings = Database.getAll(TABLES.SETTINGS);
    const getSetting = (k, def) => {
      const row = settings.find(s => s.key === k);
      return row ? row.value : def;
    };

    return {
      member: member,
      application: reg || null,
      status: reg ? reg.status : (member.status || 'Pending'),
      statusHistory: history,
      trainings: trainings,
      events: events,
      announcements: announcements,
      communityLinks: {
        whatsapp: getSetting('COMMUNITY_WHATSAPP_LINK', 'https://chat.whatsapp.com/HTI-ICPC-Community'),
        discord: getSetting('COMMUNITY_DISCORD_LINK', 'https://discord.gg/hti-icpc')
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

  /**
   * Updates student/member self profile info
   */
  updateProfile: function(member, updates) {
    const studentId = member.studentId;
    const now = new Date().toISOString();

    const regUpdates = { updatedAt: now };
    if (updates.phoneNumber) regUpdates.phoneNumber = Utils.sanitize(updates.phoneNumber);
    if (updates.personalEmail) regUpdates.personalEmail = Utils.sanitize(updates.personalEmail);
    if (updates.codeforcesUsername !== undefined) regUpdates.codeforcesUsername = Utils.sanitize(updates.codeforcesUsername);
    if (updates.leetcodeProfile !== undefined) regUpdates.leetcodeProfile = Utils.sanitize(updates.leetcodeProfile);
    if (updates.githubProfile !== undefined) regUpdates.githubProfile = Utils.sanitize(updates.githubProfile);
    if (updates.programmingLanguages !== undefined) regUpdates.programmingLanguages = Utils.sanitize(updates.programmingLanguages);

    // Update in Registrations table
    Database.update(TABLES.REGISTRATIONS, 'studentId', studentId, regUpdates);

    // Update in Members table if exists
    const memUpdates = { lastActive: now };
    if (updates.phoneNumber) memUpdates.phoneNumber = Utils.sanitize(updates.phoneNumber);
    if (updates.personalEmail) memUpdates.personalEmail = Utils.sanitize(updates.personalEmail);
    if (updates.codeforcesUsername !== undefined) memUpdates.codeforcesHandle = Utils.sanitize(updates.codeforcesUsername);
    if (updates.discordUsername !== undefined) memUpdates.discordUsername = Utils.sanitize(updates.discordUsername);

    const existingMember = Database.findOne(TABLES.MEMBERS, 'studentId', studentId);
    if (existingMember) {
      Database.update(TABLES.MEMBERS, 'studentId', studentId, memUpdates);
    }

    return {
      success: true,
      studentId: studentId,
      updatedAt: now,
      profile: { ...member, ...updates, codeforcesHandle: updates.codeforcesUsername || member.codeforcesHandle }
    };
  },

  /**
   * Updates member training phase and qualification status (dynamic open-ended phases)
   */
  updateMemberPhase: function(adminUser, memberId, phaseData) {
    Auth.requireRole(adminUser, [ROLES.SUPER_ADMIN, ROLES.ADMIN]);
    const now = new Date().toISOString();

    let member = Database.findOne(TABLES.MEMBERS, 'memberId', memberId);
    if (!member) {
      member = Database.findOne(TABLES.MEMBERS, 'studentId', memberId);
    }
    if (!member) throw new Error('Member not found: ' + memberId);

    const updates = {
      currentPhase: phaseData.phase || member.currentPhase || 'المرحلة 1',
      phaseStatus: phaseData.phaseStatus || member.phaseStatus || 'ACTIVE',
      lastActive: now
    };
    if (phaseData.score !== undefined) updates.phaseScore = String(phaseData.score);
    if (phaseData.notes !== undefined) updates.phaseNotes = Utils.sanitize(phaseData.notes);
    if (phaseData.level) updates.assignedLevel = phaseData.level;

    Database.update(TABLES.MEMBERS, 'memberId', member.memberId, updates);

    // Sync to Registrations table as well
    if (member.studentId) {
      const reg = Database.findOne(TABLES.REGISTRATIONS, 'studentId', member.studentId);
      if (reg) {
        Database.update(TABLES.REGISTRATIONS, 'studentId', member.studentId, updates);
      }
    }

    // Log Activity
    Database.insert(TABLES.ADMIN_ACTIVITY_LOGS, {
      logId: Utils.generateUUID(),
      adminId: adminUser.adminId,
      adminName: adminUser.fullName,
      actionType: 'PHASE_UPDATE',
      targetEntity: 'Member',
      targetId: member.memberId,
      details: `Updated ${member.fullName} phase to "${updates.currentPhase}" (${updates.phaseStatus})${updates.phaseScore ? ' - Score: ' + updates.phaseScore : ''}`,
      timestamp: now
    });

    return {
      success: true,
      memberId: member.memberId,
      studentId: member.studentId,
      ...updates
    };
  },

  /**
   * Bulk updates phase for multiple members at once
   */
  bulkUpdateMemberPhase: function(adminUser, memberIds, phaseData) {
    Auth.requireRole(adminUser, [ROLES.SUPER_ADMIN, ROLES.ADMIN]);
    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      throw new Error('No members selected for bulk update.');
    }
    const updated = [];
    memberIds.forEach(id => {
      try {
        const res = this.updateMemberPhase(adminUser, id, phaseData);
        updated.push(res);
      } catch (e) {}
    });
    return { success: true, count: updated.length, updated };
  }
};



// ==========================================================================
// FILE: Events.gs
// ==========================================================================

/**
 * HTI ICPC Community Platform - Events, Training Sessions & Announcements
 * Backend: Google Apps Script
 */

const EventsService = {
  // ================= TRAINING SESSIONS =================
  listTrainings: function() {
    return Database.getAll(TABLES.TRAINING_SESSIONS);
  },

  createTraining: function(adminUser, data) {
    Auth.requireRole(adminUser, [ROLES.SUPER_ADMIN, ROLES.ADMIN]);
    const id = Utils.generatePrefixedId('TRN');
    const session = {
      sessionId: id,
      title: Utils.sanitize(data.title),
      level: data.level || 'Level 0',
      instructor: Utils.sanitize(data.instructor || adminUser.fullName),
      dateTime: data.dateTime || new Date().toISOString(),
      location: Utils.sanitize(data.location || 'HTI Lab 304'),
      description: Utils.sanitize(data.description || ''),
      materialsUrl: data.materialsUrl || '',
      status: data.status || 'Upcoming'
    };
    Database.insert(TABLES.TRAINING_SESSIONS, session);
    return session;
  },

  updateTraining: function(adminUser, sessionId, data) {
    Auth.requireRole(adminUser, [ROLES.SUPER_ADMIN, ROLES.ADMIN]);
    return Database.update(TABLES.TRAINING_SESSIONS, 'sessionId', sessionId, data);
  },

  deleteTraining: function(adminUser, sessionId) {
    Auth.requireRole(adminUser, [ROLES.SUPER_ADMIN, ROLES.ADMIN]);
    return Database.delete(TABLES.TRAINING_SESSIONS, 'sessionId', sessionId);
  },

  // ================= EVENTS & CONTESTS =================
  listEvents: function() {
    return Database.getAll(TABLES.EVENTS);
  },

  createEvent: function(adminUser, data) {
    Auth.requireRole(adminUser, [ROLES.SUPER_ADMIN, ROLES.ADMIN]);
    const id = Utils.generatePrefixedId('EVT');
    const event = {
      eventId: id,
      title: Utils.sanitize(data.title),
      type: data.type || 'Contest',
      startDate: data.startDate || new Date().toISOString(),
      endDate: data.endDate || new Date().toISOString(),
      location: Utils.sanitize(data.location || 'Online / Codeforces'),
      registrationLink: data.registrationLink || '',
      description: Utils.sanitize(data.description || ''),
      status: data.status || 'Upcoming'
    };
    Database.insert(TABLES.EVENTS, event);
    return event;
  },

  updateEvent: function(adminUser, eventId, data) {
    Auth.requireRole(adminUser, [ROLES.SUPER_ADMIN, ROLES.ADMIN]);
    return Database.update(TABLES.EVENTS, 'eventId', eventId, data);
  },

  deleteEvent: function(adminUser, eventId) {
    Auth.requireRole(adminUser, [ROLES.SUPER_ADMIN, ROLES.ADMIN]);
    return Database.delete(TABLES.EVENTS, 'eventId', eventId);
  },

  // ================= ANNOUNCEMENTS =================
  listAnnouncements: function(publicOnly = true) {
    const list = Database.getAll(TABLES.ANNOUNCEMENTS);
    if (publicOnly) {
      return list.filter(a => (a.isActive === true || a.isActive === 'TRUE') && a.targetAudience !== 'MEMBERS_ONLY');
    }
    return list;
  },

  createAnnouncement: function(adminUser, data) {
    Auth.requireRole(adminUser, [ROLES.SUPER_ADMIN, ROLES.ADMIN]);
    const id = Utils.generatePrefixedId('ANN');
    const ann = {
      announcementId: id,
      title: Utils.sanitize(data.title),
      content: Utils.sanitize(data.content),
      category: data.category || 'General',
      targetAudience: data.targetAudience || 'ALL',
      publishedBy: adminUser.fullName,
      publishedAt: new Date().toISOString(),
      isActive: true
    };
    Database.insert(TABLES.ANNOUNCEMENTS, ann);
    return ann;
  },

  updateAnnouncement: function(adminUser, announcementId, data) {
    Auth.requireRole(adminUser, [ROLES.SUPER_ADMIN, ROLES.ADMIN]);
    return Database.update(TABLES.ANNOUNCEMENTS, 'announcementId', announcementId, data);
  },

  deleteAnnouncement: function(adminUser, announcementId) {
    Auth.requireRole(adminUser, [ROLES.SUPER_ADMIN, ROLES.ADMIN]);
    return Database.delete(TABLES.ANNOUNCEMENTS, 'announcementId', announcementId);
  }
};



// ==========================================================================
// FILE: Email.gs
// ==========================================================================

/**
 * HTI ICPC Community Platform - Email Automation Service
 * Backend: Google Apps Script MailApp / GmailApp
 */

const EmailService = {
  /**
   * Dispatches email safely with HTML formatting and logs to EmailLogs
   */
  send: function(recipientEmail, recipientName, templateType, subject, htmlBody) {
    let status = 'SENT';
    let errorMessage = '';

    try {
      // Check if email can be sent
      if (!Utils.isValidEmail(recipientEmail)) {
        throw new Error(`Invalid email address: ${recipientEmail}`);
      }

      // Check remaining email quota
      const quota = MailApp.getRemainingDailyQuota();
      if (quota <= 0) {
        throw new Error('Daily email quota reached. Email queued in logs.');
      }

      MailApp.sendEmail({
        to: recipientEmail,
        subject: `[HTI ICPC] ${subject}`,
        htmlBody: htmlBody
      });
    } catch (err) {
      status = 'FAILED';
      errorMessage = err.message || String(err);
      console.error(`Failed to send email to ${recipientEmail}:`, err);
    }

    // Always log to EmailLogs
    try {
      Database.insert(TABLES.EMAIL_LOGS, {
        emailLogId: Utils.generateUUID(),
        recipientEmail: recipientEmail,
        recipientName: recipientName,
        templateType: templateType,
        subject: subject,
        status: status,
        errorMessage: errorMessage,
        timestamp: new Date().toISOString()
      });
    } catch (logErr) {
      console.error('Failed to write to EmailLogs:', logErr);
    }

    return { status, errorMessage };
  },

  /**
   * Generates Base HTML Wrapper with HTI ICPC Branding
   */
  wrapEmail: function(title, contentHtml) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0B0F19; color: #F8FAFC; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #151D2E; border: 1px solid #1E293B; border-radius: 12px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%); padding: 30px 20px; text-align: center; }
          .header h1 { margin: 0; color: #FFFFFF; font-size: 24px; letter-spacing: 1px; }
          .header p { margin: 5px 0 0 0; color: #E0E7FF; font-size: 14px; }
          .body { padding: 30px; line-height: 1.6; color: #CBD5E1; font-size: 15px; }
          .body h2 { color: #FFFFFF; font-size: 20px; margin-top: 0; }
          .btn { display: inline-block; padding: 12px 28px; background: #3B82F6; color: #FFFFFF !important; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px; }
          .card { background: #0B0F19; border: 1px solid #1E293B; border-radius: 8px; padding: 15px; margin: 20px 0; }
          .footer { background: #0B0F19; padding: 20px; text-align: center; font-size: 12px; color: #64748B; border-top: 1px solid #1E293B; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>HTI ICPC COMMUNITY</h1>
            <p>Higher Technological Institute &bull; Beni Suef</p>
          </div>
          <div class="body">
            <h2>${title}</h2>
            ${contentHtml}
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} HTI ICPC Community. Think. Code. Compete. Win.</p>
            <p>Official Competitive Programming Community at Higher Technological Institute.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  },

  /**
   * 1. Application Received Email
   */
  sendApplicationReceived: function(applicant) {
    const content = `
      <p>Dear <strong>${applicant.fullName}</strong>,</p>
      <p>Thank you for applying to join the <strong>HTI ICPC Community</strong>! We have successfully received your application.</p>
      <div class="card">
        <p style="margin: 0 0 8px 0;"><strong>Application ID:</strong> <span style="color: #60A5FA;">${applicant.applicationId}</span></p>
        <p style="margin: 0 0 8px 0;"><strong>Student ID:</strong> ${applicant.studentId}</p>
        <p style="margin: 0 0 8px 0;"><strong>Tracking Token:</strong> <code style="color: #F59E0B; background: #1E293B; padding: 2px 6px; border-radius: 4px;">${applicant.trackingToken}</code></p>
        <p style="margin: 0;"><strong>Current Status:</strong> <span style="color: #F59E0B; font-weight: bold;">PENDING REVIEW</span></p>
      </div>
      <p>Our review committee is actively reviewing your application. You can track your real-time application status using your Application ID and Tracking Token at any time.</p>
      <p>Keep training and solving problems!</p>
      <p>Best regards,<br><strong>HTI ICPC Community Organizing Committee</strong></p>
    `;
    const html = this.wrapEmail('Application Received Successfully', content);
    return this.send(applicant.universityEmail || applicant.personalEmail, applicant.fullName, 'APPLICATION_RECEIVED', 'Application Received - HTI ICPC Community', html);
  },

  /**
   * 2. Application Approved Email
   */
  sendApplicationApproved: function(applicant, trackingToken) {
    const content = `
      <p>Dear <strong>${applicant.fullName}</strong>,</p>
      <p style="font-size: 17px; color: #22C55E; font-weight: bold;">Congratulations!</p>
      <p>Your application to join <strong>HTI ICPC Community</strong> has been approved.</p>
      <p>We are excited to welcome you to our Competitive Programming Community. Your journey starts now!</p>
      <div class="card">
        <p style="margin: 0 0 8px 0;"><strong>Member Student ID:</strong> ${applicant.studentId}</p>
        <p style="margin: 0 0 8px 0;"><strong>Department:</strong> ${applicant.department}</p>
        <p style="margin: 0 0 8px 0;"><strong>Tracking Token:</strong> <code style="color: #60A5FA; background: #1E293B; padding: 2px 6px; border-radius: 4px;">${trackingToken || applicant.trackingToken}</code></p>
        <p style="margin: 0;"><strong>Status:</strong> <span style="color: #22C55E; font-weight: bold;">APPROVED & ACTIVE</span></p>
      </div>
      <p>Log in to your <strong>Member Portal</strong> using your Student ID and Tracking Token to access community resources, training roadmaps, and join our official community group.</p>
      <p>Welcome aboard!</p>
      <p>Warm regards,<br><strong>HTI ICPC Community Team</strong></p>
    `;
    const html = this.wrapEmail('Welcome to HTI ICPC Community!', content);
    return this.send(applicant.universityEmail || applicant.personalEmail, applicant.fullName, 'APPLICATION_APPROVED', 'Congratulations! Welcome to HTI ICPC Community', html);
  },

  /**
   * 3. Application Rejected Email
   */
  sendApplicationRejected: function(applicant, reason = '') {
    const content = `
      <p>Dear <strong>${applicant.fullName}</strong>,</p>
      <p>Thank you for your interest in joining the HTI ICPC Community and for taking the time to submit your application.</p>
      <p>After careful evaluation of current cohort capacity and applications, we regret to inform you that we are unable to offer you a spot in this round.</p>
      ${reason ? `<div class="card"><p style="margin: 0;"><strong>Feedback:</strong> ${reason}</p></div>` : ''}
      <p>Competitive programming is a continuous journey. We encourage you to keep sharpening your problem-solving skills on Codeforces and LeetCode, and we welcome you to apply again in our upcoming season.</p>
      <p>We wish you all the best in your academic and programming endeavors.</p>
      <p>Sincerely,<br><strong>HTI ICPC Community Review Committee</strong></p>
    `;
    const html = this.wrapEmail('Application Status Update', content);
    return this.send(applicant.universityEmail || applicant.personalEmail, applicant.fullName, 'APPLICATION_REJECTED', 'HTI ICPC Community Application Update', html);
  },

  /**
   * 4. Application Waitlisted Email
   */
  sendApplicationWaitlisted: function(applicant) {
    const content = `
      <p>Dear <strong>${applicant.fullName}</strong>,</p>
      <p>Thank you for applying to the HTI ICPC Community.</p>
      <p>Due to high application volume and limited lab capacity, your application has been placed on our <strong>Waitlist</strong>.</p>
      <div class="card">
        <p style="margin: 0;"><strong>Status:</strong> <span style="color: #F59E0B; font-weight: bold;">WAITLISTED</span></p>
      </div>
      <p>If additional spots become available in the training cohort, we will review waitlisted applicants in order. You do not need to resubmit your application.</p>
      <p>We appreciate your patience and dedication.</p>
      <p>Sincerely,<br><strong>HTI ICPC Community Team</strong></p>
    `;
    const html = this.wrapEmail('Application Placed on Waitlist', content);
    return this.send(applicant.universityEmail || applicant.personalEmail, applicant.fullName, 'APPLICATION_WAITLISTED', 'HTI ICPC Application - Waitlist Notice', html);
  },

  /**
   * 5. General Status Updated Notification
   */
  sendStatusUpdated: function(applicant, newStatus, note = '') {
    const content = `
      <p>Dear <strong>${applicant.fullName}</strong>,</p>
      <p>Your application status has been updated to: <strong>${newStatus}</strong>.</p>
      ${note ? `<div class="card"><p style="margin:0;"><strong>Note:</strong> ${note}</p></div>` : ''}
      <p>You can check the live details on your tracking portal using your Application ID: <strong>${applicant.applicationId}</strong>.</p>
      <p>Best regards,<br><strong>HTI ICPC Community Team</strong></p>
    `;
    const html = this.wrapEmail('Application Status Update', content);
    return this.send(applicant.universityEmail || applicant.personalEmail, applicant.fullName, 'APPLICATION_STATUS_UPDATED', `HTI ICPC Application Status: ${newStatus}`, html);
  }
};



// ==========================================================================
// FILE: Code.gs
// ==========================================================================

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



