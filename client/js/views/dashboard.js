// ====================================================================
// VIEW: DASHBOARD (STUDENT & PROFESSOR)
// ====================================================================

const DashboardView = {
  async render() {
    const user = API.currentUser;
    if (!user) {
      return `
        <div class="card" style="padding: 2.5rem; text-align: center; max-width: 500px; margin: 3rem auto;">
          <h2>Faculty LMS Portal</h2>
          <p class="text-muted" style="margin: 1rem 0 1.5rem;">Fadlan gal akoonkaaga si aad u gasho koorsooyinkaaga.</p>
          <button class="btn btn-primary" onclick="App.showLoginModal()">Gal Akoonka (Login)</button>
        </div>
      `;
    }
    const isProfessor = user.role === 'professor' || user.role === 'admin';

    const coursesData = await API.getCourses();
    const courses = coursesData.courses || [];

    if (isProfessor) {
      return this.renderProfessorDashboard(user, courses);
    } else {
      return this.renderStudentDashboard(user, courses);
    }
  },

  renderProfessorDashboard(user, courses) {
    const totalStudents = courses.reduce((acc, c) => Math.max(acc, c.enrolled_students_count || 0), 0);
    const totalLessons = courses.reduce((acc, c) => acc + (c.lessons_count || 0), 0);
    const totalAssignments = courses.reduce((acc, c) => acc + (c.assignments_count || 0), 0);
    const totalQuizzes = courses.reduce((acc, c) => acc + (c.quizzes_count || 0), 0);

    const isSomali = (typeof I18N !== 'undefined' ? I18N.getLang() : 'so') === 'so';

    return `
      <div class="page-header-container">
        <div>
          <div class="breadcrumb-trail">
            <span>Guray Sicid Learning Platform</span>
            <span class="breadcrumb-sep">/</span>
            <span>${isSomali ? 'Xarunta Guud (Dashboard)' : 'Professor Dashboard'}</span>
          </div>
          <h1 class="page-title">${isSomali ? 'Ku soo dhawow mar kale' : 'Welcome back'}, ${user.full_name}</h1>
          <p class="page-description">Guray Sicid Learning Platform • Learning without limit</p>
        </div>
        <div style="display: flex; gap: 0.75rem;">
          <button class="btn btn-outline" onclick="App.showModal('createCourseModal')">
            <span>+</span> ${isSomali ? 'Koorso Cusub' : 'New Course'}
          </button>
          <a href="#/gradebook" class="btn btn-primary">
            <span>📊</span> ${isSomali ? 'Fur Buundooyinka' : 'Open Gradebook'}
          </a>
        </div>
      </div>

      <!-- Overview Stats -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon" style="background: #e0f2fe; color: #0284c7;">👨‍🎓</div>
          <div>
            <div class="stat-value">${totalStudents}</div>
            <div class="stat-label">${isSomali ? 'Ardayda Dhigata' : 'Enrolled Students'}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background: #e8f0fe; color: var(--primary);">📚</div>
          <div>
            <div class="stat-value">${courses.length}</div>
            <div class="stat-label">${isSomali ? 'Koorsooyinka Firfircoon' : 'Active Courses'}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background: #fef3c7; color: #d97706;">📝</div>
          <div>
            <div class="stat-value">${totalAssignments}</div>
            <div class="stat-label">${isSomali ? 'Layliyada & Labs' : 'Assignments & Labs'}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background: #dcfce7; color: #16a34a;">🏆</div>
          <div>
            <div class="stat-value">${totalQuizzes}</div>
            <div class="stat-label">${isSomali ? 'Imtixaanaadka' : 'Examinations'}</div>
          </div>
        </div>
      </div>

      <!-- Faculty Courses Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
        <h2 style="font-size: 1.3rem;">${isSomali ? 'Koorsooyinka aad Dhigto' : 'Courses You Teach'}</h2>
        <span style="font-size: 0.85rem; color: var(--text-muted);">${courses.length} ${isSomali ? 'Koorso' : 'Courses'}</span>
      </div>

      <div class="course-grid">
        ${courses.length > 0 ? courses.map(c => `
          <div class="course-card">
            <img src="${c.cover_image || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600'}" class="course-cover-img" alt="${c.title}" onerror="this.src='https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600'">
            <div class="course-card-body">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
                <span class="course-code">${c.code}</span>
                <span class="badge badge-primary" style="font-size: 0.7rem; font-weight: 700; background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd;">
                  🎯 ${c.target_year || 'All Years'}
                </span>
              </div>
              <h3 class="course-card-title">${c.title}</h3>
              <p class="course-card-desc">${c.description || (isSomali ? 'Manaahij waxbarasho oo casri ah.' : 'Comprehensive academic curriculum.')}</p>
              
              <div style="display: flex; gap: 0.75rem; font-size: 0.78rem; color: var(--text-muted); margin-bottom: 1rem;">
                <span>👥 ${c.enrolled_students_count || 0} ${isSomali ? 'Arday' : 'Students'}</span>
                <span>📖 ${c.modules_count || 0} ${isSomali ? 'Qaybood' : 'Modules'}</span>
                <span>📝 ${c.assignments_count || 0} ${isSomali ? 'Layli' : 'Assignments'}</span>
              </div>

              <div style="display: flex; gap: 0.5rem; margin-top: auto; flex-wrap: wrap;">
                <a href="#/course/${c.id}" class="btn btn-primary btn-sm" style="flex: 1;">${isSomali ? 'Fur Koorsada' : 'Open Course'}</a>
                <a href="#/course/${c.id}?tab=participants" class="btn btn-outline btn-sm">${isSomali ? 'Ardayda' : 'Roster'}</a>
                <a href="#/course/${c.id}?tab=grades" class="btn btn-outline btn-sm">${isSomali ? 'Buundooyinka' : 'Grades'}</a>
              </div>
              <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
                <button class="btn btn-outline btn-sm" style="flex:1; border-color:var(--primary); color:var(--primary);" onclick="App.showModal('editCourseModal', { courseId: ${c.id} })">✏️ ${isSomali ? 'Baddal' : 'Edit'}</button>
                <button class="btn btn-outline btn-sm" style="flex:1; border-color:var(--danger); color:var(--danger);" onclick="App.deleteCourse(${c.id}, '${c.title.replace(/'/g, "\\'")}')">🗑 ${isSomali ? 'Tirtir' : 'Delete'}</button>
              </div>
            </div>
          </div>
        `).join('') : `
          <div style="grid-column:1/-1;text-align:center;padding:3.5rem 1.5rem;background:var(--bg-card);border:2px dashed var(--border-color);border-radius:var(--radius-lg)">
            <div style="font-size:3rem;margin-bottom:0.75rem">📚</div>
            <h3 style="margin-bottom:0.5rem">${isSomali ? 'Weli Koorso Laguma darin' : 'No Courses Added Yet'}</h3>
            <p class="text-muted" style="margin-bottom:1.5rem;max-width:500px;margin-left:auto;margin-right:auto">
              ${isSomali ? 'Bilaab hadda abuurista koorsadaada koowaad adoo dooranaya heerka sanadka (Year 1 - Year 5).' : 'Start creating your courses and assigning them to academic levels (Year 1 to Year 5).'}
            </p>
            <button class="btn btn-primary" onclick="App.showModal('createCourseModal')">
              <span>+</span> ${isSomali ? 'Abuur Koorso Cusub' : 'Create New Course'}
            </button>
          </div>
        `}
      </div>
    `;
  },

  renderStudentDashboard(user, courses) {
    const completedCourses = courses.filter(c => c.progress_percentage >= 100).length;
    const inProgressCourses = courses.filter(c => c.progress_percentage < 100).length;

    return `
      <div class="page-header-container">
        <div>
          <div class="breadcrumb-trail">
            <span>Faculty LMS</span>
            <span class="breadcrumb-sep">/</span>
            <span>Student Dashboard</span>
          </div>
          <h1 class="page-title">Welcome, ${user.full_name}</h1>
          <p class="page-description">Student ID: ${user.student_id_number || 'STU-2026-081'} | Department: ${user.department || 'Faculty of Midwifery'}</p>
        </div>
        <div>
          <a href="#/badges" class="btn btn-outline">
            <span>🏆</span> My Achievements
          </a>
        </div>
      </div>

      <!-- Quick Metrics -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon" style="background: #e0f2fe; color: #0284c7;">📚</div>
          <div>
            <div class="stat-value">${courses.length}</div>
            <div class="stat-label">Enrolled Courses</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background: #dcfce7; color: #16a34a;">✅</div>
          <div>
            <div class="stat-value">${completedCourses}</div>
            <div class="stat-label">Completed Courses</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background: #fef3c7; color: #d97706;">⏳</div>
          <div>
            <div class="stat-value">${inProgressCourses}</div>
            <div class="stat-label">Courses In Progress</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background: #f3e8ff; color: #9333ea;">📜</div>
          <div>
            <div class="stat-value">${user.id === 5 ? '1 Certificate' : 'Eligible'}</div>
            <div class="stat-label">Faculty Credentials</div>
          </div>
        </div>
      </div>

      <!-- Continue Learning Shortcut -->
      ${courses.length > 0 ? `
        <div style="background: linear-gradient(135deg, var(--primary), #1e3a8a); color: white; border-radius: var(--radius-lg); padding: 1.75rem 2rem; margin-bottom: 2rem; box-shadow: var(--shadow-md); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
          <div>
            <span class="badge" style="background: rgba(255, 255, 255, 0.2); color: white; margin-bottom: 0.5rem;">CONTINUE LEARNING</span>
            <h2 style="font-size: 1.4rem; color: white; margin-bottom: 0.4rem;">${courses[0].code}: ${courses[0].title}</h2>
            <p style="font-size: 0.88rem; color: rgba(255, 255, 255, 0.85); max-width: 600px;">
              Instructor: ${courses[0].professor_name || 'Prof. Maryam Al-Mansoor'} - Pick up right where you left off.
            </p>
          </div>
          <a href="#/course/${courses[0].id}" class="btn" style="background: white; color: var(--primary); font-weight: 700; padding: 0.75rem 1.5rem;">
            Resume Course →
          </a>
        </div>
      ` : ''}

      <!-- Course Cards with Real Progress Bars -->
      <h2 style="font-size: 1.3rem; margin-bottom: 1.25rem;">My Enrolled Courses</h2>
      <div class="course-grid">
        ${courses.map(c => `
          <div class="course-card">
            <img src="${c.cover_image}" class="course-cover-img" alt="${c.title}" onerror="this.src='https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600'">
            <div class="course-card-body">
              <div class="course-code">${c.code}</div>
              <h3 class="course-card-title">${c.title}</h3>
              <p class="course-card-desc">${c.description || 'Access course lectures, video streams, laboratory assignments, and discussion topics.'}</p>
              
              <!-- Real Activity-Based Progress Bar -->
              <div class="progress-container">
                <div class="progress-header">
                  <span>Course Progress</span>
                  <span style="color: ${c.progress_percentage >= 100 ? 'var(--success)' : 'var(--primary)'};">${c.progress_percentage}%</span>
                </div>
                <div class="progress-bar-bg">
                  <div class="progress-bar-fill" style="width: ${c.progress_percentage}%;"></div>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--text-muted); margin-top: 0.35rem;">
                  <span>${c.completed_lessons_count || 0} of ${c.required_lessons_count || 0} activities completed</span>
                  ${c.progress_percentage >= 100 ? '<span style="color: var(--success); font-weight: 700;">✓ Completed</span>' : ''}
                </div>
              </div>

              <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
                <a href="#/course/${c.id}" class="btn btn-primary btn-sm" style="flex: 1;">Access Course</a>
                <a href="#/course/${c.id}?tab=grades" class="btn btn-outline btn-sm">My Grades</a>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }
};
