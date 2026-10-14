const bcrypt = require('bcryptjs');
const { db, initSchema } = require('./db');
const { generateAssets } = require('./create-sample-assets');

async function seed() {
  console.log('Starting faculty database seeding...');
  initSchema();
  generateAssets();

  const hashedPassword = bcrypt.hashSync('password123', 10);
  const adminPassword = bcrypt.hashSync('admin123', 10);

  // Clear existing data for fresh clean start
  const tables = [
    'audit_logs', 'notifications', 'messages', 'forum_replies', 'forum_topics',
    'announcements', 'certificates', 'awarded_badges', 'badges', 'attendance_records',
    'attendance_sessions', 'quiz_attempt_answers', 'quiz_attempts', 'quiz_questions',
    'quizzes', 'assignment_submissions', 'assignments', 'lesson_progress', 'lessons',
    'modules', 'enrollments', 'courses', 'users', 'system_settings'
  ];

  db.transaction(() => {
    for (const table of tables) {
      db.prepare(`DELETE FROM ${table}`).run();
    }
  })();

  console.log('Old records purged.');

  // 1. Insert Users
  const insertUser = db.prepare(`
    INSERT INTO users (id, email, password_hash, full_name, role, avatar_url, student_id_number, department, bio)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertUser.run(
    1,
    'professor@faculty.edu',
    hashedPassword,
    'Prof. Maryam Al-Mansoor',
    'professor',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    null,
    'Faculty of Computing & Information Science',
    'Associate Professor of Distributed Systems & Cloud Infrastructure. Head of the Faculty Systems Lab.'
  );

  insertUser.run(
    2,
    'alex.chen@student.faculty.edu',
    hashedPassword,
    'Alex Chen',
    'student',
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
    'STU-2026-081',
    'Faculty of Computing & Information Science',
    'Junior studying Computer Science with interests in Cloud Architecture and High-Performance Computing.'
  );

  insertUser.run(
    3,
    'fatima.z@student.faculty.edu',
    hashedPassword,
    'Fatima Zahra',
    'student',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    'STU-2026-082',
    'Faculty of Computing & Information Science',
    'Computer Engineering undergraduate passionate about distributed systems and site reliability engineering.'
  );

  insertUser.run(
    4,
    'marcus.v@student.faculty.edu',
    hashedPassword,
    'Marcus Vance',
    'student',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    'STU-2026-083',
    'Faculty of Computing & Information Science',
    'Software Engineering student balancing coursework with faculty competitive programming team.'
  );

  insertUser.run(
    5,
    'layla.k@student.faculty.edu',
    hashedPassword,
    'Layla Karim',
    'student',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    'STU-2026-084',
    'Faculty of Computing & Information Science',
    'Dean\'s list senior focusing on cloud-native security, microservice architectures, and distributed databases.'
  );

  insertUser.run(
    6,
    'admin@faculty.edu',
    adminPassword,
    'Faculty IT Administrator',
    'admin',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    null,
    'Faculty Information Systems Directorate',
    'Technical administrator managing faculty LMS infrastructure, security tokens, and database backups.'
  );

  // 2. Insert Courses
  const insertCourse = db.prepare(`
    INSERT INTO courses (id, code, title, description, cover_image, professor_id, start_date, end_date, is_published, pass_percentage)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertCourse.run(
    1,
    'CS301',
    'Cloud Computing & Distributed Systems',
    'In-depth study of distributed system architecture, consensus algorithms (Raft/Paxos), cloud storage primitives, virtualization, container orchestration, and serverless compute.',
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80',
    1,
    '2026-09-01',
    '2026-12-20',
    1,
    60.0
  );

  insertCourse.run(
    2,
    'CS204',
    'Advanced Data Structures & Algorithms',
    'Mastery of balanced search trees, graph algorithms, amortized analysis, dynamic programming, and streaming algorithm designs for high-throughput computing.',
    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80',
    1,
    '2026-09-01',
    '2026-12-20',
    1,
    60.0
  );

  insertCourse.run(
    3,
    'CS410',
    'Machine Learning & Intelligent Systems',
    'Practical and theoretical treatment of neural networks, reinforcement learning, distributed model training, and AI pipeline deployment.',
    'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=600&auto=format&fit=crop&q=80',
    1,
    '2026-09-01',
    '2026-12-20',
    1,
    65.0
  );

  // 3. Enroll Students in Courses
  const insertEnrollment = db.prepare(`INSERT INTO enrollments (user_id, course_id) VALUES (?, ?)`);
  // All 4 students in CS301
  [2, 3, 4, 5].forEach(uid => insertEnrollment.run(uid, 1));
  // Alex, Fatima, Layla in CS204
  [2, 3, 5].forEach(uid => insertEnrollment.run(uid, 2));
  // Fatima, Marcus, Layla in CS410
  [3, 4, 5].forEach(uid => insertEnrollment.run(uid, 3));

  // 4. Insert Modules for CS301
  const insertModule = db.prepare(`
    INSERT INTO modules (id, course_id, title, description, sort_order, is_published)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertModule.run(
    1,
    1,
    'Module 1: Cloud Architecture & Foundations',
    'Core principles of distributed architectures, virtualization, and the CAP theorem.',
    1,
    1
  );

  insertModule.run(
    2,
    1,
    'Module 2: Containerization & Microservice Orchestration',
    'Container runtimes, Docker internals, Kubernetes cluster orchestration, and service meshes.',
    2,
    1
  );

  insertModule.run(
    3,
    1,
    'Module 3: Distributed Storage & Consistent Hashing',
    'Partitioning strategies, replication models, quorum consensus, and object store implementations.',
    3,
    1
  );

  insertModule.run(
    4,
    1,
    'Module 4: Midterm Assessment & Exam Review',
    'Midterm evaluation covering system architecture, fault tolerance, and consensus protocols.',
    4,
    1
  );

  // 5. Insert Lessons for CS301
  const insertLesson = db.prepare(`
    INSERT INTO lessons (
      id, module_id, course_id, title, content_type, description, content_body,
      video_url, video_duration_seconds, file_url, file_name, file_size_bytes,
      is_required_for_completion, sort_order, is_published
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Lesson 1: Course Syllabus (Document)
  insertLesson.run(
    1,
    1,
    1,
    'CS301 Official Syllabus & Course Policy',
    'document',
    'Download and review the semester policies, grading rubrics, exam dates, and academic conduct standards.',
    'Please review the official course syllabus thoroughly. It outlines all expectations, weekly milestones, and academic integrity policies.',
    null,
    0,
    '/uploads/documents/CS301_Course_Syllabus.pdf',
    'CS301_Course_Syllabus.pdf',
    24500,
    1,
    1,
    1
  );

  // Lesson 2: Lecture 1 Video
  insertLesson.run(
    2,
    1,
    1,
    'Lecture 1: Principles of Cloud Distributed Systems',
    'video',
    'In this opening lecture, Prof. Maryam breaks down modern distributed systems, scale-out versus scale-up models, and latency numbers every engineer should know.',
    '### Lecture Summary\n\nIn this session, we investigate the fundamental tradeoffs in distributed computing.\n\nKey Concepts:\n- Single point of failure vs high availability\n- Network partitions and fail-stop vs Byzantine failure modes\n- The Eight Fallacies of Distributed Computing\n\nBe sure to complete at least 80% of the video to record your progress.',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    596, // ~10 mins
    null,
    null,
    null,
    1,
    2,
    1
  );

  // Lesson 3: Lecture 1 Slides (Document)
  insertLesson.run(
    3,
    1,
    1,
    'Lecture 1 Slides: Distributed Foundations & CAP Theorem',
    'document',
    'Full lecture presentation slides covering CAP theorem trade-offs and consensus models.',
    'Presentation slides from Week 1. Review slides 12 through 28 before attempting the module quiz.',
    null,
    0,
    '/uploads/documents/Lecture1_Introduction_to_Distributed_Systems.pdf',
    'Lecture1_Introduction_to_Distributed_Systems.pdf',
    38400,
    1,
    3,
    1
  );

  // Lesson 4: Docker & Containerization Deep Dive (Video)
  insertLesson.run(
    4,
    2,
    1,
    'Lecture 2: Container Internals (Namespaces & Cgroups)',
    'video',
    'Deep architectural dive into Linux namespaces (PID, Mount, Net), cgroups resource throttling, and union overlay filesystems.',
    '### Deep Dive: Container Mechanics\n\nContainers are isolated processes, not lightweight virtual machines. In this lecture, we construct a mini-container using chroot, unshare, and cgroups v2.',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    653,
    null,
    null,
    null,
    1,
    1,
    1
  );

  // Lesson 5: Kubernetes Architecture & Pod Lifecycle (Text)
  insertLesson.run(
    5,
    2,
    1,
    'Architecture Notes: Kubernetes Control Plane & Etcd Consensus',
    'text',
    'Comprehensive reference guide to kube-apiserver, kube-controller-manager, kube-scheduler, and etcd.',
    '# Kubernetes Control Plane Deep Dive\n\nThe Kubernetes control plane makes global decisions about the cluster (for example, scheduling), as well as detecting and responding to cluster events.\n\n## 1. kube-apiserver\nThe API server is the front end for the Kubernetes control plane. It exposes the Kubernetes API and is designed to scale horizontally.\n\n## 2. etcd\nConsistent and highly-available key value store used as Kubernetes\' backing store for all cluster data. Always maintain a backup plan for etcd in production deployments.\n\n## 3. kube-scheduler\nControl plane component that watches for newly created Pods with no assigned node, and selects a node for them to run on based on resource requests and anti-affinity rules.',
    null,
    0,
    null,
    null,
    null,
    1,
    2,
    1
  );

  // Lesson 6: Module 3 Resource Guide (Document)
  insertLesson.run(
    6,
    3,
    1,
    'Assignment 1 Specification: Distributed Object Store',
    'document',
    'Detailed technical specification, test harness requirements, and grading rubric for Assignment 1.',
    'Review this specification document carefully before starting your code implementation.',
    null,
    0,
    '/uploads/documents/Assignment1_Specification_Cloud_Storage.pdf',
    'Assignment1_Specification_Cloud_Storage.pdf',
    41200,
    1,
    1,
    1
  );

  // 6. Insert Assignment for CS301
  const insertAssignment = db.prepare(`
    INSERT INTO assignments (
      id, course_id, module_id, title, instructions, attachment_url, attachment_name,
      due_date, allow_late, submission_type, max_score, weight_percentage
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertAssignment.run(
    1,
    1,
    3,
    'Assignment 1: Distributed Object Storage Ring Implementation',
    'Build a robust, distributed key-value chunk store implementing Consistent Hashing with virtual nodes (128 per physical node). Include replication factor R=3 with quorum read/write consistency (W=2, R=2). Submit your source code archive (.zip) and an executive performance report (.pdf).',
    '/uploads/documents/Assignment1_Specification_Cloud_Storage.pdf',
    'Assignment1_Specification_Cloud_Storage.pdf',
    '2026-11-15 23:59:00',
    1,
    'both',
    100.0,
    25.0
  );

  // 7. Insert Assignment Submissions
  const insertSubmission = db.prepare(`
    INSERT INTO assignment_submissions (
      assignment_id, user_id, submission_text, file_url, file_name, file_size_bytes,
      status, submitted_at, grade, feedback, graded_by, graded_at, is_grades_released
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Alex Chen - Graded 94/100
  insertSubmission.run(
    1,
    2,
    'Implemented consistent hash ring with MurmurHash3 algorithm. Virtual node count tuned to 128 nodes per worker. Quorum consensus verified using automated chaos test suite.',
    '/uploads/submissions/Alex_Chen_CS301_Assignment1_Storage.pdf',
    'Alex_Chen_CS301_Assignment1_Storage.pdf',
    45120,
    'graded',
    '2026-10-10 18:32:00',
    94.0,
    'Outstanding work, Alex! Your virtual node balancing analysis was exceptional, and your chaos testing benchmark proves high resilience under network partition. Slight latency regression noted during node failure recovery.',
    1,
    '2026-10-12 11:15:00',
    1
  );

  // Fatima Zahra - Graded 88/100
  insertSubmission.run(
    1,
    3,
    'Designed 3-node distributed chunk store with MD5 token ring and configurable write quorum. Included Prometheus metrics exporter.',
    '/uploads/documents/Assignment1_Specification_Cloud_Storage.pdf',
    'Fatima_Zahra_Assignment1_Final.pdf',
    39800,
    'graded',
    '2026-10-11 20:10:00',
    88.0,
    'Very solid implementation, Fatima! Clean modular structure and great metrics visualization. Remember to handle network timeout retries more gracefully.',
    1,
    '2026-10-12 11:30:00',
    1
  );

  // Marcus Vance - Awaiting grading / submitted
  insertSubmission.run(
    1,
    4,
    'Implemented basic hash ring. Encountered some concurrency deadlocks with read quorum during simultaneous partition tests.',
    null,
    null,
    null,
    'submitted',
    '2026-10-13 22:45:00',
    null,
    null,
    null,
    null,
    0
  );

  // Layla Karim - Graded 98/100
  insertSubmission.run(
    1,
    5,
    'Complete Raft-coordinated metadata tier coupled with gossip-based chunk health heartbeats. Included comprehensive fuzz testing suite.',
    '/uploads/submissions/Alex_Chen_CS301_Assignment1_Storage.pdf',
    'Layla_Karim_CS301_Storage_Cluster.pdf',
    52300,
    'graded',
    '2026-10-09 14:20:00',
    98.0,
    'Remarkable mastery of consensus and partition tolerance, Layla. This is publication-quality systems programming.',
    1,
    '2026-10-11 09:40:00',
    1
  );

  // 8. Insert Quiz for CS301 Module 4
  const insertQuiz = db.prepare(`
    INSERT INTO quizzes (
      id, course_id, module_id, title, description, time_limit_minutes,
      max_attempts, passing_percentage, weight_percentage, open_date, close_date, release_results_immediately
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertQuiz.run(
    1,
    1,
    4,
    'Midterm Examination: Distributed Systems Architecture',
    'Comprehensive examination testing your understanding of consistency models, CAP theorem, replication topologies, and container orchestration.',
    30, // 30 minutes
    2,
    60.0,
    25.0,
    '2026-10-01 08:00:00',
    '2026-11-30 23:59:00',
    1
  );

  // 9. Insert Quiz Questions
  const insertQuestion = db.prepare(`
    INSERT INTO quiz_questions (
      id, quiz_id, question_text, question_type, options_json, correct_answer_text, points, sort_order
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Q1: Single Choice
  insertQuestion.run(
    1,
    1,
    'According to Brewer\'s CAP theorem, what is guaranteed in an asynchronous network during a network partition (P)?',
    'single_choice',
    JSON.stringify([
      { id: 'a', text: 'You can achieve both perfect Consistency (C) and perfect Availability (A) simultaneously.', isCorrect: false },
      { id: 'b', text: 'You must choose between Consistency (C) or Availability (A); you cannot guarantee both.', isCorrect: true },
      { id: 'c', text: 'Partition tolerance can be eliminated by using fiber-optic links.', isCorrect: false },
      { id: 'd', text: 'Consistency is always preserved regardless of node drops.', isCorrect: false }
    ]),
    'b',
    10.0,
    1
  );

  // Q2: True / False
  insertQuestion.run(
    2,
    1,
    'True or False: Linux containers run on a separate guest kernel managed by a Type-1 hypervisor.',
    'true_false',
    JSON.stringify([
      { id: 'true', text: 'True', isCorrect: false },
      { id: 'false', text: 'False - Containers share the host Linux kernel and use cgroups/namespaces for isolation.', isCorrect: true }
    ]),
    'false',
    10.0,
    2
  );

  // Q3: Multiple Choice (Multi-select)
  insertQuestion.run(
    3,
    1,
    'Which of the following are among the classic Fallacies of Distributed Computing identified by Peter Deutsch? (Select all that apply)',
    'multiple_choice',
    JSON.stringify([
      { id: 'opt1', text: 'The network is reliable', isCorrect: true },
      { id: 'opt2', text: 'Latency is zero', isCorrect: true },
      { id: 'opt3', text: 'Bandwidth is infinite', isCorrect: true },
      { id: 'opt4', text: 'Transport cost is zero', isCorrect: true }
    ]),
    null,
    15.0,
    3
  );

  // Q4: Short Answer
  insertQuestion.run(
    4,
    1,
    'In a quorum-based replication system with N = 3 replicas, what is the minimum value of W + R required to prevent stale reads and ensure strong consistency?',
    'short_answer',
    null,
    '4',
    10.0,
    4
  );

  // Q5: Essay Question
  insertQuestion.run(
    5,
    1,
    'Explain the role of Virtual Nodes in a Consistent Hashing ring and describe how they resolve hot spots and heterogeneous node capacities.',
    'essay',
    null,
    null,
    20.0,
    5
  );

  // 10. Pre-seed Quiz Attempts
  const insertAttempt = db.prepare(`
    INSERT INTO quiz_attempts (
      id, quiz_id, user_id, attempt_number, started_at, submitted_at,
      score, max_score, percentage, is_passed, status, feedback
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertAnswer = db.prepare(`
    INSERT INTO quiz_attempt_answers (
      attempt_id, question_id, user_answer_json, awarded_points, is_auto_graded, graded_manually, feedback
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  // Alex Chen Attempt
  insertAttempt.run(
    1,
    1,
    2,
    1,
    '2026-10-11 14:00:00',
    '2026-10-11 14:24:15',
    60.0,
    65.0,
    92.3,
    1,
    'graded',
    'Well done Alex! Comprehensive answers on CAP and virtual nodes.'
  );

  insertAnswer.run(1, 1, JSON.stringify('b'), 10.0, 1, 0, 'Correct.');
  insertAnswer.run(1, 2, JSON.stringify('false'), 10.0, 1, 0, 'Correct.');
  insertAnswer.run(1, 3, JSON.stringify(['opt1', 'opt2', 'opt3', 'opt4']), 15.0, 1, 0, 'All correct fallacies selected.');
  insertAnswer.run(1, 4, JSON.stringify('4'), 10.0, 1, 0, 'Exact correct quorum formula (W + R > N).');
  insertAnswer.run(1, 5, JSON.stringify('Virtual nodes map multiple points on the hash ring to a single physical server. This disperses data uniformly across the cluster, preventing non-uniform hash distribution and allowing more virtual tokens for servers with larger SSD capacity.'), 15.0, 0, 1, 'Clear explanation of token distribution.');

  // Layla Karim Attempt - 65/65 (100%)
  insertAttempt.run(
    2,
    1,
    5,
    1,
    '2026-10-10 10:00:00',
    '2026-10-10 10:21:00',
    65.0,
    65.0,
    100.0,
    1,
    'graded',
    'Flawless exam performance.'
  );
  insertAnswer.run(2, 1, JSON.stringify('b'), 10.0, 1, 0, 'Correct.');
  insertAnswer.run(2, 2, JSON.stringify('false'), 10.0, 1, 0, 'Correct.');
  insertAnswer.run(2, 3, JSON.stringify(['opt1', 'opt2', 'opt3', 'opt4']), 15.0, 1, 0, 'All correct.');
  insertAnswer.run(2, 4, JSON.stringify('4'), 10.0, 1, 0, 'Correct.');
  insertAnswer.run(2, 5, JSON.stringify('Virtual nodes decouple the number of physical nodes from the hash space partitions, enabling uniform variance reduction and dynamic proportional weighting according to hardware capabilities.'), 20.0, 0, 1, 'Exceptional technical depth.');

  // 11. Pre-seed Lesson Progress
  const insertProgress = db.prepare(`
    INSERT INTO lesson_progress (
      user_id, lesson_id, course_id, is_completed, video_watched_seconds, video_watch_percentage, completed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  // Layla Karim has completed all 6 lessons (100% course progress)
  [1, 2, 3, 4, 5, 6].forEach(lid => {
    insertProgress.run(5, lid, 1, 1, 600, 100, '2026-10-10 15:00:00');
  });

  // Alex Chen completed lessons 1, 2, 3, 4 (66.7% progress)
  [1, 2, 3, 4].forEach(lid => {
    insertProgress.run(2, lid, 1, 1, 580, 97.3, '2026-10-11 16:00:00');
  });
  insertProgress.run(2, 5, 1, 0, 0, 0, null);
  insertProgress.run(2, 6, 1, 0, 0, 0, null);

  // Fatima Zahra completed lessons 1, 2, 3 (50% progress)
  [1, 2, 3].forEach(lid => {
    insertProgress.run(3, lid, 1, 1, 550, 92.2, '2026-10-12 12:00:00');
  });

  // Marcus Vance has only completed lesson 1 (16.7% progress) - "At Risk"
  insertProgress.run(4, 1, 1, 1, 0, 0, '2026-10-05 09:00:00');
  insertProgress.run(4, 2, 1, 0, 65, 10.9, null); // watched 10% of video

  // 12. Insert Attendance Sessions & Records
  const insertSession = db.prepare(`
    INSERT INTO attendance_sessions (id, course_id, session_date, title, description)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertSession.run(1, 1, '2026-09-08', 'Week 1: Course Introduction & Distributed Fundamentals', 'First live seminar and lab setup check.');
  insertSession.run(2, 1, '2026-09-15', 'Week 2: Consensus Models & CAP Theorem Discussion', 'Interactive seminar on Raft consensus.');
  insertSession.run(3, 1, '2026-09-22', 'Week 3: Container Runtimes & Orchestration', 'Live coding demonstration with Docker and Kubernetes.');
  insertSession.run(4, 1, '2026-09-29', 'Week 4: Consistent Hashing & Storage Architecture', 'Review of Assignment 1 architectures.');

  const insertAttendance = db.prepare(`
    INSERT INTO attendance_records (session_id, user_id, status, notes)
    VALUES (?, ?, ?, ?)
  `);

  // Layla Karim: 4/4 Present (100%)
  [1, 2, 3, 4].forEach(sid => insertAttendance.run(sid, 5, 'present', 'Active participation'));

  // Alex Chen: 3 Present, 1 Late (95%)
  insertAttendance.run(1, 2, 'present', null);
  insertAttendance.run(2, 2, 'present', null);
  insertAttendance.run(3, 2, 'late', 'Arrived 10 mins late due to faculty transit');
  insertAttendance.run(4, 2, 'present', null);

  // Fatima Zahra: 3 Present, 1 Excused
  insertAttendance.run(1, 3, 'present', null);
  insertAttendance.run(2, 3, 'present', null);
  insertAttendance.run(3, 3, 'excused', 'Medical leave approved by faculty office');
  insertAttendance.run(4, 3, 'present', null);

  // Marcus Vance: 1 Present, 2 Absent, 1 Late (At Risk)
  insertAttendance.run(1, 4, 'present', null);
  insertAttendance.run(2, 4, 'absent', 'Unexcused absence');
  insertAttendance.run(3, 4, 'late', 'Late by 25 minutes');
  insertAttendance.run(4, 4, 'absent', 'Unexcused absence');

  // 13. Insert Badges Definition
  const insertBadge = db.prepare(`
    INSERT INTO badges (id, code, name, description, icon, criteria_type)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertBadge.run(1, 'first_lesson', 'First Step in Cloud', 'Completed your very first lesson and educational resource in the faculty portal.', '🎓', 'first_lesson');
  insertBadge.run(2, 'quiz_master', 'Quiz Master', 'Scored 90% or higher on an official academic quiz or examination.', '🏆', 'quiz_master');
  insertBadge.run(3, 'assignment_excellence', 'Engineering Excellence', 'Achieved a grade of 90+ on an engineering coding assignment.', '⚡', 'assignment_excellence');
  insertBadge.run(4, 'perfect_attendance', 'Steadfast Attendance', 'Maintained 100% attendance across faculty sessions.', '📅', 'perfect_attendance');
  insertBadge.run(5, 'course_completed', 'Course Completed', 'Completed all required lessons, activities, and assessments in a course.', '📜', 'course_completed');
  insertBadge.run(6, 'consistent_learner', 'Consistent Learner', 'Engaged consistently over multiple consecutive weeks.', '🔥', 'consistent_learner');

  // 14. Insert Awarded Badges
  const insertAwardedBadge = db.prepare(`
    INSERT INTO awarded_badges (badge_id, user_id, course_id, awarded_at)
    VALUES (?, ?, ?, ?)
  `);

  // Layla Karim earned multiple badges
  insertAwardedBadge.run(1, 5, 1, '2026-09-02 10:00:00');
  insertAwardedBadge.run(2, 5, 1, '2026-10-10 10:25:00');
  insertAwardedBadge.run(3, 5, 1, '2026-10-11 09:45:00');
  insertAwardedBadge.run(4, 5, 1, '2026-09-30 18:00:00');
  insertAwardedBadge.run(5, 5, 1, '2026-10-12 16:00:00');

  // Alex Chen earned First Step, Quiz Master, Assignment Excellence
  insertAwardedBadge.run(1, 2, 1, '2026-09-03 14:20:00');
  insertAwardedBadge.run(2, 2, 1, '2026-10-11 14:30:00');
  insertAwardedBadge.run(3, 2, 1, '2026-10-12 11:20:00');

  // Fatima Zahra earned First Step
  insertAwardedBadge.run(1, 3, 1, '2026-09-04 11:15:00');

  // 15. Insert Certificate for Layla Karim
  const insertCertificate = db.prepare(`
    INSERT INTO certificates (uuid, user_id, course_id, final_grade, issued_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertCertificate.run(
    'CERT-2026-CS301-8849-AK',
    5,
    1,
    98.5,
    '2026-10-12 16:30:00'
  );

  // 16. Insert Announcements
  const insertAnnouncement = db.prepare(`
    INSERT INTO announcements (course_id, author_id, title, content, is_pinned, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertAnnouncement.run(
    1,
    1,
    'Welcome to CS301: Distributed Systems & Cloud Infrastructure',
    'Welcome everyone to the Fall term! Please make sure you have reviewed the syllabus and downloaded the required development environment specifications. All code examples will be available in the faculty lab repository.',
    1,
    '2026-09-01 09:00:00'
  );

  insertAnnouncement.run(
    1,
    1,
    'Midterm Exam Review & Office Hours Schedule',
    'The Midterm Examination is now accessible under Module 4. You will have 30 minutes to complete the attempt. Additional office hours will be held this Thursday from 14:00 to 16:00.',
    0,
    '2026-10-08 11:00:00'
  );

  // 17. Insert Forum Topics & Replies
  const insertTopic = db.prepare(`
    INSERT INTO forum_topics (id, course_id, author_id, title, content, is_pinned, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertTopic.run(
    1,
    1,
    1,
    'Discussion: CAP Theorem Trade-offs in Real-World Systems',
    'When designing systems like Amazon DynamoDB or Apache Cassandra, how do practical engineering teams balance between Consistency and Availability during unexpected cross-datacenter cable cuts? Share your thoughts below!',
    1,
    '2026-09-10 10:00:00'
  );

  const insertReply = db.prepare(`
    INSERT INTO forum_replies (topic_id, author_id, content, created_at)
    VALUES (?, ?, ?, ?)
  `);

  insertReply.run(
    1,
    2,
    'Dynamo chooses high availability for shopping cart writes (using vector clocks and client-side reconciliation) because dropping a user checkout order costs real revenue.',
    '2026-09-10 14:32:00'
  );

  insertReply.run(
    1,
    5,
    'Exactly, Alex. In contrast, financial ledger databases and distributed lock managers like Chubby or etcd strictly prioritize Consistency—returning an error or waiting on leader election rather than serving stale state.',
    '2026-09-10 15:45:00'
  );

  insertReply.run(
    1,
    1,
    'Great contributions from both Alex and Layla! This illustrates why system requirements dictate your architectural choices on the CAP spectrum.',
    '2026-09-11 09:12:00'
  );

  // 18. Insert Direct Messages
  const insertMessage = db.prepare(`
    INSERT INTO messages (sender_id, recipient_id, content, is_read, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertMessage.run(
    2,
    1,
    'Professor Maryam, could you clarify whether we are allowed to use MurmurHash3 or SHA-256 for the virtual node token generator in Assignment 1?',
    1,
    '2026-10-09 11:20:00'
  );

  insertMessage.run(
    1,
    2,
    'Hello Alex, MurmurHash3 is highly recommended because of its fast distribution and low collision rate for hash rings. Good luck!',
    1,
    '2026-10-09 11:45:00'
  );

  insertMessage.run(
    4,
    1,
    'Professor, I am struggling with the network partition simulator for Assignment 1. May I come to your office hours on Thursday?',
    0,
    '2026-10-13 19:10:00'
  );

  // 19. Insert In-App Notifications
  const insertNotification = db.prepare(`
    INSERT INTO notifications (user_id, title, message, type, link, is_read)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertNotification.run(
    2,
    'Assignment 1 Graded',
    'Prof. Maryam graded your Assignment 1 submission: 94 / 100 with personalized feedback.',
    'grade',
    '#/course/1/assignment/1',
    0
  );

  insertNotification.run(
    2,
    'New Badge Earned!',
    'You earned the "Engineering Excellence" badge for your outstanding assignment grade.',
    'badge',
    '#/badges',
    0
  );

  insertNotification.run(
    4,
    'Upcoming Midterm Exam Deadline',
    'Don\'t forget to complete the Distributed Systems Midterm Examination before the close date.',
    'warning',
    '#/course/1/quiz/1',
    0
  );

  // 20. Insert Audit Logs
  const insertAudit = db.prepare(`
    INSERT INTO audit_logs (user_id, action, details, ip_address)
    VALUES (?, ?, ?, ?)
  `);

  insertAudit.run(1, 'GRADE_RELEASED', 'Released grades for Assignment 1 (CS301)', '192.168.1.100');
  insertAudit.run(1, 'COURSE_UPDATED', 'Updated Module 4 description and quiz settings', '192.168.1.100');
  insertAudit.run(6, 'SYSTEM_BACKUP', 'Automated nightly SQLite WAL backup completed', '127.0.0.1');

  // 21. System Settings
  const insertSetting = db.prepare(`INSERT INTO system_settings (key, value) VALUES (?, ?)`);
  insertSetting.run('faculty_name', 'Faculty of Computing & Information Science');
  insertSetting.run('institution_name', 'Faculty Academic Portal');
  insertSetting.run('primary_professor', 'Prof. Maryam Al-Mansoor');
  insertSetting.run('moodle_theme', 'boost_light');
  insertSetting.run('allow_student_self_registration', 'true');

  console.log('Seeding completed successfully with rich faculty academic data!');
}

module.exports = { seed };

if (require.main === module) {
  seed();
}
