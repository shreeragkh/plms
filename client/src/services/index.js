import API from "./api";

// ── Enrollment ────────────────────────────────────────────────────────────────
export const enrollmentService = {
  // Student: enroll in a course
  enroll: async (courseId) => {
    const { data } = await API.post("/enrollments", { courseId });
    return data;
  },

  // Student: get all enrolled courses
  getMyEnrollments: async () => {
    const { data } = await API.get("/enrollments/my");
    return data;
  },

  // Drop a course
  unenroll: async (enrollmentId) => {
    const { data } = await API.delete(`/enrollments/${enrollmentId}`);
    return data;
  },

  // Update progress
  updateProgress: async (enrollmentId, progress) => {
    const { data } = await API.put(`/enrollments/${enrollmentId}/progress`, { progress });
    return data;
  },
};

// ── Quiz ──────────────────────────────────────────────────────────────────────
export const quizService = {
  // Get quizzes for a course
  getByCourse: async (courseId) => {
    const { data } = await API.get(`/quizzes/course/${courseId}`);
    return data;
  },

  // Get single quiz (with questions)
  getById: async (id) => {
    const { data } = await API.get(`/quizzes/${id}`);
    return data;
  },

  // Teacher: create quiz
  create: async (quizData) => {
    const { data } = await API.post("/quizzes", quizData);
    return data;
  },

  // Teacher: update quiz
  update: async (id, quizData) => {
    const { data } = await API.put(`/quizzes/${id}`, quizData);
    return data;
  },

  // Teacher: publish / unpublish
  togglePublish: async (id) => {
    const { data } = await API.put(`/quizzes/${id}/publish`);
    return data;
  },

  // Teacher: delete quiz
  delete: async (id) => {
    const { data } = await API.delete(`/quizzes/${id}`);
    return data;
  },
};

// ── Submission ────────────────────────────────────────────────────────────────
export const submissionService = {
  // Student: submit quiz answers
  submit: async ({ quizId, answers, timeTaken }) => {
    const { data } = await API.post("/submissions", { quizId, answers, timeTaken });
    return data;
  },

  // Student: get their own past results
  getMyResults: async () => {
    const { data } = await API.get("/submissions/my");
    return data;
  },

  // Teacher: get all submissions for a quiz (with analytics)
  getByQuiz: async (quizId) => {
    const { data } = await API.get(`/submissions/quiz/${quizId}`);
    return data;
  },

  // Get a single detailed submission
  getById: async (id) => {
    const { data } = await API.get(`/submissions/${id}`);
    return data;
  },
};

// ── Material ──────────────────────────────────────────────────────────────────
export const materialService = {
  // Get materials for a course
  getByCourse: async (courseId) => {
    const { data } = await API.get(`/materials/course/${courseId}`);
    return data;
  },

  // Teacher: upload a file (multipart/form-data)
  upload: async (courseId, file, title, description) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("courseId", courseId);
    formData.append("title", title || file.name);
    if (description) formData.append("description", description);

    // Do NOT set Content-Type manually — Axios must auto-set it with the multipart boundary
    const { data } = await API.post("/materials/upload", formData);
    return data;
  },

  // Teacher: delete a material
  delete: async (id) => {
    const { data } = await API.delete(`/materials/${id}`);
    return data;
  },
};

// ── User (admin) ──────────────────────────────────────────────────────────────
export const userService = {
  getAll: async (params = {}) => {
    const { data } = await API.get("/users", { params });
    return data;
  },

  getById: async (id) => {
    const { data } = await API.get(`/users/${id}`);
    return data;
  },

  toggleStatus: async (id) => {
    const { data } = await API.put(`/users/${id}/toggle-status`);
    return data;
  },

  changeRole: async (id, role) => {
    const { data } = await API.put(`/users/${id}/role`, { role });
    return data;
  },

  delete: async (id) => {
    const { data } = await API.delete(`/users/${id}`);
    return data;
  },

  // Teacher: get all students across their courses
  getTeacherStudents: async () => {
    const { data } = await API.get("/users/teacher/students");
    return data;
  },
};

// ── Quiz Attempts (student results) ──────────────────────────────────────────
export const quizAttemptService = {
  // Student: all their past attempts with scores
  getMyAttempts: async () => {
    const { data } = await API.get("/quiz-attempts/my");
    return data;
  },

  // Student: submit a quiz
  submit: async ({ quizId, answers, timeTaken }) => {
    const { data } = await API.post("/quiz-attempts", { quizId, answers, timeTaken });
    return data;
  },

  // Single attempt detail
  getById: async (id) => {
    const { data } = await API.get(`/quiz-attempts/${id}`);
    return data;
  },
};

// ── Teacher quiz analytics ────────────────────────────────────────────────────
export const teacherAnalyticsService = {
  // All attempts for a specific quiz (with analytics summary)
  getByQuiz: async (quizId) => {
    const { data } = await API.get(`/quiz-attempts/quiz/${quizId}`);
    return data;
  },
  // All attempts across an entire course
  getByCourse: async (courseId) => {
    const { data } = await API.get(`/quiz-attempts/course/${courseId}`);
    return data;
  },
};
// ── Assignments ──────────────────────────────────────────────────────────────
export const assignmentService = {
  // Get assignments for a course
  getByCourse: async (courseId) => {
    const { data } = await API.get(`/assignments/course/${courseId}`);
    return data;
  },

  // Get single assignment
  getById: async (id) => {
    const { data } = await API.get(`/assignments/${id}`);
    return data;
  },

  // Teacher: create assignment
  create: async (assignmentData) => {
    const { data } = await API.post("/assignments", assignmentData);
    return data;
  },

  // Teacher: update assignment
  update: async (id, assignmentData) => {
    const { data } = await API.put(`/assignments/${id}`, assignmentData);
    return data;
  },

  // Teacher: delete assignment
  delete: async (id) => {
    const { data } = await API.delete(`/assignments/${id}`);
    return data;
  },
};

// ── Assignment Submissions ──────────────────────────────────────────────────
export const assignmentSubmissionService = {
  // Student: submit assignment file (multipart/form-data)
  submit: async (assignmentId, file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("assignmentId", assignmentId);

    const { data } = await API.post("/assignment-submissions/submit", formData);
    return data;
  },

  // Student: get their own submissions
  getMySubmissions: async () => {
    const { data } = await API.get("/assignment-submissions/my");
    return data;
  },

  // Teacher: get all submissions for an assignment
  getByAssignment: async (assignmentId) => {
    const { data } = await API.get(`/assignment-submissions/assignment/${assignmentId}`);
    return data;
  },

  // Teacher: grade a submission
  grade: async (submissionId, gradeData) => {
    const { data } = await API.put(`/assignment-submissions/${submissionId}/grade`, gradeData);
    return data;
  },
};
