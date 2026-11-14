/**
 * HTI ICPC Community Platform - Student Member Portal Controller
 */

document.addEventListener('DOMContentLoaded', function() {
  let currentPortalData = null;
  const loginForm = document.getElementById('member-login-form');
  const loginView = document.getElementById('login-view');
  const dashboardView = document.getElementById('dashboard-view');
  const logoutBtn = document.getElementById('logout-btn');
  const alertEl = document.getElementById('login-alert');
  const submitBtn = document.getElementById('member-login-btn');
  const btnText = document.getElementById('login-btn-text');
  const btnSpinner = document.getElementById('login-btn-spinner');

  // Check URL query parameters for direct auto-login
  const urlParams = new URLSearchParams(window.location.search);
  const paramEmail = urlParams.get('email');
  const paramStudentId = urlParams.get('studentId');

  if (paramEmail && paramStudentId) {
    document.getElementById('loginEmail').value = paramEmail;
    document.getElementById('loginStudentId').value = paramStudentId;
    doLogin(paramEmail, paramStudentId);
  } else {
    // Check existing session — Instant 0ms render
    const sess = ApiService.getMemberSession();
    if (sess && sess.member) {
      loginView.classList.add('d-none');
      dashboardView.classList.remove('d-none');
      const userProfile = document.getElementById('member-user-profile');
      if (userProfile) userProfile.style.setProperty('display', 'flex', 'important');
      renderDashboard({ member: sess.member, status: sess.member.status || 'Pending' });

      // Sync fresh data in background without blocking UI
      loadPortalDashboard(true);
    }
  }

  const toggleBtn = document.getElementById('toggle-pwd-btn');
  const studentIdInput = document.getElementById('loginStudentId');
  const eyeIcon = document.getElementById('eye-icon');
  if (toggleBtn && studentIdInput && eyeIcon) {
    toggleBtn.addEventListener('click', function() {
      if (studentIdInput.type === 'password') {
        studentIdInput.type = 'text';
        eyeIcon.className = 'fa-solid fa-eye-slash';
      } else {
        studentIdInput.type = 'password';
        eyeIcon.className = 'fa-solid fa-eye';
      }
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value.trim();
      const studentId = document.getElementById('loginStudentId').value.trim();
      if (!email || !studentId) {
        showLoginAlert('يرجى إدخال البريد الإلكتروني ورقم الكارنيه.', 'warning');
        return;
      }
      doLogin(email, studentId);
    });
  }

  async function doLogin(email, studentId) {
    hideLoginAlert();
    submitBtn.disabled = true;
    btnText.classList.add('d-none');
    btnSpinner.classList.remove('d-none');

    try {
      const res = await ApiService.memberLogin(email, studentId);
      // Immediately switch views (0ms)
      loginView.classList.add('d-none');
      dashboardView.classList.remove('d-none');
      const userProfile = document.getElementById('member-user-profile');
      if (userProfile) userProfile.style.setProperty('display', 'flex', 'important');
      renderDashboard({ member: res.member, status: res.status || (res.member && res.member.status) || 'Pending' });

      // Then sync full dashboard details in the background
      loadPortalDashboard(true);
    } catch (err) {
      showLoginAlert(err.message || 'البريد الإلكتروني أو رقم الكارنيه غير صحيح.', 'danger');
    } finally {
      submitBtn.disabled = false;
      btnText.classList.remove('d-none');
      btnSpinner.classList.add('d-none');
    }
  }

  async function loadPortalDashboard(isBackgroundSync = false) {
    try {
      const data = await ApiService.getMemberPortalDashboard();
      renderDashboard(data);
      loginView.classList.add('d-none');
      dashboardView.classList.remove('d-none');
      const userProfile = document.getElementById('member-user-profile');
      if (userProfile) userProfile.style.setProperty('display', 'flex', 'important');
    } catch (err) {
      if (!isBackgroundSync) {
        ApiService.memberLogout();
        loginView.classList.remove('d-none');
        dashboardView.classList.add('d-none');
        const userProfile = document.getElementById('member-user-profile');
        if (userProfile) userProfile.style.setProperty('display', 'none', 'important');
        showLoginAlert(err.message || 'Session expired. Please log in again.', 'warning');
      } else {
        if (err.message && (err.message.includes('expired') || err.message.includes('token') || err.message.includes('Unauthenticated'))) {
          ApiService.memberLogout();
          loginView.classList.remove('d-none');
          dashboardView.classList.add('d-none');
          const userProfile = document.getElementById('member-user-profile');
          if (userProfile) userProfile.style.setProperty('display', 'none', 'important');
          showLoginAlert('انتهت الجلسة، يرجى تسجيل الدخول مجدداً.', 'warning');
        }
      }
    }
  }

  function renderDashboard(data) {
    currentPortalData = data;
    const m = data.member || {};
    const app = data.application || {};
    const status = data.status || m.status || app.status || 'Pending';
    const isApproved = (status === 'Approved');

    // Helper to safely set element text content without throwing errors
    const setTxt = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = (val !== undefined && val !== null && val !== '') ? val : '-';
    };

    // Populate Student Details
    setTxt('disp-member-name', m.fullName || app.fullName || 'Student');
    setTxt('member-nav-name', (m.fullName || app.fullName || 'Student').split(' ')[0]);
    setTxt('member-nav-id', m.studentId || app.studentId || 'HTI Student');
    setTxt('disp-student-id', m.studentId || app.studentId || '-');
    setTxt('disp-dept', m.department || app.department || '-');
    setTxt('disp-year', m.academicYear || app.academicYear || '-');
    setTxt('disp-assigned-level', m.assignedLevel || app.assignedLevel || 'Level 0');
    setTxt('disp-app-id', app.applicationId || m.applicationId || m.memberId || '-');
    setTxt('disp-side-student-id', m.studentId || app.studentId || '-');
    setTxt('disp-phone', m.phoneNumber || app.phoneNumber || '-');
    setTxt('disp-uni-email', m.universityEmail || app.universityEmail || m.personalEmail || '-');

    const cf = m.codeforcesHandle || m.codeforcesUsername || app.codeforcesUsername;
    setTxt('disp-cf-handle', cf ? `@${cf}` : 'غير مربوط');

    const lc = m.leetcodeProfile || app.leetcodeProfile;
    setTxt('disp-leetcode', lc || 'غير مربوط');

    const gh = m.githubProfile || app.githubProfile;
    setTxt('disp-github', gh || 'غير مربوط');

    const dcUser = m.discordUsername || app.discordUsername;
    setTxt('disp-discord', dcUser || 'غير مربوط');

    const lang = m.programmingLanguages || app.programmingLanguages || 'C++';
    setTxt('disp-lang', lang);

    // Render Training & Elimination Phase Progress
    const curPhase = m.currentPhase || app.currentPhase || 'المرحلة 1';
    const phaseSt = m.phaseStatus || app.phaseStatus || 'ACTIVE';
    const phaseScore = m.phaseScore || app.phaseScore || '';
    const phaseNotes = m.phaseNotes || app.phaseNotes || '';

    setTxt('disp-current-phase', curPhase);
    setTxt('disp-phase-name', curPhase);
    setTxt('disp-profile-phase', curPhase);

    const phaseTag = document.getElementById('disp-phase-tag');
    if (phaseTag) {
      phaseTag.innerHTML = `<i class="fa-solid fa-stairs ms-1"></i> ${escapeHtml(curPhase)}`;
    }

    const phaseStatusBadge = document.getElementById('disp-phase-status-badge');
    const phaseMessage = document.getElementById('disp-phase-message');
    const phaseBorderCard = document.getElementById('phase-banner-card');
    const profilePhaseStatus = document.getElementById('disp-profile-phase-status');

    if (phaseSt === 'QUALIFIED') {
      if (phaseStatusBadge) {
        phaseStatusBadge.className = 'badge bg-success bg-opacity-25 text-success px-3 py-1';
        phaseStatusBadge.innerHTML = '<i class="fa-solid fa-circle-check ms-1"></i>🎉 اجتزت امتحان التصفية وتأهلت!';
      }
      if (profilePhaseStatus) {
        profilePhaseStatus.className = 'badge bg-success bg-opacity-25 text-success';
        profilePhaseStatus.textContent = 'مؤهل للمرحلة القادمة';
      }
      if (phaseMessage) {
        phaseMessage.innerHTML = `تهانينا! لقد اجتزت امتحان التصفية بنجاح وتأهلت إلى <strong>${escapeHtml(curPhase)}</strong>. تابع جدول السيشنات والتحق بالمحاضرات القادمة بنشاط!`;
      }
      if (phaseBorderCard) {
        phaseBorderCard.style.borderLeftColor = 'var(--accent-green, #10B981)';
      }
    } else if (phaseSt === 'ELIMINATED') {
      if (phaseStatusBadge) {
        phaseStatusBadge.className = 'badge bg-danger bg-opacity-25 text-danger px-3 py-1';
        phaseStatusBadge.innerHTML = '<i class="fa-solid fa-circle-xmark ms-1"></i>لم يتم اجتياز التصفية';
      }
      if (profilePhaseStatus) {
        profilePhaseStatus.className = 'badge bg-danger bg-opacity-25 text-danger';
        profilePhaseStatus.textContent = 'انتهت المشاركة';
      }
      if (phaseMessage) {
        phaseMessage.innerHTML = `نشكرك على اجتهادك، لقد انتهت مشاركتك التدريبية عند <strong>${escapeHtml(curPhase)}</strong>. استمر في التدريب وحل المسائل ونتطلع لرؤيتك في الموسم القادم! 🏅`;
      }
      if (phaseBorderCard) {
        phaseBorderCard.style.borderLeftColor = '#EF4444';
      }
    } else {
      if (phaseStatusBadge) {
        phaseStatusBadge.className = 'badge bg-primary bg-opacity-25 text-primary px-3 py-1';
        phaseStatusBadge.innerHTML = '<i class="fa-solid fa-hourglass-half ms-1"></i>⏳ جاري حضور المحاضرات والتدريب';
      }
      if (profilePhaseStatus) {
        profilePhaseStatus.className = 'badge bg-primary bg-opacity-25 text-primary';
        profilePhaseStatus.textContent = 'مستمر في التدريب';
      }
      if (phaseMessage) {
        phaseMessage.innerHTML = `أنت مسجل حالياً في <strong>${escapeHtml(curPhase)}</strong>. احرص على حضور المحاضرات الأسبوعية وحل مسائل الشيتات للاستعداد لامتحان التصفية القادم.`;
      }
      if (phaseBorderCard) {
        phaseBorderCard.style.borderLeftColor = 'var(--primary-accent, #3B82F6)';
      }
    }

    const scoreContainer = document.getElementById('disp-phase-score-container');
    const scoreEl = document.getElementById('disp-phase-score');
    if (scoreContainer && scoreEl) {
      if (phaseScore) {
        scoreEl.textContent = `النتيجة في الامتحان: ${phaseScore}`;
        scoreContainer.classList.remove('d-none');
      } else {
        scoreContainer.classList.add('d-none');
      }
    }

    const notesContainer = document.getElementById('disp-phase-notes-container');
    const notesEl = document.getElementById('disp-phase-notes');
    if (notesContainer && notesEl) {
      if (phaseNotes) {
        notesEl.textContent = phaseNotes;
        notesContainer.classList.remove('d-none');
      } else {
        notesContainer.classList.add('d-none');
      }
    }

    const sideStatus = document.getElementById('disp-side-status');
    if (sideStatus) {
      if (status === 'Approved') {
        sideStatus.className = 'badge bg-success bg-opacity-25 text-success';
        sideStatus.textContent = 'مقبول (عضو معتمد)';
      } else if (status === 'Rejected') {
        sideStatus.className = 'badge bg-danger bg-opacity-25 text-danger';
        sideStatus.textContent = 'نعتذر عن القبول';
      } else if (status === 'Waitlisted') {
        sideStatus.className = 'badge bg-secondary bg-opacity-25 text-secondary';
        sideStatus.textContent = 'قائمة الانتظار';
      } else if (status === 'Under Review') {
        sideStatus.className = 'badge bg-info bg-opacity-25 text-info';
        sideStatus.textContent = 'قيد الفحص والمراجعة';
      } else {
        sideStatus.className = 'badge bg-warning bg-opacity-25 text-warning';
        sideStatus.textContent = 'قيد المراجعة';
      }
    }
    
    const joinedOrCreated = m.joinedDate || app.createdAt || m.createdAt || new Date().toISOString();
    try {
      setTxt('disp-joined-date', new Date(joinedOrCreated).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
      }));
    } catch (e) {
      setTxt('disp-joined-date', '-');
    }

    // Handle Application Status & Visual Progression
    renderStatusBanner(status);

    // Links & Unapproved locks
    const wa = document.getElementById('link-whatsapp');
    const dc = document.getElementById('link-discord');
    const lockNotice = document.getElementById('unapproved-lock-notice');

    if (isApproved) {
      if (wa) {
        wa.href = (data.communityLinks && data.communityLinks.whatsapp) || '#';
        wa.classList.remove('disabled', 'opacity-50');
      }
      if (dc) {
        dc.href = (data.communityLinks && data.communityLinks.discord) || '#';
        dc.classList.remove('disabled', 'opacity-50');
      }
      if (lockNotice) lockNotice.classList.add('d-none');
    } else {
      if (wa) {
        wa.removeAttribute('href');
        wa.classList.add('disabled', 'opacity-50');
      }
      if (dc) {
        dc.removeAttribute('href');
        dc.classList.add('disabled', 'opacity-50');
      }
      if (lockNotice) lockNotice.classList.remove('d-none');
    }

    // Render Trainings
    const trainEl = document.getElementById('portal-trainings');
    if (trainEl) {
      if (!isApproved) {
        trainEl.innerHTML = `
          <div class="dashboard-item-card text-center py-4">
            <i class="fa-solid fa-lock fa-2x text-warning text-opacity-50 mb-2"></i>
            <h6 class="text-white mb-1">السيشنات والتدريبات التخصصية</h6>
            <p class="text-secondary small mb-0">جدول المحاضرات والسيشنات الحية الخاصة بمجموعتك التدريبية سيظهر هنا فور اعتماد القبول.</p>
          </div>
        `;
      } else if (!data.trainings || data.trainings.length === 0) {
        trainEl.innerHTML = '<p class="text-secondary small">لا توجد سيشنات تدريبية مجدولة حالياً.</p>';
      } else {
        trainEl.innerHTML = data.trainings.map(t => {
          const dateStr = new Date(t.dateTime).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
          });
          return `
            <div class="dashboard-item-card">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <span class="badge bg-primary bg-opacity-25 text-primary border border-primary border-opacity-30 tech-term">${escapeHtml(t.level || 'All Levels')}</span>
                <span class="small text-light text-opacity-75 font-mono"><i class="fa-regular fa-clock ms-1 text-primary"></i> ${dateStr}</span>
              </div>
              <h5 class="h6 text-white fw-bold mb-1">${escapeHtml(t.title)}</h5>
              <p class="text-light text-opacity-80 small mb-3">${escapeHtml(t.description || '')}</p>
              <div class="d-flex justify-content-between align-items-center small text-light text-opacity-90 pt-2 border-top border-light border-opacity-10">
                <span><i class="fa-solid fa-chalkboard-user text-primary ms-1"></i> المدرب: <strong class="text-white">${escapeHtml(t.instructor || 'Coach')}</strong></span>
                <span class="location-badge"><i class="fa-solid fa-location-dot ms-1"></i> ${escapeHtml(t.location || 'HTI Lab 304')}</span>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // Render Events
    const eventsEl = document.getElementById('portal-events');
    if (eventsEl) {
      if (!data.events || data.events.length === 0) {
        eventsEl.innerHTML = '<p class="text-secondary small">لا توجد مسابقات مجدولة حالياً.</p>';
      } else {
        eventsEl.innerHTML = data.events.map(ev => {
          const startStr = new Date(ev.startDate).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
          });
          return `
            <div class="dashboard-item-card">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <span class="badge bg-warning bg-opacity-25 text-warning border border-warning border-opacity-30 tech-term">${escapeHtml(ev.type || 'Contest')}</span>
                <span class="small text-light text-opacity-75 font-mono">${startStr}</span>
              </div>
              <h5 class="h6 text-white fw-bold mb-1">${escapeHtml(ev.title)}</h5>
              <p class="text-light text-opacity-80 small mb-3">${escapeHtml(ev.description || '')}</p>
              <div class="d-flex justify-content-between align-items-center small text-light text-opacity-90 pt-2 border-top border-light border-opacity-10">
                <span class="location-badge-event"><i class="fa-solid fa-map-pin ms-1"></i> ${escapeHtml(ev.location || 'Online')}</span>
                <span class="badge bg-success bg-opacity-25 text-success border border-success border-opacity-30">التسجيل متاح – Open</span>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // Render Announcements
    const annEl = document.getElementById('portal-announcements');
    if (annEl) {
      if (!data.announcements || data.announcements.length === 0) {
        annEl.innerHTML = '<p class="text-secondary small">لا توجد إعلانات جديدة.</p>';
      } else {
        annEl.innerHTML = data.announcements.map(ann => `
          <div class="dashboard-item-card">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <span class="badge bg-info bg-opacity-25 text-info border border-info border-opacity-30 tech-term">${escapeHtml(ann.category || 'General')}</span>
              <span class="small text-light text-opacity-75 font-mono">${new Date(ann.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            </div>
            <h5 class="h6 text-white fw-bold mb-1">${escapeHtml(ann.title)}</h5>
            <p class="text-light text-opacity-80 small mb-0">${escapeHtml(ann.content)}</p>
          </div>
        `).join('');
      }
    }

    // Render Resources
    const resEl = document.getElementById('portal-resources');
    if (resEl && data.resources) {
      resEl.innerHTML = data.resources.map(res => `
        <a href="${res.link}" target="_blank" class="dashboard-item-card d-flex justify-content-between align-items-center text-decoration-none">
          <div>
            <span class="badge bg-primary bg-opacity-25 text-primary border border-primary border-opacity-30 mb-1 tech-term">${escapeHtml(res.type)}</span>
            <div class="text-white small fw-bold">${escapeHtml(res.title)}</div>
          </div>
          <i class="fa-solid fa-arrow-up-right-from-square text-primary ms-2 fs-5"></i>
        </a>
      `).join('');
    }
  }

  // Render Status Banner & Progression
  function renderStatusBanner(status) {
      const headlineEl = document.getElementById('status-headline');
      const badgeEl = document.getElementById('status-badge');
      const descEl = document.getElementById('status-desc');
      const iconEl = document.getElementById('status-icon');
      const iconBox = document.getElementById('status-icon-box');
      const heroPill = document.getElementById('hero-status-pill');
      const heroText = document.getElementById('hero-status-text');
      const sideStatus = document.getElementById('disp-side-status');
      const statusCard = document.getElementById('portal-status-card');

      const circle2 = document.getElementById('step-circle-2');
      const label2 = document.getElementById('step-label-2');
      const line1 = document.getElementById('step-line-1');
      const circle3 = document.getElementById('step-circle-3');
      const label3 = document.getElementById('step-label-3');
      const line2 = document.getElementById('step-line-2');

      if (status === 'Approved') {
        headlineEl.textContent = 'تهانينا! تم قبولك رسمياً في مجتمع HTI ICPC 🎉';
        descEl.innerHTML = 'تم اعتماد عضويتك وتسكينك في الكوميونيتي بنجاح. أهلاً بك ضمن أبطال البرمجة التنافسية بالمعهد! روابط جروب الواتساب وسيرفر الديسكورد والسيشنات مفتوحة لك بالأسفل.';
        badgeEl.className = 'badge px-3 py-2 fs-6 bg-success bg-opacity-25 text-success border border-success border-opacity-30';
        badgeEl.innerHTML = '<i class="fa-solid fa-circle-check ms-1"></i> تم القبول – Approved';
        iconEl.className = 'fa-solid fa-circle-check text-success';
        iconBox.style.background = 'rgba(16, 185, 129, 0.15)';
        if (statusCard) statusCard.style.borderColor = 'rgba(16, 185, 129, 0.4)';

        heroPill.className = 'badge px-3 py-1 bg-success bg-opacity-25 text-success border border-success border-opacity-30';
        heroText.textContent = 'عضو معتمد – Official Member';
        if (sideStatus) {
          sideStatus.className = 'badge bg-success text-white';
          sideStatus.textContent = 'تم القبول – Approved';
        }

        circle2.className = 'step-circle completed mx-auto mb-1';
        circle2.innerHTML = '<i class="fa-solid fa-check"></i>';
        label2.className = 'step-label text-success small fw-bold';
        line1.className = 'step-line flex-fill active';

        circle3.className = 'step-circle completed mx-auto mb-1';
        circle3.innerHTML = '<i class="fa-solid fa-trophy"></i>';
        label3.className = 'step-label text-success small fw-bold';
        label3.textContent = '3. تم القبول بنجاح';
        line2.className = 'step-line flex-fill active';

      } else if (status === 'Under Review') {
        headlineEl.textContent = 'طلبك حالياً تحت التقييم الفني والمراجعة 🔍';
        descEl.innerHTML = 'يقوم مدربو الفريق بمراجعة بروفايلك البرمجي وبياناتك لتحديد المستوى التدريبي المناسب لك. ترقب إعلان النتيجة قريباً هنا!';
        badgeEl.className = 'badge px-3 py-2 fs-6 bg-info bg-opacity-25 text-info border border-info border-opacity-30';
        badgeEl.innerHTML = '<i class="fa-solid fa-magnifying-glass ms-1"></i> تحت التقييم – Under Review';
        iconEl.className = 'fa-solid fa-magnifying-glass text-info';
        iconBox.style.background = 'rgba(59, 130, 246, 0.15)';
        if (statusCard) statusCard.style.borderColor = 'rgba(59, 130, 246, 0.4)';

        heroPill.className = 'badge px-3 py-1 bg-info bg-opacity-25 text-info border border-info border-opacity-30';
        heroText.textContent = 'تحت التقييم الفني';
        if (sideStatus) {
          sideStatus.className = 'badge bg-info bg-opacity-25 text-info';
          sideStatus.textContent = 'تحت التقييم – Under Review';
        }

        circle2.className = 'step-circle active mx-auto mb-1';
        circle2.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i>';
        label2.className = 'step-label text-info small fw-bold';
        label2.textContent = '2. جاري التقييم الفني';
        line1.className = 'step-line flex-fill active';

        circle3.className = 'step-circle mx-auto mb-1';
        label3.className = 'step-label text-muted small fw-bold';

      } else if (status === 'Waitlisted') {
        headlineEl.textContent = 'طلبك في قائمة الانتظار للدفعة القادمة 📋';
        descEl.innerHTML = 'نظراً لاكتمال السعة الاستيعابية للمعامل في الدفعة الحالية، تم وضعك في قائمة الانتظار. سيتم تصعيدك وقبولك تلقائياً فور توفر أي مقعد شاغر.';
        badgeEl.className = 'badge px-3 py-2 fs-6 bg-warning text-dark border border-warning';
        badgeEl.innerHTML = '<i class="fa-solid fa-clock-rotate-left ms-1"></i> قائمة الانتظار – Waitlisted';
        iconEl.className = 'fa-solid fa-clock-rotate-left text-warning';
        iconBox.style.background = 'rgba(245, 158, 11, 0.2)';
        if (statusCard) statusCard.style.borderColor = 'rgba(245, 158, 11, 0.4)';

        heroPill.className = 'badge px-3 py-1 bg-warning text-dark';
        heroText.textContent = 'قائمة الانتظار';
        if (sideStatus) {
          sideStatus.className = 'badge bg-warning text-dark';
          sideStatus.textContent = 'قائمة الانتظار – Waitlisted';
        }

        circle2.className = 'step-circle completed mx-auto mb-1';
        line1.className = 'step-line flex-fill active';
        circle3.className = 'step-circle waitlisted mx-auto mb-1';
        circle3.innerHTML = '<i class="fa-solid fa-clock"></i>';
        label3.className = 'step-label text-warning small fw-bold';
        label3.textContent = '3. قائمة الانتظار';

      } else if (status === 'Rejected') {
        headlineEl.textContent = 'تمت مراجعة الطلب – نعتذر لعدم القبول في هذه الدورة';
        descEl.innerHTML = 'نشكرك على اهتمامك وشغفك بالـ Problem Solving. نظراً للإقبال الشديد لم نتمكن من قبول الطلب في هذه الدفعة. استمر في التدريب ويسعدنا تقديمك مجدداً في الدورة القادمة!';
        badgeEl.className = 'badge px-3 py-2 fs-6 bg-danger bg-opacity-25 text-danger border border-danger border-opacity-30';
        badgeEl.innerHTML = '<i class="fa-solid fa-circle-xmark ms-1"></i> غير مقبول – Rejected';
        iconEl.className = 'fa-solid fa-circle-xmark text-danger';
        iconBox.style.background = 'rgba(239, 68, 68, 0.15)';
        if (statusCard) statusCard.style.borderColor = 'rgba(239, 68, 68, 0.4)';

        heroPill.className = 'badge px-3 py-1 bg-danger bg-opacity-25 text-danger border border-danger border-opacity-30';
        heroText.textContent = 'لم يتم القبول';
        if (sideStatus) {
          sideStatus.className = 'badge bg-danger bg-opacity-25 text-danger';
          sideStatus.textContent = 'غير مقبول – Rejected';
        }

        circle2.className = 'step-circle completed mx-auto mb-1';
        line1.className = 'step-line flex-fill active';
        circle3.className = 'step-circle rejected mx-auto mb-1';
        circle3.innerHTML = '<i class="fa-solid fa-xmark"></i>';
        label3.className = 'step-label text-danger small fw-bold';
        label3.textContent = '3. تم مراجعة الطلب';

      } else {
        // Pending (Default)
        headlineEl.textContent = 'طلبك قيد المراجعة والتدقيق ⏳';
        descEl.innerHTML = 'تم استلام استمارتك بنجاح. تقوم إدارة الكوميونيتي بمراجعة بياناتك والتأكد من استيفاء الشروط تمهيداً لإعلان نتيجة القبول وتحديد المستوى.';
        badgeEl.className = 'badge px-3 py-2 fs-6 bg-warning bg-opacity-25 text-warning border border-warning border-opacity-30';
        badgeEl.innerHTML = '<i class="fa-solid fa-hourglass-half ms-1"></i> قيد المراجعة – Pending';
        iconEl.className = 'fa-solid fa-hourglass-half text-warning';
        iconBox.style.background = 'rgba(245, 158, 11, 0.15)';
        if (statusCard) statusCard.style.borderColor = 'rgba(245, 158, 11, 0.4)';

        heroPill.className = 'badge px-3 py-1 bg-warning bg-opacity-25 text-warning border border-warning border-opacity-30';
        heroText.textContent = 'طلب قيد المراجعة';
        if (sideStatus) {
          sideStatus.className = 'badge bg-warning bg-opacity-25 text-warning';
          sideStatus.textContent = 'قيد المراجعة – Pending';
        }

        circle2.className = 'step-circle active mx-auto mb-1';
        circle2.innerHTML = '<i class="fa-solid fa-hourglass-half"></i>';
        label2.className = 'step-label text-warning small fw-bold';
        label2.textContent = '2. جاري فحص البيانات';

        circle3.className = 'step-circle mx-auto mb-1';
        label3.className = 'step-label text-muted small fw-bold';
        label3.textContent = '3. اعتماد القبول والمستوى';
      }
    }

  // Edit Profile Handlers
  const editProfileModal = document.getElementById('editProfileModal');
  const editProfileForm = document.getElementById('edit-profile-form');
  const editProfileAlert = document.getElementById('edit-profile-alert');

  if (editProfileModal) {
    editProfileModal.addEventListener('show.bs.modal', function() {
      if (!currentPortalData) return;
      const m = currentPortalData.member || {};
      const app = currentPortalData.application || {};
      if (editProfileAlert) editProfileAlert.classList.add('d-none');

      document.getElementById('editPhone').value = m.phoneNumber || app.phoneNumber || '';
      document.getElementById('editCodeforces').value = m.codeforcesHandle || app.codeforcesUsername || '';
      document.getElementById('editLeetcode').value = app.leetcodeProfile || '';
      document.getElementById('editGithub').value = app.githubProfile || '';
      document.getElementById('editDiscord').value = m.discordUsername || '';

      const langSelect = document.getElementById('editLang');
      const curLang = app.programmingLanguages || 'C++';
      if (langSelect) {
        let matched = false;
        for (let opt of langSelect.options) {
          if (opt.value === curLang) {
            opt.selected = true;
            matched = true;
            break;
          }
        }
        if (!matched) langSelect.value = 'أخرى';
      }
    });
  }

  if (editProfileForm) {
    editProfileForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const saveBtn = document.getElementById('btn-save-profile');
      const saveText = document.getElementById('save-profile-text');
      const saveSpinner = document.getElementById('save-profile-spinner');

      saveBtn.disabled = true;
      saveText.classList.add('d-none');
      saveSpinner.classList.remove('d-none');
      if (editProfileAlert) editProfileAlert.classList.add('d-none');

      const updates = {
        phoneNumber: document.getElementById('editPhone').value.trim(),
        codeforcesUsername: document.getElementById('editCodeforces').value.trim(),
        leetcodeProfile: document.getElementById('editLeetcode').value.trim(),
        githubProfile: document.getElementById('editGithub').value.trim(),
        discordUsername: document.getElementById('editDiscord').value.trim(),
        programmingLanguages: document.getElementById('editLang').value
      };

      try {
        await ApiService.updateMemberProfile(updates);

        if (currentPortalData) {
          currentPortalData.member = { ...currentPortalData.member, ...updates, codeforcesHandle: updates.codeforcesUsername };
          currentPortalData.application = { ...currentPortalData.application, ...updates };
          renderDashboard(currentPortalData);
        }

        if (editProfileAlert) {
          editProfileAlert.className = 'alert alert-success mb-3';
          editProfileAlert.innerHTML = '<i class="fa-solid fa-circle-check ms-1"></i> تم حفظ وتحديث بياناتك بنجاح!';
          editProfileAlert.classList.remove('d-none');
        }

        setTimeout(function() {
          const modalInstance = bootstrap.Modal.getInstance(editProfileModal);
          if (modalInstance) modalInstance.hide();
        }, 1200);

      } catch (err) {
        if (editProfileAlert) {
          editProfileAlert.className = 'alert alert-danger mb-3';
          editProfileAlert.innerHTML = `<i class="fa-solid fa-triangle-exclamation ms-1"></i> ${err.message || 'فشل تحديث البيانات'}`;
          editProfileAlert.classList.remove('d-none');
        }
      } finally {
        saveBtn.disabled = false;
        saveText.classList.remove('d-none');
        saveSpinner.classList.add('d-none');
      }
    });
  }

  function showLoginAlert(msg, type = 'danger') {
    alertEl.className = `alert alert-${type} mb-3`;
    alertEl.innerHTML = `<i class="fa-solid fa-circle-exclamation me-2"></i> ${msg}`;
    alertEl.classList.remove('d-none');
  }

  function hideLoginAlert() {
    alertEl.classList.add('d-none');
  }

  function escapeHtml(text) {
    if (!text) return '';
    return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
});

function logoutMember() {
  ApiService.memberLogout();
  window.location.reload();
}

