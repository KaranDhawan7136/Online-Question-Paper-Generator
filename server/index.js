const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const questionRoutes = require('./routes/questions');
const paperRoutes = require('./routes/papers');
const authRoutes = require('./routes/auth');

const path = require('path');
const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve uploaded images as static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  family: 4  // Force IPv4
})
  .then(async () => {
    console.log('✅ MongoDB Connected');
    // One-time migration: drop old global unique index on subject
    try {
      await mongoose.connection.collection('syllabusmaps').dropIndex('subject_1');
      console.log('✅ Dropped old subject_1 unique index (migrated to per-user CHO)');
    } catch (e) {
      // Index already dropped or doesn't exist — that's fine
    }
  })
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/papers', paperRoutes);
app.use('/api/admin', require('./routes/admin'));
app.use('/api/syllabus', require('./routes/syllabus'));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
