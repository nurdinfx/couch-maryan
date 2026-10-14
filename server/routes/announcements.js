const express = require('express');
const router = express.Router();
const { db } = require('../../database/db');
const { requireAuth, requireProfessor } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

// 1. Get Course Announcements
router.get('/courses/:courseId', requireAuth, (req, res) => {
  const courseId = parseInt(req.params.courseId);

  const announcements = db.prepare(`
    SELECT a.*, u.full_name as author_name, u.avatar_url as author_avatar
    FROM announcements a
    JOIN users u ON a.author_id = u.id
    WHERE a.course_id = ?
    ORDER BY a.is_pinned DESC, a.created_at DESC
  `).all(courseId);

  res.json({ announcements });
});

// 2. Create Announcement (Professor only)
router.post('/courses/:courseId', requireProfessor, (req, res) => {
  const courseId = parseInt(req.params.courseId);
  const { title, content, is_pinned } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required.' });
  }

  const result = db.prepare(`
    INSERT INTO announcements (course_id, author_id, title, content, is_pinned)
    VALUES (?, ?, ?, ?, ?)
  `).run(courseId, req.user.id, title.trim(), content.trim(), is_pinned ? 1 : 0);

  const course = db.prepare('SELECT title FROM courses WHERE id = ?').get(courseId);
  // Send notifications to all enrolled students
  const students = db.prepare('SELECT user_id FROM enrollments WHERE course_id = ?').all(courseId);
  const notif = db.prepare('INSERT INTO notifications (user_id, title, message, type, link) VALUES (?, ?, ?, "announcement", ?)');
  students.forEach(s => {
    notif.run(s.user_id, `Announcement in ${course.title}`, title, `#/course/${courseId}`);
  });

  logAudit(req.user.id, 'ANNOUNCEMENT_POSTED', `Posted announcement "${title}" in course ${courseId}`, req);

  const newAnn = db.prepare('SELECT * FROM announcements WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ message: 'Announcement published', announcement: newAnn });
});

// 3. Delete Announcement (Professor only)
router.delete('/:id', requireProfessor, (req, res) => {
  const annId = parseInt(req.params.id);
  db.prepare('DELETE FROM announcements WHERE id = ?').run(annId);
  res.json({ message: 'Announcement deleted.' });
});

module.exports = router;
