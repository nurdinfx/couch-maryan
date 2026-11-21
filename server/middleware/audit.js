const { db } = require('../../database/db');

function logAudit(userId, action, details, req) {
  try {
    const ip = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1') : '127.0.0.1';
    db.prepare(`
      INSERT INTO audit_logs (user_id, action, details, ip_address)
      VALUES (?, ?, ?, ?)
    `).run(userId || null, action, typeof details === 'object' ? JSON.stringify(details) : details, ip);
  } catch (err) {
    console.error('Audit log error:', err);
  }
}

module.exports = { logAudit };
