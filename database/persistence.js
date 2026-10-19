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

    // Only restore if database is empty or has 0 courses/users, or if explicitly forced
    if (force || usersCount === 0 || coursesCount === 0) {
      console.log(`Restoring database from snapshot (users: ${usersCount}, courses: ${coursesCount}, forced: ${force})...`);
      const tx = db.transaction(() => {
        if (force) {
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
      // Checkpoint WAL to flush all restored tables to disk
      try { db.pragma('wal_checkpoint(TRUNCATE)'); } catch (e) {}
      console.log('Database successfully hydrated and synced from persistent snapshot.');
    } else {
      console.log(`Database already has active data (${usersCount} users, ${coursesCount} courses). Skipping auto-restore.`);
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
