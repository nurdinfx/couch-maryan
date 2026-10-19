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

// 4. Student Self-Registration
router.post('/register', (req, res) => {
  const { email, password, full_name, student_id_number, academic_year, bio, faculty } = req.body;

  if (!email || !password || !full_name) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(email.trim());
  if (existing) {
    return res.status(400).json({ error: 'An account with this email address already exists.' });
  }

  const studentYear = academic_year || 'Year 1';
  const hashedPassword = bcrypt.hashSync(password, 10);
  const result = db.prepare(`
    INSERT INTO users (email, password_hash, full_name, role, avatar_url, student_id_number, academic_year, department, bio, faculty)
    VALUES (?, ?, ?, 'student', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80', ?, ?, 'Guray Sicid Learning Platform', ?, ?)
  `).run(
    email.trim().toLowerCase(),
    hashedPassword,
    full_name.trim(),
    student_id_number || `STU-2026-${Math.floor(100 + Math.random() * 900)}`,
    studentYear,
    bio || '',
    faculty || 'General'
  );

  const newUser = db.prepare('SELECT id, email, full_name, role, avatar_url, student_id_number, academic_year, department, bio, faculty FROM users WHERE id = ?').get(result.lastInsertRowid);
  
  // Auto-enroll new student strictly in courses designated for their academic year or All Years AND matching faculty
  const courses = db.prepare(`
    SELECT id FROM courses 
    WHERE is_published = 1 AND (target_year IS NULL OR target_year = 'All Years' OR target_year = ?)
    AND (faculty IS NULL OR faculty = 'General' OR faculty = ?)
  `).all(studentYear, newUser.faculty || 'General');
  const insertEnrollment = db.prepare('INSERT OR IGNORE INTO enrollments (user_id, course_id) VALUES (?, ?)');
  courses.forEach(c => insertEnrollment.run(newUser.id, c.id));

  // Welcome notification
  db.prepare(`
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (?, 'Welcome to Guray Sicid Learning Platform', ?, 'info', '#/dashboard')
  `).run(newUser.id, `Your ${studentYear} student account is active. Learning without limit!`);

  try {
    const { savePersistence } = require('../../database/db');
    savePersistence(db);
  } catch (e) {}

  const token = generateToken(newUser);
  logAudit(newUser.id, 'STUDENT_REGISTER', `New student registered: ${newUser.email} (${studentYear})`, req);

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

  try {
    const { savePersistence } = require('../../database/db');
    savePersistence(db);
  } catch (e) {}

  const updated = db.prepare('SELECT id, email, full_name, role, avatar_url, student_id_number, academic_year, department, bio FROM users WHERE id = ?').get(req.user.id);
  res.json({ message: 'Profile updated successfully', user: updated });
});

// 6. List Faculty Members / Users (for picker or directory)
router.get('/directory', requireAuth, (req, res) => {
  const users = db.prepare(`
    SELECT id, full_name, email, role, avatar_url, academic_year, department
    FROM users
    ORDER BY role ASC, full_name ASC
  `).all();
  res.json({ users });
});

// 7. Student User Management (List, Create, Update Access/Year, Deactivate, Delete)
router.get('/students', requireAuth, (req, res) => {
  const students = db.prepare(`
    SELECT u.id, u.email, u.full_name, u.student_id_number, u.academic_year, u.department, u.faculty, u.is_active, u.created_at, u.avatar_url,
      (SELECT COUNT(*) FROM enrollments e WHERE e.user_id = u.id) as enrolled_count
    FROM users u
    WHERE u.role = 'student'
    ORDER BY u.created_at DESC
  `).all();

  // Attach enrolled course IDs for each student
  for (const s of students) {
    const enrolledCourses = db.prepare('SELECT course_id FROM enrollments WHERE user_id = ?').all(s.id);
    s.enrolled_course_ids = enrolledCourses.map(c => c.course_id);
  }

  res.json({ students });
});

