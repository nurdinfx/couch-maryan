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
  'audit_logs',
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
 * Restore (hydrate) SQLite from persistent_data.json or a custom snapshot object.
 * @param {object} [db] - Database instance
 * @param {object} [customSnapshot] - Optional in-memory snapshot object to restore
 * @param {boolean} [saveToDisk=false] - Whether to write the snapshot to persistent_data.json
 */
function restorePersistence(db, customSnapshot = null, saveToDisk = false) {
  if (!db) {
    const { db: defaultDb } = require('./db');
    db = defaultDb;
  }

  let snapshot = customSnapshot;

  if (!snapshot) {
    if (!fs.existsSync(PERSISTENCE_FILE)) {
      console.log('[Persistence] No local snapshot found — saving current DB state.');
      savePersistence(db);
      return { success: true, usersCount: 0, coursesCount: 0, totalRestoredRecords: 0 };
    }

    try {
      const raw = fs.readFileSync(PERSISTENCE_FILE, 'utf8');
      if (!raw.trim()) return { success: false, error: 'Empty persistence file' };
      snapshot = JSON.parse(raw);
    } catch (err) {
      console.error('[Persistence] Error reading persistence file:', err.message);
      return { success: false, error: err.message };
    }
  }

  const result = _hydrateDB(db, snapshot);

  // If saveToDisk is true (e.g. from an admin upload or explicit restore),
  // write this snapshot to persistent_data.json and sync to remotes
  if (saveToDisk && snapshot) {
    try {
      const dir = path.dirname(PERSISTENCE_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(PERSISTENCE_FILE, JSON.stringify(snapshot, null, 2), 'utf8');
      scheduleSyncToGitHub(PERSISTENCE_FILE);
      try {
        const { syncToSupabase } = require('./supabase-sync');
        syncToSupabase(snapshot).catch(e => console.warn('[Supabase Sync Warning]:', e.message));
      } catch (e) {}
    } catch (err) {
      console.error('[Persistence] Error saving custom snapshot to file:', err.message);
    }
  }

  return result;
}

/**
 * Hydrate SQLite database from a snapshot object (internal)
 */
function _hydrateDB(db, snapshot) {
  try {
    // Support nested snapshot structures: { data: { users, courses } } or direct { users, courses }
    const data = (snapshot && snapshot.data && typeof snapshot.data === 'object' && !Array.isArray(snapshot.data))
      ? snapshot.data
      : snapshot;

    if (!data || typeof data !== 'object') {
      console.warn('[Persistence] Snapshot is not a valid object.');
      return { success: false, error: 'Invalid snapshot format' };
    }

    const snapshotCourses = Array.isArray(data.courses) ? data.courses : [];
    const snapshotUsers = Array.isArray(data.users) ? data.users : [];

    if (snapshotUsers.length === 0 && snapshotCourses.length === 0) {
      console.log('[Persistence] Snapshot has 0 users and 0 courses. Keeping current database state.');
      return { success: false, message: 'Snapshot contains no users or courses.' };
    }

    console.log(`[Persistence] Hydrating database from snapshot (${snapshotUsers.length} users, ${snapshotCourses.length} courses)...`);

    // Temporarily disable foreign keys during hydration to avoid constraint violations during table clearing/re-ordering
    db.pragma('foreign_keys = OFF');

    let totalRestoredRecords = 0;

    const tx = db.transaction(() => {
      for (const table of TABLES) {
        const rows = data[table];
        if (!rows || !Array.isArray(rows)) continue;

        // Clear existing rows in this table before inserting restored rows
        try {
          db.prepare(`DELETE FROM ${table}`).run();
        } catch (e) {
          console.warn(`[Persistence] Notice clearing table ${table}:`, e.message);
        }

        // Insert rows from snapshot
        for (const row of rows) {
          const cols = Object.keys(row);
          if (cols.length === 0) continue;
          const placeholders = cols.map(() => '?').join(', ');
          const values = Object.values(row);
          try {
            db.prepare(`
              INSERT OR REPLACE INTO ${table} (${cols.join(', ')})
              VALUES (${placeholders})
            `).run(...values);
            totalRestoredRecords++;
          } catch (e) {
            console.error(`[Persistence] Error inserting row into ${table}:`, e.message);
          }
        }
      }
    });
    tx();

    // Re-enable foreign keys
    db.pragma('foreign_keys = ON');

    // Checkpoint WAL to flush all restored tables to disk immediately
    try { db.pragma('wal_checkpoint(TRUNCATE)'); } catch (e) {}

    const usersCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
    const coursesCount = db.prepare('SELECT COUNT(*) as c FROM courses').get().c;
    console.log(`[Persistence] ✅ Database hydrated successfully (${usersCount} users, ${coursesCount} courses, ${totalRestoredRecords} total records).`);

    return {
      success: true,
      usersCount,
      coursesCount,
      totalRestoredRecords
    };
  } catch (err) {
    try { db.pragma('foreign_keys = ON'); } catch (e) {}
    console.error('[Persistence] Failed to hydrate database:', err.message);
    throw err;
  }
}

module.exports = {
  savePersistence,
  restorePersistence,
  PERSISTENCE_FILE,
  TABLES
};
