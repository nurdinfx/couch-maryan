const express = require('express');
const router = express.Router();
const { db } = require('../../database/db');
const { requireAuth, requireProfessor } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

function getLetterGrade(pct) {
  if (pct === null || pct === undefined) return '—';
  if (pct >= 90) return 'A';
  if (pct >= 80) return 'B';
  if (pct >= 70) return 'C';
  if (pct >= 60) return 'D';
  return 'F';
}

// 1. Course Gradebook Matrix (Professor only)
router.get('/courses/:courseId/gradebook', requireProfessor, (req, res) => {
  const courseId = parseInt(req.params.courseId);
  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(courseId);
  if (!course) {
    return res.status(404).json({ error: 'Course not found.' });
  }

  // Get all assignments for this course
  const assignments = db.prepare(`
    SELECT id, title, max_score, weight_percentage, due_date
    FROM assignments
    WHERE course_id = ?
    ORDER BY id ASC
  `).all(courseId);

  // Get all quizzes for this course
  const quizzes = db.prepare(`
    SELECT id, title, passing_percentage, weight_percentage
    FROM quizzes
    WHERE course_id = ?
    ORDER BY id ASC
  `).all(courseId);

  // Get all enrolled students
  const students = db.prepare(`
    SELECT u.id, u.full_name, u.email, u.student_id_number, u.avatar_url
    FROM users u
    JOIN enrollments e ON u.id = e.user_id
    WHERE e.course_id = ? AND u.role = 'student'
    ORDER BY u.full_name ASC
  `).all(courseId);

  // For each student, compute their assignment grades, quiz scores, and weighted total
  const gradebookRows = students.map(student => {
    const studentAssignments = {};
    let assignmentWeightedSum = 0;
    let assignmentTotalWeight = 0;

    for (const a of assignments) {
      const sub = db.prepare(`
        SELECT grade, status, is_grades_released
        FROM assignment_submissions
        WHERE assignment_id = ? AND user_id = ?
      `).get(a.id, student.id);

      studentAssignments[a.id] = sub ? {
        grade: sub.grade,
        status: sub.status,
        percentage: sub.grade !== null ? Math.round((sub.grade / a.max_score) * 1000) / 10 : null,
        is_released: sub.is_grades_released === 1
      } : { grade: null, status: 'missing', percentage: null, is_released: false };

      if (sub && sub.grade !== null) {
        assignmentWeightedSum += (sub.grade / a.max_score) * a.weight_percentage;
        assignmentTotalWeight += a.weight_percentage;
      }
    }

    const studentQuizzes = {};
    let quizWeightedSum = 0;
    let quizTotalWeight = 0;

    for (const q of quizzes) {
      const attempt = db.prepare(`
        SELECT MAX(score) as score, MAX(percentage) as percentage, status
        FROM quiz_attempts
        WHERE quiz_id = ? AND user_id = ?
      `).get(q.id, student.id);

      studentQuizzes[q.id] = attempt && attempt.percentage !== null ? {
        score: attempt.score,
        percentage: attempt.percentage,
        status: attempt.status
      } : { score: null, percentage: null, status: 'unattempted' };

      if (attempt && attempt.percentage !== null) {
        quizWeightedSum += (attempt.percentage / 100) * q.weight_percentage;
        quizTotalWeight += q.weight_percentage;
      }
    }

    // Weighted Overall Percentage
    // If no graded activities exist yet, return null (not 0%) to avoid falsely showing FAIL
    const totalEffectiveWeight = assignmentTotalWeight + quizTotalWeight;
    const hasAnyGrade = totalEffectiveWeight > 0;
    const overallPercentage = hasAnyGrade
      ? Math.round(((assignmentWeightedSum + quizWeightedSum) / totalEffectiveWeight) * 1000) / 10
      : null;

    const letterGrade = getLetterGrade(overallPercentage);
    // null = no grades yet (not a failure), true/false = actual pass/fail
    const isPassing = hasAnyGrade ? overallPercentage >= (course.pass_percentage || 60) : null;

    return {
      student,
      assignments: studentAssignments,
      quizzes: studentQuizzes,
      overall_percentage: overallPercentage,
      letter_grade: letterGrade,
      is_passing: isPassing
    };
  });

  res.json({
    course,
    columns: {
      assignments,
      quizzes
    },
    rows: gradebookRows
  });
});

