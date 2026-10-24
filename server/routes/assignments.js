const express = require('express');
const router = express.Router();
const { db, savePersistence } = require('../../database/db');
const { requireAuth, requireProfessor } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { logAudit } = require('../middleware/audit');

// 1. Get single assignment with student's submission status
router.get('/:id', requireAuth, (req, res) => {
  const assignmentId = parseInt(req.params.id);
  const userId = req.user.id;

  const assignment = db.prepare(`
    SELECT a.*, c.title as course_title, c.code as course_code, m.title as module_title
    FROM assignments a
    JOIN courses c ON a.course_id = c.id
    LEFT JOIN modules m ON a.module_id = m.id
    WHERE a.id = ?
  `).get(assignmentId);

  if (!assignment) {
    return res.status(404).json({ error: 'Assignment not found.' });
  }

  // Get current student's submission if any
  const mySubmission = db.prepare(`
    SELECT * FROM assignment_submissions
    WHERE assignment_id = ? AND user_id = ?
  `).get(assignmentId, userId);

  // If professor, get aggregate stats
  let stats = null;
  if (req.user.role === 'professor' || req.user.role === 'admin') {
    const totalEnrolled = db.prepare('SELECT COUNT(*) as c FROM enrollments WHERE course_id = ?').get(assignment.course_id).c;
    const submittedCount = db.prepare('SELECT COUNT(*) as c FROM assignment_submissions WHERE assignment_id = ?').get(assignmentId).c;
    const gradedCount = db.prepare('SELECT COUNT(*) as c FROM assignment_submissions WHERE assignment_id = ? AND status = "graded"').get(assignmentId).c;
    const avgGrade = db.prepare('SELECT AVG(grade) as a FROM assignment_submissions WHERE assignment_id = ? AND status = "graded"').get(assignmentId).a || 0;

    stats = {
      totalEnrolled,
      submittedCount,
      gradedCount,
      needsGradingCount: submittedCount - gradedCount,
      avgGrade: Math.round(avgGrade * 10) / 10
    };
  }

  res.json({
    assignment,
    submission: mySubmission,
    stats
  });
});

// 2. Create Assignment (Professor only)
router.post('/course/:courseId', requireProfessor, upload.single('attachment'), (req, res) => {
  const courseId = parseInt(req.params.courseId);
  const { title, instructions, due_date, module_id, allow_late, submission_type, max_score, weight_percentage } = req.body;

  if (!title || !instructions || !due_date) {
    return res.status(400).json({ error: 'Title, instructions, and due date are required.' });
  }

  let attachment_url = null;
  let attachment_name = null;
  if (req.file) {
    attachment_url = `/uploads/documents/${req.file.filename}`;
    attachment_name = req.file.originalname;
  }

  const result = db.prepare(`
    INSERT INTO assignments (
      course_id, module_id, title, instructions, attachment_url, attachment_name,
      due_date, allow_late, submission_type, max_score, weight_percentage
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    courseId,
    module_id ? parseInt(module_id) : null,
    title.trim(),
    instructions.trim(),
    attachment_url,
    attachment_name,
    due_date,
    allow_late === 'false' || allow_late === 0 ? 0 : 1,
    submission_type || 'both',
    parseFloat(max_score) || 100.0,
    parseFloat(weight_percentage) || 20.0
  );

  const newAssignment = db.prepare('SELECT * FROM assignments WHERE id = ?').get(result.lastInsertRowid);
  logAudit(req.user.id, 'ASSIGNMENT_CREATED', `Created assignment ${title} in course ${courseId}`, req);

  // Notify all enrolled students
  const students = db.prepare('SELECT user_id FROM enrollments WHERE course_id = ?').all(courseId);
  const notifStmt = db.prepare(`
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (?, 'New Assignment Published', ?, 'info', ?)
  `);
  students.forEach(s => {
    notifStmt.run(s.user_id, `Assignment "${title}" has been published. Due: ${due_date}`, `#/course/${courseId}/assignment/${newAssignment.id}`);
  });

  res.status(201).json({ message: 'Assignment created successfully', assignment: newAssignment });
});

