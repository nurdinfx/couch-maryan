const fs = require('fs');
const path = require('path');

// Helper to create a valid minimal PDF file
function createMinimalPdf(title, subtitle, bodyLines) {
  const contentStream = `BT
/F1 18 Tf
50 720 Td
(${title}) Tj
/F1 12 Tf
0 -30 Td
(${subtitle}) Tj
/F1 10 Tf
0 -25 Td
${bodyLines.map(line => `(${line.replace(/[()]/g, '')}) Tj\n0 -16 Td`).join('\n')}
ET`;

  const streamLength = Buffer.byteLength(contentStream, 'utf8');

  const pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length ${streamLength} >>
stream
${contentStream}
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000060 00000 n 
0000000117 00000 n 
0000000228 00000 n 
0000000${(280 + streamLength).toString().padStart(3, '0')} 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
${350 + streamLength}
%%EOF`;

  return Buffer.from(pdf, 'utf8');
}

function generateAssets() {
  const docsDir = path.join(__dirname, '..', 'uploads', 'documents');
  const videosDir = path.join(__dirname, '..', 'uploads', 'videos');
  const subsDir = path.join(__dirname, '..', 'uploads', 'submissions');
  
  [docsDir, videosDir, subsDir].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });

  // 1. Syllabus PDF
  const syllabusPath = path.join(docsDir, 'CS301_Course_Syllabus.pdf');
  fs.writeFileSync(syllabusPath, createMinimalPdf(
    'CS301: Cloud Computing and Distributed Systems',
    'Faculty of Computing & Information Science - Instructor: Prof. Maryam Al-Mansoor',
    [
      'Welcome to CS301. This course covers cloud architectures, microservices, containerization, and scalability.',
      'Grading Breakdown: Assignments (30%), Midterm Exam (25%), Quizzes (20%), Final Project (20%), Attendance (5%).',
      'Course Policies: Submissions must be uploaded on time. Late submissions are subject to 10% penalty per day.',
      'Office Hours: Tuesdays and Thursdays 14:00 - 16:00, Faculty Office Room 402 or via Moodle Messenger.',
      'Academic Integrity: All code submissions will be checked for authenticity and plagiarism.'
    ]
  ));

  // 2. Lecture 1 Slides PDF
  const lecture1Path = path.join(docsDir, 'Lecture1_Introduction_to_Distributed_Systems.pdf');
  fs.writeFileSync(lecture1Path, createMinimalPdf(
    'Lecture 1: Foundations of Distributed Systems',
    'Module 1: Architecture, CAP Theorem & Consensus Models',
    [
      '1. Definition: A distributed system is a collection of autonomous computing nodes that communicate over network.',
      '2. Transparency Goals: Location, Migration, Replication, Concurrency, and Failure transparency.',
      '3. The CAP Theorem: In an asynchronous network partition, choose between Consistency and Availability.',
      '4. Fallacies of Distributed Computing: Network is reliable, Latency is zero, Bandwidth is infinite.',
      '5. Readings: Chapter 1-3 of Coulouris et al. Distributed Systems: Concepts and Design.'
    ]
  ));

  // 3. Assignment 1 Reference PDF
  const assignRefPath = path.join(docsDir, 'Assignment1_Specification_Cloud_Storage.pdf');
  fs.writeFileSync(assignRefPath, createMinimalPdf(
    'Assignment 1: Distributed Object Storage Implementation',
    'Weight: 20% | Maximum Score: 100 Points | Due: End of Week 3',
    [
      'Objective: Build a fault-tolerant chunk-based file storage system utilizing consistent hashing.',
      'Task 1: Implement Consistent Hashing Ring with virtual nodes (30 pts).',
      'Task 2: Implement Replication Factor R=3 with quorum consensus (30 pts).',
      'Task 3: Failure detection and node re-balancing heartbeat protocol (30 pts).',
      'Task 4: Unit tests and benchmark performance report (10 pts).',
      'Submit your code repository zip file along with your written analysis report.'
    ]
  ));

  // 4. Sample student submitted file for Alex Chen
  const alexSubPath = path.join(subsDir, 'Alex_Chen_CS301_Assignment1_Storage.pdf');
  fs.writeFileSync(alexSubPath, createMinimalPdf(
    'Student Submission: Assignment 1 - Distributed Storage System',
    'Student: Alex Chen (STU-2026-081) | Course: CS301',
    [
      'Executive Summary: Implemented a ring topology with 128 virtual nodes per physical worker.',
      'Consistency Model: Tunable quorum with W=2, R=2, N=3 ensuring read-your-writes consistency.',
      'Benchmark Results: Average write latency 4.2ms, Read throughput 12,500 requests/second under test harness.',
      'Self-Reflection: Handling dynamic node churn required adding an epoch-based vector clock protocol.',
      'Attached code files: server.js, ring.js, quorum.js, tests.js.'
    ]
  ));

  console.log('Sample educational PDFs and student submission files generated successfully.');
}

module.exports = { generateAssets };

if (require.main === module) {
  generateAssets();
}
