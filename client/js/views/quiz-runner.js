// ====================================================================
// VIEW: INTERACTIVE QUIZ & EXAM RUNNER
// ====================================================================

const QuizView = {
  currentAttempt: null,
  questions: [],
  answers: {},
  timerInterval: null,
  remainingSeconds: 0,

  async render(params) {
    const quizId = parseInt(params.id);
    const user = API.currentUser;
    const isProfessor = user.role === 'professor' || user.role === 'admin';

    const data = await API.getQuiz(quizId);
    const quiz = data.quiz;
    const attempts = data.attempts || [];

    // If active attempt requested, or user clicked start
    if (params.action === 'run' && params.attemptId) {
      return this.renderActiveExamRunner(params.attemptId);
    }

    if (params.action === 'review' && params.attemptId) {
      return this.renderAttemptReview(params.attemptId, isProfessor);
    }

    return `
      <!-- Breadcrumbs -->
      <div class="breadcrumb-trail">
        <a href="#/dashboard">Dashboard</a>
        <span class="breadcrumb-sep">/</span>
        <a href="#/course/${quiz.course_id}">${quiz.course_code}</a>
        <span class="breadcrumb-sep">/</span>
        <span>${quiz.module_title || 'Module'}</span>
        <span class="breadcrumb-sep">/</span>
        <span>${quiz.title}</span>
      </div>

      <!-- Quiz Overview Card -->
      <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 2rem; margin-bottom: 2rem; box-shadow: var(--shadow-sm);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;">
          <div>
            <div style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.35rem;">
              <span class="badge badge-success">🏆 ONLINE EXAMINATION</span>
              <span style="font-size: 0.8rem; color: var(--text-muted);">${quiz.course_code}: ${quiz.course_title}</span>
            </div>
            <h1 style="font-size: 1.6rem; margin-bottom: 0.75rem;">${quiz.title}</h1>
            <p style="font-size: 0.88rem; color: var(--text-muted); max-width: 750px; line-height: 1.5;">${quiz.description || ''}</p>
          </div>

          <div>
            ${isProfessor ? `
              <button class="btn btn-outline btn-sm" onclick="App.showModal('addQuestionModal', { quizId: ${quiz.id} })">
                + Add Question to Bank
              </button>
            ` : ''}
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.25rem; margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--border-color);">
          <div>
            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700;">TIME LIMIT</div>
            <div style="font-size: 1.25rem; font-weight: 800;">${quiz.time_limit_minutes} Minutes</div>
          </div>
          <div>
            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700;">PASSING SCORE</div>
            <div style="font-size: 1.25rem; font-weight: 800; color: var(--success);">${quiz.passing_percentage}%</div>
          </div>
          <div>
            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700;">QUESTIONS IN BANK</div>
            <div style="font-size: 1.25rem; font-weight: 800;">${quiz.question_count} Questions (${quiz.total_points} Pts)</div>
          </div>
          <div>
            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700;">ATTEMPTS ALLOWED</div>
            <div style="font-size: 1.25rem; font-weight: 800;">${quiz.max_attempts} Maximum</div>
          </div>
        </div>

        <!-- Start Attempt Action -->
        <div style="margin-top: 2rem; display: flex; gap: 1rem; align-items: center;">
          ${attempts.length < quiz.max_attempts ? `
            <button class="btn btn-primary" onclick="QuizView.startAttempt(${quiz.id})" style="padding: 0.75rem 1.75rem; font-size: 1rem;">
              🚀 ${attempts.length > 0 ? 'Start Another Attempt' : 'Start Exam Now'}
            </button>
          ` : `
            <span class="badge badge-warning" style="font-size: 0.85rem; padding: 0.5rem 1rem;">
              Maximum attempt limit reached (${quiz.max_attempts} of ${quiz.max_attempts})
            </span>
          `}
          ${isProfessor ? `
            <button class="btn btn-outline" onclick="QuizView.previewQuestionBank(${quiz.id})">
              Inspect Questions Bank
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Past Attempts History Table -->
      <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 1.5rem; box-shadow: var(--shadow-sm);">
        <h3 style="font-size: 1.15rem; margin-bottom: 1rem;">Summary of Previous Attempts</h3>
        
        <div class="gradebook-table-container">
          <table class="gradebook-table">
            <thead>
              <tr>
                <th>Attempt #</th>
                <th>Started</th>
                <th>Submitted</th>
                <th>Score</th>
                <th>Percentage</th>
                <th>Result</th>
                <th>Review</th>
              </tr>
            </thead>
            <tbody>
              ${attempts.map(att => `
                <tr>
                  <td><strong>Attempt ${att.attempt_number}</strong></td>
                  <td style="font-size: 0.8rem;">${new Date(att.started_at).toLocaleString()}</td>
                  <td style="font-size: 0.8rem;">${att.submitted_at ? new Date(att.submitted_at).toLocaleString() : 'In Progress'}</td>
                  <td><strong>${att.score !== null ? att.score + ' / ' + att.max_score : '—'}</strong></td>
                  <td><strong style="color: ${att.percentage >= quiz.passing_percentage ? 'var(--success)' : 'var(--danger)'};">${att.percentage !== null ? att.percentage + '%' : '—'}</strong></td>
                  <td>
                    ${att.status === 'in_progress' ? '<span class="badge badge-warning">In Progress</span>' : att.is_passed ? '<span class="badge badge-success">Passed</span>' : '<span class="badge badge-danger">Not Passed</span>'}
                  </td>
                  <td>
                    ${att.submitted_at ? `
                      <a href="#/course/${quiz.course_id}/quiz/${quiz.id}?action=review&attemptId=${att.id}" class="btn btn-outline btn-sm">
                        View Review
                      </a>
                    ` : `
                      <a href="#/course/${quiz.course_id}/quiz/${quiz.id}?action=run&attemptId=${att.id}" class="btn btn-primary btn-sm">
                        Resume Attempt
                      </a>
                    `}
                  </td>
                </tr>
              `).join('')}

              ${attempts.length === 0 ? `
                <tr>
                  <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">
                    No attempts recorded yet.
                  </td>
                </tr>
              ` : ''}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  async startAttempt(quizId) {
    try {
      const data = await API.startQuizAttempt(quizId);
      window.location.hash = `#/course/1/quiz/${quizId}?action=run&attemptId=${data.attempt.id}`;
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  },

  async renderActiveExamRunner(attemptId) {
    setTimeout(async () => {
      try {
        const data = await API.request(`/quizzes/attempts/${attemptId}/review`).catch(async () => {
          // If in progress, fetch questions from start
          return null;
        });

        // Fetch live runner questions
        const quizRes = await API.request(`/quizzes/1/questions`);
        QuizView.questions = quizRes.questions || [];
        QuizView.currentAttempt = { id: attemptId };
        QuizView.answers = {};

        // Start countdown timer: 30 minutes
        QuizView.remainingSeconds = 30 * 60;
        if (QuizView.timerInterval) clearInterval(QuizView.timerInterval);

        QuizView.timerInterval = setInterval(() => {
          QuizView.remainingSeconds--;
          const timerEl = document.getElementById('quiz-countdown-timer');
          if (timerEl) {
            const mins = Math.floor(QuizView.remainingSeconds / 60);
            const secs = QuizView.remainingSeconds % 60;
            timerEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            if (QuizView.remainingSeconds <= 300) {
              timerEl.style.color = '#ef4444'; // Red alert under 5 minutes
            }
          }
          if (QuizView.remainingSeconds <= 0) {
            clearInterval(QuizView.timerInterval);
            App.showToast('Time limit reached! Submitting your examination answers automatically...', 'warning');
            QuizView.submitAttempt();
          }
        }, 1000);

        QuizView.renderQuestionCards();
      } catch (err) {
        console.error('Quiz Runner Error:', err);
      }
    }, 50);

    return `
      <!-- Sticky Exam Timer & Header -->
      <div class="quiz-header-bar">
        <div>
          <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Examination In Progress</div>
          <h2 style="font-size: 1.15rem; margin: 0;">Midterm Examination: Distributed Systems Architecture</h2>
        </div>

        <div class="quiz-timer-box">
          <span>⏱ Time Remaining:</span>
          <span id="quiz-countdown-timer">30:00</span>
        </div>

        <div>
          <button class="btn btn-success" onclick="QuizView.submitAttempt()">
            Finish & Submit Exam
          </button>
        </div>
      </div>

      <!-- Question Navigation Palette -->
      <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1.5rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem;">
        <span style="font-size: 0.85rem; font-weight: 700;">Question Navigator:</span>
        <div id="quiz-palette-container" style="display: flex; gap: 0.5rem; flex-wrap: wrap;"></div>
      </div>

      <!-- Questions List Container -->
      <div id="quiz-questions-list-container">
        <div style="padding: 3rem; text-align: center;">Initializing examination questions...</div>
      </div>
    `;
  },

  renderQuestionCards() {
    const palette = document.getElementById('quiz-palette-container');
    const container = document.getElementById('quiz-questions-list-container');
    if (!container) return;

    if (palette) {
      palette.innerHTML = this.questions.map((q, idx) => `
        <button id="palette-btn-${q.id}" class="btn btn-outline btn-sm" style="width: 38px; height: 38px; padding: 0; font-weight: 700;" onclick="document.getElementById('question-card-${q.id}').scrollIntoView({ behavior: 'smooth' })">
          ${idx + 1}
        </button>
      `).join('');
    }

    container.innerHTML = this.questions.map((q, idx) => `
      <div class="quiz-question-box" id="question-card-${q.id}">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
          <span style="font-weight: 800; color: var(--primary); font-size: 0.95rem;">Question ${idx + 1} of ${this.questions.length}</span>
          <span class="badge badge-primary">${q.points} Points</span>
        </div>

        <div style="font-size: 1.05rem; font-weight: 600; line-height: 1.5; margin-bottom: 1.25rem;">
          ${q.question_text}
        </div>

        <!-- Render options according to type -->
        <div class="quiz-options-wrapper">
          ${this.renderQuestionInputs(q)}
        </div>
      </div>
    `).join('') + `
      <div style="text-align: center; margin: 2.5rem 0;">
        <button class="btn btn-success" onclick="QuizView.submitAttempt()" style="padding: 0.85rem 2.5rem; font-size: 1.05rem;">
          Confirm & Submit All Answers →
        </button>
      </div>
    `;
  },

  renderQuestionInputs(q) {
    if (q.question_type === 'single_choice' || q.question_type === 'true_false') {
      return (q.options || []).map(opt => `
        <label class="quiz-option-label">
          <input type="radio" name="question_${q.id}" value="${opt.id}" onchange="QuizView.recordAnswer(${q.id}, '${opt.id}')">
          <span style="font-size: 0.92rem;">${opt.text}</span>
        </label>
      `).join('');
    }

    if (q.question_type === 'multiple_choice') {
      return (q.options || []).map(opt => `
        <label class="quiz-option-label">
          <input type="checkbox" name="question_${q.id}" value="${opt.id}" onchange="QuizView.recordMultiAnswer(${q.id}, '${opt.id}')">
          <span style="font-size: 0.92rem;">${opt.text}</span>
        </label>
      `).join('');
    }

    if (q.question_type === 'short_answer') {
      return `
        <input type="text" placeholder="Type your concise answer..." style="width: 100%; max-width: 400px; padding: 0.75rem 1rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 0.95rem;"
               oninput="QuizView.recordAnswer(${q.id}, this.value)">
      `;
    }

    if (q.question_type === 'essay') {
      return `
        <textarea rows="5" placeholder="Enter your detailed technical explanation..." style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-family: inherit; font-size: 0.9rem;"
                  oninput="QuizView.recordAnswer(${q.id}, this.value)"></textarea>
      `;
    }

    return '';
  },

  recordAnswer(questionId, val) {
    this.answers[questionId] = val;
    this.updatePaletteButton(questionId, Boolean(val));
  },

  recordMultiAnswer(questionId, optionId) {
    if (!this.answers[questionId]) this.answers[questionId] = [];
    const idx = this.answers[questionId].indexOf(optionId);
    if (idx > -1) {
      this.answers[questionId].splice(idx, 1);
    } else {
      this.answers[questionId].push(optionId);
    }
    this.updatePaletteButton(questionId, this.answers[questionId].length > 0);
  },

  updatePaletteButton(questionId, isAnswered) {
    const btn = document.getElementById(`palette-btn-${questionId}`);
    if (btn) {
      if (isAnswered) {
        btn.style.background = 'var(--success)';
        btn.style.color = 'white';
        btn.style.borderColor = 'var(--success)';
      } else {
        btn.style.background = 'transparent';
        btn.style.color = 'var(--text-main)';
        btn.style.borderColor = 'var(--border-color)';
      }
    }
  },

  async submitAttempt() {
    if (this.timerInterval) clearInterval(this.timerInterval);

    try {
      const res = await API.submitQuizAttempt(this.currentAttempt.id, this.answers);
      App.showToast('Exam submitted and graded successfully! 🏆');
      window.location.hash = `#/course/1/quiz/1?action=review&attemptId=${this.currentAttempt.id}`;
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  },

  async renderAttemptReview(attemptId, isProfessor) {
    setTimeout(async () => {
      try {
        const data = await API.getAttemptReview(attemptId);
        const container = document.getElementById('attempt-review-container');
        if (!container) return;

        const att = data.attempt;
        const answers = data.answers;

        container.innerHTML = `
          <!-- Result Banner -->
          <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 2rem; margin-bottom: 2rem; text-align: center; box-shadow: var(--shadow-sm);">
            <div style="font-size: 3rem; margin-bottom: 0.5rem;">${att.is_passed ? '🎉' : '📝'}</div>
            <h2 style="font-size: 1.6rem; margin-bottom: 0.35rem;">Exam Score: ${att.score} / ${att.max_score} (${att.percentage}%)</h2>
            <div style="margin-bottom: 1rem;">
              <span class="badge ${att.is_passed ? 'badge-success' : 'badge-danger'}" style="font-size: 0.88rem; padding: 0.4rem 1rem;">
                ${att.is_passed ? 'STATUS: PASSED' : 'STATUS: BELOW PASSING THRESHOLD'}
              </span>
            </div>
            <p style="color: var(--text-muted); font-size: 0.88rem; max-width: 600px; margin: 0 auto;">
              ${att.feedback || 'Attempt completed.'}
            </p>
          </div>

          <!-- Questions Review breakdown -->
          <div style="display: flex; flex-direction: column; gap: 1.5rem;">
            ${answers.map((a, idx) => `
              <div class="quiz-question-box" style="border-left: 5px solid ${a.awarded_points >= a.max_points ? 'var(--success)' : a.awarded_points > 0 ? 'var(--warning)' : 'var(--danger)'};">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                  <span style="font-weight: 700; color: var(--text-muted);">Question ${idx + 1} (${a.question_type})</span>
                  <span style="font-weight: 800; color: ${a.awarded_points >= a.max_points ? 'var(--success)' : 'var(--danger)'}; font-size: 1rem;">
                    Score: ${a.awarded_points} / ${a.max_points} pts
                  </span>
                </div>

                <div style="font-weight: 600; font-size: 1rem; margin-bottom: 1rem;">
                  ${a.question_text}
                </div>

                <div style="background: var(--bg-surface-alt); padding: 0.85rem 1rem; border-radius: var(--radius-md); font-size: 0.88rem; margin-bottom: 0.75rem;">
                  <strong>Your Answer:</strong> 
                  <span style="color: var(--text-main);">${typeof a.user_answer === 'object' ? JSON.stringify(a.user_answer) : a.user_answer || '<em style="color: var(--text-muted);">No answer provided</em>'}</span>
                </div>

                ${a.feedback ? `
                  <div style="font-size: 0.82rem; color: var(--text-muted);">
                    <strong>Evaluator Notes:</strong> ${a.feedback}
                  </div>
                ` : ''}

                ${isProfessor && a.question_type === 'essay' ? `
                  <div style="margin-top: 1rem; border-top: 1px dashed var(--border-color); padding-top: 0.75rem;">
                    <button class="btn btn-outline btn-sm" onclick="QuizView.openEssayGradeModal(${att.id}, ${a.question_id}, ${a.max_points})">
                      ✏️ Adjust Essay Grade & Feedback
                    </button>
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>

          <div style="margin: 2rem 0; text-align: center;">
            <a href="#/course/${att.course_id}" class="btn btn-primary">
              Return to Course
            </a>
          </div>
        `;
      } catch (err) {
        console.error(err);
      }
    }, 50);

    return `<div id="attempt-review-container" style="padding: 2rem 0; text-align: center;">Loading examination results...</div>`;
  },

  openEssayGradeModal(attemptId, questionId, maxPoints) {
    App.showCustomModal(`
      <div class="modal-dialog">
        <div class="modal-header">
          <h3 style="font-size: 1.15rem;">Grade Essay Response</h3>
          <button class="drawer-toggle-btn" onclick="App.closeModal()">✕</button>
        </div>
        <form onsubmit="QuizView.submitEssayGrade(event, ${attemptId}, ${questionId})">
          <div class="modal-body">
            <div style="margin-bottom: 1.25rem;">
              <label style="display: block; font-size: 0.82rem; font-weight: 700; margin-bottom: 0.4rem;">
                Points Awarded (Max ${maxPoints} pts)
              </label>
              <input type="number" step="0.5" min="0" max="${maxPoints}" name="awarded_points" required style="width: 100%; padding: 0.65rem; border: 1px solid var(--border-color); border-radius: var(--radius-md);">
            </div>
            <div style="margin-bottom: 1.25rem;">
              <label style="display: block; font-size: 0.82rem; font-weight: 700; margin-bottom: 0.4rem;">
                Feedback for Student
              </label>
              <textarea name="feedback" rows="3" style="width: 100%; padding: 0.65rem; border: 1px solid var(--border-color); border-radius: var(--radius-md);" placeholder="Comment on technical depth and accuracy..."></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" onclick="App.closeModal()">Cancel</button>
            <button type="submit" class="btn btn-success">Save Grade</button>
          </div>
        </form>
      </div>
    `);
  },

  async submitEssayGrade(e, attemptId, questionId) {
    e.preventDefault();
    const form = e.target;
    try {
      await API.gradeQuizEssay(attemptId, {
        question_id: questionId,
        awarded_points: form.awarded_points.value,
        feedback: form.feedback.value
      });
      App.closeModal();
      App.showToast('Essay graded successfully!');
      App.refreshCurrentView();
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  }
};
