const express = require('express');
const router = express.Router();
const path = require('path');
const { db, savePersistence } = require('../../database/db');
const { requireAuth, requireProfessor } = require('../middleware/auth');
const { upload, safeUploadSingle, isVideoFile } = require('../middleware/upload');
const { logAudit } = require('../middleware/audit');

// 1. Get single lesson
router.get('/:id', requireAuth, (req, res) => {
  const lessonId = parseInt(req.params.id);
  const userId = req.user.id;

  const lesson = db.prepare(`
    SELECT l.*,
      m.title as module_title,
      c.id as course_id,
      c.title as course_title,
      c.code as course_code,
      c.target_year as course_target_year,
      lp.is_completed as student_completed,
      lp.video_watched_seconds,
      lp.video_watch_percentage,
      lp.completed_at
    FROM lessons l
    JOIN modules m ON l.module_id = m.id
    JOIN courses c ON l.course_id = c.id
    LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id AND lp.user_id = ?
    WHERE l.id = ?
  `).get(userId, lessonId);

  if (!lesson) {
    return res.status(404).json({ error: 'Lesson not found.' });
  }

  // Academic year access control for students
  if (req.user.role === 'student') {
    const studentYear = req.user.academic_year || 'Year 1';
    const isEnrolled = db.prepare('SELECT 1 FROM enrollments WHERE user_id = ? AND course_id = ?').get(userId, lesson.course_id);
    const isYearAllowed = !lesson.course_target_year || lesson.course_target_year === 'All Years' || lesson.course_target_year === studentYear;

    if (!isEnrolled && !isYearAllowed) {
      return res.status(403).json({
        error: `Ma geli kartid casharkan: Casharkani wuxuu qayb ka yahay koorso u gaar ah ${lesson.course_target_year}. Heerkaagu waa ${studentYear}. (Access Denied: This lesson is restricted to ${lesson.course_target_year} students.)`
      });
    }
  }

  // Get sibling lessons in the same course for prev/next navigation
  const allLessons = db.prepare(`
    SELECT id, title, content_type, module_id
    FROM lessons
    WHERE course_id = ? AND is_published = 1
    ORDER BY sort_order ASC, id ASC
  `).all(lesson.course_id);

  const currentIndex = allLessons.findIndex(l => l.id === lessonId);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  res.json({
    lesson,
    navigation: {
      prevLesson,
      nextLesson,
      currentIndex: currentIndex + 1,
      totalLessons: allLessons.length
    }
  });
});

// 2. Create Lesson (Professor only) - Supports text, video URL, or uploaded document/video
router.post('/modules/:moduleId', requireProfessor, safeUploadSingle('file'), (req, res) => {
  const moduleId = parseInt(req.params.moduleId);
  const moduleRecord = db.prepare('SELECT course_id FROM modules WHERE id = ?').get(moduleId);
  if (!moduleRecord) {
    return res.status(404).json({ error: 'Parent module not found.' });
  }

  const {
    title, content_type, description, content_body,
    video_url, video_duration_seconds, is_required_for_completion
  } = req.body;

  if (!title || !content_type) {
    return res.status(400).json({ error: 'Title and content type are required.' });
  }

  let file_url = null;
  let file_name = null;
  let file_size_bytes = 0;

  if (req.file) {
    const isVideo = isVideoFile(req.file, req) || content_type === 'video';
    const subfolder = isVideo ? 'videos' : 'documents';
    file_url = `/uploads/${subfolder}/${req.file.filename}`;
    file_name = req.file.originalname;
    file_size_bytes = req.file.size;
  }

  const trimmedVideoUrl = (video_url && typeof video_url === 'string') ? video_url.trim() : null;
  const finalVideoUrl = trimmedVideoUrl || (content_type === 'video' && file_url ? file_url : null);

  const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM lessons WHERE module_id = ?').get(moduleId).m || 0;

  const result = db.prepare(`
    INSERT INTO lessons (
      module_id, course_id, title, content_type, description, content_body,
      video_url, video_duration_seconds, file_url, file_name, file_size_bytes,
      is_required_for_completion, sort_order, is_published
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `).run(
    moduleId,
    moduleRecord.course_id,
    title.trim(),
    content_type,
    description || '',
    content_body || '',
    finalVideoUrl,
    parseInt(video_duration_seconds) || 0,
    file_url,
    file_name,
    file_size_bytes,
    is_required_for_completion === 'false' || is_required_for_completion === 0 ? 0 : 1,
    maxOrder + 1
  );

  const newLesson = db.prepare('SELECT * FROM lessons WHERE id = ?').get(result.lastInsertRowid);
  logAudit(req.user.id, 'LESSON_CREATED', `Created lesson ${newLesson.title} in course ${moduleRecord.course_id}`, req);
  try { savePersistence(db); } catch (e) {}

  res.status(201).json({ message: 'Lesson created successfully', lesson: newLesson });
});

