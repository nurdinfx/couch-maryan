// ====================================================================
// VIEW: DIRECT MESSAGING & MESSENGER
// ====================================================================

const MessagesView = {
  async render(params) {
    const data = await API.getConversations();
    const conversations = data.conversations || [];
    const activeRecipientId = params.recipient ? parseInt(params.recipient) : (conversations[0]?.user_id || 1);

    setTimeout(() => {
      this.loadThread(activeRecipientId);
    }, 50);

    return `
      <!-- Breadcrumbs -->
      <div class="breadcrumb-trail">
        <a href="#/dashboard">Dashboard</a>
        <span class="breadcrumb-sep">/</span>
        <span>Faculty Messenger</span>
      </div>

      <div class="page-header-container">
        <div>
          <h1 class="page-title">Direct Academic Messages</h1>
          <p class="page-description">Private communication channel between students and Prof. Maryam</p>
        </div>
      </div>

      <!-- Messenger Dual Pane -->
      <div style="display: grid; grid-template-columns: 320px 1fr; gap: 1.5rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); overflow: hidden; min-height: 600px; box-shadow: var(--shadow-sm);">
        
        <!-- Left: Conversations List -->
        <div style="border-right: 1px solid var(--border-color); background: var(--bg-surface-alt); display: flex; flex-direction: column;">
          <div style="padding: 1.25rem; border-bottom: 1px solid var(--border-color); font-weight: 700; font-size: 0.95rem;">
            Conversations
          </div>
          <div style="overflow-y: auto; flex: 1;">
            ${conversations.map(c => `
              <div class="conversation-item ${c.user_id === activeRecipientId ? 'active' : ''}"
                   style="padding: 1rem 1.25rem; border-bottom: 1px solid var(--border-color); cursor: pointer; display: flex; gap: 0.75rem; align-items: center; background: ${c.user_id === activeRecipientId ? 'var(--bg-surface)' : 'transparent'};"
                   onclick="MessagesView.loadThread(${c.user_id})">
                <img src="${c.avatar_url}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
                <div style="flex: 1; min-width: 0;">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="font-weight: 700; font-size: 0.88rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                      ${c.full_name}
                    </div>
                    ${c.unread_count > 0 ? `<span class="badge-count" style="position: static;">${c.unread_count}</span>` : ''}
                  </div>
                  <div style="font-size: 0.74rem; color: var(--primary); text-transform: uppercase; font-weight: 600;">${c.role}</div>
                  <div style="font-size: 0.78rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 0.15rem;">
                    ${c.last_message || 'Start conversation...'}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Right: Active Chat Thread Container -->
        <div id="active-chat-thread-container" style="display: flex; flex-direction: column;">
          <div style="padding: 3rem; text-align: center; color: var(--text-muted); margin: auto;">
            Loading conversation...
          </div>
        </div>

      </div>
    `;
  },

  async loadThread(otherUserId) {
    const container = document.getElementById('active-chat-thread-container');
    if (!container) return;

    try {
      const data = await API.getThread(otherUserId);
      const otherUser = data.otherUser;
      const messages = data.messages || [];

      container.innerHTML = `
        <!-- Thread Header -->
        <div style="padding: 1rem 1.5rem; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; gap: 0.75rem; background: var(--bg-surface);">
          <img src="${otherUser.avatar_url}" style="width: 38px; height: 38px; border-radius: 50%; object-fit: cover;">
          <div>
            <div style="font-weight: 700; font-size: 0.95rem;">${otherUser.full_name}</div>
            <div style="font-size: 0.76rem; color: var(--text-muted);">${otherUser.email} • ${otherUser.role.toUpperCase()}</div>
          </div>
        </div>

        <!-- Messages Bubble Stream -->
        <div id="chat-messages-stream" style="flex: 1; padding: 1.5rem; overflow-y: auto; display: flex; flex-direction: column; gap: 1rem; max-height: 440px;">
          ${messages.map(m => {
            const isMe = m.sender_id === API.currentUser.id;
            return `
              <div style="display: flex; justify-content: ${isMe ? 'flex-end' : 'flex-start'};">
                <div style="max-width: 70%; padding: 0.85rem 1.25rem; border-radius: 18px; font-size: 0.9rem; line-height: 1.45; ${isMe ? 'background: var(--primary); color: white; border-bottom-right-radius: 4px;' : 'background: var(--bg-surface-alt); color: var(--text-main); border: 1px solid var(--border-color); border-bottom-left-radius: 4px;'}">
                  <div>${m.content}</div>
                  <div style="font-size: 0.68rem; margin-top: 0.35rem; text-align: right; opacity: 0.75;">
                    ${new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            `;
          }).join('')}

          ${messages.length === 0 ? `
            <div style="text-align: center; color: var(--text-muted); padding: 2rem;">
              No messages yet with ${otherUser.full_name}. Send a message below to connect.
            </div>
          ` : ''}
        </div>

        <!-- Chat Input Form -->
        <form onsubmit="MessagesView.handleSend(event, ${otherUser.id})" style="padding: 1rem 1.5rem; border-top: 1px solid var(--border-color); display: flex; gap: 0.75rem; background: var(--bg-surface);">
          <input type="text" name="message_text" required autocomplete="off" placeholder="Type your message to ${otherUser.full_name}..." style="flex: 1; padding: 0.75rem 1rem; border: 1px solid var(--border-color); border-radius: var(--radius-full); font-size: 0.9rem; outline: none;">
          <button type="submit" class="btn btn-primary" style="border-radius: var(--radius-full); padding: 0.65rem 1.5rem;">
            Send
          </button>
        </form>
      `;

      // Scroll to bottom
      const stream = document.getElementById('chat-messages-stream');
      if (stream) stream.scrollTop = stream.scrollHeight;
    } catch (err) {
      console.error(err);
    }
  },

  async handleSend(e, recipientId) {
    e.preventDefault();
    const form = e.target;
    const content = form.message_text.value;

    try {
      await API.sendMessage(recipientId, content);
      form.reset();
      this.loadThread(recipientId);
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  }
};
