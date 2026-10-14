const express = require('express');
const router = express.Router();
const { db } = require('../../database/db');
const { requireAuth, requireProfessor } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

// 1. Get all courses (with role-aware enrollment & progress info)
router.get('/', requireAuth, (req, res) => {
  const user = req.user;
  let courses;

  if (user.role === 'professor' || user.role === 'admin') {
    courses = db.prepare(`
      SELECT c.*,
        u.full_name as professor_name,
        (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) as enrolled_students_count,
        (SELECT COUNT(*) FROM modules m WHERE m.course_id = c.id) as modules_count,
        (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id) as lessons_count,
        (SELECT COUNT(*) FROM assignments a WHERE a.course_id = c.id) as assignments_count,
        (SELECT COUNT(*) FROM quizzes q WHERE q.course_id = c.id) as quizzes_count
      FROM courses c
      LEFT JOIN users u ON c.professor_id = u.id
      ORDER BY c.created_at DESC
    `).all();
  } else {
    // For students: retrieve courses with individual calculated progress
    courses = db.prepare(`
      SELECT c.*,
        u.full_name as professor_name,
        (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) as enrolled_students_count,
        (SELECT COUNT(*) FROM modules m WHERE m.course_id = c.id AND m.is_published = 1) as modules_count,
        (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id AND l.is_published = 1) as lessons_count,
        EXISTS(SELECT 1 FROM enrollments e WHERE e.course_id = c.id AND e.user_id = ?) as is_enrolled,
        (SELECT COUNT(*) FROM lesson_progress lp JOIN lessons l ON lp.lesson_id = l.id WHERE lp.user_id = ? AND lp.course_id = c.id AND lp.is_completed = 1) as completed_lessons_count,
        (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id AND l.is_required_for_completion = 1 AND l.is_published = 1) as required_lessons_count,
        (SELECT final_grade FROM certificates cert WHERE cert.course_id = c.id AND cert.user_id = ?) as certificate_grade
      FROM courses c
      LEFT JOIN users u ON c.professor_id = u.id
      WHERE c.is_published = 1 OR EXISTS(SELECT 1 FROM enrollments e WHERE e.course_id = c.id AND e.user_id = ?)
      ORDER BY c.created_at DESC
    `).all(user.id, user.id, user.id, user.id);

    // Compute progress % accurately
    courses = courses.map(c => {
      const required = c.required_lessons_count || 0;
      const completed = c.completed_lessons_count || 0;
      const progressPercent = required > 0 ? Math.min(100, Math.round((completed / required) * 100)) : 0;
      return {
        ...c,
        progress_percentage: progressPercent,
        is_completed: progressPercent >= 100
      };
    });
  }

  res.json({ courses });
});

// 2. Get single course with full Moodle hierarchy (Modules -> Lessons, Assignments, Quizzes)
router.get('/:id', requireAuth, (req, res) => {
  const courseId = parseInt(req.params.id);
  const user = req.user;

  const course = db.prepare(`
    SELECT c.*, u.full_name as professor_name, u.avatar_url as professor_avatar, u.bio as professor_bio
    FROM courses c
    LEFT JOIN users u ON c.professor_id = u.id
    WHERE c.id = ?
  `).get(courseId);

  if (!course) {
    return res.status(404).json({ error: 'Course not found.' });
  }

  // Check enrollment if student
  if (user.role === 'student') {
    const isEnrolled = db.prepare('SELECT 1 FROM enrollments WHERE user_id = ? AND course_id = ?').get(user.id, courseId);
    if (!isEnrolled) {
      // Auto-enroll if course is published
      if (course.is_published) {
        db.prepare('INSERT OR IGNORE INTO enrollments (user_id, course_id) VALUES (?, ?)').run(user.id, courseId);
      } else {
        return res.status(403).json({ error: 'You are not enrolled in this course.' });
      }
    }
  }

  // Fetch modules
  const modules = db.prepare(`
    SELECT * FROM modules
    WHERE course_id = ? ${user.role === 'student' ? 'AND is_published = 1' : ''}
    ORDER BY sort_order ASC, id ASC
  `).all(courseId);

  // Fetch lessons with student progress
  const lessons = db.prepare(`
    SELECT l.*,
      lp.is_completed as student_completed,
      lp.video_watched_seconds,
      lp.video_watch_percentage,
      lp.completed_at
    FROM lessons l
    LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id AND lp.user_id = ?
    WHERE l.course_id = ? ${user.role === 'student' ? 'AND l.is_published = 1' : ''}
    ORDER BY l.sort_order ASC, l.id ASC
  `).all(user.id, courseId);

  // Fetch assignments
  const assignments = db.prepare(`
    SELECT a.*,
      sub.id as submission_id,
      sub.status as submission_status,
      sub.grade as submission_grade,
      sub.submitted_at,
      sub.is_grades_released
    FROM assignments a
    LEFT JOIN assignment_submissions sub ON a.id = sub.assignment_id AND sub.user_id = ?
    WHERE a.course_id = ?
    ORDER BY a.due_date ASC
  `).all(user.id, courseId);

  // Fetch quizzes
  const quizzes = db.prepare(`
    SELECT q.*,
      (SELECT COUNT(*) FROM quiz_attempts qa WHERE qa.quiz_id = q.id AND qa.user_id = ?) as attempts_count,
      (SELECT MAX(score) FROM quiz_attempts qa WHERE qa.quiz_id = q.id AND qa.user_id = ?) as highest_score,
      (SELECT MAX(percentage) FROM quiz_attempts qa WHERE qa.quiz_id = q.id AND qa.user_id = ?) as highest_percentage,
      (SELECT is_passed FROM quiz_attempts qa WHERE qa.quiz_id = q.id AND qa.user_id = ? ORDER BY score DESC LIMIT 1) as is_passed
    FROM quizzes q
    WHERE q.course_id = ?
    ORDER BY q.created_at ASC
  `).all(user.id, user.id, user.id, user.id, courseId);

  // Group lessons, assignments, and quizzes under their respective modules
  const modulesWithContent = modules.map(m => {
    return {
      ...m,
      lessons: lessons.filter(l => l.module_id === m.id),
      assignments: assignments.filter(a => a.module_id === m.id),
      quizzes: quizzes.filter(q => q.module_id === m.id)
    };
  });

  // Calculate course completion progress for current student
  const requiredCount = lessons.filter(l => l.is_required_for_completion).length;
  const completedCount = lessons.filter(l => l.is_required_for_completion && l.student_completed === 1).length;
  const progressPercent = requiredCount > 0 ? Math.min(100, Math.round((completedCount / requiredCount) * 100)) : 0;

  // Recent announcements for course header
  const announcements = db.prepare(`
    SELECT a.*, u.full_name as author_name
    FROM announcements a
    JOIN users u ON a.author_id = u.id
    WHERE a.course_id = ?
    ORDER BY a.is_pinned DESC, a.created_at DESC
    LIMIT 3
  `).all(courseId);

  res.json({
    course: {
      ...course,
      progress_percentage: progressPercent,
      completed_lessons: completedCount,
      total_required_lessons: requiredCount
    },
    modules: modulesWithContent,
    announcements
  });
});

