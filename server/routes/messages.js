const express = require('express');
const router = express.Router();
const { db } = require('../../database/db');
const { requireAuth } = require('../middleware/auth');

// 1. Get List of Conversations for Current User
router.get('/conversations', requireAuth, (req, res) => {
  const userId = req.user.id;

  // Find all distinct users we have conversed with
  const conversations = db.prepare(`
    SELECT
      u.id as user_id,
      u.full_name,
      u.avatar_url,
      u.role,
      (SELECT content FROM messages WHERE (sender_id = u.id AND recipient_id = ?) OR (sender_id = ? AND recipient_id = u.id) ORDER BY created_at DESC LIMIT 1) as last_message,
      (SELECT created_at FROM messages WHERE (sender_id = u.id AND recipient_id = ?) OR (sender_id = ? AND recipient_id = u.id) ORDER BY created_at DESC LIMIT 1) as last_message_at,
      (SELECT COUNT(*) FROM messages WHERE sender_id = u.id AND recipient_id = ? AND is_read = 0) as unread_count
    FROM users u
    WHERE u.id != ? AND (
      EXISTS(SELECT 1 FROM messages WHERE sender_id = u.id AND recipient_id = ?) OR
      EXISTS(SELECT 1 FROM messages WHERE sender_id = ? AND recipient_id = u.id) OR
      u.role = 'professor'
    )
    ORDER BY last_message_at DESC NULLS LAST
  `).all(userId, userId, userId, userId, userId, userId, userId, userId);

  res.json({ conversations });
});

// 2. Get Thread with Specific User
router.get('/thread/:otherUserId', requireAuth, (req, res) => {
  const userId = req.user.id;
  const otherUserId = parseInt(req.params.otherUserId);

  const otherUser = db.prepare('SELECT id, full_name, email, role, avatar_url FROM users WHERE id = ?').get(otherUserId);
  if (!otherUser) {
    return res.status(404).json({ error: 'User not found.' });
  }

  // Mark incoming messages as read
  db.prepare('UPDATE messages SET is_read = 1 WHERE sender_id = ? AND recipient_id = ?').run(otherUserId, userId);

  const messages = db.prepare(`
    SELECT m.*, u.full_name as sender_name, u.avatar_url as sender_avatar
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    WHERE (m.sender_id = ? AND m.recipient_id = ?) OR (m.sender_id = ? AND m.recipient_id = ?)
    ORDER BY m.created_at ASC
  `).all(userId, otherUserId, otherUserId, userId);

  res.json({ otherUser, messages });
});

// 3. Send Direct Message
router.post('/', requireAuth, (req, res) => {
  const senderId = req.user.id;
  const { recipient_id, content } = req.body;

  if (!recipient_id || !content || !content.trim()) {
    return res.status(400).json({ error: 'Recipient and message content are required.' });
  }

  const result = db.prepare(`
    INSERT INTO messages (sender_id, recipient_id, content)
    VALUES (?, ?, ?)
  `).run(senderId, parseInt(recipient_id), content.trim());

  // Notify recipient
  db.prepare(`
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (?, 'New Direct Message', ?, 'message', '#/messages')
  `).run(parseInt(recipient_id), `${req.user.full_name}: ${content.trim().substring(0, 60)}`);

  const newMsg = db.prepare(`
    SELECT m.*, u.full_name as sender_name, u.avatar_url as sender_avatar
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    WHERE m.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json({ message: 'Message sent', directMessage: newMsg });
});

module.exports = router;
