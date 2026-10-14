const express = require('express');
const router = express.Router();
const { db } = require('../../database/db');
const { requireAuth, requireProfessor } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

// 1. Get single quiz info
router.get('/:id', requireAuth, (req, res) => {
  const quizId = parseInt(req.params.id);
  const userId = req.user.id;

  const quiz = db.prepare(`
    SELECT q.*, c.title as course_title, c.code as course_code, m.title as module_title
    FROM quizzes q
    JOIN courses c ON q.course_id = c.id
    LEFT JOIN modules m ON q.module_id = m.id
    WHERE q.id = ?
  `).get(quizId);

  if (!quiz) {
    return res.status(404).json({ error: 'Quiz not found.' });
  }

  // Get question count and total points
  const questionSummary = db.prepare(`
    SELECT COUNT(*) as question_count, SUM(points) as total_points
    FROM quiz_questions
    WHERE quiz_id = ?
  `).get(quizId);

  // Get user's attempts
  const myAttempts = db.prepare(`
    SELECT id, attempt_number, started_at, submitted_at, score, max_score, percentage, is_passed, status, feedback
    FROM quiz_attempts
    WHERE quiz_id = ? AND user_id = ?
    ORDER BY attempt_number DESC
  `).all(quizId, userId);

  res.json({
    quiz: {
      ...quiz,
      question_count: questionSummary.question_count || 0,
      total_points: questionSummary.total_points || 0
    },
    attempts: myAttempts
  });
});

