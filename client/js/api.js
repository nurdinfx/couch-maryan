// ====================================================================
// FACULTY LMS - API CLIENT WRAPPER
// ====================================================================

const API = {
  token: localStorage.getItem('faculty_lms_token') || null,
  currentUser: null,

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('faculty_lms_token', token);
    } else {
      localStorage.removeItem('faculty_lms_token');
    }
  },

  getBaseUrl() {
    if (window.__API_URL__) return window.__API_URL__;
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && !window.location.hostname.includes('onrender.com')) {
      return localStorage.getItem('couch_api_url') || 'https://couch-maryan.onrender.com';
    }
    return '';
  },

  async request(endpoint, options = {}) {
    const url = `${this.getBaseUrl()}/api${endpoint}`;
    const headers = options.headers || {};

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await fetch(url, { ...options, headers });
      
      if (response.status === 401) {
        // If unauthenticated, notify and route to login
        this.setToken(null);
        window.dispatchEvent(new CustomEvent('auth-required'));
        throw new Error('Authentication required');
      }

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || data.message || `Request failed (${response.status})`);
      }
      return data;
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err);
      throw err;
    }
  },

  // Auth
  async login(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    this.setToken(data.token);
    this.currentUser = data.user;
    return data;
  },

  async switchUser(userId) {
    const data = await this.request('/auth/switch-user', {
      method: 'POST',
      body: JSON.stringify({ userId })
    });
    this.setToken(data.token);
    this.currentUser = data.user;
    return data;
  },

  async getMe() {
    const data = await this.request('/auth/me');
    this.currentUser = data.user;
    return data;
  },

  async register(studentData) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(studentData)
    });
    this.setToken(data.token);
    this.currentUser = data.user;
    return data;
  },

  async getDirectory() {
    return this.request('/auth/directory');
  },

  // Courses
  async getCourses() {
    return this.request('/courses');
  },

  async getCourse(id) {
    return this.request(`/courses/${id}`);
  },

  async createCourse(courseData) {
    return this.request('/courses', {
      method: 'POST',
      body: courseData instanceof FormData ? courseData : JSON.stringify(courseData)
    });
  },

  async updateCourse(id, courseData) {
    return this.request(`/courses/${id}`, {
      method: 'PUT',
      body: courseData instanceof FormData ? courseData : JSON.stringify(courseData)
    });
  },

  async deleteCourse(id) {
    return this.request(`/courses/${id}`, { method: 'DELETE' });
  },

  async getParticipants(courseId) {
    return this.request(`/courses/${courseId}/participants`);
  },

  // Modules
  async createModule(courseId, moduleData) {
    return this.request(`/courses/${courseId}/modules`, {
      method: 'POST',
      body: JSON.stringify(moduleData)
    });
  },

  async updateModule(moduleId, moduleData) {
    return this.request(`/courses/modules/${moduleId}`, {
      method: 'PUT',
      body: JSON.stringify(moduleData)
    });
  },

  async deleteModule(moduleId) {
    return this.request(`/courses/modules/${moduleId}`, { method: 'DELETE' });
  },

  // Lessons
  async getLesson(id) {
    return this.request(`/lessons/${id}`);
  },

  async createLesson(moduleId, formData) {
    return this.request(`/lessons/modules/${moduleId}`, {
      method: 'POST',
      body: formData
    });
  },

  async updateLesson(id, formData) {
    return this.request(`/lessons/${id}`, {
      method: 'PUT',
      body: formData
    });
  },

  async deleteLesson(id) {
    return this.request(`/lessons/${id}`, { method: 'DELETE' });
  },

  async updateLessonProgress(lessonId, progressData) {
    return this.request(`/lessons/${lessonId}/progress`, {
      method: 'POST',
      body: JSON.stringify(progressData)
    });
  },

  // Assignments
  async getAssignment(id) {
    return this.request(`/assignments/${id}`);
  },

  async createAssignment(courseId, formData) {
    return this.request(`/assignments/course/${courseId}`, {
      method: 'POST',
      body: formData
    });
  },

  async submitAssignment(assignmentId, formData) {
    return this.request(`/assignments/${assignmentId}/submit`, {
      method: 'POST',
      body: formData
    });
  },

  async getSubmissions(assignmentId) {
    return this.request(`/assignments/${assignmentId}/submissions`);
  },

  async gradeSubmission(submissionId, gradeData) {
    return this.request(`/assignments/submissions/${submissionId}/grade`, {
      method: 'POST',
      body: JSON.stringify(gradeData)
    });
  },

  // Quizzes
  async getQuiz(id) {
    return this.request(`/quizzes/${id}`);
  },

  async createQuiz(courseId, quizData) {
    return this.request(`/quizzes/course/${courseId}`, {
      method: 'POST',
      body: JSON.stringify(quizData)
    });
  },

  async getQuizQuestions(quizId) {
    return this.request(`/quizzes/${quizId}/questions`);
  },

  async addQuizQuestion(quizId, questionData) {
    return this.request(`/quizzes/${quizId}/questions`, {
      method: 'POST',
      body: JSON.stringify(questionData)
    });
  },

  async deleteQuizQuestion(questionId) {
    return this.request(`/quizzes/questions/${questionId}`, { method: 'DELETE' });
  },

  async startQuizAttempt(quizId) {
    return this.request(`/quizzes/${quizId}/start`, { method: 'POST' });
  },

  async submitQuizAttempt(attemptId, answers) {
    return this.request(`/quizzes/attempts/${attemptId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers })
    });
  },

  async getAttemptReview(attemptId) {
    return this.request(`/quizzes/attempts/${attemptId}/review`);
  },

  async gradeQuizEssay(attemptId, gradeData) {
    return this.request(`/quizzes/attempts/${attemptId}/grade-essay`, {
      method: 'POST',
      body: JSON.stringify(gradeData)
    });
  },

  // Gradebook
  async getGradebook(courseId) {
    return this.request(`/grades/courses/${courseId}/gradebook`);
  },

  async getMyGrades(courseId) {
    return this.request(`/grades/courses/${courseId}/my-grades`);
  },

  // Attendance
  async getAttendanceGrid(courseId) {
    return this.request(`/attendance/courses/${courseId}`);
  },

  async createAttendanceSession(courseId, sessionData) {
    return this.request(`/attendance/courses/${courseId}/sessions`, {
      method: 'POST',
      body: JSON.stringify(sessionData)
    });
  },

  async saveAttendanceRecords(sessionId, records) {
    return this.request(`/attendance/sessions/${sessionId}/records`, {
      method: 'POST',
      body: JSON.stringify({ records })
    });
  },

  async getMyAttendance(courseId) {
    return this.request(`/attendance/courses/${courseId}/my-attendance`);
  },

  // Badges & Certificates
  async getBadges() {
    return this.request('/badges');
  },

  async getMyBadges() {
    return this.request('/badges/my-badges');
  },

  async awardBadge(badgeId, userId, courseId) {
    return this.request('/badges/award', {
      method: 'POST',
      body: JSON.stringify({ badge_id: badgeId, user_id: userId, course_id: courseId })
    });
  },

  async getMyCertificates() {
    return this.request('/certificates/my-certificates');
  },

  async verifyCertificate(uuid) {
    return this.request(`/certificates/verify/${encodeURIComponent(uuid)}`);
  },

  async issueCertificate(userId, courseId, finalGrade) {
    return this.request('/certificates/issue', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, course_id: courseId, final_grade: finalGrade })
    });
  },

  // Discussions
  async getCourseDiscussions(courseId) {
    return this.request(`/discussions/courses/${courseId}`);
  },

  async getTopic(id) {
    return this.request(`/discussions/${id}`);
  },

  async createTopic(courseId, topicData) {
    return this.request(`/discussions/courses/${courseId}`, {
      method: 'POST',
      body: JSON.stringify(topicData)
    });
  },

  async postTopicReply(topicId, content) {
    return this.request(`/discussions/${topicId}/replies`, {
      method: 'POST',
      body: JSON.stringify({ content })
    });
  },

  // Announcements
  async getAnnouncements(courseId) {
    return this.request(`/announcements/courses/${courseId}`);
  },

  async createAnnouncement(courseId, annData) {
    return this.request(`/announcements/courses/${courseId}`, {
      method: 'POST',
      body: JSON.stringify(annData)
    });
  },

  // Messages
  async getConversations() {
    return this.request('/messages/conversations');
  },

  async getThread(otherUserId) {
    return this.request(`/messages/thread/${otherUserId}`);
  },

  async sendMessage(recipientId, content, attachmentFile = null) {
    if (attachmentFile) {
      const fd = new FormData();
      fd.append('recipient_id', recipientId);
      if (content) fd.append('content', content);
      fd.append('attachment', attachmentFile);
      return this.request('/messages', {
        method: 'POST',
        body: fd
      });
    }

    return this.request('/messages', {
      method: 'POST',
      body: JSON.stringify({ recipient_id: recipientId, content })
    });
  },

  // Calendar, Search, Notifications, Admin
  async getCalendarEvents() {
    return this.request('/calendar');
  },

  async search(query) {
    return this.request(`/search?q=${encodeURIComponent(query)}`);
  },

  async getNotifications() {
    return this.request('/notifications');
  },

  async getAdminHealth() {
    return this.request('/admin/health');
  },

  async getAuditLogs() {
    return this.request('/admin/audit-logs');
  },

  async getAdmins() {
    return this.request('/admin/admins');
  },

  async createAdmin(adminData) {
    return this.request('/admin/admins', {
      method: 'POST',
      body: JSON.stringify(adminData)
    });
  },

  async deleteAdmin(adminId) {
    return this.request(`/admin/admins/${adminId}`, {
      method: 'DELETE'
    });
  },

  async createBadge(badgeData) {
    return this.request('/badges', {
      method: 'POST',
      body: JSON.stringify(badgeData)
    });
  },

  async getStudents() {
    return this.request('/auth/students');
  },

  async createStudent(studentData) {
    return this.request('/auth/students', {
      method: 'POST',
      body: JSON.stringify(studentData)
    });
  },

  async updateStudent(studentId, studentData) {
    return this.request(`/auth/students/${studentId}`, {
      method: 'PUT',
      body: JSON.stringify(studentData)
    });
  },

  async toggleStudentStatus(studentId, isActive) {
    return this.request(`/auth/students/${studentId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ is_active: isActive })
    });
  },

  async deleteStudent(studentId) {
    return this.request(`/auth/students/${studentId}`, {
      method: 'DELETE'
    });
  },

  async resetPassword(userId, newPassword) {
    return this.request(`/admin/users/${userId}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ new_password: newPassword })
    });
  },

  // Professor Management
  async getProfessors() {
    return this.request('/auth/professors');
  },

  async createProfessor(profData) {
    return this.request('/auth/professors', {
      method: 'POST',
      body: JSON.stringify(profData)
    });
  },

  async updateProfessor(profId, profData) {
    return this.request(`/auth/professors/${profId}`, {
      method: 'PUT',
      body: JSON.stringify(profData)
    });
  },

  async deleteProfessor(profId) {
    return this.request(`/auth/professors/${profId}`, { method: 'DELETE' });
  }
};
