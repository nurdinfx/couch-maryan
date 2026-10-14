const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'faculty_lms.db');
const db = new Database(dbPath);

// Enable Foreign Keys and WAL mode for high performance and integrity
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initSchema() {
  db.exec(`
    -- 1. Users and Authentication
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('professor', 'student', 'admin')),
      avatar_url TEXT,
      student_id_number TEXT,
      department TEXT DEFAULT 'Faculty of Midwifery',
      bio TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 2. Courses (Scoped strictly to this one faculty)
    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      cover_image TEXT,
      professor_id INTEGER REFERENCES users(id),
      start_date DATE,
      end_date DATE,
      is_published INTEGER DEFAULT 1,
      pass_percentage REAL DEFAULT 60.0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 3. Course Enrollments
    CREATE TABLE IF NOT EXISTS enrollments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
      enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, course_id)
    );

    -- 4. Course Modules / Sections
    CREATE TABLE IF NOT EXISTS modules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      sort_order INTEGER DEFAULT 0,
      is_published INTEGER DEFAULT 1
    );

    -- 5. Lessons / Learning Activities
    CREATE TABLE IF NOT EXISTS lessons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      module_id INTEGER REFERENCES modules(id) ON DELETE CASCADE,
      course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      content_type TEXT NOT NULL CHECK(content_type IN ('video', 'document', 'text', 'assignment', 'quiz', 'link')),
      description TEXT,
      content_body TEXT,
      video_url TEXT,
      video_duration_seconds INTEGER DEFAULT 0,
      file_url TEXT,
      file_name TEXT,
      file_size_bytes INTEGER,
      is_required_for_completion INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      is_published INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 6. Student Lesson Progress (Real activity tracking)
    CREATE TABLE IF NOT EXISTS lesson_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      lesson_id INTEGER REFERENCES lessons(id) ON DELETE CASCADE,
      course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
      is_completed INTEGER DEFAULT 0,
      video_watched_seconds REAL DEFAULT 0,
      video_watch_percentage REAL DEFAULT 0,
      completed_at DATETIME,
      last_accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, lesson_id)
    );

    -- 7. Assignments
    CREATE TABLE IF NOT EXISTS assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
      module_id INTEGER REFERENCES modules(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      instructions TEXT NOT NULL,
      attachment_url TEXT,
      attachment_name TEXT,
      due_date DATETIME NOT NULL,
      allow_late INTEGER DEFAULT 1,
      submission_type TEXT DEFAULT 'both' CHECK(submission_type IN ('file', 'text', 'both')),
      max_score REAL DEFAULT 100.0,
      weight_percentage REAL DEFAULT 20.0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 8. Assignment Submissions
    CREATE TABLE IF NOT EXISTS assignment_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assignment_id INTEGER REFERENCES assignments(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      submission_text TEXT,
      file_url TEXT,
      file_name TEXT,
      file_size_bytes INTEGER,
      status TEXT DEFAULT 'submitted' CHECK(status IN ('draft', 'submitted', 'graded', 'resubmission_requested')),
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      grade REAL,
      feedback TEXT,
      graded_by INTEGER REFERENCES users(id),
      graded_at DATETIME,
      is_grades_released INTEGER DEFAULT 1,
      UNIQUE(assignment_id, user_id)
    );

    -- 9. Quizzes & Examinations
    CREATE TABLE IF NOT EXISTS quizzes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
      module_id INTEGER REFERENCES modules(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      time_limit_minutes INTEGER DEFAULT 30,
      max_attempts INTEGER DEFAULT 2,
      passing_percentage REAL DEFAULT 60.0,
      weight_percentage REAL DEFAULT 25.0,
      open_date DATETIME,
      close_date DATETIME,
      release_results_immediately INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 10. Quiz Questions (Reusable Question Bank items)
    CREATE TABLE IF NOT EXISTS quiz_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
      question_text TEXT NOT NULL,
      question_type TEXT NOT NULL CHECK(question_type IN ('single_choice', 'multiple_choice', 'true_false', 'short_answer', 'essay')),
      options_json TEXT, -- JSON array of [{ id, text, isCorrect, explanation }]
      correct_answer_text TEXT,
      points REAL DEFAULT 10.0,
      sort_order INTEGER DEFAULT 0
    );

    -- 11. Quiz Attempts
    CREATE TABLE IF NOT EXISTS quiz_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      attempt_number INTEGER DEFAULT 1,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      submitted_at DATETIME,
      score REAL,
      max_score REAL,
      percentage REAL,
      is_passed INTEGER DEFAULT 0,
      status TEXT DEFAULT 'in_progress' CHECK(status IN ('in_progress', 'completed', 'graded')),
      feedback TEXT
    );

    -- 12. Quiz Answers per Attempt
    CREATE TABLE IF NOT EXISTS quiz_attempt_answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      attempt_id INTEGER REFERENCES quiz_attempts(id) ON DELETE CASCADE,
      question_id INTEGER REFERENCES quiz_questions(id) ON DELETE CASCADE,
      user_answer_json TEXT,
      awarded_points REAL DEFAULT 0,
      is_auto_graded INTEGER DEFAULT 1,
      graded_manually INTEGER DEFAULT 0,
      feedback TEXT
    );

    -- 13. Attendance Sessions
    CREATE TABLE IF NOT EXISTS attendance_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
      session_date DATE NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 14. Attendance Records
    CREATE TABLE IF NOT EXISTS attendance_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER REFERENCES attendance_sessions(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL CHECK(status IN ('present', 'absent', 'late', 'excused')),
      notes TEXT,
      recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(session_id, user_id)
    );

    -- 15. Badges Definition
    CREATE TABLE IF NOT EXISTS badges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      icon TEXT NOT NULL,
      criteria_type TEXT NOT NULL, -- 'first_lesson', 'course_completed', 'quiz_master', 'assignment_excellence', 'perfect_attendance', 'consistent_learner'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 16. Awarded Badges
    CREATE TABLE IF NOT EXISTS awarded_badges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      badge_id INTEGER REFERENCES badges(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
      awarded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(badge_id, user_id, course_id)
    );

    -- 17. Certificates of Completion
    CREATE TABLE IF NOT EXISTS certificates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT UNIQUE NOT NULL,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
      final_grade REAL,
      issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, course_id)
    );

    -- 18. Course Announcements
    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
      author_id INTEGER REFERENCES users(id),
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      is_pinned INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 19. Forum Topics
    CREATE TABLE IF NOT EXISTS forum_topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
      author_id INTEGER REFERENCES users(id),
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      is_pinned INTEGER DEFAULT 0,
      is_locked INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 20. Forum Topic Replies
    CREATE TABLE IF NOT EXISTS forum_replies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      topic_id INTEGER REFERENCES forum_topics(id) ON DELETE CASCADE,
      author_id INTEGER REFERENCES users(id),
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 21. Direct Messages
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      recipient_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 22. In-App Notifications
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'info',
      link TEXT,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 23. System Audit Logs
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      details TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 24. System Configuration
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  console.log('Database tables verified and initialized successfully.');
}

initSchema();

module.exports = { db, initSchema };
