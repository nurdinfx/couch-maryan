// ====================================================================
// VIEW: CALENDAR & DEADLINES
// ====================================================================

const CalendarView = {
  async render() {
    const data = await API.getCalendarEvents();
    const events = data.events || [];
    const user = API.currentUser || JSON.parse(localStorage.getItem('faculty_lms_user') || '{}');
    const isStaff = user && (user.role === 'admin' || user.role === 'professor');
    const t = (k, fb) => (typeof I18N !== 'undefined' ? I18N.t(k, fb) : fb);

    return `
      <!-- Breadcrumbs -->
      <div class="breadcrumb-trail">
        <a href="#/dashboard">${t('nav.dashboard', 'Dashboard')}</a>
        <span class="breadcrumb-sep">/</span>
        <span>${t('nav.calendar', 'Academic Calendar')}</span>
      </div>

      <div class="page-header-container">
        <div>
          <h1 class="page-title">${t('calendar.page_title', 'Course Deadlines & Academic Events')}</h1>
          <p class="page-description">${t('calendar.page_desc', 'Upcoming assignments, examinations, and live seminar sessions')}</p>
        </div>
      </div>

      <!-- Events Timeline -->
      <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 2rem; box-shadow: var(--shadow-sm);">
        <h2 style="font-size: 1.25rem; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem;">
          <span>📅</span> ${t('calendar.timeline_title', 'Scheduled Activities Timeline')}
        </h2>

        <div style="display: flex; flex-direction: column; gap: 1rem;">
          ${events.map(ev => {
            const date = new Date(ev.event_date);
            const isQuiz = ev.event_type === 'quiz';
            const isAssignment = ev.event_type === 'assignment';
            const badgeClass = isQuiz ? 'badge-danger' : isAssignment ? 'badge-warning' : 'badge-primary';

            return `
              <div style="display: flex; gap: 1.25rem; align-items: center; padding: 1.25rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); background: var(--bg-surface-alt); transition: var(--transition); flex-wrap: wrap;">
                <div style="width: 70px; height: 70px; border-radius: var(--radius-md); background: var(--bg-surface); border: 1px solid var(--border-color); display: flex; flex-direction: column; align-items: center; justify-content: center; flex-shrink: 0;">
                  <span style="font-size: 0.72rem; font-weight: 800; color: var(--primary); text-transform: uppercase;">${date.toLocaleString('en-US', { month: 'short' })}</span>
                  <span style="font-size: 1.6rem; font-weight: 800; line-height: 1; font-family: var(--font-display);">${date.getDate()}</span>
                </div>

                <div style="flex: 1; min-width: 220px;">
                  <div style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.25rem;">
                    <span class="badge ${badgeClass}">${ev.event_type.toUpperCase()}</span>
                    <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600;">${ev.course_code}: ${ev.course_title}</span>
                  </div>
                  <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 0.2rem;">${ev.title}</h3>
                  <div style="font-size: 0.8rem; color: var(--text-muted);">
                    ⏰ ${t('calendar.deadline_prefix', 'Deadline:')} ${date.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
                  <a href="#/course/${ev.course_id}${isAssignment ? '/assignment/' + ev.id : isQuiz ? '/quiz/' + ev.id : ''}" class="btn btn-outline btn-sm">
                    ${t('calendar.view_activity', 'View Activity →')}
                  </a>
                  ${isStaff ? `
                    <button class="btn btn-outline btn-sm"
                            style="color: var(--danger); border-color: rgba(239, 68, 68, 0.4); display: inline-flex; align-items: center; gap: 0.25rem;"
                            title="${isQuiz ? 'Delete quiz' : 'Delete assignment'}"
                            onclick="${isQuiz ? `App.deleteQuiz(${ev.id}, '${(ev.title || '').replace(/'/g, "\\'")}')` : `App.deleteAssignment(${ev.id}, '${(ev.title || '').replace(/'/g, "\\'")}')`}">
                      🗑 <span>${t('calendar.delete_btn', 'Delete')}</span>
                    </button>
                  ` : ''}
                </div>
              </div>
            `;
          }).join('')}

          ${events.length === 0 ? `
            <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
              ${t('calendar.no_events', 'No deadlines or events scheduled for your enrolled courses.')}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }
};
