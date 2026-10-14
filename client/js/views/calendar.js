// ====================================================================
// VIEW: CALENDAR & DEADLINES
// ====================================================================

const CalendarView = {
  async render() {
    const data = await API.getCalendarEvents();
    const events = data.events || [];

    return `
      <!-- Breadcrumbs -->
      <div class="breadcrumb-trail">
        <a href="#/dashboard">Dashboard</a>
        <span class="breadcrumb-sep">/</span>
        <span>Academic Calendar</span>
      </div>

      <div class="page-header-container">
        <div>
          <h1 class="page-title">Course Deadlines & Academic Events</h1>
          <p class="page-description">Upcoming assignments, examinations, and live seminar sessions</p>
        </div>
      </div>

      <!-- Events Timeline -->
      <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 2rem; box-shadow: var(--shadow-sm);">
        <h2 style="font-size: 1.25rem; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem;">
          <span>📅</span> Scheduled Activities Timeline
        </h2>

        <div style="display: flex; flex-direction: column; gap: 1rem;">
          ${events.map(ev => {
            const date = new Date(ev.event_date);
            const isQuiz = ev.event_type === 'quiz';
            const isAssignment = ev.event_type === 'assignment';
            const badgeClass = isQuiz ? 'badge-danger' : isAssignment ? 'badge-warning' : 'badge-primary';

            return `
              <div style="display: flex; gap: 1.25rem; align-items: center; padding: 1.25rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); background: var(--bg-surface-alt); transition: var(--transition);">
                <div style="width: 70px; height: 70px; border-radius: var(--radius-md); background: var(--bg-surface); border: 1px solid var(--border-color); display: flex; flex-direction: column; align-items: center; justify-content: center; flex-shrink: 0;">
                  <span style="font-size: 0.72rem; font-weight: 800; color: var(--primary); text-transform: uppercase;">${date.toLocaleString('en-US', { month: 'short' })}</span>
                  <span style="font-size: 1.6rem; font-weight: 800; line-height: 1; font-family: var(--font-display);">${date.getDate()}</span>
                </div>

                <div style="flex: 1;">
                  <div style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.25rem;">
                    <span class="badge ${badgeClass}">${ev.event_type.toUpperCase()}</span>
                    <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600;">${ev.course_code}: ${ev.course_title}</span>
                  </div>
                  <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 0.2rem;">${ev.title}</h3>
                  <div style="font-size: 0.8rem; color: var(--text-muted);">
                    ⏰ Deadline: ${date.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                <div>
                  <a href="#/course/${ev.course_id}${isAssignment ? '/assignment/' + ev.id : isQuiz ? '/quiz/' + ev.id : ''}" class="btn btn-outline btn-sm">
                    View Activity →
                  </a>
                </div>
              </div>
            `;
          }).join('')}

          ${events.length === 0 ? `
            <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
              No deadlines or events scheduled for your enrolled courses.
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }
};
