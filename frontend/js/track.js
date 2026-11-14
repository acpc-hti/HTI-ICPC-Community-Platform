/**
 * HTI ICPC Community Platform - Application Tracking Controller
 */

document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('tracking-form');
  const alertEl = document.getElementById('track-alert');
  const statusCard = document.getElementById('status-card');
  const submitBtn = document.getElementById('track-submit-btn');
  const btnText = document.getElementById('track-btn-text');
  const btnSpinner = document.getElementById('track-btn-spinner');

  // Check URL query params
  const urlParams = new URLSearchParams(window.location.search);
  const paramAppId = urlParams.get('appId');
  const paramToken = urlParams.get('token');

  if (paramAppId && paramToken) {
    document.getElementById('trackAppId').value = paramAppId;
    document.getElementById('trackToken').value = paramToken;
    performTrack(paramAppId, paramToken);
  }

  if (form) {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      const appId = document.getElementById('trackAppId').value.trim();
      const token = document.getElementById('trackToken').value.trim();
      if (!appId || !token) {
        showAlert('Please provide both Application ID and Tracking Token.', 'warning');
        return;
      }
      performTrack(appId, token);
    });
  }

  async function performTrack(appId, token) {
    hideAlert();
    statusCard.classList.add('d-none');
    submitBtn.disabled = true;
    btnText.classList.add('d-none');
    btnSpinner.classList.remove('d-none');

    try {
      const data = await ApiService.trackApplication(appId, token);
      renderStatus(data, token);
    } catch (err) {
      showAlert(err.message || 'Unable to find application. Please check your credentials.', 'danger');
    } finally {
      submitBtn.disabled = false;
      btnText.classList.remove('d-none');
      btnSpinner.classList.add('d-none');
    }
  }

  function renderStatus(app, token) {
    document.getElementById('applicant-name').textContent = app.fullName;
    document.getElementById('applicant-student-id').textContent = app.studentId;
    document.getElementById('applicant-dept').textContent = app.department;
    document.getElementById('applicant-year').textContent = app.academicYear;
    document.getElementById('applicant-app-id').textContent = app.applicationId;
    document.getElementById('applicant-created-at').textContent = new Date(app.createdAt).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    // Render Badge
    const badgeContainer = document.getElementById('status-badge-container');
    badgeContainer.innerHTML = getStatusBadge(app.status);

    // Render Instruction Banner
    const banner = document.getElementById('instruction-banner');
    const approvedAction = document.getElementById('approved-action');
    approvedAction.classList.add('d-none');

    if (app.status === 'Approved') {
      banner.className = 'alert alert-success';
      banner.innerHTML = `
        <h5 class="alert-heading fw-bold mb-1"><i class="fa-solid fa-circle-check ms-2"></i> ألف مبروك! تم قبول طلبك بنجاح – Application Approved</h5>
        <p class="mb-0 small">أهلاً بك رسمياً في HTI ICPC Community! تم تفعيل عضويتك وتحديد المستوى التدريبي المناسب لك. يمكنك الآن الدخول إلى بوابة الأعضاء ومتابعة شيتات التدريب والانضمام للجروب الرسمي.</p>
      `;
      approvedAction.classList.remove('d-none');
      const portalLink = document.getElementById('portal-login-link');
      if (portalLink) {
        portalLink.href = `portal.html?studentId=${encodeURIComponent(app.studentId)}&token=${encodeURIComponent(token)}`;
      }
    } else if (app.status === 'Under Review') {
      banner.className = 'alert alert-info';
      banner.innerHTML = `
        <h5 class="alert-heading fw-bold mb-1"><i class="fa-solid fa-hourglass-half ms-2"></i> طلبك قيد الفحص والتقييم – Under Review</h5>
        <p class="mb-0 small">يقوم فريق المدربين حالياً بمراجعة بياناتك وخلفيتك البرمجية لتحديد الدفعة التدريبية المناسبة لك. سيصلك إشعار بالقرار قريباً.</p>
      `;
    } else if (app.status === 'Waitlisted') {
      banner.className = 'alert alert-warning';
      banner.innerHTML = `
        <h5 class="alert-heading fw-bold mb-1"><i class="fa-solid fa-clock-rotate-left ms-2"></i> تم وضع طلبك في قائمة الانتظار – Waitlisted</h5>
        <p class="mb-0 small">نظراً للإقبال الكبير واكتمال سعة المعامل للدور الحالي، تم تسجيلك في قائمة الانتظار وستكون لك الأولوية فور فتح مقاعد جديدة.</p>
      `;
    } else if (app.status === 'Rejected') {
      banner.className = 'alert alert-secondary';
      banner.innerHTML = `
        <h5 class="alert-heading fw-bold mb-1"><i class="fa-solid fa-circle-xmark ms-2"></i> تمت مراجعة الطلب – Application Evaluated</h5>
        <p class="mb-0 small">نشكرك على رغبتك بالانضمام. نشجعك على مواصلة التدريب على منصات Codeforces و LeetCode ونرحب بتقديمك مجدداً في الجولة القادمة.</p>
      `;
    } else {
      // Pending
      banner.className = 'alert alert-primary';
      banner.innerHTML = `
        <h5 class="alert-heading fw-bold mb-1"><i class="fa-solid fa-paper-plane ms-2"></i> تم استلام الطلب وهو في الانتظار – Pending Review</h5>
        <p class="mb-0 small">طلبك مسجل في النظام وجارٍ إدراجه في طابور المراجعة لدى لجنة المدربين.</p>
      `;
    }

    // Render Timeline
    const timelineEl = document.getElementById('status-timeline');
    if (app.history && app.history.length > 0) {
      timelineEl.innerHTML = app.history.map(item => {
        const timeStr = new Date(item.timestamp).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        const isCompleted = item.status === 'Approved';
        const displayLabel = item.status === 'Approved' ? 'تم القبول – Approved' :
                             item.status === 'Under Review' ? 'قيد المراجعة – Under Review' :
                             item.status === 'Waitlisted' ? 'قائمة الانتظار – Waitlisted' :
                             item.status === 'Rejected' ? 'تمت المراجعة – Rejected' : 'تم استلام الطلب – Submitted';
        return `
          <div class="timeline-item">
            <div class="timeline-dot ${isCompleted ? 'completed' : ''}"></div>
            <div class="d-flex justify-content-between align-items-baseline">
              <span class="fw-bold text-light">${displayLabel}</span>
              <span class="text-muted small font-mono">${timeStr}</span>
            </div>
            <p class="text-secondary small mb-0 mt-1">${escapeHtml(item.publicNote || '')}</p>
          </div>
        `;
      }).join('');
    } else {
      timelineEl.innerHTML = `
        <div class="timeline-item">
          <div class="timeline-dot completed"></div>
          <span class="fw-bold text-light">قيد المراجعة – Pending Review</span>
          <p class="text-secondary small mb-0 mt-1">تم تسجيل الطلب وحفظه في قاعدة البيانات بنجاح.</p>
        </div>
      `;
    }

    statusCard.classList.remove('d-none');
    statusCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function getStatusBadge(status) {
    switch (status) {
      case 'Approved':
        return '<span class="badge-custom badge-approved"><i class="fa-solid fa-circle-check ms-1"></i> تم القبول – Approved</span>';
      case 'Under Review':
        return '<span class="badge-custom badge-review"><i class="fa-solid fa-hourglass-half ms-1"></i> قيد المراجعة – Under Review</span>';
      case 'Waitlisted':
        return '<span class="badge-custom badge-waitlisted"><i class="fa-solid fa-clock ms-1"></i> قائمة الانتظار – Waitlisted</span>';
      case 'Rejected':
        return '<span class="badge-custom badge-rejected"><i class="fa-solid fa-circle-xmark ms-1"></i> لم يتم القبول – Rejected</span>';
      default:
        return '<span class="badge-custom badge-pending"><i class="fa-solid fa-paper-plane ms-1"></i> قيد الانتظار – Pending</span>';
    }
  }

  function showAlert(msg, type = 'danger') {
    alertEl.className = `alert alert-${type} mb-4`;
    alertEl.innerHTML = `<i class="fa-solid fa-circle-exclamation me-2"></i> ${msg}`;
    alertEl.classList.remove('d-none');
  }

  function hideAlert() {
    alertEl.classList.add('d-none');
  }

  function escapeHtml(text) {
    if (!text) return '';
    return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
});

