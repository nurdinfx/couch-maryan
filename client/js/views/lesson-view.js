// ====================================================================
// VIEW: LESSON VIEW (VIDEO PLAYER, PDF VIEWER, TEXT NOTES)
// ====================================================================

const LessonView = {
  activeVideoSyncInterval: null,

  async render(params) {
    const lessonId = parseInt(params.id);
    const data = await API.getLesson(lessonId);
    const lesson = data.lesson;
    const nav = data.navigation;

    // Clear any existing sync interval
    if (this.activeVideoSyncInterval) {
      clearInterval(this.activeVideoSyncInterval);
      this.activeVideoSyncInterval = null;
    }

    return `
      <!-- Breadcrumbs -->
      <div class="breadcrumb-trail">
        <a href="#/dashboard">Dashboard</a>
        <span class="breadcrumb-sep">/</span>
        <a href="#/course/${lesson.course_id}">${lesson.course_code}</a>
        <span class="breadcrumb-sep">/</span>
        <span>${lesson.module_title}</span>
        <span class="breadcrumb-sep">/</span>
        <span>${lesson.title}</span>
      </div>

      <!-- Lesson Header -->
      <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 1.5rem 2rem; margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
        <div>
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
            <span class="badge ${lesson.content_type === 'video' ? 'badge-danger' : lesson.content_type === 'document' ? 'badge-info' : 'badge-primary'}">
              ${lesson.content_type.toUpperCase()} ACTIVITY
            </span>
            <span style="font-size: 0.8rem; color: var(--text-muted);">${lesson.module_title}</span>
          </div>
          <h1 style="font-size: 1.5rem; margin-bottom: 0.25rem;">${lesson.title}</h1>
          <p style="font-size: 0.85rem; color: var(--text-muted);">${lesson.description || ''}</p>
        </div>

        <div style="display: flex; align-items: center; gap: 1rem;">
          <button id="lesson-complete-toggle-btn"
                  class="btn ${lesson.student_completed ? 'btn-success' : 'btn-outline'}"
                  onclick="LessonView.toggleCompletion(${lesson.id}, ${lesson.student_completed ? 0 : 1})">
            <span>${lesson.student_completed ? '✓ Completed' : '○ Mark as Completed'}</span>
          </button>
        </div>
      </div>

      <!-- Activity Content -->
      <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 1.75rem; margin-bottom: 2rem;">
        ${this.renderActivityBody(lesson)}
      </div>

      <!-- Navigation Footer (Previous / Next Activity) -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 2rem; border-top: 1px solid var(--border-color); padding-top: 1.5rem;">
        <div>
          ${nav.prevLesson ? `
            <a href="#/course/${lesson.course_id}/lesson/${nav.prevLesson.id}" class="btn btn-outline">
              ← Previous: ${nav.prevLesson.title}
            </a>
          ` : '<span style="color: var(--text-muted); font-size: 0.85rem;">First activity in course</span>'}
        </div>
        <div style="font-size: 0.85rem; color: var(--text-muted);">
          Activity ${nav.currentIndex} of ${nav.totalLessons}
        </div>
        <div>
          ${nav.nextLesson ? `
            <a href="#/course/${lesson.course_id}/lesson/${nav.nextLesson.id}" class="btn btn-primary">
              Next: ${nav.nextLesson.title} →
            </a>
          ` : `
            <a href="#/course/${lesson.course_id}" class="btn btn-outline">
              Back to Course Home ✓
            </a>
          `}
        </div>
      </div>
    `;
  },

  renderActivityBody(lesson) {
    if (lesson.content_type === 'video') {
      const videoSrc = lesson.video_url || (lesson.file_url ? lesson.file_url : 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4');
      
      // Setup video event hook after DOM renders
      setTimeout(() => {
        const vid = document.getElementById('lesson-video-element');
        if (vid) {
          this.attachVideoTracker(vid, lesson.id);
        }
      }, 50);

      return `
        <!-- Video Player -->
        <div class="video-player-container">
          <video id="lesson-video-element" controls playsinline preload="metadata">
            <source src="${videoSrc}" type="video/mp4">
            Your browser does not support HTML5 video streaming.
          </video>
        </div>

        <!-- Video Progress & Completion Tracker -->
        <div class="video-progress-tracker">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <span style="font-size: 1.5rem;">⏱</span>
            <div>
              <div style="font-size: 0.88rem; font-weight: 700;">Video Progress Tracking</div>
              <div style="font-size: 0.76rem; color: var(--text-muted);">
                Watched: <strong id="video-progress-text">${lesson.video_watch_percentage || 0}%</strong> of lecture duration
              </div>
            </div>
          </div>
          <div style="width: 200px;">
            <div class="progress-bar-bg">
              <div id="video-progress-bar-fill" class="progress-bar-fill" style="width: ${lesson.video_watch_percentage || 0}%;"></div>
            </div>
          </div>
        </div>

        <!-- Accompanying Notes / Summary -->
        ${lesson.content_body ? `
          <div style="margin-top: 1.5rem; line-height: 1.6; border-top: 1px solid var(--border-color); padding-top: 1.5rem;">
            <h3 style="font-size: 1.15rem; margin-bottom: 0.75rem;">Lecture Notes & Summary</h3>
            <div style="white-space: pre-wrap; font-size: 0.92rem; color: var(--text-main);">${lesson.content_body}</div>
          </div>
        ` : ''}
      `;
    }

    if (lesson.content_type === 'document') {
      const docUrl = lesson.file_url || '/uploads/documents/CS301_Course_Syllabus.pdf';
      return `
        <div style="margin-bottom: 1.25rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
          <div>
            <div style="font-weight: 700; font-size: 1rem;">${lesson.file_name || 'Document Resource'}</div>
            <div style="font-size: 0.78rem; color: var(--text-muted);">
              Format: PDF Document • ${lesson.file_size_bytes ? Math.round(lesson.file_size_bytes / 1024) + ' KB' : 'Official Document'}
            </div>
          </div>
          <a href="${docUrl}" target="_blank" download="${lesson.file_name || 'resource.pdf'}" class="btn btn-outline btn-sm">
            <span>📥</span> Download File
          </a>
        </div>

        <!-- Embedded In-Browser PDF Viewer -->
        <iframe src="${docUrl}#toolbar=1" class="pdf-viewer-frame" title="PDF Document Viewer">
          <p>Your browser does not support embedded PDF preview. <a href="${docUrl}" target="_blank">Click here to download and view the PDF</a>.</p>
        </iframe>

        ${lesson.content_body ? `
          <div style="margin-top: 1.5rem; line-height: 1.6;">
            <h3 style="font-size: 1.15rem; margin-bottom: 0.5rem;">Resource Instructions</h3>
            <div style="white-space: pre-wrap; font-size: 0.92rem; color: var(--text-main);">${lesson.content_body}</div>
          </div>
        ` : ''}
      `;
    }

    // Default: Rich Text Lecture Material
    return `
      <div style="max-width: 850px; margin: 0 auto; line-height: 1.7; font-size: 0.96rem;">
        <div style="white-space: pre-wrap; color: var(--text-main);">${lesson.content_body || 'No text content available for this lesson.'}</div>
      </div>
    `;
  },

  attachVideoTracker(videoEl, lessonId) {
    let lastReportedTime = 0;

    videoEl.addEventListener('timeupdate', () => {
      const current = Math.floor(videoEl.currentTime);
      const duration = Math.floor(videoEl.duration) || 1;

      // Update UI in real-time
      const pct = Math.min(100, Math.round((current / duration) * 100));
      const fillEl = document.getElementById('video-progress-bar-fill');
      const textEl = document.getElementById('video-progress-text');
      if (fillEl) fillEl.style.width = `${pct}%`;
      if (textEl) textEl.textContent = `${pct}%`;

      // Sync to backend every 10 seconds or when >= 80%
      if (current - lastReportedTime >= 10 || (pct >= 80 && lastReportedTime < 80)) {
        lastReportedTime = current;
        API.updateLessonProgress(lessonId, {
          watchedSeconds: current,
          totalSeconds: duration
        }).then(res => {
          if (res.progress && res.progress.is_completed) {
            const btn = document.getElementById('lesson-complete-toggle-btn');
            if (btn) {
              btn.className = 'btn btn-success';
              btn.innerHTML = '<span>✓ Completed</span>';
            }
          }
        }).catch(err => console.error('Video sync failed:', err));
      }
    });
  },

  async toggleCompletion(lessonId, status) {
    try {
      const res = await API.updateLessonProgress(lessonId, {
        markCompleted: status === 1
      });
      App.showToast(status ? 'Activity marked as completed! 🎉' : 'Activity marked as incomplete.');

      const btn = document.getElementById('lesson-complete-toggle-btn');
      if (btn) {
        if (status === 1) {
          btn.className = 'btn btn-success';
          btn.innerHTML = '<span>✓ Completed</span>';
          btn.setAttribute('onclick', `LessonView.toggleCompletion(${lessonId}, 0)`);
        } else {
          btn.className = 'btn btn-outline';
          btn.innerHTML = '<span>○ Mark as Completed</span>';
          btn.setAttribute('onclick', `LessonView.toggleCompletion(${lessonId}, 1)`);
        }
      }
    } catch (e) {
      App.showToast(e.message, 'error');
    }
  }
};