const { upload } = require('../middleware/upload');

// 3. Create Course (Professor only)
router.post('/', requireProfessor, upload.single('cover_file'), (req, res) => {
  const { code, title, description, cover_image, start_date, end_date, pass_percentage } = req.body;

  if (!code || !title) {
    return res.status(400).json({ error: 'Course code and title are required.' });
  }

  const existing = db.prepare('SELECT id FROM courses WHERE LOWER(code) = LOWER(?)').get(code.trim());
  if (existing) {
    return res.status(400).json({ error: 'A course with this code already exists.' });
  }

  let finalCover = cover_image || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=80';
  if (req.file) {
    finalCover = `/uploads/covers/${req.file.filename}`;
  }

  const result = db.prepare(`
    INSERT INTO courses (code, title, description, cover_image, professor_id, start_date, end_date, is_published, pass_percentage)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
  `).run(
    code.trim().toUpperCase(),
    title.trim(),
    description || '',
    finalCover,
    req.user.id,
    start_date || '2026-09-01',
    end_date || '2026-12-31',
    pass_percentage || 60.0
  );

  const newCourseId = result.lastInsertRowid;

  // Create default introductory module
  db.prepare(`
    INSERT INTO modules (course_id, title, description, sort_order, is_published)
    VALUES (?, 'General & Course Orientation', 'Course announcements, syllabus, and introductory resources.', 1, 1)
  `).run(newCourseId);

  // Enroll all active students in the faculty (single quotes for SQLite string literal)
  const students = db.prepare("SELECT id FROM users WHERE role = 'student'").all();
  const enrollStmt = db.prepare('INSERT OR IGNORE INTO enrollments (user_id, course_id) VALUES (?, ?)');
  students.forEach(s => enrollStmt.run(s.id, newCourseId));

  logAudit(req.user.id, 'COURSE_CREATED', `Created course ${code} - ${title}`, req);

  const created = db.prepare('SELECT * FROM courses WHERE id = ?').get(newCourseId);
  res.status(201).json({ message: 'Course created successfully', course: created });
});

// 4. Update Course (Professor only)
router.put('/:id', requireProfessor, upload.single('cover_file'), (req, res) => {
  const courseId = parseInt(req.params.id);
  const { title, description, cover_image, start_date, end_date, is_published, pass_percentage } = req.body;

  let finalCover = cover_image;
  if (req.file) {
    finalCover = `/uploads/covers/${req.file.filename}`;
  }

  db.prepare(`
    UPDATE courses
    SET title = COALESCE(?, title),
        description = COALESCE(?, description),
        cover_image = COALESCE(?, cover_image),
        start_date = COALESCE(?, start_date),
        end_date = COALESCE(?, end_date),
        is_published = COALESCE(?, is_published),
        pass_percentage = COALESCE(?, pass_percentage)
    WHERE id = ?
  `).run(title, description, finalCover, start_date, end_date, is_published, pass_percentage, courseId);

  logAudit(req.user.id, 'COURSE_UPDATED', `Updated course details for id ${courseId}`, req);

  const updated = db.prepare('SELECT * FROM courses WHERE id = ?').get(courseId);
  res.json({ message: 'Course updated successfully', course: updated });
});

