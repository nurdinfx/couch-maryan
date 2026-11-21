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
    const isSo = (typeof I18N !== 'undefined') ? I18N.getLang() === 'so' : false;

    const now = new Date();
    const startDate = assignment.start_date ? new Date(assignment.start_date) : null;
    const dueDate = new Date(assignment.due_date);
    const isFuture = startDate && (startDate > now);
    const isClosed = now > dueDate;
    const isActive = !isFuture && !isClosed;

    let durationStr = '';
    if (startDate && dueDate && !isNaN(startDate.getTime()) && !isNaN(dueDate.getTime())) {
      const diffMs = dueDate.getTime() - startDate.getTime();
      if (diffMs > 0) {
        const diffHours = Math.round(diffMs / (1000 * 60 * 60));
        const diffDays = (diffMs / (1000 * 60 * 60 * 24)).toFixed(1).replace('.0', '');
        durationStr = diffHours < 48 ? `${diffHours} ${isSo ? 'Saacadood' : 'Hours'}` : `${diffDays} ${isSo ? 'Maalmood' : 'Days'}`;
      }
    }

    const statusBadge = isFuture
      ? `<span class="badge" style="background:#fef3c7;color:#b45309;font-weight:700;border:1px solid #fde68a;">⏳ ${isSo ? 'Weli Ma Furmin' : 'Opens Soon'}</span>`
      : (isClosed
        ? `<span class="badge badge-danger">🔒 ${isSo ? 'Xidhan (Dhacday)' : 'Closed / Past Due'}</span>`
        : `<span class="badge badge-success">🟢 ${isSo ? 'Shaqadu Way Furan Tahay' : 'Active / Open Now'}</span>`);

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
            <div style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.35rem; flex-wrap: wrap;">
              <span class="badge badge-warning">⚡ ${isSo ? 'SHAQO / ASSIGNMENT' : 'ASSIGNMENT'}</span>
              ${statusBadge}
              <span style="font-size: 0.8rem; color: var(--text-muted);">${assignment.course_code}: ${assignment.course_title}</span>
            </div>
            <h1 style="font-size: 1.6rem; margin-bottom: 0.75rem;">${assignment.title}</h1>
            
            <div style="display: flex; gap: 1.25rem; font-size: 0.84rem; color: var(--text-muted); flex-wrap: wrap; align-items: center;">
              ${startDate ? `<span>🗓️ <strong>${isSo ? 'Bilaabashada:' : 'Starts:'}</strong> ${startDate.toLocaleString()}</span>` : ''}
              <span>⏰ <strong>${isSo ? 'Xilliga Gudbinta:' : 'Due Date:'}</strong> ${dueDate.toLocaleString()}</span>
              ${durationStr ? `<span>⏱️ <strong>${isSo ? 'Muddada:' : 'Duration:'}</strong> ${durationStr}</span>` : ''}
              <span>🎯 <strong>${isSo ? 'Dhibcaha:' : 'Max Score:'}</strong> ${assignment.max_score} pts</span>
              <span>⚖️ <strong>${isSo ? 'Miisaanka:' : 'Weight:'}</strong> ${assignment.weight_percentage}%</span>
              <span>⏳ <strong>${isSo ? 'Daahista:' : 'Late Submissions:'}</strong> ${assignment.allow_late ? (isSo ? 'Waa la ogol yahay' : 'Allowed') : (isSo ? 'Lama ogola' : 'Not Allowed')}</span>
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
                        title="${isSo ? 'Wax ka beddel shaqadan' : 'Edit assignment'}"
                        onclick="App.openEditAssignmentModal(${assignment.id})">
                  ✏️ <span>${isSo ? 'Wax ka beddel' : 'Edit'}</span>
                </button>
                <button class="btn btn-outline btn-sm" style="color: var(--danger); border-color: var(--danger-border); display: flex; align-items: center; gap: 0.25rem;"
                        title="${isSo ? 'Tirtir shaqadan' : 'Delete assignment'}"
                        onclick="App.deleteAssignment(${assignment.id}).then(() => { App.navigate('/course/${assignment.course_id}'); })">
                  🗑 <span>${isSo ? 'Tirtir' : 'Delete'}</span>
                </button>
              </div>
            </div>
          ` : ''}
        </div>

        <!-- Instructions -->
        <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--border-color); line-height: 1.6;">
          <h3 style="font-size: 1.05rem; margin-bottom: 0.5rem;">${isSo ? 'Tilmaamaha & Shuruudaha' : 'Instructions & Requirements'}</h3>
          <div style="white-space: pre-wrap; font-size: 0.92rem; color: var(--text-main);">${assignment.instructions}</div>

          ${assignment.attachment_url ? this.renderFilesGallery(this.parseAttachmentFiles(assignment.attachment_url, assignment.attachment_name), isSo ? 'Hagaha Shaqada / Faylasha Ku Lifaaqan' : 'Assignment Guide / Attached Files') : ''}
        </div>
      </div>

      <!-- Role-Based Section: Student Submission vs Professor Review Grid -->
      ${isProfessor 
        ? this.renderProfessorSubmissions(assignment) 
        : (isFuture 
            ? `
              <div style="background:var(--bg-surface);border:2px dashed #f59e0b;border-radius:var(--radius-lg);padding:2.5rem 1.5rem;text-align:center;box-shadow:var(--shadow-sm);margin-top:1rem;">
                <div style="font-size:3rem;margin-bottom:0.75rem;">⏳</div>
                <h3 style="font-size:1.3rem;margin-bottom:0.5rem;color:var(--text-main);">
                  ${isSo ? 'Shaqadani Weli Ma Furmin' : 'Assignment Not Open Yet'}
                </h3>
                <p style="font-size:0.92rem;color:var(--text-muted);max-width:520px;margin:0 auto 1.25rem;">
                  ${isSo 
                    ? `Shaqadan waxaa loo qorsheeyay inay furanto <strong>${startDate.toLocaleString()}</strong>. Xilligaas markuu gaadho ayaad awoodi doontaa inaad shaqadaada soo gudbiso.`
                    : `This assignment is scheduled to open on <strong>${startDate.toLocaleString()}</strong>. You will be able to submit your work once it becomes active.`}
                </p>
                <div style="display:inline-flex;gap:1.5rem;background:var(--bg-surface-alt);padding:0.65rem 1.25rem;border-radius:99px;font-size:0.85rem;border:1px solid var(--border-color);flex-wrap:wrap;justify-content:center;">
                  <span>🗓️ <strong>${isSo ? 'Bilaabashada:' : 'Starts:'}</strong> ${startDate.toLocaleString()}</span>
                  <span>⏰ <strong>${isSo ? 'Xilliga Dhicitaanka:' : 'Deadline:'}</strong> ${dueDate.toLocaleString()}</span>
                  ${durationStr ? `<span>⏱️ <strong>${isSo ? 'Muddada:' : 'Duration:'}</strong> ${durationStr}</span>` : ''}
                </div>
              </div>
            `
            : this.renderStudentSubmissionStatus(assignment, mySub)
          )}
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
  renderFilesGallery(files, label = '') {
    if (!files || files.length === 0) return '';
    const isSo = (typeof I18N !== 'undefined') ? I18N.getLang() === 'so' : false;
    const resolvedLabel = label || (isSo ? 'Faylasha Ku Lifaaqan' : 'Attached Files');
    return `
      <div style="margin-top: 1.25rem;">
        <div style="font-size: 0.82rem; font-weight: 700; color: var(--text-muted); margin-bottom: 0.6rem; display: flex; align-items: center; gap: 0.4rem;">
          <span>📎</span> <span>${resolvedLabel}</span>
          <span class="badge" style="background: var(--bg-surface-alt); font-size: 0.72rem;">${files.length}</span>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 0.75rem;">
          ${files.map(f => {
            const isSo2 = (typeof I18N !== 'undefined') ? I18N.getLang() === 'so' : false;
            const fname = (f.name || f.url.split('/').pop() || 'file').toLowerCase();
            const isImg   = /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(fname) || (f.type && f.type.startsWith('image/'));
            const isVideo = /\.(mp4|mov|mkv|webm|avi|m4v|3gp|ogv|wmv)$/i.test(fname) || (f.type && f.type.startsWith('video/'));
            const isPdf   = fname.endsWith('.pdf');
            const sizeStr = f.size ? (f.size > 1024 * 1024 ? (f.size / 1024 / 1024).toFixed(1) + ' MB' : Math.round(f.size / 1024) + ' KB') : '';
            const openLabel = isSo2 ? '🔍 Fur' : '🔍 Open';
            const openLinkLabel = isSo2 ? 'Fur ↗' : 'Open ↗';
            const downloadTitle = isSo2 ? 'Degso' : 'Download';

            if (isImg) {
              return `
                <div style="border: 1px solid var(--border-color); border-radius: var(--radius-md); overflow: hidden; background: var(--bg-surface); display: flex; flex-direction: column; box-shadow: var(--shadow-sm);">
                  <a href="${f.url}" target="_blank" rel="noopener noreferrer" style="display: block; height: 130px; background: #0f172a; overflow: hidden; position: relative;" title="${openLabel}">
                    <img src="${f.url}" alt="${f.name}" style="width: 100%; height: 100%; object-fit: cover; transition: transform .2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                    <span style="position: absolute; bottom: 4px; right: 4px; background: rgba(0,0,0,0.7); color: #fff; font-size: 0.68rem; padding: 2px 6px; border-radius: 4px;">${openLabel}</span>
                  </a>
                  <div style="padding: 0.5rem; display: flex; justify-content: space-between; align-items: center; gap: 0.25rem;">
                    <div style="font-size: 0.76rem; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${f.name}">${f.name}</div>
                    <a href="${f.url}" download="${f.name}" class="btn btn-outline btn-sm" style="padding: 2px 7px; font-size: 0.72rem; flex-shrink: 0;" title="${downloadTitle}">📥</a>
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
                    <a href="${f.url}" download="${f.name}" class="btn btn-outline btn-sm" style="padding: 2px 7px; font-size: 0.72rem; flex-shrink: 0;" title="${downloadTitle}">📥</a>
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
                  <a href="${f.url}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm" style="flex: 1; padding: 3px 6px; font-size: 0.72rem; text-align: center;">${openLinkLabel}</a>
                  <a href="${f.url}" download="${f.name}" class="btn btn-primary btn-sm" style="padding: 3px 8px; font-size: 0.72rem;" title="${downloadTitle}">📥</a>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  },

  renderStudentSubmissionStatus(assignment, submission) {
    const isSo = (typeof I18N !== 'undefined') ? I18N.getLang() === 'so' : false;
    const t = (key, fb) => (typeof I18N !== 'undefined') ? I18N.t(key, fb) : fb;
    const isGraded = submission && submission.status === 'graded' && submission.is_grades_released;
    const submittedFiles = submission?.file_url ? this.parseAttachmentFiles(submission.file_url, submission.file_name, submission.file_size_bytes) : [];

    // Reset student file selection buffer for clean state
    this._studentFiles = [];

    return `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 1.5rem;">
        
        <!-- Status Card -->
        <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 1.75rem; box-shadow: var(--shadow-sm);">
          <h3 style="font-size: 1.15rem; margin-bottom: 1rem;">${t('assignments.student_status_title', isSo ? 'Xaaladda Gudbintaada' : 'Submission Status')}</h3>
          
          <table style="width: 100%; font-size: 0.88rem; border-collapse: collapse;">
            <tbody>
              <tr style="border-bottom: 1px solid var(--border-color);">
                <td style="padding: 0.75rem 0; color: var(--text-muted); width: 140px;">${isSo ? 'Xaaladda' : 'Status'}</td>
                <td style="padding: 0.75rem 0;">
                  <span class="badge ${submission?.status === 'graded' ? 'badge-success' : submission?.status === 'submitted' ? 'badge-warning' : 'badge-danger'}">
                    ${submission?.status ? submission.status.toUpperCase() : (isSo ? 'MA SOO GUDBIN' : 'NO SUBMISSION')}
                  </span>
                </td>
              </tr>
              <tr style="border-bottom: 1px solid var(--border-color);">
                <td style="padding: 0.75rem 0; color: var(--text-muted);">${isSo ? 'Waqtiga la Gudbiyay' : 'Submitted At'}</td>
                <td style="padding: 0.75rem 0; font-weight: 600;">
                  ${submission?.submitted_at ? new Date(submission.submitted_at).toLocaleString() : '—'}
                </td>
              </tr>
              <tr style="border-bottom: 1px solid var(--border-color);">
                <td style="padding: 0.75rem 0; color: var(--text-muted);">${isSo ? 'Dhibcaha' : 'Grade'}</td>
                <td style="padding: 0.75rem 0;">
                  ${isGraded ? `
                    <strong style="font-size: 1.1rem; color: var(--success);">${submission.grade} / ${assignment.max_score}</strong>
                    <span style="font-size: 0.8rem; color: var(--text-muted);">(${Math.round((submission.grade / assignment.max_score) * 100)}%)</span>
                  ` : `<span style="color: var(--text-muted);">${isSo ? 'Weli lama saxin' : 'Not graded yet'}</span>`}
                </td>
              </tr>
              ${isGraded && submission.feedback ? `
                <tr style="border-bottom: 1px solid var(--border-color);">
                  <td style="padding: 0.75rem 0; color: var(--text-muted); vertical-align: top;">${isSo ? 'Faallada' : 'Feedback'}</td>
                  <td style="padding: 0.75rem 0; font-size: 0.85rem; line-height: 1.5; color: var(--text-main);">
                    ${submission.feedback}
                  </td>
                </tr>
              ` : ''}
              ${submission?.submission_text ? `
                <tr style="border-bottom: 1px solid var(--border-color);">
                  <td style="padding: 0.75rem 0; color: var(--text-muted); vertical-align: top;">${isSo ? 'Qoraalka' : 'Online Text'}</td>
                  <td style="padding: 0.75rem 0; font-size: 0.85rem; white-space: pre-wrap;">
                    ${submission.submission_text}
                  </td>
                </tr>
              ` : ''}
            </tbody>
          </table>

          ${submittedFiles.length > 0 ? this.renderFilesGallery(submittedFiles, isSo ? 'Faylasha / Sawirrada aad soo gudbisay' : 'Your Submitted Files / Images') : ''}
        </div>

        <!-- Submission Upload Form -->
        <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 1.75rem; box-shadow: var(--shadow-sm);">
          <h3 style="font-size: 1.15rem; margin-bottom: 0.5rem;">${submission ? t('assignments.student_update_title', isSo ? 'Cusbooneysii Shaqadaada' : 'Update Your Submission') : t('assignments.student_submit_title', isSo ? 'Gudbi Shaqada' : 'Submit Assignment')}</h3>
          <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 1.25rem;">
            ${t('assignments.student_submit_desc', isSo ? 'Waxaad soo gelin kartaa ilaa 6 sawir oo shaqadaada ah, warbixin PDF, ama qoraalkaaga online-ka ah.' : 'You can upload up to 6 photos/files of your work, a PDF report, or your online text response.')}
          </p>

          <form id="assignment-submit-form" onsubmit="AssignmentView.handleStudentSubmit(event, ${assignment.id})">
            <div style="margin-bottom: 1.25rem;">
              <label style="display: block; font-size: 0.82rem; font-weight: 700; margin-bottom: 0.4rem;">${t('assignments.online_text_label', isSo ? 'Qoraalka Jawaabtaada (Online Text)' : 'Online Text / Summary Response')}</label>
              <textarea name="submission_text" rows="3" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-family: inherit; font-size: 0.88rem; outline: none; background: var(--bg-surface-alt);" placeholder="${t('assignments.online_text_placeholder', isSo ? 'Qor sharraxaad ama jawaabtaada halkan...' : 'Write your explanation or answer here...')}">${submission?.submission_text || ''}</textarea>
            </div>

            <!-- Up to 6 Items Upload Area -->
            <div style="margin-bottom: 1.25rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.45rem;">
                <label style="display: block; font-size: 0.82rem; font-weight: 700;">
                  ${t('assignments.student_upload_label', isSo ? '📎 Soo geli Sawirro (Ilaa 6 Sawir ama Fayl)' : '📎 Upload Images / Documents (Up to 6 items)')}
                </label>
                <span id="student-slots-counter" class="badge" style="background: rgba(59, 130, 246, 0.12); color: var(--primary); font-size: 0.74rem; font-weight: 700; border: 1px solid rgba(59, 130, 246, 0.25);">
                  0 / 6 ${isSo ? 'la doortay' : 'selected'}
                </span>
              </div>

              <div id="student-dropzone"
                ondragover="event.preventDefault();this.style.borderColor='var(--primary)';this.style.background='#eff6ff';"
                ondragleave="this.style.borderColor='var(--border-color)';this.style.background='';"
                ondrop="AssignmentView.handleStudentDrop(event)"
                style="border: 2px dashed var(--border-color); border-radius: var(--radius-md); padding: 1.25rem 1rem; text-align: center; cursor: pointer; transition: all .2s; background: var(--bg-surface-alt);"
                onclick="AssignmentView.triggerStudentFileInput()">
                
                <input type="file" id="student-submit-files" multiple
                  accept="image/*,video/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.rar"
                  style="display: none;"
                  onchange="AssignmentView.handleStudentFilesSelect(this)">

                <div id="student-drop-idle">
                  <div style="font-size: 2.2rem; margin-bottom: 0.3rem;">📸</div>
                  <div style="font-weight: 700; font-size: 0.92rem; color: var(--primary);">
                    ${t('assignments.student_dropzone_prompt', isSo ? 'Riix halkan si aad u soo xulato ilaa 6 sawir ama fayl' : 'Click here to select up to 6 photos or files')}
                  </div>
                  <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 0.25rem;">
                    ${t('assignments.student_dropzone_hint', isSo ? 'Waxaad dooran kartaa sawirro badan hal mar ama mid mid u soo dari kartaa (Ugu badnaan 6 item)' : 'You can select multiple photos at once or add them one by one (Up to 6 items)')}
                  </div>
                </div>

                <div id="student-files-preview" style="display: none; margin-top: 0.5rem; text-align: left;" onclick="event.stopPropagation()"></div>
              </div>

              <div id="student-upload-bar-wrap" style="display: none; margin-top: 0.6rem;">
                <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.2rem;" id="student-upload-bar-label">${isSo ? 'Soo gelayaa...' : 'Uploading...'}</div>
                <div style="background: #e2e8f0; border-radius: 99px; height: 7px; overflow: hidden;">
                  <div id="student-upload-bar" style="height: 100%; width: 0%; background: var(--primary); border-radius: 99px; transition: width .3s;"></div>
                </div>
              </div>
            </div>

            <button type="submit" id="student-submit-btn" class="btn btn-primary" style="width: 100%; padding: 0.75rem; font-weight: 700;">
              ${submission ? t('assignments.student_update_btn', isSo ? '📤 Gudbi Nuqul Cusub' : '📤 Submit Updated Version') : t('assignments.student_confirm_btn', isSo ? '🚀 Xaqiiji & Gudbi Shaqada' : '🚀 Confirm & Submit Assignment')}
            </button>
          </form>
        </div>

      </div>
    `;
  },

  triggerStudentFileInput() {
    const isSo = (typeof I18N !== 'undefined') ? I18N.getLang() === 'so' : false;
    const currentCount = (this._studentFiles && this._studentFiles.length) || 0;
    if (currentCount >= 6) {
      App.showToast(isSo ? 'Waxaad horay u dooratay ugu badnaan 6 sawir/fayl. Fadlan tirtir mid ka mid ah haddii aad rabto inaad mid cusub ku darto.' : 'You have already selected the maximum of 6 files. Please remove one if you want to add another.', 'warning');
      return;
    }
    const inp = document.getElementById('student-submit-files');
    if (inp) {
      inp.value = '';
      inp.click();
    }
  },

  handleStudentDrop(event) {
    event.preventDefault();
    const dz = document.getElementById('student-dropzone');
    if (dz) { dz.style.borderColor = 'var(--border-color)'; dz.style.background = ''; }
    const files = event.dataTransfer && event.dataTransfer.files;
    if (files && files.length > 0) {
      this.addStudentFiles(Array.from(files));
    }
  },

  handleStudentFilesSelect(input) {
    const incoming = Array.from(input.files || []);
    input.value = ''; // Always reset so the same file or another file can be picked again
    if (incoming.length === 0) return;
    this.addStudentFiles(incoming);
  },

  addStudentFiles(incomingFiles) {
    this._studentFiles = this._studentFiles || [];
    const isSo = (typeof I18N !== 'undefined') ? I18N.getLang() === 'so' : false;
    const maxAllowed = 6;
    const remainingSlots = maxAllowed - this._studentFiles.length;

    if (remainingSlots <= 0) {
      App.showToast(isSo ? 'Waxaad gaadhay xadka ugu sarreeya ee 6 sawir/fayl.' : 'You have reached the maximum limit of 6 items.', 'warning');
      return;
    }

    let toAdd = incomingFiles;
    if (incomingFiles.length > remainingSlots) {
      App.showToast(isSo ? `Waxaa la oggol yahay ilaa 6 item. Waxaa lagu daray ${remainingSlots} kii ugu horreeyay.` : `Up to 6 items allowed. Added the first ${remainingSlots} items.`, 'warning');
      toAdd = incomingFiles.slice(0, remainingSlots);
    }

    this._studentFiles = this._studentFiles.concat(toAdd);
    this.renderStudentFilesPreview();
  },

  removeStudentFile(index) {
    if (!this._studentFiles || !this._studentFiles[index]) return;
    this._studentFiles.splice(index, 1);
    if (this._studentFiles.length === 0) {
      this.clearStudentFiles();
    } else {
      this.renderStudentFilesPreview();
    }
  },

  renderStudentFilesPreview() {
    const files = this._studentFiles || [];
    const isSo = (typeof I18N !== 'undefined') ? I18N.getLang() === 'so' : false;
    const idle = document.getElementById('student-drop-idle');
    const preview = document.getElementById('student-files-preview');
    const counter = document.getElementById('student-slots-counter');
    const wrap = document.getElementById('student-upload-bar-wrap');
    const bar  = document.getElementById('student-upload-bar');
    const lbl  = document.getElementById('student-upload-bar-label');

    if (counter) {
      counter.textContent = `${files.length} / 6 ${isSo ? 'la doortay' : 'selected'}`;
      counter.style.background = files.length === 6 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(59, 130, 246, 0.12)';
      counter.style.color = files.length === 6 ? '#16a34a' : 'var(--primary)';
    }

    if (!preview || !idle) return;

    if (files.length === 0) {
      idle.style.display = 'block';
      preview.style.display = 'none';
      preview.innerHTML = '';
      if (wrap) wrap.style.display = 'none';
      return;
    }

    idle.style.display = 'none';
    preview.style.display = 'block';

    const totalBytes = files.reduce((acc, f) => acc + (f.size || 0), 0);
    const totalMB = (totalBytes / 1024 / 1024).toFixed(1);
    const fileWord = isSo ? (files.length === 1 ? 'sawir/fayl' : 'sawirro/faylal') : (files.length === 1 ? 'item' : 'items');
    const remaining = 6 - files.length;

    preview.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.6rem;padding-bottom:0.4rem;border-bottom:1px solid var(--border-color);flex-wrap:wrap;gap:0.4rem;">
        <span style="font-size:0.82rem;font-weight:700;color:var(--primary);display:flex;align-items:center;gap:0.35rem;">
          <span>📸</span> <span>${files.length} / 6 ${fileWord} ${isSo ? 'la doortay' : 'selected'}</span>
          <span style="font-size:0.74rem;color:var(--text-muted);font-weight:normal;">(${totalMB} MB)</span>
        </span>
        <div style="display:flex;gap:0.35rem;align-items:center;">
          ${remaining > 0 ? `
            <button type="button" class="btn btn-outline btn-xs" onclick="event.stopPropagation(); AssignmentView.triggerStudentFileInput()" style="padding:2px 8px;font-size:0.72rem;color:var(--primary);font-weight:700;border-color:var(--primary);background:rgba(59,130,246,0.06);">
              ➕ ${isSo ? 'Ku dar mid kale' : 'Add Another'} (${remaining} ${isSo ? 'ka harsan' : 'left'})
            </button>
          ` : ''}
          <button type="button" class="btn btn-outline btn-xs" style="padding:2px 8px;font-size:0.72rem;color:#ef4444;" onclick="event.stopPropagation(); AssignmentView.clearStudentFiles()">
            🗑️ ${isSo ? 'Tirtir Dhammaan' : 'Clear All'}
          </button>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(105px, 1fr));gap:0.5rem;max-height:260px;overflow-y:auto;padding:2px;">
        ${files.map((file, idx) => {
          const isImg = file.type.startsWith('image/');
          const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
          const isVideo = file.type.startsWith('video/');
          const objUrl = isImg ? URL.createObjectURL(file) : '';
          const sizeKb = file.size ? Math.round(file.size / 1024) + ' KB' : '';

          return `
            <div style="position:relative;border:1px solid var(--border-color);border-radius:var(--radius-sm);overflow:hidden;background:var(--bg-surface);display:flex;flex-direction:column;box-shadow:var(--shadow-sm);transition:transform .15s;">
              <span style="position:absolute;top:4px;left:4px;background:rgba(15,23,42,0.75);color:#fff;font-size:0.65rem;font-weight:700;padding:1px 5px;border-radius:4px;z-index:2;">
                #${idx + 1}
              </span>
              <button type="button" onclick="event.stopPropagation(); AssignmentView.removeStudentFile(${idx})"
                style="position:absolute;top:4px;right:4px;background:rgba(239,68,68,0.92);color:#fff;border:none;border-radius:4px;width:20px;height:20px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:0.72rem;font-weight:bold;z-index:2;line-height:1;"
                title="${isSo ? 'Tirtir sawirkan #' + (idx + 1) : 'Remove item #' + (idx + 1)}">
                ✕
              </button>

              ${isImg ? `
                <div style="height:75px;background:#0f172a;overflow:hidden;display:flex;align-items:center;justify-content:center;">
                  <img src="${objUrl}" style="width:100%;height:100%;object-fit:cover;">
                </div>
              ` : `
                <div style="height:75px;background:var(--bg-surface-alt);display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:1.6rem;">
                  <span>${isPdf ? '📄' : isVideo ? '🎬' : '📁'}</span>
                </div>
              `}
              <div style="padding:0.3rem;background:var(--bg-surface);">
                <div style="font-size:0.68rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${file.name}">
                  ${file.name}
                </div>
                <div style="font-size:0.62rem;color:var(--text-muted);margin-top:1px;">
                  ${sizeKb}
                </div>
              </div>
            </div>
          `;
        }).join('')}

        ${remaining > 0 ? `
          <div onclick="event.stopPropagation(); AssignmentView.triggerStudentFileInput()"
            style="border:2px dashed var(--primary);border-radius:var(--radius-sm);height:115px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;background:rgba(59,130,246,0.04);transition:all .15s;text-align:center;padding:0.4rem;"
            onmouseover="this.style.background='rgba(59,130,246,0.1)'"
            onmouseout="this.style.background='rgba(59,130,246,0.04)'"
            title="${isSo ? 'Guji si aad ugu darto sawir/fayl kale' : 'Click to add another photo/file'}">
            <div style="font-size:1.5rem;color:var(--primary);margin-bottom:0.15rem;line-height:1;">➕</div>
            <div style="font-weight:700;font-size:0.75rem;color:var(--primary);">${isSo ? 'Ku dar #' + (files.length + 1) : 'Add #' + (files.length + 1)}</div>
            <div style="font-size:0.65rem;color:var(--text-muted);margin-top:2px;">${remaining} ${isSo ? 'ka harsan' : 'slots left'}</div>
          </div>
        ` : ''}
      </div>
    `;

    if (wrap && bar && lbl) {
      wrap.style.display = 'block';
      lbl.textContent = `✅ ${files.length} / 6 ${fileWord} ${isSo ? 'diyaar u ah gudbinta' : 'ready to submit'} (${totalMB} MB)`;
      bar.style.width = '100%';
      bar.style.background = '#22c55e';
    }
  },

  clearStudentFiles() {
    this._studentFiles = [];
    const inp = document.getElementById('student-submit-files');
    if (inp) inp.value = '';
    const isSo = (typeof I18N !== 'undefined') ? I18N.getLang() === 'so' : false;
    const idle = document.getElementById('student-drop-idle');
    const preview = document.getElementById('student-files-preview');
    const wrap = document.getElementById('student-upload-bar-wrap');
    const counter = document.getElementById('student-slots-counter');

    if (counter) counter.textContent = `0 / 6 ${isSo ? 'la doortay' : 'selected'}`;
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
        const isSo = (typeof I18N !== 'undefined') ? I18N.getLang() === 'so' : false;
        const t = (key, fb) => (typeof I18N !== 'undefined') ? I18N.t(key, fb) : fb;

        // Store submissions in memory to avoid inline HTML quotes/newline syntax errors
        AssignmentView._submissionsMap = {};
        AssignmentView._studentsMap = {};
        AssignmentView._currentMaxScore = assignment.max_score || 100;
        AssignmentView._currentAssignmentId = assignment.id;
        (data.students || []).forEach(s => {
          AssignmentView._studentsMap[s.student_id] = s;
          if (s.submission_id) {
            AssignmentView._submissionsMap[s.submission_id] = s;
          }
        });

        container.innerHTML = `
          <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 1.75rem; box-shadow: var(--shadow-sm);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
              <div>
                <h3 style="font-size: 1.2rem;">${t('assignments.console_title', isSo ? 'Miiska Saxidda Shaqooyinka Ardayda' : 'Student Submissions & Grading Console')}</h3>
                <p style="font-size: 0.84rem; color: var(--text-muted);">${t('assignments.console_sub', isSo ? 'Dib u eeg shaqooyinka la soo gudbiyay, bixi dhibco iyo faallo faahfaahsan' : 'Review submitted files, assign marks, and provide detailed pedagogical feedback')}</p>
              </div>
            </div>

            <div class="gradebook-table-container">
              <table class="gradebook-table">
                <thead>
                  <tr>
                    <th>${t('assignments.col_student', isSo ? 'Magaca Ardayga' : 'Student Name')}</th>
                    <th>${t('assignments.col_status', isSo ? 'Xaaladda' : 'Status')}</th>
                    <th>${t('assignments.col_submitted_time', isSo ? 'Waqtiga la Gudbiyay' : 'Submitted Time')}</th>
                    <th>${t('assignments.col_attached_work', isSo ? 'Shaqada Ku Lifaaqan' : 'Attached Work')}</th>
                    <th>${t('assignments.col_grade', isSo ? 'Dhibcaha / Max' : 'Grade / Max')}</th>
                    <th>${t('assignments.col_feedback', isSo ? 'Faallada' : 'Feedback')}</th>
                    <th>${t('assignments.col_action', isSo ? 'Ficilka' : 'Action')}</th>
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
                          ${s.submission_status ? (isSo ? (s.submission_status === 'graded' ? 'LA SAXAY' : s.submission_status === 'submitted' ? 'LA GUDBIYAY' : 'MA SOO GUDBIN') : s.submission_status.toUpperCase()) : (isSo ? 'MA SOO GUDBIN' : 'NOT SUBMITTED')}
                        </span>
                      </td>
                      <td style="font-size: 0.8rem;">
                        ${s.submitted_at ? new Date(s.submitted_at).toLocaleString() : '—'}
                      </td>
                      <td>
                        ${(() => {
                          const files = AssignmentView.parseAttachmentFiles(s.file_url, s.file_name, s.file_size_bytes);
                          if (files.length === 0) {
                            return s.submission_text ? `<span title="${s.submission_text.replace(/"/g, '&quot;')}" style="cursor: help; color: var(--primary); font-weight: 600;">${isSo ? '📝 Qoraal kaliya' : '📝 Text Only'}</span>` : `<span style="color: var(--text-muted);">${isSo ? 'Ma jiro' : 'None'}</span>`;
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
                              <span style="font-size: 0.74rem; font-weight: 700; color: var(--primary);">📁 ${files.length} ${isSo ? 'faylal / sawirro:' : 'files / images:'}</span>
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
                            ${s.submission_status === 'graded' ? t('assignments.regrade_btn', isSo ? 'Dib u Sax' : 'Regrade') : t('assignments.grade_submission_btn', isSo ? 'Sax Shaqada' : 'Grade Submission')}
                          </button>
                        ` : `
                          <button class="btn btn-outline btn-sm"
                                  style="color: #dc2626; border-color: rgba(220, 38, 38, 0.45); background: rgba(220, 38, 38, 0.06); font-weight: 700; display: inline-flex; align-items: center; gap: 0.25rem;"
                                  title="${isSo ? 'Ardaygani ma soo gudbin - dhagsii si aad u siiso dhibco' : 'Student did not submit - click to grade with 0'}"
                                  onclick="AssignmentView.openUnsubmittedGradeModal(${s.student_id})">
                            <span>${t('assignments.grade_zero_btn', isSo ? 'Sii Grade (0)' : 'Grade (0)')}</span>
                          </button>
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
    const isSo = (typeof I18N !== 'undefined') ? I18N.getLang() === 'so' : false;
    const form = e.target;
    const formData = new FormData(form);

    // Delete any empty or single auto-populated file input
    formData.delete('submission_file');
    formData.delete('submission_file[]');

    const files = (this._studentFiles && this._studentFiles.length > 0) ? this._studentFiles.slice(0, 6) : [];
    const textVal = (form.querySelector('[name="submission_text"]')?.value || '').trim();

    if (files.length === 0 && !textVal) {
      App.showToast(isSo ? 'Fadlan soo geli ugu yaraan hal sawir/fayl ama qor qoraalkaaga jawaabta.' : 'Please upload at least one photo/file or enter your text response.', 'error');
      return;
    }

    // Append up to 6 selected files into formData
    files.forEach(f => {
      formData.append('submission_file', f, f.name);
    });

    const submitBtn = document.getElementById('student-submit-btn');
    const wrap = document.getElementById('student-upload-bar-wrap');
    const bar  = document.getElementById('student-upload-bar');
    const lbl  = document.getElementById('student-upload-bar-label');

    if (wrap && bar) {
      wrap.style.display = 'block';
      bar.style.background = 'var(--primary)';
      lbl.textContent = isSo ? `Faylasha (${files.length} item) ayaa la soo dirayaa...` : `Uploading ${files.length} items...`;
      let pct = 0;
      const fakeProg = setInterval(() => {
        pct = Math.min(pct + Math.random() * 14, 85);
        bar.style.width = pct + '%';
      }, 250);

      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = isSo ? '⏳ Soo dirayaa...' : '⏳ Submitting...'; }

      try {
        await API.submitAssignment(assignmentId, formData);
        clearInterval(fakeProg);
        bar.style.width = '100%';
        bar.style.background = '#22c55e';
        lbl.textContent = isSo ? '✅ Si guul leh ayaa loo gudbiyay!' : '✅ Submitted successfully!';
        App.showToast(isSo ? 'Shaqada si guul leh ayaa loo gudbiyay! 🎉' : 'Assignment submitted successfully! 🎉');
        setTimeout(() => { App.refreshCurrentView(); }, 600);
      } catch (err) {
        clearInterval(fakeProg);
        bar.style.background = '#ef4444';
        lbl.textContent = '❌ ' + (err.message || (isSo ? 'Khalad ayaa dhacay' : 'Error occurred'));
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = isSo ? '📤 Gudbi Shaqada' : 'Confirm & Submit Assignment'; }
        App.showToast(err.message, 'error');
      }
    } else {
      try {
        await API.submitAssignment(assignmentId, formData);
        App.showToast(isSo ? 'Shaqada si guul leh ayaa loo gudbiyay! 🎉' : 'Assignment submitted successfully! 🎉');
        App.refreshCurrentView();
      } catch (err) {
        App.showToast(err.message, 'error');
      }
    }
  },

  openUnsubmittedGradeModal(studentId) {
    const s = this._studentsMap ? this._studentsMap[studentId] : null;
    if (!s) {
      App.showToast('Xogta ardayga lama helin', 'error');
      return;
    }
    const isSo = (typeof I18N !== 'undefined') ? I18N.getLang() === 'so' : false;
    const t = (key, fb) => (typeof I18N !== 'undefined') ? I18N.t(key, fb) : fb;
    const maxScore = this._currentMaxScore || 100;
    const assignmentId = this._currentAssignmentId;
    const esc = (val) => String(val || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    App.showCustomModal(`
      <div class="modal-dialog" style="max-width: 580px;">
        <div class="modal-header">
          <h3 style="font-size: 1.15rem;">${isSo ? `📝 Sii Grade: ${esc(s.full_name)}` : `📝 Grade Student: ${esc(s.full_name)}`}</h3>
          <button class="drawer-toggle-btn" onclick="App.closeModal()">✕</button>
        </div>
        <form onsubmit="AssignmentView.submitManualGrade(event, ${assignmentId}, ${studentId})">
          <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
            
            <div style="background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.25); border-radius: var(--radius-md); padding: 0.85rem 1rem; margin-bottom: 1.25rem;">
              <div style="font-weight: 700; color: #dc2626; font-size: 0.85rem; margin-bottom: 0.25rem;">
                ${t('assignments.modal_unsubmitted_notice_title', isSo ? '⚠️ Ma jiro shaqo online ah oo la soo gudbiyay (NOT SUBMITTED)' : '⚠️ No online submission received (NOT SUBMITTED)')}
              </div>
              <div style="font-size: 0.78rem; color: var(--text-muted);">
                ${t('assignments.modal_unsubmitted_notice_desc', isSo ? 'Waxaad ardaygan siin kartaa <strong>0</strong> sababtoo ah ma soo gudbin shaqada, ama dhibco kale haddii uu fasalka ku dhiibay.' : 'You can assign <strong>0</strong> for missing the assignment, or award a grade if submitted in class.')}
              </div>
            </div>

            <div style="margin-bottom: 1.25rem;">
              <label style="display: block; font-size: 0.82rem; font-weight: 700; margin-bottom: 0.4rem;">
                ${t('assignments.modal_score_label', isSo ? `Dhibcaha (Grade Score) - Ugu badnaan: ${maxScore} pts` : `Grade Score (Out of ${maxScore} points)`).replace('{max}', maxScore)}
              </label>
              <input type="number" step="0.5" min="0" max="${maxScore}" name="grade" value="0" required
                     style="width: 100%; padding: 0.65rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 1.15rem; font-weight: 800; color: #dc2626;">
            </div>

            <div style="margin-bottom: 1.25rem;">
              <label style="display: block; font-size: 0.82rem; font-weight: 700; margin-bottom: 0.4rem;">
                ${t('assignments.modal_feedback_label', isSo ? 'Faallo / Feedback' : 'Pedagogical Feedback & Comments')}
              </label>
              <textarea name="feedback" rows="3" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-family: inherit; font-size: 0.88rem;" placeholder="${isSo ? 'Sababta dhibcahan loo siiyay...' : 'Reason for this grade...'}">${t('assignments.modal_feedback_unsubmitted_default', isSo ? 'Ma soo gudbin shaqada (No submission submitted)' : 'No submission submitted')}</textarea>
            </div>

            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <input type="checkbox" name="is_grades_released" id="release_manual_grade_check" checked>
              <label for="release_manual_grade_check" style="font-size: 0.85rem; font-weight: 600;">${t('assignments.modal_release_check', isSo ? 'U sii daa dhibcaha ardayga isla markiiba (Release grade)' : 'Release grade and feedback to student immediately')}</label>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" onclick="App.closeModal()">${isSo ? 'Ka noqo / Cancel' : 'Cancel'}</button>
            <button type="submit" class="btn btn-primary" style="background: #dc2626; border-color: #dc2626;">${t('assignments.modal_save_zero', isSo ? '💾 Kaydi Dhibcaha (0)' : '💾 Save Grade (0)')}</button>
          </div>
        </form>
      </div>
    `);
  },

  async submitManualGrade(e, assignmentId, studentId) {
    e.preventDefault();
    const form = e.target;
    const grade = form.grade.value;
    const feedback = form.feedback.value;
    const isReleased = form.is_grades_released.checked;
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Kaydinayaa...'; }

    try {
      await API.gradeStudent(assignmentId, studentId, {
        grade,
        feedback,
        status: 'graded',
        is_grades_released: isReleased
      });
      App.closeModal();
      App.showToast('Dhibcaha si guul leh ayaa loo kaydiyay! 🎓');
      App.refreshCurrentView();
    } catch (err) {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '💾 Save Grade (0)'; }
      App.showToast(err.message || 'Khalad ayaa dhacay', 'error');
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
    const isSo = (typeof I18N !== 'undefined') ? I18N.getLang() === 'so' : false;
    const t = (key, fb) => (typeof I18N !== 'undefined') ? I18N.t(key, fb) : fb;
    const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    App.showCustomModal(`
      <div class="modal-dialog" style="max-width: 650px;">
        <div class="modal-header">
          <h3 style="font-size: 1.15rem;">${isSo ? `Saxidda Shaqada: ${esc(studentName)}` : `Grade Submission: ${esc(studentName)}`}</h3>
          <button class="drawer-toggle-btn" onclick="App.closeModal()">✕</button>
        </div>
        <form onsubmit="AssignmentView.submitGrade(event, ${submissionId})">
          <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
            
            <!-- Student's Attached Work & Images Preview inside Grading Modal -->
            ${(submissionText || submittedFiles.length > 0) ? `
              <div style="background: var(--bg-surface-alt); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1.25rem;">
                <div style="font-size: 0.8rem; font-weight: 700; color: var(--primary); margin-bottom: 0.5rem;">
                  ${t('assignments.submitted_work_heading', isSo ? '👀 Shaqada Ardaygu Soo Gudbiyay:' : '👀 Student Submitted Work:')}
                </div>
                ${submissionText ? `
                  <div style="font-size: 0.85rem; background: var(--bg-surface); padding: 0.65rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color); margin-bottom: 0.75rem; white-space: pre-wrap;">
                    ${submissionText}
                  </div>
                ` : ''}
                ${submittedFiles.length > 0 ? this.renderFilesGallery(submittedFiles, t('assignments.attached_files_heading', isSo ? 'Sawirrada & Faylasha Ku Lifaaqan' : 'Attached Files & Images')) : ''}
              </div>
            ` : ''}

            <div style="margin-bottom: 1.25rem;">
              <label style="display: block; font-size: 0.82rem; font-weight: 700; margin-bottom: 0.4rem;">
                ${t('assignments.modal_score_label', isSo ? `Dhibcaha (Ugu badnaan: ${maxScore} pts)` : `Grade Score (Out of ${maxScore} points)`).replace('{max}', maxScore)}
              </label>
              <input type="number" step="0.5" min="0" max="${maxScore}" name="grade" value="${currentGrade}" required
                     style="width: 100%; padding: 0.65rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 1rem; font-weight: 700;">
            </div>

            <div style="margin-bottom: 1.25rem;">
              <label style="display: block; font-size: 0.82rem; font-weight: 700; margin-bottom: 0.4rem;">
                ${t('assignments.modal_feedback_label', isSo ? 'Faallada & Talada Macallinka' : 'Pedagogical Feedback & Comments')}
              </label>
              <textarea name="feedback" rows="3" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-family: inherit; font-size: 0.88rem;" placeholder="${t('assignments.modal_feedback_placeholder', isSo ? 'Sharax waxa ardaygu ku fiicnaa iyo meelaha u baahan hagaajin...' : 'Explain what was done well and areas for improvement...')}">${esc(currentFeedback)}</textarea>
            </div>

            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <input type="checkbox" name="is_grades_released" id="release_grade_check" checked>
              <label for="release_grade_check" style="font-size: 0.85rem; font-weight: 600;">${t('assignments.modal_release_check', isSo ? 'U sii daa dhibcaha ardayga isla markiiba' : 'Release grade and feedback to student immediately')}</label>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" onclick="App.closeModal()">${isSo ? 'Ka noqo' : 'Cancel'}</button>
            <button type="submit" class="btn btn-success">${t('assignments.modal_save_grade', isSo ? 'Kaydi & U Sii Daa Dhibcaha' : 'Save & Release Grade')}</button>
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