// 2. Create Quiz (Professor only)
router.post('/course/:courseId', requireProfessor, (req, res) => {
  const courseId = parseInt(req.params.courseId);
  const {
    module_id, title, description, time_limit_minutes,
    max_attempts, passing_percentage, weight_percentage,
    open_date, close_date, release_results_immediately
  } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Quiz title is required.' });
  }

  const result = db.prepare(`
    INSERT INTO quizzes (
      course_id, module_id, title, description, time_limit_minutes,
      max_attempts, passing_percentage, weight_percentage,
      open_date, close_date, release_results_immediately
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    courseId,
    module_id ? parseInt(module_id) : null,
    title.trim(),
    description || '',
    parseInt(time_limit_minutes) || 30,
    parseInt(max_attempts) || 2,
    parseFloat(passing_percentage) || 60.0,
    parseFloat(weight_percentage) || 20.0,
    open_date || null,
    close_date || null,
    release_results_immediately !== undefined ? (release_results_immediately ? 1 : 0) : 1
  );

  const newQuiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(result.lastInsertRowid);
  logAudit(req.user.id, 'QUIZ_CREATED', `Created quiz ${title} in course ${courseId}`, req);

  res.status(201).json({ message: 'Quiz created successfully', quiz: newQuiz });
});

// 3. Question Bank: Get questions for quiz
router.get('/:id/questions', requireAuth, (req, res) => {
  const quizId = parseInt(req.params.id);
  const isProfessor = req.user.role === 'professor' || req.user.role === 'admin';

  let questions = db.prepare(`
    SELECT * FROM quiz_questions
    WHERE quiz_id = ?
    ORDER BY sort_order ASC, id ASC
  `).all(quizId);

  questions = questions.map(q => {
    let parsedOptions = [];
    try {
      const raw = JSON.parse(q.options_json || '[]');
      if (Array.isArray(raw)) {
        parsedOptions = raw.map((opt, idx) => {
          if (typeof opt === 'string') return { id: opt, text: opt };
          return { id: opt.id || opt.text || String(idx), text: opt.text || opt.id || String(opt), isCorrect: opt.isCorrect };
        });
      }
    } catch (e) {}

    if (q.question_type === 'true_false' && parsedOptions.length === 0) {
      const isTrue = String(q.correct_answer_text || '').toLowerCase().trim() === 'true';
      parsedOptions = [
        { id: 'true', text: 'True (Run)', isCorrect: isTrue },
        { id: 'false', text: 'False (Been)', isCorrect: !isTrue }
      ];
    }

    const safeOptions = isProfessor 
      ? parsedOptions 
      : parsedOptions.map(({ isCorrect, ...rest }) => rest);

    return {
      id: q.id,
      quiz_id: q.quiz_id,
      question_text: q.question_text,
      question_type: q.question_type,
      options: safeOptions,
      points: q.points,
      sort_order: q.sort_order,
      ...(isProfessor ? { correct_answer_text: q.correct_answer_text } : {})
    };
  });

  res.json({ questions });
});

// 4. Question Bank: Add question to quiz (Professor only)
router.post('/:id/questions', requireProfessor, (req, res) => {
  const quizId = parseInt(req.params.id);
  const { question_text, question_type, options, points } = req.body;
  const correct_answer_text = (req.body.correct_answer_text || req.body.correct_answer || '').trim();

  if (!question_text || !question_type) {
    return res.status(400).json({ error: 'Question text and question type are required.' });
  }

  let finalOptions = null;
  if (question_type === 'true_false') {
    finalOptions = [
      { id: 'true', text: 'True (Run)', isCorrect: correct_answer_text.toLowerCase() === 'true' || correct_answer_text.toLowerCase() === 'run' },
      { id: 'false', text: 'False (Been)', isCorrect: correct_answer_text.toLowerCase() === 'false' || correct_answer_text.toLowerCase() === 'been' }
    ];
  } else if (options) {
    if (typeof options === 'string') {
      try { finalOptions = JSON.parse(options); } catch (e) { finalOptions = options; }
    } else {
      finalOptions = options;
    }
  }

  const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM quiz_questions WHERE quiz_id = ?').get(quizId).m || 0;

  const result = db.prepare(`
    INSERT INTO quiz_questions (
      quiz_id, question_text, question_type, options_json, correct_answer_text, points, sort_order
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    quizId,
    question_text.trim(),
    question_type,
    finalOptions ? JSON.stringify(finalOptions) : null,
    correct_answer_text || null,
    parseFloat(points) || 10.0,
    maxOrder + 1
  );

  const newQuestion = db.prepare('SELECT * FROM quiz_questions WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ message: 'Question added successfully', question: newQuestion });
});

// 5. Question Bank: Delete Question (Professor only)
router.delete('/questions/:questionId', requireProfessor, (req, res) => {
  const questionId = parseInt(req.params.questionId);
  db.prepare('DELETE FROM quiz_questions WHERE id = ?').run(questionId);
  res.json({ message: 'Question removed from question bank.' });
});

// 6. Start Quiz Attempt (Student)
router.post('/:id/start', requireAuth, (req, res) => {
  const quizId = parseInt(req.params.id);
  const userId = req.user.id;

  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(quizId);
  if (!quiz) {
    return res.status(404).json({ error: 'Quiz not found.' });
  }

  // Count existing attempts
  const pastAttempts = db.prepare('SELECT COUNT(*) as c FROM quiz_attempts WHERE quiz_id = ? AND user_id = ?').get(quizId, userId).c;
  if (pastAttempts >= quiz.max_attempts) {
    return res.status(400).json({ error: `You have reached the maximum allowed attempts (${quiz.max_attempts}) for this quiz.` });
  }

  // Check for any ongoing unfinished attempt
  let activeAttempt = db.prepare(`
    SELECT * FROM quiz_attempts
    WHERE quiz_id = ? AND user_id = ? AND status = 'in_progress'
  `).get(quizId, userId);

  if (!activeAttempt) {
    const attemptNumber = pastAttempts + 1;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const result = db.prepare(`
      INSERT INTO quiz_attempts (quiz_id, user_id, attempt_number, started_at, status)
      VALUES (?, ?, ?, ?, 'in_progress')
    `).run(quizId, userId, attemptNumber, now);

    activeAttempt = db.prepare('SELECT * FROM quiz_attempts WHERE id = ?').get(result.lastInsertRowid);
  }

  // Fetch questions without answers
  const questions = db.prepare(`
    SELECT id, quiz_id, question_text, question_type, options_json, points, sort_order
    FROM quiz_questions
    WHERE quiz_id = ?
    ORDER BY sort_order ASC, id ASC
  `).all(quizId);

  const safeQuestions = questions.map(q => {
    let opts = [];
    try {
      opts = JSON.parse(q.options_json || '[]').map(o => ({ id: o.id, text: o.text }));
    } catch (e) {}
    return {
      id: q.id,
      question_text: q.question_text,
      question_type: q.question_type,
      options: opts,
      points: q.points
    };
  });

  res.json({
    attempt: activeAttempt,
    quiz: {
      id: quiz.id,
      title: quiz.title,
      time_limit_minutes: quiz.time_limit_minutes
    },
    questions: safeQuestions
  });
});

// 7. Submit Quiz Attempt & Instant Auto-Grading (Student)
router.post('/attempts/:attemptId/submit', requireAuth, (req, res) => {
  const attemptId = parseInt(req.params.attemptId);
  const userId = req.user.id;
  const { answers } = req.body; // map of { [questionId]: answerValue }

  const attempt = db.prepare('SELECT * FROM quiz_attempts WHERE id = ?').get(attemptId);
  if (!attempt) {
    return res.status(404).json({ error: 'Quiz attempt not found.' });
  }

  if (attempt.user_id !== userId && req.user.role !== 'professor' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'You are not authorized to submit this attempt.' });
  }

  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(attempt.quiz_id);
  const questions = db.prepare('SELECT * FROM quiz_questions WHERE quiz_id = ?').all(attempt.quiz_id);

  let totalScore = 0;
  let maxScore = 0;
  let hasManualGradingPending = false;

  const insertAnswer = db.prepare(`
    INSERT OR REPLACE INTO quiz_attempt_answers (
      attempt_id, question_id, user_answer_json, awarded_points, is_auto_graded, graded_manually, feedback
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  db.transaction(() => {
    for (const q of questions) {
      maxScore += q.points;
      const userAns = answers ? answers[q.id] : null;
      let pointsAwarded = 0;
      let feedback = '';

      if (q.question_type === 'single_choice' || q.question_type === 'true_false') {
        let opts = [];
        try { opts = JSON.parse(q.options_json || '[]'); } catch (e) {}
        const correctOpt = Array.isArray(opts) ? opts.find(o => o && o.isCorrect) : null;
        let isCorrect = false;

        const normUser = String(userAns || '').toLowerCase().trim();
        const normCorrect = String(q.correct_answer_text || (correctOpt ? correctOpt.id : '')).toLowerCase().trim();

        if (correctOpt && userAns === correctOpt.id) {
          isCorrect = true;
        } else if (normUser && (
          normUser === normCorrect ||
          (normUser === 'true' && (normCorrect === 'run' || normCorrect === 'true' || normCorrect === '1')) ||
          (normUser === 'false' && (normCorrect === 'been' || normCorrect === 'false' || normCorrect === '0'))
        )) {
          isCorrect = true;
        }

        if (isCorrect) {
          pointsAwarded = q.points;
          feedback = 'Correct';
        } else {
          feedback = 'Incorrect';
        }
        insertAnswer.run(attemptId, q.id, JSON.stringify(userAns), pointsAwarded, 1, 0, feedback);
      } else if (q.question_type === 'multiple_choice') {
        let opts = [];
        try { opts = JSON.parse(q.options_json || '[]'); } catch (e) {}
        const correctIds = opts.filter(o => o.isCorrect).map(o => o.id).sort();
        const selectedIds = Array.isArray(userAns) ? userAns.sort() : [];

        // Exact match for full points or partial credit
        const isMatch = correctIds.length === selectedIds.length && correctIds.every((val, idx) => val === selectedIds[idx]);
        if (isMatch) {
          pointsAwarded = q.points;
          feedback = 'All correct selections made.';
        } else {
          // Partial credit calculation
          let correctSelected = selectedIds.filter(id => correctIds.includes(id)).length;
          let incorrectSelected = selectedIds.filter(id => !correctIds.includes(id)).length;
          let fraction = Math.max(0, (correctSelected - incorrectSelected) / correctIds.length);
          pointsAwarded = Math.round(fraction * q.points * 10) / 10;
          feedback = pointsAwarded > 0 ? `Partial credit: ${pointsAwarded} pts` : 'Incorrect selection';
        }
        insertAnswer.run(attemptId, q.id, JSON.stringify(selectedIds), pointsAwarded, 1, 0, feedback);
      } else if (q.question_type === 'short_answer') {
        const expected = (q.correct_answer_text || '').trim().toLowerCase();
        const actual = (userAns || '').toString().trim().toLowerCase();
        if (expected && actual === expected) {
          pointsAwarded = q.points;
          feedback = 'Correct';
        } else {
          feedback = `Expected: "${q.correct_answer_text}"`;
        }
        insertAnswer.run(attemptId, q.id, JSON.stringify(userAns), pointsAwarded, 1, 0, feedback);
      } else if (q.question_type === 'essay') {
        // Essay questions require professor manual review
        hasManualGradingPending = true;
        insertAnswer.run(attemptId, q.id, JSON.stringify(userAns || ''), 0, 0, 0, 'Pending professor evaluation');
      }

      totalScore += pointsAwarded;
    }
  })();

  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 1000) / 10 : 0;
  const isPassed = percentage >= quiz.passing_percentage ? 1 : 0;
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const status = hasManualGradingPending ? 'in_progress' : 'completed';

  db.prepare(`
    UPDATE quiz_attempts
    SET submitted_at = ?,
        score = ?,
        max_score = ?,
        percentage = ?,
        is_passed = ?,
        status = ?,
        feedback = ?
    WHERE id = ?
  `).run(
    now,
    totalScore,
    maxScore,
    percentage,
    isPassed,
    status,
    hasManualGradingPending ? 'Objective questions auto-graded. Essay questions are awaiting professor evaluation.' : 'Attempt completed.',
    attemptId
  );

  // If score >= 90%, award Quiz Master badge (badge_id = 2)
  if (percentage >= 90) {
    db.prepare('INSERT OR IGNORE INTO awarded_badges (badge_id, user_id, course_id) VALUES (?, ?, ?)')
      .run(2, attempt.user_id, quiz.course_id);
  }

  logAudit(userId, 'QUIZ_SUBMITTED', `Submitted attempt #${attempt.attempt_number} for quiz ${quiz.title}: ${totalScore}/${maxScore} (${percentage}%)`, req);

  const updatedAttempt = db.prepare('SELECT * FROM quiz_attempts WHERE id = ?').get(attemptId);
  res.json({
    message: hasManualGradingPending ? 'Quiz submitted! Objective questions graded; essay pending professor review.' : 'Quiz completed and graded successfully!',
    attempt: updatedAttempt
  });
});

