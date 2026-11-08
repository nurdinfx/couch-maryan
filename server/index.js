const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

const { db, initSchema } = require('../database/db');
const { generateAssets } = require('../database/create-sample-assets');
const { seed } = require('../database/seed-data');
const { clearMockData } = require('../database/clear-mock');
const { savePersistence, restorePersistence, PERSISTENCE_FILE } = require('../database/persistence');
const { fetchLatestFromGitHub, getSyncConfig } = require('../database/github-sync');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

// Security and utility middlewares
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ═══════════════════════════════════════════════════════════════
//  STARTUP SEQUENCE
//  1. Init DB schema
//  2. If GITHUB_TOKEN set → fetch LATEST data from GitHub first
//  3. Hydrate SQLite from that data
//  4. Ensure default accounts exist
//  5. Start listening
// ═══════════════════════════════════════════════════════════════
async function startServer() {
  // Step 1: Initialize schema
  initSchema();
  generateAssets();

  let activeSnapshot = null;

  // Step 2a: If DATABASE_URL is provided, fetch latest from Supabase Cloud first
  if (process.env.DATABASE_URL || process.env.DIRECT_URL) {
    console.log('[Startup] DATABASE_URL found — fetching live data from Supabase Cloud...');
    try {
      const { fetchLatestFromSupabase } = require('../database/supabase-sync');
      const supabaseSnapshot = await fetchLatestFromSupabase();
      if (supabaseSnapshot && (supabaseSnapshot.users?.length > 0 || supabaseSnapshot.courses?.length > 0)) {
        activeSnapshot = supabaseSnapshot;
        console.log(`[Startup] ✅ Loaded live Supabase snapshot (${(supabaseSnapshot.users || []).length} users, ${(supabaseSnapshot.courses || []).length} courses).`);
      }
    } catch (err) {
      console.warn('[Startup] Supabase fetch error (fallback to GitHub/local):', err.message);
    }
  }

  // Step 2b: Fetch latest from GitHub if token is available
  const config = getSyncConfig();
  if (config.token) {
    console.log('[Startup] GITHUB_TOKEN found — checking latest data from GitHub...');
    try {
      const remoteSnapshot = await fetchLatestFromGitHub();
      if (remoteSnapshot && (remoteSnapshot.users || []).length > 0) {
        // Compare with Supabase: keep whichever has more or equal users/courses
        const supabaseUserCount = activeSnapshot ? (activeSnapshot.users || []).length : 0;
        const gitUserCount = (remoteSnapshot.users || []).length;
        if (!activeSnapshot || gitUserCount > supabaseUserCount) {
          activeSnapshot = remoteSnapshot;
          console.log(`[Startup] ✅ GitHub snapshot is newer/larger (${gitUserCount} users vs ${supabaseUserCount} in Supabase). Using GitHub.`);
        } else {
          console.log(`[Startup] ✅ Supabase snapshot has ${supabaseUserCount} users (vs ${gitUserCount} in GitHub). Retaining Supabase data.`);
        }
      }
    } catch (err) {
      console.error('[Startup] GitHub fetch error:', err.message);
    }
  } else {
    console.log('[Startup] No GITHUB_TOKEN — using local persistent_data.json only.');
  }

  if (activeSnapshot) {
    try {
      fs.writeFileSync(PERSISTENCE_FILE, JSON.stringify(activeSnapshot, null, 2), 'utf8');
      console.log('[Startup] ✅ Master snapshot written to local persistence file.');
    } catch (e) {
      console.warn('[Startup] Could not write master snapshot locally:', e.message);
    }
  }

  // Step 3: Hydrate SQLite from local file (which may now be freshly fetched from GitHub)
  restorePersistence(db);

  // Step 4: Ensure default system accounts exist
  try {
    let admin = db.prepare("SELECT id FROM users WHERE email = 'admin@faculty.edu'").get();
    if (!admin) {
      const hash = bcrypt.hashSync('admin123', 10);
      db.prepare(`
        INSERT INTO users (email, password_hash, full_name, role, department)
        VALUES ('admin@faculty.edu', ?, 'Faculty System Admin', 'admin', 'Guray Sicid Learning Platform')
      `).run(hash);
      console.log('[Startup] Created default admin account: admin@faculty.edu');
    }

    let prof = db.prepare("SELECT id FROM users WHERE email = 'professor@faculty.edu'").get();
    if (!prof) {
      const profCount = db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'professor'").get().c;
      if (profCount === 0) {
        const hash = bcrypt.hashSync('password123', 10);
        db.prepare(`
          INSERT INTO users (email, password_hash, full_name, role, department)
          VALUES ('professor@faculty.edu', ?, 'Prof. Maryam Al-Mansoor', 'professor', 'Guray Sicid Learning Platform')
        `).run(hash);
        console.log('[Startup] Created default professor account.');
      }
    }
  } catch (err) {
    console.error('[Startup] Init check error:', err);
  }

  // Auto-persistence middleware: sync database snapshot to JSON whenever data is modified
  app.use((req, res, next) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && req.path.startsWith('/api')) {
      res.on('finish', () => {
        if (res.statusCode >= 200 && res.statusCode < 400) {
          try {
            savePersistence(db);
          } catch (err) {
            console.error('Auto-persistence sync notice:', err.message);
          }
        }
      });
    }
    next();
  });

  // Static file hosting for uploaded educational media (videos, PDFs, submissions)
  const uploadsDir = process.env.UPLOADS_DIR || (process.env.DATA_DIR ? path.join(process.env.DATA_DIR, 'uploads') : path.join(__dirname, '..', 'uploads'));
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Dedicated robust handler for /uploads
  app.use('/uploads', async (req, res, next) => {
    const rawPath = req.path || '';
    const cleanRelative = decodeURIComponent(rawPath).replace(/^[\\/]+/, '').replace(/\\/g, '/');
    const fullLocalPath = path.join(uploadsDir, cleanRelative);

    // 1. If file exists on local disk, serve it immediately!
    if (fs.existsSync(fullLocalPath) && fs.statSync(fullLocalPath).isFile()) {
      if (cleanRelative.toLowerCase().endsWith('.pdf')) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline');
      }
      return res.sendFile(fullLocalPath);
    }

    // 2. If missing on local disk, try fetching from GitHub repository (handles cold starts / redeploys)
    const repoBranch = process.env.GITHUB_BRANCH || 'main';
    const repoOwner = process.env.GITHUB_OWNER || 'nurdinfx';
    const repoName = process.env.GITHUB_REPO || 'couch-maryan';
    const remoteUrl = `https://raw.githubusercontent.com/${repoOwner}/${repoName}/${repoBranch}/uploads/${cleanRelative}`;

    try {
      console.log(`[Uploads] Local file missing (${cleanRelative}). Trying GitHub fetch...`);
      const headers = { 'User-Agent': 'GurayLMS-FileFetcher/1.0' };
      if (process.env.GITHUB_TOKEN) {
        headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN.trim()}`;
      }
      const remoteRes = await fetch(remoteUrl, { headers });
      if (remoteRes.ok) {
        const buffer = Buffer.from(await remoteRes.arrayBuffer());
        // Cache to local disk
        try {
          const dir = path.dirname(fullLocalPath);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(fullLocalPath, buffer);
          console.log(`[Uploads] ✅ Downloaded and cached from GitHub: ${cleanRelative}`);
        } catch (e) {}

        if (cleanRelative.toLowerCase().endsWith('.pdf')) {
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', 'inline');
        }
        return res.send(buffer);
      }
    } catch (err) {
      console.warn(`[Uploads] Could not fetch remote file: ${err.message}`);
    }

    // 3. File is NOT on disk and NOT on GitHub:
    // IMPORTANT: DO NOT SEND index.html! Return clean, friendly Somali/English 404 document notice!
    if (cleanRelative.toLowerCase().endsWith('.pdf')) {
      res.status(404);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(`
        <!DOCTYPE html>
        <html lang="so">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Faylka PDF-ka lama helin</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0b132b; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
            .card { background: #1c2541; border: 1px solid #3a506b; border-radius: 14px; padding: 2.2rem; max-width: 520px; text-align: center; box-shadow: 0 15px 35px rgba(0,0,0,0.4); }
            .icon { font-size: 3rem; margin-bottom: 0.8rem; }
            h2 { color: #f59e0b; font-size: 1.35rem; margin: 0 0 0.75rem 0; }
            p { color: #cbd5e1; font-size: 0.92rem; line-height: 1.6; margin: 0 0 1.25rem 0; }
            .badge { display: inline-block; background: rgba(245, 158, 11, 0.15); color: #f59e0b; padding: 0.35rem 0.8rem; border-radius: 999px; font-size: 0.8rem; font-weight: 700; margin-bottom: 1rem; }
            .btn { display: inline-block; background: #2563eb; color: white; padding: 0.75rem 1.4rem; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 0.88rem; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">📄⚠️</div>
            <div class="badge">Document Update Notice</div>
            <h2>Faylkan Lama Helin (File Not Found)</h2>
            <p>
              Document-kan PDF-ka ah ma yaalo server-ka xilligan ama platform-ka ayaa dib u cusboonaaday.<br><br>
              <strong>Fadlan bare-weynaha casharka (Prof. Maryam) ha dib ugu soo shubo faylkan (Edit Lesson &rarr; Re-upload PDF).</strong>
            </p>
            <a href="javascript:history.back()" class="btn">&larr; Dib u noqo (Go Back)</a>
          </div>
        </body>
        </html>
      `);
    }

    return res.status(404).json({ error: `Faylka la codsaday lama helin: ${cleanRelative}` });
  });

  // Static files for client frontend
  const clientDir = path.join(__dirname, '..', 'client');
  app.use(express.static(clientDir));

  // Mount REST API routes
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/courses', require('./routes/courses'));
  app.use('/api/lessons', require('./routes/lessons'));
  app.use('/api/assignments', require('./routes/assignments'));
  app.use('/api/quizzes', require('./routes/quizzes'));
  app.use('/api/grades', require('./routes/grades'));
  app.use('/api/attendance', require('./routes/attendance'));
  app.use('/api/badges', require('./routes/badges'));
  app.use('/api/certificates', require('./routes/certificates'));
  app.use('/api/discussions', require('./routes/discussions'));
  app.use('/api/announcements', require('./routes/announcements'));
  app.use('/api/messages', require('./routes/messages'));
  app.use('/api/calendar', require('./routes/calendar'));
  app.use('/api/search', require('./routes/search'));
  app.use('/api/admin', require('./routes/admin'));

  // Protected maintenance endpoints
  app.post('/api/maintenance/seed', (req, res) => {
    const secret = req.query.secret || req.headers['x-maintenance-secret'];
    if (!process.env.MAINTENANCE_SECRET || secret !== process.env.MAINTENANCE_SECRET) {
      return res.status(403).json({ error: 'Action forbidden: Requires valid MAINTENANCE_SECRET' });
    }
    try {
      seed();
      res.json({ success: true, message: 'Platform demo data seeded successfully!' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Notifications API
  app.get('/api/notifications', require('./middleware/auth').requireAuth, (req, res) => {
    const { db } = require('../database/db');
    const notifs = db.prepare(`
      SELECT * FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 20
    `).all(req.user.id);

    db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user.id);
    res.json({ notifications: notifs });
  });

  // Public Website Clean URL Routing
  app.get('/', (req, res) => res.sendFile(path.join(clientDir, 'index.html')));
  app.get(['/features', '/features.html'], (req, res) => res.sendFile(path.join(clientDir, 'features.html')));
  app.get(['/demo', '/demo.html'], (req, res) => res.sendFile(path.join(clientDir, 'demo.html')));
  app.get(['/tutorials', '/tutorials.html'], (req, res) => res.sendFile(path.join(clientDir, 'tutorials.html')));
  app.get(['/login', '/login.html'], (req, res) => res.sendFile(path.join(clientDir, 'login.html')));
  app.get(['/app', '/app.html', '/lms'], (req, res) => res.sendFile(path.join(clientDir, 'app.html')));
  app.get('/sitemap.xml', (req, res) => res.sendFile(path.join(clientDir, 'sitemap.xml')));
  app.get('/robots.txt', (req, res) => res.sendFile(path.join(clientDir, 'robots.txt')));

  // Single Page Application fallback
  app.use((req, res, next) => {
    // Never fall back to HTML website for API, uploads, or static asset extensions
    if (
      req.path.startsWith('/api') ||
      req.path.startsWith('/uploads') ||
      req.path.match(/\.(pdf|mp4|webm|mov|mkv|avi|png|jpg|jpeg|gif|svg|webp|json|css|js|map|woff|woff2|ttf|ico)$/i)
    ) {
      return res.status(404).json({ error: `Resource not found: ${req.path}` });
    }

    if (req.method === 'GET') {
      if (req.path.startsWith('/app') || req.path.startsWith('/dashboard') || req.path.startsWith('/courses')) {
        return res.sendFile(path.join(clientDir, 'app.html'));
      }
      return res.sendFile(path.join(clientDir, 'index.html'));
    }
    next();
  });

  // Global error handler
  app.use((err, req, res, next) => {
    console.error('Unhandled server error:', err);
    const status = err.status || err.statusCode || (err.name === 'MulterError' ? 400 : 500);
    res.status(status).json({
      error: err.message || 'Internal server error',
      message: err.message
    });
  });

  // Step 5: Start listening
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`  GURAY SICID LMS SERVER READY`);
    console.log(`  Access URL: http://localhost:${PORT}`);
    console.log(`  GitHub Sync: ${config.token ? '✅ ENABLED' : '❌ DISABLED (set GITHUB_TOKEN)'}`);
    console.log(`=======================================================`);
  });
}

// Graceful shutdown: flush any pending data to GitHub before exiting
async function gracefulExit() {
  console.log('[Shutdown] Saving data before exit...');
  try { savePersistence(db); } catch (e) {}
  // github-sync handles SIGTERM/SIGINT separately with flushSyncNow
  process.exit(0);
}
process.on('SIGINT', gracefulExit);
process.on('SIGTERM', gracefulExit);

// Start the server
if (require.main === module) {
  startServer().catch(err => {
    console.error('[Startup] Fatal error:', err);
    process.exit(1);
  });
}

module.exports = app;
