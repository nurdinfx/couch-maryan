const express = require('express');
const router = express.Router();
const { db } = require('../../database/db');
const { requireAuth } = require('../middleware/auth');

// 1. Site-wide search across courses, lessons, assignments, documents
router.get('/', requireAuth, (req, res) => {
  const query = (req.query.q || '').trim();
  if (!query || query.length < 2) {
    return res.json({ results: [] });
  }

  const pattern = `%${query}%`;

  // Search courses
  const courses = db.prepare(`
    SELECT id, code, title, description, 'course' as type, '/courses/' || id as link
    FROM courses
    WHERE title LIKE ? OR code LIKE ? OR description LIKE ?
    LIMIT 5
  `).all(pattern, pattern, pattern);

  // Search lessons
  const lessons = db.prepare(`
    SELECT l.id, l.title, l.description, l.content_type, 'lesson' as type,
      c.code as course_code, '/course/' || l.course_id || '/lesson/' || l.id as link
    FROM lessons l
    JOIN courses c ON l.course_id = c.id
    WHERE l.title LIKE ? OR l.description LIKE ? OR l.content_body LIKE ?
    LIMIT 8
  `).all(pattern, pattern, pattern);

  // Search assignments
  const assignments = db.prepare(`
    SELECT a.id, a.title, a.instructions as description, 'assignment' as type,
      c.code as course_code, '/course/' || a.course_id || '/assignment/' || a.id as link
    FROM assignments a
    JOIN courses c ON a.course_id = c.id
    WHERE a.title LIKE ? OR a.instructions LIKE ?
    LIMIT 5
  `).all(pattern, pattern);

  res.json({
    results: [
      ...courses.map(c => ({ ...c, title: `[${c.code}] ${c.title}` })),
      ...lessons.map(l => ({ ...l, title: `[${l.course_code}] ${l.title} (${l.content_type})` })),
      ...assignments.map(a => ({ ...a, title: `[${a.course_code}] Assignment: ${a.title}` }))
    ]
  });
});

module.exports = router;
