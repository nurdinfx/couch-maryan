// ====================================================================
// VIEW: SYSTEM ADMINISTRATION (MINIMAL SCOPE FOR TECHNICAL MAINTENANCE)
// ====================================================================

const AdminView = {
  async render() {
    const health = await API.getAdminHealth().catch(() => null);
    const logsData = await API.getAuditLogs().catch(() => ({ logs: [] }));
    const logs = logsData.logs || [];

    return `
      <!-- Breadcrumbs -->
      <div class="breadcrumb-trail">
        <a href="#/dashboard">Dashboard</a>
        <span class="breadcrumb-sep">/</span>
        <span>Faculty System Administration</span>
      </div>

      <div class="page-header-container">
        <div>
          <h1 class="page-title">Technical Maintenance & System Health</h1>
          <p class="page-description">Security administration, backups, and database diagnostics for Faculty of Computing</p>
        </div>
        <div>
          <a href="/api/admin/backup-db" class="btn btn-outline" download>
            <span>💾</span> Download SQLite Backup
          </a>
        </div>
      </div>

      <!-- Health Overview Metrics -->
      ${health ? `
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon" style="background: #dcfce7; color: #16a34a;">🟢</div>
            <div>
              <div class="stat-value" style="font-size: 1.25rem;">ONLINE</div>
              <div class="stat-label">System Status (Uptime: ${Math.floor(health.uptimeSeconds / 60)} mins)</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background: #e0f2fe; color: #0284c7;">🗄️</div>
            <div>
              <div class="stat-value">${health.database.sizeFormatted}</div>
              <div class="stat-label">Database File Size (${health.database.type})</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background: #fef3c7; color: #d97706;">👥</div>
            <div>
              <div class="stat-value">${health.database.recordsCount.users} Users</div>
              <div class="stat-label">${health.database.recordsCount.courses} Courses • ${health.database.recordsCount.lessons} Lessons</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background: #f3e8ff; color: #9333ea;">🔒</div>
            <div>
              <div class="stat-value">${health.database.recordsCount.audit_logs} Logs</div>
              <div class="stat-label">Recorded Security Audits</div>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- User Account Maintenance Card -->
      <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 1.75rem; margin-bottom: 2rem; box-shadow: var(--shadow-sm);">
        <h3 style="font-size: 1.15rem; margin-bottom: 1rem;">User Account Password Reset Tool</h3>
        <p style="font-size: 0.84rem; color: var(--text-muted); margin-bottom: 1.25rem;">
          Administrative utility to securely reset student credentials in case of forgotten access.
        </p>

        <form onsubmit="AdminView.handlePasswordReset(event)" style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: flex-end;">
          <div style="flex: 1; min-width: 220px;">
            <label style="display: block; font-size: 0.78rem; font-weight: 700; margin-bottom: 0.35rem;">Select Account</label>
            <select name="user_id" required style="width: 100%; padding: 0.65rem; border: 1px solid var(--border-color); border-radius: var(--radius-md);">
              <option value="2">Alex Chen (alex.chen@student.faculty.edu)</option>
              <option value="3">Fatima Zahra (fatima.z@student.faculty.edu)</option>
              <option value="4">Marcus Vance (marcus.v@student.faculty.edu)</option>
              <option value="5">Layla Karim (layla.k@student.faculty.edu)</option>
              <option value="1">Prof. Maryam Al-Mansoor (professor@faculty.edu)</option>
            </select>
          </div>
          <div style="flex: 1; min-width: 200px;">
            <label style="display: block; font-size: 0.78rem; font-weight: 700; margin-bottom: 0.35rem;">New Temporary Password</label>
            <input type="text" name="new_password" required minlength="6" value="facultyPass2026!" style="width: 100%; padding: 0.65rem; border: 1px solid var(--border-color); border-radius: var(--radius-md);">
          </div>
          <button type="submit" class="btn btn-primary" style="padding: 0.65rem 1.5rem;">
            Update Password
          </button>
        </form>
      </div>

      <!-- Audit Logs Table -->
      <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 1.75rem; box-shadow: var(--shadow-sm);">
        <h3 style="font-size: 1.15rem; margin-bottom: 1rem;">System Audit Trail</h3>
        <div class="gradebook-table-container">
          <table class="gradebook-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Role</th>
                <th>Action</th>
                <th>Details</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              ${logs.map(l => `
                <tr>
                  <td style="font-size: 0.78rem; color: var(--text-muted);">${new Date(l.created_at).toLocaleString()}</td>
                  <td><strong>${l.user_name || 'System / Anonymous'}</strong></td>
                  <td><span class="badge badge-primary">${l.user_role || 'SYSTEM'}</span></td>
                  <td><code>${l.action}</code></td>
                  <td style="font-size: 0.82rem; max-width: 350px;">${l.details}</td>
                  <td style="font-size: 0.78rem; font-family: monospace;">${l.ip_address}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
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
