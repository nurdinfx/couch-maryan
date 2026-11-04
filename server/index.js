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
app.use(cors());
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

  // Step 2 & 3: Fetch latest from GitHub if token is available, then hydrate
  const config = getSyncConfig();
  if (config.token) {
    console.log('[Startup] GITHUB_TOKEN found — fetching latest data from GitHub...');
    try {
      const remoteSnapshot = await fetchLatestFromGitHub();
      if (remoteSnapshot) {
        // Write to local file so restorePersistence can use it
        try {
          fs.writeFileSync(PERSISTENCE_FILE, JSON.stringify(remoteSnapshot, null, 2), 'utf8');
          console.log('[Startup] ✅ Latest GitHub snapshot saved locally.');
        } catch (e) {
          console.error('[Startup] Could not write local snapshot:', e.message);
        }
      } else {
        console.log('[Startup] Could not fetch from GitHub — using local persistent_data.json.');
      }
    } catch (err) {
      console.error('[Startup] GitHub fetch error:', err.message);
    }
  } else {
    console.log('[Startup] No GITHUB_TOKEN — using local persistent_data.json only.');
    console.log('[Startup] ⚠️  WARNING: New users created will NOT survive server restarts!');
    console.log('[Startup] ⚠️  Set GITHUB_TOKEN in Render Environment Variables to fix this.');
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
  app.use('/uploads', express.static(uploadsDir, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.pdf')) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline');
      }
    }
  }));

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
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      if (req.path.startsWith('/app') || req.path.startsWith('/dashboard') || req.path.startsWith('/courses')) {
        return res.sendFile(path.join(clientDir, 'app.html'));
      }
      return res.sendFile(path.join(clientDir, 'index.html'));
    }
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'Endpoint not found' });
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
