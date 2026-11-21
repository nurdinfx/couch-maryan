const express = require('express');
const router = express.Router();
const { db } = require('../../database/db');
const { requireAuth } = require('../middleware/auth');

// 1. Get Calendar Deadlines and Events for Enrolled Courses
router.get('/', requireAuth, (req, res) => {
  const userId = req.user.id;
  const isProfessor = req.user.role === 'professor' || req.user.role === 'admin';

  let courses;
  if (isProfessor) {
    courses = db.prepare('SELECT id, code, title FROM courses').all();
  } else {
    courses = db.prepare(`
      SELECT c.id, c.code, c.title
      FROM courses c
      JOIN enrollments e ON c.id = e.course_id
      WHERE e.user_id = ?
    `).all(userId);
  }

  const courseIds = courses.map(c => c.id);
  if (courseIds.length === 0) {
    return res.json({ events: [] });
  }

  const placeholders = courseIds.map(() => '?').join(',');

  // 1. Assignment deadlines
  const assignments = db.prepare(`
    SELECT a.id, a.title, a.due_date as event_date, 'assignment' as event_type,
      c.code as course_code, c.title as course_title, a.course_id
    FROM assignments a
    JOIN courses c ON a.course_id = c.id
    WHERE a.course_id IN (${placeholders})
  `).all(...courseIds);

  // 2. Quiz dates
  const quizzes = db.prepare(`
    SELECT q.id, q.title, COALESCE(q.close_date, q.open_date, datetime('now', '+7 days')) as event_date, 'quiz' as event_type,
      c.code as course_code, c.title as course_title, q.course_id
    FROM quizzes q
    JOIN courses c ON q.course_id = c.id
    WHERE q.course_id IN (${placeholders})
  `).all(...courseIds);

  // 3. Attendance sessions
  const sessions = db.prepare(`
    SELECT asess.id, asess.title, asess.session_date || ' 10:00:00' as event_date, 'session' as event_type,
      c.code as course_code, c.title as course_title, asess.course_id
    FROM attendance_sessions asess
    JOIN courses c ON asess.course_id = c.id
    WHERE asess.course_id IN (${placeholders})
  `).all(...courseIds);

  const allEvents = [...assignments, ...quizzes, ...sessions].sort((a, b) => new Date(a.event_date) - new Date(b.event_date));

  res.json({ events: allEvents });
});

module.exports = router;
