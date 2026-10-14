const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { db } = require('../../database/db');
const { generateToken, requireAuth } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

// 1. Login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email.trim());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials. Please verify your email and password.' });
  }

  if (user.is_active === 0) {
    return res.status(403).json({ error: 'Access denied: Your student account is deactivated by Prof. Maryam. Contact the faculty for access.' });
  }

  const token = generateToken(user);
  logAudit(user.id, 'USER_LOGIN', `User ${user.email} logged in`, req);

  const { password_hash, ...safeUser } = user;
  res.json({
    message: 'Login successful',
    token,
    user: safeUser
  });
});

// 2. Demo Switch User (Enables instant 1-click role & student switching for testing)
router.post('/switch-user', (req, res) => {
  const { userId, email } = req.body;
  let user = null;

  if (userId) {
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  } else if (email) {
    user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email.trim());
  }

  if (!user) {
    return res.status(404).json({ error: 'Requested user not found.' });
  }

  const token = generateToken(user);
  const { password_hash, ...safeUser } = user;
  res.json({
    message: `Switched active persona to ${user.full_name} (${user.role})`,
    token,
    user: safeUser
  });
});

// 3. Get Current User & Stats
router.get('/me', requireAuth, (req, res) => {
  const user = req.user;
  
  // Count unread notifications
  const unreadNotifs = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0').get(user.id).count;
  // Count unread messages
  const unreadMsgs = db.prepare('SELECT COUNT(*) as count FROM messages WHERE recipient_id = ? AND is_read = 0').get(user.id).count;
  
  // Courses count
  let coursesCount = 0;
  if (user.role === 'professor') {
    coursesCount = db.prepare('SELECT COUNT(*) as count FROM courses WHERE professor_id = ?').get(user.id).count;
  } else {
    coursesCount = db.prepare('SELECT COUNT(*) as count FROM enrollments WHERE user_id = ?').get(user.id).count;
  }

  res.json({
    user,
    stats: {
      unreadNotifications: unreadNotifs,
      unreadMessages: unreadMsgs,
      coursesCount
    }
  });
});

