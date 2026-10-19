const fs = require('fs');
const path = require('path');
const { scheduleSyncToGitHub } = require('./github-sync');

const PERSISTENCE_FILE = process.env.DATA_DIR
  ? path.join(process.env.DATA_DIR, 'persistent_data.json')
  : path.join(__dirname, 'persistent_data.json');

const TABLES = [
  'users',
  'courses',
  'enrollments',
  'modules',
  'lessons',
  'lesson_progress',
  'assignments',
  'assignment_submissions',
  'quizzes',
  'quiz_questions',
  'quiz_attempts',
  'quiz_attempt_answers',
  'attendance_sessions',
  'attendance_records',
  'badges',
  'awarded_badges',
  'certificates',
  'announcements',
  'forum_topics',
  'forum_replies',
  'messages',
  'notifications',
  'system_settings'
];

/**
 * Save current database contents to persistent_data.json and flush SQLite WAL
 */
function savePersistence(db) {
  if (!db) {
    const { db: defaultDb } = require('./db');
    db = defaultDb;
  }
  try {
    // Flush WAL journal into the main faculty_lms.db database file
    try {
      db.pragma('wal_checkpoint(TRUNCATE)');
    } catch (e) {}

    const snapshot = {};
    for (const table of TABLES) {
      try {
        snapshot[table] = db.prepare(`SELECT * FROM ${table}`).all();
      } catch (err) {
        snapshot[table] = [];
      }
    }

    const dir = path.dirname(PERSISTENCE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Safety guard: If an existing persistent snapshot has real courses (e.g. BMW2026),
    // and current DB has 0 real courses and only mock courses, DO NOT wipe persistent_data.json!
    if (fs.existsSync(PERSISTENCE_FILE)) {
      try {
        const rawExisting = fs.readFileSync(PERSISTENCE_FILE, 'utf8');
        if (rawExisting.trim()) {
          const existing = JSON.parse(rawExisting);
          const existingRealCourses = (existing.courses || []).filter(c => !['CS301', 'CS204', 'CS410'].includes(c.code));
          const currentRealCourses = (snapshot.courses || []).filter(c => !['CS301', 'CS204', 'CS410'].includes(c.code));

          if (existingRealCourses.length > 0 && currentRealCourses.length === 0) {
            console.warn('[Persistence] Safety Guard: Prevented overwriting real persistent data with mock/empty courses.');
            return false;
          }

          // Create an automatic rolling backup before writing
          const backupFile = PERSISTENCE_FILE.replace('.json', '.backup.json');
          fs.writeFileSync(backupFile, rawExisting, 'utf8');
        }
      } catch (e) {
        console.error('[Persistence] Backup check notice:', e.message);
      }
    }

    fs.writeFileSync(PERSISTENCE_FILE, JSON.stringify(snapshot, null, 2), 'utf8');

    // ── Auto-sync to GitHub so Render re-deploys keep the latest data ──
    scheduleSyncToGitHub(PERSISTENCE_FILE);

    return true;
  } catch (err) {
    console.error('Failed to save persistence JSON:', err.message);
    return false;
  }
}

/**
 * Restore data from snapshot object or persistent_data.json into SQLite
 */
function restorePersistence(db, customSnapshot = null, force = false) {
  if (!db) {
    const { db: defaultDb } = require('./db');
    db = defaultDb;
  }

  let snapshot = customSnapshot;
  if (!snapshot) {
    if (!fs.existsSync(PERSISTENCE_FILE)) {
      savePersistence(db);
      return;
    }
    try {
      const raw = fs.readFileSync(PERSISTENCE_FILE, 'utf8');
      if (!raw.trim()) return;
      snapshot = JSON.parse(raw);
    } catch (err) {
      console.error('Error reading persistence file:', err.message);
      return;
    }
  }

  try {
    const usersCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
    const coursesCount = db.prepare('SELECT COUNT(*) as c FROM courses').get().c;
    const mockCoursesCount = db.prepare("SELECT COUNT(*) as c FROM courses WHERE code IN ('CS301', 'CS204', 'CS410')").get().c;

    const snapshotCourses = Array.isArray(snapshot.courses) ? snapshot.courses : [];
    const realCoursesInSnapshot = snapshotCourses.filter(c => !['CS301', 'CS204', 'CS410'].includes(c.code));

    // Check if any course from snapshot is missing from DB
    const missingSnapshotCourse = snapshotCourses.length > 0 && snapshotCourses.some(c => !db.prepare('SELECT id FROM courses WHERE code = ?').get(c.code));

    // Check if any student from snapshot is missing from DB
    const snapshotStudents = Array.isArray(snapshot.users) ? snapshot.users.filter(u => u.role === 'student') : [];
    const missingSnapshotStudent = snapshotStudents.length > 0 && snapshotStudents.some(u => !db.prepare('SELECT id FROM users WHERE email = ?').get(u.email));

    // Stale mock data detected if DB has mock courses while snapshot has real courses
    const hasStaleMockData = mockCoursesCount > 0 && realCoursesInSnapshot.length > 0;

    const shouldRestore = force ||
      usersCount === 0 ||
      coursesCount === 0 ||
      hasStaleMockData ||
      missingSnapshotCourse ||
      missingSnapshotStudent;

    if (shouldRestore) {
      console.log(`[Persistence] Hydrating database from snapshot (users: ${usersCount}, courses: ${coursesCount}, mockInDb: ${mockCoursesCount}, force: ${force}, missingCourse: ${missingSnapshotCourse}, missingStudent: ${missingSnapshotStudent})...`);
      const tx = db.transaction(() => {
        // Clear all tables if forced, or if database had mock data or missing courses to avoid conflict
        if (force || hasStaleMockData || missingSnapshotCourse) {
          for (let i = TABLES.length - 1; i >= 0; i--) {
            try { db.prepare(`DELETE FROM ${TABLES[i]}`).run(); } catch (e) {}
          }
        }

        for (const table of TABLES) {
          const rows = snapshot[table];
          if (!rows || !Array.isArray(rows) || rows.length === 0) continue;

          for (const row of rows) {
            const cols = Object.keys(row);
            const placeholders = cols.map(() => '?').join(', ');
            const values = Object.values(row);

            db.prepare(`
              INSERT OR REPLACE INTO ${table} (${cols.join(', ')})
              VALUES (${placeholders})
            `).run(...values);
          }
        }
      });
      tx();

      // Checkpoint WAL to flush all restored tables to disk immediately
      try { db.pragma('wal_checkpoint(TRUNCATE)'); } catch (e) {}
      console.log('[Persistence] ✅ Database successfully hydrated and synced from persistent snapshot.');
    } else {
      console.log(`[Persistence] Database active and in sync (${usersCount} users, ${coursesCount} courses).`);
    }
  } catch (err) {
    console.error('Failed to restore persistence:', err.message);
  }
}

module.exports = {
  savePersistence,
  restorePersistence,
  PERSISTENCE_FILE,
  TABLES
};
