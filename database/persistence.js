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

    // Safety guard: If an existing persistent snapshot has real courses,
    // and current DB has 0 real courses and only mock courses, DO NOT wipe it!
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

    // Auto-sync to GitHub so Render re-deploys keep the latest data
    scheduleSyncToGitHub(PERSISTENCE_FILE);

    // Auto-sync to Supabase Cloud PostgreSQL in real-time
    try {
      const { syncToSupabase } = require('./supabase-sync');
      syncToSupabase(snapshot).catch(err => console.warn('[Supabase] Background sync warning:', err.message));
    } catch (e) {}

    return true;
  } catch (err) {
    console.error('Failed to save persistence JSON:', err.message);
    return false;
  }
}

/**
 * Restore (hydrate) SQLite from persistent_data.json.
 * Call this AFTER fetching the latest snapshot from GitHub (done in server/index.js startup).
 * This function is synchronous — it reads from the local file only.
 */
function restorePersistence(db) {
  if (!db) {
    const { db: defaultDb } = require('./db');
    db = defaultDb;
  }

  if (!fs.existsSync(PERSISTENCE_FILE)) {
    console.log('[Persistence] No local snapshot found — saving current DB state.');
    savePersistence(db);
    return;
  }

  let snapshot;
  try {
    const raw = fs.readFileSync(PERSISTENCE_FILE, 'utf8');
    if (!raw.trim()) return;
    snapshot = JSON.parse(raw);
  } catch (err) {
    console.error('[Persistence] Error reading persistence file:', err.message);
    return;
  }

  _hydrateDB(db, snapshot);
}

/**
 * Hydrate SQLite database from a snapshot object (internal)
 */
function _hydrateDB(db, snapshot) {
  try {
    const snapshotCourses = Array.isArray(snapshot.courses) ? snapshot.courses : [];
    const snapshotUsers = Array.isArray(snapshot.users) ? snapshot.users : [];

    if (snapshotUsers.length === 0 && snapshotCourses.length === 0) {
      console.log('[Persistence] Snapshot is empty. Keeping current database state.');
      return;
    }

    console.log(`[Persistence] Hydrating database from snapshot (${snapshotUsers.length} users, ${snapshotCourses.length} courses)...`);

    const tx = db.transaction(() => {
      for (const table of TABLES) {
        const rows = snapshot[table];
        if (!rows || !Array.isArray(rows)) continue;

        // For users and courses, delete any row not present in snapshot to prevent ghost accounts
        if (['users', 'courses'].includes(table) && rows.length > 0) {
          const validIds = rows.map(r => r.id).filter(id => id !== undefined && id !== null);
          if (validIds.length > 0) {
            const placeholders = validIds.map(() => '?').join(',');
            try {
              db.prepare(`DELETE FROM ${table} WHERE id NOT IN (${placeholders})`).run(...validIds);
            } catch (e) {}
          }
        }

        // Insert or update all rows from snapshot
        for (const row of rows) {
          const cols = Object.keys(row);
          const placeholders = cols.map(() => '?').join(', ');
          const values = Object.values(row);
          try {
            db.prepare(`
              INSERT OR REPLACE INTO ${table} (${cols.join(', ')})
              VALUES (${placeholders})
            `).run(...values);
          } catch (e) {}
        }
      }
    });
    tx();

    // Checkpoint WAL to flush all restored tables to disk immediately
    try { db.pragma('wal_checkpoint(TRUNCATE)'); } catch (e) {}

    const usersCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
    const coursesCount = db.prepare('SELECT COUNT(*) as c FROM courses').get().c;
    console.log(`[Persistence] ✅ Database hydrated and in sync (${usersCount} users, ${coursesCount} courses).`);
  } catch (err) {
    console.error('[Persistence] Failed to hydrate database:', err.message);
  }
}

module.exports = {
  savePersistence,
  restorePersistence,
  PERSISTENCE_FILE,
  TABLES
};
