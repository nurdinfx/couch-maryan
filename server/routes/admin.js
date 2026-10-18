const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { db } = require('../../database/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

// 1. System Health & Diagnostics (Admin only)
router.post('/clear-mock', requireAdmin, (req, res) => {
  try {
    const { clearMockData } = require('../../database/clear-mock');
    clearMockData();
    logAudit(req.user.id, 'MOCK_DATA_CLEARED', 'Cleared all mock courses and test students', req);
    res.json({ success: true, message: 'All mock courses and test students cleared successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Database Backup Download Endpoint (Admin only)
router.get(['/backup', '/backup-db'], requireAdmin, (req, res) => {
  const { dbPath } = require('../../database/db');
  if (!fs.existsSync(dbPath)) {
    return res.status(404).json({ error: 'Database file not found' });
  }
  const dateStr = new Date().toISOString().slice(0, 10);
  const downloadName = `guray_sicid_lms_backup_${dateStr}.db`;
  logAudit(req.user.id, 'DATABASE_BACKUP_DOWNLOAD', `Downloaded backup: ${downloadName}`, req);
  res.download(dbPath, downloadName);
});

router.get('/health', requireAdmin, (req, res) => {
  const { dbPath } = require('../../database/db');
  let dbSizeBytes = 0;
  if (fs.existsSync(dbPath)) {
    dbSizeBytes = fs.statSync(dbPath).size;
  }

  const counts = {
    users: db.prepare('SELECT COUNT(*) as c FROM users').get().c,
    courses: db.prepare('SELECT COUNT(*) as c FROM courses').get().c,
    lessons: db.prepare('SELECT COUNT(*) as c FROM lessons').get().c,
    submissions: db.prepare('SELECT COUNT(*) as c FROM assignment_submissions').get().c,
    quiz_attempts: db.prepare('SELECT COUNT(*) as c FROM quiz_attempts').get().c,
    audit_logs: db.prepare('SELECT COUNT(*) as c FROM audit_logs').get().c,
    certificates: db.prepare('SELECT COUNT(*) as c FROM certificates').get().c
  };

  res.json({
    status: 'healthy',
    systemTime: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: {
      type: 'SQLite3 WAL',
      sizeBytes: dbSizeBytes,
      sizeFormatted: `${(dbSizeBytes / (1024 * 1024)).toFixed(2)} MB`,
      recordsCount: counts
    },
    nodeVersion: process.version,
    platform: process.platform
  });
});

// 2. Audit Logs (Admin only)
router.get('/audit-logs', requireAdmin, (req, res) => {
  const logs = db.prepare(`
    SELECT al.*, u.full_name as user_name, u.email as user_email, u.role as user_role
    FROM audit_logs al
    LEFT JOIN users u ON al.user_id = u.id
    ORDER BY al.created_at DESC
    LIMIT 50
  `).all();

  res.json({ logs });
});

// 3. User Management: Reset password / Toggle status
router.post('/users/:id/reset-password', requireAdmin, (req, res) => {
  const userId = parseInt(req.params.id);
  const { new_password } = req.body;

  if (!new_password || new_password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  const hashedPassword = bcrypt.hashSync(new_password, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashedPassword, userId);

  const targetUser = db.prepare('SELECT full_name, email FROM users WHERE id = ?').get(userId);
  logAudit(req.user.id, 'PASSWORD_RESET', `Admin reset password for user ${targetUser?.email || userId}`, req);
  try {
    const { savePersistence } = require('../../database/db');
    savePersistence(db);
  } catch (e) {}

  res.json({ message: `Password reset successfully for ${targetUser?.full_name || 'user'}.` });
});

// 4. Download Backup (Admin only)
router.get('/backup-db', requireAdmin, (req, res) => {
  const dbPath = path.join(__dirname, '..', '..', 'database', 'faculty_lms.db');
  if (!fs.existsSync(dbPath)) {
    return res.status(404).send('Database file not found');
  }

  logAudit(req.user.id, 'BACKUP_DOWNLOAD', 'Admin exported SQLite database backup', req);
  res.download(dbPath, `faculty_lms_backup_${new Date().toISOString().slice(0, 10)}.db`);
});

// 5. Admin Accounts Management (Register new Admin, List admins, Delete admin)
router.get('/admins', requireAuth, (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'professor') {
    return res.status(403).json({ error: 'Permission denied.' });
  }

  const admins = db.prepare(`
    SELECT id, email, full_name, role, department, avatar_url, is_active, created_at
    FROM users
    WHERE role = 'admin'
    ORDER BY created_at DESC
  `).all();

  res.json({ admins });
});

router.post('/admins', requireAuth, (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'professor') {
    return res.status(403).json({ error: 'Permission denied. Only an administrator can register new admins.' });
  }

  const { full_name, email, password, department } = req.body;
  if (!full_name || !email || !password) {
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
    INSERT INTO users (email, password_hash, full_name, role, avatar_url, department, is_active)
    VALUES (?, ?, ?, 'admin', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', ?, 1)
  `).run(
    email.trim().toLowerCase(),
    hashedPassword,
    full_name.trim(),
    department || 'Guray Sicid Learning Platform Administration'
  );

  const newAdmin = db.prepare('SELECT id, email, full_name, role, department, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);

  try {
    const { savePersistence } = require('../../database/db');
    savePersistence(db);
  } catch (e) {}

  logAudit(req.user.id, 'ADMIN_CREATED', `Registered new admin: ${newAdmin.email}`, req);

  res.status(201).json({ message: 'Admin account created successfully', admin: newAdmin });
});

router.delete('/admins/:id', requireAuth, (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'professor') {
    return res.status(403).json({ error: 'Permission denied.' });
  }

  const targetId = parseInt(req.params.id);
  if (targetId === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own active administrator account.' });
  }

  const adminUser = db.prepare("SELECT id, email, full_name FROM users WHERE id = ? AND role = 'admin'").get(targetId);
  if (!adminUser) {
    return res.status(404).json({ error: 'Admin account not found.' });
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(targetId);

  try {
    const { savePersistence } = require('../../database/db');
    savePersistence(db);
  } catch (e) {}

  logAudit(req.user.id, 'ADMIN_DELETED', `Deleted admin account: ${adminUser.email}`, req);

  res.json({ message: `Admin account ${adminUser.full_name} removed successfully.` });
});

module.exports = router;