// 3. Update Assignment (Professor only)
router.put('/:id', requireProfessor, upload.single('attachment'), (req, res) => {
  const assignmentId = parseInt(req.params.id);
  const existing = db.prepare('SELECT * FROM assignments WHERE id = ?').get(assignmentId);
  if (!existing) {
    return res.status(404).json({ error: 'Assignment not found.' });
  }

  const { title, instructions, due_date, module_id, allow_late, submission_type, max_score, weight_percentage } = req.body;

  let attachment_url = existing.attachment_url;
  let attachment_name = existing.attachment_name;
  if (req.file) {
    attachment_url = `/uploads/documents/${req.file.filename}`;
    attachment_name = req.file.originalname;
  }

  db.prepare(`
    UPDATE assignments
    SET title = COALESCE(?, title),
        instructions = COALESCE(?, instructions),
        due_date = COALESCE(?, due_date),
        module_id = COALESCE(?, module_id),
        allow_late = COALESCE(?, allow_late),
        submission_type = COALESCE(?, submission_type),
        max_score = COALESCE(?, max_score),
        weight_percentage = COALESCE(?, weight_percentage),
        attachment_url = ?,
        attachment_name = ?
    WHERE id = ?
  `).run(
    title, instructions, due_date,
    module_id ? parseInt(module_id) : null,
    allow_late !== undefined ? parseInt(allow_late) : null,
    submission_type,
    max_score ? parseFloat(max_score) : null,
    weight_percentage ? parseFloat(weight_percentage) : null,
    attachment_url, attachment_name,
    assignmentId
  );

  const updated = db.prepare('SELECT * FROM assignments WHERE id = ?').get(assignmentId);
  res.json({ message: 'Assignment updated successfully', assignment: updated });
});

// 4. Delete Assignment (Professor only)
router.delete('/:id', requireProfessor, (req, res) => {
  const assignmentId = parseInt(req.params.id);
  db.prepare('DELETE FROM assignment_submissions WHERE assignment_id = ?').run(assignmentId);
  db.prepare('DELETE FROM assignments WHERE id = ?').run(assignmentId);
  try { savePersistence(db); } catch (e) {}
  try { logAudit(req.user.id, 'ASSIGNMENT_DELETED', `Deleted assignment #${assignmentId}`, req); } catch (e) {}
  res.json({ message: 'Assignment deleted successfully.' });
});

// 5. Submit Assignment (Student)
router.post('/:id/submit', requireAuth, upload.single('submission_file'), (req, res) => {
  const assignmentId = parseInt(req.params.id);
  const userId = req.user.id;
  const { submission_text } = req.body;

  const assignment = db.prepare('SELECT * FROM assignments WHERE id = ?').get(assignmentId);
  if (!assignment) {
    return res.status(404).json({ error: 'Assignment not found.' });
  }

  // Validate deadline
  const now = new Date();
  const dueDate = new Date(assignment.due_date);
  const isLate = now > dueDate;

  if (isLate && !assignment.allow_late) {
    return res.status(400).json({ error: 'Deadline has passed and late submissions are not allowed for this assignment.' });
  }

  let file_url = null;
  let file_name = null;
  let file_size_bytes = 0;

  if (req.file) {
    file_url = `/uploads/submissions/${req.file.filename}`;
    file_name = req.file.originalname;
    file_size_bytes = req.file.size;
  }

  if (!file_url && (!submission_text || submission_text.trim() === '')) {
    return res.status(400).json({ error: 'Please provide either a submission file or text response.' });
  }

  const existing = db.prepare('SELECT * FROM assignment_submissions WHERE assignment_id = ? AND user_id = ?').get(assignmentId, userId);

  const submittedAt = now.toISOString().replace('T', ' ').substring(0, 19);

  if (existing) {
    db.prepare(`
      UPDATE assignment_submissions
      SET submission_text = COALESCE(?, submission_text),
          file_url = COALESCE(?, file_url),
          file_name = COALESCE(?, file_name),
          file_size_bytes = CASE WHEN ? IS NOT NULL THEN ? ELSE file_size_bytes END,
          status = 'submitted',
          submitted_at = ?
      WHERE id = ?
    `).run(submission_text, file_url, file_name, file_url, file_size_bytes, submittedAt, existing.id);
  } else {
    db.prepare(`
      INSERT INTO assignment_submissions (
        assignment_id, user_id, submission_text, file_url, file_name, file_size_bytes, status, submitted_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'submitted', ?)
    `).run(assignmentId, userId, submission_text || '', file_url, file_name, file_size_bytes, submittedAt);
  }

  logAudit(userId, 'ASSIGNMENT_SUBMITTED', `Submitted assignment ${assignment.title} (Late: ${isLate})`, req);

  const submission = db.prepare('SELECT * FROM assignment_submissions WHERE assignment_id = ? AND user_id = ?').get(assignmentId, userId);
  res.json({
    message: isLate ? 'Assignment submitted (marked Late).' : 'Assignment submitted successfully!',
    submission
  });
});

