const express = require('express');
const router = express.Router();
const { db } = require('../../database/db');
const { requireAuth, requireProfessor } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

// 1. Get Course Attendance Sessions & Grid (Professor only)
router.get('/courses/:courseId', requireProfessor, (req, res) => {
  const courseId = parseInt(req.params.courseId);

  const sessions = db.prepare(`
    SELECT * FROM attendance_sessions
    WHERE course_id = ?
    ORDER BY session_date DESC, id DESC
  `).all(courseId);

  const students = db.prepare(`
    SELECT u.id, u.full_name, u.email, u.student_id_number, u.avatar_url
    FROM users u
    JOIN enrollments e ON u.id = e.user_id
    WHERE e.course_id = ? AND u.role = 'student'
    ORDER BY u.full_name ASC
  `).all(courseId);

  const records = db.prepare(`
    SELECT ar.*, asess.course_id
    FROM attendance_records ar
    JOIN attendance_sessions asess ON ar.session_id = asess.id
    WHERE asess.course_id = ?
  `).all(courseId);

  // Group records by student
  const studentStats = students.map(student => {
    const studentRecords = {};
    let presentCount = 0;
    let lateCount = 0;
    let absentCount = 0;
    let excusedCount = 0;

    for (const s of sessions) {
      const rec = records.find(r => r.session_id === s.id && r.user_id === student.id);
      const status = rec ? rec.status : 'not_recorded';
      studentRecords[s.id] = {
        status,
        notes: rec ? rec.notes : ''
      };

      if (status === 'present') presentCount++;
      else if (status === 'late') lateCount++;
      else if (status === 'absent') absentCount++;
      else if (status === 'excused') excusedCount++;
    }

    const totalSessions = sessions.length;
    // Late counts as 0.8 present
    const attendancePct = totalSessions > 0 ?
      Math.min(100, Math.round(((presentCount + (lateCount * 0.8) + excusedCount) / totalSessions) * 100)) : 100;

    return {
      student,
      records: studentRecords,
      stats: {
        present: presentCount,
        late: lateCount,
        absent: absentCount,
        excused: excusedCount,
        attendance_percentage: attendancePct
      }
    };
  });

  res.json({
    sessions,
    studentStats
  });
});

// 2. Create Attendance Session (Professor only)
router.post('/courses/:courseId/sessions', requireProfessor, (req, res) => {
  const courseId = parseInt(req.params.courseId);
  const { session_date, title, description } = req.body;

  if (!session_date || !title) {
    return res.status(400).json({ error: 'Session date and title are required.' });
  }

  const result = db.prepare(`
    INSERT INTO attendance_sessions (course_id, session_date, title, description)
    VALUES (?, ?, ?, ?)
  `).run(courseId, session_date, title.trim(), description || '');

  const newSession = db.prepare('SELECT * FROM attendance_sessions WHERE id = ?').get(result.lastInsertRowid);
  logAudit(req.user.id, 'ATTENDANCE_SESSION_CREATED', `Created session "${title}" for course ${courseId}`, req);

  res.status(201).json({ message: 'Attendance session created', session: newSession });
});

// 3. Save / Update Attendance Records for a Session (Professor only)
router.post('/sessions/:sessionId/records', requireProfessor, (req, res) => {
  const sessionId = parseInt(req.params.sessionId);
  const { records } = req.body; // array of { user_id, status: 'present'|'absent'|'late'|'excused', notes }

  if (!records || !Array.isArray(records)) {
    return res.status(400).json({ error: 'Records array is required.' });
  }

  const session = db.prepare('SELECT course_id, title FROM attendance_sessions WHERE id = ?').get(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found.' });
  }

  const upsert = db.prepare(`
    INSERT INTO attendance_records (session_id, user_id, status, notes)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(session_id, user_id) DO UPDATE SET
      status = excluded.status,
      notes = excluded.notes,
      recorded_at = CURRENT_TIMESTAMP
  `);

  db.transaction(() => {
    for (const r of records) {
      if (['present', 'absent', 'late', 'excused'].includes(r.status)) {
        upsert.run(sessionId, r.user_id, r.status, r.notes || '');

        // Evaluate Perfect Attendance Badge if applicable
        checkAttendanceBadge(r.user_id, session.course_id);
      }
    }
  })();

  logAudit(req.user.id, 'ATTENDANCE_SAVED', `Updated attendance records for session #${sessionId}`, req);

  res.json({ message: 'Attendance records saved successfully.' });
});

// 4. Student View My Attendance (Students see their own records only!)
router.get('/courses/:courseId/my-attendance', requireAuth, (req, res) => {
  const courseId = parseInt(req.params.courseId);
  const userId = req.user.id;

  const sessions = db.prepare(`
    SELECT asess.id, asess.session_date, asess.title, asess.description,
      ar.status, ar.notes, ar.recorded_at
    FROM attendance_sessions asess
    LEFT JOIN attendance_records ar ON asess.id = ar.session_id AND ar.user_id = ?
    WHERE asess.course_id = ?
    ORDER BY asess.session_date DESC
  `).all(userId, courseId);

  let present = 0, late = 0, absent = 0, excused = 0;
  sessions.forEach(s => {
    if (s.status === 'present') present++;
    else if (s.status === 'late') late++;
    else if (s.status === 'absent') absent++;
    else if (s.status === 'excused') excused++;
  });

  const total = sessions.length;
  const pct = total > 0 ? Math.min(100, Math.round(((present + (late * 0.8) + excused) / total) * 100)) : 100;

  res.json({
    sessions,
    stats: {
      total,
      present,
      late,
      absent,
      excused,
      percentage: pct
    }
  });
});

function checkAttendanceBadge(userId, courseId) {
  try {
    const totalSessions = db.prepare('SELECT COUNT(*) as c FROM attendance_sessions WHERE course_id = ?').get(courseId).c;
    if (totalSessions >= 4) {
      const absences = db.prepare(`
        SELECT COUNT(*) as c
        FROM attendance_records ar
        JOIN attendance_sessions s ON ar.session_id = s.id
        WHERE ar.user_id = ? AND s.course_id = ? AND ar.status = 'absent'
      `).get(userId, courseId).c;

      if (absences === 0) {
        db.prepare('INSERT OR IGNORE INTO awarded_badges (badge_id, user_id, course_id) VALUES (?, ?, ?)')
          .run(4, userId, courseId);
      }
    }
  } catch (err) {
    console.error('Attendance badge check error:', err);
  }
}

module.exports = router;
