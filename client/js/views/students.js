// ====================================================================
// VIEW: PROFESSOR STUDENT ACCOUNT MANAGEMENT & ACCESS CONTROL
// ====================================================================

const StudentsView = {
  async render() {
    const user = API.currentUser;
    if (user.role !== 'professor' && user.role !== 'admin') {
      return `
        <div style="text-align: center; padding: 4rem 2rem;">
          <h2 style="color: var(--danger);">Access Denied</h2>
          <p style="color: var(--text-muted); margin: 0.5rem 0 1.5rem;">Only Prof. Maryam or the administrator can manage student accounts.</p>
          <a href="#/dashboard" class="btn btn-primary">Return to Dashboard</a>
        </div>
      `;
    }

    const data = await API.getStudents();
    const students = data.students || [];

    return `
      <!-- Breadcrumbs -->
      <div class="breadcrumb-trail">
        <a href="#/dashboard">Dashboard</a>
        <span class="breadcrumb-sep">/</span>
        <span>Student Accounts & Access Management</span>
      </div>

      <div class="page-header-container">
        <div>
          <h1 class="page-title">Faculty Student Accounts & Access Control</h1>
          <p class="page-description">Create student accounts, manage credentials, and control login access privileges</p>
        </div>
        <div>
          <button class="btn btn-primary" onclick="StudentsView.openCreateStudentModal()">
            <span>+</span> Register New Student
          </button>
        </div>
      </div>

      <!-- Quick Metrics -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon" style="background: #e0f2fe; color: #0284c7;">👨‍🎓</div>
          <div>
            <div class="stat-value">${students.length}</div>
            <div class="stat-label">Total Registered Students</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background: #dcfce7; color: #16a34a;">🟢</div>
          <div>
            <div class="stat-value">${students.filter(s => s.is_active !== 0).length}</div>
            <div class="stat-label">Active (Allowed to Login)</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background: #fee2e2; color: #dc2626;">🚫</div>
          <div>
            <div class="stat-value">${students.filter(s => s.is_active === 0).length}</div>
            <div class="stat-label">Deactivated (Login Blocked)</div>
          </div>
        </div>
      </div>

      <!-- Student Roster Table -->
      <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 1.75rem; box-shadow: var(--shadow-sm);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
          <div>
            <h3 style="font-size: 1.15rem;">Student Access Roster</h3>
            <p style="font-size: 0.82rem; color: var(--text-muted);">Manage student login rights, reset passwords, or remove accounts</p>
          </div>
        </div>

        <div class="gradebook-table-container">
          <table class="gradebook-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Student ID</th>
                <th>Email Address</th>
                <th>Enrolled Courses</th>
                <th>Login Access Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${students.map(s => {
                const isActive = s.is_active !== 0;
                return `
                  <tr>
                    <td>
                      <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <img src="${s.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover;">
                        <div>
                          <div style="font-weight: 700;">${s.full_name}</div>
                          <div style="font-size: 0.72rem; color: var(--text-muted);">${s.department || 'Faculty of Midwifery'}</div>
                        </div>
                      </div>
                    </td>
                    <td><code>${s.student_id_number || 'N/A'}</code></td>
                    <td style="font-size: 0.84rem;">${s.email}</td>
                    <td><span class="badge badge-primary">${s.enrolled_count || 1} Courses</span></td>
                    <td>
                      ${isActive ? `
                        <span class="badge badge-success">🟢 Active Access</span>
                      ` : `
                        <span class="badge badge-danger">🚫 Blocked / Inactive</span>
                      `}
                    </td>
                    <td>
                      <div style="display: flex; gap: 0.5rem;">
                        <button class="btn btn-sm ${isActive ? 'btn-outline' : 'btn-success'}"
                                onclick="StudentsView.toggleStatus(${s.id}, ${isActive ? 0 : 1}, '${s.full_name.replace(/'/g, "\\'")}')">
                          ${isActive ? 'Deactivate Access' : 'Enable Access'}
                        </button>
                        <button class="btn btn-sm btn-outline"
                                onclick="StudentsView.openResetPasswordModal(${s.id}, '${s.full_name.replace(/'/g, "\\'")}')">
                          Reset Key
                        </button>
                        <button class="btn btn-sm btn-outline" style="color: var(--danger); border-color: var(--danger-border);"
                                onclick="StudentsView.deleteStudent(${s.id}, '${s.full_name.replace(/'/g, "\\'")}')">
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
                    No student accounts found. Click "Register New Student" above to create an account.
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
    App.showCustomModal(`
      <div class="modal-dialog">
        <div class="modal-header">
          <h3 style="font-size: 1.15rem;">Register New Student Account</h3>
          <button class="drawer-toggle-btn" onclick="App.closeModal()">✕</button>
        </div>
        <form onsubmit="StudentsView.submitCreateStudent(event)">
          <div class="modal-body">
            <div style="margin-bottom: 1rem;">
              <label style="display: block; font-size: 0.82rem; font-weight: 700; margin-bottom: 0.35rem;">Full Name</label>
              <input type="text" name="full_name" required placeholder="e.g. Khalid Abdi" style="width: 100%; padding: 0.65rem; border: 1px solid var(--border-color); border-radius: var(--radius-md);">
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
              <div>
                <label style="display: block; font-size: 0.82rem; font-weight: 700; margin-bottom: 0.35rem;">Student ID Number</label>
                <input type="text" name="student_id_number" required placeholder="STU-2026-095" value="STU-2026-${Math.floor(100 + Math.random() * 900)}" style="width: 100%; padding: 0.65rem; border: 1px solid var(--border-color); border-radius: var(--radius-md);">
              </div>
              <div>
                <label style="display: block; font-size: 0.82rem; font-weight: 700; margin-bottom: 0.35rem;">Email Address</label>
                <input type="email" name="email" required placeholder="khalid@student.faculty.edu" style="width: 100%; padding: 0.65rem; border: 1px solid var(--border-color); border-radius: var(--radius-md);">
              </div>
            </div>

            <div style="margin-bottom: 1rem;">
              <label style="display: block; font-size: 0.82rem; font-weight: 700; margin-bottom: 0.35rem;">Initial Password</label>
              <input type="text" name="password" required value="student123" style="width: 100%; padding: 0.65rem; border: 1px solid var(--border-color); border-radius: var(--radius-md);">
            </div>

            <div style="display: flex; align-items: center; gap: 0.5rem; background: var(--bg-surface-alt); padding: 0.75rem 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
              <input type="checkbox" name="is_active" id="create_student_active" checked>
              <label for="create_student_active" style="font-size: 0.85rem; font-weight: 600;">Grant Login Access Immediately</label>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" onclick="App.closeModal()">Cancel</button>
            <button type="submit" class="btn btn-primary">Create & Enroll Student</button>
          </div>
        </form>
      </div>
    `);
  },

  async submitCreateStudent(e) {
    e.preventDefault();
    const form = e.target;
    try {
      await API.createStudent({
        full_name: form.full_name.value,
        student_id_number: form.student_id_number.value,
        email: form.email.value,
        password: form.password.value,
        is_active: form.is_active.checked
      });
      App.closeModal();
      App.showToast('Student account created and enrolled in faculty courses! 🎓');
      App.refreshCurrentView();
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  },

  async toggleStatus(studentId, newStatus, studentName) {
    try {
      await API.toggleStudentStatus(studentId, newStatus);
      App.showToast(`${studentName}: Login access ${newStatus ? 'granted' : 'deactivated'}.`);
      App.refreshCurrentView();
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  },

  openResetPasswordModal(studentId, studentName) {
    App.showCustomModal(`
      <div class="modal-dialog">
        <div class="modal-header">
          <h3 style="font-size: 1.15rem;">Reset Password for ${studentName}</h3>
          <button class="drawer-toggle-btn" onclick="App.closeModal()">✕</button>
        </div>
        <form onsubmit="StudentsView.submitResetPassword(event, ${studentId})">
          <div class="modal-body">
            <div style="margin-bottom: 1rem;">
              <label style="display: block; font-size: 0.82rem; font-weight: 700; margin-bottom: 0.35rem;">New Password</label>
              <input type="text" name="new_password" required minlength="6" value="newPass2026!" style="width: 100%; padding: 0.65rem; border: 1px solid var(--border-color); border-radius: var(--radius-md);">
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" onclick="App.closeModal()">Cancel</button>
            <button type="submit" class="btn btn-primary">Update Password</button>
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
      App.showToast('Student password updated successfully.');
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  },

  async deleteStudent(studentId, studentName) {
    if (!confirm(`Are you sure you want to remove student "${studentName}" from the faculty? This will delete all course enrollments and records.`)) return;
    try {
      await API.deleteStudent(studentId);
      App.showToast(`Student "${studentName}" deleted.`);
      App.refreshCurrentView();
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  }
};
