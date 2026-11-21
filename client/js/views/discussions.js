// ====================================================================
// VIEW: DISCUSSION TOPIC THREAD VIEW
// ====================================================================

const TopicView = {
  async render(params) {
    const topicId = parseInt(params.id);
    const data = await API.getTopic(topicId);
    const topic = data.topic;
    const replies = data.replies || [];

    return `
      <!-- Breadcrumbs -->
      <div class="breadcrumb-trail">
        <a href="#/dashboard">Dashboard</a>
        <span class="breadcrumb-sep">/</span>
        <a href="#/course/${topic.course_id}">${topic.course_code}</a>
        <span class="breadcrumb-sep">/</span>
        <a href="#/course/${topic.course_id}?tab=discussions">Forum</a>
        <span class="breadcrumb-sep">/</span>
        <span>${topic.title}</span>
      </div>

      <!-- Main Topic Post -->
      <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 2rem; margin-bottom: 2rem; box-shadow: var(--shadow-sm);">
        <div style="display: flex; gap: 1rem; align-items: flex-start; margin-bottom: 1.25rem;">
          <img src="${topic.author_avatar}" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover;">
          <div style="flex: 1;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;">
              <div>
                <h1 style="font-size: 1.4rem; margin-bottom: 0.25rem;">${topic.title}</h1>
                <div style="font-size: 0.8rem; color: var(--text-muted);">
                  Started by <strong>${topic.author_name}</strong> (${topic.author_role.toUpperCase()}) • ${new Date(topic.created_at).toLocaleString()}
                </div>
              </div>
              ${topic.is_pinned ? '<span class="badge badge-warning">📌 Pinned</span>' : ''}
            </div>
          </div>
        </div>

        <div style="font-size: 0.95rem; line-height: 1.7; color: var(--text-main); white-space: pre-wrap; padding: 1rem 0; border-top: 1px solid var(--border-color);">
          ${topic.content}
        </div>
      </div>

      <!-- Replies Stream -->
      <h3 style="font-size: 1.15rem; margin-bottom: 1.25rem; display: flex; align-items: center; gap: 0.5rem;">
        <span>💬</span> Discussion Replies (${replies.length})
      </h3>

      <div style="display: flex; flex-direction: column; gap: 1rem; margin-bottom: 2.5rem;">
        ${replies.map(r => `
          <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.25rem; margin-left: ${r.author_role === 'professor' ? '1rem' : '0'}; border-left: ${r.author_role === 'professor' ? '4px solid var(--primary)' : '1px solid var(--border-color)'};">
            <div style="display: flex; gap: 0.75rem; align-items: center; margin-bottom: 0.75rem;">
              <img src="${r.author_avatar}" style="width: 34px; height: 34px; border-radius: 50%; object-fit: cover;">
              <div>
                <div style="font-weight: 700; font-size: 0.9rem;">
                  ${r.author_name}
                  ${r.author_role === 'professor' ? '<span class="badge badge-primary" style="margin-left: 0.4rem;">Instructor</span>' : ''}
                </div>
                <div style="font-size: 0.74rem; color: var(--text-muted);">${new Date(r.created_at).toLocaleString()}</div>
              </div>
            </div>
            <div style="font-size: 0.9rem; line-height: 1.6; color: var(--text-main); white-space: pre-wrap;">
              ${r.content}
            </div>
          </div>
        `).join('')}

        ${replies.length === 0 ? `
          <div style="text-align: center; padding: 2rem; color: var(--text-muted); background: var(--bg-surface); border-radius: var(--radius-md); border: 1px dashed var(--border-color);">
            No replies yet. Contribute your technical perspective below!
          </div>
        ` : ''}
      </div>

      <!-- Post Reply Box -->
      <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 1.75rem; box-shadow: var(--shadow-sm);">
        <h4 style="font-size: 1.05rem; margin-bottom: 0.5rem;">Post Your Reply</h4>
        <form onsubmit="TopicView.submitReply(event, ${topic.id})">
          <div style="margin-bottom: 1rem;">
            <textarea name="reply_content" rows="4" required style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-family: inherit; font-size: 0.9rem;" placeholder="Write a constructive and respectful academic response..."></textarea>
          </div>
          <button type="submit" class="btn btn-primary">
            Post Reply
          </button>
        </form>
      </div>
    `;
  },

  async submitReply(e, topicId) {
    e.preventDefault();
    const form = e.target;
    const content = form.reply_content.value;

    try {
      await API.postTopicReply(topicId, content);
      App.showToast('Reply published successfully!');
      App.refreshCurrentView();
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  }
};
