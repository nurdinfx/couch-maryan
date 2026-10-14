const bcrypt = require('bcryptjs');
const { db, initSchema } = require('./db');
const { generateAssets } = require('./create-sample-assets');

async function seed() {
  console.log('Clearing all data and setting up clean system...');
  initSchema();

  const hashedPassword = bcrypt.hashSync('password123', 10);
  const adminPassword = bcrypt.hashSync('admin123', 10);

  // 1. Clear all existing data tables
  const tables = [
    'audit_logs', 'notifications', 'messages', 'forum_replies', 'forum_topics',
    'announcements', 'certificates', 'awarded_badges', 'badges', 'attendance_records',
    'attendance_sessions', 'quiz_attempt_answers', 'quiz_attempts', 'quiz_questions',
    'quizzes', 'assignment_submissions', 'assignments', 'lesson_progress', 'lessons',
    'modules', 'enrollments', 'courses', 'users', 'system_settings'
  ];

  db.transaction(() => {
    for (const table of tables) {
      db.prepare(`DELETE FROM ${table}`).run();
    }
  })();

  console.log('All mock data purged.');

  // 2. Insert Clean Professor and Administrator Accounts
  const insertUser = db.prepare(`
    INSERT INTO users (id, email, password_hash, full_name, role, avatar_url, student_id_number, department, bio)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertUser.run(
    1,
    'professor@faculty.edu',
    hashedPassword,
    'Prof. Maryam Al-Mansoor',
    'professor',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    null,
    'Faculty of Computing & Information Science',
    'Associate Professor of Distributed Systems & Cloud Infrastructure.'
  );

  insertUser.run(
    2,
    'admin@faculty.edu',
    adminPassword,
    'Faculty Administrator',
    'admin',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    null,
    'Office of the Dean',
    'Systems Administrator & Academic Registrar.'
  );

  // 3. Default System Settings
  const insertSetting = db.prepare(`INSERT INTO system_settings (key, value) VALUES (?, ?)`);
  insertSetting.run('faculty_name', 'Faculty of Computing & Information Science');
  insertSetting.run('institution_name', 'Faculty Academic Portal');
  insertSetting.run('primary_professor', 'Prof. Maryam Al-Mansoor');
  insertSetting.run('moodle_theme', 'boost_light');
  insertSetting.run('allow_student_self_registration', 'true');

  console.log('System successfully reset to clean production state!');
}


module.exports = { seed };

if (require.main === module) {
  seed();
}
