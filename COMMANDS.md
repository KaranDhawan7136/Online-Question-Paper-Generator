# Project Commands

This file contains all the commands needed to run the **Question Paper Generator** project.

---

## Prerequisites

Before running the project, ensure you have the following installed:
- **Node.js** (v18 or higher)
- **Python** (v3.8 or higher)
- **MongoDB** (running locally or connection string configured)

---

## 1. Server (Backend)

```bash
# Navigate to server directory
cd server

# Install dependencies (first time only)
npm install

# Run in development mode (with auto-reload)
npm run dev

# OR run in production mode
npm start
```

**Server runs on:** `http://localhost:5000` (default)

---

## 2. Client (Frontend)

```bash
# Navigate to client directory
cd client

# Install dependencies (first time only)
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

**Client runs on:** `http://localhost:5173` (default Vite port)

---

## 3. AI Service (Python)

```bash
# Navigate to AI service directory
cd ai_service

# Create virtual environment (recommended, first time only)
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# Install dependencies (first time only)
pip install -r requirements.txt

# Run the AI service
python app.py
```

**AI Service runs on:** `http://localhost:5001` (default)

---

## Quick Start (Run All Services)

Open **3 separate terminals** and run:

### Terminal 1 - Server
```bash
cd server
npm run dev
```

### Terminal 2 - Client
```bash
cd client
npm run dev
```

### Terminal 3 - AI Service
```bash
cd ai_service
python app.py
```

---

## Environment Variables

Make sure to set up `.env` files in the `server` directory with required variables:
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `PORT` - Server port (default: 5000)

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Port already in use | Kill the process using the port or change the port in config |
| MongoDB connection failed | Ensure MongoDB is running and URI is correct |
| Module not found | Run `npm install` or `pip install -r requirements.txt` |
