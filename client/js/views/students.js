// ====================================================================
// VIEW: GURAY SICID LEARNING PLATFORM - STUDENT ACCOUNT MANAGEMENT & ACCESS CONTROL
// Controls student registration, academic year access (Year 1 - Year 4),
// course authorization restrictions, and credential management.
// ====================================================================

const StudentsView = {
  cachedStudents: [],
  cachedCourses: [],

  async render() {
    const user = API.currentUser;
    if (user.role !== 'professor' && user.role !== 'admin') {
      return `
        <div style="text-align: center; padding: 4rem 2rem;">
          <h2 style="color: var(--danger);">${I18N.t('common.error', 'Access Denied')}</h2>
          <p style="color: var(--text-muted); margin: 0.5rem 0 1.5rem;">${I18N.t('nav.faculty_mgmt', 'Only instructors and administrators can manage student accounts.')}</p>
          <a href="#/dashboard" class="btn btn-primary">${I18N.t('dashboard.welcome_prof', 'Return to Dashboard')}</a>
        </div>
      `;
    }

    try {
      const [studentsData, coursesData] = await Promise.all([
        API.getStudents(),
        API.getCourses().catch(() => ({ courses: [] }))
      ]);
      this.cachedStudents = studentsData.students || [];
      this.cachedCourses = coursesData.courses || [];
    } catch (err) {
      console.error('Error fetching students or courses:', err);
      this.cachedStudents = [];
      this.cachedCourses = [];
    }

    const students = this.cachedStudents;
    const courses = this.cachedCourses;

    return `
      <!-- Breadcrumbs -->
      <div class="breadcrumb-trail">
        <a href="#/dashboard">${I18N.t('nav.dashboard', 'Dashboard')}</a>
        <span class="breadcrumb-sep">/</span>
        <span>${I18N.t('students.page_title', 'Student Accounts & Access Management')}</span>
      </div>

      <div class="page-header-container" style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; margin-bottom: 2rem;">
        <div>
          <h1 class="page-title" style="font-size: 1.85rem; font-weight: 800; color: var(--text-primary); margin-bottom: 0.4rem;">
            ${I18N.t('students.page_title', 'Faculty Student Accounts & Access Control')}
          </h1>
          <p class="page-description" style="color: var(--text-muted); max-width: 650px; font-size: 0.95rem;">
            ${I18N.t('students.page_desc', 'Create student accounts, set academic year levels (Year 1 - Year 4), restrict course access, and manage credentials')}
          </p>
        </div>
        <div style="display: flex; gap: 0.75rem;">
          <button class="btn btn-primary" onclick="StudentsView.openCreateStudentModal()" style="display: flex; align-items: center; gap: 0.5rem; font-weight: 600; padding: 0.65rem 1.25rem;">
            <span style="font-size: 1.2rem; line-height: 1;">+</span> ${I18N.t('students.register_btn', 'Register New Student')}
          </button>
        </div>
      </div>

      <!-- Quick Metrics -->
      <div class="stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.25rem; margin-bottom: 2rem;">
        <div class="stat-card" style="background: var(--bg-surface); padding: 1.5rem; border-radius: var(--radius-lg); border: 1px solid var(--border-color); display: flex; align-items: center; gap: 1.25rem; box-shadow: var(--shadow-sm);">
          <div class="stat-icon" style="background: #e0f2fe; color: #0284c7; width: 52px; height: 52px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; font-size: 1.6rem;">👨‍🎓</div>
          <div>
            <div class="stat-value" style="font-size: 1.75rem; font-weight: 800; color: var(--text-primary);">${students.length}</div>
            <div class="stat-label" style="font-size: 0.85rem; color: var(--text-muted); font-weight: 500;">${I18N.t('students.stat_total', 'Total Registered Students')}</div>
          </div>
        </div>
        <div class="stat-card" style="background: var(--bg-surface); padding: 1.5rem; border-radius: var(--radius-lg); border: 1px solid var(--border-color); display: flex; align-items: center; gap: 1.25rem; box-shadow: var(--shadow-sm);">
          <div class="stat-icon" style="background: #dcfce7; color: #16a34a; width: 52px; height: 52px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; font-size: 1.6rem;">🟢</div>
          <div>
            <div class="stat-value" style="font-size: 1.75rem; font-weight: 800; color: var(--text-primary);">${students.filter(s => s.is_active !== 0).length}</div>
            <div class="stat-label" style="font-size: 0.85rem; color: var(--text-muted); font-weight: 500;">${I18N.t('students.stat_active', 'Active (Access Granted)')}</div>
          </div>
        </div>
        <div class="stat-card" style="background: var(--bg-surface); padding: 1.5rem; border-radius: var(--radius-lg); border: 1px solid var(--border-color); display: flex; align-items: center; gap: 1.25rem; box-shadow: var(--shadow-sm);">
          <div class="stat-icon" style="background: #fee2e2; color: #dc2626; width: 52px; height: 52px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; font-size: 1.6rem;">🚫</div>
          <div>
            <div class="stat-value" style="font-size: 1.75rem; font-weight: 800; color: var(--text-primary);">${students.filter(s => s.is_active === 0).length}</div>
            <div class="stat-label" style="font-size: 0.85rem; color: var(--text-muted); font-weight: 500;">${I18N.t('students.stat_deactivated', 'Deactivated (Blocked)')}</div>
          </div>
        </div>
      </div>

      <!-- Student Roster Table -->
      <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 1.75rem; box-shadow: var(--shadow-sm);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
          <div>
            <h3 style="font-size: 1.2rem; font-weight: 700; color: var(--text-primary);">${I18N.t('students.roster_title', 'Student Access & Level Roster')}</h3>
            <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.2rem;">${I18N.t('students.roster_sub', 'Control student login rights, assign Year 1 - Year 4 access, and manage credentials')}</p>
          </div>
        </div>

        <div class="gradebook-table-container" style="overflow-x: auto;">
          <table class="gradebook-table" style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
              <tr style="border-bottom: 1px solid var(--border-color); background: var(--bg-surface-alt);">
                <th style="padding: 0.85rem 1rem; font-weight: 700; font-size: 0.82rem; text-transform: uppercase; color: var(--text-muted);">${I18N.t('students.col_student', 'Student')}</th>
                <th style="padding: 0.85rem 1rem; font-weight: 700; font-size: 0.82rem; text-transform: uppercase; color: var(--text-muted);">${I18N.t('students.col_id', 'Student ID')}</th>
                <th style="padding: 0.85rem 1rem; font-weight: 700; font-size: 0.82rem; text-transform: uppercase; color: var(--text-muted);">${I18N.t('students.col_year', 'Academic Level')}</th>
                <th style="padding: 0.85rem 1rem; font-weight: 700; font-size: 0.82rem; text-transform: uppercase; color: var(--text-muted);">${I18N.t('students.col_courses', 'Course Access')}</th>
                <th style="padding: 0.85rem 1rem; font-weight: 700; font-size: 0.82rem; text-transform: uppercase; color: var(--text-muted);">${I18N.t('students.col_status', 'Login Status')}</th>
                <th style="padding: 0.85rem 1rem; font-weight: 700; font-size: 0.82rem; text-transform: uppercase; color: var(--text-muted); text-align: right;">${I18N.t('students.col_actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              ${students.map(s => {
                const isActive = s.is_active !== 0;
                const safeName = (s.full_name || '').replace(/'/g, "\\'");
                const enrolledCount = s.enrolled_count !== undefined ? s.enrolled_count : (s.enrolled_course_ids ? s.enrolled_course_ids.length : 0);
                const yearLabel = s.academic_year || 'Year 1';

                // Color code years
                let yearBadgeBg = '#e0f2fe';
                let yearBadgeColor = '#0369a1';
                if (yearLabel === 'Year 2') { yearBadgeBg = '#fef3c7'; yearBadgeColor = '#b45309'; }
                else if (yearLabel === 'Year 3') { yearBadgeBg = '#f3e8ff'; yearBadgeColor = '#7e22ce'; }
                else if (yearLabel === 'Year 4') { yearBadgeBg = '#dcfce7'; yearBadgeColor = '#15803d'; }

                return `
                  <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 1rem;">
                      <div style="display: flex; align-items: center; gap: 0.85rem;">
                        <img src="${s.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid var(--border-color);">
                        <div>
                          <div style="font-weight: 700; color: var(--text-primary); font-size: 0.95rem;">${s.full_name}</div>
                          <div style="font-size: 0.8rem; color: var(--text-muted);">${s.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style="padding: 1rem;"><code style="background: var(--bg-surface-alt); padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 600;">${s.student_id_number || 'N/A'}</code></td>
                    <td style="padding: 1rem;">
                      <span class="badge" style="background: ${yearBadgeBg}; color: ${yearBadgeColor}; font-weight: 700; padding: 0.35rem 0.75rem; border-radius: 999px; font-size: 0.82rem; display: inline-flex; align-items: center; gap: 0.3rem;">
                        🎯 ${yearLabel}
                      </span>
                    </td>
                    <td style="padding: 1rem;">
                      <span class="badge badge-primary" style="font-weight: 600; padding: 0.35rem 0.7rem; border-radius: 6px; font-size: 0.82rem;">
                        📚 ${enrolledCount} ${I18N.t('dashboard.my_courses', 'Courses')}
                      </span>
                    </td>
                    <td style="padding: 1rem;">
                      ${isActive ? `
                        <span class="badge badge-success" style="font-weight: 600; padding: 0.35rem 0.75rem; border-radius: 999px; font-size: 0.8rem;">🟢 ${I18N.t('common.active', 'Active')}</span>
                      ` : `
                        <span class="badge badge-danger" style="font-weight: 600; padding: 0.35rem 0.75rem; border-radius: 999px; font-size: 0.8rem;">🚫 ${I18N.t('common.inactive', 'Blocked')}</span>
                      `}
                    </td>
                    <td style="padding: 1rem; text-align: right;">
                      <div style="display: inline-flex; gap: 0.4rem; justify-content: flex-end;">
                        <button class="btn btn-sm btn-primary" title="${I18N.t('students.edit_btn', 'Edit Access')}"
                                onclick="StudentsView.openEditAccessModal(${s.id})" style="font-size: 0.78rem; padding: 0.35rem 0.65rem;">
                          ✏️ ${I18N.t('students.edit_btn', 'Edit Access')}
                        </button>
                        <button class="btn btn-sm ${isActive ? 'btn-outline' : 'btn-success'}" title="${isActive ? I18N.t('students.deactivate_btn', 'Deactivate') : I18N.t('students.activate_btn', 'Activate')}"
                                onclick="StudentsView.toggleStatus(${s.id}, ${isActive ? 0 : 1}, '${safeName}')" style="font-size: 0.78rem; padding: 0.35rem 0.65rem;">
                          ${isActive ? '⏸️' : '▶️'}
                        </button>
                        <button class="btn btn-sm btn-outline" title="${I18N.t('students.reset_key_btn', 'Reset Password')}"
                                onclick="StudentsView.openResetPasswordModal(${s.id}, '${safeName}')" style="font-size: 0.78rem; padding: 0.35rem 0.6rem;">
                          🔑
                        </button>
                        <button class="btn btn-sm btn-outline" style="color: var(--danger); border-color: var(--danger-border); font-size: 0.78rem; padding: 0.35rem 0.6rem;"
                                title="${I18N.t('students.delete_btn', 'Remove Student')}"
                                onclick="StudentsView.deleteStudent(${s.id}, '${safeName}')">
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}

              ${students.length === 0 ? `
                <tr>
                  <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 3rem;">
                    ${I18N.t('students.roster_sub', 'No student accounts found. Click "Register New Student" above to create an account.')}
                  </td>
                </tr>
              ` : ''}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  openCreateStudentModal() {
    const courses = this.cachedCourses || [];

    App.showCustomModal(`
      <div class="modal-dialog" style="max-width: 620px; width: 95%;">
        <div class="modal-header">
          <h3 style="font-size: 1.2rem; font-weight: 700;">🎓 ${I18N.t('students.modal_title', 'Register New Student Account')}</h3>
          <button class="drawer-toggle-btn" onclick="App.closeModal()">✕</button>
        </div>
        <form onsubmit="StudentsView.submitCreateStudent(event)">
          <div class="modal-body" style="max-height: 75vh; overflow-y: auto; padding: 1.5rem;">
            
            <div style="margin-bottom: 1.15rem;">
              <label style="display: block; font-size: 0.85rem; font-weight: 700; margin-bottom: 0.35rem;">
                ${I18N.t('students.full_name', 'Full Name')} *
              </label>
              <input type="text" name="full_name" required placeholder="e.g. Khalid Abdi" style="width: 100%; padding: 0.7rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 0.95rem; background: var(--bg-surface); color: var(--text-primary);">
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.15rem;">
              <div>
                <label style="display: block; font-size: 0.85rem; font-weight: 700; margin-bottom: 0.35rem;">
                  ${I18N.t('students.student_id', 'Student ID Number')} *
                </label>
                <input type="text" name="student_id_number" required placeholder="STU-2026-095" value="STU-2026-${Math.floor(100 + Math.random() * 900)}" style="width: 100%; padding: 0.7rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 0.95rem; background: var(--bg-surface); color: var(--text-primary);">
              </div>
              <div>
                <label style="display: block; font-size: 0.85rem; font-weight: 700; margin-bottom: 0.35rem;">
                  ${I18N.t('students.email', 'Email Address')} *
                </label>
                <input type="email" name="email" required placeholder="student@guraysicid.edu" style="width: 100%; padding: 0.7rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 0.95rem; background: var(--bg-surface); color: var(--text-primary);">
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.15rem;">
              <div>
                <label style="display: block; font-size: 0.85rem; font-weight: 700; margin-bottom: 0.35rem;">
                  ${I18N.t('students.password', 'Initial Password')} *
                </label>
                <input type="text" name="password" required value="student123" style="width: 100%; padding: 0.7rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 0.95rem; background: var(--bg-surface); color: var(--text-primary);">
              </div>
              <div>
                <label style="display: block; font-size: 0.85rem; font-weight: 700; margin-bottom: 0.35rem;">
                  ${I18N.t('students.select_year', 'Academic Year / Level *')}
                </label>
                <select name="academic_year" id="create_student_year_select" onchange="StudentsView.onYearSelectChanged(this.value)" style="width: 100%; padding: 0.7rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 0.95rem; background: var(--bg-surface); color: var(--text-primary);">
                  <option value="Year 1" selected>Year 1 (Fasalka 1aad)</option>
                  <option value="Year 2">Year 2 (Fasalka 2aad)</option>
                  <option value="Year 3">Year 3 (Fasalka 3aad)</option>
                  <option value="Year 4">Year 4 (Fasalka 4aad)</option>
                </select>
              </div>
            </div>

            <!-- Course Access Selector -->
            <div style="margin-bottom: 1.25rem; background: var(--bg-surface-alt); padding: 1.15rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
              <label style="display: block; font-size: 0.85rem; font-weight: 700; margin-bottom: 0.35rem; color: var(--text-primary);">
                📚 ${I18N.t('students.allowed_courses_label', 'Direct Course Access (Select Courses Allowed):')}
              </label>
              <p style="font-size: 0.78rem; color: var(--text-muted); margin-bottom: 0.85rem;">
                ${I18N.t('students.auto_year_note', 'Students will only have access to their assigned year and selected courses. Year 1 students cannot open Year 2 courses unless checked below.')}
              </p>
              
              <div id="course_checkboxes_container" style="display: flex; flex-direction: column; gap: 0.6rem; max-height: 180px; overflow-y: auto; padding-right: 0.5rem;">
                ${courses.map(c => `
                  <label style="display: flex; align-items: center; justify-content: space-between; padding: 0.55rem 0.85rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-sm); cursor: pointer; font-size: 0.85rem;">
                    <span style="display: flex; align-items: center; gap: 0.6rem;">
                      <input type="checkbox" name="course_ids" value="${c.id}" data-target-year="${c.target_year || 'All Years'}" ${(!c.target_year || c.target_year === 'All Years' || c.target_year === 'Year 1') ? 'checked' : ''}>
                      <span style="font-weight: 600;">${c.title}</span>
                    </span>
                    <span class="badge" style="font-size: 0.75rem; background: #e0f2fe; color: #0369a1;">${c.target_year || 'All Years'}</span>
                  </label>
                `).join('')}
                ${courses.length === 0 ? `<div style="font-size: 0.82rem; color: var(--text-muted);">No courses created yet.</div>` : ''}
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 0.65rem; background: var(--bg-surface-alt); padding: 0.85rem 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
              <input type="checkbox" name="is_active" id="create_student_active" checked style="width: 18px; height: 18px;">
              <label for="create_student_active" style="font-size: 0.88rem; font-weight: 600; cursor: pointer;">
                ${I18N.t('students.grant_login_now', 'Grant Login Access Immediately')}
              </label>
            </div>
          </div>
          <div class="modal-footer" style="padding: 1rem 1.5rem; display: flex; justify-content: flex-end; gap: 0.75rem; border-top: 1px solid var(--border-color);">
            <button type="button" class="btn btn-outline" onclick="App.closeModal()">${I18N.t('common.cancel', 'Cancel')}</button>
            <button type="submit" class="btn btn-primary" style="font-weight: 700;">${I18N.t('students.submit_create_btn', 'Create & Enroll Student')}</button>
          </div>
        </form>
      </div>
    `);
  },

  onYearSelectChanged(selectedYear) {
    const checkboxes = document.querySelectorAll('#course_checkboxes_container input[name="course_ids"]');
    checkboxes.forEach(cb => {
      const targetYear = cb.getAttribute('data-target-year');
      if (targetYear === 'All Years' || targetYear === selectedYear) {
        cb.checked = true;
      } else {
        cb.checked = false;
      }
    });
  },

  async submitCreateStudent(e) {
    e.preventDefault();
    const form = e.target;
    
    // Collect checked course IDs
    const checkedCourseBoxes = form.querySelectorAll('input[name="course_ids"]:checked');
    const course_ids = Array.from(checkedCourseBoxes).map(cb => parseInt(cb.value));

    try {
      await API.createStudent({
        full_name: form.full_name.value,
        student_id_number: form.student_id_number.value,
        email: form.email.value,
        password: form.password.value,
        academic_year: form.academic_year.value,
        course_ids: course_ids,
        is_active: form.is_active.checked
      });
      App.closeModal();
      App.showToast(I18N.t('common.success', 'Student account created and course access configured! 🎓'));
      App.refreshCurrentView();
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  },

  openEditAccessModal(studentId) {
    const student = this.cachedStudents.find(s => s.id === studentId);
    if (!student) return;

    const courses = this.cachedCourses || [];
    const enrolledIds = student.enrolled_course_ids || [];

    App.showCustomModal(`
      <div class="modal-dialog" style="max-width: 600px; width: 95%;">
        <div class="modal-header">
          <h3 style="font-size: 1.2rem; font-weight: 700;">🎯 ${I18N.t('students.modal_edit_title', 'Update Student Information & Course Access')}</h3>
          <button class="drawer-toggle-btn" onclick="App.closeModal()">✕</button>
        </div>
        <form onsubmit="StudentsView.submitEditStudent(event, ${student.id})">
          <div class="modal-body" style="max-height: 75vh; overflow-y: auto; padding: 1.5rem;">
            
            <div style="margin-bottom: 1.15rem;">
              <label style="display: block; font-size: 0.85rem; font-weight: 700; margin-bottom: 0.35rem;">
                ${I18N.t('students.full_name', 'Full Name')}
              </label>
              <input type="text" name="full_name" required value="${student.full_name || ''}" style="width: 100%; padding: 0.7rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 0.95rem; background: var(--bg-surface); color: var(--text-primary);">
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.15rem;">
              <div>
                <label style="display: block; font-size: 0.85rem; font-weight: 700; margin-bottom: 0.35rem;">
                  ${I18N.t('students.email', 'Email Address')}
                </label>
                <input type="email" name="email" required value="${student.email || ''}" style="width: 100%; padding: 0.7rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 0.95rem; background: var(--bg-surface); color: var(--text-primary);">
              </div>
              <div>
                <label style="display: block; font-size: 0.85rem; font-weight: 700; margin-bottom: 0.35rem;">
                  ${I18N.t('students.select_year', 'Academic Year / Level *')}
                </label>
                <select name="academic_year" style="width: 100%; padding: 0.7rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 0.95rem; background: var(--bg-surface); color: var(--text-primary);">
                  <option value="Year 1" ${student.academic_year === 'Year 1' ? 'selected' : ''}>Year 1 (Fasalka 1aad)</option>
                  <option value="Year 2" ${student.academic_year === 'Year 2' ? 'selected' : ''}>Year 2 (Fasalka 2aad)</option>
                  <option value="Year 3" ${student.academic_year === 'Year 3' ? 'selected' : ''}>Year 3 (Fasalka 3aad)</option>
                  <option value="Year 4" ${student.academic_year === 'Year 4' ? 'selected' : ''}>Year 4 (Fasalka 4aad)</option>
                </select>
              </div>
            </div>

            <!-- Course Access Restrictions -->
            <div style="margin-bottom: 1.25rem; background: var(--bg-surface-alt); padding: 1.15rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
              <label style="display: block; font-size: 0.85rem; font-weight: 700; margin-bottom: 0.35rem; color: var(--text-primary);">
                📚 ${I18N.t('students.allowed_courses_label', 'Direct Course Access Permissions:')}
              </label>
              <p style="font-size: 0.78rem; color: var(--text-muted); margin-bottom: 0.85rem;">
                ${I18N.t('students.auto_year_note', 'Check courses to explicitly allow access. If student is Year 1, Year 2 courses will be blocked unless explicitly checked here.')}
              </p>
              
              <div style="display: flex; flex-direction: column; gap: 0.6rem; max-height: 180px; overflow-y: auto; padding-right: 0.5rem;">
                ${courses.map(c => {
                  const isChecked = enrolledIds.includes(c.id);
                  return `
                    <label style="display: flex; align-items: center; justify-content: space-between; padding: 0.55rem 0.85rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-sm); cursor: pointer; font-size: 0.85rem;">
                      <span style="display: flex; align-items: center; gap: 0.6rem;">
                        <input type="checkbox" name="edit_course_ids" value="${c.id}" ${isChecked ? 'checked' : ''}>
                        <span style="font-weight: 600;">${c.title}</span>
                      </span>
                      <span class="badge" style="font-size: 0.75rem; background: #e0f2fe; color: #0369a1;">${c.target_year || 'All Years'}</span>
                    </label>
                  `;
                }).join('')}
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 0.65rem; background: var(--bg-surface-alt); padding: 0.85rem 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
              <input type="checkbox" name="is_active" id="edit_student_active" ${student.is_active !== 0 ? 'checked' : ''} style="width: 18px; height: 18px;">
              <label for="edit_student_active" style="font-size: 0.88rem; font-weight: 600; cursor: pointer;">
                ${I18N.t('students.grant_login_now', 'Allow Student to Log In (Active Account)')}
              </label>
            </div>
          </div>
          <div class="modal-footer" style="padding: 1rem 1.5rem; display: flex; justify-content: flex-end; gap: 0.75rem; border-top: 1px solid var(--border-color);">
            <button type="button" class="btn btn-outline" onclick="App.closeModal()">${I18N.t('common.cancel', 'Cancel')}</button>
            <button type="submit" class="btn btn-primary" style="font-weight: 700;">${I18N.t('students.submit_edit_btn', 'Save Student Changes')}</button>
          </div>
        </form>
      </div>
    `);
  },

  async submitEditStudent(e, studentId) {
    e.preventDefault();
    const form = e.target;
    const checkedBoxes = form.querySelectorAll('input[name="edit_course_ids"]:checked');
    const course_ids = Array.from(checkedBoxes).map(cb => parseInt(cb.value));

    try {
      await API.updateStudent(studentId, {
        full_name: form.full_name.value,
        email: form.email.value,
        academic_year: form.academic_year.value,
        course_ids: course_ids,
        is_active: form.is_active.checked
      });
      App.closeModal();
      App.showToast(I18N.t('common.success', 'Student level & course permissions updated!'));
      App.refreshCurrentView();
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  },

  async toggleStatus(studentId, newStatus, studentName) {
    try {
      await API.toggleStudentStatus(studentId, newStatus);
      App.showToast(`${studentName}: ${newStatus ? I18N.t('common.active', 'Active') : I18N.t('common.inactive', 'Blocked')}`);
      App.refreshCurrentView();
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  },

  openResetPasswordModal(studentId, studentName) {
    App.showCustomModal(`
      <div class="modal-dialog" style="max-width: 480px; width: 95%;">
        <div class="modal-header">
          <h3 style="font-size: 1.15rem; font-weight: 700;">🔑 ${I18N.t('students.reset_key_btn', 'Reset Password')} - ${studentName}</h3>
          <button class="drawer-toggle-btn" onclick="App.closeModal()">✕</button>
        </div>
        <form onsubmit="StudentsView.submitResetPassword(event, ${studentId})">
          <div class="modal-body" style="padding: 1.5rem;">
            <div style="margin-bottom: 1rem;">
              <label style="display: block; font-size: 0.85rem; font-weight: 700; margin-bottom: 0.35rem;">
                ${I18N.t('students.password', 'New Password')}
              </label>
              <input type="text" name="new_password" required minlength="6" value="studentPass2026!" style="width: 100%; padding: 0.7rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 0.95rem; background: var(--bg-surface); color: var(--text-primary);">
            </div>
          </div>
          <div class="modal-footer" style="padding: 1rem 1.5rem; display: flex; justify-content: flex-end; gap: 0.75rem; border-top: 1px solid var(--border-color);">
            <button type="button" class="btn btn-outline" onclick="App.closeModal()">${I18N.t('common.cancel', 'Cancel')}</button>
            <button type="submit" class="btn btn-primary" style="font-weight: 700;">${I18N.t('admin.reset_pw_btn', 'Update Password')}</button>
          </div>
        </form>
      </div>
    `);
  },

  async submitResetPassword(e, studentId) {
    e.preventDefault();
    const form = e.target;
    try {
      await API.resetPassword(studentId, form.new_password.value);
      App.closeModal();
      App.showToast(I18N.t('common.success', 'Password reset successfully!'));
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  },

  async deleteStudent(studentId, studentName) {
    if (!confirm(`Are you sure you want to remove student "${studentName}"? This will delete all course enrollments and records.`)) return;
    try {
      await API.deleteStudent(studentId);
      App.showToast(`Student "${studentName}" removed.`);
      App.refreshCurrentView();
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  }
};
