// ====================================================================
// VIEW: GUUREY LEARNING PLATFORM - SYSTEM & ADMIN MANAGEMENT
// Supports administrator registration, system diagnostics,
// audit logging, and security maintenance.
// ====================================================================

const AdminView = {
  async render() {
    let health = null;
    let logs = [];
    let admins = [];
    let users = [];

    try {
      const [healthRes, logsRes, adminsRes, usersRes] = await Promise.all([
        API.getAdminHealth().catch(() => null),
        API.getAuditLogs().catch(() => ({ logs: [] })),
        API.getAdmins().catch(() => ({ admins: [] })),
        API.request('/auth/directory').catch(() => ({ users: [] }))
      ]);
      health = healthRes;
      logs = logsRes.logs || [];
      admins = adminsRes.admins || [];
      users = usersRes.users || [];
    } catch (err) {
      console.error('Error loading admin data:', err);
    }

    return `
      <!-- Breadcrumbs -->
      <div class="breadcrumb-trail">
        <a href="#/dashboard">${I18N.t('nav.dashboard', 'Dashboard')}</a>
        <span class="breadcrumb-sep">/</span>
        <span>${I18N.t('admin.page_title', 'System Administration')}</span>
      </div>

      <div class="page-header-container" style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; margin-bottom: 2rem;">
        <div>
          <h1 class="page-title" style="font-size: 1.85rem; font-weight: 800; color: var(--text-primary); margin-bottom: 0.4rem;">
            ⚙️ ${I18N.t('admin.page_title', 'System Administration & Maintenance')}
          </h1>
          <p class="page-description" style="color: var(--text-muted); font-size: 0.95rem;">
            ${I18N.t('admin.page_desc', 'Security governance, persistent backup diagnostics, and administrator account management')}
          </p>
        </div>
        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
          <a href="/api/admin/backup-db" class="btn btn-outline" download style="display: flex; align-items: center; gap: 0.5rem;">
            <span>💾</span> ${I18N.t('admin.download_backup', 'Download SQLite Backup')}
          </a>
          <button class="btn btn-primary" onclick="AdminView.openCreateAdminModal()" style="display: flex; align-items: center; gap: 0.5rem; font-weight: 600;">
            <span>+</span> ${I18N.t('admin.register_admin_btn', 'Register New Administrator')}
          </button>
        </div>
      </div>

      <!-- Health Overview Metrics -->
      ${health ? `
        <div class="stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.25rem; margin-bottom: 2rem;">
          <div class="stat-card" style="background: var(--bg-surface); padding: 1.5rem; border-radius: var(--radius-lg); border: 1px solid var(--border-color); display: flex; align-items: center; gap: 1.25rem; box-shadow: var(--shadow-sm);">
            <div class="stat-icon" style="background: #dcfce7; color: #16a34a; width: 50px; height: 50px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">🟢</div>
            <div>
              <div class="stat-value" style="font-size: 1.35rem; font-weight: 800; color: #15803d;">ONLINE</div>
              <div class="stat-label" style="font-size: 0.82rem; color: var(--text-muted);">Uptime: ${Math.floor(health.uptimeSeconds / 60)} mins • Persistent</div>
            </div>
          </div>
          <div class="stat-card" style="background: var(--bg-surface); padding: 1.5rem; border-radius: var(--radius-lg); border: 1px solid var(--border-color); display: flex; align-items: center; gap: 1.25rem; box-shadow: var(--shadow-sm);">
            <div class="stat-icon" style="background: #e0f2fe; color: #0284c7; width: 50px; height: 50px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">🗄️</div>
            <div>
              <div class="stat-value" style="font-size: 1.35rem; font-weight: 800; color: var(--text-primary);">${health.database.sizeFormatted}</div>
              <div class="stat-label" style="font-size: 0.82rem; color: var(--text-muted);">Database (${health.database.type})</div>
            </div>
          </div>
          <div class="stat-card" style="background: var(--bg-surface); padding: 1.5rem; border-radius: var(--radius-lg); border: 1px solid var(--border-color); display: flex; align-items: center; gap: 1.25rem; box-shadow: var(--shadow-sm);">
            <div class="stat-icon" style="background: #fef3c7; color: #d97706; width: 50px; height: 50px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">👥</div>
            <div>
              <div class="stat-value" style="font-size: 1.35rem; font-weight: 800; color: var(--text-primary);">${health.database.recordsCount.users} Users</div>
              <div class="stat-label" style="font-size: 0.82rem; color: var(--text-muted);">${health.database.recordsCount.courses} Courses • ${health.database.recordsCount.lessons} Lessons</div>
            </div>
          </div>
          <div class="stat-card" style="background: var(--bg-surface); padding: 1.5rem; border-radius: var(--radius-lg); border: 1px solid var(--border-color); display: flex; align-items: center; gap: 1.25rem; box-shadow: var(--shadow-sm);">
            <div class="stat-icon" style="background: #f3e8ff; color: #9333ea; width: 50px; height: 50px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">🛡️</div>
            <div>
              <div class="stat-value" style="font-size: 1.35rem; font-weight: 800; color: var(--text-primary);">${admins.length} Admins</div>
              <div class="stat-label" style="font-size: 0.82rem; color: var(--text-muted);">${logs.length} Audit Records</div>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- Administrator Accounts Management Section -->
      <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 1.75rem; margin-bottom: 2rem; box-shadow: var(--shadow-sm);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.75rem;">
          <div>
            <h3 style="font-size: 1.2rem; font-weight: 700; color: var(--text-primary);">🛡️ ${I18N.t('admin.admins_title', 'Administrator Accounts Management')}</h3>
            <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.2rem;">${I18N.t('admin.admins_sub', 'Create and manage system administrator accounts with full configuration privileges')}</p>
          </div>
          <button class="btn btn-primary" onclick="AdminView.openCreateAdminModal()" style="font-size: 0.85rem; padding: 0.5rem 1rem;">
            + ${I18N.t('admin.register_admin_btn', 'Register Administrator')}
          </button>
        </div>

        <div class="gradebook-table-container" style="overflow-x: auto;">
          <table class="gradebook-table" style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
              <tr style="border-bottom: 1px solid var(--border-color); background: var(--bg-surface-alt);">
                <th style="padding: 0.85rem 1rem; font-weight: 700; font-size: 0.82rem; text-transform: uppercase; color: var(--text-muted);">${I18N.t('admin.col_admin_name', 'Administrator')}</th>
                <th style="padding: 0.85rem 1rem; font-weight: 700; font-size: 0.82rem; text-transform: uppercase; color: var(--text-muted);">${I18N.t('admin.col_email', 'Email')}</th>
                <th style="padding: 0.85rem 1rem; font-weight: 700; font-size: 0.82rem; text-transform: uppercase; color: var(--text-muted);">${I18N.t('admin.col_dept', 'Department / Role')}</th>
                <th style="padding: 0.85rem 1rem; font-weight: 700; font-size: 0.82rem; text-transform: uppercase; color: var(--text-muted);">${I18N.t('admin.col_created', 'Registered Date')}</th>
                <th style="padding: 0.85rem 1rem; font-weight: 700; font-size: 0.82rem; text-transform: uppercase; color: var(--text-muted); text-align: right;">${I18N.t('admin.col_actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              ${admins.map(a => {
                const safeName = (a.full_name || '').replace(/'/g, "\\'");
                const isCurrent = API.currentUser && API.currentUser.id === a.id;
                return `
                  <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 0.95rem 1rem;">
                      <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <img src="${a.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150'}" style="width: 38px; height: 38px; border-radius: 50%; object-fit: cover; border: 2px solid var(--border-color);">
                        <div>
                          <div style="font-weight: 700; color: var(--text-primary); font-size: 0.92rem;">
                            ${a.full_name} ${isCurrent ? '<span class="badge" style="background: #e0f2fe; color: #0369a1; font-size: 0.7rem; margin-left: 0.3rem;">You</span>' : ''}
                          </div>
                          <div style="font-size: 0.78rem; color: var(--text-muted);"><span class="badge badge-primary" style="font-size: 0.7rem;">ADMIN</span></div>
                        </div>
                      </div>
                    </td>
                    <td style="padding: 0.95rem 1rem; font-size: 0.88rem;">${a.email}</td>
                    <td style="padding: 0.95rem 1rem; font-size: 0.85rem; color: var(--text-muted);">${a.department || 'Platform Operations'}</td>
                    <td style="padding: 0.95rem 1rem; font-size: 0.82rem; color: var(--text-muted);">${a.created_at ? new Date(a.created_at).toLocaleDateString() : 'N/A'}</td>
                    <td style="padding: 0.95rem 1rem; text-align: right;">
                      ${!isCurrent ? `
                        <button class="btn btn-sm btn-outline" style="color: var(--danger); border-color: var(--danger-border); font-size: 0.78rem; padding: 0.35rem 0.65rem;"
                                onclick="AdminView.deleteAdminAccount(${a.id}, '${safeName}')">
                          ✕ ${I18N.t('common.delete', 'Remove')}
                        </button>
                      ` : `
                        <span style="font-size: 0.8rem; color: var(--text-muted); font-style: italic;">Protected</span>
                      `}
                    </td>
                  </tr>
                `;
              }).join('')}
              ${admins.length === 0 ? `
                <tr>
                  <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 2rem;">No administrator accounts registered yet.</td>
                </tr>
              ` : ''}
            </tbody>
          </table>
        </div>
      </div>

      <!-- User Account Maintenance Card -->
      <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 1.75rem; margin-bottom: 2rem; box-shadow: var(--shadow-sm);">
        <h3 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--text-primary);">
          🔑 ${I18N.t('admin.reset_pw_title', 'User Account Password Reset Tool')}
        </h3>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1.25rem;">
          Administrative utility to securely reset student or faculty credentials.
        </p>

        <form onsubmit="AdminView.handlePasswordReset(event)" style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: flex-end;">
          <div style="flex: 1; min-width: 250px;">
            <label style="display: block; font-size: 0.82rem; font-weight: 700; margin-bottom: 0.35rem;">Select Account</label>
            <select name="user_id" required style="width: 100%; padding: 0.65rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); background: var(--bg-surface); color: var(--text-primary);">
              ${users.map(u => `
                <option value="${u.id}">${u.full_name} (${u.email}) - ${u.role.toUpperCase()}</option>
              `).join('')}
            </select>
          </div>
          <div style="flex: 1; min-width: 200px;">
            <label style="display: block; font-size: 0.82rem; font-weight: 700; margin-bottom: 0.35rem;">New Temporary Password</label>
            <input type="text" name="new_password" required minlength="6" value="guureyPass2026!" style="width: 100%; padding: 0.65rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); background: var(--bg-surface); color: var(--text-primary);">
          </div>
          <button type="submit" class="btn btn-primary" style="padding: 0.65rem 1.5rem; font-weight: 700;">
            ${I18N.t('admin.reset_pw_btn', 'Update Password')}
          </button>
        </form>
      </div>

      <!-- Audit Logs Table -->
      <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 1.75rem; box-shadow: var(--shadow-sm);">
        <h3 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 0.35rem; color: var(--text-primary);">
          📋 ${I18N.t('admin.audit_title', 'System Audit Trail')}
        </h3>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1.25rem;">
          ${I18N.t('admin.audit_sub', 'Real-time security events, course modifications, and user logins')}
        </p>

        <div class="gradebook-table-container" style="overflow-x: auto;">
          <table class="gradebook-table" style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
              <tr style="border-bottom: 1px solid var(--border-color); background: var(--bg-surface-alt);">
                <th style="padding: 0.75rem 1rem; font-weight: 700; font-size: 0.8rem; text-transform: uppercase; color: var(--text-muted);">Timestamp</th>
                <th style="padding: 0.75rem 1rem; font-weight: 700; font-size: 0.8rem; text-transform: uppercase; color: var(--text-muted);">User</th>
                <th style="padding: 0.75rem 1rem; font-weight: 700; font-size: 0.8rem; text-transform: uppercase; color: var(--text-muted);">Role</th>
                <th style="padding: 0.75rem 1rem; font-weight: 700; font-size: 0.8rem; text-transform: uppercase; color: var(--text-muted);">Action</th>
                <th style="padding: 0.75rem 1rem; font-weight: 700; font-size: 0.8rem; text-transform: uppercase; color: var(--text-muted);">Details</th>
                <th style="padding: 0.75rem 1rem; font-weight: 700; font-size: 0.8rem; text-transform: uppercase; color: var(--text-muted);">IP Address</th>
              </tr>
            </thead>
            <tbody>
              ${logs.map(l => `
                <tr style="border-bottom: 1px solid var(--border-color);">
                  <td style="padding: 0.75rem 1rem; font-size: 0.78rem; color: var(--text-muted);">${new Date(l.created_at).toLocaleString()}</td>
                  <td style="padding: 0.75rem 1rem;"><strong>${l.user_name || 'System / Anonymous'}</strong></td>
                  <td style="padding: 0.75rem 1rem;"><span class="badge badge-primary">${l.user_role || 'SYSTEM'}</span></td>
                  <td style="padding: 0.75rem 1rem;"><code>${l.action}</code></td>
                  <td style="padding: 0.75rem 1rem; font-size: 0.82rem; max-width: 350px;">${l.details}</td>
                  <td style="padding: 0.75rem 1rem; font-size: 0.78rem; font-family: monospace;">${l.ip_address}</td>
                </tr>
              `).join('')}
              ${logs.length === 0 ? `
                <tr>
                  <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">No audit records logged yet.</td>
                </tr>
              ` : ''}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  openCreateAdminModal() {
    App.showCustomModal(`
      <div class="modal-dialog" style="max-width: 520px; width: 95%;">
        <div class="modal-header">
          <h3 style="font-size: 1.2rem; font-weight: 700;">🛡️ ${I18N.t('admin.modal_admin_title', 'Register New Platform Administrator')}</h3>
          <button class="drawer-toggle-btn" onclick="App.closeModal()">✕</button>
        </div>
        <form onsubmit="AdminView.submitCreateAdmin(event)">
          <div class="modal-body" style="padding: 1.5rem;">
            
            <div style="margin-bottom: 1.15rem;">
              <label style="display: block; font-size: 0.85rem; font-weight: 700; margin-bottom: 0.35rem;">
                ${I18N.t('students.full_name', 'Full Name')} *
              </label>
              <input type="text" name="full_name" required placeholder="e.g. Eng. Guurey" style="width: 100%; padding: 0.7rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 0.95rem; background: var(--bg-surface); color: var(--text-primary);">
            </div>

            <div style="margin-bottom: 1.15rem;">
              <label style="display: block; font-size: 0.85rem; font-weight: 700; margin-bottom: 0.35rem;">
                ${I18N.t('students.email', 'Email Address')} *
              </label>
              <input type="email" name="email" required placeholder="admin@guurey.edu" style="width: 100%; padding: 0.7rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 0.95rem; background: var(--bg-surface); color: var(--text-primary);">
            </div>

            <div style="margin-bottom: 1.15rem;">
              <label style="display: block; font-size: 0.85rem; font-weight: 700; margin-bottom: 0.35rem;">
                ${I18N.t('students.password', 'Initial Password')} *
              </label>
              <input type="text" name="password" required value="adminPass2026!" style="width: 100%; padding: 0.7rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 0.95rem; background: var(--bg-surface); color: var(--text-primary);">
            </div>

            <div style="margin-bottom: 1rem;">
              <label style="display: block; font-size: 0.85rem; font-weight: 700; margin-bottom: 0.35rem;">
                Department / Role Title
              </label>
              <input type="text" name="department" value="Platform Operations & Security" style="width: 100%; padding: 0.7rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 0.95rem; background: var(--bg-surface); color: var(--text-primary);">
            </div>

          </div>
          <div class="modal-footer" style="padding: 1rem 1.5rem; display: flex; justify-content: flex-end; gap: 0.75rem; border-top: 1px solid var(--border-color);">
            <button type="button" class="btn btn-outline" onclick="App.closeModal()">${I18N.t('common.cancel', 'Cancel')}</button>
            <button type="submit" class="btn btn-primary" style="font-weight: 700;">${I18N.t('admin.modal_admin_btn', 'Register Administrator')}</button>
          </div>
        </form>
      </div>
    `);
  },

  async submitCreateAdmin(e) {
    e.preventDefault();
    const form = e.target;
    try {
      await API.createAdmin({
        full_name: form.full_name.value,
        email: form.email.value,
        password: form.password.value,
        department: form.department.value
      });
      App.closeModal();
      App.showToast(I18N.t('common.success', 'Administrator registered successfully! 🛡️'));
      App.refreshCurrentView();
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  },

  async deleteAdminAccount(adminId, adminName) {
    if (!confirm(`Are you sure you want to remove administrator "${adminName}"?`)) return;
    try {
      await API.deleteAdmin(adminId);
      App.showToast(`Administrator "${adminName}" removed.`);
      App.refreshCurrentView();
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  },

  async handlePasswordReset(e) {
    e.preventDefault();
    const form = e.target;
    try {
      const res = await API.resetPassword(form.user_id.value, form.new_password.value);
      App.showToast(res.message);
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  }
};
