// ====================================================================
// VIEW: GURAY SICID LEARNING PLATFORM - SYSTEM & ADMIN MANAGEMENT
// Supports administrator registration, professor registration with faculty,
// system diagnostics, audit logging, and security maintenance.
// ====================================================================

// Faculty list used across the platform
const FACULTIES = [
  { value: 'Computer Science', label: '💻 Computer Science (Cilmiga Kombiyuutarka)' },
  { value: 'Health Science', label: '🏥 Health Science (Cilmiga Caafimaadka)' },
  { value: 'Engineering', label: '⚙️ Engineering (Injineernimada)' },
  { value: 'Business', label: '💼 Business & Management (Ganacsiga)' },
  { value: 'Education', label: '📚 Education (Waxbarashada)' },
  { value: 'Mathematics', label: '📐 Mathematics & Statistics (Xisaabta)' },
  { value: 'Law', label: '⚖️ Law & Legal Studies (Sharci-Yahanada)' },
  { value: 'Islamic Studies', label: '🕌 Islamic Studies (Daraasaadka Islaamiga)' },
  { value: 'Social Sciences', label: '🌍 Social Sciences (Cilmiyaadka Bulshada)' },
  { value: 'General', label: '🏫 General / All Faculties (Guud)' }
];

const AdminView = {
  cachedProfessors: [],

  async render() {
    let health = null;
    let logs = [];
    let admins = [];
    let professors = [];
    let users = [];

    try {
      const [healthRes, logsRes, adminsRes, professorsRes, usersRes] = await Promise.all([
        API.getAdminHealth().catch(() => null),
        API.getAuditLogs().catch(() => ({ logs: [] })),
        API.getAdmins().catch(() => ({ admins: [] })),
        API.getProfessors().catch(() => ({ professors: [] })),
        API.request('/auth/directory').catch(() => ({ users: [] }))
      ]);
      health = healthRes;
      logs = logsRes.logs || [];
      admins = adminsRes.admins || [];
      professors = professorsRes.professors || [];
      users = usersRes.users || [];
      this.cachedProfessors = professors;
    } catch (err) {
      console.error('Error loading admin data:', err);
    }

    const facultyOptions = FACULTIES.map(f =>
      `<option value="${f.value}">${f.label}</option>`
    ).join('');

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
            ${I18N.t('admin.page_desc', 'Security governance, professor management, persistent backup diagnostics, and administrator account management')}
          </p>
        </div>
        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
          <a href="/api/admin/backup-json" class="btn btn-outline" download style="display: flex; align-items: center; gap: 0.5rem;">
            <span>📦</span> Export Snapshot (JSON)
          </a>
          <label class="btn btn-outline" style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; margin-bottom: 0;">
            <span>📥</span> Import Snapshot (JSON)
            <input type="file" id="import-snapshot-input" accept=".json" style="display: none;" onchange="AdminView.handleImportSnapshot(event)">
          </label>
          <a href="/api/admin/backup-db" class="btn btn-outline" download style="display: flex; align-items: center; gap: 0.5rem;">
            <span>💾</span> ${I18N.t('admin.download_backup', 'Download SQLite Backup')}
          </a>
          <button class="btn btn-outline" onclick="AdminView.restoreDefaultData()" style="display: flex; align-items: center; gap: 0.5rem; color: #b45309; border-color: #fde68a;">
            <span>🔄</span> Restore Default Courses
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
            <div class="stat-icon" style="background: #f3e8ff; color: #9333ea; width: 50px; height: 50px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">🎓</div>
            <div>
              <div class="stat-value" style="font-size: 1.35rem; font-weight: 800; color: var(--text-primary);">${professors.length} Profs</div>
              <div class="stat-label" style="font-size: 0.82rem; color: var(--text-muted);">${admins.length} Admins • ${logs.length} Audit Records</div>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- ============================================================ -->
      <!-- PROFESSOR MANAGEMENT SECTION                                  -->
      <!-- ============================================================ -->
      <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 1.75rem; margin-bottom: 2rem; box-shadow: var(--shadow-sm);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.75rem;">
          <div>
            <h3 style="font-size: 1.2rem; font-weight: 700; color: var(--text-primary);">🎓 Professor & Faculty Management</h3>
            <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.2rem;">Register professors and assign them to their specific faculty/department. Students will see courses from their assigned faculty.</p>
          </div>
          <button class="btn btn-primary" onclick="AdminView.openCreateProfessorModal()" style="font-size: 0.85rem; padding: 0.5rem 1rem; display: flex; align-items: center; gap: 0.5rem;">
            + Register New Professor
          </button>
        </div>

        <!-- Faculty Quick Stats -->
        <div style="display: flex; flex-wrap: wrap; gap: 0.65rem; margin-bottom: 1.25rem;">
          ${(() => {
            const facultyCounts = {};
            professors.forEach(p => {
              const f = p.faculty || 'General';
              facultyCounts[f] = (facultyCounts[f] || 0) + 1;
            });
            return Object.entries(facultyCounts).map(([faculty, count]) => `
              <span style="display: inline-flex; align-items: center; gap: 0.4rem; background: #e0f2fe; color: #0369a1; padding: 0.3rem 0.75rem; border-radius: 999px; font-size: 0.8rem; font-weight: 700;">
                ${faculty}: ${count} prof${count > 1 ? 's' : ''}
              </span>
            `).join('');
          })()}
          ${professors.length === 0 ? '<span style="font-size: 0.85rem; color: var(--text-muted);">No professors registered yet.</span>' : ''}
        </div>

        <div class="gradebook-table-container" style="overflow-x: auto;">
          <table class="gradebook-table" style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
              <tr style="border-bottom: 1px solid var(--border-color); background: var(--bg-surface-alt);">
                <th style="padding: 0.85rem 1rem; font-weight: 700; font-size: 0.82rem; text-transform: uppercase; color: var(--text-muted);">Professor</th>
                <th style="padding: 0.85rem 1rem; font-weight: 700; font-size: 0.82rem; text-transform: uppercase; color: var(--text-muted);">Email</th>
                <th style="padding: 0.85rem 1rem; font-weight: 700; font-size: 0.82rem; text-transform: uppercase; color: var(--text-muted);">Faculty / Department</th>
                <th style="padding: 0.85rem 1rem; font-weight: 700; font-size: 0.82rem; text-transform: uppercase; color: var(--text-muted);">Courses</th>
                <th style="padding: 0.85rem 1rem; font-weight: 700; font-size: 0.82rem; text-transform: uppercase; color: var(--text-muted);">Status</th>
                <th style="padding: 0.85rem 1rem; font-weight: 700; font-size: 0.82rem; text-transform: uppercase; color: var(--text-muted); text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${professors.map(p => {
                const safeName = (p.full_name || '').replace(/'/g, "\\'");
                const isCurrent = API.currentUser && API.currentUser.id === p.id;
                const faculty = p.faculty || 'General';
                const facultyColors = {
                  'Computer Science': { bg: '#e0f2fe', color: '#0369a1' },
                  'Health Science': { bg: '#dcfce7', color: '#15803d' },
                  'Engineering': { bg: '#fef3c7', color: '#b45309' },
                  'Business': { bg: '#f3e8ff', color: '#7e22ce' },
                  'Education': { bg: '#ffe4e6', color: '#be123c' },
                  'Mathematics': { bg: '#fce7f3', color: '#9d174d' },
                  'Law': { bg: '#fdf4ff', color: '#a21caf' },
                  'Islamic Studies': { bg: '#fff7ed', color: '#c2410c' },
                  'Social Sciences': { bg: '#ecfeff', color: '#0e7490' }
                };
                const fc = facultyColors[faculty] || { bg: '#f1f5f9', color: '#475569' };
                return `
                  <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 0.95rem 1rem;">
                      <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <img src="${p.avatar_url || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150'}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid var(--border-color);">
                        <div>
                          <div style="font-weight: 700; color: var(--text-primary); font-size: 0.92rem;">
                            ${p.full_name} ${isCurrent ? '<span class="badge" style="background: #e0f2fe; color: #0369a1; font-size: 0.7rem; margin-left: 0.3rem;">You</span>' : ''}
                          </div>
                          <div style="font-size: 0.78rem; color: var(--text-muted);">${p.department || faculty + ' Department'}</div>
                        </div>
                      </div>
                    </td>
                    <td style="padding: 0.95rem 1rem; font-size: 0.88rem;">${p.email}</td>
                    <td style="padding: 0.95rem 1rem;">
                      <span style="display: inline-flex; align-items: center; gap: 0.4rem; background: ${fc.bg}; color: ${fc.color}; padding: 0.3rem 0.75rem; border-radius: 999px; font-size: 0.82rem; font-weight: 700;">
                        ${faculty}
                      </span>
                    </td>
                    <td style="padding: 0.95rem 1rem;">
                      <span class="badge badge-primary" style="font-size: 0.8rem;">📚 ${p.course_count || 0} courses</span>
                    </td>
                    <td style="padding: 0.95rem 1rem;">
                      ${p.is_active !== 0 ? '<span class="badge badge-success" style="font-size: 0.78rem;">🟢 Active</span>' : '<span class="badge badge-danger" style="font-size: 0.78rem;">🚫 Inactive</span>'}
                    </td>
                    <td style="padding: 0.95rem 1rem; text-align: right;">
                      <div style="display: inline-flex; gap: 0.4rem;">
                        <button class="btn btn-sm btn-primary" onclick="AdminView.openEditProfessorModal(${p.id})" style="font-size: 0.78rem; padding: 0.35rem 0.65rem;">
                          ✏️ Edit
                        </button>
                        ${!isCurrent ? `
                          <button class="btn btn-sm btn-outline" style="color: var(--danger); border-color: var(--danger-border); font-size: 0.78rem; padding: 0.35rem 0.65rem;"
                                  onclick="AdminView.deleteProfessor(${p.id}, '${safeName}')">
                            ✕ Remove
                          </button>
                        ` : `<span style="font-size: 0.8rem; color: var(--text-muted); font-style: italic;">Protected</span>`}
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
              ${professors.length === 0 ? `
                <tr>
                  <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 3rem;">
                    <div style="font-size: 2rem; margin-bottom: 0.75rem;">🎓</div>
                    <div style="font-weight: 700; margin-bottom: 0.35rem;">No professors registered yet</div>
                    <div style="font-size: 0.85rem;">Click "Register New Professor" to add professors and assign them to faculties.</div>
                  </td>
                </tr>
              ` : ''}
            </tbody>
          </table>
        </div>
      </div>

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
            <input type="text" name="new_password" required minlength="6" value="gurayPass2026!" style="width: 100%; padding: 0.65rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); background: var(--bg-surface); color: var(--text-primary);">
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

  // ============================================================
  // PROFESSOR MODALS
  // ============================================================
  openCreateProfessorModal() {
    const facultyOptions = FACULTIES.map(f =>
      `<option value="${f.value}">${f.label}</option>`
    ).join('');

    App.showCustomModal(`
      <div class="modal-dialog" style="max-width: 580px; width: 95%;">
        <div class="modal-header">
          <h3 style="font-size: 1.2rem; font-weight: 700;">🎓 Register New Professor</h3>
          <button class="drawer-toggle-btn" onclick="App.closeModal()">✕</button>
        </div>
        <form onsubmit="AdminView.submitCreateProfessor(event)">
          <div class="modal-body" style="max-height: 75vh; overflow-y: auto; padding: 1.5rem;">

            <div style="margin-bottom: 1.15rem;">
              <label style="display: block; font-size: 0.85rem; font-weight: 700; margin-bottom: 0.35rem;">
                Full Name *
              </label>
              <input type="text" name="full_name" required placeholder="e.g. Prof. Abdi Farah"
                style="width: 100%; padding: 0.7rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 0.95rem; background: var(--bg-surface); color: var(--text-primary);">
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.15rem;">
              <div>
                <label style="display: block; font-size: 0.85rem; font-weight: 700; margin-bottom: 0.35rem;">
                  Email Address *
                </label>
                <input type="email" name="email" required placeholder="professor@guraysicid.edu"
                  style="width: 100%; padding: 0.7rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 0.95rem; background: var(--bg-surface); color: var(--text-primary);">
              </div>
              <div>
                <label style="display: block; font-size: 0.85rem; font-weight: 700; margin-bottom: 0.35rem;">
                  Initial Password *
                </label>
                <input type="text" name="password" required value="prof2026!" minlength="6"
                  style="width: 100%; padding: 0.7rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 0.95rem; background: var(--bg-surface); color: var(--text-primary);">
              </div>
            </div>

            <!-- Faculty Selection - CRITICAL FIELD -->
            <div style="margin-bottom: 1.15rem; background: #f0f9ff; border: 2px solid #0284c7; border-radius: var(--radius-md); padding: 1rem;">
              <label style="display: block; font-size: 0.85rem; font-weight: 800; margin-bottom: 0.5rem; color: #0369a1;">
                🏛️ Faculty / Department Assignment *
              </label>
              <p style="font-size: 0.78rem; color: #0369a1; margin-bottom: 0.75rem; opacity: 0.85;">
                Select the faculty this professor belongs to. Their courses will only be visible to students enrolled in the same faculty.
              </p>
              <select name="faculty" required onchange="AdminView.onProfFacultyChange(this.value)"
                style="width: 100%; padding: 0.75rem; border: 1px solid #0284c7; border-radius: var(--radius-md); font-size: 0.95rem; font-weight: 700; background: white; color: #0369a1;">
                ${facultyOptions}
              </select>
            </div>

            <div style="margin-bottom: 1rem;">
              <label style="display: block; font-size: 0.85rem; font-weight: 700; margin-bottom: 0.35rem;">
                Department Title (auto-filled, editable)
              </label>
              <input type="text" name="department" id="prof_dept_input" value="Computer Science Department"
                style="width: 100%; padding: 0.7rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 0.95rem; background: var(--bg-surface); color: var(--text-primary);">
            </div>

          </div>
          <div class="modal-footer" style="padding: 1rem 1.5rem; display: flex; justify-content: flex-end; gap: 0.75rem; border-top: 1px solid var(--border-color);">
            <button type="button" class="btn btn-outline" onclick="App.closeModal()">Cancel</button>
            <button type="submit" class="btn btn-primary" style="font-weight: 700;">🎓 Register Professor</button>
          </div>
        </form>
      </div>
    `);
  },

  onProfFacultyChange(faculty) {
    const deptInput = document.getElementById('prof_dept_input');
    if (deptInput && faculty) {
      deptInput.value = faculty + ' Department';
    }
  },

  async submitCreateProfessor(e) {
    e.preventDefault();
    const form = e.target;
    try {
      await API.createProfessor({
        full_name: form.full_name.value,
        email: form.email.value,
        password: form.password.value,
        faculty: form.faculty.value,
        department: form.department.value
      });
      App.closeModal();
      App.showToast('Professor registered successfully! 🎓');
      App.refreshCurrentView();
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  },

  openEditProfessorModal(profId) {
    const prof = this.cachedProfessors.find(p => p.id === profId);
    if (!prof) return;

    const facultyOptions = FACULTIES.map(f =>
      `<option value="${f.value}" ${f.value === prof.faculty ? 'selected' : ''}>${f.label}</option>`
    ).join('');

    App.showCustomModal(`
      <div class="modal-dialog" style="max-width: 560px; width: 95%;">
        <div class="modal-header">
          <h3 style="font-size: 1.2rem; font-weight: 700;">✏️ Edit Professor - ${prof.full_name}</h3>
          <button class="drawer-toggle-btn" onclick="App.closeModal()">✕</button>
        </div>
        <form onsubmit="AdminView.submitEditProfessor(event, ${prof.id})">
          <div class="modal-body" style="max-height: 75vh; overflow-y: auto; padding: 1.5rem;">

            <div style="margin-bottom: 1.15rem;">
              <label style="display: block; font-size: 0.85rem; font-weight: 700; margin-bottom: 0.35rem;">Full Name *</label>
              <input type="text" name="full_name" required value="${prof.full_name || ''}"
                style="width: 100%; padding: 0.7rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 0.95rem; background: var(--bg-surface); color: var(--text-primary);">
            </div>

            <div style="margin-bottom: 1.15rem;">
              <label style="display: block; font-size: 0.85rem; font-weight: 700; margin-bottom: 0.35rem;">Email Address *</label>
              <input type="email" name="email" required value="${prof.email || ''}"
                style="width: 100%; padding: 0.7rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 0.95rem; background: var(--bg-surface); color: var(--text-primary);">
            </div>

            <div style="margin-bottom: 1.15rem; background: #f0f9ff; border: 2px solid #0284c7; border-radius: var(--radius-md); padding: 1rem;">
              <label style="display: block; font-size: 0.85rem; font-weight: 800; margin-bottom: 0.5rem; color: #0369a1;">
                🏛️ Faculty / Department *
              </label>
              <select name="faculty" required style="width: 100%; padding: 0.75rem; border: 1px solid #0284c7; border-radius: var(--radius-md); font-size: 0.95rem; font-weight: 700; background: white; color: #0369a1;">
                ${facultyOptions}
              </select>
            </div>

            <div style="margin-bottom: 1.15rem;">
              <label style="display: block; font-size: 0.85rem; font-weight: 700; margin-bottom: 0.35rem;">Department Title</label>
              <input type="text" name="department" value="${prof.department || ''}"
                style="width: 100%; padding: 0.7rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 0.95rem; background: var(--bg-surface); color: var(--text-primary);">
            </div>

            <div style="display: flex; align-items: center; gap: 0.65rem; background: var(--bg-surface-alt); padding: 0.85rem 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
              <input type="checkbox" name="is_active" id="edit_prof_active" ${prof.is_active !== 0 ? 'checked' : ''} style="width: 18px; height: 18px;">
              <label for="edit_prof_active" style="font-size: 0.88rem; font-weight: 600; cursor: pointer;">
                Allow Professor to Log In (Active Account)
              </label>
            </div>
          </div>
          <div class="modal-footer" style="padding: 1rem 1.5rem; display: flex; justify-content: flex-end; gap: 0.75rem; border-top: 1px solid var(--border-color);">
            <button type="button" class="btn btn-outline" onclick="App.closeModal()">Cancel</button>
            <button type="submit" class="btn btn-primary" style="font-weight: 700;">Save Changes</button>
          </div>
        </form>
      </div>
    `);
  },

  async submitEditProfessor(e, profId) {
    e.preventDefault();
    const form = e.target;
    try {
      await API.updateProfessor(profId, {
        full_name: form.full_name.value,
        email: form.email.value,
        faculty: form.faculty.value,
        department: form.department.value,
        is_active: form.is_active.checked
      });
      App.closeModal();
      App.showToast('Professor updated successfully!');
      App.refreshCurrentView();
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  },

  async deleteProfessor(profId, profName) {
    if (!confirm(`Are you sure you want to remove professor "${profName}"? Their courses will remain.`)) return;
    try {
      await API.deleteProfessor(profId);
      App.showToast(`Professor "${profName}" removed.`);
      App.refreshCurrentView();
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  },

  // ============================================================
  // ADMIN MODALS
  // ============================================================
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
              <input type="text" name="full_name" required placeholder="e.g. Eng. Guray Sicid" style="width: 100%; padding: 0.7rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 0.95rem; background: var(--bg-surface); color: var(--text-primary);">
            </div>

            <div style="margin-bottom: 1.15rem;">
              <label style="display: block; font-size: 0.85rem; font-weight: 700; margin-bottom: 0.35rem;">
                ${I18N.t('students.email', 'Email Address')} *
              </label>
              <input type="email" name="email" required placeholder="admin@guraysicid.edu" style="width: 100%; padding: 0.7rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 0.95rem; background: var(--bg-surface); color: var(--text-primary);">
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
  },

  async handleImportSnapshot(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!confirm(`Ma hubtaa inaad rabto inaad dib u soo celiso dhammaan xogta laga helayo faylka "${file.name}"? Tani waxay dib u qori doontaa xogta platform-ka.`)) {
      e.target.value = '';
      return;
    }
    try {
      App.showToast('Akhrinta snapshot JSON...', 'info');
      const text = await file.text();
      const snapshot = JSON.parse(text);
      App.showToast('Soo celinta xogta waa socotaa...', 'info');
      const res = await API.request('/admin/restore-json', {
        method: 'POST',
        body: JSON.stringify(snapshot)
      });
      App.showToast(res.message || 'Xogta si guul leh ayaa loo soo celiyay! 🎉');
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      App.showToast('Qalad: ' + err.message, 'error');
    } finally {
      e.target.value = '';
    }
  },

  async restoreDefaultData() {
    if (!confirm('Ma hubtaa inaad rabto inaad dib u soo celiso dhammaan koorsooyinkii iyo xogtii rasmiga ahayd ee platform-ka? Tani waxay meesha ka saaraysaa xogtii tijaabada ahayd.')) return;
    try {
      App.showToast('Dib u soo celinta xogta waa la bilaabay...', 'info');
      await API.request('/admin/seed-default', { method: 'POST' });
      App.showToast('Dhammaan koorsooyinkii iyo xogtii rasmiga ahayd si guul leh ayaa loo soo celiyay! 🎉');
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  }
};