// 4. Student Self-Registration (Strictly for this faculty)
router.post('/register', (req, res) => {
  const { email, password, full_name, student_id_number, bio } = req.body;

  if (!email || !password || !full_name) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(email.trim());
  if (existing) {
    return res.status(400).json({ error: 'An account with this email address already exists.' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const result = db.prepare(`
    INSERT INTO users (email, password_hash, full_name, role, avatar_url, student_id_number, department, bio)
    VALUES (?, ?, ?, 'student', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80', ?, 'Faculty of Midwifery', ?)
  `).run(
    email.trim().toLowerCase(),
    hashedPassword,
    full_name.trim(),
    student_id_number || `STU-2026-${Math.floor(100 + Math.random() * 900)}`,
    bio || ''
  );

  const newUser = db.prepare('SELECT id, email, full_name, role, avatar_url, student_id_number, department, bio FROM users WHERE id = ?').get(result.lastInsertRowid);
  
  // Auto-enroll new student in default faculty courses
  const courses = db.prepare('SELECT id FROM courses WHERE is_published = 1').all();
  const insertEnrollment = db.prepare('INSERT OR IGNORE INTO enrollments (user_id, course_id) VALUES (?, ?)');
  courses.forEach(c => insertEnrollment.run(newUser.id, c.id));

  // Welcome notification
  db.prepare(`
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (?, 'Welcome to the Faculty LMS', 'Your student account is active. You are enrolled in the semester courses.', 'info', '#/dashboard')
  `).run(newUser.id);

  const token = generateToken(newUser);
  logAudit(newUser.id, 'STUDENT_REGISTER', `New student registered: ${newUser.email}`, req);

  res.status(201).json({
    message: 'Registration successful',
    token,
    user: newUser
  });
});

// 5. Update Profile
router.put('/profile', requireAuth, (req, res) => {
  const { full_name, bio, avatar_url } = req.body;
  db.prepare(`
    UPDATE users
    SET full_name = COALESCE(?, full_name),
        bio = COALESCE(?, bio),
        avatar_url = COALESCE(?, avatar_url)
    WHERE id = ?
  `).run(full_name, bio, avatar_url, req.user.id);

  const updated = db.prepare('SELECT id, email, full_name, role, avatar_url, student_id_number, department, bio FROM users WHERE id = ?').get(req.user.id);
  res.json({ message: 'Profile updated successfully', user: updated });
});

// 6. List Faculty Members / Users (for picker or directory)
router.get('/directory', requireAuth, (req, res) => {
  const users = db.prepare(`
    SELECT id, full_name, email, role, avatar_url, department
    FROM users
    ORDER BY role ASC, full_name ASC
  `).all();
  res.json({ users });
});

// 7. Professor Student User Management (List, Create, Deactivate, Delete)
router.get('/students', requireAuth, (req, res) => {
  const students = db.prepare(`
    SELECT u.id, u.email, u.full_name, u.student_id_number, u.department, u.is_active, u.created_at, u.avatar_url,
      (SELECT COUNT(*) FROM enrollments e WHERE e.user_id = u.id) as enrolled_count
    FROM users u
    WHERE u.role = 'student'
    ORDER BY u.created_at DESC
  `).all();
  res.json({ students });
});

router.post('/students', requireAuth, (req, res) => {
  if (req.user.role !== 'professor' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only the professor or administrator can create student accounts.' });
  }

  const { email, password, full_name, student_id_number, is_active } = req.body;
  if (!email || !full_name) {
    return res.status(400).json({ error: 'Student email and full name are required.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(email.trim());
  if (existing) {
    return res.status(400).json({ error: 'A student account with this email already exists.' });
  }

  const defaultPassword = password || 'student123';
  const hashedPassword = bcrypt.hashSync(defaultPassword, 10);
  const activeVal = is_active !== undefined ? (is_active ? 1 : 0) : 1;

  const result = db.prepare(`
    INSERT INTO users (email, password_hash, full_name, role, avatar_url, student_id_number, department, is_active)
    VALUES (?, ?, ?, 'student', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80', ?, 'Faculty of Midwifery', ?)
  `).run(
    email.trim().toLowerCase(),
    hashedPassword,
    full_name.trim(),
    student_id_number || `STU-2026-${Math.floor(100 + Math.random() * 900)}`,
    activeVal
  );

  const newStudentId = result.lastInsertRowid;

  // Auto enroll in published courses
  const courses = db.prepare('SELECT id FROM courses WHERE is_published = 1').all();
  const enrollStmt = db.prepare('INSERT OR IGNORE INTO enrollments (user_id, course_id) VALUES (?, ?)');
  courses.forEach(c => enrollStmt.run(newStudentId, c.id));

  logAudit(req.user.id, 'STUDENT_ACCOUNT_CREATED', `Prof created student ${full_name} (${email})`, req);

  const student = db.prepare('SELECT id, email, full_name, student_id_number, is_active, created_at FROM users WHERE id = ?').get(newStudentId);
  res.status(201).json({ message: 'Student account created successfully', student });
});

router.put('/students/:id/status', requireAuth, (req, res) => {
  if (req.user.role !== 'professor' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only the professor or administrator can modify student access status.' });
  }

  const studentId = parseInt(req.params.id);
  const { is_active } = req.body;

  db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(is_active ? 1 : 0, studentId);
  const student = db.prepare('SELECT id, email, full_name, is_active FROM users WHERE id = ?').get(studentId);

  logAudit(req.user.id, 'STUDENT_STATUS_TOGGLED', `Changed ${student.email} access active=${is_active}`, req);

  res.json({ message: `Access ${is_active ? 'enabled' : 'deactivated'} for ${student.full_name}`, student });
});

router.delete('/students/:id', requireAuth, (req, res) => {
  if (req.user.role !== 'professor' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only the professor or administrator can remove student accounts.' });
  }
  const studentId = parseInt(req.params.id);
  const student = db.prepare('SELECT id, email, full_name, role FROM users WHERE id = ?').get(studentId);
  if (!student) {
    return res.status(404).json({ error: 'Student not found.' });
  }
  if (student.role !== 'student') {
    return res.status(400).json({ error: 'Only student accounts can be deleted from here.' });
  }
  try {
    const deleteTx = db.transaction(() => {
      db.prepare('DELETE FROM forum_replies WHERE author_id = ?').run(studentId);
      db.prepare('DELETE FROM forum_topics WHERE author_id = ?').run(studentId);
      db.prepare('DELETE FROM messages WHERE sender_id = ? OR recipient_id = ?').run(studentId, studentId);
      db.prepare('DELETE FROM notifications WHERE user_id = ?').run(studentId);
      db.prepare('DELETE FROM attendance_records WHERE user_id = ?').run(studentId);
      db.prepare('DELETE FROM awarded_badges WHERE user_id = ?').run(studentId);
      db.prepare('DELETE FROM certificates WHERE user_id = ?').run(studentId);
      db.prepare('DELETE FROM lesson_progress WHERE user_id = ?').run(studentId);
      db.prepare('DELETE FROM assignment_submissions WHERE user_id = ?').run(studentId);
      const attempts = db.prepare('SELECT id FROM quiz_attempts WHERE user_id = ?').all(studentId);
      for (const att of attempts) {
        db.prepare('DELETE FROM quiz_attempt_answers WHERE attempt_id = ?').run(att.id);
      }
      db.prepare('DELETE FROM quiz_attempts WHERE user_id = ?').run(studentId);
      db.prepare('DELETE FROM enrollments WHERE user_id = ?').run(studentId);
      db.prepare('DELETE FROM audit_logs WHERE user_id = ?').run(studentId);
      db.prepare('DELETE FROM users WHERE id = ?').run(studentId);
    });
    deleteTx();
    logAudit(req.user.id, 'STUDENT_DELETED', 'Deleted student ' + student.email, req);
    res.json({ message: 'Student account ' + student.full_name + ' removed from faculty.' });
  } catch (err) {
    console.error('Delete student error:', err);
    res.status(500).json({ error: 'Failed to delete student: ' + err.message });
  }
});

module.exports = router;

