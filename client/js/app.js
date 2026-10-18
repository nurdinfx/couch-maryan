// ====================================================================
// FACULTY LMS - MAIN APPLICATION ROUTER & CONTROLLER
// ====================================================================

const App = {
  activeModal: null,
  isDrawerCollapsed: false,

  async init() {
    console.log('Initializing GUUREY Learning Platform...');

    // Setup Theme toggle
    const savedTheme = localStorage.getItem('faculty_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);

    // Setup Language
    if (typeof I18N !== 'undefined') {
      this.applyLanguage();
      window.addEventListener('language-changed', () => {
        this.applyLanguage();
        this.refreshCurrentView();
      });
    }

    // Setup hash router listener
    window.addEventListener('hashchange', () => this.handleRoute());
    window.addEventListener('auth-required', () => { window.location.href = 'login.html'; });

    // Verify session - redirect to login if not authenticated
    try {
      if (API.token) {
        await API.getMe();
      } else {
        // No token: redirect to login page
        window.location.href = 'login.html';
        return;
      }
    } catch (e) {
      // Token invalid or expired
      API.setToken(null);
      localStorage.removeItem('faculty_lms_user');
      window.location.href = 'login.html';
      return;
    }

    this.updateUserNavbar();
    this.handleRoute();
    this.setupSearch();
  },

  toggleLanguage() {
    if (typeof I18N === 'undefined') return;
    const next = I18N.toggleLang();
    this.applyLanguage();
    this.showToast(next === 'so' ? 'Luuqada nidaamka: Soomaali 🇸🇴' : 'System Language: English 🇬🇧');
    this.refreshCurrentView();
  },

  applyLanguage() {
    if (typeof I18N === 'undefined') return;
    const lang = I18N.getLang();
    const flag = document.getElementById('lang-flag-indicator');
    const label = document.getElementById('lang-label-indicator');
    const btn = document.getElementById('lang-switcher-btn');
    if (flag) flag.textContent = lang === 'so' ? '🇸🇴' : '🇬🇧';
    if (label) label.textContent = lang === 'so' ? 'Soomaali' : 'English';
    if (btn) btn.title = lang === 'so' ? 'Switch to English' : 'U baddal Soomaali';

    const brandTitle = document.getElementById('brand-title-text');
    const brandSub = document.getElementById('brand-subtitle-text');
    if (brandTitle) brandTitle.textContent = I18N.t('brand.name');
    if (brandSub) brandSub.textContent = I18N.t('brand.tagline');

    const searchInput = document.getElementById('site-search-input');
    if (searchInput) searchInput.placeholder = I18N.t('nav.search_placeholder');

    const dSecNav = document.getElementById('drawer-sec-nav');
    const dSecMgmt = document.getElementById('drawer-sec-mgmt');
    if (dSecNav) dSecNav.textContent = I18N.t('nav.academic_nav');
    if (dSecMgmt) dSecMgmt.textContent = I18N.t('nav.faculty_mgmt');

    const navMap = {
      'nav-txt-dashboard': 'nav.dashboard',
      'nav-txt-courses': 'nav.courses',
      'nav-txt-gradebook': 'nav.gradebook',
      'nav-txt-attendance': 'nav.attendance',
      'nav-txt-badges': 'nav.badges',
      'nav-txt-discussions': 'nav.discussions',
      'nav-txt-calendar': 'nav.calendar',
      'nav-txt-messages': 'nav.messages',
      'nav-txt-students': 'nav.students',
      'nav-txt-admin': 'nav.admin'
    };

    for (const [id, key] of Object.entries(navMap)) {
      const el = document.getElementById(id);
      if (el) el.textContent = I18N.t(key);
    }
  },

  logout() {
    API.setToken(null);
    localStorage.removeItem('faculty_lms_user');
    localStorage.removeItem('faculty_lms_token');
    window.location.href = 'login.html';
  },
  updateUserNavbar() {
    const user = API.currentUser;
    if (!user) return;

    // Update avatar and name
    const nameEl = document.getElementById('navbar-user-name');
    const roleEl = document.getElementById('navbar-user-role');
    const avatarEl = document.getElementById('navbar-user-avatar');
    const switcherEl = document.getElementById('quick-role-select');

    if (nameEl) nameEl.textContent = user.full_name;
    if (roleEl) roleEl.textContent = user.role.toUpperCase();
    if (avatarEl && user.avatar_url) avatarEl.src = user.avatar_url;
    if (switcherEl) switcherEl.value = user.id.toString();

    // Toggle admin link in drawer
    const adminNavItem = document.getElementById('drawer-nav-admin');
    if (adminNavItem) {
      adminNavItem.style.display = (user.role === 'admin' || user.role === 'professor') ? 'block' : 'none';
    }
  },

  async handleRoleSwitch(userId) {
    try {
      const res = await API.switchUser(parseInt(userId));
      this.updateUserNavbar();
      this.showToast(`Switched persona to ${res.user.full_name} (${res.user.role.toUpperCase()})`);
      this.handleRoute();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  parseRoute() {
    const hash = window.location.hash.slice(1) || '/dashboard';
    const [pathPart, queryPart] = hash.split('?');
    const queryParams = {};
    if (queryPart) {
      queryPart.split('&').forEach(pair => {
        const [k, v] = pair.split('=');
        queryParams[k] = decodeURIComponent(v || '');
      });
    }

    const segments = pathPart.split('/').filter(Boolean);
    return { path: pathPart, segments, query: queryParams };
  },

  async handleRoute() {
    this.closeDrawerOnMobile();
    const { path, segments, query } = this.parseRoute();
    const container = document.getElementById('main-content');
    if (!container) return;

    // Update active state in sidebar
    document.querySelectorAll('.drawer-nav-item').forEach(el => el.classList.remove('active'));
    const baseNavId = segments[0] || 'dashboard';
    const activeEl = document.getElementById(`nav-${baseNavId}`);
    if (activeEl) activeEl.classList.add('active');

    // Scroll to top
    window.scrollTo(0, 0);

    try {
      if (segments.length === 0 || segments[0] === 'dashboard') {
        container.innerHTML = await DashboardView.render();
      } else if (segments[0] === 'courses') {
        // Full Course Catalog page
        const cData = await API.getCourses().catch(() => ({ courses: [] }));
        const cList = cData.courses || [];
        const isProfessor = API.currentUser && (API.currentUser.role === 'professor' || API.currentUser.role === 'admin');
        container.innerHTML = `
          <div class="breadcrumb-trail">
            <a href="#/dashboard">${I18N.t('nav.dashboard', 'Dashboard')}</a>
            <span class="breadcrumb-sep">/</span>
            <span>${I18N.t('nav.courses', 'Course Catalog')}</span>
          </div>
          <div class="page-header-container" style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; margin-bottom: 2rem;">
            <div>
              <h1 class="page-title" style="font-size: 1.85rem; font-weight: 800; margin-bottom: 0.4rem;">
                📚 ${I18N.t('nav.courses', 'Course Catalog')}
              </h1>
              <p class="page-description" style="color: var(--text-muted); font-size: 0.95rem;">
                ${isProfessor ? I18N.t('dashboard.prof_overview', 'All published courses you manage') : I18N.t('dashboard.my_courses', 'Your enrolled courses')}
              </p>
            </div>
            ${isProfessor ? `
              <button class="btn btn-primary" onclick="App.showModal('createCourseModal')" style="font-weight: 600; padding: 0.65rem 1.25rem;">
                + ${I18N.t('dashboard.create_course_now', 'New Course')}
              </button>
            ` : ''}
          </div>

          ${cList.length === 0 ? `
            <div style="background: var(--bg-surface); border: 1px dashed var(--border-color); border-radius: var(--radius-lg); padding: 4rem 2rem; text-align: center;">
              <div style="font-size: 3.5rem; margin-bottom: 1rem;">📚</div>
              <h2 style="font-size: 1.4rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.5rem;">
                ${I18N.t('dashboard.no_courses_title', 'No Courses Found')}
              </h2>
              <p style="color: var(--text-muted); max-width: 480px; margin: 0 auto 1.5rem;">
                ${I18N.t('dashboard.no_courses_desc', 'No courses available yet. Create one to get started.')}
              </p>
              ${isProfessor ? `
                <button class="btn btn-primary" onclick="App.showModal('createCourseModal')">
                  + ${I18N.t('dashboard.create_course_now', 'Create First Course')}
                </button>
              ` : ''}
            </div>
          ` : `
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem;">
              ${cList.map(c => {
                const yearBg = c.target_year === 'Year 2' ? '#fef3c7' : c.target_year === 'Year 3' ? '#f3e8ff' : c.target_year === 'Year 4' ? '#dcfce7' : '#e0f2fe';
                const yearColor = c.target_year === 'Year 2' ? '#b45309' : c.target_year === 'Year 3' ? '#7e22ce' : c.target_year === 'Year 4' ? '#15803d' : '#0369a1';
                return `
                  <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); overflow: hidden; box-shadow: var(--shadow-sm); transition: box-shadow 0.25s, transform 0.2s; cursor: pointer;"
                       onclick="App.navigate('/course/${c.id}')"
                       onmouseover="this.style.boxShadow='var(--shadow-lg)'; this.style.transform='translateY(-3px)'"
                       onmouseout="this.style.boxShadow='var(--shadow-sm)'; this.style.transform='translateY(0)'">
                    <img src="${c.cover_image || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600'}" 
                         style="width: 100%; height: 160px; object-fit: cover;" 
                         onerror="this.src='https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600'">
                    <div style="padding: 1.25rem;">
                      <div style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.6rem; flex-wrap: wrap;">
                        <code style="font-size: 0.75rem; background: var(--bg-surface-alt); padding: 0.2rem 0.5rem; border-radius: 4px;">${c.code}</code>
                        <span style="background: ${yearBg}; color: ${yearColor}; font-weight: 700; font-size: 0.72rem; padding: 0.2rem 0.5rem; border-radius: 999px;">🎯 ${c.target_year || 'All Years'}</span>
                        ${c.is_published ? '<span class="badge badge-success" style="font-size: 0.72rem;">Published</span>' : '<span class="badge badge-warning" style="font-size: 0.72rem;">Draft</span>'}
                      </div>
                      <h3 style="font-size: 1.05rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.5rem; line-height: 1.35;">${c.title}</h3>
                      <p style="font-size: 0.83rem; color: var(--text-muted); margin-bottom: 1rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                        ${c.description || '—'}
                      </p>
                      <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; color: var(--text-muted); padding-top: 0.75rem; border-top: 1px solid var(--border-color);">
                        <span>👥 ${c.enrolled_students_count || 0} ${I18N.t('dashboard.students_count', 'Students')}</span>
                        <span>📖 ${c.lessons_count || 0} ${I18N.t('nav.courses', 'Lessons')}</span>
                        ${c.progress_percentage !== undefined ? `<span style="font-weight: 700; color: var(--primary);">${c.progress_percentage}% Done</span>` : ''}
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        `;
      } else if (segments[0] === 'course') {
        const courseId = segments[1];
        if (segments[2] === 'lesson') {
          container.innerHTML = await LessonView.render({ id: segments[3] });
        } else if (segments[2] === 'assignment') {
          container.innerHTML = await AssignmentView.render({ id: segments[3] });
        } else if (segments[2] === 'quiz') {
          container.innerHTML = await QuizView.render({ id: segments[3], action: query.action, attemptId: query.attemptId });
        } else {
          container.innerHTML = await CourseView.render({ id: courseId, tab: query.tab });
        }
      } else if (segments[0] === 'gradebook' || segments[0] === 'attendance' || segments[0] === 'discussions') {
        const tabType = segments[0] === 'gradebook' ? 'grades' : (segments[0] === 'attendance' ? 'attendance' : 'discussions');

        if (segments[0] === 'discussions' && segments[1]) {
          container.innerHTML = await TopicView.render({ id: segments[1] });
        } else {
          // Dynamically fetch available courses instead of hardcoding course ID 1
          const coursesRes = await API.getCourses().catch(() => ({ courses: [] }));
          const coursesList = coursesRes.courses || [];

          if (coursesList.length === 0) {
            const pageTitle = segments[0] === 'gradebook' 
              ? I18N.t('nav.gradebook', 'Gradebook Matrix') 
              : (segments[0] === 'attendance' ? I18N.t('nav.attendance', 'Attendance Records') : I18N.t('nav.discussions', 'Course Forum'));
            container.innerHTML = `
              <div class="breadcrumb-trail">
                <a href="#/dashboard">${I18N.t('nav.dashboard', 'Dashboard')}</a>
                <span class="breadcrumb-sep">/</span>
                <span>${pageTitle}</span>
              </div>
              <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 4rem 2rem; text-align: center; box-shadow: var(--shadow-sm); margin-top: 1rem;">
                <div style="font-size: 3.5rem; margin-bottom: 1rem;">📚</div>
                <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--text-primary);">
                  ${I18N.t('dashboard.no_courses_title', 'Weli Koorso Laguma darin / No Courses Added Yet')}
                </h2>
                <p style="color: var(--text-muted); max-width: 520px; margin: 0 auto 1.5rem; font-size: 0.95rem;">
                  ${I18N.t('dashboard.no_courses_desc', 'Fadlan abuur koorso cusub si aad u maamusho buundooyinka, xaadiriska, iyo madasha doodaha.')}
                </p>
                ${(API.currentUser && (API.currentUser.role === 'professor' || API.currentUser.role === 'admin')) ? `
                  <button class="btn btn-primary" onclick="App.showModal('createCourseModal')" style="font-weight: 600; padding: 0.65rem 1.25rem;">
                    + ${I18N.t('dashboard.create_course_now', 'Abuur Koorso Cusub')}
                  </button>
                ` : `
                  <a href="#/dashboard" class="btn btn-primary">${I18N.t('nav.dashboard', 'Return to Dashboard')}</a>
                `}
              </div>
            `;
          } else {
            // Find target course: query.courseId or first available course
            const targetCourseId = query.courseId || query.id || coursesList[0].id;
            const targetCourse = coursesList.find(c => c.id == targetCourseId) || coursesList[0];

            // Render Course Switcher toolbar if more than 1 course exists
            const courseSelectorHtml = coursesList.length > 1 ? `
              <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 0.75rem 1.25rem; margin-bottom: 1.25rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; box-shadow: var(--shadow-sm);">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  <span style="font-size: 1.25rem;">📚</span>
                  <label for="route-course-picker" style="font-weight: 700; font-size: 0.88rem; color: var(--text-primary);">Dooro Koorsada (Select Course):</label>
                </div>
                <select id="route-course-picker" onchange="window.location.hash = '#/${segments[0]}?courseId=' + this.value" style="padding: 0.5rem 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-color); font-size: 0.9rem; font-weight: 600; background: var(--bg-surface-alt); color: var(--text-primary); cursor: pointer; min-width: 260px;">
                  ${coursesList.map(c => `
                    <option value="${c.id}" ${c.id === targetCourse.id ? 'selected' : ''}>
                      ${c.code} - ${c.title} (${c.target_year || 'All Years'})
                    </option>
                  `).join('')}
                </select>
              </div>
            ` : '';

            const renderedView = await CourseView.render({ id: targetCourse.id, tab: tabType });
            container.innerHTML = courseSelectorHtml + renderedView;
          }
        }
      } else if (segments[0] === 'messages') {
        container.innerHTML = await MessagesView.render(query);
      } else if (segments[0] === 'calendar') {
        container.innerHTML = await CalendarView.render();
      } else if (segments[0] === 'admin') {
        container.innerHTML = await AdminView.render();
      } else if (segments[0] === 'students') {
        container.innerHTML = await StudentsView.render();
      } else if (segments[0] === 'badges' || segments[0] === 'certificates') {
        container.innerHTML = await BadgesView.render();
      } else {
        container.innerHTML = await DashboardView.render();
      }
    } catch (err) {
      console.error('Routing render error:', err);
      container.innerHTML = `
        <div style="text-align: center; padding: 4rem 2rem;">
          <h2 style="color: var(--danger);">Unable to load page</h2>
          <p style="color: var(--text-muted); margin: 0.5rem 0 1.5rem;">${err.message}</p>
          <a href="#/dashboard" class="btn btn-primary">Return to Dashboard</a>
        </div>
      `;
    }
  },

  navigate(url) {
    window.location.hash = url;
  },

  refreshCurrentView() {
    this.handleRoute();
  },

  toggleDrawer() {
    const drawer = document.getElementById('left-drawer');
    const content = document.getElementById('main-content');
    const backdrop = document.getElementById('drawer-backdrop');
    if (!drawer) return;

    if (window.innerWidth <= 900) {
      const isOpen = drawer.classList.toggle('mobile-open');
      if (backdrop) backdrop.classList.toggle('active', isOpen);
    } else {
      drawer.classList.toggle('collapsed');
      if (content) content.classList.toggle('expanded');
    }
  },

  closeDrawerOnMobile() {
    if (window.innerWidth <= 900) {
      const drawer = document.getElementById('left-drawer');
      const backdrop = document.getElementById('drawer-backdrop');
      if (drawer) drawer.classList.remove('mobile-open');
      if (backdrop) backdrop.classList.remove('active');
    }
  },

  toggleTheme() {
    const root = document.documentElement;
    const current = root.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    localStorage.setItem('faculty_theme', next);
    this.showToast(`Switched to ${next} mode`);
  },

  toggleModuleCollapse(moduleId) {
    const body = document.getElementById(`module-content-${moduleId}`);
    const chevron = document.getElementById(`chevron-${moduleId}`);
    if (body) {
      const isHidden = body.style.display === 'none';
      body.style.display = isHidden ? 'flex' : 'none';
      if (chevron) {
        chevron.className = isHidden ? 'module-chevron expanded' : 'module-chevron';
      }
    }
  },

  async toggleLessonCompletion(lessonId, status) {
    try {
      await API.updateLessonProgress(lessonId, { markCompleted: status === 1 });
      this.showToast(status === 1 ? 'Activity marked as completed! 🎯' : 'Activity marked as incomplete.');
      this.refreshCurrentView();
    } catch (e) {
      this.showToast(e.message, 'error');
    }
  },

  async deleteModule(moduleId) {
    if (!confirm('Are you sure you want to delete this module and all its contents?')) return;
    try {
      await API.deleteModule(moduleId);
      this.showToast('Module deleted.');
      this.refreshCurrentView();
    } catch (e) {
      this.showToast(e.message, 'error');
    }
  },

  // Modal Manager
  showCustomModal(html) {
    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot) return;
    modalRoot.innerHTML = `<div class="modal-overlay" onclick="if(event.target === this) App.closeModal()">${html}</div>`;
  },

  closeModal() {
    const modalRoot = document.getElementById('modal-root');
    if (modalRoot) modalRoot.innerHTML = '';
  },

  async showModal(name, context = {}) {
    if (name === 'createCourseModal') {
      const presets = [
        { url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&fit=crop&q=80', label: '💻 Programming' },
        { url: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=400&fit=crop&q=80', label: '🤖 AI / ML' },
        { url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&fit=crop&q=80', label: '🔐 Cybersecurity' },
        { url: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400&fit=crop&q=80', label: '☁️ Cloud' },
        { url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&fit=crop&q=80', label: '📊 Data Science' },
        { url: 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=400&fit=crop&q=80', label: '🗄️ Databases' }
      ];
      this.showCustomModal(`
        <div class="modal-dialog" style="max-width: 600px;">
          <div class="modal-header">
            <h3>Create New Course</h3>
            <button class="drawer-toggle-btn" onclick="App.closeModal()">✕</button>
          </div>
          <form id="create-course-form" onsubmit="App.handleCreateCourse(event)">
            <div class="modal-body">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-bottom:1rem;">
                <div>
                  <label style="font-weight:700;font-size:0.82rem;display:block;margin-bottom:0.3rem;">Course Code *</label>
                  <input type="text" name="code" required placeholder="e.g. CS420" style="width:100%;padding:0.65rem;border:1px solid var(--border-color);border-radius:var(--radius-md);">
                </div>
                <div>
                  <label style="font-weight:700;font-size:0.82rem;display:block;margin-bottom:0.3rem;">Pass % (default 60)</label>
                  <input type="number" name="pass_percentage" min="1" max="100" value="60" style="width:100%;padding:0.65rem;border:1px solid var(--border-color);border-radius:var(--radius-md);">
                </div>
              </div>
              <div style="margin-bottom:1rem;">
                <label style="font-weight:700;font-size:0.82rem;display:block;margin-bottom:0.3rem;">Course Title *</label>
                <input type="text" name="title" required placeholder="e.g. Advanced Database Systems" style="width:100%;padding:0.65rem;border:1px solid var(--border-color);border-radius:var(--radius-md);">
              </div>
              <div style="margin-bottom:1rem;">
                <label style="font-weight:700;font-size:0.82rem;display:block;margin-bottom:0.3rem;">🎯 Sanadka / Heerka Koorso (Target Level) *</label>
                <select name="target_year" required style="width:100%;padding:0.65rem;border:1px solid var(--border-color);border-radius:var(--radius-md);background:var(--bg-surface);color:var(--text-main);">
                  <option value="All Years">Dhammaan Sanadaha (Furan / Open to All)</option>
                  <option value="Year 1">Year 1 (Ardayda Sanadka 1-aad oo Kaliya)</option>
                  <option value="Year 2">Year 2 (Ardayda Sanadka 2-aad oo Kaliya)</option>
                  <option value="Year 3">Year 3 (Ardayda Sanadka 3-aad oo Kaliya)</option>
                  <option value="Year 4">Year 4 (Ardayda Sanadka 4-aad oo Kaliya)</option>
                </select>
                <small style="font-size:0.74rem;color:var(--text-muted);display:block;margin-top:0.25rem;">
                  Xusuusin: Ardayda Year 1 ma geli karaan koorsadan haddii loo doorto Year 2.
                </small>
              </div>
              <div style="margin-bottom:1rem;">
                <label style="font-weight:700;font-size:0.82rem;display:block;margin-bottom:0.3rem;">Description</label>
                <textarea name="description" rows="2" placeholder="Briefly describe the course objectives..." style="width:100%;padding:0.65rem;border:1px solid var(--border-color);border-radius:var(--radius-md);font-family:inherit;"></textarea>
              </div>
              <div style="margin-bottom:1rem;">
                <label style="font-weight:700;font-size:0.82rem;display:block;margin-bottom:0.5rem;">📷 Course Thumbnail</label>
                <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0.5rem;margin-bottom:0.75rem;">
                  ${presets.map((p, i) => `
                    <div class="thumb-preset" data-url="${p.url}" onclick="App.selectCoverPreset(this, '${p.url}')" style="cursor:pointer;border:2px solid var(--border-color);border-radius:var(--radius-md);overflow:hidden;transition:border-color 0.2s;">
                      <img src="${p.url}" alt="${p.label}" style="width:100%;height:60px;object-fit:cover;display:block;">
                      <div style="padding:0.2rem 0.4rem;font-size:0.7rem;font-weight:600;text-align:center;">${p.label}</div>
                    </div>
                  `).join('')}
                </div>
                <input type="hidden" name="cover_image" id="cover-preset-url" value="">
                <div style="display:flex;gap:0.5rem;align-items:center;">
                  <div style="flex:1;">
                    <label style="font-size:0.78rem;font-weight:600;display:block;margin-bottom:0.3rem;">Upload custom image</label>
                    <input type="file" name="cover_file" accept="image/*" onchange="App.previewCoverFile(this)" style="font-size:0.8rem;width:100%;">
                  </div>
                  <div style="flex:1;">
                    <label style="font-size:0.78rem;font-weight:600;display:block;margin-bottom:0.3rem;">or paste image URL</label>
                    <input type="url" name="cover_url_input" placeholder="https://..." oninput="App.setCoverUrl(this.value)" style="width:100%;padding:0.5rem;border:1px solid var(--border-color);border-radius:var(--radius-md);font-size:0.82rem;">
                  </div>
                </div>
                <div id="cover-preview-container" style="margin-top:0.5rem;display:none;">
                  <img id="cover-preview-img" src="" alt="Preview" style="width:100%;max-height:120px;object-fit:cover;border-radius:var(--radius-md);border:1px solid var(--border-color);">
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline" onclick="App.closeModal()">Cancel</button>
              <button type="submit" class="btn btn-primary">🚀 Create Course</button>
            </div>
          </form>
        </div>
      `);
    } else if (name === 'addModuleModal') {
      this.showCustomModal(`
        <div class="modal-dialog">
          <div class="modal-header">
            <h3>Add New Section / Topic</h3>
            <button class="drawer-toggle-btn" onclick="App.closeModal()">✕</button>
          </div>
          <form onsubmit="App.handleAddModule(event, ${context.courseId})">
            <div class="modal-body">
              <div style="margin-bottom: 1rem;">
                <label style="font-weight: 700; font-size: 0.82rem; display: block; margin-bottom: 0.3rem;">Section Title</label>
                <input type="text" name="title" required placeholder="e.g. Module 5: Cloud Security & Multi-Tenancy" style="width: 100%; padding: 0.65rem; border: 1px solid var(--border-color); border-radius: var(--radius-md);">
              </div>
              <div style="margin-bottom: 1rem;">
                <label style="font-weight: 700; font-size: 0.82rem; display: block; margin-bottom: 0.3rem;">Description</label>
                <textarea name="description" rows="2" style="width: 100%; padding: 0.65rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-family: inherit;"></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline" onclick="App.closeModal()">Cancel</button>
              <button type="submit" class="btn btn-primary">Create Section</button>
            </div>
          </form>
        </div>
      `);
    } else if (name === 'addActivityModal') {
      // Build module selector if no specific moduleId was passed (course-level button)
      let moduleSelectorHtml = '';
      let formModuleId = context.moduleId || null;

      if (!formModuleId && context.courseId) {
        // Fetch modules for this course so professor can pick one
        try {
          const courseData = await API.getCourse(context.courseId);
          const modules = courseData.modules || [];
          if (modules.length > 0) {
            moduleSelectorHtml = `
              <div style="margin-bottom: 1rem;">
                <label style="font-weight: 700; font-size: 0.82rem; display: block; margin-bottom: 0.3rem;">📂 Section (Module) *</label>
                <select id="activity-module-select" required style="width: 100%; padding: 0.65rem; border: 1px solid var(--border-color); border-radius: var(--radius-md);">
                  <option value="">— Choose a section —</option>
                  ${modules.map(m => `<option value="${m.id}">${m.title}</option>`).join('')}
                </select>
              </div>`;
          } else {
            moduleSelectorHtml = `
              <div style="margin-bottom:1rem; padding:0.75rem; background:#fef3c7; border-radius:var(--radius-md); font-size:0.85rem; color:#92400e;">
                ⚠️ No sections found. Please create a section first before adding an activity.
              </div>`;
          }
        } catch (e) {
          console.error('Could not load modules:', e);
        }
      }

      this.showCustomModal(`
        <div class="modal-dialog">
          <div class="modal-header">
            <h3>Add Activity / Learning Resource</h3>
            <button class="drawer-toggle-btn" onclick="App.closeModal()">✕</button>
          </div>
          <form onsubmit="App.handleAddActivity(event, ${formModuleId || 'null'})">
            <div class="modal-body">
              ${moduleSelectorHtml}
              <div style="margin-bottom: 1rem;">
                <label style="font-weight: 700; font-size: 0.82rem; display: block; margin-bottom: 0.3rem;">Activity Type</label>
                <select name="content_type" required style="width: 100%; padding: 0.65rem; border: 1px solid var(--border-color); border-radius: var(--radius-md);" onchange="App.handleActivityTypeChange(this.value)">
                  <option value="video">🎥 Video Lecture</option>
                  <option value="document">📄 PDF / Document</option>
                  <option value="text">📝 Reading Notes</option>
                </select>
              </div>
              <div style="margin-bottom: 1rem;">
                <label style="font-weight: 700; font-size: 0.82rem; display: block; margin-bottom: 0.3rem;">Title *</label>
                <input type="text" name="title" required placeholder="e.g. Lecture 4: Anatomy & Physiology" style="width: 100%; padding: 0.65rem; border: 1px solid var(--border-color); border-radius: var(--radius-md);">
              </div>
              <div id="activity-dynamic-field"></div>
              <div style="margin-bottom: 1rem;">
                <label style="font-weight: 700; font-size: 0.82rem; display: block; margin-bottom: 0.3rem;">Description / Notes (Optional)</label>
                <textarea name="description" rows="2" placeholder="Brief summary of this activity..." style="width: 100%; padding: 0.65rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-family: inherit;"></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline" onclick="App.closeModal()">Cancel</button>
              <button type="submit" class="btn btn-primary">Add Activity</button>
            </div>
          </form>
        </div>
      `);
      setTimeout(() => this.handleActivityTypeChange('video'), 30);
    } else if (name === 'addAttendanceSessionModal') {
      const today = new Date().toISOString().slice(0, 10);
      this.showCustomModal(`
        <div class="modal-dialog">
          <div class="modal-header">
            <h3>New Attendance Session</h3>
            <button class="drawer-toggle-btn" onclick="App.closeModal()">✕</button>
          </div>
          <form onsubmit="App.handleCreateAttendanceSession(event, ${context.courseId})">
            <div class="modal-body">
              <div style="margin-bottom: 1rem;">
                <label style="font-weight: 700; font-size: 0.82rem; display: block; margin-bottom: 0.3rem;">Date</label>
                <input type="date" name="session_date" required value="${today}" style="width: 100%; padding: 0.65rem; border: 1px solid var(--border-color); border-radius: var(--radius-md);">
              </div>
              <div style="margin-bottom: 1rem;">
                <label style="font-weight: 700; font-size: 0.82rem; display: block; margin-bottom: 0.3rem;">Session Title</label>
                <input type="text" name="title" required placeholder="e.g. Week 5: Storage Architecture & Quorum Lab" style="width: 100%; padding: 0.65rem; border: 1px solid var(--border-color); border-radius: var(--radius-md);">
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline" onclick="App.closeModal()">Cancel</button>
              <button type="submit" class="btn btn-primary">Create Session</button>
            </div>
          </form>
        </div>
      `);
    } else if (name === 'addAnnouncementModal') {
      this.showCustomModal(`
        <div class="modal-dialog">
          <div class="modal-header">
            <h3>Post Course Announcement</h3>
            <button class="drawer-toggle-btn" onclick="App.closeModal()">✕</button>
          </div>
          <form onsubmit="App.handleCreateAnnouncement(event, ${context.courseId})">
            <div class="modal-body">
              <div style="margin-bottom: 1rem;">
                <label style="font-weight: 700; font-size: 0.82rem; display: block; margin-bottom: 0.3rem;">Title</label>
                <input type="text" name="title" required placeholder="e.g. Midterm Preparation Guide & Lab Hours" style="width: 100%; padding: 0.65rem; border: 1px solid var(--border-color); border-radius: var(--radius-md);">
              </div>
              <div style="margin-bottom: 1rem;">
                <label style="font-weight: 700; font-size: 0.82rem; display: block; margin-bottom: 0.3rem;">Content</label>
                <textarea name="content" rows="4" required style="width: 100%; padding: 0.65rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-family: inherit;"></textarea>
              </div>
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <input type="checkbox" name="is_pinned" id="ann_pin">
                <label for="ann_pin" style="font-size: 0.85rem; font-weight: 600;">Pin announcement to course header</label>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline" onclick="App.closeModal()">Cancel</button>
              <button type="submit" class="btn btn-primary">Broadcast Announcement</button>
            </div>
          </form>
        </div>
      `);
    } else if (name === 'addQuizModal') {
      const courseId = context.courseId || 1;
      this.showCustomModal(`
        <div class="modal-dialog" style="max-width:520px;">
          <div class="modal-header">
            <h3>📋 Create Quiz / Exam</h3>
            <button class="drawer-toggle-btn" onclick="App.closeModal()">✕</button>
          </div>
          <form onsubmit="App.handleCreateQuiz(event, ${courseId})">
            <div class="modal-body">
              <div style="margin-bottom:0.75rem;">
                <label style="font-weight:700;font-size:0.82rem;display:block;margin-bottom:0.3rem;">Quiz Title *</label>
                <input type="text" name="title" required placeholder="e.g. Midterm Exam – Chapter 3-6" style="width:100%;padding:0.65rem;border:1px solid var(--border-color);border-radius:var(--radius-md);">
              </div>
              <div style="margin-bottom:0.75rem;">
                <label style="font-weight:700;font-size:0.82rem;display:block;margin-bottom:0.3rem;">Type</label>
                <select name="quiz_type" style="width:100%;padding:0.65rem;border:1px solid var(--border-color);border-radius:var(--radius-md);">
                  <option value="quiz">📝 Quiz (practice)</option>
                  <option value="exam">📋 Exam (graded)</option>
                  <option value="assignment">📌 Assignment Quiz</option>
                </select>
              </div>
              <div style="margin-bottom:0.75rem;">
                <label style="font-weight:700;font-size:0.82rem;display:block;margin-bottom:0.3rem;">Description / Instructions</label>
                <textarea name="description" rows="2" placeholder="Instructions shown to students before they start..." style="width:100%;padding:0.65rem;border:1px solid var(--border-color);border-radius:var(--radius-md);font-family:inherit;"></textarea>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.5rem;margin-bottom:0.75rem;">
                <div>
                  <label style="font-weight:700;font-size:0.78rem;display:block;margin-bottom:0.3rem;">Time Limit (min)</label>
                  <input type="number" name="time_limit" min="1" placeholder="e.g. 90" style="width:100%;padding:0.65rem;border:1px solid var(--border-color);border-radius:var(--radius-md);">
                </div>
                <div>
                  <label style="font-weight:700;font-size:0.78rem;display:block;margin-bottom:0.3rem;">Pass % *</label>
                  <input type="number" name="pass_percentage" value="60" min="1" max="100" required style="width:100%;padding:0.65rem;border:1px solid var(--border-color);border-radius:var(--radius-md);">
                </div>
                <div>
                  <label style="font-weight:700;font-size:0.78rem;display:block;margin-bottom:0.3rem;">Max Attempts</label>
                  <input type="number" name="max_attempts" value="3" min="1" style="width:100%;padding:0.65rem;border:1px solid var(--border-color);border-radius:var(--radius-md);">
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline" onclick="App.closeModal()">Cancel</button>
              <button type="submit" class="btn btn-primary">Create & Add Questions →</button>
            </div>
          </form>
        </div>
      `);
    } else if (name === 'addQuestionModal') {
      const quizId = context.quizId;
      const quizTitle = context.quizTitle || 'Quiz';
      this.showCustomModal(`
        <div class="modal-dialog" style="max-width:520px;">
          <div class="modal-header">
            <h3>➕ Add Question — ${quizTitle}</h3>
            <button class="drawer-toggle-btn" onclick="App.closeModal()">✕</button>
          </div>
          <form onsubmit="App.handleAddQuestion(event, ${quizId})">
            <div class="modal-body">
              <div style="margin-bottom:0.75rem;">
                <label style="font-weight:700;font-size:0.82rem;display:block;margin-bottom:0.3rem;">Question Type</label>
                <select name="question_type" required onchange="App.handleQuestionTypeChange(this.value)" style="width:100%;padding:0.65rem;border:1px solid var(--border-color);border-radius:var(--radius-md);">
                  <option value="multiple_choice">🔘 Multiple Choice</option>
                  <option value="true_false">✅ True / False</option>
                  <option value="short_answer">✍️ Short Answer</option>
                  <option value="essay">📝 Essay</option>
                </select>
              </div>
              <div style="margin-bottom:0.75rem;">
                <label style="font-weight:700;font-size:0.82rem;display:block;margin-bottom:0.3rem;">Question Text *</label>
                <textarea name="question_text" rows="3" required placeholder="Enter the question..." style="width:100%;padding:0.65rem;border:1px solid var(--border-color);border-radius:var(--radius-md);font-family:inherit;"></textarea>
              </div>
              <div id="question-dynamic-field">
                <!-- dynamic based on type: MCQ options shown by default -->
                <div style="margin-bottom:0.75rem;">
                  <label style="font-weight:700;font-size:0.82rem;display:block;margin-bottom:0.3rem;">Answer Options (one per line)</label>
                  <textarea name="options_text" rows="4" required placeholder="Option A\nOption B\nOption C\nOption D" style="width:100%;padding:0.65rem;border:1px solid var(--border-color);border-radius:var(--radius-md);font-family:inherit;"></textarea>
                </div>
                <div style="margin-bottom:0.75rem;">
                  <label style="font-weight:700;font-size:0.82rem;display:block;margin-bottom:0.3rem;">Correct Answer (exact text)</label>
                  <input type="text" name="correct_answer" required placeholder="e.g. Option A" style="width:100%;padding:0.65rem;border:1px solid var(--border-color);border-radius:var(--radius-md);">
                </div>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;">
                <div>
                  <label style="font-weight:700;font-size:0.78rem;display:block;margin-bottom:0.3rem;">Points</label>
                  <input type="number" name="points" value="1" min="0.5" step="0.5" style="width:100%;padding:0.65rem;border:1px solid var(--border-color);border-radius:var(--radius-md);">
                </div>
                <div>
                  <label style="font-weight:700;font-size:0.78rem;display:block;margin-bottom:0.3rem;">Explanation (optional)</label>
                  <input type="text" name="explanation" placeholder="Shown after attempt" style="width:100%;padding:0.65rem;border:1px solid var(--border-color);border-radius:var(--radius-md);">
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline" onclick="App.closeModal()">Done</button>
              <button type="submit" class="btn btn-primary">Add Question ➕</button>
            </div>
          </form>
        </div>
      `);
    } else if (name === 'addAssignmentModal') {
      const courseId = context.courseId || 1;
      const today = new Date().toISOString().slice(0, 10);
      const modules = context.modules || [];
      this.showCustomModal(`
        <div class="modal-dialog" style="max-width:540px;">
          <div class="modal-header">
            <h3>📌 Create Assignment / Project</h3>
            <button class="drawer-toggle-btn" onclick="App.closeModal()">✕</button>
          </div>
          <form onsubmit="App.handleCreateAssignment(event, ${courseId})" enctype="multipart/form-data">
            <div class="modal-body">
              <div style="margin-bottom:0.75rem;">
                <label style="font-weight:700;font-size:0.82rem;display:block;margin-bottom:0.3rem;">Assignment Title *</label>
                <input type="text" name="title" required placeholder="e.g. Lab 3: Distributed Hash Table Implementation" style="width:100%;padding:0.65rem;border:1px solid var(--border-color);border-radius:var(--radius-md);">
              </div>
              <div style="margin-bottom:0.75rem;">
                <label style="font-weight:700;font-size:0.82rem;display:block;margin-bottom:0.3rem;">Instructions / Description *</label>
                <textarea name="description" rows="3" required placeholder="Detailed instructions for students..." style="width:100%;padding:0.65rem;border:1px solid var(--border-color);border-radius:var(--radius-md);font-family:inherit;"></textarea>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.5rem;margin-bottom:0.75rem;">
                <div>
                  <label style="font-weight:700;font-size:0.78rem;display:block;margin-bottom:0.3rem;">Due Date *</label>
                  <input type="date" name="due_date" required value="${today}" style="width:100%;padding:0.65rem;border:1px solid var(--border-color);border-radius:var(--radius-md);">
                </div>
                <div>
                  <label style="font-weight:700;font-size:0.78rem;display:block;margin-bottom:0.3rem;">Max Score</label>
                  <input type="number" name="max_score" value="100" min="1" style="width:100%;padding:0.65rem;border:1px solid var(--border-color);border-radius:var(--radius-md);">
                </div>
                <div>
                  <label style="font-weight:700;font-size:0.78rem;display:block;margin-bottom:0.3rem;">Type</label>
                  <select name="submission_type" style="width:100%;padding:0.65rem;border:1px solid var(--border-color);border-radius:var(--radius-md);">
                    <option value="file">📁 File Upload</option>
                    <option value="text">📝 Text Entry</option>
                    <option value="both">📁+📝 Both</option>
                  </select>
                </div>
              </div>
              <div style="margin-bottom:0.75rem;">
                <label style="font-weight:700;font-size:0.82rem;display:block;margin-bottom:0.3rem;">📎 Attach Assignment Guide (PDF/doc — optional)</label>
                <input type="file" name="file" accept=".pdf,.doc,.docx,.zip" style="font-size:0.82rem;width:100%;">
              </div>
              <div style="background:var(--bg-surface-alt);border:1px dashed var(--primary);border-radius:var(--radius-md);padding:0.85rem;text-align:center;">
                <div style="font-size:1.5rem;margin-bottom:0.3rem;">📥</div>
                <div style="font-weight:700;font-size:0.88rem;color:var(--primary);">Student Submission Dropzone</div>
                <div style="font-size:0.78rem;color:var(--text-muted);margin-top:0.2rem;">Students will upload their work here when this assignment is published</div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline" onclick="App.closeModal()">Cancel</button>
              <button type="submit" class="btn btn-primary">📌 Create Assignment</button>
            </div>
          </form>
        </div>
      `);
    } else if (name === 'createBadgeModal') {
      const EMOJI_OPTIONS = ['🏆','🥇','🌟','⭐','🎯','🚀','💡','🔥','🎓','📚','💎','🏅','✅','🌈','🦁','🧠'];
      this.showCustomModal(`
        <div class="modal-dialog" style="max-width:460px;">
          <div class="modal-header">
            <h3>🏆 Create New Badge</h3>
            <button class="drawer-toggle-btn" onclick="App.closeModal()">✕</button>
          </div>
          <form onsubmit="App.handleCreateBadge(event)">
            <div class="modal-body">
              <div style="margin-bottom:0.75rem;">
                <label style="font-weight:700;font-size:0.82rem;display:block;margin-bottom:0.5rem;">Badge Icon</label>
                <div style="display:flex;flex-wrap:wrap;gap:0.4rem;margin-bottom:0.5rem;">
                  ${EMOJI_OPTIONS.map(em => `<span class="badge-emoji-opt" onclick="App.selectBadgeEmoji('${em}', this)" style="font-size:1.6rem;cursor:pointer;padding:0.3rem;border:2px solid transparent;border-radius:8px;transition:border-color 0.15s;">${em}</span>`).join('')}
                </div>
                <input type="hidden" name="icon" id="badge-icon-input" value="🏆">
              </div>
              <div style="margin-bottom:0.75rem;">
                <label style="font-weight:700;font-size:0.82rem;display:block;margin-bottom:0.3rem;">Badge Name *</label>
                <input type="text" name="name" required placeholder="e.g. Perfect Score Champion" style="width:100%;padding:0.65rem;border:1px solid var(--border-color);border-radius:var(--radius-md);">
              </div>
              <div style="margin-bottom:0.75rem;">
                <label style="font-weight:700;font-size:0.82rem;display:block;margin-bottom:0.3rem;">Description</label>
                <textarea name="description" rows="2" placeholder="What does earning this badge mean?" style="width:100%;padding:0.65rem;border:1px solid var(--border-color);border-radius:var(--radius-md);font-family:inherit;"></textarea>
              </div>
              <div>
                <label style="font-weight:700;font-size:0.82rem;display:block;margin-bottom:0.3rem;">Award Criteria</label>
                <input type="text" name="criteria" placeholder="e.g. Score 100% on any exam" style="width:100%;padding:0.65rem;border:1px solid var(--border-color);border-radius:var(--radius-md);">
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline" onclick="App.closeModal()">Cancel</button>
              <button type="submit" class="btn btn-primary">🏆 Create Badge</button>
            </div>
          </form>
        </div>
      `);
    } else if (name === 'addTopicModal') {
      this.showCustomModal(`
        <div class="modal-dialog">
          <div class="modal-header">
            <h3>Start New Discussion Topic</h3>
            <button class="drawer-toggle-btn" onclick="App.closeModal()">✕</button>
          </div>
          <form onsubmit="App.handleCreateTopic(event, ${context.courseId})">
            <div class="modal-body">
              <div style="margin-bottom: 1rem;">
                <label style="font-weight: 700; font-size: 0.82rem; display: block; margin-bottom: 0.3rem;">Topic Title</label>
                <input type="text" name="title" required placeholder="e.g. Tradeoffs in Quorum Consensus vs Leader Replication" style="width: 100%; padding: 0.65rem; border: 1px solid var(--border-color); border-radius: var(--radius-md);">
              </div>
              <div style="margin-bottom: 1rem;">
                <label style="font-weight: 700; font-size: 0.82rem; display: block; margin-bottom: 0.3rem;">Discussion Prompt</label>
                <textarea name="content" rows="5" required style="width: 100%; padding: 0.65rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-family: inherit;"></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline" onclick="App.closeModal()">Cancel</button>
              <button type="submit" class="btn btn-primary">Start Discussion</button>
            </div>
          </form>
        </div>
      `);
    } else if (name === 'editCourseModal') {
      try {
        const courseData = await API.getCourse(context.courseId);
        const course = courseData.course || courseData;
        const presets = [
          { url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&fit=crop&q=80', label: '💻 Programming' },
          { url: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=400&fit=crop&q=80', label: '🤖 AI / ML' },
          { url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&fit=crop&q=80', label: '🔐 Cybersecurity' },
          { url: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400&fit=crop&q=80', label: '☁️ Cloud' },
          { url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&fit=crop&q=80', label: '📊 Data Science' },
          { url: 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=400&fit=crop&q=80', label: '🗄️ Databases' }
        ];

        this.showCustomModal(`
          <div class="modal-dialog" style="max-width: 600px;">
            <div class="modal-header">
              <h3>✏️ Wax ka beddel Koorsada: ${course.code || ''}</h3>
              <button class="drawer-toggle-btn" onclick="App.closeModal()">✕</button>
            </div>
            <form id="edit-course-form" onsubmit="App.handleEditCourse(event, ${course.id})">
              <div class="modal-body">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-bottom:1rem;">
                  <div>
                    <label style="font-weight:700;font-size:0.82rem;display:block;margin-bottom:0.3rem;">Course Code *</label>
                    <input type="text" name="code" required value="${course.code || ''}" style="width:100%;padding:0.65rem;border:1px solid var(--border-color);border-radius:var(--radius-md);">
                  </div>
                  <div>
                    <label style="font-weight:700;font-size:0.82rem;display:block;margin-bottom:0.3rem;">Pass % (default 60)</label>
                    <input type="number" name="pass_percentage" min="1" max="100" value="${course.pass_percentage || 60}" style="width:100%;padding:0.65rem;border:1px solid var(--border-color);border-radius:var(--radius-md);">
                  </div>
                </div>
                <div style="margin-bottom:1rem;">
                  <label style="font-weight:700;font-size:0.82rem;display:block;margin-bottom:0.3rem;">Course Title *</label>
                  <input type="text" name="title" required value="${(course.title || '').replace(/"/g, '&quot;')}" style="width:100%;padding:0.65rem;border:1px solid var(--border-color);border-radius:var(--radius-md);">
                </div>
                <div style="margin-bottom:1rem;">
                  <label style="font-weight:700;font-size:0.82rem;display:block;margin-bottom:0.3rem;">🎯 Sanadka / Heerka Koorso (Target Level) *</label>
                  <select name="target_year" required style="width:100%;padding:0.65rem;border:1px solid var(--border-color);border-radius:var(--radius-md);background:var(--bg-surface);color:var(--text-main);">
                    <option value="All Years" ${(!course.target_year || course.target_year === 'All Years') ? 'selected' : ''}>Dhammaan Sanadaha (Furan / Open to All)</option>
                    <option value="Year 1" ${course.target_year === 'Year 1' ? 'selected' : ''}>Year 1 (Ardayda Sanadka 1-aad oo Kaliya)</option>
                    <option value="Year 2" ${course.target_year === 'Year 2' ? 'selected' : ''}>Year 2 (Ardayda Sanadka 2-aad oo Kaliya)</option>
                    <option value="Year 3" ${course.target_year === 'Year 3' ? 'selected' : ''}>Year 3 (Ardayda Sanadka 3-aad oo Kaliya)</option>
                    <option value="Year 4" ${course.target_year === 'Year 4' ? 'selected' : ''}>Year 4 (Ardayda Sanadka 4-aad oo Kaliya)</option>
                  </select>
                  <small style="font-size:0.74rem;color:var(--text-muted);display:block;margin-top:0.25rem;">
                    Xusuusin: Ardayda Year 1 ma geli karaan koorsadan haddii loo doorto Year 2.
                  </small>
                </div>
                <div style="margin-bottom:1rem;">
                  <label style="font-weight:700;font-size:0.82rem;display:block;margin-bottom:0.3rem;">Description</label>
                  <textarea name="description" rows="2" style="width:100%;padding:0.65rem;border:1px solid var(--border-color);border-radius:var(--radius-md);font-family:inherit;">${course.description || ''}</textarea>
                </div>
                <div style="margin-bottom:1rem;">
                  <label style="font-weight:700;font-size:0.82rem;display:block;margin-bottom:0.5rem;">📷 Course Thumbnail</label>
                  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0.5rem;margin-bottom:0.75rem;">
                    ${presets.map((p) => `
                      <div class="thumb-preset" data-url="${p.url}" onclick="App.selectCoverPreset(this, '${p.url}')" style="cursor:pointer;border:2px solid ${course.cover_image === p.url ? 'var(--primary)' : 'var(--border-color)'};border-radius:var(--radius-md);overflow:hidden;transition:border-color 0.2s;">
                        <img src="${p.url}" alt="${p.label}" style="width:100%;height:60px;object-fit:cover;display:block;">
                        <div style="padding:0.2rem 0.4rem;font-size:0.7rem;font-weight:600;text-align:center;">${p.label}</div>
                      </div>
                    `).join('')}
                  </div>
                  <input type="hidden" name="cover_image" id="cover-preset-url" value="${course.cover_image || ''}">
                  <div style="display:flex;gap:0.5rem;align-items:center;">
                    <div style="flex:1;">
                      <label style="font-size:0.78rem;font-weight:600;display:block;margin-bottom:0.3rem;">Upload new image</label>
                      <input type="file" name="cover_file" accept="image/*" onchange="App.previewCoverFile(this)" style="font-size:0.8rem;width:100%;">
                    </div>
                    <div style="flex:1;">
                      <label style="font-size:0.78rem;font-weight:600;display:block;margin-bottom:0.3rem;">or paste image URL</label>
                      <input type="url" name="cover_url_input" value="${course.cover_image && !course.cover_image.startsWith('/uploads') ? course.cover_image : ''}" placeholder="https://..." oninput="App.setCoverUrl(this.value)" style="width:100%;padding:0.5rem;border:1px solid var(--border-color);border-radius:var(--radius-md);font-size:0.82rem;">
                    </div>
                  </div>
                  <div id="cover-preview-container" style="margin-top:0.5rem;${course.cover_image ? 'display:block;' : 'display:none;'}">
                    <img id="cover-preview-img" src="${course.cover_image || ''}" alt="Preview" style="width:100%;max-height:120px;object-fit:cover;border-radius:var(--radius-md);border:1px solid var(--border-color);">
                  </div>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-outline" onclick="App.closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">💾 Save Changes</button>
              </div>
            </form>
          </div>
        `);
      } catch (err) {
        this.showToast('Koorso xogteeda lama soo heli karo: ' + err.message, 'error');
      }
    }
  },

  handleActivityTypeChange(type) {
    const field = document.getElementById('activity-dynamic-field');
    if (!field) return;
    if (type === 'video') {
      field.innerHTML = `
        <div style="background:var(--bg-surface-alt);border:1px solid var(--border-color);border-radius:var(--radius-md);padding:0.9rem;margin-bottom:1rem;">
          <div style="font-weight:700;font-size:0.84rem;margin-bottom:0.6rem;color:var(--primary);display:flex;align-items:center;gap:0.4rem;">
            <span>🎥</span> Xulashada Video-ga (Link ama Device-kaaga):
          </div>

          <div style="margin-bottom: 0.85rem;">
            <label style="font-weight: 700; font-size: 0.8rem; display: block; margin-bottom: 0.3rem;">
              🔗 1. Video Link (YouTube, Vimeo, ama MP4 Link toos ah)
            </label>
            <input type="url" name="video_url" id="activity-video-url" placeholder="https://www.youtube.com/watch?v=... ama https://youtu.be/..." style="width: 100%; padding: 0.6rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 0.82rem;">
            <span style="font-size: 0.72rem; color: var(--text-muted); display: block; margin-top: 0.2rem;">
              ✓ Waxay si toos ah u taageertaa YouTube (HD, Fullscreen, Shorts) iyo Vimeo.
            </span>
          </div>

          <div style="text-align: center; font-size: 0.74rem; font-weight: 700; color: var(--text-muted); margin: 0.5rem 0;">— AMA —</div>

          <div>
            <label style="font-weight: 700; font-size: 0.8rem; display: block; margin-bottom: 0.3rem;">
              💻 2. Ka soo geli Kumbuyuutarkaaga / Device-ka (MP4, MOV, WebM, MKV)
            </label>
            <input type="file" name="file" id="activity-video-file" accept="video/*,.mp4,.mov,.mkv,.webm,.avi,.m4v,.3gp,.wmv,.ogv" style="font-size: 0.8rem; width: 100%; padding: 0.4rem; background: var(--bg-surface); border: 1px dashed var(--border-color); border-radius: var(--radius-md);">
            <span style="font-size: 0.72rem; color: var(--text-muted); display: block; margin-top: 0.2rem;">
              ✓ Waxaad device-kaaga uga soo shuban kartaa video toos ah (MP4, MOV, WebM, MKV ilaa 500MB).
            </span>
          </div>
        </div>
      `;
    } else if (type === 'document') {
      field.innerHTML = `
        <div style="background:var(--bg-surface-alt);border:1px solid var(--border-color);border-radius:var(--radius-md);padding:0.9rem;margin-bottom:1rem;">
          <label style="font-weight: 700; font-size: 0.82rem; display: block; margin-bottom: 0.4rem;">
            📄 Soo geli Faylka Document-ka (.pdf, .docx, .pptx) *
          </label>
          <input type="file" name="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx" required style="font-size: 0.82rem; width: 100%; padding: 0.5rem; background: var(--bg-surface); border: 1px dashed var(--border-color); border-radius: var(--radius-md);">
        </div>
      `;
    } else {
      field.innerHTML = `
        <div style="margin-bottom: 1rem;">
          <label style="font-weight: 700; font-size: 0.82rem; display: block; margin-bottom: 0.3rem;">
            📝 Qoraalka Casharka (Reading Body)
          </label>
          <textarea name="content_body" rows="5" placeholder="Halkan ku qor qoraalka iyo nuxurka casharka..." style="width: 100%; padding: 0.65rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-family: inherit; font-size: 0.88rem;"></textarea>
        </div>
      `;
    }
  },

  selectCoverPreset(el, url) {
    document.querySelectorAll('.thumb-preset').forEach(p => p.style.borderColor = 'var(--border-color)');
    el.style.borderColor = 'var(--primary)';
    const hiddenInput = document.getElementById('cover-preset-url');
    if (hiddenInput) hiddenInput.value = url;
    const preview = document.getElementById('cover-preview-container');
    const img = document.getElementById('cover-preview-img');
    if (preview && img) { img.src = url; preview.style.display = 'block'; }
    // clear file input
    const fileInput = document.querySelector('[name="cover_file"]');
    if (fileInput) fileInput.value = '';
  },

  previewCoverFile(input) {
    if (input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = e => {
        const preview = document.getElementById('cover-preview-container');
        const img = document.getElementById('cover-preview-img');
        if (preview && img) { img.src = e.target.result; preview.style.display = 'block'; }
      };
      reader.readAsDataURL(input.files[0]);
      // clear preset selection
      document.querySelectorAll('.thumb-preset').forEach(p => p.style.borderColor = 'var(--border-color)');
      const hiddenInput = document.getElementById('cover-preset-url');
      if (hiddenInput) hiddenInput.value = '';
    }
  },

  setCoverUrl(url) {
    const hiddenInput = document.getElementById('cover-preset-url');
    if (hiddenInput) hiddenInput.value = url;
    if (url) {
      const preview = document.getElementById('cover-preview-container');
      const img = document.getElementById('cover-preview-img');
      if (preview && img) { img.src = url; preview.style.display = 'block'; }
      document.querySelectorAll('.thumb-preset').forEach(p => p.style.borderColor = 'var(--border-color)');
    }
  },

  async handleCreateCourse(e) {
    e.preventDefault();
    const form = e.target;
    const fileInput = form.querySelector('[name="cover_file"]');
    const hasFile = fileInput && fileInput.files && fileInput.files.length > 0;
    try {
      let res;
      if (hasFile) {
        const fd = new FormData(form);
        // Remove the cover_url_input field, keep cover_file
        fd.delete('cover_url_input');
        res = await API.createCourse(fd);
      } else {
        const presetUrl = (document.getElementById('cover-preset-url') || {}).value || '';
        const urlInput = form.cover_url_input ? form.cover_url_input.value : '';
        const coverImage = presetUrl || urlInput || '';
        res = await API.createCourse({
          code: form.code.value,
          title: form.title.value,
          description: form.description.value,
          pass_percentage: form.pass_percentage.value,
          target_year: form.target_year ? form.target_year.value : 'All Years',
          cover_image: coverImage
        });
      }
      this.closeModal();
      this.showToast('✅ Koorsada si guul leh ayaa loo abuuray (Course created)!');
      this.navigate(`/course/${res.course.id}`);
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  async handleEditCourse(e, courseId) {
    e.preventDefault();
    const form = e.target;
    const fileInput = form.querySelector('[name="cover_file"]');
    const hasFile = fileInput && fileInput.files && fileInput.files.length > 0;
    try {
      if (hasFile) {
        const fd = new FormData(form);
        fd.delete('cover_url_input');
        await API.updateCourse(courseId, fd);
      } else {
        const presetUrl = (document.getElementById('cover-preset-url') || {}).value || '';
        const urlInput = form.cover_url_input ? form.cover_url_input.value : '';
        const coverImage = presetUrl || urlInput || '';
        await API.updateCourse(courseId, {
          code: form.code.value,
          title: form.title.value,
          description: form.description.value,
          pass_percentage: parseFloat(form.pass_percentage.value) || 60,
          target_year: form.target_year ? form.target_year.value : 'All Years',
          cover_image: coverImage
        });
      }
      this.closeModal();
      this.showToast('✅ Koorsada si guul leh ayaa loo cusboonaysiiyay!', 'success');
      this.refreshCurrentView();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  async deleteCourse(courseId, title) {
    const courseTitle = title || 'koorsadan';
    if (!confirm(`Ma hubtaa inaad tirtirto "${courseTitle}"?\nDhammaan casharrada, quizzes-ka, iyo assignments-ka ku jira way tirtirmi doonaan.`)) {
      return;
    }
    try {
      await API.deleteCourse(courseId);
      this.showToast('🗑 Koorsadii si guul leh ayaa loo tirtiray!', 'success');
      if (window.location.hash.startsWith(`#/course/${courseId}`)) {
        this.navigate('/dashboard');
      } else {
        this.refreshCurrentView();
      }
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  async handleCreateQuiz(e, courseId) {
    e.preventDefault();
    const form = e.target;
    try {
      const res = await API.createQuiz(courseId, {
        title: form.title.value,
        description: form.description.value,
        time_limit: parseInt(form.time_limit.value) || null,
        pass_percentage: parseFloat(form.pass_percentage.value) || 60,
        quiz_type: form.quiz_type.value,
        max_attempts: parseInt(form.max_attempts.value) || 3
      });
      this.closeModal();
      this.showToast('✅ Quiz/Exam created! Now add questions.');
      this.showModal('addQuestionModal', { quizId: res.quiz.id, quizTitle: res.quiz.title });
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  async handleAddQuestion(e, quizId) {
    e.preventDefault();
    const form = e.target;
    const qType = form.question_type.value;
    const optionsText = form.options_text ? form.options_text.value : "";
    let options = null;
    if (qType === "multiple_choice" && optionsText) {
      options = optionsText.split("\n").map(o => o.trim()).filter(Boolean);
    }
    const correctAnswer = form.correct_answer ? form.correct_answer.value : null;
    try {
      await API.addQuizQuestion(quizId, {
        question_text: form.question_text.value,
        question_type: qType,
        options: options,
        correct_answer: correctAnswer,
        correct_answer_text: correctAnswer,
        points: parseFloat(form.points.value) || 10,
        explanation: form.explanation ? form.explanation.value : null
      });
      this.showToast("Question added successfully!");
      form.reset();
      App.handleQuestionTypeChange(form.question_type.value);
      this.refreshCurrentView();
    } catch (err) {
      this.showToast(err.message, "error");
    }
  },

  handleQuestionTypeChange(type) {
    const dynamicField = document.getElementById('question-dynamic-field');
    if (!dynamicField) return;
    if (type === 'multiple_choice') {
      dynamicField.innerHTML = `
        <div style="margin-bottom:0.75rem;">
          <label style="font-weight:700;font-size:0.82rem;display:block;margin-bottom:0.3rem;">Answer Options (one per line)</label>
          <textarea name="options_text" rows="4" required placeholder="Option A\nOption B\nOption C\nOption D" style="width:100%;padding:0.65rem;border:1px solid var(--border-color);border-radius:var(--radius-md);font-family:inherit;"></textarea>
        </div>
        <div style="margin-bottom:0.75rem;">
          <label style="font-weight:700;font-size:0.82rem;display:block;margin-bottom:0.3rem;">Correct Answer (exact text)</label>
          <input type="text" name="correct_answer" required placeholder="e.g. Option A" style="width:100%;padding:0.65rem;border:1px solid var(--border-color);border-radius:var(--radius-md);">
        </div>
      `;
    } else if (type === 'true_false') {
      dynamicField.innerHTML = `
        <div style="margin-bottom:0.75rem;">
          <label style="font-weight:700;font-size:0.82rem;display:block;margin-bottom:0.3rem;">Correct Answer</label>
          <select name="correct_answer" required style="width:100%;padding:0.65rem;border:1px solid var(--border-color);border-radius:var(--radius-md);">
            <option value="true">True</option>
            <option value="false">False</option>
          </select>
        </div>
      `;
    } else if (type === 'short_answer') {
      dynamicField.innerHTML = `
        <div style="margin-bottom:0.75rem;">
          <label style="font-weight:700;font-size:0.82rem;display:block;margin-bottom:0.3rem;">Model Answer (for auto-grading)</label>
          <input type="text" name="correct_answer" placeholder="Exact or keywords expected" style="width:100%;padding:0.65rem;border:1px solid var(--border-color);border-radius:var(--radius-md);">
        </div>
      `;
    } else {
      dynamicField.innerHTML = `<p style="font-size:0.82rem;color:var(--text-muted);padding:0.5rem 0;">Essay questions are manually graded by the professor.</p>`;
    }
  },

  async handleCreateAssignment(e, courseId) {
    e.preventDefault();
    const form = e.target;
    const fd = new FormData(form);
    try {
      await API.createAssignment(courseId, fd);
      this.closeModal();
      this.showToast('✅ Assignment created!');
      this.refreshCurrentView();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  async handleCreateBadge(e) {
    e.preventDefault();
    const form = e.target;
    try {
      await API.createBadge({
        name: form.name.value,
        description: form.description.value,
        icon: form.icon.value || '🏆',
        criteria: form.criteria.value
      });
      this.closeModal();
      this.showToast('✅ Badge created!');
      this.refreshCurrentView();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  async handleAddModule(e, courseId) {
    e.preventDefault();
    const form = e.target;
    try {
      await API.createModule(courseId, {
        title: form.title.value,
        description: form.description.value
      });
      this.closeModal();
      this.showToast('Section added!');
      this.refreshCurrentView();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  async handleAddActivity(e, moduleId) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const origBtnHtml = submitBtn ? submitBtn.innerHTML : 'Add Activity';

    // If moduleId wasn't passed directly (course-level button), read from the dropdown
    if (!moduleId) {
      const moduleSelect = document.getElementById('activity-module-select');
      if (!moduleSelect || !moduleSelect.value) {
        this.showToast('Fadlan dooro qaybta (module) aad casharku ku geli doono!', 'error');
        return;
      }
      moduleId = parseInt(moduleSelect.value);
    }

    const formData = new FormData(form);

    // Provide friendly progress indication during upload
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '⏳ Fadlan sug... Waxaa socda soo gelinta (Uploading)...';
    }

    try {
      await API.createLesson(moduleId, formData);
      this.closeModal();
      this.showToast('Casharka / Video-ga si guul leh ayaa loo daray! ✓');
      this.refreshCurrentView();
    } catch (err) {
      this.showToast(err.message || 'Khalad ayaa ka dhacay soo gelinta casharka.', 'error');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = origBtnHtml;
      }
    }
  },

  async handleCreateAttendanceSession(e, courseId) {
    e.preventDefault();
    const form = e.target;
    try {
      await API.createAttendanceSession(courseId, {
        session_date: form.session_date.value,
        title: form.title.value
      });
      this.closeModal();
      this.showToast('Attendance session created!');
      this.refreshCurrentView();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  async handleCreateAnnouncement(e, courseId) {
    e.preventDefault();
    const form = e.target;
    try {
      await API.createAnnouncement(courseId, {
        title: form.title.value,
        content: form.content.value,
        is_pinned: form.is_pinned.checked
      });
      this.closeModal();
      this.showToast('Announcement posted to course!');
      this.refreshCurrentView();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  async handleCreateTopic(e, courseId) {
    e.preventDefault();
    const form = e.target;
    try {
      const res = await API.createTopic(courseId, {
        title: form.title.value,
        content: form.content.value
      });
      this.closeModal();
      this.showToast('Topic started!');
      this.navigate(`/discussions/${res.topic.id}`);
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  setupSearch() {
    const input = document.getElementById('site-search-input');
    const dropdown = document.getElementById('search-results-dropdown');
    if (!input || !dropdown) return;

    let searchTimeout = null;
    input.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      const query = input.value.trim();
      if (query.length < 2) {
        dropdown.style.display = 'none';
        return;
      }

      searchTimeout = setTimeout(async () => {
        try {
          const res = await API.search(query);
          if (res.results.length === 0) {
            dropdown.innerHTML = `<div style="padding: 0.75rem 1rem; color: var(--text-muted); font-size: 0.8rem;">No results found for "${query}"</div>`;
          } else {
            dropdown.innerHTML = res.results.map(r => `
              <div style="padding: 0.65rem 1rem; border-bottom: 1px solid var(--border-color); cursor: pointer; font-size: 0.84rem;"
                   onclick="App.navigate('${r.link}'); document.getElementById('search-results-dropdown').style.display='none';">
                <div style="font-weight: 700; color: var(--text-main);">${r.title}</div>
                <div style="font-size: 0.74rem; color: var(--text-muted);">${r.description ? r.description.slice(0, 60) + '...' : ''}</div>
              </div>
            `).join('');
          }
          dropdown.style.display = 'block';
        } catch (e) {}
      }, 250);
    });

    document.addEventListener('click', (e) => {
      if (!input.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.style.display = 'none';
      }
    });
  },

  async showNotifications() {
    try {
      const data = await API.getNotifications();
      const notifs = data.notifications || [];

      // Reset badge
      const badge = document.getElementById('notif-badge-count');
      if (badge) badge.style.display = 'none';

      this.showCustomModal(`
        <div class="modal-dialog">
          <div class="modal-header">
            <h3>Notifications</h3>
            <button class="drawer-toggle-btn" onclick="App.closeModal()">✕</button>
          </div>
          <div class="modal-body" style="max-height: 400px; overflow-y: auto;">
            <div style="display: flex; flex-direction: column; gap: 0.75rem;">
              ${notifs.map(n => `
                <div style="border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 0.85rem 1rem; background: var(--bg-surface-alt);">
                  <div style="font-weight: 700; font-size: 0.88rem; margin-bottom: 0.2rem;">${n.title}</div>
                  <div style="font-size: 0.82rem; color: var(--text-main); margin-bottom: 0.4rem;">${n.message}</div>
                  <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.72rem; color: var(--text-muted);">
                    <span>${new Date(n.created_at).toLocaleString()}</span>
                    ${n.link ? `<a href="${n.link}" onclick="App.closeModal()" style="font-weight: 700;">Open →</a>` : ''}
                  </div>
                </div>
              `).join('')}

              ${notifs.length === 0 ? `
                <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
                  No new notifications.
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      `);
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  selectBadgeEmoji(emoji, el) {
    document.querySelectorAll('.badge-emoji-opt').forEach(e => e.style.borderColor = 'transparent');
    el.style.borderColor = 'var(--primary)';
    const input = document.getElementById('badge-icon-input');
    if (input) input.value = emoji;
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    if (type === 'error') {
      toast.style.background = '#ef4444';
    } else if (type === 'warning') {
      toast.style.background = '#f59e0b';
    } else {
      toast.style.background = '#0f4c81';
    }
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
};

window.App = App;
window.addEventListener('DOMContentLoaded', () => App.init());
