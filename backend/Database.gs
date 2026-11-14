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
    const lastCol = sheet.getLastColumn();
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

