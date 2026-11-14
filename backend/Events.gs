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

