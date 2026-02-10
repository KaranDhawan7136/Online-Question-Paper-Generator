const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const Question = require('../models/Question');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Get all questions with filters
router.get('/', auth, async (req, res) => {
    try {
        const { subject, unit, difficulty, questionType, page = 1, limit = 20, search } = req.query;

        const filter = {};
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            filter.$or = [
                { text: searchRegex },
                { topic: searchRegex },
                { subject: searchRegex }
            ];
        }
        if (subject) filter.subject = new RegExp(subject, 'i');
        if (unit) filter.unit = new RegExp(unit, 'i');
        if (difficulty) filter.difficulty = difficulty;
        if (questionType) filter.questionType = questionType;

        const questions = await Question.find(filter)
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 });

        const total = await Question.countDocuments(filter);

        res.json({
            questions,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single question
router.get('/:id', auth, async (req, res) => {
    try {
        const question = await Question.findById(req.params.id);
        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }
        res.json(question);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create question
router.post('/', auth, async (req, res) => {
    try {
        // Check for duplicates (case-insensitive)
        const existingQuestion = await Question.findOne({
            text: { $regex: new RegExp('^' + req.body.text.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') }
        });

        if (existingQuestion) {
            return res.status(400).json({ error: 'Question already exists in the database.' });
        }

        const question = new Question(req.body);
        await question.save();
        res.status(201).json({ message: 'Question created', question });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Update question
router.put('/:id', auth, async (req, res) => {
    try {
        const question = await Question.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }
        res.json({ message: 'Question updated', question });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Delete question
router.delete('/:id', auth, async (req, res) => {
    try {
        const question = await Question.findByIdAndDelete(req.params.id);
        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }
        res.json({ message: 'Question deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Bulk upload via CSV
router.post('/upload-csv', auth, upload.single('file'), async (req, res) => {
    try {
        const results = [];

        fs.createReadStream(req.file.path)
            .pipe(csv())
            .on('data', (data) => {
                results.push({
                    text: data.text || data.question,
                    subject: data.subject,
                    topic: data.topic || '',
                    unit: data.unit || data.chapter || '',
                    lectureNumber: data.lectureNumber || '',
                    difficultyLevel: parseInt(data.difficultyLevel) || 2,
                    estimatedTime: parseInt(data.estimatedTime) || 5,
                    marks: parseInt(data.marks) || 1,
                    questionType: data.questionType || data.type,
                    options: data.options ? data.options.split('|') : [],
                    correctAnswer: data.correctAnswer || '',
                    bloomsTaxonomy: data.bloomsTaxonomy || 'U',
                    cloMapping: parseInt(data.cloMapping) || 1,
                    internalChoiceGroup: data.internalChoiceGroup || null
                });
            })
            .on('end', async () => {
                try {
                    const questions = await Question.insertMany(results);
                    fs.unlinkSync(req.file.path); // Clean up
                    res.json({ message: `${questions.length} questions uploaded`, count: questions.length });
                } catch (insertError) {
                    fs.unlinkSync(req.file.path); // Clean up
                    res.status(400).json({ error: insertError.message });
                }
            })
            .on('error', (parseError) => {
                fs.unlinkSync(req.file.path); // Clean up
                res.status(400).json({ error: parseError.message });
            });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// Get stats
router.get('/stats/overview', auth, async (req, res) => {
    try {
        const total = await Question.countDocuments();
        const byDifficulty = await Question.aggregate([
            { $group: { _id: '$difficulty', count: { $sum: 1 } } }
        ]);
        const byType = await Question.aggregate([
            { $group: { _id: '$questionType', count: { $sum: 1 } } }
        ]);
        const bySubject = await Question.aggregate([
            { $group: { _id: '$subject', count: { $sum: 1 } } }
        ]);

        res.json({ total, byDifficulty, byType, bySubject });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