// 8. View Attempt Review (Detailed Question & Answer breakdown)
router.get('/attempts/:attemptId/review', requireAuth, (req, res) => {
  const attemptId = parseInt(req.params.attemptId);
  const userId = req.user.id;
  const isProfessor = req.user.role === 'professor' || req.user.role === 'admin';

  const attempt = db.prepare(`
    SELECT qa.*, q.title as quiz_title, q.course_id, q.release_results_immediately, u.full_name as student_name
    FROM quiz_attempts qa
    JOIN quizzes q ON qa.quiz_id = q.id
    JOIN users u ON qa.user_id = u.id
    WHERE qa.id = ?
  `).get(attemptId);

  if (!attempt) {
    return res.status(404).json({ error: 'Attempt not found.' });
  }

  if (attempt.user_id !== userId && !isProfessor) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  const answers = db.prepare(`
    SELECT qaa.*,
      qq.question_text,
      qq.question_type,
      qq.options_json,
      qq.correct_answer_text,
      qq.points as max_points
    FROM quiz_attempt_answers qaa
    JOIN quiz_questions qq ON qaa.question_id = qq.id
    WHERE qaa.attempt_id = ?
    ORDER BY qq.sort_order ASC, qq.id ASC
  `).all(attemptId);

  const reviewedAnswers = answers.map(a => {
    let opts = [];
    try { opts = JSON.parse(a.options_json || '[]'); } catch (e) {}
    let parsedUserAnswer = null;
    try { parsedUserAnswer = JSON.parse(a.user_answer_json || 'null'); } catch (e) { parsedUserAnswer = a.user_answer_json; }

    return {
      question_id: a.question_id,
      question_text: a.question_text,
      question_type: a.question_type,
      options: opts,
      correct_answer_text: isProfessor || attempt.release_results_immediately ? a.correct_answer_text : null,
      user_answer: parsedUserAnswer,
      awarded_points: a.awarded_points,
      max_points: a.max_points,
      is_auto_graded: a.is_auto_graded,
      graded_manually: a.graded_manually,
      feedback: a.feedback
    };
  });

  res.json({
    attempt,
    answers: reviewedAnswers
  });
});

