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

