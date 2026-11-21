const { db, initSchema } = require('./db');
const bcrypt = require('bcryptjs');

function clearMockData() {
  initSchema();

  const mockCourseCodes = ['CS301', 'CS204', 'CS410'];
  const mockStudentEmails = [
    'alex.chen@student.faculty.edu',
    'fatima.z@student.faculty.edu',
    'marcus.v@student.faculty.edu',
    'layla.k@student.faculty.edu'
  ];

  db.transaction(() => {
    // Find mock course IDs
    const mockCourses = db.prepare(`SELECT id FROM courses WHERE code IN (${mockCourseCodes.map(() => '?').join(',')})`).all(...mockCourseCodes);
    const mockCourseIds = mockCourses.map(c => c.id);

    if (mockCourseIds.length > 0) {
      const placeholders = mockCourseIds.map(() => '?').join(',');
      // Delete related records for mock courses only
      try { db.prepare(`DELETE FROM enrollments WHERE course_id IN (${placeholders})`).run(...mockCourseIds); } catch (e) {}
      try { db.prepare(`DELETE FROM lesson_progress WHERE course_id IN (${placeholders})`).run(...mockCourseIds); } catch (e) {}
      try { db.prepare(`DELETE FROM lessons WHERE course_id IN (${placeholders})`).run(...mockCourseIds); } catch (e) {}
      try { db.prepare(`DELETE FROM modules WHERE course_id IN (${placeholders})`).run(...mockCourseIds); } catch (e) {}
      try { db.prepare(`DELETE FROM assignments WHERE course_id IN (${placeholders})`).run(...mockCourseIds); } catch (e) {}
      try { db.prepare(`DELETE FROM quizzes WHERE course_id IN (${placeholders})`).run(...mockCourseIds); } catch (e) {}
      try { db.prepare(`DELETE FROM courses WHERE id IN (${placeholders})`).run(...mockCourseIds); } catch (e) {}
    }

    // Delete only mock students
    db.prepare(`DELETE FROM users WHERE email IN (${mockStudentEmails.map(() => '?').join(',')})`).run(...mockStudentEmails);

    // Ensure professor account exists
    let prof = db.prepare('SELECT id FROM users WHERE id = 1').get();
    if (!prof) {
      const hash = bcrypt.hashSync('password123', 10);
      db.prepare(`
        INSERT INTO users (id, email, password_hash, full_name, role, department)
        VALUES (1, 'professor@faculty.edu', ?, 'Prof. Maryam Al-Mansoor', 'professor', 'Guray Sicid Learning Platform')
      `).run(hash);
    }

    // Ensure admin exists
    let admin = db.prepare("SELECT id FROM users WHERE email = 'admin@faculty.edu'").get();
    if (!admin) {
      const hash = bcrypt.hashSync('admin123', 10);
      db.prepare(`
        INSERT INTO users (id, email, password_hash, full_name, role, department)
        VALUES (6, 'admin@faculty.edu', ?, 'Faculty System Admin', 'admin', 'Guray Sicid Learning Platform Operations')
      `).run(hash);
    }
  })();

  const { savePersistence } = require('./persistence');
  savePersistence(db);
  console.log('Mock demo courses and students cleared without touching real data.');
}

module.exports = { clearMockData };
if (require.main === module) {
  clearMockData();
}