// 6. View All Submissions for Assignment (Professor only)
router.get('/:id/submissions', requireProfessor, (req, res) => {
  const assignmentId = parseInt(req.params.id);
  const assignment = db.prepare('SELECT * FROM assignments WHERE id = ?').get(assignmentId);
  if (!assignment) {
    return res.status(404).json({ error: 'Assignment not found.' });
  }

  // Get all enrolled students and their submission status
  const students = db.prepare(`
    SELECT u.id as student_id, u.full_name, u.email, u.avatar_url, u.student_id_number,
      sub.id as submission_id,
      sub.submission_text,
      sub.file_url,
      sub.file_name,
      sub.file_size_bytes,
      sub.status as submission_status,
      sub.submitted_at,
      sub.grade,
      sub.feedback,
      sub.graded_at,
      sub.is_grades_released,
      grader.full_name as graded_by_name
    FROM users u
    JOIN enrollments e ON u.id = e.user_id
    LEFT JOIN assignment_submissions sub ON sub.user_id = u.id AND sub.assignment_id = ?
    LEFT JOIN users grader ON sub.graded_by = grader.id
    WHERE e.course_id = ? AND u.role = 'student'
    ORDER BY u.full_name ASC
  `).all(assignmentId, assignment.course_id);

  res.json({ assignment, students });
});

// 7. Grade Submission (Professor only)
router.post('/submissions/:id/grade', requireProfessor, (req, res) => {
  const submissionId = parseInt(req.params.id);
  const { grade, feedback, status, is_grades_released } = req.body;

  const submission = db.prepare(`
    SELECT sub.*, a.title as assignment_title, a.max_score, a.course_id, u.full_name as student_name
    FROM assignment_submissions sub
    JOIN assignments a ON sub.assignment_id = a.id
    JOIN users u ON sub.user_id = u.id
    WHERE sub.id = ?
  `).get(submissionId);

  if (!submission) {
    return res.status(404).json({ error: 'Submission not found.' });
  }

  const numericGrade = parseFloat(grade);
  if (isNaN(numericGrade) || numericGrade < 0 || numericGrade > submission.max_score) {
    return res.status(400).json({ error: `Grade must be a number between 0 and ${submission.max_score}.` });
  }

  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

  db.prepare(`
    UPDATE assignment_submissions
    SET grade = ?,
        feedback = ?,
        status = ?,
        graded_by = ?,
        graded_at = ?,
        is_grades_released = ?
    WHERE id = ?
  `).run(
    numericGrade,
    feedback || '',
    status || 'graded',
    req.user.id,
    now,
    is_grades_released !== undefined ? (is_grades_released ? 1 : 0) : 1,
    submissionId
  );

  // If grade >= 90%, award Assignment Excellence badge (badge_id = 3)
  if ((numericGrade / submission.max_score) >= 0.90) {
    db.prepare('INSERT OR IGNORE INTO awarded_badges (badge_id, user_id, course_id) VALUES (?, ?, ?)')
      .run(3, submission.user_id, submission.course_id);
  }

  // Notify student
  db.prepare(`
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (?, 'Assignment Graded', ?, 'grade', ?)
  `).run(
    submission.user_id,
    `Your submission for "${submission.assignment_title}" has been graded: ${numericGrade} / ${submission.max_score}`,
    `#/course/${submission.course_id}/assignment/${submission.assignment_id}`
  );

  logAudit(req.user.id, 'SUBMISSION_GRADED', `Graded ${submission.student_name}'s submission for ${submission.assignment_title}: ${numericGrade}/${submission.max_score}`, req);

  const updated = db.prepare('SELECT * FROM assignment_submissions WHERE id = ?').get(submissionId);
  res.json({ message: 'Submission graded successfully', submission: updated });
});

module.exports = router;
