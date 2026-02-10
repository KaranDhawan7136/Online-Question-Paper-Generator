# Question Paper & Summary Report Generator
## Project Report

---

## 1. Project Overview

**Project Title:** Question Paper & Summary Report Generator  
**Date Started:** February 6, 2026  
**Status:** 🟡 In Progress - MongoDB Setup

### Objective
Build a scalable, intelligent, and automated examination paper generation system suitable for universities, colleges, and coaching institutes.

---

## 2. Technology Stack

| Layer | Technology | Status |
|-------|------------|--------|
| Frontend | React.js, Vite, Chart.js | ✅ Complete |
| Backend | Node.js, Express.js | ✅ Complete |
| Database | MongoDB | ✅ Running |
| AI/Logic | Python, Flask | ✅ Complete |
| PDF Generation | ReportLab | ✅ Complete |
| Authentication | JWT | ✅ Complete |

---

## 3. Features Implemented

### 3.1 Question Bank Management
- [x] Add, edit, delete questions via UI
- [x] Bulk upload via CSV file
- [x] Filter by subject, difficulty, type
- [x] Question fields: text, subject, unit, difficulty, marks, type, options

### 3.2 Question Types
- [x] **MCQ** - Multiple Choice Questions (1 Mark)
- [x] **2 Mark** - Short Answer Questions
- [x] **5 Mark** - Medium Answer Questions  
- [x] **10 Mark** - Long Answer Questions

### 3.3 Paper Generation
- [x] Configurable total marks
- [x] Difficulty distribution (Easy/Medium/Hard percentages)
- [x] Question type selection
- [x] Randomized selection with no repetition
- [x] Internal choice support

### 3.4 PDF Generation
- [x] Question Paper PDF with university formatting
- [x] Summary Report PDF with analytics
- [x] Downloadable from UI

### 3.5 University Branding (NEW)
- [x] University/Institution Name in header
- [x] Academic Year display
- [x] Programme Name, Course Title, Course Code
- [x] Semester and Exam Title
- [x] Roll No. placeholder
- [x] Total Pages, Time, Max Marks display
- [x] Customizable General Instructions
- [x] Logo upload support (placeholder ready)

### 3.6 Advanced Question Features (NEW)
- [x] Difficulty Levels 1-5 (numeric scale)
- [x] Bloom's Taxonomy (R/U/P/E/N/C)
- [x] CLO Mapping (1-5)
- [x] Topic/Unit based selection
- [x] Time estimation per question
- [x] 2x2 Table format for MCQ options
- [x] Enhanced Summary Report (Bloom's/CLO analysis)

### 3.4 Analytics Dashboard
- [x] Total questions count
- [x] Difficulty distribution chart
- [x] Question type breakdown
- [x] Recent papers list

### 3.5 Authentication
- [x] JWT-based authentication
- [x] Admin/Faculty roles
- [x] Secure password hashing

---

## 4. Project Structure

```
University Project/
├── server/                 # Node.js Backend
│   ├── models/
│   │   ├── Question.js     # Question schema
│   │   ├── User.js         # User schema with auth
│   │   └── Paper.js        # Generated paper schema
│   ├── routes/
│   │   ├── auth.js         # Login/Register APIs
│   │   ├── questions.js    # CRUD + CSV upload
│   │   └── papers.js       # Generate + Download
│   ├── middleware/
│   │   └── auth.js         # JWT middleware
│   ├── index.js            # Express entry point
│   └── package.json
│
├── ai_service/             # Python Microservice
│   ├── app.py              # Flask API server
│   ├── question_selector.py # Selection algorithm
│   ├── pdf_generator.py    # ReportLab PDF creator
│   └── requirements.txt
│
├── client/                 # React Frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── QuestionBank.jsx
│   │   │   ├── GeneratePaper.jsx
│   │   │   └── Papers.jsx
│   │   ├── components/
│   │   │   └── Layout.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── utils/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
└── README.md
```

---

## 5. API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | User login |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/questions` | List questions (with filters) |
| POST | `/api/questions` | Add new question |
| PUT | `/api/questions/:id` | Update question |
| DELETE | `/api/questions/:id` | Delete question |
| POST | `/api/questions/upload-csv` | Bulk upload |
| GET | `/api/questions/stats/overview` | Get statistics |
| POST | `/api/papers/generate` | Generate paper |
| GET | `/api/papers` | List papers |
| POST | `/api/papers/:id/pdf` | Download PDF |

---

## 6. Current Status & Progress Log

| Date | Activity | Status |
|------|----------|--------|
| Feb 6, 2026 14:14 | Project initialization | ✅ Done |
| Feb 6, 2026 14:15 | Implementation plan created | ✅ Approved |
| Feb 6, 2026 14:16 | Backend development | ✅ Complete |
| Feb 6, 2026 14:18 | Python AI service | ✅ Complete |
| Feb 6, 2026 14:20 | React frontend | ✅ Complete |
| Feb 6, 2026 14:26 | All services started | ✅ Running |
| Feb 6, 2026 14:47 | MongoDB issue detected | 🔧 Fixing |
| Feb 6, 2026 14:51 | Installing MongoDB | 🟡 In Progress |

---

## 7. Next Steps

1. [ ] Complete MongoDB installation
2. [ ] Start MongoDB service
3. [ ] Test user registration/login
4. [ ] Add sample questions
5. [ ] Generate test paper
6. [ ] Verify PDF downloads

---

## 8. How to Run

### Prerequisites
- Node.js v18+
- Python 3.9+
- MongoDB (local or Atlas)

### Commands
```bash
# Terminal 1: Backend
cd server && npm install && npm run dev

# Terminal 2: Python Service
cd ai_service && pip install -r requirements.txt && python app.py

# Terminal 3: Frontend
cd client && npm install && npm run dev
```

### Access
- Frontend: http://localhost:3000
- Backend: http://localhost:5000
- Python: http://localhost:8000

---

*Report auto-generated and maintained by development process*
