// ====================================================================
// VIEW: GUUREY LEARNING PLATFORM - DIRECT ACADEMIC MESSENGER
// Real-time direct communication with multimedia support:
// allows students, professors, and administrators to exchange text,
// images/photos, and documents (PDF, Word, Excel, etc.).
// ====================================================================

const MessagesView = {
  selectedFile: null,
  activeRecipientId: null,

  async render(params) {
    let conversations = [];
    try {
      const data = await API.getConversations();
      conversations = data.conversations || [];
    } catch (err) {
      console.error('Error fetching conversations:', err);
    }

    const activeRecipientId = params && params.recipient ? parseInt(params.recipient) : (conversations[0]?.user_id || 1);
    this.activeRecipientId = activeRecipientId;

    setTimeout(() => {
      this.loadThread(activeRecipientId);
    }, 50);

    return `
      <!-- Breadcrumbs -->
      <div class="breadcrumb-trail">
        <a href="#/dashboard">${I18N.t('nav.dashboard', 'Dashboard')}</a>
        <span class="breadcrumb-sep">/</span>
        <span>${I18N.t('messages.page_title', 'Direct Messenger')}</span>
      </div>

      <div class="page-header-container" style="margin-bottom: 1.5rem;">
        <div>
          <h1 class="page-title" style="font-size: 1.85rem; font-weight: 800; color: var(--text-primary); margin-bottom: 0.4rem;">
            💬 ${I18N.t('messages.page_title', 'Direct Academic Messages')}
          </h1>
          <p class="page-description" style="color: var(--text-muted); font-size: 0.95rem;">
            ${I18N.t('messages.page_desc', 'Private real-time communication channel with multimedia attachment support (images & documents)')}
          </p>
        </div>
      </div>

      <!-- Messenger Dual Pane Container -->
      <div style="display: grid; grid-template-columns: 320px 1fr; gap: 0; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); overflow: hidden; min-height: 620px; box-shadow: var(--shadow-sm);">
        
        <!-- Left: Conversations List -->
        <div style="border-right: 1px solid var(--border-color); background: var(--bg-surface-alt); display: flex; flex-direction: column;">
          <div style="padding: 1.25rem; border-bottom: 1px solid var(--border-color); font-weight: 700; font-size: 0.95rem; color: var(--text-primary); display: flex; justify-content: space-between; align-items: center;">
            <span>${I18N.t('messages.conversations', 'Conversations')}</span>
            <span class="badge" style="background: var(--primary-light); color: var(--primary); font-size: 0.75rem;">${conversations.length}</span>
          </div>
          <div style="overflow-y: auto; flex: 1; max-height: 560px;">
            ${conversations.map(c => `
              <div class="conversation-item ${c.user_id === activeRecipientId ? 'active' : ''}"
                   style="padding: 1rem 1.25rem; border-bottom: 1px solid var(--border-color); cursor: pointer; display: flex; gap: 0.75rem; align-items: center; background: ${c.user_id === activeRecipientId ? 'var(--bg-surface)' : 'transparent'}; transition: background 0.2s;"
                   onclick="MessagesView.switchRecipient(${c.user_id})">
                <img src="${c.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}" style="width: 42px; height: 42px; border-radius: 50%; object-fit: cover; border: 2px solid var(--border-color);">
                <div style="flex: 1; min-width: 0;">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="font-weight: 700; font-size: 0.88rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text-primary);">
                      ${c.full_name}
                    </div>
                    ${c.unread_count > 0 ? `<span class="badge-count" style="position: static; font-size: 0.7rem; padding: 0.15rem 0.45rem;">${c.unread_count}</span>` : ''}
                  </div>
                  <div style="font-size: 0.72rem; color: var(--primary); text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">${c.role}</div>
                  <div style="font-size: 0.78rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 0.2rem;">
                    ${c.last_message || I18N.t('messages.empty_thread', 'Start conversation...')}
                  </div>
                </div>
              </div>
            `).join('')}

            ${conversations.length === 0 ? `
              <div style="padding: 2rem 1rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
                No conversations found.
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Right: Active Chat Thread Container -->
        <div id="active-chat-thread-container" style="display: flex; flex-direction: column; background: var(--bg-surface);">
          <div style="padding: 4rem; text-align: center; color: var(--text-muted); margin: auto;">
            <div class="spinner" style="margin: 0 auto 1rem;"></div>
            ${I18N.t('common.loading', 'Loading conversation...')}
          </div>
        </div>

      </div>
    `;
  },

  switchRecipient(userId) {
    this.activeRecipientId = userId;
    this.selectedFile = null;
    this.loadThread(userId);
  },

  async loadThread(otherUserId) {
    const container = document.getElementById('active-chat-thread-container');
    if (!container) return;

    this.activeRecipientId = otherUserId;
    this.selectedFile = null;

    try {
      const data = await API.getThread(otherUserId);
      const otherUser = data.otherUser || { id: otherUserId, full_name: 'Contact', email: '', role: 'USER' };
      const messages = data.messages || [];

      container.innerHTML = `
        <!-- Thread Header -->
        <div style="padding: 1rem 1.5rem; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between; background: var(--bg-surface);">
          <div style="display: flex; align-items: center; gap: 0.85rem;">
            <img src="${otherUser.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}" style="width: 42px; height: 42px; border-radius: 50%; object-fit: cover; border: 2px solid var(--border-color);">
            <div>
              <div style="font-weight: 700; font-size: 1rem; color: var(--text-primary);">${otherUser.full_name}</div>
              <div style="font-size: 0.78rem; color: var(--text-muted);">${otherUser.email} • <span style="text-transform: uppercase; font-weight: 600; color: var(--primary);">${otherUser.role}</span></div>
            </div>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <span class="badge" style="background: #dcfce7; color: #15803d; font-size: 0.75rem; padding: 0.3rem 0.6rem; border-radius: 999px;">
              🟢 Active
            </span>
          </div>
        </div>

        <!-- Messages Bubble Stream -->
        <div id="chat-messages-stream" style="flex: 1; padding: 1.5rem; overflow-y: auto; display: flex; flex-direction: column; gap: 1rem; max-height: 440px; background: var(--bg-surface-alt);">
          ${messages.map(m => {
            const isMe = m.sender_id === API.currentUser.id;
            const isImage = m.attachment_type === 'image' || (m.attachment_url && /\.(jpg|jpeg|png|gif|webp)$/i.test(m.attachment_url));
            const hasAttachment = Boolean(m.attachment_url);

            return `
              <div style="display: flex; justify-content: ${isMe ? 'flex-end' : 'flex-start'};">
                <div style="max-width: 72%; padding: 0.85rem 1.15rem; border-radius: 18px; font-size: 0.92rem; line-height: 1.5; ${isMe ? 'background: var(--primary); color: white; border-bottom-right-radius: 4px; box-shadow: 0 2px 6px rgba(0,0,0,0.15);' : 'background: var(--bg-surface); color: var(--text-primary); border: 1px solid var(--border-color); border-bottom-left-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.06);'}">
                  
                  ${m.content ? `<div style="word-break: break-word; white-space: pre-wrap;">${m.content}</div>` : ''}

                  <!-- Media Attachment Rendering -->
                  ${hasAttachment ? `
                    <div style="margin-top: ${m.content ? '0.75rem' : '0'};">
                      ${isImage ? `
                        <div style="border-radius: 10px; overflow: hidden; border: 1px solid ${isMe ? 'rgba(255,255,255,0.2)' : 'var(--border-color)'}; background: #000;">
                          <a href="${m.attachment_url}" target="_blank" title="View Full Photo" style="display: block;">
                            <img src="${m.attachment_url}" alt="${m.attachment_name || 'Attached Photo'}" style="width: 100%; max-height: 280px; object-fit: contain; display: block;">
                          </a>
                        </div>
                        <div style="font-size: 0.72rem; margin-top: 0.35rem; opacity: 0.85; display: flex; align-items: center; gap: 0.3rem;">
                          <span>📷</span> <span>${m.attachment_name || 'Photo'}</span>
                        </div>
                      ` : `
                        <a href="${m.attachment_url}" target="_blank" download="${m.attachment_name || 'document'}"
                           style="display: flex; align-items: center; gap: 0.75rem; padding: 0.65rem 0.95rem; border-radius: 10px; text-decoration: none; color: ${isMe ? '#ffffff' : 'var(--text-primary)'}; background: ${isMe ? 'rgba(255,255,255,0.15)' : 'var(--bg-surface-alt)'}; border: 1px solid ${isMe ? 'rgba(255,255,255,0.25)' : 'var(--border-color)'}; transition: all 0.2s;">
                          <span style="font-size: 1.5rem; line-height: 1;">📄</span>
                          <div style="flex: 1; min-width: 0; text-align: left;">
                            <div style="font-weight: 700; font-size: 0.85rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                              ${m.attachment_name || 'Download Document'}
                            </div>
                            <div style="font-size: 0.72rem; opacity: 0.8;">
                              ${m.file_size_bytes ? (m.file_size_bytes / 1024).toFixed(1) + ' KB' : 'Document File'}
                            </div>
                          </div>
                          <span style="font-size: 1.15rem; margin-left: 0.5rem;">⬇️</span>
                        </a>
                      `}
                    </div>
                  ` : ''}

                  <!-- Timestamp -->
                  <div style="font-size: 0.68rem; margin-top: 0.4rem; text-align: right; opacity: 0.75;">
                    ${m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </div>
                </div>
              </div>
            `;
          }).join('')}

          ${messages.length === 0 ? `
            <div style="text-align: center; color: var(--text-muted); padding: 3rem 1rem; margin: auto;">
              <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">👋</div>
              <div style="font-weight: 700; font-size: 1.05rem; color: var(--text-primary); margin-bottom: 0.3rem;">${otherUser.full_name}</div>
              <div style="font-size: 0.85rem; max-width: 380px; margin: 0 auto;">${I18N.t('messages.empty_thread', 'No messages yet with this contact. Send a message, photo, or document below to connect.')}</div>
            </div>
          ` : ''}
        </div>

        <!-- Attachment Preview Bar (hidden until file picked) -->
        <div id="msg-attachment-preview-bar" style="display: none; padding: 0.65rem 1.25rem; background: var(--bg-surface-alt); border-top: 1px solid var(--border-color); align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 0.75rem; overflow: hidden;">
            <span id="msg-preview-icon" style="font-size: 1.25rem;">📎</span>
            <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.85rem; font-weight: 600; color: var(--text-primary);" id="msg-preview-name">
              filename.pdf
            </div>
          </div>
          <button type="button" onclick="MessagesView.removeSelectedFile()" style="background: none; border: none; color: var(--danger); font-size: 1rem; cursor: pointer; padding: 0.2rem 0.5rem;" title="${I18N.t('messages.remove_file', 'Remove File')}">
            ✕
          </button>
        </div>

        <!-- Chat Input Form with Multimedia Controls -->
        <form id="msg-send-form" onsubmit="MessagesView.handleSend(event, ${otherUser.id})" style="padding: 1rem 1.25rem; border-top: 1px solid var(--border-color); display: flex; align-items: center; gap: 0.65rem; background: var(--bg-surface);">
          
          <!-- Hidden File Inputs -->
          <input type="file" id="msg-file-input" style="display: none;" onchange="MessagesView.onFilePicked(this)">
          <input type="file" id="msg-image-input" accept="image/*" style="display: none;" onchange="MessagesView.onFilePicked(this)">

          <!-- Image Pick Button 📷 -->
          <button type="button" class="btn btn-outline" onclick="document.getElementById('msg-image-input').click()" 
                  title="${I18N.t('messages.image_label', 'Attach Photo')}" style="padding: 0.65rem 0.85rem; border-radius: var(--radius-full); font-size: 1.1rem; line-height: 1;">
            📷
          </button>

          <!-- Document Pick Button 📎 -->
          <button type="button" class="btn btn-outline" onclick="document.getElementById('msg-file-input').click()" 
                  title="${I18N.t('messages.document_label', 'Attach Document (PDF, Word, etc.)')}" style="padding: 0.65rem 0.85rem; border-radius: var(--radius-full); font-size: 1.1rem; line-height: 1;">
            📎
          </button>

          <!-- Text Input -->
          <input type="text" name="message_text" id="msg-text-input" autocomplete="off" placeholder="${I18N.t('messages.type_placeholder', 'Type your message or attach a file...')}" 
                 style="flex: 1; padding: 0.75rem 1.15rem; border: 1px solid var(--border-color); border-radius: var(--radius-full); font-size: 0.92rem; outline: none; background: var(--bg-surface); color: var(--text-primary);">

          <!-- Send Button -->
          <button type="submit" id="msg-send-btn" class="btn btn-primary" style="border-radius: var(--radius-full); padding: 0.65rem 1.5rem; font-weight: 700; display: flex; align-items: center; gap: 0.4rem;">
            <span>${I18N.t('messages.send_btn', 'Send')}</span>
            <span style="font-size: 1rem;">✈️</span>
          </button>
        </form>
      `;

      // Auto scroll to bottom
      const stream = document.getElementById('chat-messages-stream');
      if (stream) stream.scrollTop = stream.scrollHeight;
    } catch (err) {
      console.error(err);
      container.innerHTML = `<div style="padding: 3rem; text-align: center; color: var(--danger);">${err.message}</div>`;
    }
  },

  onFilePicked(input) {
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    this.selectedFile = file;

    const previewBar = document.getElementById('msg-attachment-preview-bar');
    const previewName = document.getElementById('msg-preview-name');
    const previewIcon = document.getElementById('msg-preview-icon');

    if (previewBar && previewName && previewIcon) {
      const isImg = file.type.startsWith('image/');
      previewIcon.textContent = isImg ? '📷' : '📄';
      previewName.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
      previewBar.style.display = 'flex';
    }
  },

  removeSelectedFile() {
    this.selectedFile = null;
    const fileInput = document.getElementById('msg-file-input');
    const imgInput = document.getElementById('msg-image-input');
    if (fileInput) fileInput.value = '';
    if (imgInput) imgInput.value = '';

    const previewBar = document.getElementById('msg-attachment-preview-bar');
    if (previewBar) previewBar.style.display = 'none';
  },

  async handleSend(e, recipientId) {
    e.preventDefault();
    const form = e.target;
    const textInput = form.message_text;
    const content = textInput ? textInput.value.trim() : '';
    const file = this.selectedFile;

    if (!content && !file) {
      App.showToast(I18N.t('messages.type_placeholder', 'Please write a message or select a file to send.'), 'warning');
      return;
    }

    const sendBtn = document.getElementById('msg-send-btn');
    if (sendBtn) {
      sendBtn.disabled = true;
      sendBtn.innerHTML = `<span>...</span>`;
    }

    try {
      await API.sendMessage(recipientId, content, file);
      
      // Reset input & preview
      if (textInput) textInput.value = '';
      this.removeSelectedFile();
      
      // Reload thread
      await this.loadThread(recipientId);
    } catch (err) {
      App.showToast(err.message, 'error');
    } finally {
      if (sendBtn) {
        sendBtn.disabled = false;
        sendBtn.innerHTML = `<span>${I18N.t('messages.send_btn', 'Send')}</span> <span style="font-size: 1rem;">✈️</span>`;
      }
    }
  }
};
