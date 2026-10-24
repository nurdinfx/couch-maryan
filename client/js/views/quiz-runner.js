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
      return this.renderActiveExamRunner(params.attemptId, quizId, quiz);
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

          <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
            ${isProfessor ? `
              <button class="btn btn-outline btn-sm" onclick="App.showModal('addQuestionModal', { quizId: ${quiz.id} })">
                + Add Question
              </button>
              <button class="btn btn-outline btn-sm" style="color: var(--primary); border-color: var(--border-color); display: flex; align-items: center; gap: 0.25rem;"
                      title="Edit Quiz & Schedule"
                      onclick="App.showModal('editQuizModal', { quizId: ${quiz.id} })">
                ✏️ <span>Edit & Schedule</span>
              </button>
              <button class="btn btn-outline btn-sm" style="color: var(--danger); border-color: var(--danger-border); display: flex; align-items: center; gap: 0.25rem;"
                      title="Tirtir imtixaankan / Delete quiz"
                      onclick="App.deleteQuiz(${quiz.id}, '${(quiz.title || '').replace(/'/g, "\\'")}').then(() => { App.navigate('/course/${quiz.course_id}'); })">
                🗑 <span>Delete Quiz</span>
              </button>
            ` : ''}
          </div>
        </div>

        ${(() => {
          const now = new Date();
          const isOpen = !quiz.open_date || new Date(quiz.open_date) <= now;
          const isClosed = quiz.close_date && new Date(quiz.close_date) < now;
          const diffDays = quiz.open_date ? Math.ceil((new Date(quiz.open_date) - now) / (1000 * 60 * 60 * 24)) : 0;

          if (!isOpen && isProfessor) {
            return `
              <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: var(--radius-md); padding: 0.75rem 1.25rem; margin-top: 1rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  <span style="font-size: 1.25rem;">⏳</span>
                  <div>
                    <strong style="color: #92400e; font-size: 0.88rem;">Scheduled Quiz (Professor Notice):</strong>
                    <span style="color: #b45309; font-size: 0.84rem;"> Wuxuu ardayda u furmayaa <strong>${diffDays} cisho kadib</strong> (${new Date(quiz.open_date).toLocaleString()}).</span>
                  </div>
                </div>
                <button class="btn btn-outline btn-sm" style="background: white;" onclick="App.showModal('editQuizModal', { quizId: ${quiz.id} })">
                  Beddel Maalmaha / Change Schedule
                </button>
              </div>
            `;
          }
          return '';
        })()}

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1.25rem; margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--border-color);">
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
            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700;">ACTIVE STATUS</div>
            <div style="font-size: 1rem; font-weight: 700; margin-top: 0.2rem;">
              ${(() => {
                const now = new Date();
                const isOpen = !quiz.open_date || new Date(quiz.open_date) <= now;
                const isClosed = quiz.close_date && new Date(quiz.close_date) < now;
                if (!isOpen) {
                  const diffDays = Math.ceil((new Date(quiz.open_date) - now) / (1000 * 60 * 60 * 24));
                  return `<span style="color: #b45309;">⏳ Opens in ${diffDays} day${diffDays > 1 ? 's' : ''}</span>`;
                }
                if (isClosed) return `<span style="color: var(--danger);">🔒 Closed</span>`;
                return `<span style="color: var(--success);">🟢 Active Now</span>`;
              })()}
            </div>
          </div>
        </div>

        <!-- Start Attempt Action / Scheduled Notice -->
        ${(() => {
          const now = new Date();
          const isOpen = !quiz.open_date || new Date(quiz.open_date) <= now;
          const isClosed = quiz.close_date && new Date(quiz.close_date) < now;
          const diffDays = quiz.open_date ? Math.ceil((new Date(quiz.open_date) - now) / (1000 * 60 * 60 * 24)) : 0;

          if (!isOpen && !isProfessor) {
            return `
              <div style="margin-top: 2rem; background: #fffbeb; border: 1px solid #fde68a; border-radius: var(--radius-lg); padding: 2rem; text-align: center;">
                <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">⏳</div>
                <h3 style="font-size: 1.25rem; color: #92400e; margin-bottom: 0.35rem;">Imtixaankan Wali Ma Furna / Quiz Not Active Yet</h3>
                <p style="font-size: 0.95rem; color: #b45309; max-width: 600px; margin: 0 auto 0.75rem auto;">
                  Professor-ku wuxuu imtixaankan qorsheeyay inuu active noqdo <strong>${diffDays} cisho kadib</strong> (Taariikhda: <strong>${new Date(quiz.open_date).toLocaleString()}</strong>).
                </p>
                <div style="display: inline-block; padding: 0.5rem 1.25rem; background: white; border: 1px solid #fde68a; border-radius: var(--radius-md); font-size: 0.85rem; color: var(--text-muted);">
                  🔒 Ardaydu waxay geli karaan oo kaliya marka xilligaas la gaaro.
                </div>
              </div>
            `;
          }

          if (isClosed && !isProfessor) {
            return `
              <div style="margin-top: 2rem; background: #fef2f2; border: 1px solid #fecaca; border-radius: var(--radius-lg); padding: 2rem; text-align: center;">
                <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🔒</div>
                <h3 style="font-size: 1.25rem; color: #991b1b; margin-bottom: 0.35rem;">Imtixaankan Wuu Xirmay / Quiz Closed</h3>
                <p style="font-size: 0.95rem; color: #b91c1c;">
                  Imtixaankani wuxuu xirmay taariikhdu markay ahayd: <strong>${new Date(quiz.close_date).toLocaleString()}</strong>.
                </p>
              </div>
            `;
          }

          return `
            <div style="margin-top: 2rem; display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
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
          `;
        })()}
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
      const courseId = this.currentQuiz ? this.currentQuiz.course_id : 1;
      window.location.hash = `#/course/${courseId}/quiz/${quizId}?action=run&attemptId=${data.attempt.id}`;
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  },

  async renderActiveExamRunner(attemptId, quizId, quiz) {
    setTimeout(async () => {
      try {
        const qId = quizId || (quiz ? quiz.id : 1);
        const quizRes = await API.request(`/quizzes/${qId}/questions`);
        QuizView.questions = quizRes.questions || [];
        QuizView.currentAttempt = { id: attemptId, quizId: qId };
        QuizView.currentQuiz = quiz;
        QuizView.answers = {};

        const timeLimit = (quiz && quiz.time_limit_minutes) ? quiz.time_limit_minutes : 30;
        QuizView.remainingSeconds = timeLimit * 60;
        if (QuizView.timerInterval) clearInterval(QuizView.timerInterval);

        QuizView.timerInterval = setInterval(() => {
          QuizView.remainingSeconds--;
          const timerEl = document.getElementById('quiz-countdown-timer');
          if (timerEl) {
            const mins = Math.floor(QuizView.remainingSeconds / 60);
            const secs = QuizView.remainingSeconds % 60;
            timerEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            if (QuizView.remainingSeconds <= 300) {
              timerEl.style.color = '#ef4444';
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

    const examTitle = quiz ? quiz.title : 'Online Examination';

    return `
      <!-- Sticky Exam Timer & Header -->
      <div class="quiz-header-bar">
        <div>
          <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Examination In Progress</div>
          <h2 style="font-size: 1.15rem; margin: 0;">${examTitle}</h2>
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
    if (q.question_type === 'true_false') {
      const selected = this.answers[q.id];
      return `
        <div class="quiz-tf-group" style="display: flex; gap: 1rem; margin-top: 1rem; flex-wrap: wrap;">
          <label id="tf-true-${q.id}" class="quiz-tf-card ${selected === 'true' ? 'selected-true' : ''}" onclick="QuizView.selectTrueFalse(${q.id}, 'true')">
            <input type="radio" name="question_${q.id}" value="true" ${selected === 'true' ? 'checked' : ''} style="display:none;">
            <span class="tf-icon">✔</span>
            <span class="tf-text">Run (True)</span>
          </label>
          <label id="tf-false-${q.id}" class="quiz-tf-card ${selected === 'false' ? 'selected-false' : ''}" onclick="QuizView.selectTrueFalse(${q.id}, 'false')">
            <input type="radio" name="question_${q.id}" value="false" ${selected === 'false' ? 'checked' : ''} style="display:none;">
            <span class="tf-icon">✖</span>
            <span class="tf-text">Been (False)</span>
          </label>
        </div>
      `;
    }

    if (q.question_type === 'single_choice') {
      let options = q.options || [];
      if (typeof options === 'string') {
        try { options = JSON.parse(options); } catch (e) { options = []; }
      }
      return `
        <div style="display: flex; flex-direction: column; gap: 0.6rem; margin-top: 0.75rem;">
          ${options.map((opt, i) => {
            const val = typeof opt === 'object' ? (opt.id || opt.text) : opt;
            const label = typeof opt === 'object' ? (opt.text || opt.id) : opt;
            const isChecked = this.answers[q.id] === val;
            return `
              <label class="quiz-option-label" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.85rem 1rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); cursor: pointer; background: var(--bg-surface-alt);">
                <input type="radio" name="question_${q.id}" value="${val}" ${isChecked ? 'checked' : ''} onchange="QuizView.recordAnswer(${q.id}, '${val}')" style="width: 18px; height: 18px; cursor: pointer;">
                <span style="font-size: 0.95rem; font-weight: 500;">${label}</span>
              </label>
            `;
          }).join('')}
        </div>
      `;
    }

    if (q.question_type === 'multiple_choice') {
      let options = q.options || [];
      if (typeof options === 'string') {
        try { options = JSON.parse(options); } catch (e) { options = []; }
      }
      return `
        <div style="display: flex; flex-direction: column; gap: 0.6rem; margin-top: 0.75rem;">
          ${options.map((opt, i) => {
            const val = typeof opt === 'object' ? (opt.id || opt.text) : opt;
            const label = typeof opt === 'object' ? (opt.text || opt.id) : opt;
            const isChecked = Array.isArray(this.answers[q.id]) && this.answers[q.id].includes(val);
            return `
              <label class="quiz-option-label" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.85rem 1rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); cursor: pointer; background: var(--bg-surface-alt);">
                <input type="checkbox" name="question_${q.id}" value="${val}" ${isChecked ? 'checked' : ''} onchange="QuizView.recordMultiAnswer(${q.id}, '${val}')" style="width: 18px; height: 18px; cursor: pointer;">
                <span style="font-size: 0.95rem; font-weight: 500;">${label}</span>
              </label>
            `;
          }).join('')}
        </div>
      `;
    }

    if (q.question_type === 'short_answer') {
      return `
        <div style="margin-top: 0.75rem;">
          <input type="text" placeholder="Qor jawaabtaada kooban halkan..." style="width: 100%; max-width: 450px; padding: 0.75rem 1rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 0.95rem;"
                 value="${this.answers[q.id] || ''}" oninput="QuizView.recordAnswer(${q.id}, this.value)">
        </div>
      `;
    }

    if (q.question_type === 'essay') {
      return `
        <div style="margin-top: 0.75rem;">
          <textarea rows="5" placeholder="Qor sharraxaaddaada oo faahfaahsan halkan..." style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-family: inherit; font-size: 0.92rem;"
                    oninput="QuizView.recordAnswer(${q.id}, this.value)">${this.answers[q.id] || ''}</textarea>
        </div>
      `;
    }

    return '';
  },

  selectTrueFalse(questionId, val) {
    this.recordAnswer(questionId, val);
    const trueCard = document.getElementById(`tf-true-${questionId}`);
    const falseCard = document.getElementById(`tf-false-${questionId}`);
    if (trueCard && falseCard) {
      if (val === 'true') {
        trueCard.classList.add('selected-true');
        falseCard.classList.remove('selected-false');
      } else {
        falseCard.classList.add('selected-false');
        trueCard.classList.remove('selected-true');
      }
    }
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
      App.showToast('Exam submitted and graded successfully!');
      const courseId = this.currentQuiz ? this.currentQuiz.course_id : 1;
      const quizId = this.currentQuiz ? this.currentQuiz.id : 1;
      window.location.hash = `#/course/${courseId}/quiz/${quizId}?action=review&attemptId=${this.currentAttempt.id}`;
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
  },

  async previewQuestionBank(quizId) {
    try {
      const res = await API.request(`/quizzes/${quizId}/questions`);
      const questions = res.questions || [];
      App.showCustomModal(`
        <div class="modal-dialog" style="max-width: 650px;">
          <div class="modal-header">
            <h3>Questions Bank (${questions.length} Questions)</h3>
            <button class="drawer-toggle-btn" onclick="App.closeModal()">✕</button>
          </div>
          <div class="modal-body" style="max-height: 480px; overflow-y: auto;">
            ${questions.length === 0 ? '<p style="text-align:center;color:var(--text-muted);padding:2rem;">No questions in bank yet.</p>' : ''}
            <div style="display: flex; flex-direction: column; gap: 1rem;">
              ${questions.map((q, idx) => `
                <div style="background: var(--bg-surface-alt); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem;">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 0.5rem;">
                    <span style="font-weight:700; color: var(--primary);">Q${idx + 1}: ${q.question_type.toUpperCase()}</span>
                    <span class="badge badge-primary">${q.points} pts</span>
                  </div>
                  <div style="font-weight:600; margin-bottom: 0.5rem;">${q.question_text}</div>
                  ${q.options && q.options.length ? `
                    <div style="font-size:0.85rem; color:var(--text-muted); margin-bottom: 0.5rem;">
                      Options: ${q.options.map(o => o.text).join(' | ')}
                    </div>
                  ` : ''}
                  ${q.correct_answer_text ? `
                    <div style="font-size:0.82rem; color:var(--success); font-weight: 600;">
                      Correct Answer: ${q.correct_answer_text}
                    </div>
                  ` : ''}
                  <div style="margin-top: 0.5rem; text-align: right;">
                    <button class="btn btn-danger btn-sm" onclick="QuizView.deleteQuestion(${quizId}, ${q.id})">Delete</button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" onclick="App.closeModal()">Close</button>
            <button class="btn btn-primary" onclick="App.closeModal(); App.showModal('addQuestionModal', { quizId: ${quizId} })">+ Add Question</button>
          </div>
        </div>
      `);
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  },

  async deleteQuestion(quizId, questionId) {
    if (!confirm('Are you sure you want to delete this question?')) return;
    try {
      await API.request(`/quizzes/questions/${questionId}`, { method: 'DELETE' });
      App.showToast('Question deleted!');
      this.previewQuestionBank(quizId);
      App.refreshCurrentView();
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  }
};
