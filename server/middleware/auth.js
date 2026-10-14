const jwt = require('jsonwebtoken');
const { db } = require('../../database/db');

const JWT_SECRET = process.env.JWT_SECRET || 'faculty-lms-super-secret-key-2026';

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      full_name: user.full_name
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function requireAuth(req, res, next) {
  let token = null;

  // 1. Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT id, email, full_name, role, avatar_url, student_id_number, department, bio FROM users WHERE id = ?').get(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'User account no longer exists.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Session expired or invalid token. Please log in again.' });
  }
}

function requireProfessor(req, res, next) {
  if (!req.user) {
    return requireAuth(req, res, () => {
      if (req.user.role !== 'professor' && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied. Professor or Administrator permissions required.' });
      }
      next();
    });
  }

  if (req.user.role !== 'professor' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Professor or Administrator permissions required.' });
  }

  next();
}

function requireAdmin(req, res, next) {
  if (!req.user) {
    return requireAuth(req, res, () => {
      if (req.user.role !== 'admin' && req.user.role !== 'professor') {
        return res.status(403).json({ error: 'Access denied. System Administrator or Professor permissions required.' });
      }
      next();
    });
  }

  if (req.user.role !== 'admin' && req.user.role !== 'professor') {
    return res.status(403).json({ error: 'Access denied. System Administrator or Professor permissions required.' });
  }

  next();
}

module.exports = {
  JWT_SECRET,
  generateToken,
  requireAuth,
  requireProfessor,
  requireAdmin
};

