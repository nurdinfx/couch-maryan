const { Pool } = require('pg');

let _pool = null;

function getPool() {
  const connString = (process.env.DATABASE_URL || process.env.DIRECT_URL || '').trim();
  if (!connString) return null;
  if (!_pool) {
    _pool = new Pool({
      connectionString: connString,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000
    });
    _pool.on('error', (err) => {
      console.warn('[Supabase] Pool background error:', err.message);
    });
  }
  return _pool;
}

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
 * Fetch latest database snapshot directly from Supabase PostgreSQL
 */
async function fetchLatestFromSupabase() {
  const pool = getPool();
  if (!pool) {
    console.log('[Supabase] No DATABASE_URL found. Skipping Supabase fetch.');
    return null;
  }

  try {
    console.log('[Supabase] Connecting to Supabase Cloud PostgreSQL...');
    const snapshot = {};
    let totalRows = 0;

    for (const table of TABLES) {
      try {
        const res = await pool.query(`SELECT * FROM ${table}`);
        snapshot[table] = res.rows || [];
        totalRows += snapshot[table].length;
      } catch (tableErr) {
        // Table might not exist or be empty
        snapshot[table] = [];
      }
    }

    const userCount = snapshot.users ? snapshot.users.length : 0;
    const courseCount = snapshot.courses ? snapshot.courses.length : 0;
    console.log(`[Supabase] ✅ Successfully fetched live data from Supabase (${userCount} users, ${courseCount} courses, ${totalRows} total rows).`);
    return snapshot;
  } catch (err) {
    console.error('[Supabase] ⚠️ Failed to fetch from Supabase:', err.message);
    return null;
  }
}

/**
 * Upsert a snapshot of rows into Supabase PostgreSQL
 */
async function syncToSupabase(snapshot) {
  const pool = getPool();
  if (!pool || !snapshot) return false;

  try {
    for (const table of TABLES) {
      const rows = snapshot[table];
      if (!Array.isArray(rows) || rows.length === 0) continue;

      for (const row of rows) {
        const keys = Object.keys(row);
        if (keys.length === 0) continue;

        const cols = keys.join(', ');
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
        const values = keys.map(k => row[k]);

        // Primary key conflict target
        let conflictClause = 'ON CONFLICT DO NOTHING';
        if (table === 'system_settings') {
          conflictClause = 'ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value';
        } else if (row.id) {
          const updateSets = keys.filter(k => k !== 'id').map(k => `${k} = EXCLUDED.${k}`).join(', ');
          if (updateSets.length > 0) {
            conflictClause = `ON CONFLICT (id) DO UPDATE SET ${updateSets}`;
          }
        }

        const queryText = `INSERT INTO ${table} (${cols}) VALUES (${placeholders}) ${conflictClause}`;
        try {
          await pool.query(queryText, values);
        } catch (rowErr) {
          // ignore individual duplicate or foreign key constraint mismatches
        }
      }
    }
    console.log('[Supabase] ✅ Live state synced to Supabase Cloud.');
    return true;
  } catch (err) {
    console.warn('[Supabase] ⚠️ Sync error:', err.message);
    return false;
  }
}

module.exports = {
  getPool,
  fetchLatestFromSupabase,
  syncToSupabase
};