// 5. Delete Course (Professor only)
router.delete('/:id', requireProfessor, (req, res) => {
  const courseId = parseInt(req.params.id);
  const course = db.prepare('SELECT code, title FROM courses WHERE id = ?').get(courseId);
  
  if (!course) {
    return res.status(404).json({ error: 'Course not found' });
  }

  db.prepare('DELETE FROM courses WHERE id = ?').run(courseId);
  logAudit(req.user.id, 'COURSE_DELETED', `Deleted course ${course.code}: ${course.title}`, req);

  res.json({ message: 'Course deleted successfully' });
});

// 6. Modules: Create Module
router.post('/:id/modules', requireProfessor, (req, res) => {
  const courseId = parseInt(req.params.id);
  const { title, description } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Module title is required.' });
  }

  const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM modules WHERE course_id = ?').get(courseId).m || 0;

  const result = db.prepare(`
    INSERT INTO modules (course_id, title, description, sort_order, is_published)
    VALUES (?, ?, ?, ?, 1)
  `).run(courseId, title.trim(), description || '', maxOrder + 1);

  const newModule = db.prepare('SELECT * FROM modules WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ message: 'Module created successfully', module: newModule });
});

// 7. Modules: Update Module
router.put('/modules/:moduleId', requireProfessor, (req, res) => {
  const moduleId = parseInt(req.params.moduleId);
  const { title, description, is_published, sort_order } = req.body;

  db.prepare(`
    UPDATE modules
    SET title = COALESCE(?, title),
        description = COALESCE(?, description),
        is_published = COALESCE(?, is_published),
        sort_order = COALESCE(?, sort_order)
    WHERE id = ?
  `).run(title, description, is_published, sort_order, moduleId);

  const updated = db.prepare('SELECT * FROM modules WHERE id = ?').get(moduleId);
  res.json({ message: 'Module updated successfully', module: updated });
});

// 8. Modules: Delete Module
router.delete('/modules/:moduleId', requireProfessor, (req, res) => {
  const moduleId = parseInt(req.params.moduleId);
  db.prepare('DELETE FROM modules WHERE id = ?').run(moduleId);
  res.json({ message: 'Module and all contained lessons deleted successfully.' });
});

// 9. Course Participants (Roster with real progress and attendance stats)
router.get('/:id/participants', requireAuth, (req, res) => {
  const courseId = parseInt(req.params.id);
  const totalRequiredLessons = db.prepare('SELECT COUNT(*) as c FROM lessons WHERE course_id = ? AND is_required_for_completion = 1 AND is_published = 1').get(courseId).c || 1;
  const totalSessions = db.prepare('SELECT COUNT(*) as c FROM attendance_sessions WHERE course_id = ?').get(courseId).c || 1;

  const students = db.prepare(`
    SELECT u.id, u.full_name, u.email, u.avatar_url, u.student_id_number, e.enrolled_at,
      (SELECT COUNT(*) FROM lesson_progress lp JOIN lessons l ON lp.lesson_id = l.id WHERE lp.user_id = u.id AND lp.course_id = ? AND lp.is_completed = 1) as completed_lessons,
      (SELECT COUNT(*) FROM attendance_records ar JOIN attendance_sessions asess ON ar.session_id = asess.id WHERE ar.user_id = u.id AND asess.course_id = ? AND ar.status IN ('present', 'late')) as attended_sessions,
      (SELECT MAX(lp.last_accessed_at) FROM lesson_progress lp WHERE lp.user_id = u.id AND lp.course_id = ?) as last_active,
      (SELECT AVG(grade) FROM assignment_submissions sub JOIN assignments a ON sub.assignment_id = a.id WHERE sub.user_id = u.id AND a.course_id = ? AND sub.status = 'graded') as avg_assignment_grade,
      (SELECT MAX(percentage) FROM quiz_attempts qa JOIN quizzes q ON qa.quiz_id = q.id WHERE qa.user_id = u.id AND q.course_id = ?) as highest_quiz_score
    FROM users u
    JOIN enrollments e ON u.id = e.user_id
    WHERE e.course_id = ? AND u.role = 'student'
    ORDER BY u.full_name ASC
  `).all(courseId, courseId, courseId, courseId, courseId, courseId);

  const participants = students.map(s => {
    const progress = Math.min(100, Math.round((s.completed_lessons / totalRequiredLessons) * 100));
    const attendancePct = Math.round((s.attended_sessions / totalSessions) * 100);
    const isAtRisk = progress < 40 || attendancePct < 60;

    return {
      ...s,
      progress_percentage: progress,
      attendance_percentage: attendancePct,
      is_at_risk: isAtRisk
    };
  });

  res.json({ participants, totalRequiredLessons, totalSessions });
});

module.exports = router;
