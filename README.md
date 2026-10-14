# Faculty LMS: Moodle-Style Learning Management System
### Designed Specifically for One Faculty and One Professor (Prof. Maryam Al-Mansoor)

A production-grade, secure, and modern Learning Management System inspired by Moodle 4+ (Boost Theme), purpose-built for a single university faculty (**Faculty of Midwifery**) managed by a single professor (**Prof. Maryam Al-Mansoor**).

---

## 🌟 Key Features & Implementation Highlights

### 1. Dedicated Single Faculty Scope
* **Strict Single Faculty & Single Professor Architecture**: No multi-institution bloat. Focused strictly on high-impact teaching, student management, academic performance, and midwifery and maternal healthcare courses.
* **Faculty Courses**: Pre-seeded with *MID101: Fundamentals of Midwifery Care*, *MID204: Antenatal & Postnatal Care*, and *MID301: Neonatal Care & Clinical Practice*.

### 2. Moodle 4+ Inspired Experience
* **Professional Left Navigation Drawer**: Collapsible sidebar with quick links to Dashboard, Course Catalog, Gradebook Matrix, Attendance, Badges & Certificates, Discussions, Calendar, and Messages.
* **Top Navigation Bar**: Brand identity, live search across all courses/activities, quick persona switcher, light/dark mode toggle, in-app notification center, and user profile menu.
* **Course Structure**: Structured hierarchically into Sections, Modules, Topics, and Activities with clear completion checkmarks.

### 3. Video Lessons & Media Streaming
* **Integrated HTML5 Video Player**: Embedded playback with speed selection, resume playback, and caption support.
* **True Watch-Time Tracking**: Progress updates dynamically based on elapsed seconds watched; videos automatically complete when $\ge 80\%$ of playback duration is completed. Does not falsely mark videos complete just because a page was opened.

### 4. PDF & Document Resource Center
* **In-Browser Document Viewer**: Inline previewing of lecture slides, syllabi, and assignment specifications without external plugins.
* **Secure File Handling**: Enforced file type validation (`.pdf`, `.docx`, `.pptx`, `.zip`), size limits, and direct download links.

### 5. Assignments & Grading Console
* **Dual Submission Modes**: Supports code archive uploads (`.zip`, `.pdf`) and rich text responses.
* **Late Submissions**: Configurable deadlines and automatic late-submission indicators.
* **Professor Grading Workflow**: Review student code/reports, assign numeric grades, provide detailed qualitative feedback, toggle immediate grade release, and request resubmission.

### 6. Quizzes, Exams & Question Bank
* **Multiple Question Types**: Single choice, multiple choice (multi-select with partial credit), true/false, short answer, and essay questions.
* **Interactive Exam Runner**: Sticky countdown timer, question palette navigator (jump to questions with answered/unanswered color tracking), and auto-save.
* **Hybrid Grading Engine**: Instant auto-grading for objective questions + dedicated manual essay grading console for the professor.

### 7. Gradebook & Academic Performance
* **Spreadsheet Matrix**: Students $\times$ Activities matrix showing raw scores, percentages, weighted course totals, and letter grades (A, B, C, D, F).
* **Exportable Data**: One-click gradebook CSV export for academic archiving.
* **Strict Privacy Isolation**: Students only view their own released grades and feedback.

### 8. Badges, Achievements & Verifiable Certificates
* **Database-Backed Badges**: Automatically awarded for academic milestones (*First Step in Cloud*, *Quiz Master*, *Engineering Excellence*, *Steadfast Attendance*, *Course Completed*).
* **Verifiable Course Certificates**: Generates unique certificates with verification UUIDs (e.g. `CERT-2026-CS301-8849-AK`) and an official verification endpoint (`/api/certificates/verify/:uuid`). Includes a printable certificate with gold seal.

### 9. Attendance Management
* **Status Tracking**: Record sessions as *Present*, *Absent*, *Late*, or *Excused*.
* **Statistical Insights**: Automated attendance percentage calculation with threshold alerts for student disengagement.

### 10. Communication & Collaboration
* **Course Announcements**: Pinned and chronological broadcasts from the professor.
* **Discussion Forums**: Course topics, student threads, reply counters, and author badges.
* **Direct Messenger**: Private one-to-one messaging between professor and students.
* **Interactive Calendar**: Visual timeline of assignment due dates, exam dates, and seminar sessions.

### 11. Minimal System Administration & Security
* **Role-Based Access Control**: Server-side JWT authorization enforcing permissions across Professor, Student, and Admin.
* **System Health Diagnostics**: Live database size, uptime, record counts, and audit logs.
* **One-Click Backup**: Export raw SQLite database backup directly from the admin panel.

