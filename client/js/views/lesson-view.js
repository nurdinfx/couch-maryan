// ====================================================================
// VIEW: LESSON VIEW (VIDEO PLAYER, PDF VIEWER, TEXT NOTES)
// ====================================================================

const LessonView = {
  activeVideoSyncInterval: null,
  _keyHandler: null,

  async render(params) {
    const lessonId = parseInt(params.id);
    const data = await API.getLesson(lessonId);
    const lesson = data.lesson;
    const nav = data.navigation;

    // Clear any existing sync interval or keyboard listeners
    if (this.activeVideoSyncInterval) {
      clearInterval(this.activeVideoSyncInterval);
      this.activeVideoSyncInterval = null;
    }
    if (this._keyHandler) {
      window.removeEventListener('keydown', this._keyHandler);
      this._keyHandler = null;
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
      <div class="lesson-header-card" style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 1.5rem 2rem; margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
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
      <div class="lesson-nav-footer" style="display: flex; justify-content: space-between; align-items: center; margin-top: 2rem; border-top: 1px solid var(--border-color); padding-top: 1.5rem; flex-wrap: wrap; gap: 1rem;">
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

  getYouTubeEmbed(url) {
    if (!url) return null;
    const regExp = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/;
    const match = String(url).match(regExp);
    if (match && match[1]) {
      return `https://www.youtube.com/embed/${match[1]}?autoplay=0&rel=0&modestbranding=1&playsinline=1&enablejsapi=1`;
    }
    return null;
  },

  getVimeoEmbed(url) {
    if (!url) return null;
    const match = String(url).match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/[^\/]*\/videos\/|album\/\d+\/video\/|video\/|)(\d+)/);
    if (match && match[1]) {
      return `https://player.vimeo.com/video/${match[1]}?title=0&byline=0&portrait=0`;
    }
    return null;
  },

  renderActivityBody(lesson) {
    if (lesson.content_type === 'video') {
      const videoSrc = lesson.video_url || lesson.file_url || '';
      const ytEmbed = this.getYouTubeEmbed(videoSrc);
      const vimeoEmbed = this.getVimeoEmbed(videoSrc);

      // A: YouTube Video
      if (ytEmbed) {
        return `
          <!-- YouTube 16:9 Widescreen Responsive Player -->
          <div class="video-player-container widescreen-16-9" id="video-wrapper">
            <iframe 
              id="lesson-embed-frame"
              src="${ytEmbed}"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
              allowfullscreen
              title="${(lesson.title || 'YouTube Video').replace(/"/g, '&quot;')}">
            </iframe>
          </div>

          <!-- YouTube Feature Toolbar -->
          <div class="video-enhanced-toolbar">
            <div class="toolbar-left">
              <span class="badge badge-danger">▶ YouTube Player</span>
              <button class="btn btn-outline btn-xs" onclick="LessonView.toggleTheaterMode()" title="Balladhi shaashadda (Theater Mode)">
                <span id="theater-icon">🔲</span> Wide Mode
              </button>
              <a href="${videoSrc}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-xs" title="Ka fur YouTube toos">
                <span>↗</span> Open on YouTube
              </a>
            </div>
            <div class="toolbar-right">
              <button class="btn btn-primary btn-xs" onclick="LessonView.markCompletedManually(${lesson.id})" title="Calaamadee in la daawaday">
                <span>✓</span> Mark Watched (100%)
              </button>
            </div>
          </div>

          <!-- Video Progress Indicator -->
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
            <div style="width: 200px; max-width: 45%;">
              <div class="progress-bar-bg">
                <div id="video-progress-bar-fill" class="progress-bar-fill" style="width: ${lesson.video_watch_percentage || 0}%;"></div>
              </div>
            </div>
          </div>

          <!-- Notes -->
          ${lesson.content_body ? `
            <div style="margin-top: 1.5rem; line-height: 1.6; border-top: 1px solid var(--border-color); padding-top: 1.5rem;">
              <h3 style="font-size: 1.15rem; margin-bottom: 0.75rem;">Lecture Notes & Summary</h3>
              <div style="white-space: pre-wrap; font-size: 0.92rem; color: var(--text-main);">${lesson.content_body}</div>
            </div>
          ` : ''}
        `;
      }

      // B: Vimeo Video
      if (vimeoEmbed) {
        return `
          <div class="video-player-container widescreen-16-9" id="video-wrapper">
            <iframe 
              id="lesson-embed-frame"
              src="${vimeoEmbed}"
              allow="autoplay; fullscreen; picture-in-picture"
              allowfullscreen
              title="${(lesson.title || 'Vimeo Video').replace(/"/g, '&quot;')}">
            </iframe>
          </div>

          <div class="video-enhanced-toolbar">
            <div class="toolbar-left">
              <span class="badge badge-info">Vimeo Player</span>
              <button class="btn btn-outline btn-xs" onclick="LessonView.toggleTheaterMode()">
                <span id="theater-icon">🔲</span> Wide Mode
              </button>
            </div>
            <div class="toolbar-right">
              <button class="btn btn-primary btn-xs" onclick="LessonView.markCompletedManually(${lesson.id})">
                <span>✓</span> Mark Watched (100%)
              </button>
            </div>
          </div>

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
            <div style="width: 200px; max-width: 45%;">
              <div class="progress-bar-bg">
                <div id="video-progress-bar-fill" class="progress-bar-fill" style="width: ${lesson.video_watch_percentage || 0}%;"></div>
              </div>
            </div>
          </div>

          ${lesson.content_body ? `
            <div style="margin-top: 1.5rem; line-height: 1.6; border-top: 1px solid var(--border-color); padding-top: 1.5rem;">
              <h3 style="font-size: 1.15rem; margin-bottom: 0.75rem;">Lecture Notes & Summary</h3>
              <div style="white-space: pre-wrap; font-size: 0.92rem; color: var(--text-main);">${lesson.content_body}</div>
            </div>
          ` : ''}
        `;
      }

      // C: HTML5 Video (Uploaded from Device or Direct MP4/WebM/MOV URL)
      let validSrc = videoSrc || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
      if (validSrc.startsWith('/') && !validSrc.startsWith('//')) {
        validSrc = (typeof API !== 'undefined' && API.getBaseUrl ? API.getBaseUrl() : '') + validSrc;
      }
      
      setTimeout(() => {
        const vid = document.getElementById('lesson-video-element');
        if (vid) {
          this.attachVideoTracker(vid, lesson.id);
          this.setupKeyboardShortcuts();
        }
      }, 50);

      return `
        <!-- HTML5 16:9 Widescreen Video Player -->
        <div class="video-player-container widescreen-16-9" id="video-wrapper">
          <video id="lesson-video-element" src="${validSrc}" controls playsinline preload="metadata">
            <source src="${validSrc}" type="video/mp4">
            <source src="${validSrc}" type="video/webm">
            <source src="${validSrc}" type="video/quicktime">
            Your browser does not support HTML5 video streaming.
          </video>
        </div>

        <!-- YouTube-like Enhanced Features Toolbar -->
        <div class="video-enhanced-toolbar">
          <div class="toolbar-left">
            <!-- Playback Speed -->
            <div class="speed-selector-group" title="Xawaaraha Daawashada">
              <span style="font-size: 0.72rem; font-weight: 800; color: var(--text-muted); padding: 0 4px;">SPEED:</span>
              <button class="speed-btn" onclick="LessonView.setPlaybackSpeed(0.75, this)">0.75x</button>
              <button class="speed-btn active" onclick="LessonView.setPlaybackSpeed(1, this)">1x</button>
              <button class="speed-btn" onclick="LessonView.setPlaybackSpeed(1.25, this)">1.25x</button>
              <button class="speed-btn" onclick="LessonView.setPlaybackSpeed(1.5, this)">1.5x</button>
              <button class="speed-btn" onclick="LessonView.setPlaybackSpeed(2, this)">2x</button>
            </div>

            <!-- Skip 10s back & forward -->
            <div style="display: flex; gap: 0.35rem;">
              <button class="btn btn-outline btn-xs" onclick="LessonView.skipVideo(-10)" title="Dib u celi 10 ilbiriqsi (←)">
                ⏪ -10s
              </button>
              <button class="btn btn-outline btn-xs" onclick="LessonView.skipVideo(10)" title="Horay u soco 10 ilbiriqsi (→)">
                ⏩ +10s
              </button>
            </div>
          </div>

          <div class="toolbar-right">
            <!-- Picture-in-picture -->
            <button class="btn btn-outline btn-xs" onclick="LessonView.togglePiP()" title="Sawir-ku-dhex-jira (Picture in Picture)">
              🖼️ PiP
            </button>
            <!-- Wide / Theater Mode -->
            <button class="btn btn-outline btn-xs" onclick="LessonView.toggleTheaterMode()" title="Balladhi shaashadda (Wide Mode)">
              <span id="theater-icon">🔲</span> Wide Mode
            </button>
            <!-- Fullscreen -->
            <button class="btn btn-outline btn-xs" onclick="LessonView.toggleFullscreen()" title="Shaashad dhan (F)">
              ⛶ Fullscreen
            </button>
          </div>
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
          <div style="width: 200px; max-width: 45%;">
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

  toggleTheaterMode() {
    const wrapper = document.getElementById('video-wrapper');
    const icon = document.getElementById('theater-icon');
    if (wrapper) {
      const isTheater = wrapper.classList.toggle('theater-mode');
      if (icon) icon.textContent = isTheater ? '▫️' : '🔲';
    }
  },

  setPlaybackSpeed(speed, btn) {
    const vid = document.getElementById('lesson-video-element');
    if (vid) {
      vid.playbackRate = speed;
      document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
      if (btn) btn.classList.add('active');
      App.showToast(`Xawaaraha: ${speed}x`);
    }
  },

  skipVideo(seconds) {
    const vid = document.getElementById('lesson-video-element');
    if (vid) {
      const targetTime = Math.max(0, Math.min(vid.duration || 999999, vid.currentTime + seconds));
      vid.currentTime = targetTime;
    }
  },

  async togglePiP() {
    const vid = document.getElementById('lesson-video-element');
    if (!vid) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await vid.requestPictureInPicture();
      }
    } catch (e) {
      console.warn('PiP not supported or disallowed:', e);
    }
  },

  toggleFullscreen() {
    const wrapper = document.getElementById('video-wrapper') || document.getElementById('lesson-video-element');
    if (!wrapper) return;
    if (!document.fullscreenElement) {
      if (wrapper.requestFullscreen) {
        wrapper.requestFullscreen().catch(err => console.warn(err));
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(err => console.warn(err));
      }
    }
  },

  setupKeyboardShortcuts() {
    if (this._keyHandler) {
      window.removeEventListener('keydown', this._keyHandler);
    }
    this._keyHandler = (e) => {
      // Don't capture when typing in inputs/textareas
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
      const vid = document.getElementById('lesson-video-element');
      if (!vid) return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (vid.paused) vid.play(); else vid.pause();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        vid.currentTime = Math.max(0, vid.currentTime - 5);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        vid.currentTime = Math.min(vid.duration || 999999, vid.currentTime + 5);
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        vid.volume = Math.min(1, Math.round((vid.volume + 0.1) * 10) / 10);
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        vid.volume = Math.max(0, Math.round((vid.volume - 0.1) * 10) / 10);
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        LessonView.toggleFullscreen();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        vid.muted = !vid.muted;
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        LessonView.toggleTheaterMode();
      }
    };
    window.addEventListener('keydown', this._keyHandler);
  },

  async markCompletedManually(lessonId) {
    try {
      await API.updateLessonProgress(lessonId, {
        watchedSeconds: 100,
        totalSeconds: 100,
        markCompleted: true
      });
      const fillEl = document.getElementById('video-progress-bar-fill');
      const textEl = document.getElementById('video-progress-text');
      if (fillEl) fillEl.style.width = '100%';
      if (textEl) textEl.textContent = '100%';
      const btn = document.getElementById('lesson-complete-toggle-btn');
      if (btn) {
        btn.className = 'btn btn-success';
        btn.innerHTML = '<span>✓ Completed</span>';
      }
      App.showToast('Casharka si guul leh ayaa loo calaamadeeyay in la dhameeyay! 🎉');
    } catch (e) {
      App.showToast(e.message, 'error');
    }
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