router.post('/students', requireAuth, (req, res) => {
  if (req.user.role !== 'professor' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only the professor or administrator can create student accounts.' });
  }

  const { email, password, full_name, student_id_number, academic_year, course_ids, is_active, faculty } = req.body;
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
  const assignedYear = academic_year || 'Year 1';

  const result = db.prepare(`
    INSERT INTO users (email, password_hash, full_name, role, avatar_url, student_id_number, academic_year, department, is_active, faculty)
    VALUES (?, ?, ?, 'student', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80', ?, ?, 'Guray Sicid Learning Platform', ?, ?)
  `).run(
    email.trim().toLowerCase(),
    hashedPassword,
    full_name.trim(),
    student_id_number || `STU-2026-${Math.floor(100 + Math.random() * 900)}`,
    assignedYear,
    activeVal,
    faculty || 'General'
  );

  const newStudentId = result.lastInsertRowid;

  // Enroll in specifically selected courses, OR auto-enroll in courses matching the student's year AND faculty
  const enrollStmt = db.prepare('INSERT OR IGNORE INTO enrollments (user_id, course_id) VALUES (?, ?)');
  if (Array.isArray(course_ids) && course_ids.length > 0) {
    course_ids.forEach(cid => enrollStmt.run(newStudentId, parseInt(cid)));
  } else {
    const studentFaculty = faculty || 'General';
    const matchingCourses = db.prepare(`
      SELECT id FROM courses 
      WHERE is_published = 1 AND (target_year IS NULL OR target_year = 'All Years' OR target_year = ?)
      AND (faculty IS NULL OR faculty = 'General' OR faculty = ?)
    `).all(assignedYear, studentFaculty);
    matchingCourses.forEach(c => enrollStmt.run(newStudentId, c.id));
  }

  try {
    const { savePersistence } = require('../../database/db');
    savePersistence(db);
  } catch (e) {}

  logAudit(req.user.id, 'STUDENT_ACCOUNT_CREATED', `Admin/Prof created student ${full_name} (${email}, ${assignedYear})`, req);

  const student = db.prepare('SELECT id, email, full_name, student_id_number, academic_year, is_active, created_at FROM users WHERE id = ?').get(newStudentId);
  res.status(201).json({ message: 'Student account created successfully', student });
});

// Update student details (Year, Course access, Name, Email)
router.put('/students/:id', requireAuth, (req, res) => {
  if (req.user.role !== 'professor' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Permission denied.' });
  }

  const studentId = parseInt(req.params.id);
  const { full_name, email, academic_year, course_ids, is_active, faculty } = req.body;

  db.prepare(`
    UPDATE users
    SET full_name = COALESCE(?, full_name),
        email = COALESCE(?, email),
        academic_year = COALESCE(?, academic_year),
        faculty = COALESCE(?, faculty),
        is_active = COALESCE(?, is_active)
    WHERE id = ? AND role = 'student'
  `).run(
    full_name,
    email ? email.trim().toLowerCase() : null,
    academic_year,
    faculty || null,
    is_active !== undefined ? (is_active ? 1 : 0) : null,
    studentId
  );

  // If course_ids array provided, re-sync student's course access permissions
  if (Array.isArray(course_ids)) {
    db.prepare('DELETE FROM enrollments WHERE user_id = ?').run(studentId);
    const enrollStmt = db.prepare('INSERT OR IGNORE INTO enrollments (user_id, course_id) VALUES (?, ?)');
    course_ids.forEach(cid => enrollStmt.run(studentId, parseInt(cid)));
  }

  try {
    const { savePersistence } = require('../../database/db');
    savePersistence(db);
  } catch (e) {}

  const student = db.prepare('SELECT id, email, full_name, student_id_number, academic_year, is_active, created_at FROM users WHERE id = ?').get(studentId);
  res.json({ message: 'Student information and course access updated successfully', student });
});

router.put('/students/:id/status', requireAuth, (req, res) => {
  if (req.user.role !== 'professor' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only the professor or administrator can modify student access status.' });
  }

  const studentId = parseInt(req.params.id);
  const { is_active } = req.body;

  db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(is_active ? 1 : 0, studentId);
  const student = db.prepare('SELECT id, email, full_name, is_active FROM users WHERE id = ?').get(studentId);

  try {
    const { savePersistence } = require('../../database/db');
    savePersistence(db);
  } catch (e) {}

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
    try {
      const { savePersistence } = require('../../database/db');
      savePersistence(db);
    } catch (e) {}
    logAudit(req.user.id, 'STUDENT_DELETED', 'Deleted student ' + student.email, req);
    res.json({ message: 'Student account ' + student.full_name + ' removed from faculty.' });
  } catch (err) {
    console.error('Delete student error:', err);
    res.status(500).json({ error: 'Failed to delete student: ' + err.message });
  }
});

