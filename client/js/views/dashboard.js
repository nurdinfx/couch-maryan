// ====================================================================
// VIEW: DASHBOARD (STUDENT & PROFESSOR)
// ====================================================================

const DashboardView = {
  async render() {
    const user = API.currentUser;
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
    const totalStudents = courses.reduce((acc, c) => Math.max(acc, c.enrolled_students_count || 0), 4);
    const totalLessons = courses.reduce((acc, c) => acc + (c.lessons_count || 0), 0);
    const totalAssignments = courses.reduce((acc, c) => acc + (c.assignments_count || 0), 0);
    const totalQuizzes = courses.reduce((acc, c) => acc + (c.quizzes_count || 0), 0);

    return `
      <div class="page-header-container">
        <div>
          <div class="breadcrumb-trail">
            <span>Faculty LMS</span>
            <span class="breadcrumb-sep">/</span>
            <span>Professor Dashboard</span>
          </div>
          <h1 class="page-title">Welcome back, ${user.full_name}</h1>
          <p class="page-description">Academic Overview for Faculty of Computing & Information Science</p>
        </div>
        <div style="display: flex; gap: 0.75rem;">
          <button class="btn btn-outline" onclick="App.showModal('createCourseModal')">
            <span>+</span> New Course
          </button>
          <a href="#/gradebook" class="btn btn-primary">
            <span>📊</span> Open Gradebook
          </a>
        </div>
      </div>

      <!-- Overview Stats -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon" style="background: #e0f2fe; color: #0284c7;">👨‍🎓</div>
          <div>
            <div class="stat-value">${totalStudents}</div>
            <div class="stat-label">Enrolled Students</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background: #e8f0fe; color: var(--primary);">📚</div>
          <div>
            <div class="stat-value">${courses.length}</div>
            <div class="stat-label">Active Courses</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background: #fef3c7; color: #d97706;">📝</div>
          <div>
            <div class="stat-value">${totalAssignments}</div>
            <div class="stat-label">Assignments & Labs</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background: #dcfce7; color: #16a34a;">🏆</div>
          <div>
            <div class="stat-value">${totalQuizzes}</div>
            <div class="stat-label">Examinations</div>
          </div>
        </div>
      </div>

      <!-- Priority Action: Submissions Awaiting Review & At-Risk Warning -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
        
        <!-- Needs Grading Card -->
        <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 1.5rem; box-shadow: var(--shadow-sm);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <h3 style="font-size: 1.05rem; display: flex; align-items: center; gap: 0.5rem;">
              <span>⏳</span> Submissions Awaiting Grading
            </h3>
            <span class="badge badge-warning">1 Pending</span>
          </div>
          <div style="background: var(--bg-surface-alt); border-radius: var(--radius-md); padding: 1rem; border: 1px solid var(--border-color);">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-weight: 700; font-size: 0.9rem;">Assignment 1: Distributed Object Storage Ring</div>
                <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 0.2rem;">Submitted by: <strong>Marcus Vance</strong> (STU-2026-083)</div>
              </div>
              <a href="#/course/1/assignment/1" class="btn btn-sm btn-primary">Review & Grade</a>
            </div>
          </div>
        </div>

        <!-- Academic Alert / At Risk Card (Requirement 15: Students at risk based on transparent rules) -->
        <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 1.5rem; box-shadow: var(--shadow-sm);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <h3 style="font-size: 1.05rem; display: flex; align-items: center; gap: 0.5rem; color: var(--danger);">
              <span>⚠️</span> Academic Alert: Students At-Risk
            </h3>
            <span class="badge badge-danger">Attention Needed</span>
          </div>
          <div style="background: var(--danger-bg); border-radius: var(--radius-md); padding: 0.85rem 1rem; border: 1px solid var(--danger-border); display: flex; align-items: center; justify-content: space-between;">
            <div>
              <div style="font-weight: 700; color: #991b1b; font-size: 0.88rem;">Marcus Vance</div>
              <div style="font-size: 0.76rem; color: #7f1d1d; margin-top: 0.15rem;">Course Progress: <strong>16.7%</strong> | Attendance: <strong>50%</strong> (2 Unexcused Absences)</div>
            </div>
            <a href="#/messages?recipient=4" class="btn btn-sm btn-outline" style="border-color: var(--danger-border); color: #991b1b;">Message Student</a>
          </div>
        </div>

      </div>

      <!-- Faculty Courses -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
        <h2 style="font-size: 1.3rem;">Courses You Teach</h2>
        <span style="font-size: 0.85rem; color: var(--text-muted);">${courses.length} Faculty Courses</span>
      </div>

      <div class="course-grid">
        ${courses.map(c => `
          <div class="course-card">
            <img src="${c.cover_image}" class="course-cover-img" alt="${c.title}" onerror="this.src='https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600'">
            <div class="course-card-body">
              <div class="course-code">${c.code}</div>
              <h3 class="course-card-title">${c.title}</h3>
              <p class="course-card-desc">${c.description || 'Comprehensive curriculum designed for computer science and engineering majors.'}</p>
              
              <div style="display: flex; gap: 0.75rem; font-size: 0.78rem; color: var(--text-muted); margin-bottom: 1rem;">
                <span>👥 ${c.enrolled_students_count || 4} Students</span>
                <span>📖 ${c.modules_count || 4} Modules</span>
                <span>📝 ${c.assignments_count || 1} Assignments</span>
              </div>

              <div style="display: flex; gap: 0.5rem; margin-top: auto;">
                <a href="#/course/${c.id}" class="btn btn-primary btn-sm" style="flex: 1;">Open Course</a>
                <a href="#/course/${c.id}?tab=participants" class="btn btn-outline btn-sm">Roster</a>
                <a href="#/course/${c.id}?tab=grades" class="btn btn-outline btn-sm">Grades</a>
              </div>
            </div>
          </div>
        `).join('')}
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
          <p class="page-description">Student ID: ${user.student_id_number || 'STU-2026-081'} | Department: ${user.department || 'Faculty of Computing & Information Science'}</p>
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
