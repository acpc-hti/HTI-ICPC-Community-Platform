/**
 * HTI ICPC Community Platform - Main Landing Page Script
 */

// Instant 0ms Navbar Auth Sync
updateNavbarAuthState();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    updateNavbarAuthState();
    loadPublicData();
  });
} else {
  loadPublicData();
}

async function loadPublicData() {
  const eventsContainer = document.getElementById('events-container');
  const annContainer = document.getElementById('announcements-container');

  try {
    const data = await ApiService.getPublicData();

    // Update Stats counters if available
    if (data.stats) {
      const appsEl = document.getElementById('stat-apps');
      const memsEl = document.getElementById('stat-members');
      const trnEl = document.getElementById('stat-trainings');
      const evsEl = document.getElementById('stat-events');

      if (appsEl) appsEl.textContent = data.stats.totalRegistrations > 0 ? `${data.stats.totalRegistrations}+` : '0';
      if (memsEl) memsEl.textContent = data.stats.totalActiveMembers > 0 ? `${data.stats.totalActiveMembers}+` : '0';
      if (trnEl) trnEl.textContent = data.stats.trainingSessionsCount > 0 ? `${data.stats.trainingSessionsCount}+` : '0';
      if (evsEl) evsEl.textContent = data.stats.eventsCount > 0 ? `${data.stats.eventsCount}+` : '0';
    }

    // Render Events
    if (eventsContainer && data.events) {
      if (data.events.length === 0) {
        eventsContainer.innerHTML = `
          <div class="col-12 text-center py-4">
            <div class="dashboard-item-card p-4 mx-auto" style="max-width: 620px;">
              <i class="fa-solid fa-trophy fa-3x text-warning text-opacity-50 mb-3"></i>
              <h4 class="h5 text-white mb-2">لا توجد مسابقات مجدولة حالياً</h4>
              <p class="text-secondary small mb-0">المسابقات القادمة وجولات الـ Gym وتصفيات الـ ICPC سيتم نشرها هنا بواسطة لجنة المسابقات فور اعتماد مواعيدها الرسمية.</p>
            </div>
          </div>
        `;
      } else {
        eventsContainer.innerHTML = data.events.map(ev => {
          const dateStr = new Date(ev.startDate).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
          });
          return `
            <div class="col-md-6">
              <div class="custom-card card-gradient-top h-100 d-flex flex-column justify-content-between">
                <div>
                  <div class="d-flex justify-content-between align-items-center mb-2">
                    <span class="badge bg-primary bg-opacity-25 text-primary border border-primary border-opacity-25 tech-term">${ev.type || 'Contest'}</span>
                    <span class="small text-muted font-mono"><i class="fa-regular fa-clock ms-1"></i> ${dateStr}</span>
                  </div>
                  <h3 class="h5 mb-2">${escapeHtml(ev.title)}</h3>
                  <p class="text-secondary small mb-3">${escapeHtml(ev.description || '')}</p>
                  <p class="mb-0"><span class="location-badge"><i class="fa-solid fa-location-dot ms-1"></i> ${escapeHtml(ev.location || 'HTI Lab')}</span></p>
                </div>
                <div class="mt-4 pt-3 border-top border-secondary border-opacity-25 d-flex justify-content-between align-items-center">
                  <span class="badge bg-success bg-opacity-25 text-success">قريباً – Upcoming</span>
                  <a href="apply.html" class="btn-primary-custom btn-sm">
                    <i class="fa-solid fa-arrow-left ms-1"></i> التسجيل والمشاركة
                  </a>
                </div>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // Render Announcements
    if (annContainer && data.announcements) {
      if (data.announcements.length === 0) {
        annContainer.innerHTML = `
          <div class="col-12 text-center py-4">
            <div class="dashboard-item-card p-4 mx-auto" style="max-width: 620px;">
              <i class="fa-solid fa-bullhorn fa-3x text-info text-opacity-50 mb-3"></i>
              <h4 class="h5 text-white mb-2">لا توجد إعلانات منشورة حالياً</h4>
              <p class="text-secondary small mb-0">ترقبوا الأخبار والتنبيهات الرسمية فور نشرها من قبل إدارة الـ Community.</p>
            </div>
          </div>
        `;
      } else {
        annContainer.innerHTML = data.announcements.map(ann => {
          const pubDate = new Date(ann.publishedAt).toLocaleDateString('en-US', {
            month: 'long', day: 'numeric', year: 'numeric'
          });
          return `
            <div class="col-md-6">
              <div class="custom-card h-100">
                <div class="d-flex justify-content-between align-items-center mb-2">
                  <span class="badge bg-warning bg-opacity-25 text-warning border border-warning border-opacity-25 tech-term">${ann.category || 'General'}</span>
                  <span class="small text-muted font-mono">${pubDate}</span>
                </div>
                <h3 class="h5 mb-2 text-white">${escapeHtml(ann.title)}</h3>
                <p class="text-secondary small mb-3">${escapeHtml(ann.content)}</p>
                <div class="small text-muted">
                  <i class="fa-solid fa-bullhorn text-primary ms-1"></i> نُشر بواسطة: <strong>${escapeHtml(ann.publishedBy || 'HTI ICPC')}</strong>
                </div>
              </div>
            </div>
          `;
        }).join('');
      }
    }

  } catch (err) {
    console.warn('Failed to load dynamic public data:', err);
  }
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

// Dynamic Auth State in Navbar (Admin & Student)
function updateNavbarAuthState() {
  const adminSess = ApiService.getAdminSession();
  const memberSess = ApiService.getMemberSession();

  const adminBtnItem = document.getElementById('nav-admin-btn-item');
  const adminNameEl = document.getElementById('nav-admin-name');
  const memberBtnItem = document.getElementById('nav-member-btn-item');
  const memberNameEl = document.getElementById('nav-member-name');
  const portalsItem = document.getElementById('nav-portals-item');
  const ctaItem = document.getElementById('nav-cta-item');

  // 1. Admin State:
  // - Show Admin button
  // - Hide "البوابات" completely
  // - Hide "سجّل الآن" completely
  if (adminSess && adminSess.admin) {
    const admin = adminSess.admin;
    const adminFirstName = (admin.fullName || 'Admin').split(' ')[0];
    if (adminBtnItem) {
      adminBtnItem.classList.remove('d-none');
      if (adminNameEl) {
        adminNameEl.textContent = `لوحة الأدمن (${adminFirstName})`;
      }
    }
    if (portalsItem) portalsItem.classList.add('d-none');
    if (ctaItem) ctaItem.classList.add('d-none');
    if (memberBtnItem) memberBtnItem.classList.add('d-none');
    return;
  }

  // 2. Student State:
  // - Show Member account button
  // - Hide generic "البوابات"
  // - Hide generic "سجّل الآن"
  if (memberSess && memberSess.member) {
    const m = memberSess.member;
    const firstName = (m.fullName || 'طالب').split(' ')[0];

    if (memberBtnItem) {
      memberBtnItem.classList.remove('d-none');
      if (memberNameEl) {
        memberNameEl.textContent = `حسابي (${firstName})`;
      }
    }
    if (portalsItem) portalsItem.classList.add('d-none');
    if (ctaItem) ctaItem.classList.add('d-none');
    if (adminBtnItem) adminBtnItem.classList.add('d-none');
    return;
  }

  // 3. Guest / Visitor State (Not logged in):
  // - Show "البوابات"
  // - Show "سجّل الآن"
  // - Hide Admin and Member buttons
  if (adminBtnItem) adminBtnItem.classList.add('d-none');
  if (memberBtnItem) memberBtnItem.classList.add('d-none');
  if (portalsItem) portalsItem.classList.remove('d-none');
  if (ctaItem) ctaItem.classList.remove('d-none');
}

function logoutAdminFromHome(e) {
  if (e) e.preventDefault();
  ApiService.adminLogout();
  window.location.reload();
}

function logoutMemberFromHome(e) {
  if (e) e.preventDefault();
  ApiService.memberLogout();
  window.location.reload();
}

// Secret Staff Shortcut: Press Ctrl + Shift + A to open Admin Suite
document.addEventListener('keydown', function(e) {
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a' || e.code === 'KeyA')) {
    e.preventDefault();
    window.location.href = 'admin.html';
  }
});

