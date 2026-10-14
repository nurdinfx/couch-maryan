const express = require('express');
const router = express.Router();
const { db } = require('../../database/db');
const { requireAuth, requireProfessor } = require('../middleware/auth');

// 1. Get Topics for a Course
router.get('/courses/:courseId', requireAuth, (req, res) => {
  const courseId = parseInt(req.params.courseId);

  const topics = db.prepare(`
    SELECT ft.*, u.full_name as author_name, u.avatar_url as author_avatar, u.role as author_role,
      (SELECT COUNT(*) FROM forum_replies fr WHERE fr.topic_id = ft.id) as reply_count,
      (SELECT MAX(created_at) FROM forum_replies fr WHERE fr.topic_id = ft.id) as last_reply_at
    FROM forum_topics ft
    JOIN users u ON ft.author_id = u.id
    WHERE ft.course_id = ?
    ORDER BY ft.is_pinned DESC, ft.created_at DESC
  `).all(courseId);

  res.json({ topics });
});

// 2. Get Single Topic & Replies
router.get('/:id', requireAuth, (req, res) => {
  const topicId = parseInt(req.params.id);

  const topic = db.prepare(`
    SELECT ft.*, u.full_name as author_name, u.avatar_url as author_avatar, u.role as author_role,
      c.title as course_title, c.code as course_code
    FROM forum_topics ft
    JOIN users u ON ft.author_id = u.id
    JOIN courses c ON ft.course_id = c.id
    WHERE ft.id = ?
  `).get(topicId);

  if (!topic) {
    return res.status(404).json({ error: 'Discussion topic not found.' });
  }

  const replies = db.prepare(`
    SELECT fr.*, u.full_name as author_name, u.avatar_url as author_avatar, u.role as author_role
    FROM forum_replies fr
    JOIN users u ON fr.author_id = u.id
    WHERE fr.topic_id = ?
    ORDER BY fr.created_at ASC
  `).all(topicId);

  res.json({ topic, replies });
});

// 3. Create Topic
router.post('/courses/:courseId', requireAuth, (req, res) => {
  const courseId = parseInt(req.params.courseId);
  const { title, content, is_pinned } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required.' });
  }

  const isPinnedVal = req.user.role === 'professor' && is_pinned ? 1 : 0;

  const result = db.prepare(`
    INSERT INTO forum_topics (course_id, author_id, title, content, is_pinned)
    VALUES (?, ?, ?, ?, ?)
  `).run(courseId, req.user.id, title.trim(), content.trim(), isPinnedVal);

  const newTopic = db.prepare('SELECT * FROM forum_topics WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ message: 'Discussion topic created', topic: newTopic });
});

// 4. Post Reply
router.post('/:id/replies', requireAuth, (req, res) => {
  const topicId = parseInt(req.params.id);
  const { content } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Reply content cannot be empty.' });
  }

  const topic = db.prepare('SELECT * FROM forum_topics WHERE id = ?').get(topicId);
  if (!topic) {
    return res.status(404).json({ error: 'Topic not found.' });
  }

  if (topic.is_locked && req.user.role !== 'professor' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'This discussion thread has been locked by the professor.' });
  }

  const result = db.prepare(`
    INSERT INTO forum_replies (topic_id, author_id, content)
    VALUES (?, ?, ?)
  `).run(topicId, req.user.id, content.trim());

  const newReply = db.prepare(`
    SELECT fr.*, u.full_name as author_name, u.avatar_url as author_avatar, u.role as author_role
    FROM forum_replies fr
    JOIN users u ON fr.author_id = u.id
    WHERE fr.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json({ message: 'Reply posted', reply: newReply });
});

// 5. Delete Topic (Professor or author)
router.delete('/:id', requireAuth, (req, res) => {
  const topicId = parseInt(req.params.id);
  const topic = db.prepare('SELECT * FROM forum_topics WHERE id = ?').get(topicId);
  if (!topic) {
    return res.status(404).json({ error: 'Topic not found.' });
  }

  if (req.user.role !== 'professor' && req.user.role !== 'admin' && topic.author_id !== req.user.id) {
    return res.status(403).json({ error: 'Not authorized to delete this topic.' });
  }

  db.prepare('DELETE FROM forum_topics WHERE id = ?').run(topicId);
  res.json({ message: 'Topic deleted successfully.' });
});

module.exports = router;
