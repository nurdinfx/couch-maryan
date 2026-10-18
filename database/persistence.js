const fs = require('fs');
const path = require('path');

const PERSISTENCE_FILE = path.join(process.env.DATA_DIR || __dirname, 'persistent_data.json');

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
 * Save current database contents to persistent_data.json
 */
function savePersistence(db) {
  if (!db) {
    const { db: defaultDb } = require('./db');
    db = defaultDb;
  }
  try {
    const snapshot = {};
    for (const table of TABLES) {
      try {
        snapshot[table] = db.prepare(`SELECT * FROM ${table}`).all();
      } catch (err) {
        snapshot[table] = [];
      }
    }
    fs.writeFileSync(PERSISTENCE_FILE, JSON.stringify(snapshot, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Failed to save persistence JSON:', err.message);
    return false;
  }
}

/**
 * Restore data from persistent_data.json into SQLite if database is empty or needs hydration
 */
function restorePersistence(db) {
  if (!db) {
    const { db: defaultDb } = require('./db');
    db = defaultDb;
  }
  if (!fs.existsSync(PERSISTENCE_FILE)) {
    // If persistent_data.json doesn't exist, create it from current db
    savePersistence(db);
    return;
  }

  try {
    const raw = fs.readFileSync(PERSISTENCE_FILE, 'utf8');
    if (!raw.trim()) return;
    const snapshot = JSON.parse(raw);

    const usersCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;

    // CRITICAL: NEVER overwrite or wipe an existing database.
    // Only hydrate from snapshot if the database is 100% brand new (0 users).
    if (usersCount === 0 && snapshot.users && snapshot.users.length > 0) {
      console.log('Fresh database detected (0 users). Initializing initial base data...');
      const tx = db.transaction(() => {
        for (const table of TABLES) {
          const rows = snapshot[table];
          if (!rows || !Array.isArray(rows) || rows.length === 0) continue;

          for (const row of rows) {
            const cols = Object.keys(row);
            const placeholders = cols.map(() => '?').join(', ');
            const values = Object.values(row);

            db.prepare(`
              INSERT OR IGNORE INTO ${table} (${cols.join(', ')})
              VALUES (${placeholders})
            `).run(...values);
          }
        }
      });
      tx();
      console.log('Database successfully initialized from initial template.');
    } else {
      console.log(`Database already has active data (${usersCount} users). Skipping restore to protect live records.`);
    }
  } catch (err) {
    console.error('Failed to restore persistence JSON:', err.message);
  }
}

module.exports = {
  savePersistence,
  restorePersistence,
  PERSISTENCE_FILE
};
