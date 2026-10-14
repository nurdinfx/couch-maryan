// ====================================================================
// VIEW: BADGES, ACHIEVEMENTS & VERIFIABLE CERTIFICATES
// ====================================================================

const BadgesView = {
  async render() {
    const user = API.currentUser;
    const isProfessor = user.role === 'professor' || user.role === 'admin';

    const badgesData = await API.getBadges();
    const badges = badgesData.badges || [];
    const recentAwards = badgesData.recentAwards || [];

    const certsData = await API.getMyCertificates().catch(() => ({ certificates: [] }));
    const certificates = certsData.certificates || [];

    return `
      <!-- Breadcrumbs -->
      <div class="breadcrumb-trail">
        <a href="#/dashboard">Dashboard</a>
        <span class="breadcrumb-sep">/</span>
        <span>Achievements & Credentials</span>
      </div>

      <div class="page-header-container">
        <div>
          <h1 class="page-title">Badges, Achievements & Certificates</h1>
          <p class="page-description">Authentic academic accomplishments backed by real course activities and performance</p>
        </div>
        ${isProfessor ? `
          <div style="display:flex;gap:0.5rem;">
            <button class="btn btn-primary" onclick="App.showModal('createBadgeModal')">
              🏆 Create Badge
            </button>
            <button class="btn btn-outline" onclick="BadgesView.openManualAwardModal()">
              + Award Badge Manually
            </button>
          </div>
        ` : ''}
      </div>

      <!-- Certificates Section -->
      ${certificates.length > 0 ? `
        <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 1.75rem; margin-bottom: 2rem; box-shadow: var(--shadow-sm);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
            <div>
              <h2 style="font-size: 1.25rem; display: flex; align-items: center; gap: 0.5rem;">
                <span>📜</span> Official Faculty Certificates of Completion
              </h2>
              <p style="font-size: 0.84rem; color: var(--text-muted);">Verified credentials issued upon 100% course requirements fulfillment</p>
            </div>
            <span class="badge badge-success">${certificates.length} Issued</span>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.25rem;">
            ${certificates.map(cert => `
              <div style="border: 2px solid #d4af37; border-radius: var(--radius-md); padding: 1.25rem; background: #fffdfa; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                    <span class="badge badge-warning" style="background: #fef3c7; color: #b45309;">OFFICIAL CREDENTIAL</span>
                    <small style="color: var(--text-muted); font-family: monospace;">${cert.uuid}</small>
                  </div>
                  <h3 style="font-size: 1.1rem; color: #1e293b; margin-bottom: 0.25rem;">${cert.course_code}: ${cert.course_title}</h3>
                  <div style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 0.75rem;">
                    Awarded to <strong>${cert.student_name}</strong> on ${new Date(cert.issued_at).toLocaleDateString()}
                  </div>
                </div>

                <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
                  <button class="btn btn-primary btn-sm" onclick="BadgesView.viewCertificateModal('${cert.uuid}')">
                    Inspect & Print Certificate
                  </button>
                  <button class="btn btn-outline btn-sm" onclick="BadgesView.copyVerificationLink('${cert.uuid}')">
                    Copy Verify Link
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Badges Showcase Grid -->
      <h2 style="font-size: 1.25rem; margin-bottom: 1rem;">Faculty Achievement Badges</h2>
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.25rem; margin-bottom: 2rem;">
        ${badges.map(b => `
          <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 1.5rem; display: flex; flex-direction: column; align-items: center; text-align: center; box-shadow: var(--shadow-sm); position: relative; opacity: ${b.is_earned_by_me || isProfessor ? '1' : '0.6'};">
            ${b.is_earned_by_me ? `
              <span class="badge badge-success" style="position: absolute; top: 1rem; right: 1rem;">Earned ✓</span>
            ` : ''}
            
            <div style="width: 72px; height: 72px; border-radius: 50%; background: var(--bg-surface-alt); display: flex; align-items: center; justify-content: center; font-size: 2.2rem; margin-bottom: 1rem; border: 2px solid ${b.is_earned_by_me ? 'var(--success)' : 'var(--border-color)'};">
              ${b.icon}
            </div>

            <h3 style="font-size: 1.05rem; font-weight: 700; margin-bottom: 0.35rem;">${b.name}</h3>
            <p style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.45; margin-bottom: 1rem; flex: 1;">
              ${b.description}
            </p>

            <div style="font-size: 0.74rem; color: var(--text-muted); border-top: 1px solid var(--border-color); width: 100%; padding-top: 0.75rem;">
              ${b.is_earned_by_me ? `Earned: ${new Date(b.my_awarded_at).toLocaleDateString()}` : `Total students awarded: ${b.total_awarded_count}`}
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Professor Audit of Recent Awards -->
      ${isProfessor && recentAwards.length > 0 ? `
        <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 1.5rem;">
          <h3 style="font-size: 1.15rem; margin-bottom: 1rem;">Recent Badge Awards Audit</h3>
          <div class="gradebook-table-container">
            <table class="gradebook-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Badge Awarded</th>
                  <th>Course</th>
                  <th>Date & Time</th>
                </tr>
              </thead>
              <tbody>
                ${recentAwards.map(a => `
                  <tr>
                    <td>
                      <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <img src="${a.avatar_url}" style="width: 26px; height: 26px; border-radius: 50%;">
                        <strong>${a.student_name}</strong>
                      </div>
                    </td>
                    <td>
                      <span style="font-size: 1.1rem; margin-right: 0.3rem;">${a.icon}</span>
                      <strong>${a.badge_name}</strong>
                    </td>
                    <td>${a.course_title}</td>
                    <td style="font-size: 0.8rem; color: var(--text-muted);">${new Date(a.awarded_at).toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}
    `;
  },

  async viewCertificateModal(uuid) {
    try {
      const data = await API.verifyCertificate(uuid);
      const cert = data.certificate;

      App.showCustomModal(`
        <div class="modal-dialog" style="max-width: 820px;">
          <div class="modal-header">
            <h3 style="font-size: 1.1rem;">Official Faculty Credential</h3>
            <button class="drawer-toggle-btn" onclick="App.closeModal()">✕</button>
          </div>
          <div class="modal-body" style="background: #fdfbf7; padding: 2.5rem 2rem;">
            
            <!-- Authentic Certificate Frame -->
            <div class="certificate-frame" id="printable-certificate-area">
              <div style="font-size: 0.85rem; font-weight: 800; letter-spacing: 0.2em; color: #b8860b; text-transform: uppercase; margin-bottom: 0.5rem;">
                Faculty of Midwifery
              </div>
              <h1 style="font-family: var(--font-display); font-size: 2.2rem; color: #1e293b; margin-bottom: 0.5rem;">
                Certificate of Academic Completion
              </h1>
              <p style="font-size: 0.95rem; color: #64748b; margin-bottom: 1.5rem;">
                This certifies that
              </p>

              <div style="font-family: var(--font-display); font-size: 2rem; font-weight: 800; color: var(--primary); border-bottom: 2px solid #d4af37; display: inline-block; padding: 0 2rem 0.5rem; margin-bottom: 1.25rem;">
                ${cert.student_name}
              </div>

              <p style="font-size: 0.95rem; color: #475569; max-width: 600px; margin: 0 auto 1.5rem; line-height: 1.6;">
                has successfully completed all required lectures, laboratory assignments, consensus protocols, and examinations for the academic course
              </p>

              <h2 style="font-size: 1.4rem; color: #0f4c81; margin-bottom: 1.5rem;">
                ${cert.code}: ${cert.title}
              </h2>

              <div class="certificate-seal">
                <span>OFFICIAL</span>
                <span style="font-size: 0.9rem;">★ SEAL ★</span>
                <span>FACULTY</span>
              </div>

              <div style="display: flex; justify-content: space-around; margin-top: 2rem; border-top: 1px solid #cbd5e1; padding-top: 1.5rem; font-size: 0.82rem; color: #64748b;">
                <div>
                  <div style="font-family: 'Brush Script MT', cursive, sans-serif; font-size: 1.5rem; color: #1e293b;">Maryam Al-Mansoor</div>
                  <div><strong>Prof. Maryam Al-Mansoor</strong></div>
                  <div>Faculty Academic Director</div>
                </div>
                <div>
                  <div style="font-weight: 700; color: #1e293b; margin-top: 0.5rem;">${new Date(cert.issued_at).toLocaleDateString()}</div>
                  <div><strong>Date of Award</strong></div>
                  <div>Verification UUID: <code>${cert.uuid}</code></div>
                </div>
              </div>
            </div>

          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" onclick="App.closeModal()">Close</button>
            <button class="btn btn-primary" onclick="window.print()">
              🖨️ Print / Save as PDF
            </button>
          </div>
        </div>
      `);
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  },

  copyVerificationLink(uuid) {
    const link = `${window.location.origin}/api/certificates/verify/${uuid}`;
    navigator.clipboard.writeText(link).then(() => {
      App.showToast('Official verification link copied to clipboard!');
    });
  },

  openManualAwardModal() {
    App.showCustomModal(`
      <div class="modal-dialog">
        <div class="modal-header">
          <h3 style="font-size: 1.15rem;">Award Academic Badge</h3>
          <button class="drawer-toggle-btn" onclick="App.closeModal()">✕</button>
        </div>
        <form onsubmit="BadgesView.submitManualAward(event)">
          <div class="modal-body">
            <div style="margin-bottom: 1.25rem;">
              <label style="display: block; font-size: 0.82rem; font-weight: 700; margin-bottom: 0.4rem;">Select Student</label>
              <select name="user_id" required style="width: 100%; padding: 0.65rem; border: 1px solid var(--border-color); border-radius: var(--radius-md);">
                <option value="2">Alex Chen (Junior - Cloud Systems)</option>
                <option value="3">Fatima Zahra (Undergraduate - SRE)</option>
                <option value="4">Marcus Vance (Undergraduate)</option>
                <option value="5">Layla Karim (Senior - Top Performer)</option>
              </select>
            </div>
            <div style="margin-bottom: 1.25rem;">
              <label style="display: block; font-size: 0.82rem; font-weight: 700; margin-bottom: 0.4rem;">Select Badge</label>
              <select name="badge_id" required style="width: 100%; padding: 0.65rem; border: 1px solid var(--border-color); border-radius: var(--radius-md);">
                <option value="2">Quiz Master (🏆)</option>
                <option value="3">Engineering Excellence (⚡)</option>
                <option value="4">Steadfast Attendance (📅)</option>
                <option value="6">Consistent Learner (🔥)</option>
              </select>
            </div>
            <div style="margin-bottom: 1.25rem;">
              <label style="display: block; font-size: 0.82rem; font-weight: 700; margin-bottom: 0.4rem;">Course Context</label>
              <select name="course_id" required style="width: 100%; padding: 0.65rem; border: 1px solid var(--border-color); border-radius: var(--radius-md);">
                <option value="1">MID101: Fundamentals of Midwifery Care</option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" onclick="App.closeModal()">Cancel</button>
            <button type="submit" class="btn btn-success">Confirm Award</button>
          </div>
        </form>
      </div>
    `);
  },

  async submitManualAward(e) {
    e.preventDefault();
    const form = e.target;
    try {
      await API.awardBadge(form.badge_id.value, form.user_id.value, form.course_id.value);
      App.closeModal();
      App.showToast('Badge awarded successfully! 🎓');
      App.refreshCurrentView();
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  }
};