---

## 👥 Demo Personas (Available via Top Navbar Switcher)

The application includes an **Active Persona Switcher** in the top navigation bar so you can switch roles in 1 click without re-logging in:

| Persona | Role | Email | Highlights |
|---|---|---|---|
| **Prof. Maryam Al-Mansoor** | `professor` | `professor@faculty.edu` | Full course management, grading console, attendance, and exam creator |
| **Alex Chen** | `student` | `alex.chen@student.faculty.edu` | Junior (67% progress), submitted Assignment 1 (94/100) |
| **Layla Karim** | `student` | `layla.k@student.faculty.edu` | Top Performer (100% progress), Official Course Certificate holder |
| **Fatima Zahra** | `student` | `fatima.z@student.faculty.edu` | SRE undergraduate (50% progress), active forum contributor |
| **Marcus Vance** | `student` | `marcus.v@student.faculty.edu` | Student needing attention (16.7% progress, flagged as **At-Risk**) |
| **Faculty IT Administrator** | `admin` | `admin@faculty.edu` | System diagnostics, audit logs, and database backup manager |

*Default password for all demo accounts:* `password123` (Admin: `admin123`)

---

## 🚀 Getting Started

### Prerequisites
* **Node.js** (v18.x or v20+ / v24+)

### 1. Installation
Dependencies are already installed. If running in a fresh clone:
```bash
npm install
```

### 2. Database Initialization & Seeding
To reset or re-seed the SQLite database with rich demo data and sample documents/PDFs:
```bash
node database/seed-data.js
```

### 3. Launching the LMS Server
```bash
node server/index.js
```
The server will start on **`http://localhost:3000`**.

### 4. Running the Automated Test Suite
To execute the end-to-end integration test suite verifying all 20 workflows:
```bash
node test-e2e.js
```

---

## 📁 Repository Structure

```
couch maryam/
├── database/
│   ├── db.js                     # SQLite connection, WAL mode, tables schema
│   ├── seed-data.js              # Realistic seed data (courses, media, grades, attendance)
│   └── create-sample-assets.js   # Generates sample PDFs and student submission files
├── uploads/                      # Managed file storage for documents, videos, submissions
│   ├── documents/                # Syllabi, slides, assignment guides
│   ├── videos/                   # Video lectures and streaming clips
│   └── submissions/              # Student submitted reports and code archives
├── server/
│   ├── index.js                  # Express main app & static routes
│   ├── middleware/
│   │   ├── auth.js               # JWT authentication & role-based guards
│   │   ├── upload.js             # Multer upload handler with mime validation
│   │   └── audit.js              # Security & academic audit logging
│   └── routes/                   # Modular REST API endpoints
│       ├── auth.js               # Login, session, quick persona switcher
│       ├── courses.js            # Course & module CRUD, class roster
│       ├── lessons.js            # Video tracking, document viewer, completion
│       ├── assignments.js        # Assignment submissions and grading
│       ├── quizzes.js            # Question bank, timed exam runner, auto-grading
│       ├── grades.js             # Gradebook matrix and CSV export
│       ├── attendance.js         # Attendance records and session manager
│       ├── badges.js             # Badge awards and criteria tracking
│       ├── certificates.js       # Verifiable certificate issuance & verification
│       ├── discussions.js        # Forum topics and replies
│       ├── announcements.js      # Course broadcasts
│       ├── messages.js           # Direct messaging inbox
│       ├── calendar.js           # Upcoming deadlines timeline
│       ├── search.js             # Site-wide search
│       └── admin.js              # System health, audit logs, backup export
├── client/
│   ├── index.html                # Main Moodle layout with drawer & topbar
│   ├── css/
│   │   └── moodle-theme.css      # Vanilla CSS design system, dark mode, animations
│   └── js/
│       ├── app.js                # SPA router, state manager, modals, toasts
│       ├── api.js                # API client wrapper
│       └── views/                # Views for each learning workflow
│           ├── dashboard.js      # Student & Professor personalized dashboards
│           ├── course-view.js    # Moodle course layout & topic modules
│           ├── lesson-view.js    # HTML5 video player & PDF viewer
│           ├── assignment.js     # Assignment submission & grading console
│           ├── quiz-runner.js    # Timed interactive exam runner
│           ├── badges.js         # Badges showcase & verifiable certificate
│           ├── discussions.js    # Forum topic thread view
│           ├── messages.js       # Messenger interface
│           ├── calendar.js       # Calendar timeline
│           └── admin.js          # System administration & maintenance
├── test-e2e.js                   # Automated test suite (20/20 test cases passing)
└── package.json
```
