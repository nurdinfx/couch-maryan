const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../../database/db');
const { requireAuth, requireProfessor } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

// 1. Get my certificates (Student)
router.get('/my-certificates', requireAuth, (req, res) => {
  const userId = req.user.id;

  const certificates = db.prepare(`
    SELECT cert.*, c.title as course_title, c.code as course_code,
      u.full_name as student_name, u.student_id_number,
      prof.full_name as professor_name
    FROM certificates cert
    JOIN courses c ON cert.course_id = c.id
    JOIN users u ON cert.user_id = u.id
    LEFT JOIN users prof ON c.professor_id = prof.id
    WHERE cert.user_id = ?
    ORDER BY cert.issued_at DESC
  `).all(userId);

  res.json({ certificates });
});

// 2. Public Certificate Verification by UUID (Requirement 11: unique verification identifier)
router.get('/verify/:uuid', (req, res) => {
  const uuid = req.params.uuid.trim();

  const cert = db.prepare(`
    SELECT cert.*, c.title as course_title, c.code as course_code,
      c.title as title, c.code as code,
      u.full_name as student_name, u.student_id_number, u.department,
      prof.full_name as professor_name
    FROM certificates cert
    JOIN courses c ON cert.course_id = c.id
    JOIN users u ON cert.user_id = u.id
    LEFT JOIN users prof ON c.professor_id = prof.id
    WHERE cert.uuid = ?
  `).get(uuid);

  if (!cert) {
    return res.status(404).json({
      valid: false,
      message: 'Certificate verification failed. No official faculty credential found matching this verification code.'
    });
  }

  res.json({
    valid: true,
    certificate: cert,
    issuer: 'Faculty of Computing & Information Science',
    signatureAuthority: cert.professor_name || 'Prof. Maryam Al-Mansoor, Faculty Academic Director',
    verificationTimestamp: new Date().toISOString()
  });
});

// 3. Issue Certificate Manually (Professor only)
router.post('/issue', requireProfessor, (req, res) => {
  const { user_id, course_id, final_grade } = req.body;

  if (!user_id || !course_id) {
    return res.status(400).json({ error: 'User ID and Course ID are required.' });
  }

  const course = db.prepare('SELECT code, title FROM courses WHERE id = ?').get(course_id);
  const student = db.prepare('SELECT full_name FROM users WHERE id = ?').get(user_id);

  if (!course || !student) {
    return res.status(404).json({ error: 'Student or course not found.' });
  }

  const certUuid = `CERT-${new Date().getFullYear()}-${course.code}-${uuidv4().substring(0, 8).toUpperCase()}`;

  db.prepare(`
    INSERT INTO certificates (uuid, user_id, course_id, final_grade)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, course_id) DO UPDATE SET
      final_grade = excluded.final_grade,
      issued_at = CURRENT_TIMESTAMP
  `).run(certUuid, user_id, course_id, parseFloat(final_grade) || 95.0);

  // Notify student
  db.prepare(`
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (?, 'Official Certificate Awarded!', ?, 'badge', '#/certificates')
  `).run(user_id, `Your official Course Completion Certificate for ${course.code} has been issued.`);

  logAudit(req.user.id, 'CERTIFICATE_ISSUED', `Issued certificate ${certUuid} to ${student.full_name} for ${course.code}`, req);

  const cert = db.prepare('SELECT * FROM certificates WHERE uuid = ?').get(certUuid);
  res.status(201).json({ message: 'Certificate issued successfully', certificate: cert });
});

module.exports = router;
