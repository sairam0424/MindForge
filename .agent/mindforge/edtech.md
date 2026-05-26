---
name: mindforge:edtech
description: "Design educational technology platform. Usage: /mindforge:edtech [component] [--type lms|assessment|adaptive]"
argument-hint: "[component] [--type lms|assessment|adaptive]"
allowed-tools:
  - list_dir
  - view_file
---

<objective>
Designs educational technology platforms including learning management systems, assessment engines, and adaptive learning systems. Produces architectures for content delivery, student progress tracking, automated grading, learning analytics, and personalized learning paths with FERPA compliance.
</objective>

<execution_context>
@.mindforge/skills/edtech-platform/SKILL.md
</execution_context>

<context>
Skills Directory: `.mindforge/skills/edtech-platform/`
State: Evaluates edtech platform requirements, learning models, and produces architecture with content management, assessment frameworks, learning analytics, and student data privacy controls compliant with FERPA and COPPA.
</context>

<process>
1. **Platform Type Analysis**: Identify edtech platform type (LMS for course delivery, assessment platform for testing, adaptive learning system with personalization) and define user roles (students, teachers, admins, parents), content types (video, interactive, SCORM), and scale (K-12, higher-ed, corporate training).
2. **Content Architecture**: Design content management system with versioning, multi-format support (video, PDF, H5P interactive content), SCORM/xAPI compliance for interoperability, content tagging/metadata for searchability, and CDN delivery for global access.
3. **Assessment Engine**: Architect assessment system with question banks, randomized test generation, multiple question types (MCQ, short answer, essay, code submission), auto-grading with rubrics, plagiarism detection, and secure browser lockdown for proctored exams.
4. **Learning Analytics**: Implement data collection for student interactions (time on task, completion rates, quiz scores), learning record store (LRS) for xAPI statements, predictive models for at-risk student identification, and dashboard visualizations for educators and administrators.
5. **Adaptive Learning**: Design personalization engine with student knowledge modeling (Bayesian knowledge tracing, item response theory), content recommendation algorithms based on mastery levels, dynamic difficulty adjustment, and differentiated learning paths.
6. **Collaboration Features**: Build real-time collaboration tools (discussion forums, peer review workflows, group projects), video conferencing integration (Zoom, Teams), messaging systems with moderation, and live classroom features with breakout rooms.
7. **Privacy and Compliance**: Implement FERPA-compliant student data handling with parental consent for minors (COPPA), role-based access controls for PII, data retention policies, audit logs for data access, and student data portability with export capabilities.
</process>
