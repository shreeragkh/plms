import API from "./api";

const courseService = {
  // Get all courses (students browse, supports ?search=&subject=)
  getAll: async (params = {}) => {
    const { data } = await API.get("/courses", { params });
    return data;
  },

  // Teacher: get only their courses
  getMyCourses: async () => {
    const { data } = await API.get("/courses/my");
    return data;
  },

  // Get single course by ID
  getById: async (id) => {
    const { data } = await API.get(`/courses/${id}`);
    return data;
  },

  // Teacher: create a course
  create: async (courseData) => {
    const { data } = await API.post("/courses", courseData);
    return data;
  },

  // Teacher: update a course
  update: async (id, courseData) => {
    const { data } = await API.put(`/courses/${id}`, courseData);
    return data;
  },

  // Teacher: set course status (active | archived | completed)
  setStatus: async (id, status) => {
    const { data } = await API.put(`/courses/${id}/status`, { status });
    return data;
  },

  // Teacher/Admin: delete a course
  delete: async (id) => {
    const { data } = await API.delete(`/courses/${id}`);
    return data;
  },

  // Teacher: get enrolled students for a course
  getStudents: async (courseId) => {
    const { data } = await API.get(`/courses/${courseId}/students`);
    return data;
  },
};

export default courseService;
export { courseService };
