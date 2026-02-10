# Question Paper & Summary Report Generator

A full-stack web application for generating randomized examination papers with intelligent question selection.

## 🚀 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React.js, Vite, Chart.js |
| Backend | Node.js, Express.js |
| Database | MongoDB |
| AI/Logic | Python, Flask |
| PDF | ReportLab |
| Auth | JWT |

## 📁 Project Structure

```
question-paper-generator/
├── client/          # React frontend
├── server/          # Node.js backend
└── ai_service/      # Python microservice
```

## 🛠️ Setup Instructions

### Prerequisites
- Node.js v18+
- Python 3.9+
- MongoDB (local or Atlas)

### 1. Backend Setup
```bash
cd server
npm install
# Create .env file with your MongoDB URI
npm run dev
```

### 2. Python Service Setup
```bash
cd ai_service
pip install -r requirements.txt
python app.py
```

### 3. Frontend Setup
```bash
cd client
npm install
npm run dev
```

### 4. Access the Application
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Python Service: http://localhost:8000

## 📌 Features

- ✅ Question Bank Management (Add/Edit/Delete/CSV Upload)
- ✅ Intelligent Paper Generation with configurable difficulty distribution
- ✅ Randomized question selection with no repetition
- ✅ Question Paper PDF generation
- ✅ Summary Report PDF with analytics
- ✅ Dashboard with statistics and charts
- ✅ JWT Authentication (Admin/Faculty)

## 🔐 Environment Variables

### Server (.env)
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/question_paper_db
JWT_SECRET=your_secret_key
PYTHON_SERVICE_URL=http://localhost:8000
```

## 📊 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register user |
| POST | /api/auth/login | Login |
| GET | /api/questions | Get all questions |
| POST | /api/questions | Add question |
| POST | /api/papers/generate | Generate paper |
| POST | /api/papers/:id/pdf | Download PDF |

## 📄 License
MIT