// 3. Update Lesson (Professor only)
router.put('/:id', requireProfessor, safeUploadSingle('file'), (req, res) => {
  const lessonId = parseInt(req.params.id);
  const existing = db.prepare('SELECT * FROM lessons WHERE id = ?').get(lessonId);
  if (!existing) {
    return res.status(404).json({ error: 'Lesson not found.' });
  }

  const {
    title, description, content_body, video_url,
    video_duration_seconds, is_required_for_completion, is_published, sort_order
  } = req.body;

  let file_url = existing.file_url;
  let file_name = existing.file_name;
  let file_size_bytes = existing.file_size_bytes;

  if (req.file) {
    const isVideo = isVideoFile(req.file, req) || existing.content_type === 'video';
    const subfolder = isVideo ? 'videos' : 'documents';
    file_url = `/uploads/${subfolder}/${req.file.filename}`;
    file_name = req.file.originalname;
    file_size_bytes = req.file.size;
  }

  db.prepare(`
    UPDATE lessons
    SET title = COALESCE(?, title),
        description = COALESCE(?, description),
        content_body = COALESCE(?, content_body),
        video_url = COALESCE(?, video_url),
        video_duration_seconds = COALESCE(?, video_duration_seconds),
        file_url = ?,
        file_name = ?,
        file_size_bytes = ?,
        is_required_for_completion = COALESCE(?, is_required_for_completion),
        is_published = COALESCE(?, is_published),
        sort_order = COALESCE(?, sort_order)
    WHERE id = ?
  `).run(
    title, description, content_body, video_url,
    video_duration_seconds ? parseInt(video_duration_seconds) : null,
    file_url, file_name, file_size_bytes,
    is_required_for_completion !== undefined ? parseInt(is_required_for_completion) : null,
    is_published !== undefined ? parseInt(is_published) : null,
    sort_order !== undefined ? parseInt(sort_order) : null,
    lessonId
  );

  try { savePersistence(db); } catch (e) {}

  const updated = db.prepare('SELECT * FROM lessons WHERE id = ?').get(lessonId);
  res.json({ message: 'Lesson updated successfully', lesson: updated });
});

// 4. Delete Lesson (Professor only)
router.delete('/:id', requireProfessor, (req, res) => {
  const lessonId = parseInt(req.params.id);
  db.prepare('DELETE FROM lesson_progress WHERE lesson_id = ?').run(lessonId);
  db.prepare('DELETE FROM lessons WHERE id = ?').run(lessonId);
  try { savePersistence(db); } catch (e) {}
  try { logAudit(req.user.id, 'LESSON_DELETED', `Deleted lesson #${lessonId}`, req); } catch (e) {}
  res.json({ message: 'Lesson deleted successfully.' });
});

