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

