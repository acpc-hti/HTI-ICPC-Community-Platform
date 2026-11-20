/**
 * HTI ICPC Community Platform - Multi-Admin Suite & Dashboard Controller
 */

let statusChartInstance = null;
let yearChartInstance = null;
let currentSelectedApplication = null;

// ================= TOAST NOTIFICATION SYSTEM =================
const TOAST_ICONS = {
  success: 'fa-circle-check',
  error: 'fa-circle-xmark',
  info: 'fa-circle-info',
  warning: 'fa-triangle-exclamation'
};

function showToast(message, type = 'success', duration = 4000) {
  const container = document.getElementById('toastContainer');
  if (!container) { alert(message); return; }

  const toast = document.createElement('div');
  toast.className = `toast-custom toast-${type}`;
  toast.style.setProperty('--toast-duration', `${duration / 1000}s`);
  toast.innerHTML = `
    <i class="fa-solid ${TOAST_ICONS[type] || TOAST_ICONS.info} toast-icon"></i>
    <div class="toast-body-text">${message}</div>
    <button class="toast-close-btn" onclick="this.parentElement.remove()">
      <i class="fa-solid fa-xmark"></i>
    </button>
  `;
  container.appendChild(toast);
  setTimeout(() => { if (toast.parentElement) toast.remove(); }, duration + 500);
}

document.addEventListener('DOMContentLoaded', function() {
  initAdminAuth();
  setupNavigation();
  setupSearchAndFilters();
  setupModalsAndForms();
  setupAdminProfileForms();
  initPasswordToggles();
  initGasStatusUI();
});

// ================= AUTH & SESSION =================
function initAdminAuth() {
  const loginForm = document.getElementById('admin-login-form');
  const sess = ApiService.getAdminSession();

  if (sess) {
    showDashboard(sess.admin);
  } else {
    showLoginForm();
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const email = document.getElementById('adminEmail').value.trim();
      const password = document.getElementById('adminPassword').value;
      const btn = document.getElementById('admin-login-btn');
      const text = document.getElementById('admin-btn-text');
      const spinner = document.getElementById('admin-btn-spinner');

      btn.disabled = true;
      text.classList.add('d-none');
      spinner.classList.remove('d-none');
      hideLoginAlert();

      try {
        const res = await ApiService.adminLogin(email, password);
        showDashboard(res.admin);
      } catch (err) {
        showLoginAlert(err.message || 'Authentication failed. Please verify credentials.', 'danger');
      } finally {
        btn.disabled = false;
        text.classList.remove('d-none');
        spinner.classList.add('d-none');
      }
    });
  }
}

function showLoginForm() {
  document.getElementById('admin-login-view').classList.remove('d-none');
  document.getElementById('admin-dashboard-layout').classList.add('d-none');
  const userProfile = document.getElementById('admin-user-profile');
  if (userProfile) userProfile.style.setProperty('display', 'none', 'important');
}

function showDashboard(admin) {
  document.getElementById('admin-login-view').classList.add('d-none');
  document.getElementById('admin-dashboard-layout').classList.remove('d-none');
  
  const userProfile = document.getElementById('admin-user-profile');
  if (userProfile) userProfile.style.setProperty('display', 'flex', 'important');

  document.getElementById('admin-disp-name').textContent = admin.fullName;
  const roleBadge = document.getElementById('admin-disp-role');
  roleBadge.textContent = admin.role;
  
  if (admin.role === 'SUPER_ADMIN') {
    roleBadge.className = 'badge bg-danger bg-opacity-25 text-danger small';
  } else if (admin.role === 'ADMIN') {
    roleBadge.className = 'badge bg-primary bg-opacity-25 text-primary small';
  } else if (admin.role === 'REVIEWER') {
    roleBadge.className = 'badge bg-warning bg-opacity-25 text-warning small';
  } else {
    roleBadge.className = 'badge bg-secondary bg-opacity-25 text-light small';
  }

  // Enforce RBAC in UI
  enforceRoleUI(admin.role);

  // Load Dashboard Data
  refreshDashboardStats();
  loadApplicationsTable();
  loadMembersTable();
  loadEventsAndTrainings();
}

function enforceRoleUI(role) {
  const superAdminElements = document.querySelectorAll('.superadmin-only');
  superAdminElements.forEach(el => {
    if (role === 'SUPER_ADMIN') {
      el.classList.remove('d-none');
    } else {
      el.classList.add('d-none');
    }
  });
}



function logoutAdmin() {
  ApiService.adminLogout();
  window.location.reload();
}

function showLoginAlert(msg, type = 'danger') {
  const el = document.getElementById('admin-login-alert');
  el.className = `alert alert-${type} mb-3`;
  el.innerHTML = `<i class="fa-solid fa-triangle-exclamation me-2"></i> ${msg}`;
  el.classList.remove('d-none');
}

function hideLoginAlert() {
  document.getElementById('admin-login-alert').classList.add('d-none');
}

// ================= NAVIGATION =================
function setupNavigation() {
  const navItems = document.querySelectorAll('.admin-nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', function() {
      navItems.forEach(n => n.classList.remove('active'));
      this.classList.add('active');

      const targetTab = this.getAttribute('data-tab');
      document.querySelectorAll('.admin-tab-pane').forEach(pane => {
        pane.classList.add('d-none');
      });

      const selectedPane = document.getElementById(targetTab);
      if (selectedPane) selectedPane.classList.remove('d-none');

      // Refresh specific tab data if clicked
      if (targetTab === 'tab-overview') refreshDashboardStats();
      if (targetTab === 'tab-applications') loadApplicationsTable();
      if (targetTab === 'tab-members') loadMembersTable();
      if (targetTab === 'tab-events') loadEventsAndTrainings();
      if (targetTab === 'tab-admins') loadAdminsTable();
      if (targetTab === 'tab-logs') loadAuditLogs();
      if (targetTab === 'tab-profile') loadAdminProfile();
    });
  });
}

function switchAdminTab(tabId) {
  document.querySelectorAll('.admin-nav-item').forEach(n => n.classList.remove('active'));
  const target = document.querySelector(`.admin-nav-item[data-tab="${tabId}"]`);
  if (target) target.classList.add('active');
  document.querySelectorAll('.admin-tab-pane').forEach(p => p.classList.add('d-none'));
  const pane = document.getElementById(tabId);
  if (pane) pane.classList.remove('d-none');
  if (tabId === 'tab-profile') loadAdminProfile();
}