// 5. Update Student Progress & Real Video Tracking (Requirements 5 & 9)
// "Do not falsely mark a video as watched simply because the lesson page was opened."
// "Track video completion or viewing progress where technically supported."
router.post('/:id/progress', requireAuth, (req, res) => {
  const lessonId = parseInt(req.params.id);
  const userId = req.user.id;
  const { watchedSeconds, totalSeconds, markCompleted } = req.body;

  const lesson = db.prepare('SELECT * FROM lessons WHERE id = ?').get(lessonId);
  if (!lesson) {
    return res.status(404).json({ error: 'Lesson not found.' });
  }

  const existing = db.prepare('SELECT * FROM lesson_progress WHERE user_id = ? AND lesson_id = ?').get(userId, lessonId);

  let isCompleted = existing ? existing.is_completed : 0;
  let currentWatchedSeconds = existing ? existing.video_watched_seconds : 0;
  let watchPercentage = existing ? existing.video_watch_percentage : 0;

  if (lesson.content_type === 'video') {
    if (watchedSeconds !== undefined) {
      currentWatchedSeconds = Math.max(currentWatchedSeconds, parseFloat(watchedSeconds));
      const duration = totalSeconds || lesson.video_duration_seconds || 1;
      watchPercentage = Math.min(100, Math.round((currentWatchedSeconds / duration) * 100));

      // Video automatically marks completed if student watched >= 80% of playback
      if (watchPercentage >= 80) {
        isCompleted = 1;
      }
    }
  } else {
    // For documents, readings, and text activities: mark completed on student request or confirmation
    if (markCompleted !== undefined) {
      isCompleted = markCompleted ? 1 : 0;
    }
  }

  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

  if (existing) {
    db.prepare(`
      UPDATE lesson_progress
      SET is_completed = ?,
          video_watched_seconds = ?,
          video_watch_percentage = ?,
          completed_at = CASE WHEN ? = 1 AND is_completed = 0 THEN ? ELSE completed_at END,
          last_accessed_at = ?
      WHERE id = ?
    `).run(isCompleted, currentWatchedSeconds, watchPercentage, isCompleted, now, now, existing.id);
  } else {
    db.prepare(`
      INSERT INTO lesson_progress (
        user_id, lesson_id, course_id, is_completed, video_watched_seconds, video_watch_percentage, completed_at, last_accessed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, lessonId, lesson.course_id, isCompleted, currentWatchedSeconds, watchPercentage, isCompleted ? now : null, now);
  }

  // Automatic Badge Evaluation for student!
  checkAndAwardBadges(userId, lesson.course_id);

  try { savePersistence(db); } catch (e) {}

  // Return updated state
  const updatedProgress = db.prepare('SELECT * FROM lesson_progress WHERE user_id = ? AND lesson_id = ?').get(userId, lessonId);

  res.json({
    message: isCompleted ? 'Lesson completed!' : 'Progress saved.',
    progress: updatedProgress
  });
});

// Helper: Check and award badges dynamically upon academic progress
function checkAndAwardBadges(userId, courseId) {
  try {
    const awardBadge = db.prepare('INSERT OR IGNORE INTO awarded_badges (badge_id, user_id, course_id) VALUES (?, ?, ?)');

    // 1. First Lesson Badge (badge_id = 1)
    const completedAny = db.prepare('SELECT COUNT(*) as c FROM lesson_progress WHERE user_id = ? AND is_completed = 1').get(userId).c;
    if (completedAny >= 1) {
      awardBadge.run(1, userId, courseId);
    }

    // 2. Course Completed Badge & Certificate Check (badge_id = 5)
    const totalRequired = db.prepare('SELECT COUNT(*) as c FROM lessons WHERE course_id = ? AND is_required_for_completion = 1 AND is_published = 1').get(courseId).c;
    const studentCompleted = db.prepare('SELECT COUNT(*) as c FROM lesson_progress lp JOIN lessons l ON lp.lesson_id = l.id WHERE lp.user_id = ? AND lp.course_id = ? AND lp.is_completed = 1 AND l.is_required_for_completion = 1').get(userId, courseId).c;

    if (totalRequired > 0 && studentCompleted >= totalRequired) {
      // Award Course Completed badge
      awardBadge.run(5, userId, courseId);

      // Auto issue verifiable certificate if not issued yet
      const existingCert = db.prepare('SELECT id FROM certificates WHERE user_id = ? AND course_id = ?').get(userId, courseId);
      if (!existingCert) {
        const { v4: uuidv4 } = require('uuid');
        const certUuid = `CERT-${new Date().getFullYear()}-FACULTY-${uuidv4().substring(0, 8).toUpperCase()}`;
        db.prepare(`
          INSERT INTO certificates (uuid, user_id, course_id, final_grade)
          VALUES (?, ?, ?, 95.0)
        `).run(certUuid, userId, courseId);

        // Notify student
        db.prepare(`
          INSERT INTO notifications (user_id, title, message, type, link)
          VALUES (?, 'Congratulations! Course Completed', 'You have completed all requirements and earned your official Faculty Certificate.', 'badge', '#/certificates')
        `).run(userId);
      }
    }
  } catch (err) {
    console.error('Badge evaluation error:', err);
  }
}

module.exports = router;
