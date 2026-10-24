// ====================================================================
// VIEW: COURSE PAGE (MOODLE BOOST COURSE LAYOUT)
// ====================================================================

const CourseView = {
  async render(params) {
    const courseId = parseInt(params.id);
    const activeTab = params.tab || 'content';
    const user = API.currentUser;
    const isProfessor = user.role === 'professor' || user.role === 'admin';

    let courseData = null;
    try {
      courseData = await API.getCourse(courseId);
    } catch (err) {
      return `
        <div class="breadcrumb-trail">
          <a href="#/dashboard">${I18N.t('nav.dashboard', 'Dashboard')}</a>
          <span class="breadcrumb-sep">/</span>
          <span>${I18N.t('nav.courses', 'Courses')}</span>
        </div>
        <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 4rem 2rem; text-align: center; box-shadow: var(--shadow-sm); margin-top: 1rem;">
          <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
          <h2 style="font-size: 1.4rem; font-weight: 700; color: var(--danger); margin-bottom: 0.5rem;">
            Koorsada Lama Helin / Course Not Found
          </h2>
          <p style="color: var(--text-muted); margin-bottom: 1.5rem;">
            ${err.message || 'The requested course does not exist or you do not have permission to access it.'}
          </p>
          <a href="#/dashboard" class="btn btn-primary">${I18N.t('nav.dashboard', 'Return to Dashboard')}</a>
        </div>
      `;
    }

    const course = courseData.course;
    const modules = courseData.modules || [];
    const announcements = courseData.announcements || [];

    return `
      <!-- Breadcrumbs -->
      <div class="breadcrumb-trail">
        <a href="#/dashboard">Dashboard</a>
        <span class="breadcrumb-sep">/</span>
        <a href="#/courses">Courses</a>
        <span class="breadcrumb-sep">/</span>
        <span>${course.code}</span>
      </div>

      <!-- Course Hero Header -->
      <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 2rem; margin-bottom: 2rem; box-shadow: var(--shadow-sm); position: relative; overflow: hidden;">
        <div style="display: flex; gap: 2rem; align-items: flex-start; flex-wrap: wrap;">
          <img src="${course.cover_image || App.getCourseFallback(course.code, course.title)}" style="width: 180px; height: 120px; border-radius: var(--radius-md); object-fit: cover; box-shadow: var(--shadow-sm);" onerror="App.handleCoverError(this, '${course.code}', '${(course.title || '').replace(/'/g, "\\'")}')">
          
          <div style="flex: 1; min-width: 280px;">
            <div style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.4rem; flex-wrap: wrap;">
              <span class="course-code" style="font-size: 0.85rem;">${course.code}</span>
              <span class="badge" style="background: #e0f2fe; color: #0369a1; font-weight: 700; font-size: 0.78rem;">🎯 ${course.target_year || 'All Years'}</span>
              ${course.is_published ? '<span class="badge badge-success">Published</span>' : '<span class="badge badge-warning">Draft</span>'}
            </div>
            <h1 style="font-size: 1.6rem; margin-bottom: 0.5rem;">${course.title}</h1>
            <p style="color: var(--text-muted); font-size: 0.88rem; max-width: 750px; margin-bottom: 0.85rem;">
              ${course.description}
            </p>

            <div style="display: flex; align-items: center; gap: 1.5rem; font-size: 0.82rem; color: var(--text-muted); flex-wrap: wrap;">
              <span>👨‍🏫 Instructor: <strong>${course.professor_name || 'Prof. Maryam Al-Mansoor'}</strong></span>
              <span>📅 Term: <strong>${course.start_date || 'Fall 2026'} - ${course.end_date || 'Dec 2026'}</strong></span>
              <span>🎯 Pass Mark: <strong>${course.pass_percentage || 60}%</strong></span>
            </div>
          </div>

          <!-- Student Progress Badge / Completion Widget -->
          ${user.role === 'student' ? `
            <div style="background: var(--bg-surface-alt); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem 1.25rem; min-width: 220px; text-align: center;">
              <div style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.35rem;">Your Course Progress</div>
              <div style="font-size: 2rem; font-weight: 800; font-family: var(--font-display); color: ${course.progress_percentage >= 100 ? 'var(--success)' : 'var(--primary)'}; line-height: 1.1;">
                ${course.progress_percentage}%
              </div>
              <div class="progress-bar-bg" style="margin: 0.5rem 0;">
                <div class="progress-bar-fill" style="width: ${course.progress_percentage}%;"></div>
              </div>
              <div style="font-size: 0.74rem; color: var(--text-muted);">
                ${course.completed_lessons} of ${course.total_required_lessons} activities done
              </div>
            </div>
          ` : `
            <div style="display: flex; flex-direction: column; gap: 0.5rem; min-width:190px;">
              <button class="btn btn-primary btn-sm" onclick="App.showModal('addActivityModal', { courseId: ${course.id} })">
                <span>+</span> Add Activity / Resource
              </button>
              <button class="btn btn-outline btn-sm" onclick="App.showModal('addModuleModal', { courseId: ${course.id} })">
                <span>+</span> Add Section
              </button>
              <button class="btn btn-outline btn-sm" onclick="App.showModal('addQuizModal', { courseId: ${course.id} })" style="border-color:#f59e0b;color:#f59e0b;">
                📋 Add Quiz / Exam
              </button>
              <button class="btn btn-outline btn-sm" onclick="App.showModal('addAssignmentModal', { courseId: ${course.id} })" style="border-color:#06b6d4;color:#06b6d4;">
                📌 Add Assignment
              </button>
              <div style="display: flex; gap: 0.4rem; margin-top: 0.2rem;">
                <button class="btn btn-outline btn-sm" onclick="App.showModal('editCourseModal', { courseId: ${course.id} })" style="flex: 1; border-color: var(--primary); color: var(--primary);">
                  ✏️ Edit
                </button>
                <button class="btn btn-outline btn-sm" onclick="App.deleteCourse(${course.id}, '${(course.title || '').replace(/'/g, "\\'")}')" style="flex: 1; border-color: var(--danger); color: var(--danger);">
                  🗑 Delete
                </button>
              </div>
            </div>
          `}
        </div>
      </div>

      <!-- Secondary Navigation Tabs (Moodle Boost style) -->
      <div class="course-tabs-nav">
        <div class="course-tab-item ${activeTab === 'content' ? 'active' : ''}" onclick="App.navigate('/course/${course.id}?tab=content')">
          <span>📖</span> Course Content
        </div>
        ${isProfessor ? `
          <div class="course-tab-item ${activeTab === 'participants' ? 'active' : ''}" onclick="App.navigate('/course/${course.id}?tab=participants')">
            <span>👥</span> Participants & Progress
          </div>
        ` : ''}
        <div class="course-tab-item ${activeTab === 'grades' ? 'active' : ''}" onclick="App.navigate('/course/${course.id}?tab=grades')">
          <span>📊</span> ${isProfessor ? 'Gradebook' : 'My Grades'}
        </div>
        <div class="course-tab-item ${activeTab === 'attendance' ? 'active' : ''}" onclick="App.navigate('/course/${course.id}?tab=attendance')">
          <span>📅</span> Attendance
        </div>
        <div class="course-tab-item ${activeTab === 'discussions' ? 'active' : ''}" onclick="App.navigate('/course/${course.id}?tab=discussions')">
          <span>💬</span> Forum Discussions
        </div>
        <div class="course-tab-item ${activeTab === 'announcements' ? 'active' : ''}" onclick="App.navigate('/course/${course.id}?tab=announcements')">
          <span>📢</span> Announcements
        </div>
      </div>

      <!-- Tab Content Routing -->
      <div id="course-tab-content">
        ${this.renderTabContent(activeTab, course, modules, announcements, isProfessor, user)}
      </div>
    `;
  },

  renderTabContent(tab, course, modules, announcements, isProfessor, user) {
    switch (tab) {
      case 'participants':
        return this.renderParticipantsTab(course.id);
      case 'grades':
        return isProfessor ? this.renderGradebookTab(course.id) : this.renderStudentGradesTab(course.id);
      case 'attendance':
        return this.renderAttendanceTab(course.id, isProfessor);
      case 'discussions':
        return this.renderDiscussionsTab(course.id);
      case 'announcements':
        return this.renderAnnouncementsTab(course.id, announcements, isProfessor);
      case 'content':
      default:
        return this.renderModulesContent(course, modules, isProfessor);
    }
  },

  renderModulesContent(course, modules, isProfessor) {
    if (modules.length === 0) {
      return `
        <div style="text-align: center; padding: 4rem 2rem; background: var(--bg-surface); border-radius: var(--radius-lg); border: 1px dashed var(--border-color);">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📂</div>
          <h3>No Course Modules Yet</h3>
          <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1.5rem;">Start structuring your course into topics, lessons, and learning activities.</p>
          ${isProfessor ? `<button class="btn btn-primary" onclick="App.showModal('addModuleModal', { courseId: ${course.id} })">+ Create First Section</button>` : ''}
        </div>
      `;
    }

    return `
      <div class="course-modules-container">
        ${modules.map((m, index) => `
          <div class="course-module-box" id="module-box-${m.id}">
            <div class="module-header" onclick="App.toggleModuleCollapse(${m.id})">
              <div class="module-title-wrap">
                <span class="module-chevron expanded" id="chevron-${m.id}">▶</span>
                <div>
                  <h3 class="module-title">${m.title}</h3>
                  ${m.description ? `<p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.15rem;">${m.description}</p>` : ''}
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 0.75rem;">
                <span style="font-size: 0.78rem; color: var(--text-muted);">
                  ${(m.lessons?.length || 0) + (m.assignments?.length || 0) + (m.quizzes?.length || 0)} activities
                </span>
                ${isProfessor ? `
                  <button class="btn btn-outline btn-sm" onclick="event.stopPropagation(); App.showModal('addActivityModal', { courseId: ${course.id}, moduleId: ${m.id} })" title="Add activity to this section">
                    + Add
                  </button>
                  <button class="btn btn-outline btn-sm" style="color: var(--danger); border-color: var(--danger-border);" onclick="event.stopPropagation(); App.deleteModule(${m.id})" title="Delete module">
                    🗑
                  </button>
                ` : ''}
              </div>
            </div>

            <!-- Activities Accordion Body -->
            <div class="module-activities-list" id="module-content-${m.id}">
              
              ${isProfessor && ((m.lessons?.length || 0) + (m.assignments?.length || 0) + (m.quizzes?.length || 0)) > 0 ? `
                <div class="module-selection-bar" id="selection-bar-${m.id}" style="display: none; padding: 0.6rem 0.9rem; background: var(--bg-surface-alt); border-radius: var(--radius-md); margin-bottom: 0.75rem; border: 1px solid var(--border-color); align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;">
                  <div style="display: flex; align-items: center; gap: 0.65rem; font-size: 0.85rem; font-weight: 600;">
                    <label style="display: flex; align-items: center; gap: 0.4rem; cursor: pointer; margin: 0;">
                      <input type="checkbox" id="select-all-box-${m.id}" onchange="App.toggleSelectAllActivities(${m.id}, this.checked)" style="width: 17px; height: 17px; cursor: pointer; accent-color: var(--primary);">
                      <span>Dooro Dhamaan / Select All</span>
                    </label>
                    <span style="color: var(--text-muted); font-weight: normal;">|</span>
                    <span style="color: var(--primary); font-weight: 700;"><span id="selected-count-${m.id}">0</span> la doortay / selected</span>
                  </div>
                  <div style="display: flex; gap: 0.5rem; align-items: center;">
                    <button class="btn btn-sm btn-outline" onclick="App.clearSelection(${m.id})" style="font-size: 0.78rem; padding: 0.3rem 0.65rem;">
                      Baaji / Deselect
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="App.deleteSelectedActivities(${m.id})" style="font-size: 0.78rem; padding: 0.3rem 0.65rem; display: flex; align-items: center; gap: 0.35rem; background: var(--danger); color: white; border: none; border-radius: var(--radius-sm); cursor: pointer;">
                      🗑 Tirtir Kuwa La Doortay / Delete Selected
                    </button>
                  </div>
                </div>
              ` : ''}

              <!-- 1. Lessons (Videos, Documents, Texts) -->
              ${(m.lessons || []).map(l => `
                <div class="activity-row" onclick="App.navigate('/course/${course.id}/lesson/${l.id}')" style="cursor: pointer;">
                  <div class="activity-left">
                    ${isProfessor ? `
                      <input type="checkbox" class="activity-select-box" data-module="${m.id}" data-type="lesson" data-id="${l.id}" data-title="${(l.title || '').replace(/"/g, '&quot;')}" onclick="event.stopPropagation(); App.onActivitySelectChanged(${m.id})" title="Dooro casharkan / Select lesson" style="width: 17px; height: 17px; cursor: pointer; accent-color: var(--primary); margin-right: 0.35rem; flex-shrink: 0;">
                    ` : ''}
                    <div class="activity-icon-badge ${l.content_type}">
                      ${l.content_type === 'video' ? '🎥' : l.content_type === 'document' ? '📄' : '📝'}
                    </div>
                    <div class="activity-info">
                      <div class="activity-name">${l.title}</div>
                      <div class="activity-meta">
                        ${l.content_type === 'video' ? `Educational Video Lecture ${l.video_duration_seconds ? '• ' + Math.round(l.video_duration_seconds / 60) + ' mins' : ''}` : ''}
                        ${l.content_type === 'document' ? `PDF / Learning Resource • ${l.file_name || 'Downloadable'}` : ''}
                        ${l.content_type === 'text' ? 'Interactive Reading Material' : ''}
                      </div>
                    </div>
                  </div>

                  <div style="display: flex; align-items: center; gap: 0.75rem;">
                    ${l.video_watch_percentage > 0 && l.content_type === 'video' ? `
                      <span style="font-size: 0.75rem; color: var(--text-muted);">${l.video_watch_percentage}% watched</span>
                    ` : ''}
                    <!-- Real Activity Completion Checkmark -->
                    <div class="activity-completion-check ${l.student_completed ? 'completed' : ''}"
                         title="${l.student_completed ? 'Completed' : 'Not completed yet'}"
                         onclick="event.stopPropagation(); App.toggleLessonCompletion(${l.id}, ${l.student_completed ? 0 : 1})">
                      ✓
                    </div>
                    ${isProfessor ? `
                      <button class="btn btn-outline btn-sm activity-delete-btn"
                              style="color: var(--danger); border-color: var(--danger-border); padding: 0.25rem 0.55rem; font-size: 0.78rem; display: inline-flex; align-items: center; gap: 0.25rem; border-radius: var(--radius-sm);"
                              title="Tirtir casharkan / Delete lesson"
                              onclick="event.stopPropagation(); App.deleteLesson(${l.id}, '${(l.title || '').replace(/'/g, "\\'")}')">
                        🗑 <span style="font-size: 0.75rem;">Delete</span>
                      </button>
                    ` : ''}
                  </div>
                </div>
              `).join('')}

              <!-- 2. Assignments -->
              ${(m.assignments || []).map(a => `
                <div class="activity-row" onclick="App.navigate('/course/${course.id}/assignment/${a.id}')" style="cursor: pointer;">
                  <div class="activity-left">
                    ${isProfessor ? `
                      <input type="checkbox" class="activity-select-box" data-module="${m.id}" data-type="assignment" data-id="${a.id}" data-title="${(a.title || '').replace(/"/g, '&quot;')}" onclick="event.stopPropagation(); App.onActivitySelectChanged(${m.id})" title="Dooro shaqadan / Select assignment" style="width: 17px; height: 17px; cursor: pointer; accent-color: var(--primary); margin-right: 0.35rem; flex-shrink: 0;">
                    ` : ''}
                    <div class="activity-icon-badge assignment">⚡</div>
                    <div class="activity-info">
                      <div class="activity-name">${a.title}</div>
                      <div class="activity-meta">
                        Assignment • Due: ${new Date(a.due_date).toLocaleDateString()} • Max ${a.max_score} pts (Weight ${a.weight_percentage}%)
                      </div>
                    </div>
                  </div>

                  <div style="display: flex; align-items: center; gap: 0.75rem;">
                    ${a.submission_status === 'graded' ? `
                      <span class="badge badge-success">Graded: ${a.submission_grade} / ${a.max_score}</span>
                    ` : a.submission_status === 'submitted' ? `
                      <span class="badge badge-warning">Submitted</span>
                    ` : `
                      <span class="badge badge-primary">Due Soon</span>
                    `}
                    <div class="activity-completion-check ${a.submission_status ? 'completed' : ''}">✓</div>
                    ${isProfessor ? `
                      <button class="btn btn-outline btn-sm activity-delete-btn"
                              style="color: var(--danger); border-color: var(--danger-border); padding: 0.25rem 0.55rem; font-size: 0.78rem; display: inline-flex; align-items: center; gap: 0.25rem; border-radius: var(--radius-sm);"
                              title="Tirtir shaqadan / Delete assignment"
                              onclick="event.stopPropagation(); App.deleteAssignment(${a.id}, '${(a.title || '').replace(/'/g, "\\'")}')">
                        🗑 <span style="font-size: 0.75rem;">Delete</span>
                      </button>
                    ` : ''}
                  </div>
                </div>
              `).join('')}

              <!-- 3. Quizzes / Examinations -->
              ${(m.quizzes || []).map(q => {
                const now = new Date();
                const isOpen = !q.open_date || new Date(q.open_date) <= now;
                const isClosed = q.close_date && new Date(q.close_date) < now;
                let scheduleBadge = '';
                if (!isOpen) {
                  const diffDays = Math.ceil((new Date(q.open_date) - now) / (1000 * 60 * 60 * 24));
                  scheduleBadge = `<span class="badge" style="background:#fef3c7;color:#b45309;font-size:0.72rem;font-weight:700;">⏳ Active in ${diffDays} day${diffDays > 1 ? 's' : ''} (${new Date(q.open_date).toLocaleDateString()})</span>`;
                } else if (isClosed) {
                  scheduleBadge = `<span class="badge" style="background:#fee2e2;color:#b91c1c;font-size:0.72rem;font-weight:700;">🔒 Closed (${new Date(q.close_date).toLocaleDateString()})</span>`;
                } else if (q.open_date) {
                  scheduleBadge = `<span class="badge" style="background:#dcfce7;color:#15803d;font-size:0.72rem;font-weight:700;">🟢 Active Now</span>`;
                }

                return `
                <div class="activity-row" onclick="App.navigate('/course/${course.id}/quiz/${q.id}')" style="cursor: pointer;">
                  <div class="activity-left">
                    ${isProfessor ? `
                      <input type="checkbox" class="activity-select-box" data-module="${m.id}" data-type="quiz" data-id="${q.id}" data-title="${(q.title || '').replace(/"/g, '&quot;')}" onclick="event.stopPropagation(); App.onActivitySelectChanged(${m.id})" title="Dooro imtixaankan / Select quiz" style="width: 17px; height: 17px; cursor: pointer; accent-color: var(--primary); margin-right: 0.35rem; flex-shrink: 0;">
                    ` : ''}
                    <div class="activity-icon-badge quiz">🏆</div>
                    <div class="activity-info">
                      <div class="activity-name" style="display:flex;align-items:center;gap:0.45rem;flex-wrap:wrap;">
                        <span>${q.title}</span>
                        ${scheduleBadge}
                      </div>
                      <div class="activity-meta">
                        Examination • ${q.time_limit_minutes} mins time limit • Passing score: ${q.passing_percentage}%
                        ${q.open_date ? ` • Scheduled: ${new Date(q.open_date).toLocaleDateString()}` : ''}
                      </div>
                    </div>
                  </div>

                  <div style="display: flex; align-items: center; gap: 0.75rem;">
                    ${q.highest_percentage !== null && q.highest_percentage !== undefined ? `
                      <span class="badge ${q.is_passed ? 'badge-success' : 'badge-danger'}">
                        Score: ${q.highest_percentage}% (${q.is_passed ? 'Passed' : 'Not Passed'})
                      </span>
                    ` : !isOpen ? `
                      <span class="badge badge-warning" style="font-size: 0.78rem;">⏳ Opens ${new Date(q.open_date).toLocaleDateString()}</span>
                    ` : isClosed ? `
                      <span class="badge badge-danger" style="font-size: 0.78rem;">🔒 Closed</span>
                    ` : `
                      <span class="badge badge-info">Take Quiz</span>
                    `}
                    <div class="activity-completion-check ${q.is_passed ? 'completed' : ''}">✓</div>
                    ${isProfessor ? `
                      <button class="btn btn-outline btn-sm"
                              style="color: var(--primary); border-color: var(--border-color); padding: 0.25rem 0.55rem; font-size: 0.78rem; display: inline-flex; align-items: center; gap: 0.25rem; border-radius: var(--radius-sm);"
                              title="Wax ka beddel / Edit quiz & schedule"
                              onclick="event.stopPropagation(); App.showModal('editQuizModal', { quizId: ${q.id} })">
                        ✏️ <span style="font-size: 0.75rem;">Edit</span>
                      </button>
                      <button class="btn btn-outline btn-sm activity-delete-btn"
                              style="color: var(--danger); border-color: var(--danger-border); padding: 0.25rem 0.55rem; font-size: 0.78rem; display: inline-flex; align-items: center; gap: 0.25rem; border-radius: var(--radius-sm);"
                              title="Tirtir imtixaankan / Delete quiz"
                              onclick="event.stopPropagation(); App.deleteQuiz(${q.id}, '${(q.title || '').replace(/'/g, "\\'")}')">
                        🗑 <span style="font-size: 0.75rem;">Delete</span>
                      </button>
                    ` : ''}
                  </div>
                </div>
              `;
              }).join('')}

              ${(!m.lessons?.length && !m.assignments?.length && !m.quizzes?.length) ? `
                <div style="padding: 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.84rem;">
                  No activities in this section yet.
                </div>
              ` : ''}

            </div>
          </div>
        `).join('')}
      </div>
    `;
  },

  renderParticipantsTab(courseId) {
    setTimeout(async () => {
      try {
        const data = await API.getParticipants(courseId);
        const container = document.getElementById('participants-roster-view');
        if (!container) return;

        container.innerHTML = `
          <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 1.5rem; box-shadow: var(--shadow-sm);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
              <div>
                <h3 style="font-size: 1.15rem;">Class Roster & Student Progress Monitoring</h3>
                <p style="font-size: 0.84rem; color: var(--text-muted);">Real activity tracking with transparent At-Risk alerts</p>
              </div>
              <span class="badge badge-primary">${data.participants.length} Enrolled Students</span>
            </div>

            <div class="gradebook-table-container">
              <table class="gradebook-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Student ID</th>
                    <th>Course Progress</th>
                    <th>Attendance %</th>
                    <th>Avg Assignment</th>
                    <th>Best Quiz Score</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.participants.map(p => `
                    <tr>
                      <td>
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                          <img src="${p.avatar_url}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;">
                          <div>
                            <div style="font-weight: 700;">${p.full_name}</div>
                            <div style="font-size: 0.74rem; color: var(--text-muted);">${p.email}</div>
                          </div>
                        </div>
                      </td>
                      <td><code>${p.student_id_number || 'N/A'}</code></td>
                      <td>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                          <div class="progress-bar-bg" style="width: 80px;">
                            <div class="progress-bar-fill" style="width: ${p.progress_percentage}%;"></div>
                          </div>
                          <strong>${p.progress_percentage}%</strong>
                        </div>
                      </td>
                      <td>
                        <span style="font-weight: 700; color: ${p.attendance_percentage >= 80 ? 'var(--success)' : p.attendance_percentage < 60 ? 'var(--danger)' : 'var(--warning)'};">
                          ${p.attendance_percentage}%
                        </span>
                      </td>
                      <td>${p.avg_assignment_grade ? Math.round(p.avg_assignment_grade) + ' / 100' : 'N/A'}</td>
                      <td>${p.highest_quiz_score ? p.highest_quiz_score + '%' : 'N/A'}</td>
                      <td>
                        ${p.is_at_risk ? `
                          <span class="badge badge-danger">⚠️ At Risk</span>
                        ` : p.progress_percentage >= 100 ? `
                          <span class="badge badge-success">✓ Completed</span>
                        ` : `
                          <span class="badge badge-info">Active</span>
                        `}
                      </td>
                      <td>
                        <a href="#/messages?recipient=${p.id}" class="btn btn-outline btn-sm">Message</a>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `;
      } catch (err) {
        console.error('Participants load error:', err);
      }
    }, 50);

    return `<div id="participants-roster-view" style="padding: 2rem 0; text-align: center;">Loading class roster...</div>`;
  },

  renderGradebookTab(courseId) {
    setTimeout(async () => {
      try {
        const data = await API.getGradebook(courseId);
        const container = document.getElementById('embedded-gradebook-view');
        if (!container) return;

        container.innerHTML = `
          <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 1.5rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
              <div>
                <h3 style="font-size: 1.2rem;">Official Course Gradebook Matrix</h3>
                <p style="font-size: 0.84rem; color: var(--text-muted);">Weighted academic scores, letter grades, and passing evaluations</p>
              </div>
              <a href="/api/grades/courses/${courseId}/export-csv" target="_blank" class="btn btn-outline btn-sm">
                <span>📥</span> Export CSV
              </a>
            </div>

            <div class="gradebook-table-container">
              <table class="gradebook-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    ${data.columns.assignments.map(a => `<th>${a.title} (${a.max_score} pts)</th>`).join('')}
                    ${data.columns.quizzes.map(q => `<th>${q.title} (%)</th>`).join('')}
                    <th>Total %</th>
                    <th>Grade</th>
                    <th>Pass / Fail</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.rows.map(r => `
                    <tr>
                      <td>
                        <div style="font-weight: 700;">${r.student.full_name}</div>
                        <div style="font-size: 0.72rem; color: var(--text-muted);">${r.student.student_id_number}</div>
                      </td>
                      ${data.columns.assignments.map(a => {
                        const sub = r.assignments[a.id];
                        return `<td>${sub && sub.grade !== null ? `<strong>${sub.grade}</strong> <span style="font-size: 0.72rem; color: var(--text-muted);">(${sub.percentage}%)</span>` : '<span style="color: var(--text-muted);">—</span>'}</td>`;
                      }).join('')}
                      ${data.columns.quizzes.map(q => {
                        const att = r.quizzes[q.id];
                        return `<td>${att && att.percentage !== null ? `<strong>${att.percentage}%</strong>` : '<span style="color: var(--text-muted);">—</span>'}</td>`;
                      }).join('')}
                      <td><strong style="font-size: 0.95rem;">${r.overall_percentage !== null ? r.overall_percentage + '%' : '<span style="color: var(--text-muted); font-size: 0.82rem;">No grades yet</span>'}</strong></td>
                      <td><span class="letter-badge letter-${r.letter_grade}">${r.letter_grade}</span></td>
                      <td>
                        ${r.is_passing === null
                          ? `<span class="badge" style="background: #e0f2fe; color: #0369a1; font-weight: 700;">⏳ Pending</span>`
                          : r.is_passing
                            ? `<span class="badge badge-success">✅ PASS</span>`
                            : `<span class="badge badge-danger">❌ FAIL</span>`
                        }
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `;
      } catch (e) {
        console.error(e);
      }
    }, 50);

    return `<div id="embedded-gradebook-view" style="padding: 2rem 0; text-align: center;">Loading gradebook...</div>`;
  },

  renderStudentGradesTab(courseId) {
    setTimeout(async () => {
      try {
        const data = await API.getMyGrades(courseId);
        const container = document.getElementById('embedded-student-grades-view');
        if (!container) return;

        container.innerHTML = `
          <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 1.5rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
              <div>
                <h3 style="font-size: 1.2rem;">My Academic Performance Report</h3>
                <p style="font-size: 0.84rem; color: var(--text-muted);">Official released grades and professor feedback</p>
              </div>
              <div style="display: flex; align-items: center; gap: 1rem; background: var(--bg-surface-alt); padding: 0.75rem 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                <div>
                  <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700;">OVERALL GRADE</div>
                  <div style="font-size: 1.4rem; font-weight: 800; color: var(--primary);">${data.overall.percentage !== null ? data.overall.percentage + '%' : '—'}</div>
                </div>
                <div class="letter-badge letter-${data.overall.letter_grade}" style="font-size: 1.2rem; padding: 0.3rem 0.8rem;">
                  ${data.overall.letter_grade}
                </div>
                ${data.overall.is_passing === null
                  ? `<span class="badge" style="background: #e0f2fe; color: #0369a1; font-weight: 700;">⏳ Weli la qadin</span>`
                  : data.overall.is_passing
                    ? `<span class="badge badge-success">✅ Passing</span>`
                    : `<span class="badge badge-danger">❌ Below Passing</span>`
                }
              </div>
            </div>

            <!-- Assignments Grade Table -->
            <h4 style="margin: 1.25rem 0 0.75rem; font-size: 1rem;">Assignments</h4>
            <div class="gradebook-table-container">
              <table class="gradebook-table">
                <thead>
                  <tr>
                    <th>Assignment</th>
                    <th>Due Date</th>
                    <th>Submission Status</th>
                    <th>Grade</th>
                    <th>Feedback</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.assignments.map(a => `
                    <tr>
                      <td style="font-weight: 600;">${a.title}</td>
                      <td>${new Date(a.due_date).toLocaleDateString()}</td>
                      <td>
                        <span class="badge ${a.submission_status === 'graded' ? 'badge-success' : a.submission_status === 'submitted' ? 'badge-warning' : 'badge-danger'}">
                          ${a.submission_status || 'Missing'}
                        </span>
                      </td>
                      <td>
                        ${a.grade !== null ? `<strong>${a.grade} / ${a.max_score}</strong> (${a.percentage}%)` : '<span style="color: var(--text-muted);">Awaiting release</span>'}
                      </td>
                      <td style="font-size: 0.8rem; color: var(--text-muted); max-width: 300px;">
                        ${a.feedback || '—'}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            <!-- Quizzes Grade Table -->
            <h4 style="margin: 1.5rem 0 0.75rem; font-size: 1rem;">Quizzes & Examinations</h4>
            <div class="gradebook-table-container">
              <table class="gradebook-table">
                <thead>
                  <tr>
                    <th>Examination</th>
                    <th>Passing Score</th>
                    <th>Your Highest Score</th>
                    <th>Result</th>
                    <th>Attempt Date</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.quizzes.map(q => `
                    <tr>
                      <td style="font-weight: 600;">${q.title}</td>
                      <td>${q.passing_percentage}%</td>
                      <td>${q.percentage !== null ? `<strong>${q.percentage}%</strong> (${q.score}/${q.max_score} pts)` : '<span style="color: var(--text-muted);">Not Attempted</span>'}</td>
                      <td>
                        ${q.percentage !== null ? `
                          <span class="badge ${q.is_passed ? 'badge-success' : 'badge-danger'}">
                            ${q.is_passed ? 'PASSED' : 'FAILED'}
                          </span>
                        ` : '—'}
                      </td>
                      <td>${q.submitted_at ? new Date(q.submitted_at).toLocaleDateString() : '—'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `;
      } catch (e) {
        console.error(e);
      }
    }, 50);

    return `<div id="embedded-student-grades-view" style="padding: 2rem 0; text-align: center;">Loading your grades...</div>`;
  },

  renderAttendanceTab(courseId, isProfessor) {
    setTimeout(async () => {
      try {
        const container = document.getElementById('embedded-attendance-view');
        if (!container) return;

        if (isProfessor) {
          const data = await API.getAttendanceGrid(courseId);
          container.innerHTML = `
            <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 1.5rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
                <div>
                  <h3 style="font-size: 1.2rem;">Attendance Roster & Session Manager</h3>
                  <p style="font-size: 0.84rem; color: var(--text-muted);">Record student attendance as Present, Absent, Late, or Excused</p>
                </div>
                <button class="btn btn-primary btn-sm" onclick="App.showModal('addAttendanceSessionModal', { courseId: ${courseId} })">
                  + New Attendance Session
                </button>
              </div>

              <div class="gradebook-table-container">
                <table class="gradebook-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      ${data.sessions.map(s => `<th>${s.session_date}<br><small style="font-weight: normal; color: var(--text-muted);">${s.title}</small></th>`).join('')}
                      <th>Attendance %</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${data.studentStats.map(row => `
                      <tr>
                        <td>
                          <div style="font-weight: 700;">${row.student.full_name}</div>
                          <div style="font-size: 0.72rem; color: var(--text-muted);">${row.student.student_id_number}</div>
                        </td>
                        ${data.sessions.map(s => {
                          const rec = row.records[s.id] || { status: 'not_recorded' };
                          const badgeClass = rec.status === 'present' ? 'badge-success' : rec.status === 'late' ? 'badge-warning' : rec.status === 'excused' ? 'badge-info' : 'badge-danger';
                          return `<td><span class="badge ${badgeClass}">${rec.status}</span></td>`;
                        }).join('')}
                        <td>
                          <strong style="color: ${row.stats.attendance_percentage >= 80 ? 'var(--success)' : 'var(--danger)'};">
                            ${row.stats.attendance_percentage}%
                          </strong>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          `;
        } else {
          const data = await API.getMyAttendance(courseId);
          container.innerHTML = `
            <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 1.5rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <div>
                  <h3 style="font-size: 1.2rem;">My Attendance Record</h3>
                  <p style="font-size: 0.84rem; color: var(--text-muted);">Faculty attendance records and participation statistics</p>
                </div>
                <div style="background: var(--bg-surface-alt); padding: 0.75rem 1.5rem; border-radius: var(--radius-md); border: 1px solid var(--border-color); text-align: center;">
                  <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700;">TOTAL ATTENDANCE</div>
                  <div style="font-size: 1.6rem; font-weight: 800; color: ${data.stats.percentage >= 80 ? 'var(--success)' : 'var(--danger)'};">
                    ${data.stats.percentage}%
                  </div>
                  <div style="font-size: 0.74rem; color: var(--text-muted);">
                    ${data.stats.present} Present • ${data.stats.late} Late • ${data.stats.absent} Absent • ${data.stats.excused} Excused
                  </div>
                </div>
              </div>

              <div class="gradebook-table-container">
                <table class="gradebook-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Session Topic</th>
                      <th>Status</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${data.sessions.map(s => `
                      <tr>
                        <td><strong>${s.session_date}</strong></td>
                        <td>${s.title}</td>
                        <td>
                          <span class="badge ${s.status === 'present' ? 'badge-success' : s.status === 'late' ? 'badge-warning' : s.status === 'excused' ? 'badge-info' : 'badge-danger'}">
                            ${s.status ? s.status.toUpperCase() : 'NOT RECORDED'}
                          </span>
                        </td>
                        <td style="font-size: 0.82rem; color: var(--text-muted);">${s.notes || '—'}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          `;
        }
      } catch (e) {
        console.error(e);
      }
    }, 50);

    return `<div id="embedded-attendance-view" style="padding: 2rem 0; text-align: center;">Loading attendance data...</div>`;
  },

  renderDiscussionsTab(courseId) {
    setTimeout(async () => {
      try {
        const data = await API.getCourseDiscussions(courseId);
        const container = document.getElementById('embedded-discussions-view');
        if (!container) return;

        container.innerHTML = `
          <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 1.5rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
              <div>
                <h3 style="font-size: 1.2rem;">Course Discussion Forum</h3>
                <p style="font-size: 0.84rem; color: var(--text-muted);">Topic-based discussions with classmates and Prof. Maryam</p>
              </div>
              <button class="btn btn-primary btn-sm" onclick="App.showModal('addTopicModal', { courseId: ${courseId} })">
                + New Discussion Topic
              </button>
            </div>

            <div style="display: flex; flex-direction: column; gap: 0.75rem;">
              ${data.topics.map(t => `
                <div style="border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem 1.25rem; display: flex; justify-content: space-between; align-items: center; transition: var(--transition); cursor: pointer;"
                     onclick="App.navigate('/discussions/${t.id}')">
                  <div style="display: flex; gap: 1rem; align-items: center;">
                    <img src="${t.author_avatar}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
                    <div>
                      <div style="display: flex; align-items: center; gap: 0.5rem;">
                        ${t.is_pinned ? '<span class="badge badge-warning">📌 Pinned</span>' : ''}
                        <h4 style="font-size: 0.96rem; font-weight: 700;">${t.title}</h4>
                      </div>
                      <div style="font-size: 0.76rem; color: var(--text-muted); margin-top: 0.2rem;">
                        Started by <strong>${t.author_name}</strong> (${t.author_role}) • ${new Date(t.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div style="display: flex; align-items: center; gap: 0.5rem; color: var(--text-muted); font-size: 0.84rem;">
                    <span>💬 <strong>${t.reply_count || 0}</strong> replies</span>
                  </div>
                </div>
              `).join('')}

              ${data.topics.length === 0 ? `
                <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
                  No topics have been posted in this forum yet. Be the first to start a conversation!
                </div>
              ` : ''}
            </div>
          </div>
        `;
      } catch (e) {
        console.error(e);
      }
    }, 50);

    return `<div id="embedded-discussions-view" style="padding: 2rem 0; text-align: center;">Loading forum topics...</div>`;
  },

  renderAnnouncementsTab(courseId, announcements, isProfessor) {
    return `
      <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 1.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
          <div>
            <h3 style="font-size: 1.2rem;">Course Announcements</h3>
            <p style="font-size: 0.84rem; color: var(--text-muted);">Official notices and broadcast communications from the professor</p>
          </div>
          ${isProfessor ? `
            <button class="btn btn-primary btn-sm" onclick="App.showModal('addAnnouncementModal', { courseId: ${courseId} })">
              + Post Announcement
            </button>
          ` : ''}
        </div>

        <div style="display: flex; flex-direction: column; gap: 1rem;">
          ${announcements.map(a => `
            <div style="border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.25rem; background: var(--bg-surface-alt);">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  ${a.is_pinned ? '<span class="badge badge-warning">📌 Pinned</span>' : ''}
                  <h4 style="font-size: 1.05rem; font-weight: 700;">${a.title}</h4>
                </div>
                <span style="font-size: 0.74rem; color: var(--text-muted);">${new Date(a.created_at).toLocaleDateString()}</span>
              </div>
              <p style="font-size: 0.88rem; line-height: 1.5; color: var(--text-main); margin-bottom: 0.75rem;">
                ${a.content}
              </p>
              <div style="font-size: 0.74rem; color: var(--text-muted);">
                Posted by <strong>${a.author_name || 'Prof. Maryam Al-Mansoor'}</strong>
              </div>
            </div>
          `).join('')}

          ${announcements.length === 0 ? `
            <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
              No announcements posted for this course.
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }
};
