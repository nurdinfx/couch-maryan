const express = require('express');
const router = express.Router();
const { db } = require('../../database/db');
const { requireAuth, requireProfessor } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

// 1. Get all faculty badges with earn statistics
router.get('/', requireAuth, (req, res) => {
  const userId = req.user.id;
  const isProfessor = req.user.role === 'professor' || req.user.role === 'admin';

  const badges = db.prepare(`
    SELECT b.*,
      (SELECT COUNT(*) FROM awarded_badges ab WHERE ab.badge_id = b.id) as total_awarded_count,
      EXISTS(SELECT 1 FROM awarded_badges ab WHERE ab.badge_id = b.id AND ab.user_id = ?) as is_earned_by_me,
      (SELECT awarded_at FROM awarded_badges ab WHERE ab.badge_id = b.id AND ab.user_id = ? LIMIT 1) as my_awarded_at
    FROM badges b
    ORDER BY b.id ASC
  `).all(userId, userId);

  let recentAwards = [];
  if (isProfessor) {
    recentAwards = db.prepare(`
      SELECT ab.*, b.name as badge_name, b.icon, u.full_name as student_name, u.avatar_url, c.title as course_title
      FROM awarded_badges ab
      JOIN badges b ON ab.badge_id = b.id
      JOIN users u ON ab.user_id = u.id
      JOIN courses c ON ab.course_id = c.id
      ORDER BY ab.awarded_at DESC
      LIMIT 15
    `).all();
  }

  res.json({ badges, recentAwards });
});

// 2. Student My Badges
router.get('/my-badges', requireAuth, (req, res) => {
  const userId = req.user.id;

  const earnedBadges = db.prepare(`
    SELECT b.*, ab.awarded_at, c.title as course_title, c.code as course_code
    FROM awarded_badges ab
    JOIN badges b ON ab.badge_id = b.id
    JOIN courses c ON ab.course_id = c.id
    WHERE ab.user_id = ?
    ORDER BY ab.awarded_at DESC
  `).all(userId);

  res.json({ earnedBadges });
});

// 3. Award Badge Manually (Professor only)
router.post('/award', requireProfessor, (req, res) => {
  const { badge_id, user_id, course_id } = req.body;

  if (!badge_id || !user_id || !course_id) {
    return res.status(400).json({ error: 'Badge ID, User ID, and Course ID are required.' });
  }

  db.prepare(`
    INSERT OR IGNORE INTO awarded_badges (badge_id, user_id, course_id)
    VALUES (?, ?, ?)
  `).run(badge_id, user_id, course_id);

  const badge = db.prepare('SELECT name FROM badges WHERE id = ?').get(badge_id);
  const student = db.prepare('SELECT full_name FROM users WHERE id = ?').get(user_id);

  // Notify student
  db.prepare(`
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (?, 'New Academic Badge Awarded!', ?, 'badge', '#/badges')
  `).run(user_id, `Prof. Maryam awarded you the "${badge.name}" badge!`);

  logAudit(req.user.id, 'BADGE_AWARDED', `Awarded badge "${badge.name}" to ${student.full_name}`, req);

  res.json({ message: `Badge "${badge.name}" awarded successfully to ${student.full_name}.` });
});

// 4. Create New Badge (Professor only)
router.post('/', requireProfessor, (req, res) => {
  const { name, description, icon, criteria_type } = req.body;
  if (!name || !description) {
    return res.status(400).json({ error: 'Badge name and description are required.' });
  }

  const code = (req.body.code || name).toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now().toString().slice(-4);
  const result = db.prepare(`
    INSERT INTO badges (code, name, description, icon, criteria_type)
    VALUES (?, ?, ?, ?, ?)
  `).run(code, name.trim(), description.trim(), icon || '🏅', criteria_type || 'custom');

  logAudit(req.user.id, 'BADGE_CREATED', `Created new badge "${name}"`, req);

  const newBadge = db.prepare('SELECT * FROM badges WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ message: 'Badge created successfully', badge: newBadge });
});

module.exports = router;

