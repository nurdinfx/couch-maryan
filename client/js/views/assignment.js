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
              <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
                <button class="btn btn-outline btn-sm" style="color: var(--primary); border-color: rgba(59, 130, 246, 0.4); display: flex; align-items: center; gap: 0.25rem;"
                        title="Wax ka beddel shaqadan / Edit assignment"
                        onclick="App.openEditAssignmentModal(${assignment.id})">
                  ✏️ <span>Edit</span>
                </button>
                <button class="btn btn-outline btn-sm" style="color: var(--danger); border-color: var(--danger-border); display: flex; align-items: center; gap: 0.25rem;"
                        title="Tirtir shaqadan / Delete assignment"
                        onclick="App.deleteAssignment(${assignment.id}).then(() => { App.navigate('/course/${assignment.course_id}'); })">
                  🗑 <span>Delete</span>
                </button>
              </div>
            </div>
          ` : ''}
        </div>

        <!-- Instructions -->
        <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--border-color); line-height: 1.6;">
          <h3 style="font-size: 1.05rem; margin-bottom: 0.5rem;">Instructions & Requirements</h3>
          <div style="white-space: pre-wrap; font-size: 0.92rem; color: var(--text-main);">${assignment.instructions}</div>

          ${assignment.attachment_url ? this.renderFilesGallery(this.parseAttachmentFiles(assignment.attachment_url, assignment.attachment_name), 'Hagaha Shaqada (Assignment Guide / Attached Files)') : ''}
        </div>
      </div>

      <!-- Role-Based Section: Student Submission vs Professor Review Grid -->
      ${isProfessor ? this.renderProfessorSubmissions(assignment) : this.renderStudentSubmissionStatus(assignment, mySub)}
    `;
  },

  // Helper to parse single URL string or JSON array of uploaded files
  parseAttachmentFiles(rawUrl, defaultName, defaultSize) {
    if (!rawUrl) return [];
    if (typeof rawUrl === 'string' && rawUrl.trim().startsWith('[')) {
      try {
        const arr = JSON.parse(rawUrl);
        if (Array.isArray(arr)) {
          return arr.map(item => ({
            url: (typeof API !== 'undefined' && API.getFileUrl) ? API.getFileUrl(item.url) : item.url,
            rawUrl: item.url,
            name: item.name || (item.url ? item.url.split('/').pop() : 'file'),
            size: item.size || 0,
            type: item.type || item.mimetype || ''
          }));
        }
      } catch (e) {}
    }
    const cleanUrl = (typeof API !== 'undefined' && API.getFileUrl) ? API.getFileUrl(rawUrl) : rawUrl;
    return [{
      url: cleanUrl,
      rawUrl: rawUrl,
      name: defaultName || (rawUrl ? rawUrl.split('/').pop() : 'file'),
      size: defaultSize || 0,
      type: ''
    }];
  },

  // Render a visual gallery of attached or submitted files
  renderFilesGallery(files, label = 'Attached Files') {
    if (!files || files.length === 0) return '';
    return `
      <div style="margin-top: 1.25rem;">
        <div style="font-size: 0.82rem; font-weight: 700; color: var(--text-muted); margin-bottom: 0.6rem; display: flex; align-items: center; gap: 0.4rem;">
          <span>📎</span> <span>${label}</span>
          <span class="badge" style="background: var(--bg-surface-alt); font-size: 0.72rem;">${files.length}</span>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 0.75rem;">
          ${files.map(f => {
            const fname = (f.name || f.url.split('/').pop() || 'file').toLowerCase();
            const isImg   = /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(fname) || (f.type && f.type.startsWith('image/'));
            const isVideo = /\.(mp4|mov|mkv|webm|avi|m4v|3gp|ogv|wmv)$/i.test(fname) || (f.type && f.type.startsWith('video/'));
            const isPdf   = fname.endsWith('.pdf');
            const sizeStr = f.size ? (f.size > 1024 * 1024 ? (f.size / 1024 / 1024).toFixed(1) + ' MB' : Math.round(f.size / 1024) + ' KB') : '';

            if (isImg) {
              return `
                <div style="border: 1px solid var(--border-color); border-radius: var(--radius-md); overflow: hidden; background: var(--bg-surface); display: flex; flex-direction: column; box-shadow: var(--shadow-sm);">
                  <a href="${f.url}" target="_blank" rel="noopener noreferrer" style="display: block; height: 130px; background: #0f172a; overflow: hidden; position: relative;" title="Riix si aad shaashad weyn ugu daawato">
                    <img src="${f.url}" alt="${f.name}" style="width: 100%; height: 100%; object-fit: cover; transition: transform .2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                    <span style="position: absolute; bottom: 4px; right: 4px; background: rgba(0,0,0,0.7); color: #fff; font-size: 0.68rem; padding: 2px 6px; border-radius: 4px;">🔍 Fur</span>
                  </a>
                  <div style="padding: 0.5rem; display: flex; justify-content: space-between; align-items: center; gap: 0.25rem;">
                    <div style="font-size: 0.76rem; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${f.name}">${f.name}</div>
                    <a href="${f.url}" download="${f.name}" class="btn btn-outline btn-sm" style="padding: 2px 7px; font-size: 0.72rem; flex-shrink: 0;" title="Degso">📥</a>
                  </div>
                </div>
              `;
            }

            if (isVideo) {
              return `
                <div style="border: 1px solid var(--border-color); border-radius: var(--radius-md); overflow: hidden; background: var(--bg-surface); box-shadow: var(--shadow-sm);">
                  <video src="${f.url}" controls style="width: 100%; height: 130px; background: #000; object-fit: contain;"></video>
                  <div style="padding: 0.5rem; display: flex; justify-content: space-between; align-items: center; gap: 0.25rem;">
                    <div style="font-size: 0.76rem; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${f.name}">${f.name}</div>
                    <a href="${f.url}" download="${f.name}" class="btn btn-outline btn-sm" style="padding: 2px 7px; font-size: 0.72rem; flex-shrink: 0;" title="Degso">📥</a>
                  </div>
                </div>
              `;
            }

            return `
              <div style="border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 0.75rem; background: var(--bg-surface-alt); display: flex; flex-direction: column; justify-content: space-between; min-height: 105px; box-shadow: var(--shadow-sm);">
                <div style="display: flex; gap: 0.5rem; align-items: flex-start;">
                  <span style="font-size: 1.6rem; line-height: 1;">${isPdf ? '📄' : '📁'}</span>
                  <div style="overflow: hidden; flex: 1;">
                    <div style="font-size: 0.8rem; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${f.name}">${f.name}</div>
                    <div style="font-size: 0.7rem; color: var(--text-muted);">${sizeStr || 'Document'}</div>
                  </div>
                </div>
                <div style="display: flex; gap: 0.4rem; margin-top: 0.6rem;">
                  <a href="${f.url}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm" style="flex: 1; padding: 3px 6px; font-size: 0.72rem; text-align: center;">Fur ↗</a>
                  <a href="${f.url}" download="${f.name}" class="btn btn-primary btn-sm" style="padding: 3px 8px; font-size: 0.72rem;" title="Degso">📥</a>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  },

  renderStudentSubmissionStatus(assignment, submission) {
    const isGraded = submission && submission.status === 'graded' && submission.is_grades_released;
    const submittedFiles = submission?.file_url ? this.parseAttachmentFiles(submission.file_url, submission.file_name, submission.file_size_bytes) : [];

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
              ${submission?.submission_text ? `
                <tr style="border-bottom: 1px solid var(--border-color);">
                  <td style="padding: 0.75rem 0; color: var(--text-muted); vertical-align: top;">Online Text</td>
                  <td style="padding: 0.75rem 0; font-size: 0.85rem; white-space: pre-wrap;">
                    ${submission.submission_text}
                  </td>
                </tr>
              ` : ''}
            </tbody>
          </table>

          ${submittedFiles.length > 0 ? this.renderFilesGallery(submittedFiles, 'Faylasha / Sawirrada aad soo gudbisay') : ''}
        </div>

        <!-- Submission Upload Form -->
        <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 1.75rem; box-shadow: var(--shadow-sm);">
          <h3 style="font-size: 1.15rem; margin-bottom: 0.5rem;">${submission ? 'Update Your Submission' : 'Submit Assignment'}</h3>
          <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 1.25rem;">
            Waxaad soo gelin kartaa sawirro badan oo hawshaada ah, warbixin PDF, ama qoraalkaaga online-ka ah.
          </p>

          <form id="assignment-submit-form" onsubmit="AssignmentView.handleStudentSubmit(event, ${assignment.id})">
            <div style="margin-bottom: 1.25rem;">
              <label style="display: block; font-size: 0.82rem; font-weight: 700; margin-bottom: 0.4rem;">Online Text / Summary Response</label>
              <textarea name="submission_text" rows="3" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-family: inherit; font-size: 0.88rem; outline: none; background: var(--bg-surface-alt);" placeholder="Qor sharraxaad ama jawaabtaada...">${submission?.submission_text || ''}</textarea>
            </div>

            <div style="margin-bottom: 1.25rem;">
              <label style="display: block; font-size: 0.82rem; font-weight: 700; margin-bottom: 0.4rem;">
                📎 Soo geli Sawirro badan, PDF, ama Documents <span style="font-weight: 400; color: var(--text-muted);">(Dooro sawirro badan hal mar)</span>
              </label>

              <div id="student-dropzone"
                ondragover="event.preventDefault();this.style.borderColor='var(--primary)';this.style.background='#eff6ff';"
                ondragleave="this.style.borderColor='var(--border-color)';this.style.background='';"
                ondrop="AssignmentView.handleStudentDrop(event)"
                style="border: 2px dashed var(--border-color); border-radius: var(--radius-md); padding: 1.25rem 1rem; text-align: center; cursor: pointer; transition: all .2s; background: var(--bg-surface-alt);"
                onclick="document.getElementById('student-submit-files').click()">
                <input type="file" id="student-submit-files" name="submission_file" multiple
                  accept="image/*,video/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.rar"
                  style="display: none;"
                  onchange="AssignmentView.handleStudentFilesSelect(this)">
                <div id="student-drop-idle">
                  <div style="font-size: 2.2rem; margin-bottom: 0.3rem;">📸</div>
                  <div style="font-weight: 700; font-size: 0.92rem; color: var(--primary);">
                    Riix halkan si aad u soo doorato sawirro badan ama faylal
                  </div>
                  <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 0.25rem;">
                    Waxaad dooran kartaa sawirro badan hal mar (Hold Ctrl / Shift ama dooro gallery-gaaga)
                  </div>
                </div>
                <div id="student-files-preview" style="display: none; margin-top: 0.75rem; text-align: left;" onclick="event.stopPropagation()"></div>
              </div>

              <div id="student-upload-bar-wrap" style="display: none; margin-top: 0.6rem;">
                <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.2rem;" id="student-upload-bar-label">Soo gelayaa...</div>
                <div style="background: #e2e8f0; border-radius: 99px; height: 7px; overflow: hidden;">
                  <div id="student-upload-bar" style="height: 100%; width: 0%; background: var(--primary); border-radius: 99px; transition: width .3s;"></div>
                </div>
              </div>
            </div>

            <button type="submit" id="student-submit-btn" class="btn btn-primary" style="width: 100%; padding: 0.75rem; font-weight: 700;">
              ${submission ? '📤 Submit Updated Version' : '🚀 Confirm & Submit Assignment'}
            </button>
          </form>
        </div>

      </div>
    `;
  },

  handleStudentDrop(event) {
    event.preventDefault();
    const dz = document.getElementById('student-dropzone');
    if (dz) { dz.style.borderColor = 'var(--border-color)'; dz.style.background = ''; }
    const files = event.dataTransfer && event.dataTransfer.files;
    if (files && files.length > 0) {
      const inp = document.getElementById('student-submit-files');
      if (inp) {
        try {
          const dt = new DataTransfer();
          for (let i = 0; i < files.length; i++) dt.items.add(files[i]);
          inp.files = dt.files;
        } catch (e) {}
        AssignmentView.handleStudentFilesSelect(inp);
      }
    }
  },

  handleStudentFilesSelect(input) {
    const files = Array.from(input.files || []);
    if (files.length === 0) return;
    const idle = document.getElementById('student-drop-idle');
    const preview = document.getElementById('student-files-preview');
    if (!idle || !preview) return;

    idle.style.display = 'none';
    preview.style.display = 'block';

    const totalBytes = files.reduce((acc, f) => acc + (f.size || 0), 0);
    const totalMB = (totalBytes / 1024 / 1024).toFixed(1);

    preview.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;padding-bottom:0.35rem;border-bottom:1px solid var(--border-color);">
        <span style="font-size:0.8rem;font-weight:700;color:var(--primary);">
          📸 ${files.length} ${files.length === 1 ? 'sawir/fayl' : 'sawirro/faylal'} la doortay (${totalMB} MB)
        </span>
        <button type="button" class="btn btn-outline btn-sm" style="padding:2px 7px;font-size:0.7rem;color:#ef4444;" onclick="event.stopPropagation();AssignmentView.clearStudentFiles()">
          ✕ Tirtir
        </button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(90px, 1fr));gap:0.4rem;max-height:180px;overflow-y:auto;">
        ${files.map(file => {
          const isImg = file.type.startsWith('image/');
          const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
          const objUrl = isImg ? URL.createObjectURL(file) : '';
          return `
            <div style="border:1px solid var(--border-color);border-radius:var(--radius-sm);overflow:hidden;background:var(--bg-surface);display:flex;flex-direction:column;">
              ${isImg ? `
                <div style="height:65px;background:#0f172a;overflow:hidden;display:flex;align-items:center;justify-content:center;">
                  <img src="${objUrl}" style="max-height:100%;max-width:100%;object-fit:cover;">
                </div>
              ` : `
                <div style="height:65px;background:var(--bg-surface-alt);display:flex;align-items:center;justify-content:center;font-size:1.6rem;">
                  ${isPdf ? '📄' : '📁'}
                </div>
              `}
              <div style="padding:0.25rem;font-size:0.65rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${file.name}">
                ${file.name}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    const wrap = document.getElementById('student-upload-bar-wrap');
    const bar  = document.getElementById('student-upload-bar');
    const lbl  = document.getElementById('student-upload-bar-label');
    if (wrap && bar) {
      wrap.style.display = 'block';
      lbl.textContent = `✅ ${files.length} sawirro/faylal diyaar u ah gudbinta (${totalMB} MB)`;
      bar.style.width = '100%';
      bar.style.background = '#22c55e';
    }
  },

  clearStudentFiles() {
    const inp = document.getElementById('student-submit-files');
    if (inp) inp.value = '';
    const idle = document.getElementById('student-drop-idle');
    const preview = document.getElementById('student-files-preview');
    const wrap = document.getElementById('student-upload-bar-wrap');
    if (idle) idle.style.display = 'block';
    if (preview) { preview.style.display = 'none'; preview.innerHTML = ''; }
    if (wrap) wrap.style.display = 'none';
  },

  renderProfessorSubmissions(assignment) {
    setTimeout(async () => {
      try {
        const data = await API.getSubmissions(assignment.id);
        const container = document.getElementById('professor-submissions-container');
        if (!container) return;

        // Store submissions in memory to avoid inline HTML quotes/newline syntax errors
        AssignmentView._submissionsMap = {};
        AssignmentView._currentMaxScore = assignment.max_score || 100;
        (data.students || []).forEach(s => {
          if (s.submission_id) {
            AssignmentView._submissionsMap[s.submission_id] = s;
          }
        });

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
                        ${(() => {
                          const files = AssignmentView.parseAttachmentFiles(s.file_url, s.file_name, s.file_size_bytes);
                          if (files.length === 0) {
                            return s.submission_text ? `<span title="${s.submission_text.replace(/"/g, '&quot;')}" style="cursor: help; color: var(--primary); font-weight: 600;">📝 Qoraal kaliya</span>` : '<span style="color: var(--text-muted);">None</span>';
                          }
                          if (files.length === 1) {
                            const f = files[0];
                            const isImg = /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(f.name);
                            return `
                              <div style="display: flex; align-items: center; gap: 0.4rem;">
                                ${isImg ? `<a href="${f.url}" target="_blank"><img src="${f.url}" style="width: 28px; height: 28px; border-radius: 4px; object-fit: cover; border: 1px solid var(--border-color);"></a>` : ''}
                                <a href="${f.url}" target="_blank" download="${f.name}" class="btn btn-outline btn-sm" style="font-size: 0.72rem; padding: 2px 7px;" title="${f.name}">
                                  📥 ${f.name.length > 16 ? f.name.substring(0, 14) + '...' : f.name}
                                </a>
                              </div>
                            `;
                          }
                          return `
                            <div style="display: flex; flex-direction: column; gap: 0.3rem;">
                              <span style="font-size: 0.74rem; font-weight: 700; color: var(--primary);">📁 ${files.length} faylal / sawirro:</span>
                              <div style="display: flex; flex-wrap: wrap; gap: 0.25rem;">
                                ${files.map((f, i) => {
                                  const isImg = /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(f.name);
                                  return `
                                    <a href="${f.url}" target="_blank" download="${f.name}" class="btn btn-outline btn-sm" style="font-size: 0.68rem; padding: 2px 5px;" title="${f.name}">
                                      ${isImg ? '🖼️' : '📄'} #${i+1}
                                    </a>
                                  `;
                                }).join('')}
                              </div>
                            </div>
                          `;
                        })()}
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
                          <button class="btn btn-primary btn-sm" onclick="AssignmentView.openGradingModalById(${s.submission_id})">
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

    const submitBtn = document.getElementById('student-submit-btn');
    const wrap = document.getElementById('student-upload-bar-wrap');
    const bar  = document.getElementById('student-upload-bar');
    const lbl  = document.getElementById('student-upload-bar-label');

    if (wrap && bar) {
      wrap.style.display = 'block';
      bar.style.background = 'var(--primary)';
      lbl.textContent = 'Faylasha iyo sawirrada ayaa la soo dirayaa...';
      let pct = 0;
      const fakeProg = setInterval(() => {
        pct = Math.min(pct + Math.random() * 14, 85);
        bar.style.width = pct + '%';
      }, 250);

      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '⏳ Soo dirayaa...'; }

      try {
        await API.submitAssignment(assignmentId, formData);
        clearInterval(fakeProg);
        bar.style.width = '100%';
        bar.style.background = '#22c55e';
        lbl.textContent = '✅ Si guul leh ayaa loo gudbiyay!';
        App.showToast('Assignment submitted successfully! 🎉');
        setTimeout(() => { App.refreshCurrentView(); }, 600);
      } catch (err) {
        clearInterval(fakeProg);
        bar.style.background = '#ef4444';
        lbl.textContent = '❌ ' + (err.message || 'Khalad ayaa dhacay');
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Confirm & Submit Assignment'; }
        App.showToast(err.message, 'error');
      }
    } else {
      try {
        await API.submitAssignment(assignmentId, formData);
        App.showToast('Assignment submitted successfully! 🎉');
        App.refreshCurrentView();
      } catch (err) {
        App.showToast(err.message, 'error');
      }
    }
  },

  openGradingModalById(submissionId) {
    const s = this._submissionsMap ? this._submissionsMap[submissionId] : null;
    if (!s) {
      App.showToast('Xogta submission-ka lama helin', 'error');
      return;
    }
    this.openGradingModal(
      s.submission_id,
      s.full_name || 'Student',
      s.grade !== null && s.grade !== undefined ? s.grade : '',
      s.feedback || '',
      this._currentMaxScore || 100,
      s.submission_text || '',
      s.file_url || '',
      s.file_name || ''
    );
  },

  openGradingModal(submissionId, studentName, currentGrade, currentFeedback, maxScore, submissionText, fileUrl, fileName) {
    const submittedFiles = fileUrl ? this.parseAttachmentFiles(fileUrl, fileName) : [];
    const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    App.showCustomModal(`
      <div class="modal-dialog" style="max-width: 650px;">
        <div class="modal-header">
          <h3 style="font-size: 1.15rem;">Grade Submission: ${esc(studentName)}</h3>
          <button class="drawer-toggle-btn" onclick="App.closeModal()">✕</button>
        </div>
        <form onsubmit="AssignmentView.submitGrade(event, ${submissionId})">
          <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
            
            <!-- Student's Attached Work & Images Preview inside Grading Modal -->
            ${(submissionText || submittedFiles.length > 0) ? `
              <div style="background: var(--bg-surface-alt); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1.25rem;">
                <div style="font-size: 0.8rem; font-weight: 700; color: var(--primary); margin-bottom: 0.5rem;">
                  👀 Shaqada Ardaygu Soo Gudbiyay (Submitted Work):
                </div>
                ${submissionText ? `
                  <div style="font-size: 0.85rem; background: var(--bg-surface); padding: 0.65rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color); margin-bottom: 0.75rem; white-space: pre-wrap;">
                    ${submissionText}
                  </div>
                ` : ''}
                ${submittedFiles.length > 0 ? this.renderFilesGallery(submittedFiles, 'Sawirrada & Faylasha') : ''}
              </div>
            ` : ''}

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
              <textarea name="feedback" rows="3" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-family: inherit; font-size: 0.88rem;" placeholder="Explain what was done well and areas for improvement...">${esc(currentFeedback)}</textarea>
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
