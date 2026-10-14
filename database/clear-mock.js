const { db, initSchema } = require('./db');
const bcrypt = require('bcryptjs');

function clearMockData() {
  initSchema();

  const tables = [
    'audit_logs', 'notifications', 'messages', 'forum_replies', 'forum_topics',
    'announcements', 'certificates', 'awarded_badges', 'attendance_records',
    'attendance_sessions', 'quiz_attempt_answers', 'quiz_attempts', 'quiz_questions',
    'quizzes', 'assignment_submissions', 'assignments', 'lesson_progress', 'lessons',
    'modules', 'enrollments', 'courses'
  ];

  db.transaction(() => {
    for (const table of tables) {
      db.prepare(`DELETE FROM ${table}`).run();
    }
    // Delete all mock students
    db.prepare("DELETE FROM users WHERE role = 'student'").run();

    // Ensure professor account exists
    let prof = db.prepare('SELECT id FROM users WHERE id = 1').get();
    if (!prof) {
      const hash = bcrypt.hashSync('password123', 10);
      db.prepare(`
        INSERT INTO users (id, email, password_hash, full_name, role, department)
        VALUES (1, 'professor@faculty.edu', ?, 'Prof. Maryam Al-Mansoor', 'professor', 'Faculty of Midwifery')
      `).run(hash);
    }

    // Ensure admin exists
    let admin = db.prepare("SELECT id FROM users WHERE email = 'admin@faculty.edu'").get();
    if (!admin) {
      const hash = bcrypt.hashSync('admin123', 10);
      db.prepare(`
        INSERT INTO users (id, email, password_hash, full_name, role, department)
        VALUES (6, 'admin@faculty.edu', ?, 'Faculty System Admin', 'admin', 'Faculty of Midwifery')
      `).run(hash);
    }
  })();

  console.log('All mock courses, students, and records cleared. System ready for production.');
}

module.exports = { clearMockData };
if (require.main === module) {
  clearMockData();
}
