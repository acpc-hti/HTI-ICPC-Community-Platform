/**
 * HTI ICPC Community Platform - Global Configuration
 */

const CONFIG = {
  COMMUNITY_NAME: 'HTI ICPC Community',
  INSTITUTION: 'Higher Technological Institute – Beni Suef',
  CURRENT_ACADEMIC_YEAR: '2026/2027',
  
  // Live Google Apps Script Web App URL:
  GAS_API_URL: 'https://script.google.com/macros/s/AKfycbxHv1JHnD7ROea7JD2isoHgkem2LNzWXrU4VKTYUdWMbPmr26aGptV-cbQOmTtttzdq5g/exec',

  // Links
  WHATSAPP_GROUP_URL: 'https://chat.whatsapp.com/HTI-ICPC-Community',
  DISCORD_URL: 'https://discord.gg/hti-icpc',
  FACEBOOK_URL: 'https://facebook.com/hti.icpc',
  LINKEDIN_URL: 'https://linkedin.com/company/hti-icpc',
  GITHUB_URL: 'https://github.com/hti-icpc',

  // Roles
  ROLES: {
    SUPER_ADMIN: 'SUPER_ADMIN',
    ADMIN: 'ADMIN',
    REVIEWER: 'REVIEWER',
    VIEWER: 'VIEWER'
  },

  // Statuses
  STATUSES: {
    PENDING: 'Pending',
    UNDER_REVIEW: 'Under Review',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    WAITLISTED: 'Waitlisted'
  }
};

window.CONFIG = CONFIG;

// Global Secret Staff Shortcut: Press Ctrl + Shift + A to open Admin Suite from anywhere
document.addEventListener('keydown', function(e) {
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a' || e.code === 'KeyA')) {
    e.preventDefault();
    window.location.href = 'admin.html';
  }
});

