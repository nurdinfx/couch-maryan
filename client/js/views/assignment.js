// ====================================================================
// VIEW: ASSIGNMENT & STUDENT SUBMISSION / GRADING
// ====================================================================

const AssignmentView = {
  async render(params) {
    const assignmentId = parseInt(params.id);
    const user = API.currentUser;
    const isProfessor = user.role === 'professor' || user.role === 'admin';

    const data = await API.getAssignment(assignmentId);
    const assignment = data.assignment;
    const mySub = data.submission;
    const stats = data.stats;

    return `
      <!-- Breadcrumbs -->
      <div class="breadcrumb-trail">
        <a href="#/dashboard">Dashboard</a>
        <span class="breadcrumb-sep">/</span>
        <a href="#/course/${assignment.course_id}">${assignment.course_code}</a>
        <span class="breadcrumb-sep">/</span>
        <span>${assignment.module_title || 'Module'}</span>
        <span class="breadcrumb-sep">/</span>
        <span>${assignment.title}</span>
      </div>

      <!-- Assignment Header -->
      <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 2rem; margin-bottom: 2rem; box-shadow: var(--shadow-sm);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;">
          <div>
            <div style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.35rem;">
              <span class="badge badge-warning">⚡ ASSIGNMENT</span>
              <span style="font-size: 0.8rem; color: var(--text-muted);">${assignment.course_code}: ${assignment.course_title}</span>
            </div>
            <h1 style="font-size: 1.6rem; margin-bottom: 0.75rem;">${assignment.title}</h1>
            
            <div style="display: flex; gap: 1.5rem; font-size: 0.84rem; color: var(--text-muted); flex-wrap: wrap;">
              <span>📅 <strong>Due Date:</strong> ${new Date(assignment.due_date).toLocaleString()}</span>
              <span>🎯 <strong>Maximum Score:</strong> ${assignment.max_score} pts</span>
              <span>⚖️ <strong>Weight:</strong> ${assignment.weight_percentage}%</span>
              <span>⏳ <strong>Late Submissions:</strong> ${assignment.allow_late ? 'Allowed with late tag' : 'Not Allowed'}</span>
            </div>
          </div>

          ${isProfessor ? `
            <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 0.5rem;">
              <span class="badge badge-primary" style="font-size: 0.8rem;">Professor View</span>
              <div style="font-size: 0.78rem; color: var(--text-muted);">
                ${stats?.submittedCount || 0} Submitted • ${stats?.needsGradingCount || 0} Need Grading
              </div>
              <button class="btn btn-outline btn-sm" style="color: var(--danger); border-color: var(--danger-border); display: flex; align-items: center; gap: 0.25rem;"
                      title="Tirtir shaqadan / Delete assignment"
                      onclick="App.deleteAssignment(${assignment.id}, '${(assignment.title || '').replace(/'/g, "\\'")}').then(() => { App.navigate('/course/${assignment.course_id}'); })">
                🗑 <span>Delete Assignment</span>
              </button>
            </div>
          ` : ''}
        </div>

        <!-- Instructions -->
        <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--border-color); line-height: 1.6;">
          <h3 style="font-size: 1.05rem; margin-bottom: 0.5rem;">Instructions & Requirements</h3>
          <div style="white-space: pre-wrap; font-size: 0.92rem; color: var(--text-main);">${assignment.instructions}</div>

          ${assignment.attachment_url ? `
            <div style="margin-top: 1.25rem;">
              <a href="${assignment.attachment_url}" target="_blank" download class="btn btn-outline btn-sm">
                <span>📎</span> Download Specification (${assignment.attachment_name || 'Assignment Guide.pdf'})
              </a>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- Role-Based Section: Student Submission vs Professor Review Grid -->
      ${isProfessor ? this.renderProfessorSubmissions(assignment) : this.renderStudentSubmissionStatus(assignment, mySub)}
    `;
  },

  renderStudentSubmissionStatus(assignment, submission) {
    const isGraded = submission && submission.status === 'graded' && submission.is_grades_released;

    return `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 1.5rem;">
        
        <!-- Status Card -->
        <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 1.75rem; box-shadow: var(--shadow-sm);">
          <h3 style="font-size: 1.15rem; margin-bottom: 1rem;">Submission Status</h3>
          
          <table style="width: 100%; font-size: 0.88rem; border-collapse: collapse;">
            <tbody>
              <tr style="border-bottom: 1px solid var(--border-color);">
                <td style="padding: 0.75rem 0; color: var(--text-muted); width: 140px;">Status</td>
                <td style="padding: 0.75rem 0;">
                  <span class="badge ${submission?.status === 'graded' ? 'badge-success' : submission?.status === 'submitted' ? 'badge-warning' : 'badge-danger'}">
                    ${submission?.status ? submission.status.toUpperCase() : 'NO SUBMISSION'}
                  </span>
                </td>
              </tr>
              <tr style="border-bottom: 1px solid var(--border-color);">
                <td style="padding: 0.75rem 0; color: var(--text-muted);">Submitted At</td>
                <td style="padding: 0.75rem 0; font-weight: 600;">
                  ${submission?.submitted_at ? new Date(submission.submitted_at).toLocaleString() : '—'}
                </td>
              </tr>
              <tr style="border-bottom: 1px solid var(--border-color);">
                <td style="padding: 0.75rem 0; color: var(--text-muted);">Grade</td>
                <td style="padding: 0.75rem 0;">
                  ${isGraded ? `
                    <strong style="font-size: 1.1rem; color: var(--success);">${submission.grade} / ${assignment.max_score}</strong>
                    <span style="font-size: 0.8rem; color: var(--text-muted);">(${Math.round((submission.grade / assignment.max_score) * 100)}%)</span>
                  ` : '<span style="color: var(--text-muted);">Not graded yet</span>'}
                </td>
              </tr>
              ${isGraded && submission.feedback ? `
                <tr style="border-bottom: 1px solid var(--border-color);">
                  <td style="padding: 0.75rem 0; color: var(--text-muted); vertical-align: top;">Feedback</td>
                  <td style="padding: 0.75rem 0; font-size: 0.85rem; line-height: 1.5; color: var(--text-main);">
                    ${submission.feedback}
                  </td>
                </tr>
              ` : ''}
              ${submission?.file_url ? `
                <tr>
                  <td style="padding: 0.75rem 0; color: var(--text-muted);">Uploaded File</td>
                  <td style="padding: 0.75rem 0;">
                    <a href="${submission.file_url}" target="_blank" download style="font-weight: 600;">
                      📥 ${submission.file_name || 'Download Submitted File'}
                    </a>
                  </td>
                </tr>
              ` : ''}
            </tbody>
          </table>
        </div>

        <!-- Submission Upload Form -->
        <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 1.75rem; box-shadow: var(--shadow-sm);">
          <h3 style="font-size: 1.15rem; margin-bottom: 0.5rem;">${submission ? 'Update Your Submission' : 'Submit Assignment'}</h3>
          <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 1.25rem;">
            Upload your source code archive, report PDF, or enter your online text response.
          </p>

          <form id="assignment-submit-form" onsubmit="AssignmentView.handleStudentSubmit(event, ${assignment.id})">
            <div style="margin-bottom: 1.25rem;">
              <label style="display: block; font-size: 0.82rem; font-weight: 700; margin-bottom: 0.4rem;">Online Text / Summary Response</label>
              <textarea name="submission_text" rows="4" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-family: inherit; font-size: 0.88rem; outline: none; background: var(--bg-surface-alt);" placeholder="Describe your solution, architecture choices, or paste response...">${submission?.submission_text || ''}</textarea>
            </div>

            <div style="margin-bottom: 1.5rem;">
              <label style="display: block; font-size: 0.82rem; font-weight: 700; margin-bottom: 0.4rem;">Upload Document / Archive (.pdf, .zip, .docx)</label>
              <input type="file" name="submission_file" style="font-size: 0.85rem; width: 100%;">
            </div>

            <button type="submit" class="btn btn-primary" style="width: 100%;">
              ${submission ? 'Submit Updated Version' : 'Confirm & Submit Assignment'}
            </button>
          </form>
        </div>

      </div>
    `;
  },

  renderProfessorSubmissions(assignment) {
    setTimeout(async () => {
      try {
        const data = await API.getSubmissions(assignment.id);
        const container = document.getElementById('professor-submissions-container');
        if (!container) return;

        container.innerHTML = `
          <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 1.75rem; box-shadow: var(--shadow-sm);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
              <div>
                <h3 style="font-size: 1.2rem;">Student Submissions & Grading Console</h3>
                <p style="font-size: 0.84rem; color: var(--text-muted);">Review submitted files, assign marks, and provide detailed pedagogical feedback</p>
              </div>
            </div>

            <div class="gradebook-table-container">
              <table class="gradebook-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Status</th>
                    <th>Submitted Time</th>
                    <th>Attached Work</th>
                    <th>Grade / Max</th>
                    <th>Feedback</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.students.map(s => `
                    <tr>
                      <td>
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                          <img src="${s.avatar_url}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;">
                          <div>
                            <div style="font-weight: 700;">${s.full_name}</div>
                            <div style="font-size: 0.72rem; color: var(--text-muted);">${s.student_id_number || s.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span class="badge ${s.submission_status === 'graded' ? 'badge-success' : s.submission_status === 'submitted' ? 'badge-warning' : 'badge-danger'}">
                          ${s.submission_status ? s.submission_status.toUpperCase() : 'NOT SUBMITTED'}
                        </span>
                      </td>
                      <td style="font-size: 0.8rem;">
                        ${s.submitted_at ? new Date(s.submitted_at).toLocaleString() : '—'}
                      </td>
                      <td>
                        ${s.file_url ? `
                          <a href="${s.file_url}" target="_blank" download class="btn btn-outline btn-sm" style="font-size: 0.75rem;">
                            📥 ${s.file_name || 'Download File'}
                          </a>
                        ` : s.submission_text ? `
                          <span title="${s.submission_text}" style="cursor: help; color: var(--primary); font-weight: 600;">Text submitted</span>
                        ` : '<span style="color: var(--text-muted);">None</span>'}
                      </td>
                      <td>
                        ${s.grade !== null && s.grade !== undefined ? `
                          <strong style="color: var(--success); font-size: 1rem;">${s.grade}</strong> / ${assignment.max_score}
                        ` : '<span style="color: var(--text-muted);">—</span>'}
                      </td>
                      <td style="font-size: 0.8rem; color: var(--text-muted); max-width: 250px;">
                        ${s.feedback || '—'}
                      </td>
                      <td>
                        ${s.submission_id ? `
                          <button class="btn btn-primary btn-sm" onclick="AssignmentView.openGradingModal(${s.submission_id}, '${s.full_name.replace(/'/g, "\\'")}', ${s.grade || 0}, '${(s.feedback || '').replace(/'/g, "\\'")}', ${assignment.max_score})">
                            ${s.submission_status === 'graded' ? 'Regrade' : 'Grade Submission'}
                          </button>
                        ` : `
                          <button class="btn btn-outline btn-sm" disabled style="opacity: 0.5;">No submission</button>
                        `}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `;
      } catch (err) {
        console.error(err);
      }
    }, 50);

    return `<div id="professor-submissions-container" style="padding: 2rem 0; text-align: center;">Loading student submissions...</div>`;
  },

  async handleStudentSubmit(e, assignmentId) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);

    try {
      await API.submitAssignment(assignmentId, formData);
      App.showToast('Assignment submitted successfully! 🎉');
      App.refreshCurrentView();
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  },

  openGradingModal(submissionId, studentName, currentGrade, currentFeedback, maxScore) {
    App.showCustomModal(`
      <div class="modal-dialog">
        <div class="modal-header">
          <h3 style="font-size: 1.15rem;">Grade Submission: ${studentName}</h3>
          <button class="drawer-toggle-btn" onclick="App.closeModal()">✕</button>
        </div>
        <form onsubmit="AssignmentView.submitGrade(event, ${submissionId})">
          <div class="modal-body">
            <div style="margin-bottom: 1.25rem;">
              <label style="display: block; font-size: 0.82rem; font-weight: 700; margin-bottom: 0.4rem;">
                Grade Score (Out of ${maxScore} points)
              </label>
              <input type="number" step="0.5" min="0" max="${maxScore}" name="grade" value="${currentGrade}" required
                     style="width: 100%; padding: 0.65rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 1rem; font-weight: 700;">
            </div>

            <div style="margin-bottom: 1.25rem;">
              <label style="display: block; font-size: 0.82rem; font-weight: 700; margin-bottom: 0.4rem;">
                Pedagogical Feedback & Comments
              </label>
              <textarea name="feedback" rows="4" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-family: inherit; font-size: 0.88rem;" placeholder="Explain what was done well and areas for improvement...">${currentFeedback}</textarea>
            </div>

            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <input type="checkbox" name="is_grades_released" id="release_grade_check" checked>
              <label for="release_grade_check" style="font-size: 0.85rem; font-weight: 600;">Release grade and feedback to student immediately</label>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" onclick="App.closeModal()">Cancel</button>
            <button type="submit" class="btn btn-success">Save & Release Grade</button>
          </div>
        </form>
      </div>
    `);
  },

  async submitGrade(e, submissionId) {
    e.preventDefault();
    const form = e.target;
    const grade = form.grade.value;
    const feedback = form.feedback.value;
    const isReleased = form.is_grades_released.checked;

    try {
      await API.gradeSubmission(submissionId, {
        grade,
        feedback,
        status: 'graded',
        is_grades_released: isReleased
      });
      App.closeModal();
      App.showToast('Grade and feedback saved successfully! 🎓');
      App.refreshCurrentView();
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  }
};