// 9. Professor Manual Grading for Essay Questions
router.post('/attempts/:attemptId/grade-essay', requireProfessor, (req, res) => {
  const attemptId = parseInt(req.params.attemptId);
  const { question_id, awarded_points, feedback } = req.body;

  const attempt = db.prepare('SELECT * FROM quiz_attempts WHERE id = ?').get(attemptId);
  if (!attempt) {
    return res.status(404).json({ error: 'Attempt not found.' });
  }

  const question = db.prepare('SELECT points FROM quiz_questions WHERE id = ?').get(question_id);
  const pts = parseFloat(awarded_points) || 0;

  db.prepare(`
    UPDATE quiz_attempt_answers
    SET awarded_points = ?,
        graded_manually = 1,
        feedback = ?
    WHERE attempt_id = ? AND question_id = ?
  `).run(pts, feedback || 'Graded by professor', attemptId, question_id);

  // Recalculate total score for attempt
  const sumPoints = db.prepare('SELECT SUM(awarded_points) as s FROM quiz_attempt_answers WHERE attempt_id = ?').get(attemptId).s || 0;
  const pct = attempt.max_score > 0 ? Math.round((sumPoints / attempt.max_score) * 1000) / 10 : 0;
  const quiz = db.prepare('SELECT passing_percentage, course_id FROM quizzes WHERE id = ?').get(attempt.quiz_id);
  const isPassed = pct >= quiz.passing_percentage ? 1 : 0;

  db.prepare(`
    UPDATE quiz_attempts
    SET score = ?,
        percentage = ?,
        is_passed = ?,
        status = 'graded'
    WHERE id = ?
  `).run(sumPoints, pct, isPassed, attemptId);

  // If score >= 90%, award Quiz Master badge (badge_id = 2)
  if (pct >= 90) {
    db.prepare('INSERT OR IGNORE INTO awarded_badges (badge_id, user_id, course_id) VALUES (?, ?, ?)')
      .run(2, attempt.user_id, quiz.course_id);
  }

  logAudit(req.user.id, 'QUIZ_ESSAY_GRADED', `Graded essay for attempt #${attemptId}: ${pts}/${question.points} pts`, req);

  res.json({ message: 'Essay question graded successfully', new_score: sumPoints, new_percentage: pct });
});

module.exports = router;