// ================= TAB 1: OVERVIEW & STATS =================
async function refreshDashboardStats() {
  try {
    const data = await ApiService.getStats();

    // KPIs
    document.getElementById('kpi-total-apps').textContent = data.totalApplications;
    document.getElementById('kpi-pending-apps').textContent = data.statusCounts.Pending || 0;
    document.getElementById('kpi-review-apps').textContent = data.statusCounts['Under Review'] || 0;
    document.getElementById('kpi-approved-apps').textContent = data.statusCounts.Approved || 0;
    document.getElementById('kpi-waitlisted-apps').textContent = data.statusCounts.Waitlisted || 0;
    document.getElementById('kpi-rejected-apps').textContent = data.statusCounts.Rejected || 0;
    document.getElementById('kpi-active-members').textContent = data.totalActiveMembers;
    document.getElementById('kpi-total-admins').textContent = data.totalAdmins;

    // Charts
    renderCharts(data.statusCounts, data.academicYearCounts);

    // Recent activity table
    const actBody = document.getElementById('overview-activity-tbody');
    if (actBody && data.recentActivity) {
      if (data.recentActivity.length === 0) {
        actBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-3">No activity logs recorded yet.</td></tr>';
      } else {
        actBody.innerHTML = data.recentActivity.map(act => {
          const tStr = new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' +
                       new Date(act.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
          return `
            <tr>
              <td class="text-muted small">${tStr}</td>
              <td class="fw-bold text-light">${escapeHtml(act.adminName || 'Admin')}</td>
              <td><span class="badge bg-secondary">${escapeHtml(act.actionType)}</span></td>
              <td>${escapeHtml(act.targetEntity)} <code class="small text-muted">${escapeHtml(act.targetId || '')}</code></td>
              <td class="text-secondary small">${escapeHtml(act.details || '')}</td>
            </tr>
          `;
        }).join('');
      }
    }

  } catch (err) {
    console.warn('Failed to load stats:', err);
  }
}

function renderCharts(statusCounts, yearCounts) {
  // Chart 1: Status Distribution
  const ctxStatus = document.getElementById('chart-status');
  if (ctxStatus) {
    if (statusChartInstance) statusChartInstance.destroy();
    statusChartInstance = new Chart(ctxStatus, {
      type: 'doughnut',
      data: {
        labels: ['Pending', 'Under Review', 'Approved', 'Waitlisted', 'Rejected'],
        datasets: [{
          data: [
            statusCounts.Pending || 0,
            statusCounts['Under Review'] || 0,
            statusCounts.Approved || 0,
            statusCounts.Waitlisted || 0,
            statusCounts.Rejected || 0
          ],
          backgroundColor: ['#F59E0B', '#3B82F6', '#22C55E', '#8B5CF6', '#EF4444'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#94A3B8', font: { family: 'Inter' } } }
        }
      }
    });
  }

  // Chart 2: Academic Year Breakdown
  const ctxYear = document.getElementById('chart-year');
  if (ctxYear) {
    if (yearChartInstance) yearChartInstance.destroy();
    const labels = Object.keys(yearCounts || {});
    const values = labels.map(k => yearCounts[k]);

    yearChartInstance = new Chart(ctxYear, {
      type: 'bar',
      data: {
        labels: labels.length > 0 ? labels : ['الفرقة الأولى', 'الفرقة الثانية', 'الفرقة الثالثة', 'الفرقة الرابعة'],
        datasets: [{
          label: 'Applicants',
          data: values.length > 0 ? values : [0, 0, 0, 0],
          backgroundColor: '#3B82F6',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { ticks: { color: '#94A3B8' }, grid: { display: false } },
          y: { ticks: { color: '#94A3B8', precision: 0 }, grid: { color: 'rgba(255, 255, 255, 0.05)' } }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }
}

// ================= TAB 2: APPLICATIONS MANAGEMENT =================
let cachedApplications = [];

async function loadApplicationsTable() {
  const tbody = document.getElementById('applications-table-body');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4"><span class="spinner-border spinner-border-sm me-2"></span>Loading applications...</td></tr>';

  try {
    const filters = {
      status: document.getElementById('app-filter-status').value,
      department: document.getElementById('app-filter-dept').value,
      academicYear: document.getElementById('app-filter-year').value,
      search: document.getElementById('app-search-input').value.trim()
    };

    cachedApplications = await ApiService.listApplications(filters);

    if (cachedApplications.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">No matching applications found.</td></tr>';
      return;
    }

    tbody.innerHTML = cachedApplications.map(app => {
      const dateStr = new Date(app.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
      return `
        <tr>
          <td>
            <div class="fw-bold text-white">${escapeHtml(app.fullName)}</div>
            <div class="text-muted small">${escapeHtml(app.universityEmail)}</div>
          </td>
          <td><code class="text-primary">${escapeHtml(app.studentId)}</code></td>
          <td>
            <div>${escapeHtml(app.department)}</div>
            <span class="badge bg-secondary small">${escapeHtml(app.academicYear)}</span>
          </td>
          <td><span class="badge bg-dark border border-secondary border-opacity-25">${escapeHtml(app.programmingExperience || 'Beginner')}</span></td>
          <td class="text-muted small">${dateStr}</td>
          <td>${getStatusBadgeHTML(app.status)}</td>
          <td class="small text-secondary">${escapeHtml(app.assignedReviewer || '-')}</td>
          <td class="text-end">
            <button class="btn btn-sm btn-outline-primary" onclick="openApplicationDetails('${app.applicationId}')">
              <i class="fa-solid fa-eye me-1"></i> Review
            </button>
          </td>
        </tr>
      `;
    }).join('');

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger py-4">${escapeHtml(err.message)}</td></tr>`;
  }
}

function setupSearchAndFilters() {
  const appSearch = document.getElementById('app-search-input');
  const appStatus = document.getElementById('app-filter-status');
  const appDept = document.getElementById('app-filter-dept');
  const appYear = document.getElementById('app-filter-year');

  if (appSearch) appSearch.addEventListener('input', debounce(loadApplicationsTable, 300));
  if (appStatus) appStatus.addEventListener('change', loadApplicationsTable);
  if (appDept) appDept.addEventListener('change', loadApplicationsTable);
  if (appYear) appYear.addEventListener('change', loadApplicationsTable);
}

function openApplicationDetails(appId) {
  const app = cachedApplications.find(a => a.applicationId === appId);
  if (!app) return;
  currentSelectedApplication = app;

  const sess = ApiService.getAdminSession();
  const role = sess ? sess.admin.role : 'VIEWER';
  const canDecide = ['SUPER_ADMIN', 'ADMIN'].includes(role);
  const canNote = ['SUPER_ADMIN', 'ADMIN', 'REVIEWER'].includes(role);

  document.getElementById('modal-app-title').innerHTML = `
    <span>مراجعة طلب: ${escapeHtml(app.fullName)}</span>
    <span class="me-2">${getStatusBadgeHTML(app.status)}</span>
  `;

  document.getElementById('modal-app-body').innerHTML = `
    <div class="row g-3 mb-3">
      <div class="col-sm-6">
        <label class="text-muted small">كود الطلب – Application ID</label>
        <div class="fw-bold text-primary font-mono">${app.applicationId}</div>
      </div>
      <div class="col-sm-6">
        <label class="text-muted small">رقم الكارنيه – HTI Student ID</label>
        <div class="fw-bold text-white font-mono">${app.studentId}</div>
      </div>
      <div class="col-sm-6">
        <label class="text-muted small">الإيميل الجامعي – University Email</label>
        <div class="text-light font-mono">${app.universityEmail}</div>
      </div>
      <div class="col-sm-6">
        <label class="text-muted small">رقم الموبايل – Phone</label>
        <div class="text-light font-mono">${app.phoneNumber}</div>
      </div>
      <div class="col-sm-6">
        <label class="text-muted small">القسم والفرقة – Dept & Academic Year</label>
        <div class="text-light">${app.department} &bull; ${app.academicYear}</div>
      </div>
      <div class="col-sm-6">
        <label class="text-muted small">مستوى الخبرة ولغات البرمجة</label>
        <div class="text-light"><strong>${app.programmingExperience}</strong> &bull; <span class="font-mono text-primary">${escapeHtml(app.programmingLanguages)}</span></div>
      </div>
    </div>

    <hr class="border-secondary border-opacity-25">

    <div class="mb-3">
      <label class="text-muted small">الحسابات والبروفايلات التنافسية – Handles & Profiles</label>
      <div class="d-flex gap-2 flex-wrap mt-1">
        ${app.codeforcesUsername ? `<a href="https://codeforces.com/profile/${app.codeforcesUsername}" target="_blank" class="btn btn-sm btn-outline-info font-mono"><i class="fa-solid fa-code ms-1"></i> CF: @${escapeHtml(app.codeforcesUsername)}</a>` : '<span class="badge bg-secondary">No Codeforces</span>'}
        ${app.leetcodeProfile ? `<a href="${app.leetcodeProfile}" target="_blank" class="btn btn-sm btn-outline-warning"><i class="fa-solid fa-bolt ms-1"></i> LeetCode Profile</a>` : ''}
        ${app.githubProfile ? `<a href="${app.githubProfile}" target="_blank" class="btn btn-sm btn-outline-light"><i class="fa-brands fa-github ms-1"></i> GitHub Profile</a>` : ''}
      </div>
    </div>

    <div class="mb-3">
      <label class="text-muted small fw-bold">ليه حابب ينضم للـ Community؟ – Why Join?</label>
      <div class="p-3 rounded bg-dark border border-secondary border-opacity-25 text-light small">${escapeHtml(app.whyJoin || 'لم يُدخل إجابة')}</div>
    </div>

    <div class="row g-2 mb-3">
      <div class="col-md-6">
        <label class="text-muted small fw-bold">الأهداف الشخصية – Personal Goals</label>
        <div class="p-2 rounded bg-dark border border-secondary border-opacity-25 text-light small">${escapeHtml(app.goals || 'لا توجد أهداف مسجلة')}</div>
      </div>
      <div class="col-md-6">
        <label class="text-muted small fw-bold">توقعات الطالب – Expectations</label>
        <div class="p-2 rounded bg-dark border border-secondary border-opacity-25 text-light small">${escapeHtml(app.expectations || 'لا توجد')}</div>
      </div>
    </div>

    <div class="mb-3">
      <label class="text-muted small fw-bold">ملاحظات المراجعة الداخلية (خاصة بالمشرف والمقيّم) – Internal Notes</label>
      <textarea class="form-control" id="modalInternalNotes" rows="2" placeholder="أكتب ملاحظات داخلية على الطالب هنا..." ${!canNote ? 'disabled' : ''}>${escapeHtml(app.internalNotes || '')}</textarea>
    </div>
  `;

  // Render Footer Buttons with RBAC
  const footer = document.getElementById('modal-app-footer');
  if (canDecide) {
    footer.innerHTML = `
      <div class="d-flex gap-2 flex-wrap">
        <button class="btn btn-success" onclick="executeDecision('Approved')">
          <i class="fa-solid fa-check ms-1"></i> قبول الطلب – Approve
        </button>
        <button class="btn btn-warning text-dark" onclick="executeDecision('Waitlisted')">
          <i class="fa-solid fa-clock ms-1"></i> وضع في الانتظار – Waitlist
        </button>
        <button class="btn btn-danger" onclick="executeDecision('Rejected')">
          <i class="fa-solid fa-xmark ms-1"></i> رفض الطلب – Reject
        </button>
        <button class="btn btn-info text-dark" onclick="executeDecision('Under Review')">
          <i class="fa-solid fa-hourglass-half ms-1"></i> قيد المراجعة – Under Review
        </button>
      </div>
      <div>
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إغلاق – Close</button>
      </div>
    `;
  } else if (canNote) {
    footer.innerHTML = `
      <div class="d-flex gap-2">
        <button class="btn btn-info text-dark" onclick="executeDecision('Under Review')">
          <i class="fa-solid fa-hourglass-half ms-1"></i> قيد المراجعة – Mark Under Review
        </button>
        <button class="btn btn-primary" onclick="saveInternalNoteOnly()">
          <i class="fa-solid fa-comment-dots ms-1"></i> حفظ الملاحظة – Save Note
        </button>
      </div>
      <div>
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إغلاق – Close</button>
      </div>
    `;
  } else {
    footer.innerHTML = `
      <span class="text-muted small"><i class="fa-solid fa-eye ms-1"></i> صلاحية اطلاع فقط – Read-only mode</span>
      <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إغلاق – Close</button>
    `;
  }

  const modalEl = new bootstrap.Modal(document.getElementById('appDetailsModal'));
  modalEl.show();
}

async function executeDecision(status) {
  if (!currentSelectedApplication) return;
  const note = document.getElementById('modalInternalNotes').value.trim();

  if (!confirm(`Are you sure you want to mark application ${currentSelectedApplication.applicationId} as "${status}"?`)) {
    return;
  }

  try {
    const res = await ApiService.updateApplicationStatus(
      currentSelectedApplication.applicationId,
      status,
      note
    );

    const statusAr = { 'Approved': '✅ تم قبول الطلب', 'Rejected': '❌ تم رفض الطلب', 'Under Review': '🔍 قيد المراجعة', 'Waitlisted': '⏳ في قائمة الانتظار' };
    showToast(statusAr[status] || `تم تحديث الحالة إلى "${status}"`, status === 'Approved' ? 'success' : status === 'Rejected' ? 'error' : 'info');
    
    // Close modal
    const modalEl = bootstrap.Modal.getInstance(document.getElementById('appDetailsModal'));
    if (modalEl) modalEl.hide();

    // Refresh UI
    loadApplicationsTable();
    refreshDashboardStats();
    loadMembersTable();

  } catch (err) {
    showToast('فشل تحديث حالة الطلب: ' + err.message, 'error');
  }
}

async function saveInternalNoteOnly() {
  if (!currentSelectedApplication) return;
  const note = document.getElementById('modalInternalNotes').value.trim();
  try {
    await ApiService.updateApplicationStatus(
      currentSelectedApplication.applicationId,
      currentSelectedApplication.status,
      note
    );
    showToast('تم حفظ الملاحظة الداخلية بنجاح ✏️', 'info');
    const modalEl = bootstrap.Modal.getInstance(document.getElementById('appDetailsModal'));
    if (modalEl) modalEl.hide();
    loadApplicationsTable();
  } catch (err) {
    showToast('فشل حفظ الملاحظة: ' + err.message, 'error');
  }
}

// ================= TAB 3: MEMBERS DIRECTORY =================
let cachedMembers = [];

async function loadMembersTable() {
  const tbody = document.getElementById('members-table-body');
  if (!tbody) return;

  try {
    const filters = {
      status: document.getElementById('mem-filter-status') ? document.getElementById('mem-filter-status').value : 'ALL',
      level: document.getElementById('mem-filter-level') ? document.getElementById('mem-filter-level').value : 'ALL',
      search: document.getElementById('mem-search-input') ? document.getElementById('mem-search-input').value.trim() : ''
    };

    const phaseFilter = document.getElementById('mem-filter-phase') ? document.getElementById('mem-filter-phase').value : 'ALL';
    const phaseStatusFilter = document.getElementById('mem-filter-phase-status') ? document.getElementById('mem-filter-phase-status').value : 'ALL';

    let list = await ApiService.listMembers(filters);

    if (phaseFilter !== 'ALL') {
      list = list.filter(m => (m.currentPhase || 'المرحلة 1') === phaseFilter);
    }
    if (phaseStatusFilter !== 'ALL') {
      list = list.filter(m => (m.phaseStatus || 'ACTIVE') === phaseStatusFilter);
    }

    cachedMembers = list;

    if (cachedMembers.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted py-4">لا توجد بيانات أعضاء مطابقة للفلتر.</td></tr>';
      return;
    }

    const sess = ApiService.getAdminSession();
    const canManage = sess && ['SUPER_ADMIN', 'ADMIN'].includes(sess.admin.role);

    tbody.innerHTML = cachedMembers.map(m => {
      const isAct = m.memberStatus === 'Active';
      const curPhase = m.currentPhase || 'المرحلة 1';
      const phaseSt = m.phaseStatus || 'ACTIVE';

      let phaseBadge = `<span class="badge bg-info bg-opacity-25 text-info">${escapeHtml(curPhase)}</span>`;
      let qualBadge = '';
      if (phaseSt === 'QUALIFIED') {
        qualBadge = `<span class="badge bg-success bg-opacity-25 text-success"><i class="fa-solid fa-check ms-1"></i>مؤهل للمرحلة التالية</span>`;
      } else if (phaseSt === 'ELIMINATED') {
        qualBadge = `<span class="badge bg-danger bg-opacity-25 text-danger"><i class="fa-solid fa-xmark ms-1"></i>لم يجتز التصفية</span>`;
      } else {
        qualBadge = `<span class="badge bg-warning bg-opacity-25 text-warning"><i class="fa-solid fa-hourglass-half ms-1"></i>مستمر في التدريب</span>`;
      }

      if (m.phaseScore) {
        qualBadge += `<div class="small text-muted font-mono mt-1">السكور: ${escapeHtml(m.phaseScore)}</div>`;
      }

      return `
        <tr>
          <td><code class="text-primary">${escapeHtml(m.memberId)}</code></td>
          <td>
            <div class="fw-bold text-white">${escapeHtml(m.fullName)}</div>
            <div class="text-muted small">${escapeHtml(m.universityEmail)}</div>
          </td>
          <td><code>${escapeHtml(m.studentId)}</code></td>
          <td>${phaseBadge}</td>
          <td>${qualBadge}</td>
          <td><span class="badge bg-primary bg-opacity-25 text-primary">${escapeHtml(m.assignedLevel || 'Level 0')}</span></td>
          <td>${m.codeforcesHandle ? `<a href="https://codeforces.com/profile/${m.codeforcesHandle}" target="_blank" class="small text-info">@${escapeHtml(m.codeforcesHandle)}</a>` : '<span class="text-muted small">None</span>'}</td>
          <td>
            <span class="badge ${isAct ? 'bg-success' : 'bg-secondary'}">${escapeHtml(m.memberStatus)}</span>
          </td>
          <td class="text-end">
            ${canManage ? `
              <div class="d-flex justify-content-end gap-1">
                <button class="btn btn-sm btn-outline-warning" onclick="openMemberPhaseModal('${m.memberId}')" title="إدارة المرحلة والتصفية">
                  <i class="fa-solid fa-stairs"></i> تصفية
                </button>
                <button class="btn btn-sm ${isAct ? 'btn-outline-secondary' : 'btn-outline-success'}" onclick="toggleMemberActive('${m.memberId}', '${isAct ? 'Inactive' : 'Active'}')" title="${isAct ? 'تعطيل الحساب مؤقتاً' : 'تفعيل'}">
                  <i class="fa-solid fa-${isAct ? 'ban' : 'check'}"></i>
                </button>
                ${sess && sess.admin.role === 'SUPER_ADMIN' ? `
                  <button class="btn btn-sm btn-outline-danger" onclick="deleteMemberAccount('${m.memberId}', '${escapeHtml(m.fullName)}')" title="حذف حساب الطالب نهائياً من المنصة">
                    <i class="fa-solid fa-trash"></i>
                  </button>
                ` : ''}
              </div>
            ` : '<span class="text-muted small">View Only</span>'}
          </td>
        </tr>
      `;
    }).join('');

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="9" class="text-center text-danger py-4">${escapeHtml(err.message)}</td></tr>`;
  }
}

function openMemberPhaseModal(memberId) {
  const m = cachedMembers.find(x => x.memberId === memberId || x.studentId === memberId);
  if (!m) return;

  document.getElementById('phaseMemberId').value = m.memberId;
  document.getElementById('phaseStudentName').textContent = m.fullName;
  document.getElementById('phaseStudentId').textContent = m.studentId;

  const phaseSelect = document.getElementById('phaseSelect');
  const customPhaseInput = document.getElementById('customPhaseInput');
  const currentPhase = m.currentPhase || 'المرحلة 1';

  let found = false;
  for (let opt of phaseSelect.options) {
    if (opt.value === currentPhase) {
      opt.selected = true;
      found = true;
      break;
    }
  }
  if (!found) {
    phaseSelect.value = 'CUSTOM';
    customPhaseInput.value = currentPhase;
    customPhaseInput.classList.remove('d-none');
  } else {
    customPhaseInput.classList.add('d-none');
  }

  document.getElementById('phaseStatusSelect').value = m.phaseStatus || 'ACTIVE';
  document.getElementById('phaseScoreInput').value = m.phaseScore || '';
  document.getElementById('phaseNotesInput').value = m.phaseNotes || '';
  document.getElementById('phaseLevelSelect').value = m.assignedLevel || '';

  const modalEl = document.getElementById('memberPhaseModal');
  if (modalEl) {
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  }
}

// Setup Phase Select custom handler
document.addEventListener('DOMContentLoaded', function() {
  const phaseSelect = document.getElementById('phaseSelect');
  const customPhaseInput = document.getElementById('customPhaseInput');
  if (phaseSelect && customPhaseInput) {
    phaseSelect.addEventListener('change', function() {
      if (this.value === 'CUSTOM') {
        customPhaseInput.classList.remove('d-none');
        customPhaseInput.focus();
      } else {
        customPhaseInput.classList.add('d-none');
      }
    });
  }

  const phaseForm = document.getElementById('member-phase-form');
  if (phaseForm) {
    phaseForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const memberId = document.getElementById('phaseMemberId').value;
      const selectVal = document.getElementById('phaseSelect').value;
      const phaseVal = selectVal === 'CUSTOM' ? document.getElementById('customPhaseInput').value.trim() : selectVal;

      if (!phaseVal) {
        showToast('⚠️ يرجى تحديد أو كتابة اسم المرحلة.', 'warning');
        return;
      }

      const saveBtn = document.getElementById('btn-save-phase');
      saveBtn.disabled = true;

      const phaseData = {
        phase: phaseVal,
        phaseStatus: document.getElementById('phaseStatusSelect').value,
        score: document.getElementById('phaseScoreInput').value.trim(),
        notes: document.getElementById('phaseNotesInput').value.trim(),
        level: document.getElementById('phaseLevelSelect').value || null
      };

      try {
        await ApiService.updateMemberPhase(memberId, phaseData);

        // Show success toast with member name and new phase
        const memberName = document.getElementById('phaseStudentName').textContent;
        const phaseStatusAr = { 'ACTIVE': 'نشط', 'QUALIFIED': 'مؤهل ✅', 'ELIMINATED': 'لم يتأهل', 'PENDING_EXAM': 'بانتظار الامتحان' };
        showToast(`🎉 تم ترقية <strong>${memberName}</strong> إلى <strong>${phaseVal}</strong> — الحالة: ${phaseStatusAr[phaseData.phaseStatus] || phaseData.phaseStatus}`, 'success', 5000);

        const modalEl = document.getElementById('memberPhaseModal');
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (modalInstance) modalInstance.hide();

        loadMembersTable();
      } catch (err) {
        showToast('فشل تحديث المرحلة: ' + err.message, 'error');
      } finally {
        saveBtn.disabled = false;
      }
    });
  }
});

async function toggleMemberActive(memberId, newStatus) {
  if (!confirm(`Set member ${memberId} status to "${newStatus}"?`)) return;
  try {
    await ApiService.updateMemberStatus(memberId, newStatus);
    loadMembersTable();
    refreshDashboardStats();
  } catch (err) {
    showToast('فشل تحديث حالة العضو: ' + err.message, 'error');
  }
}

// ================= TAB 4: EVENTS & TRAININGS =================
let cachedAdminTrainings = [];
let cachedAdminEvents = [];

async function loadEventsAndTrainings() {
  const trainContainer = document.getElementById('admin-trainings-list');
  const evContainer = document.getElementById('admin-events-list');

  try {
    let data;
    try {
      data = await ApiService.getAdminEventsAndTrainings();
    } catch (e) {
      data = await ApiService.getPublicData();
    }

    cachedAdminTrainings = data.trainings || [];
    cachedAdminEvents = data.events || [];

    if (trainContainer) {
      if (!cachedAdminTrainings || cachedAdminTrainings.length === 0) {
        trainContainer.innerHTML = '<p class="text-muted small p-3">لا توجد سيشنات تدريبية مضافة حالياً.</p>';
      } else {
        trainContainer.innerHTML = cachedAdminTrainings.map(t => {
          const isCompleted = t.status === 'Completed';
          const statusBadge = isCompleted
            ? `<span class="badge bg-secondary bg-opacity-50 text-light border border-secondary border-opacity-50"><i class="fa-solid fa-circle-check ms-1"></i>مكتملة (مخفية)</span>`
            : `<span class="badge bg-success bg-opacity-25 text-success border border-success border-opacity-30"><i class="fa-solid fa-clock ms-1"></i>قادمة (نشطة)</span>`;

          const completeBtn = !isCompleted
            ? `<button class="btn btn-sm btn-outline-success" onclick="completeTrainingAction('${t.sessionId}')" title="تحديد كـ مكتملة وإخفائها من الطلاب">
                 <i class="fa-solid fa-check ms-1"></i>إنهاء
               </button>`
            : '';

          return `
            <div class="dashboard-item-card mb-2 ${isCompleted ? 'opacity-75' : ''}">
              <div class="d-flex justify-content-between align-items-center mb-1 flex-wrap gap-1">
                <div class="d-flex align-items-center gap-1">
                  <span class="badge bg-primary bg-opacity-25 text-primary border border-primary border-opacity-30">${escapeHtml(t.level || 'All')}</span>
                  ${statusBadge}
                </div>
                <span class="small text-light text-opacity-75">${new Date(t.dateTime).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <h5 class="h6 text-white fw-bold mb-1">${escapeHtml(t.title)}</h5>
              <div class="small text-light text-opacity-80 d-flex justify-content-between align-items-center mt-2 pt-2 border-top border-light border-opacity-10 flex-wrap gap-2">
                <div>
                  <span class="me-3"><i class="fa-solid fa-chalkboard-user text-primary me-1"></i> ${escapeHtml(t.instructor)}</span>
                  <span class="location-badge"><i class="fa-solid fa-location-dot ms-1"></i> ${escapeHtml(t.location)}</span>
                </div>
                <div class="d-flex gap-1">
                  ${completeBtn}
                  <button class="btn btn-sm btn-outline-danger" onclick="deleteTrainingAction('${t.sessionId}')" title="حذف السيشن التدريبية نهائياً">
                    <i class="fa-solid fa-trash"></i>
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    if (evContainer) {
      if (!cachedAdminEvents || cachedAdminEvents.length === 0) {
        evContainer.innerHTML = '<p class="text-muted small p-3">لا توجد مسابقات مضافة حالياً.</p>';
      } else {
        evContainer.innerHTML = cachedAdminEvents.map(ev => {
          const isPast = ev.status === 'Past';
          const statusBadge = isPast
            ? `<span class="badge bg-secondary bg-opacity-50 text-light border border-secondary border-opacity-50"><i class="fa-solid fa-flag-checkered ms-1"></i>انتهت (مخفية)</span>`
            : `<span class="badge bg-warning bg-opacity-25 text-warning border border-warning border-opacity-30"><i class="fa-solid fa-bolt ms-1"></i>قادمة (نشطة)</span>`;

          const completeBtn = !isPast
            ? `<button class="btn btn-sm btn-outline-success" onclick="completeEventAction('${ev.eventId}')" title="تحديد كـ انتهت وإخفائها من الموقع">
                 <i class="fa-solid fa-flag-checkered ms-1"></i>إنهاء المسابقة
               </button>`
            : '';

          return `
            <div class="dashboard-item-card mb-2 ${isPast ? 'opacity-75' : ''}">
              <div class="d-flex justify-content-between align-items-center mb-1 flex-wrap gap-1">
                <div class="d-flex align-items-center gap-1">
                  <span class="badge bg-warning bg-opacity-25 text-warning border border-warning border-opacity-30">${escapeHtml(ev.type)}</span>
                  ${statusBadge}
                </div>
                <span class="small text-light text-opacity-75">${new Date(ev.startDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
              </div>
              <h5 class="h6 text-white fw-bold mb-1">${escapeHtml(ev.title)}</h5>
              <div class="small text-light text-opacity-80 d-flex justify-content-between align-items-center mt-2 pt-2 border-top border-light border-opacity-10 flex-wrap gap-2">
                <span class="location-badge-event"><i class="fa-solid fa-location-dot ms-1"></i> ${escapeHtml(ev.location)}</span>
                <div class="d-flex gap-1">
                  ${completeBtn}
                  <button class="btn btn-sm btn-outline-danger" onclick="deleteEventAction('${ev.eventId}')" title="حذف المسابقة نهائياً">
                    <i class="fa-solid fa-trash"></i>
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join('');
      }
    }

  } catch (err) {
    console.warn(err);
  }
}

async function deleteTrainingAction(sessionId) {
  const t = cachedAdminTrainings.find(x => x.sessionId === sessionId);
  const title = t ? t.title : sessionId;
  if (!confirm(`هل أنت متأكد من حذف السيشن التدريبية "${title}" نهائياً من النظام؟`)) return;
  try {
    await ApiService.deleteTraining(sessionId);
    showToast(`تم حذف السيشن التدريبية "${title}" بنجاح 🗑️`, 'success');
    loadEventsAndTrainings();
  } catch (err) {
    showToast('فشل حذف السيشن التدريبية: ' + err.message, 'error');
  }
}

async function completeTrainingAction(sessionId) {
  const t = cachedAdminTrainings.find(x => x.sessionId === sessionId);
  const title = t ? t.title : sessionId;
  if (!confirm(`هل أنت متأكد من تعليم السيشن التدريبية "${title}" كمكتملة؟\nلن تظهر للطلاب في الصفحة الرئيسية أو البوابة.`)) return;
  try {
    await ApiService.completeTraining(sessionId);
    showToast(`تم إنهاء السيشن "${title}" وتحديدها كمكتملة ✅`, 'success');
    loadEventsAndTrainings();
  } catch (err) {
    showToast('فشل تحديث حالة السيشن: ' + err.message, 'error');
  }
}

async function deleteEventAction(eventId) {
  const ev = cachedAdminEvents.find(x => x.eventId === eventId);
  const title = ev ? ev.title : eventId;
  if (!confirm(`هل أنت متأكد من حذف المسابقة "${title}" نهائياً من النظام؟`)) return;
  try {
    await ApiService.deleteEvent(eventId);
    showToast(`تم حذف المسابقة "${title}" بنجاح 🗑️`, 'success');
    loadEventsAndTrainings();
  } catch (err) {
    showToast('فشل حذف المسابقة: ' + err.message, 'error');
  }
}

async function completeEventAction(eventId) {
  const ev = cachedAdminEvents.find(x => x.eventId === eventId);
  const title = ev ? ev.title : eventId;
  if (!confirm(`هل أنت متأكد من تعليم المسابقة "${title}" كمنتهية؟\nستختفي تلقائياً من قائمة المسابقات القادمة في الموقع.`)) return;
  try {
    await ApiService.completeEvent(eventId);
    showToast(`تم إنهاء المسابقة "${title}" بنجاح وإخفائها من المسابقات القادمة 🏁`, 'success');
    loadEventsAndTrainings();
  } catch (err) {
    showToast('فشل تحديث حالة المسابقة: ' + err.message, 'error');
  }
}

// ================= TAB 5: MANAGE ADMINS (Super Admin only) =================
async function loadAdminsTable() {
  const tbody = document.getElementById('admins-table-body');
  if (!tbody) return;

  try {
    const admins = await ApiService.listAdmins();
    const currentSess = ApiService.getAdminSession();

    tbody.innerHTML = admins.map(a => {
      const isSelf = currentSess && currentSess.admin.adminId === a.adminId;
      const isAct = a.status === 'Active';
      return `
        <tr>
          <td><code class="text-primary">${escapeHtml(a.adminId)}</code></td>
          <td class="fw-bold text-white">${escapeHtml(a.fullName)} ${isSelf ? '<span class="badge bg-primary ms-1">You</span>' : ''}</td>
          <td>${escapeHtml(a.email)}</td>
          <td><span class="badge ${a.role === 'SUPER_ADMIN' ? 'bg-danger' : a.role === 'ADMIN' ? 'bg-primary' : 'bg-warning text-dark'}">${escapeHtml(a.role)}</span></td>
          <td><span class="badge ${isAct ? 'bg-success' : 'bg-secondary'}">${escapeHtml(a.status)}</span></td>
          <td class="text-muted small">${a.lastLogin ? new Date(a.lastLogin).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never'}</td>
          <td class="text-end">
            ${!isSelf ? `
              <div class="d-flex justify-content-end gap-1">
                <button class="btn btn-sm ${isAct ? 'btn-outline-warning' : 'btn-outline-success'}" onclick="toggleAdminStatus('${a.adminId}', '${isAct ? 'Inactive' : 'Active'}')" title="${isAct ? 'تعطيل الحساب' : 'تفعيل الحساب'}">
                  ${isAct ? 'Deactivate' : 'Activate'}
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteAdminAccount('${a.adminId}', '${escapeHtml(a.fullName)}')" title="حذف حساب المشرف نهائياً">
                  <i class="fa-solid fa-trash ms-1"></i> حذف
                </button>
              </div>
            ` : '<span class="text-muted small">Current User</span>'}
          </td>
        </tr>
      `;
    }).join('');

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">${escapeHtml(err.message)}</td></tr>`;
  }
}

async function toggleAdminStatus(adminId, status) {
  if (!confirm(`تأكيد تغيير حالة المشرف إلى "${status}"؟`)) return;
  try {
    await ApiService.updateAdmin(adminId, { status: status });
    loadAdminsTable();
  } catch (err) {
    showToast('فشل تحديث حالة المشرف: ' + err.message, 'error');
  }
}

async function deleteAdminAccount(adminId, adminName) {
  if (!confirm(`هل أنت متأكد من حذف حساب الأدمن "${adminName}" نهائياً من النظام؟ لا يمكن التراجع عن هذا الإجراء.`)) return;
  try {
    await ApiService.deleteAdmin(adminId);
    showToast(`تم حذف حساب الأدمن "${adminName}" بنجاح 🗑️`, 'success');
    loadAdminsTable();
  } catch (err) {
    showToast('فشل حذف حساب الأدمن: ' + err.message, 'error');
  }
}

async function deleteMemberAccount(memberId, memberName) {
  if (!confirm(`تحذير هام: هل أنت متأكد من حذف حساب الطالب "${memberName}" نهائياً من قاعدة البيانات والمنصة؟`)) return;
  try {
    await ApiService.deleteMember(memberId);
    showToast(`تم حذف حساب الطالب "${memberName}" بنجاح 🗑️`, 'success');
    loadMembersTable();
  } catch (err) {
    showToast('فشل حذف حساب الطالب: ' + err.message, 'error');
  }
}

// ================= TAB 6: AUDIT ACTIVITY LOGS =================
async function loadAuditLogs() {
  const tbody = document.getElementById('logs-table-body');
  if (!tbody) return;

  try {
    const logs = await ApiService.listLogs();
    if (logs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No audit logs found.</td></tr>';
      return;
    }

    tbody.innerHTML = logs.map(l => {
      const tStr = new Date(l.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      return `
        <tr>
          <td class="text-muted small">${tStr}</td>
          <td class="fw-bold text-white">${escapeHtml(l.adminName)}</td>
          <td><span class="badge bg-secondary">${escapeHtml(l.actionType)}</span></td>
          <td>${escapeHtml(l.targetEntity)}</td>
          <td><code>${escapeHtml(l.targetId || '-')}</code></td>
          <td class="text-secondary small">${escapeHtml(l.details)}</td>
        </tr>
      `;
    }).join('');

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">${escapeHtml(err.message)}</td></tr>`;
  }
}

async function clearAuditLogsConfirm() {
  if (!confirm('هل أنت متأكد من رغبتك في تفريغ ومسح سجل العمليات والأمان بالكامل؟\nسيتم مسح جميع السجلات والبدء من الصفر.')) return;
  try {
    await ApiService.clearLogs();
    showToast('تم تفريغ سجل العمليات بنجاح والبدء من الصفر! 🧹', 'success');
    loadAuditLogs();
  } catch (err) {
    showToast('فشل تفريغ السجل: ' + err.message, 'error');
  }
}

// ================= MODALS & FORMS SETUP =================
function setupModalsAndForms() {
  // Create Admin Form
  const createAdminForm = document.getElementById('create-admin-form');
  if (createAdminForm) {
    createAdminForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const data = {
        fullName: document.getElementById('newAdminName').value.trim(),
        email: document.getElementById('newAdminEmail').value.trim(),
        password: document.getElementById('newAdminPassword').value,
        role: document.getElementById('newAdminRole').value
      };
      try {
        await ApiService.createAdmin(data);
        showToast('تم إنشاء حساب المشرف الجديد بنجاح! 🛡️', 'success');
        const modal = bootstrap.Modal.getInstance(document.getElementById('newAdminModal'));
        if (modal) modal.hide();
        createAdminForm.reset();
        loadAdminsTable();
      } catch (err) {
        showToast('فشل إنشاء حساب المشرف: ' + err.message, 'error');
      }
    });
  }

  // Create Training Form
  const createTrainForm = document.getElementById('create-training-form');
  if (createTrainForm) {
    createTrainForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const data = {
        title: document.getElementById('trainTitle').value.trim(),
        level: document.getElementById('trainLevel').value,
        instructor: document.getElementById('trainInstructor').value.trim(),
        dateTime: new Date(document.getElementById('trainDateTime').value).toISOString(),
        location: document.getElementById('trainLocation').value.trim(),
        description: document.getElementById('trainDesc').value.trim()
      };
      try {
        await ApiService.createTraining(data);
        showToast('تم نشر جلسة التدريب بنجاح! 📚', 'success');
        const modal = bootstrap.Modal.getInstance(document.getElementById('newTrainingModal'));
        if (modal) modal.hide();
        createTrainForm.reset();
        loadEventsAndTrainings();
      } catch (err) {
        showToast('فشل نشر جلسة التدريب: ' + err.message, 'error');
      }
    });
  }

  // Create Event Form
  const createEvForm = document.getElementById('create-event-form');
  if (createEvForm) {
    createEvForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const data = {
        title: document.getElementById('evTitle').value.trim(),
        type: document.getElementById('evType').value,
        location: document.getElementById('evLocation').value.trim(),
        startDate: new Date(document.getElementById('evStart').value).toISOString(),
        endDate: new Date(document.getElementById('evEnd').value).toISOString(),
        description: document.getElementById('evDesc').value.trim()
      };
      try {
        await ApiService.createEvent(data);
        showToast('تم نشر الحدث بنجاح! 🏆', 'success');
        const modal = bootstrap.Modal.getInstance(document.getElementById('newEventModal'));
        if (modal) modal.hide();
        createEvForm.reset();
        loadEventsAndTrainings();
      } catch (err) {
        showToast('فشل نشر الحدث: ' + err.message, 'error');
      }
    });
  }
}

// ================= CSV EXPORT UTILITIES =================
function exportApplicationsCSV() {
  if (cachedApplications.length === 0) {
    showToast('لا توجد طلبات للتصدير.', 'warning');
    return;
  }
  const headers = ['Application ID', 'Full Name', 'Student ID', 'Email', 'Phone', 'Department', 'Year', 'Experience', 'Codeforces', 'Status', 'Submitted At'];
  const rows = cachedApplications.map(a => [
    a.applicationId,
    `"${a.fullName.replace(/"/g, '""')}"`,
    a.studentId,
    a.universityEmail,
    a.phoneNumber,
    a.department,
    a.academicYear,
    a.programmingExperience,
    a.codeforcesUsername,
    a.status,
    a.createdAt
  ]);
  downloadCSV('HTI_ICPC_Applications.csv', [headers, ...rows]);
}

function exportMembersCSV() {
  if (cachedMembers.length === 0) {
    showToast('لا يوجد أعضاء للتصدير.', 'warning');
    return;
  }
  const headers = ['Member ID', 'Full Name', 'Student ID', 'Email', 'Phone', 'Department', 'Year', 'Level', 'Codeforces', 'Status', 'Joined Date'];
  const rows = cachedMembers.map(m => [
    m.memberId,
    `"${m.fullName.replace(/"/g, '""')}"`,
    m.studentId,
    m.universityEmail,
    m.phoneNumber,
    m.department,
    m.academicYear,
    m.assignedLevel,
    m.codeforcesHandle,
    m.memberStatus,
    m.joinedDate
  ]);
  downloadCSV('HTI_ICPC_Members.csv', [headers, ...rows]);
}

function downloadCSV(filename, rows) {
  const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Helpers
function getStatusBadgeHTML(status) {
  switch (status) {
    case 'Approved':
      return '<span class="badge-custom badge-approved"><i class="fa-solid fa-circle-check ms-1"></i> تم القبول – Approved</span>';
    case 'Under Review':
      return '<span class="badge-custom badge-review"><i class="fa-solid fa-hourglass-half ms-1"></i> قيد المراجعة – Under Review</span>';
    case 'Waitlisted':
      return '<span class="badge-custom badge-waitlisted"><i class="fa-solid fa-clock ms-1"></i> قائمة الانتظار – Waitlisted</span>';
    case 'Rejected':
      return '<span class="badge-custom badge-rejected"><i class="fa-solid fa-circle-xmark ms-1"></i> مرفوض – Rejected</span>';
    default:
      return '<span class="badge-custom badge-pending"><i class="fa-solid fa-paper-plane ms-1"></i> في الانتظار – Pending</span>';
  }
}

function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ================= GAS STATUS INDICATOR =================
function initGasStatusUI() {
  const indicator = document.getElementById('gas-status-indicator');
  if (indicator) {
    indicator.innerHTML = '<span class="live-pulse-dot"></span><span class="font-mono fw-bold">Live</span>';
  }
}

// ================= PASSWORD VISIBILITY TOGGLES =================
function initPasswordToggles() {
  document.querySelectorAll('.toggle-pwd-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      const targetId = this.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (!input) return;

      const icon = this.querySelector('i');
      if (input.type === 'password') {
        input.type = 'text';
        if (icon) {
          icon.classList.remove('fa-eye');
          icon.classList.add('fa-eye-slash');
        }
      } else {
        input.type = 'password';
        if (icon) {
          icon.classList.remove('fa-eye-slash');
          icon.classList.add('fa-eye');
        }
      }
    });
  });
}

// ================= TAB 7: ADMIN SELF PROFILE =================
let _adminProfileData = null;

async function loadAdminProfile() {
  try {
    const sess = ApiService.getAdminSession();
    if (!sess) return;

    // Seed from cached session immediately (0ms)
    renderAdminProfile(sess.admin);

    // Fetch fresh data from server in background
    const fresh = await ApiService.getAdminProfile();
    renderAdminProfile(fresh);
    _adminProfileData = fresh;
  } catch (err) {
    console.warn('Could not refresh admin profile from server:', err.message);
  }
}

function renderAdminProfile(admin) {
  if (!admin) return;

  const setTxt = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.textContent = (v && v !== '') ? v : '—';
  };

  setTxt('profile-disp-name', admin.fullName);
  setTxt('profile-disp-email', admin.email);
  setTxt('profile-disp-id', admin.adminId);
  setTxt('profile-disp-title', admin.title || 'لا يوجد مسمى وظيفي');

  const roleBadge = document.getElementById('profile-disp-role');
  if (roleBadge) {
    roleBadge.textContent = admin.role || '—';
    if (admin.role === 'SUPER_ADMIN') roleBadge.className = 'badge bg-danger mb-2';
    else if (admin.role === 'ADMIN') roleBadge.className = 'badge bg-primary mb-2';
    else if (admin.role === 'REVIEWER') roleBadge.className = 'badge bg-warning text-dark mb-2';
    else roleBadge.className = 'badge bg-secondary mb-2';
  }

  const fmtDate = (d) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('ar-EG', { year:'numeric', month:'short', day:'numeric' }); }
    catch(e) { return String(d).substring(0, 10); }
  };
  setTxt('profile-disp-created', fmtDate(admin.createdAt));
  setTxt('profile-disp-lastlogin', fmtDate(admin.lastLogin));

  // Populate the edit form fields
  const setVal = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.value = v || '';
  };
  setVal('prof-fullname', admin.fullName);
  setVal('prof-title', admin.title);
  setVal('prof-email', admin.email);
  setVal('prof-phone', admin.phoneNumber);
  setVal('prof-cf', admin.codeforcesHandle);
  setVal('prof-github', admin.githubProfile);
  setVal('prof-discord', admin.discordUsername);
}

function setupAdminProfileForms() {
  const profileForm = document.getElementById('admin-profile-form');
  const pwdForm = document.getElementById('admin-change-pwd-form');

  if (profileForm) {
    profileForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const btn = document.getElementById('btn-save-admin-profile');
      const txt = document.getElementById('save-admin-profile-text');
      const spin = document.getElementById('save-admin-profile-spinner');
      const alertEl = document.getElementById('admin-profile-alert');

      btn.disabled = true;
      txt.classList.add('d-none');
      spin.classList.remove('d-none');
      alertEl.classList.add('d-none');

      const updates = {
        fullName: document.getElementById('prof-fullname').value.trim(),
        email: document.getElementById('prof-email').value.trim(),
        title: document.getElementById('prof-title').value.trim(),
        phoneNumber: document.getElementById('prof-phone').value.trim(),
        codeforcesHandle: document.getElementById('prof-cf').value.trim(),
        githubProfile: document.getElementById('prof-github').value.trim(),
        discordUsername: document.getElementById('prof-discord').value.trim()
      };

      if (!updates.fullName || !updates.email) {
        alertEl.className = 'alert alert-warning mb-3';
        alertEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation ms-1"></i> الاسم والبريد الإلكتروني مطلوبان.';
        alertEl.classList.remove('d-none');
        btn.disabled = false;
        txt.classList.remove('d-none');
        spin.classList.add('d-none');
        return;
      }

      try {
        const updated = await ApiService.updateAdminProfile(updates);
        renderAdminProfile(updated);

        // Update displayed name in navbar/header
        const nameEl = document.getElementById('admin-disp-name');
        if (nameEl) nameEl.textContent = updated.fullName || updates.fullName;

        alertEl.className = 'alert alert-success mb-3';
        alertEl.innerHTML = '<i class="fa-solid fa-circle-check ms-1"></i> تم حفظ بياناتك بنجاح!';
        alertEl.classList.remove('d-none');
        setTimeout(() => alertEl.classList.add('d-none'), 3000);
      } catch (err) {
        alertEl.className = 'alert alert-danger mb-3';
        alertEl.innerHTML = `<i class="fa-solid fa-circle-xmark ms-1"></i> ${err.message || 'فشل حفظ البيانات'}`;
        alertEl.classList.remove('d-none');
      } finally {
        btn.disabled = false;
        txt.classList.remove('d-none');
        spin.classList.add('d-none');
      }
    });
  }

  if (pwdForm) {
    pwdForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const btn = document.getElementById('btn-change-pwd');
      const txt = document.getElementById('change-pwd-text');
      const spin = document.getElementById('change-pwd-spinner');
      const alertEl = document.getElementById('admin-pwd-alert');

      const currentPassword = document.getElementById('prof-cur-pwd').value;
      const newPassword = document.getElementById('prof-new-pwd').value;
      const confirmPassword = document.getElementById('prof-confirm-pwd').value;

      if (!currentPassword || !newPassword || !confirmPassword) {
        alertEl.className = 'alert alert-warning mb-3';
        alertEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation ms-1"></i> يرجى ملء جميع حقول كلمة المرور.';
        alertEl.classList.remove('d-none');
        return;
      }

      if (newPassword !== confirmPassword) {
        alertEl.className = 'alert alert-warning mb-3';
        alertEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation ms-1"></i> كلمة المرور الجديدة وتأكيدها غير متطابقتين.';
        alertEl.classList.remove('d-none');
        return;
      }

      if (newPassword.length < 6) {
        alertEl.className = 'alert alert-warning mb-3';
        alertEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation ms-1"></i> كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل.';
        alertEl.classList.remove('d-none');
        return;
      }

      btn.disabled = true;
      txt.classList.add('d-none');
      spin.classList.remove('d-none');
      alertEl.classList.add('d-none');

      try {
        await ApiService.updateAdminProfile({ currentPassword, newPassword });

        alertEl.className = 'alert alert-success mb-3';
        alertEl.innerHTML = '<i class="fa-solid fa-circle-check ms-1"></i> تم تغيير كلمة المرور بنجاح!';
        alertEl.classList.remove('d-none');

        document.getElementById('prof-cur-pwd').value = '';
        document.getElementById('prof-new-pwd').value = '';
        document.getElementById('prof-confirm-pwd').value = '';

        setTimeout(() => alertEl.classList.add('d-none'), 3500);
      } catch (err) {
        alertEl.className = 'alert alert-danger mb-3';
        alertEl.innerHTML = `<i class="fa-solid fa-circle-xmark ms-1"></i> ${err.message || 'فشل تغيير كلمة المرور'}`;
        alertEl.classList.remove('d-none');
      } finally {
        btn.disabled = false;
        txt.classList.remove('d-none');
        spin.classList.add('d-none');
      }
    });
  }
}

