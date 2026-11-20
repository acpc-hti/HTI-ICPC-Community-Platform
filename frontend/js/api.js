/**
 * HTI ICPC Community Platform - Unified Client API Service
 * Handles live Google Apps Script Web App calls and falls back cleanly to local MockDB.
 */

const ApiService = (function() {
  function isMockMode() {
    return !CONFIG.GAS_API_URL || CONFIG.GAS_API_URL.trim() === '';
  }

  async function postGAS(payload) {
    const res = await fetch(CONFIG.GAS_API_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'text/plain;charset=utf-8' // GAS Web App requires text/plain to prevent CORS preflight issues
      }
    });
    const json = await res.json();
    if (!json.success) {
      throw new Error(json.error || 'Server error occurred');
    }
    return json.data;
  }

  async function getGAS(params) {
    const url = new URL(CONFIG.GAS_API_URL);
    Object.keys(params).forEach(k => url.searchParams.append(k, params[k]));
    const res = await fetch(url.toString());
    const json = await res.json();
    if (!json.success) {
      throw new Error(json.error || 'Server error occurred');
    }
    return json.data;
  }

  return {
    isMockMode: isMockMode,

    setBackendUrl: function(url) {
      const clean = (url || '').trim();
      CONFIG.GAS_API_URL = clean;
      if (clean) {
        localStorage.setItem('HTI_GAS_API_URL', clean);
      } else {
        localStorage.removeItem('HTI_GAS_API_URL');
      }
    },

    testConnection: async function(testUrl) {
      const target = (testUrl || CONFIG.GAS_API_URL || '').trim();
      if (!target) throw new Error('يرجى إدخال رابط Google Apps Script Web App أولاً.');
      const parsed = new URL(target);
      parsed.searchParams.append('action', 'ping');
      const res = await fetch(parsed.toString());
      const json = await res.json();
      if (json && json.success) {
        return json.data;
      }
      throw new Error((json && json.error) ? json.error : 'فشل الاتصال بالخادم، تحقق من الرابط.');
    },
    // ================= PUBLIC =================
    submitApplication: async function(formData) {
      if (isMockMode()) {
        return await MockDB.submitApplication(formData);
      }
      return await postGAS({ action: 'apply', ...formData });
    },

    trackApplication: async function(applicationId, trackingToken) {
      if (isMockMode()) {
        return await MockDB.trackApplication(applicationId, trackingToken);
      }
      return await getGAS({ action: 'track', applicationId, trackingToken });
    },

    getPublicData: async function() {
      if (isMockMode()) {
        return await MockDB.getPublicData();
      }
      return await getGAS({ action: 'public_data' });
    },

    // ================= ADMIN AUTH =================
    adminLogin: async function(email, password) {
      let result;
      if (isMockMode()) {
        result = await MockDB.adminLogin(email, password);
      } else {
        result = await postGAS({ action: 'admin_login', email, password });
      }

      sessionStorage.setItem('hti_admin_token', result.token);
      sessionStorage.setItem('hti_admin_user', JSON.stringify(result.admin));
      localStorage.setItem('hti_admin_token', result.token);
      localStorage.setItem('hti_admin_user', JSON.stringify(result.admin));
      return result;
    },

    adminLogout: function() {
      sessionStorage.removeItem('hti_admin_token');
      sessionStorage.removeItem('hti_admin_user');
      localStorage.removeItem('hti_admin_token');
      localStorage.removeItem('hti_admin_user');
    },

    getAdminSession: function() {
      const token = sessionStorage.getItem('hti_admin_token') || localStorage.getItem('hti_admin_token');
      const userStr = sessionStorage.getItem('hti_admin_user') || localStorage.getItem('hti_admin_user');
      if (!token || !userStr) return null;
      try {
        return { token, admin: JSON.parse(userStr) };
      } catch (e) {
        return null;
      }
    },

    getAdminProfile: async function() {
      const sess = this.getAdminSession();
      if (!sess) throw new Error('Unauthenticated');
      if (isMockMode()) {
        return await MockDB.getAdminProfile(sess.admin.adminId);
      }
      return await getGAS({ action: 'admin_profile', token: sess.token });
    },

    updateAdminProfile: async function(updates) {
      const sess = this.getAdminSession();
      if (!sess) throw new Error('Unauthenticated');
      let result;
      if (isMockMode()) {
        result = await MockDB.updateAdminProfile(sess.admin, updates);
      } else {
        result = await postGAS({
          action: 'update_admin_profile',
          token: sess.token,
          ...updates
        });
      }
      const updatedAdmin = { ...sess.admin, ...(result.admin || result) };
      sessionStorage.setItem('hti_admin_user', JSON.stringify(updatedAdmin));
      localStorage.setItem('hti_admin_user', JSON.stringify(updatedAdmin));
      return updatedAdmin;
    },

    // ================= ADMIN DASHBOARD =================
    getStats: async function() {
      const sess = this.getAdminSession();
      if (!sess) throw new Error('Unauthenticated');
      if (isMockMode()) {
        return await MockDB.getStats(sess.token);
      }
      return await getGAS({ action: 'get_stats', token: sess.token });
    },

    listApplications: async function(filters = {}) {
      const sess = this.getAdminSession();
      if (!sess) throw new Error('Unauthenticated');
      if (isMockMode()) {
        return await MockDB.listApplications(filters);
      }
      return await getGAS({ action: 'list_applications', token: sess.token, ...filters });
    },

    updateApplicationStatus: async function(applicationId, status, note, reviewerName) {
      const sess = this.getAdminSession();
      if (!sess) throw new Error('Unauthenticated');
      if (isMockMode()) {
        return await MockDB.updateApplicationStatus(sess.admin, applicationId, status, note, reviewerName);
      }
      return await postGAS({
        action: 'update_status',
        token: sess.token,
        applicationId,
        status,
        note,
        reviewerName
      });
    },

    // ================= MEMBERS MANAGEMENT =================
    listMembers: async function(filters = {}) {
      const sess = this.getAdminSession();
      if (!sess) throw new Error('Unauthenticated');
      if (isMockMode()) {
        return await MockDB.listMembers(filters);
      }
      return await getGAS({ action: 'list_members', token: sess.token, ...filters });
    },

    updateMemberStatus: async function(memberId, status, level = null) {
      const sess = this.getAdminSession();
      if (!sess) throw new Error('Unauthenticated');
      if (isMockMode()) {
        return await MockDB.updateMemberStatus(sess.admin, memberId, status, level);
      }
      return await postGAS({
        action: 'update_member',
        token: sess.token,
        memberId,
        memberStatus: status,
        assignedLevel: level
      });
    },

    updateMemberPhase: async function(memberId, phaseData) {
      const sess = this.getAdminSession();
      if (!sess) throw new Error('Unauthenticated');
      if (isMockMode()) {
        return await MockDB.updateMemberPhase(sess.admin, memberId, phaseData);
      }
      return await postGAS({
        action: 'update_phase',
        token: sess.token,
        memberId,
        ...phaseData
      });
    },

    bulkUpdateMemberPhase: async function(memberIds, phaseData) {
      const sess = this.getAdminSession();
      if (!sess) throw new Error('Unauthenticated');
      if (isMockMode()) {
        return await MockDB.bulkUpdateMemberPhase(sess.admin, memberIds, phaseData);
      }
      return await postGAS({
        action: 'bulk_update_phase',
        token: sess.token,
        memberIds,
        ...phaseData
      });
    },

    // ================= MULTI-ADMIN RBAC =================
    listAdmins: async function() {
      const sess = this.getAdminSession();
      if (!sess) throw new Error('Unauthenticated');
      if (isMockMode()) {
        return await MockDB.listAdmins();
      }
      return await getGAS({ action: 'list_admins', token: sess.token });
    },

    createAdmin: async function(data) {
      const sess = this.getAdminSession();
      if (!sess) throw new Error('Unauthenticated');
      if (isMockMode()) {
        return await MockDB.createAdmin(sess.admin, data);
      }
      return await postGAS({
        action: 'create_admin',
        token: sess.token,
        ...data
      });
    },

    updateAdmin: async function(adminId, updates) {
      const sess = this.getAdminSession();
      if (!sess) throw new Error('Unauthenticated');
      if (isMockMode()) {
        return await MockDB.updateAdmin(sess.admin, adminId, updates);
      }
      return await postGAS({
        action: 'update_admin',
        token: sess.token,
        adminId,
        ...updates
      });
    },

    deleteAdmin: async function(adminId) {
      const sess = this.getAdminSession();
      if (!sess) throw new Error('Unauthenticated');
      if (isMockMode()) {
        return await MockDB.deleteAdmin(sess.admin, adminId);
      }
      return await postGAS({
        action: 'delete_admin',
        token: sess.token,
        adminId
      });
    },

    deleteMember: async function(memberId) {
      const sess = this.getAdminSession();
      if (!sess) throw new Error('Unauthenticated');
      if (isMockMode()) {
        return await MockDB.deleteMember(sess.admin, memberId);
      }
      return await postGAS({
        action: 'delete_member',
        token: sess.token,
        memberId
      });
    },

    listLogs: async function() {
      const sess = this.getAdminSession();
      if (!sess) throw new Error('Unauthenticated');
      if (isMockMode()) {
        return await MockDB.listLogs();
      }
      return await getGAS({ action: 'list_logs', token: sess.token });
    },

    clearLogs: async function() {
      const sess = this.getAdminSession();
      if (!sess) throw new Error('Unauthenticated');
      if (isMockMode()) {
        return await MockDB.clearLogs(sess.admin);
      }
      return await postGAS({ action: 'clear_logs', token: sess.token });
    },

    // ================= EVENTS & TRAININGS =================
    createEvent: async function(data) {
      const sess = this.getAdminSession();
      if (!sess) throw new Error('Unauthenticated');
      if (isMockMode()) {
        return await MockDB.createEvent(sess.admin, data);
      }
      return await postGAS({ action: 'create_event', token: sess.token, ...data });
    },

    updateEvent: async function(eventId, data) {
      const sess = this.getAdminSession();
      if (!sess) throw new Error('Unauthenticated');
      if (isMockMode()) {
        return await MockDB.updateEvent(sess.admin, eventId, data);
      }
      return await postGAS({ action: 'update_event', token: sess.token, eventId, ...data });
    },

    createTraining: async function(data) {
      const sess = this.getAdminSession();
      if (!sess) throw new Error('Unauthenticated');
      if (isMockMode()) {
        return await MockDB.createTraining(sess.admin, data);
      }
      return await postGAS({ action: 'create_training', token: sess.token, ...data });
    },

    updateTraining: async function(sessionId, data) {
      const sess = this.getAdminSession();
      if (!sess) throw new Error('Unauthenticated');
      if (isMockMode()) {
        return await MockDB.updateTraining(sess.admin, sessionId, data);
      }
      return await postGAS({ action: 'update_training', token: sess.token, sessionId, ...data });
    },

    deleteEvent: async function(eventId) {
      const sess = this.getAdminSession();
      if (!sess) throw new Error('Unauthenticated');
      if (isMockMode()) {
        return await MockDB.deleteEvent(sess.admin, eventId);
      }
      return await postGAS({ action: 'delete_event', token: sess.token, eventId });
    },

    deleteTraining: async function(sessionId) {
      const sess = this.getAdminSession();
      if (!sess) throw new Error('Unauthenticated');
      if (isMockMode()) {
        return await MockDB.deleteTraining(sess.admin, sessionId);
      }
      return await postGAS({ action: 'delete_training', token: sess.token, sessionId });
    },

    completeEvent: async function(eventId) {
      const sess = this.getAdminSession();
      if (!sess) throw new Error('Unauthenticated');
      if (isMockMode()) {
        return await MockDB.completeEvent(sess.admin, eventId);
      }
      return await postGAS({ action: 'complete_event', token: sess.token, eventId });
    },

    completeTraining: async function(sessionId) {
      const sess = this.getAdminSession();
      if (!sess) throw new Error('Unauthenticated');
      if (isMockMode()) {
        return await MockDB.completeTraining(sess.admin, sessionId);
      }
      return await postGAS({ action: 'complete_training', token: sess.token, sessionId });
    },

    // ================= ANNOUNCEMENTS =================
    createAnnouncement: async function(data) {
      const sess = this.getAdminSession();
      if (!sess) throw new Error('Unauthenticated');
      if (isMockMode()) {
        return await MockDB.createAnnouncement(sess.admin, data);
      }
      return await postGAS({ action: 'create_announcement', token: sess.token, ...data });
    },

    updateAnnouncement: async function(announcementId, data) {
      const sess = this.getAdminSession();
      if (!sess) throw new Error('Unauthenticated');
      if (isMockMode()) {
        return await MockDB.updateAnnouncement(sess.admin, announcementId, data);
      }
      return await postGAS({ action: 'update_announcement', token: sess.token, announcementId, ...data });
    },

    deleteAnnouncement: async function(announcementId) {
      const sess = this.getAdminSession();
      if (!sess) throw new Error('Unauthenticated');
      if (isMockMode()) {
        return await MockDB.deleteAnnouncement(sess.admin, announcementId);
      }
      return await postGAS({ action: 'delete_announcement', token: sess.token, announcementId });
    },

    getAdminEventsAndTrainings: async function() {
      const sess = this.getAdminSession();
      if (!sess) throw new Error('Unauthenticated');
      if (isMockMode()) {
        return await MockDB.getAdminEventsAndTrainings();
      }
      return await postGAS({ action: 'admin_events_trainings', token: sess.token });
    },

    // ================= MEMBER PORTAL =================
    memberLogin: async function(email, studentId) {
      let result;
      if (isMockMode()) {
        result = await MockDB.memberLogin(email, studentId);
      } else {
        result = await postGAS({ action: 'member_login', email, studentId });
      }

      sessionStorage.setItem('hti_member_token', result.token);
      sessionStorage.setItem('hti_member_user', JSON.stringify(result.member));
      localStorage.setItem('hti_member_token', result.token);
      localStorage.setItem('hti_member_user', JSON.stringify(result.member));
      return result;
    },

    memberLogout: function() {
      sessionStorage.removeItem('hti_member_token');
      sessionStorage.removeItem('hti_member_user');
      localStorage.removeItem('hti_member_token');
      localStorage.removeItem('hti_member_user');
    },

    getMemberSession: function() {
      const token = sessionStorage.getItem('hti_member_token') || localStorage.getItem('hti_member_token');
      const userStr = sessionStorage.getItem('hti_member_user') || localStorage.getItem('hti_member_user');
      if (!token || !userStr) return null;
      try {
        return { token, member: JSON.parse(userStr) };
      } catch (e) {
        return null;
      }
    },

    getMemberPortalDashboard: async function() {
      const sess = this.getMemberSession();
      if (!sess) throw new Error('Unauthenticated member session');
      if (isMockMode()) {
        return await MockDB.getMemberPortalDashboard(sess.member.studentId);
      }
      return await getGAS({ action: 'member_portal', token: sess.token });
    },

    updateMemberProfile: async function(updates) {
      const sess = this.getMemberSession();
      if (!sess) throw new Error('Unauthenticated member session');
      let result;
      if (isMockMode()) {
        result = await MockDB.updateMemberProfile(sess.member, updates);
      } else {
        result = await postGAS({ action: 'update_profile', token: sess.token, ...updates });
      }

      // Update cached session locally
      const updatedMember = { ...sess.member, ...updates };
      if (updates.codeforcesUsername !== undefined) updatedMember.codeforcesHandle = updates.codeforcesUsername;
      sessionStorage.setItem('hti_member_user', JSON.stringify(updatedMember));
      localStorage.setItem('hti_member_user', JSON.stringify(updatedMember));
      return result;
    }
  };
})();

window.ApiService = ApiService;

