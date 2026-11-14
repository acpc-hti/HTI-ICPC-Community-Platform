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

