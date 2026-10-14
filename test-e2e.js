const assert = require('assert');

const BASE_URL = 'http://localhost:3000';

async function req(endpoint, options = {}, token = null) {
  const headers = options.headers || {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function runTests() {
  console.log('====================================================');
  console.log('  RUNNING COMPLETE FACULTY LMS END-TO-END TESTS');
  console.log('====================================================');

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    return async () => {
      try {
        await fn();
        console.log(`  [PASS] ${name}`);
        passed++;
      } catch (err) {
        console.error(`  [FAIL] ${name}:`, err.message);
        failed++;
      }
    };
  }

  // 1. Professor Authentication
  let profToken = null;
  await test('Professor login with valid credentials', async () => {
    const res = await req('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'professor@faculty.edu', password: 'password123' })
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.user.role, 'professor');
    assert.strictEqual(res.data.user.full_name, 'Prof. Maryam Al-Mansoor');
    assert(res.data.token, 'Token must be present');
    profToken = res.data.token;
  })();

  // 2. Student Authentication
  let alexToken = null;
  let fatimaToken = null;
  await test('Student login (Alex Chen)', async () => {
    const res = await req('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'alex.chen@student.faculty.edu', password: 'password123' })
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.user.role, 'student');
    assert.strictEqual(res.data.user.student_id_number, 'STU-2026-081');
    alexToken = res.data.token;
  })();

  await test('Student login (Fatima Zahra)', async () => {
    const res = await req('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'fatima.z@student.faculty.edu', password: 'password123' })
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.user.role, 'student');
    fatimaToken = res.data.token;
  })();

  // 3. One Faculty Scope & Courses
  await test('Get courses list scoped strictly to single faculty', async () => {
    const res = await req('/api/courses', {}, profToken);
    assert.strictEqual(res.status, 200);
    assert(res.data.courses.length >= 3, 'Must have faculty courses');
    const cs301 = res.data.courses.find(c => c.code === 'CS301');
    assert(cs301, 'CS301 must exist');
    assert.strictEqual(cs301.professor_name, 'Prof. Maryam Al-Mansoor');
  })();

  // 4. Moodle Course Hierarchy (Modules -> Lessons, Assignments, Quizzes)
  await test('Fetch CS301 structure with modules and learning activities', async () => {
    const res = await req('/api/courses/1', {}, alexToken);
    assert.strictEqual(res.status, 200);
    assert(res.data.modules.length >= 4, 'Must have at least 4 modules');
    
    const mod1 = res.data.modules[0];
    assert(mod1.lessons.length >= 2, 'Module 1 must have lessons');
    
    // Check video activity
    const videoLesson = mod1.lessons.find(l => l.content_type === 'video');
    assert(videoLesson, 'Must have video lesson in Module 1');
    assert(videoLesson.video_url, 'Video lesson must have video_url');
  })();

  // 5. Video Progress Tracking & Lesson Completion
  await test('Student watches video and progress updates realistically', async () => {
    // Report 50% watched on Lesson 4 (Docker & Container Internals) for Fatima
    const res1 = await req('/api/lessons/4/progress', {
      method: 'POST',
      body: JSON.stringify({ watchedSeconds: 326, totalSeconds: 653 })
    }, fatimaToken);
    assert.strictEqual(res1.status, 200);
    assert.strictEqual(res1.data.progress.video_watch_percentage, 50);

    // Report 90% watched (should trigger automatic completion >= 80%)
    const res2 = await req('/api/lessons/4/progress', {
      method: 'POST',
      body: JSON.stringify({ watchedSeconds: 590, totalSeconds: 653 })
    }, fatimaToken);
    assert.strictEqual(res2.status, 200);
    assert.strictEqual(res2.data.progress.is_completed, 1, 'Video must auto-complete when >= 80% watched');
  })();

  // 6. Assignment Submission by Student
  await test('Student submits online response to Assignment 1', async () => {
    const res = await req('/api/assignments/1/submit', {
      method: 'POST',
      body: JSON.stringify({
        submission_text: 'Verified consistent hashing ring with 128 virtual tokens and quorum read/write test harness.'
      })
    }, alexToken);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.submission.status, 'submitted');
  })();

  // 7. Professor Grades Submission & Awards Badge
  await test('Professor grades student submission and leaves detailed feedback', async () => {
    // Get submission for Alex
    const subsRes = await req('/api/assignments/1/submissions', {}, profToken);
    assert.strictEqual(subsRes.status, 200);
    const alexSub = subsRes.data.students.find(s => s.student_id === 2);
    assert(alexSub && alexSub.submission_id, 'Alex submission must be found');

    // Grade 95/100 (triggers Engineering Excellence badge >= 90)
    const gradeRes = await req(`/api/assignments/submissions/${alexSub.submission_id}/grade`, {
      method: 'POST',
      body: JSON.stringify({
        grade: 95.0,
        feedback: 'Exceptional virtual node distribution analysis and partition recovery.',
        is_grades_released: true
      })
    }, profToken);
    assert.strictEqual(gradeRes.status, 200);
    assert.strictEqual(gradeRes.data.submission.grade, 95.0);
    assert.strictEqual(gradeRes.data.submission.status, 'graded');
  })();

  // 8. Timed Quiz Runner: Start, Answer, Auto-grade, Results Review
  let activeAttemptId = null;
  await test('Student starts interactive Midterm Exam attempt', async () => {
    const res = await req('/api/quizzes/1/start', { method: 'POST' }, fatimaToken);
    assert.strictEqual(res.status, 200);
    assert(res.data.attempt.id, 'Attempt ID must be returned');
    assert(res.data.questions.length >= 4, 'Exam questions must be loaded');
    activeAttemptId = res.data.attempt.id;
  })();

  await test('Student submits exam answers and receives instant auto-grading', async () => {
    const res = await req(`/api/quizzes/attempts/${activeAttemptId}/submit`, {
      method: 'POST',
      body: JSON.stringify({
        answers: {
          1: 'b', // Correct
          2: 'false', // Correct
          3: ['opt1', 'opt2', 'opt3', 'opt4'], // Correct
          4: '4', // Correct
          5: 'Virtual nodes distribute tokens uniformly across the consistent hash ring.'
        }
      })
    }, fatimaToken);
    assert.strictEqual(res.status, 200);
    assert(res.data.attempt.score >= 45, 'Auto-graded objective score must be recorded');
  })();

  // 9. Gradebook Matrix & Calculation
  await test('Professor gradebook matrix returns correct weighted scores and letter grades', async () => {
    const res = await req('/api/grades/courses/1/gradebook', {}, profToken);
    assert.strictEqual(res.status, 200);
    assert(res.data.rows.length >= 4, 'All enrolled students must appear in matrix');
    
    // Check Alex row
    const alexRow = res.data.rows.find(r => r.student.id === 2);
    assert(alexRow, 'Alex Chen must be in gradebook');
    assert(alexRow.overall_percentage > 85, 'Overall percentage must reflect graded items');
    assert.strictEqual(alexRow.is_passing, true, 'Passing status must be true');
    assert(['A', 'B'].includes(alexRow.letter_grade), 'Letter grade must be A or B');
  })();

  // 10. Attendance Management
  await test('Professor marks attendance records for session', async () => {
    const res = await req('/api/attendance/sessions/1/records', {
      method: 'POST',
      body: JSON.stringify({
        records: [
          { user_id: 2, status: 'present', notes: 'Active discussion' },
          { user_id: 3, status: 'present', notes: '' },
          { user_id: 4, status: 'late', notes: 'Late by 15 mins' },
          { user_id: 5, status: 'present', notes: 'Lab leader' }
        ]
      })
    }, profToken);
    assert.strictEqual(res.status, 200);
  })();

  // 11. Badges & Verifiable Certificate
  await test('Badges catalog and earned achievements verification', async () => {
    const res = await req('/api/badges', {}, alexToken);
    assert.strictEqual(res.status, 200);
    assert(res.data.badges.length >= 6, 'Must have at least 6 academic badges');
  })();

  await test('Public certificate verification by UUID', async () => {
    const res = await req('/api/certificates/verify/CERT-2026-CS301-8849-AK');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.valid, true);
    assert.strictEqual(res.data.certificate.student_name, 'Layla Karim');
    assert.strictEqual(res.data.certificate.code, 'CS301');
    assert.strictEqual(res.data.issuer, 'Faculty of Computing & Information Science');
  })();

  // 12. Security Enforcement: Student cannot grade submissions or access admin
  await test('Security: Student cannot grade submissions (HTTP 403 Forbidden)', async () => {
    const res = await req('/api/assignments/submissions/1/grade', {
      method: 'POST',
      body: JSON.stringify({ grade: 100 })
    }, alexToken);
    assert.strictEqual(res.status, 403, 'Must reject student grading attempts');
  })();

  await test('Security: Student cannot access system diagnostics (HTTP 403 Forbidden)', async () => {
    const res = await req('/api/admin/health', {}, alexToken);
    assert.strictEqual(res.status, 403, 'Must reject student admin requests');
  })();

  // 13. Discussion Forums & Direct Messaging
  await test('Student posts reply in discussion forum', async () => {
    const res = await req('/api/discussions/1/replies', {
      method: 'POST',
      body: JSON.stringify({ content: 'Testing distributed consensus with automated verification runner.' })
    }, alexToken);
    assert.strictEqual(res.status, 201);
    assert(res.data.reply.id, 'Reply must be created');
  })();

  await test('Direct messaging between student and professor', async () => {
    const res = await req('/api/messages', {
      method: 'POST',
      body: JSON.stringify({
        recipient_id: 1, // Prof. Maryam
        content: 'Hello Professor Maryam, checking in regarding the consensus lab!'
      })
    }, alexToken);
    assert.strictEqual(res.status, 201);
  })();

  // 14. Calendar & Deadlines
  await test('Student calendar returns upcoming deadlines', async () => {
    const res = await req('/api/calendar', {}, alexToken);
    assert.strictEqual(res.status, 200);
    assert(res.data.events.length >= 2, 'Calendar must have scheduled activities');
  })();

  // 15. Site-wide Search
  await test('Search returns relevant courses, lessons, and assignments', async () => {
    const res = await req('/api/search?q=Cloud', {}, alexToken);
    assert.strictEqual(res.status, 200);
    assert(res.data.results.length >= 1, 'Search must return results for "Cloud"');
  })();

  console.log('====================================================');
  console.log(`  TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
