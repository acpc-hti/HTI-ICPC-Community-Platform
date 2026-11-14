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

