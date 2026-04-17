# PLMS — Personalized Learning Management System

Full-stack MERN app: React (Vite) frontend + Node.js/Express backend + MongoDB.

---

## 📁 Project Structure

```
plms/
├── client/                  ← React frontend (your existing eduapp)
│   └── src/
│       ├── context/
│       │   └── AuthContext.jsx       ← Global auth state (useAuth hook)
│       ├── components/
│       │   └── ProtectedRoute.jsx    ← Role-based route guard
│       ├── services/
│       │   ├── api.js                ← Axios instance (auto-attaches JWT)
│       │   ├── authService.js        ← login / register / logout
│       │   ├── courseService.js      ← Course CRUD
│       │   └── index.js              ← enrollment, quiz, submission, material, user services
│       └── pages/  (existing UI pages — now connected to real APIs)
│
└── server/                  ← Node.js/Express backend
    ├── server.js             ← Entry point
    ├── seed.js               ← Demo data seeder
    ├── .env.example          ← Copy to .env and fill in values
    ├── config/
    │   └── db.js             ← MongoDB connection
    ├── middleware/
    │   ├── authMiddleware.js  ← protect + authorize(roles)
    │   └── uploadMiddleware.js← Multer file uploads
    ├── models/
    │   ├── User.js
    │   ├── Course.js          ← Has status (active/archived/draft) + duration + endDate
    │   ├── Enrollment.js      ← Unique per student+course, tracks progress
    │   ├── Quiz.js            ← Questions with correctAnswer, publish toggle
    │   ├── Submission.js      ← Auto-graded, stores % score per student
    │   └── Material.js        ← Uploaded files linked to courses
    ├── controllers/
    │   ├── authController.js
    │   ├── courseController.js
    │   ├── enrollmentController.js
    │   ├── quizController.js
    │   ├── submissionController.js
    │   ├── materialController.js
    │   └── userController.js
    └── routes/
        ├── authRoutes.js
        ├── courseRoutes.js
        ├── enrollmentRoutes.js
        ├── quizRoutes.js
        ├── submissionRoutes.js
        ├── materialRoutes.js
        └── userRoutes.js
```

---

## ⚙️ Setup

### 1. Backend

```bash
cd server
cp .env.example .env        # Edit MONGO_URI and JWT_SECRET
npm install
node seed.js                # Create demo users
npm run dev                 # Starts on http://localhost:5000
```

### 2. Frontend

```bash
cd client
npm install
# Create .env with:  VITE_API_URL=http://localhost:5000/api
npm run dev                 # Starts on http://localhost:5173
```

### 3. Demo Login Credentials

| Role    | Email                    | Password    |
|---------|--------------------------|-------------|
| Student | student@example.com      | password123 |
| Teacher | teacher@example.com      | password123 |
| Admin   | admin@example.com        | password123 |

---

## 🌐 Full API Reference

### Auth  `/api/auth`
| Method | Route         | Auth | Description         |
|--------|---------------|------|---------------------|
| POST   | /register     | ✗    | Register new user   |
| POST   | /login        | ✗    | Login               |
| GET    | /me           | ✓    | Get current user    |

### Courses  `/api/courses`
| Method | Route                  | Role            | Description                    |
|--------|------------------------|-----------------|--------------------------------|
| GET    | /                      | Any             | Browse all active courses      |
| GET    | /my                    | Teacher         | Teacher's own courses          |
| POST   | /                      | Teacher         | Create course                  |
| GET    | /:id                   | Any             | Get course detail              |
| PUT    | /:id                   | Teacher/Admin   | Update course                  |
| PUT    | /:id/archive           | Teacher/Admin   | Toggle archive                 |
| DELETE | /:id                   | Teacher/Admin   | Delete course                  |
| GET    | /:id/students          | Teacher/Admin   | Enrolled students list         |

### Enrollments  `/api/enrollments`
| Method | Route          | Role    | Description              |
|--------|----------------|---------|--------------------------|
| POST   | /              | Student | Enroll in a course       |
| GET    | /my            | Student | My enrolled courses      |
| DELETE | /:id           | Any     | Unenroll                 |
| PUT    | /:id/progress  | Student | Update progress %        |

### Quizzes  `/api/quizzes`
| Method | Route                  | Role          | Description              |
|--------|------------------------|---------------|--------------------------|
| GET    | /course/:courseId      | Any           | Quizzes for a course     |
| POST   | /                      | Teacher       | Create quiz              |
| GET    | /:id                   | Any           | Get quiz (no answers for students) |
| PUT    | /:id                   | Teacher       | Update quiz              |
| PUT    | /:id/publish           | Teacher       | Toggle publish           |
| DELETE | /:id                   | Teacher       | Delete quiz              |

### Submissions  `/api/submissions`
| Method | Route              | Role    | Description                    |
|--------|--------------------|---------|--------------------------------|
| POST   | /                  | Student | Submit quiz (auto-graded)      |
| GET    | /my                | Student | My quiz results                |
| GET    | /quiz/:quizId      | Teacher | All results + analytics        |
| GET    | /:id               | Any     | Single submission detail       |

### Materials  `/api/materials`
| Method | Route                  | Role    | Description              |
|--------|------------------------|---------|--------------------------|
| GET    | /course/:courseId      | Any     | Materials for a course   |
| POST   | /upload                | Teacher | Upload file (multipart)  |
| DELETE | /:id                   | Teacher | Delete material          |

### Users  `/api/users`
| Method | Route                   | Role          | Description              |
|--------|-------------------------|---------------|--------------------------|
| GET    | /                       | Admin         | All users (filterable)   |
| GET    | /teacher/students       | Teacher       | Students in my courses   |
| GET    | /:id                    | Admin/Teacher | User details             |
| PUT    | /:id/toggle-status      | Admin         | Activate / Deactivate    |
| PUT    | /:id/role               | Admin         | Change user role         |
| DELETE | /:id                    | Admin         | Delete user              |

---

## 🔌 How to Wire Up a Page (Example)

To make StudentDashboard show real enrolled courses:

```jsx
import { useEffect, useState } from "react";
import { enrollmentService } from "../services";

// Inside your component:
const [enrollments, setEnrollments] = useState([]);

useEffect(() => {
  enrollmentService.getMyEnrollments().then((data) => {
    setEnrollments(data.enrollments);
  });
}, []);
```

---

## 🤝 Team Integration Checklist

| Member     | Task                              | Connects To                          |
|------------|-----------------------------------|--------------------------------------|
| You        | Node.js server + all REST APIs    | `server/` — done ✅                  |
| Auth member| JWT middleware (done in server)   | `authMiddleware.js` — done ✅        |
| DB member  | MongoDB models                    | `models/` — done ✅                  |
| AI member  | Quiz generation from PDF          | POST `/api/quizzes` with `aiGenerated: true` |
| Frontend   | Wire pages to services            | `client/src/services/` — ready ✅    |