// 2. Student My Grades (Strictly isolated to requesting student!)
router.get('/courses/:courseId/my-grades', requireAuth, (req, res) => {
  const courseId = parseInt(req.params.courseId);
  const userId = req.user.id;

  const course = db.prepare('SELECT id, code, title, pass_percentage FROM courses WHERE id = ?').get(courseId);
  if (!course) {
    return res.status(404).json({ error: 'Course not found.' });
  }

  // Get assignments with student submission and feedback
  const assignments = db.prepare(`
    SELECT a.id, a.title, a.max_score, a.weight_percentage, a.due_date,
      sub.grade, sub.feedback, sub.status as submission_status, sub.submitted_at, sub.is_grades_released
    FROM assignments a
    LEFT JOIN assignment_submissions sub ON a.id = sub.assignment_id AND sub.user_id = ?
    WHERE a.course_id = ?
    ORDER BY a.due_date ASC
  `).all(userId, courseId);

  // Get quizzes with best attempts
  const quizzes = db.prepare(`
    SELECT q.id, q.title, q.passing_percentage, q.weight_percentage,
      qa.score, qa.max_score, qa.percentage, qa.is_passed, qa.status as attempt_status, qa.submitted_at
    FROM quizzes q
    LEFT JOIN quiz_attempts qa ON q.id = qa.quiz_id AND qa.user_id = ? AND qa.score = (SELECT MAX(score) FROM quiz_attempts WHERE quiz_id = q.id AND user_id = ?)
    WHERE q.course_id = ?
    ORDER BY q.created_at ASC
  `).all(userId, userId, courseId);

  // Filter released grades only for student visibility
  let weightedEarned = 0;
  let totalWeight = 0;

  const sanitizedAssignments = assignments.map(a => {
    const isReleased = a.is_grades_released === 1;
    const grade = isReleased ? a.grade : null;
    const feedback = isReleased ? a.feedback : null;
    const pct = grade !== null ? Math.round((grade / a.max_score) * 1000) / 10 : null;

    if (grade !== null) {
      weightedEarned += (grade / a.max_score) * a.weight_percentage;
      totalWeight += a.weight_percentage;
    }

    return {
      ...a,
      grade,
      feedback,
      percentage: pct,
      is_released: isReleased
    };
  });

  const processedQuizzes = quizzes.map(q => {
    if (q.percentage !== null) {
      weightedEarned += (q.percentage / 100) * q.weight_percentage;
      totalWeight += q.weight_percentage;
    }
    return q;
  });

  // null means no graded items yet (not 0% — avoids false FAIL)
  const hasAnyGrade = totalWeight > 0;
  const overallPct = hasAnyGrade
    ? Math.round((weightedEarned / totalWeight) * 1000) / 10
    : null;

  res.json({
    course,
    overall: {
      percentage: overallPct,
      letter_grade: getLetterGrade(overallPct),
      is_passing: hasAnyGrade ? overallPct >= (course.pass_percentage || 60) : null
    },
    assignments: sanitizedAssignments,
    quizzes: processedQuizzes
  });
});

// 3. Export Gradebook as CSV (Professor only)
router.get('/courses/:courseId/export-csv', requireProfessor, (req, res) => {
  const courseId = parseInt(req.params.courseId);
  const course = db.prepare('SELECT code, title FROM courses WHERE id = ?').get(courseId);
  if (!course) {
    return res.status(404).send('Course not found');
  }

  const assignments = db.prepare('SELECT id, title, max_score FROM assignments WHERE course_id = ?').all(courseId);
  const quizzes = db.prepare('SELECT id, title FROM quizzes WHERE course_id = ?').all(courseId);
  const students = db.prepare(`
    SELECT u.id, u.full_name, u.email, u.student_id_number
    FROM users u
    JOIN enrollments e ON u.id = e.user_id
    WHERE e.course_id = ? AND u.role = 'student'
    ORDER BY u.full_name ASC
  `).all(courseId);

  // Build CSV Header
  let csv = 'Student ID,Full Name,Email';
  assignments.forEach(a => { csv += `,"${a.title.replace(/"/g, '""')} (Max ${a.max_score})"`; });
  quizzes.forEach(q => { csv += `,"${q.title.replace(/"/g, '""')} (%)"`; });
  csv += ',Overall Score,Letter Grade,Status\n';

  // Build CSV Rows
  for (const s of students) {
    csv += `"${s.student_id_number || ''}","${s.full_name.replace(/"/g, '""')}","${s.email}"`;

    let totalEarned = 0;
    let count = 0;

    assignments.forEach(a => {
      const sub = db.prepare('SELECT grade FROM assignment_submissions WHERE assignment_id = ? AND user_id = ?').get(a.id, s.id);
      const g = sub && sub.grade !== null ? sub.grade : 'N/A';
      csv += `,${g}`;
      if (typeof g === 'number') {
        totalEarned += (g / a.max_score) * 100;
        count++;
      }
    });

    quizzes.forEach(q => {
      const att = db.prepare('SELECT MAX(percentage) as p FROM quiz_attempts WHERE quiz_id = ? AND user_id = ?').get(q.id, s.id);
      const p = att && att.p !== null ? `${att.p}%` : 'N/A';
      csv += `,${p}`;
      if (att && att.p !== null) {
        totalEarned += att.p;
        count++;
      }
    });

    const avg = count > 0 ? Math.round((totalEarned / count) * 10) / 10 : null;
    const letter = getLetterGrade(avg);
    const pass = count > 0 ? (avg >= (course.pass_percentage || 60) ? 'PASS' : 'FAIL') : 'Pending';

    csv += `,${avg !== null ? avg + '%' : 'N/A'},${letter},${pass}\n`;
  }

  res.header('Content-Type', 'text/csv');
  res.attachment(`${course.code}_Gradebook_${new Date().toISOString().slice(0, 10)}.csv`);
  res.send(csv);
});

module.exports = router;
