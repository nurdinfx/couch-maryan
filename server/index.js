const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

const { db, initSchema } = require('../database/db');
const { generateAssets } = require('../database/create-sample-assets');
const { seed } = require('../database/seed-data');
const { clearMockData } = require('../database/clear-mock');

// Ensure database and sample files exist
initSchema();
generateAssets();

// Auto-seed demo faculty data if database has no users (e.g. fresh cloud deploy)
try {
  const row = db.prepare('SELECT count(*) as count FROM users').get();
  if (!row || row.count === 0) {
    console.log('Database empty on startup. Initializing clean faculty LMS system...');
    clearMockData();
  }
} catch (err) {
  console.error('Init check error:', err);
}

const app = express();
const PORT = process.env.PORT || 3000;

// Security and utility middlewares
app.use(cors());
app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static file hosting for uploaded educational media (videos, PDFs, submissions)
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir, {
  setHeaders: (res, filePath) => {
    // Enable byte-range streaming for MP4 videos and inline viewing for PDFs
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

// Seed endpoint to re-seed or initialize on demand
// Clean wipe endpoint to remove all mock courses & test students
app.get('/api/clear-mock', (req, res) => {
  try {
    clearMockData();
    res.json({ success: true, message: 'All mock courses, test students, and mock records have been cleared! System is 100% clean and ready for real courses.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/seed', (req, res) => {
  try {
    seed();
    res.json({ success: true, message: 'Faculty LMS demo data seeded successfully!' });
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

  // Mark all as read
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user.id);

  res.json({ notifications: notifs });
});

// Single Page Application fallback to index.html
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
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
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`  FACULTY LMS SERVER READY`);
    console.log(`  Access URL: http://localhost:${PORT}`);
    console.log(`  Single Faculty: Faculty of Computing & Information Science`);
    console.log(`  Primary Professor: Prof. Maryam Al-Mansoor`);
    console.log(`=======================================================`);
  });
}

module.exports = app;
