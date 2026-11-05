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
    const user = db.prepare('SELECT id, email, full_name, role, avatar_url, student_id_number, department, bio, academic_year, faculty, is_active, is_admin FROM users WHERE id = ?').get(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'User account no longer exists.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Session expired or invalid token. Please log in again.' });
  }
}

// Helper: returns true if user has admin privileges (role='admin' OR is_admin=1)
function isAdminUser(user) {
  return user && (user.role === 'admin' || user.is_admin === 1);
}

// Helper: returns true if user has professor/admin privileges
function isProfessorOrAdmin(user) {
  return user && (user.role === 'professor' || user.role === 'admin' || user.is_admin === 1);
}

function requireProfessor(req, res, next) {
  if (!req.user) {
    return requireAuth(req, res, () => {
      if (!isProfessorOrAdmin(req.user)) {
        return res.status(403).json({ error: 'Access denied. Professor or Administrator permissions required.' });
      }
      next();
    });
  }

  if (!isProfessorOrAdmin(req.user)) {
    return res.status(403).json({ error: 'Access denied. Professor or Administrator permissions required.' });
  }

  next();
}

function requireAdmin(req, res, next) {
  if (!req.user) {
    return requireAuth(req, res, () => {
      if (!isAdminUser(req.user) && !isProfessorOrAdmin(req.user)) {
        return res.status(403).json({ error: 'Access denied. System Administrator permissions required.' });
      }
      next();
    });
  }

  if (!isAdminUser(req.user) && !isProfessorOrAdmin(req.user)) {
    return res.status(403).json({ error: 'Access denied. System Administrator permissions required.' });
  }

  next();
}

module.exports = {
  JWT_SECRET,
  generateToken,
  requireAuth,
  requireProfessor,
  requireAdmin,
  isAdminUser,
  isProfessorOrAdmin
};