// 8. Professor Management (List, Create, Update, Delete)
router.get('/professors', requireAuth, (req, res) => {
  if (req.user.role !== 'professor' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Permission denied.' });
  }
  const professors = db.prepare(`
    SELECT u.id, u.email, u.full_name, u.department, u.faculty, u.avatar_url, u.is_active, u.created_at,
      (SELECT COUNT(*) FROM courses c WHERE c.professor_id = u.id) as course_count
    FROM users u
    WHERE u.role = 'professor'
    ORDER BY u.created_at DESC
  `).all();
  res.json({ professors });
});

router.post('/professors', requireAuth, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only an administrator can register new professors.' });
  }
  const { email, password, full_name, department, faculty } = req.body;
  if (!email || !full_name || !password) {
    return res.status(400).json({ error: 'Full name, email, and password are required.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }
  const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(email.trim());
  if (existing) {
    return res.status(400).json({ error: 'An account with this email address already exists.' });
  }
  const hashedPassword = bcrypt.hashSync(password, 10);
  const result = db.prepare(`
    INSERT INTO users (email, password_hash, full_name, role, avatar_url, department, faculty, is_active)
    VALUES (?, ?, ?, 'professor', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150', ?, ?, 1)
  `).run(
    email.trim().toLowerCase(),
    hashedPassword,
    full_name.trim(),
    department || (faculty || 'General') + ' Department',
    faculty || 'General'
  );
  const newProf = db.prepare('SELECT id, email, full_name, role, department, faculty, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
  try {
    const { savePersistence } = require('../../database/db');
    savePersistence(db);
  } catch (e) {}
  logAudit(req.user.id, 'PROFESSOR_CREATED', `Admin registered new professor: ${newProf.email} (Faculty: ${newProf.faculty})`, req);
  res.status(201).json({ message: 'Professor account created successfully', professor: newProf });
});

router.put('/professors/:id', requireAuth, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Permission denied.' });
  }
  const profId = parseInt(req.params.id);
  const { full_name, email, department, faculty, is_active } = req.body;
  db.prepare(`
    UPDATE users
    SET full_name = COALESCE(?, full_name),
        email = COALESCE(?, email),
        department = COALESCE(?, department),
        faculty = COALESCE(?, faculty),
        is_active = COALESCE(?, is_active)
    WHERE id = ? AND role = 'professor'
  `).run(
    full_name,
    email ? email.trim().toLowerCase() : null,
    department,
    faculty,
    is_active !== undefined ? (is_active ? 1 : 0) : null,
    profId
  );
  try {
    const { savePersistence } = require('../../database/db');
    savePersistence(db);
  } catch (e) {}
  const prof = db.prepare('SELECT id, email, full_name, department, faculty, is_active FROM users WHERE id = ?').get(profId);
  res.json({ message: 'Professor updated successfully', professor: prof });
});

router.delete('/professors/:id', requireAuth, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only an administrator can remove professor accounts.' });
  }
  const profId = parseInt(req.params.id);
  if (profId === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own account.' });
  }
  const prof = db.prepare("SELECT id, email, full_name FROM users WHERE id = ? AND role = 'professor'").get(profId);
  if (!prof) {
    return res.status(404).json({ error: 'Professor account not found.' });
  }
  db.prepare('DELETE FROM users WHERE id = ?').run(profId);
  try {
    const { savePersistence } = require('../../database/db');
    savePersistence(db);
  } catch (e) {}
  logAudit(req.user.id, 'PROFESSOR_DELETED', `Deleted professor account: ${prof.email}`, req);
  res.json({ message: `Professor account ${prof.full_name} removed successfully.` });
});

module.exports = router;

