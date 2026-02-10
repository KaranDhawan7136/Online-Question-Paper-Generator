const express = require('express');
const axios = require('axios');
const Question = require('../models/Question');
const Paper = require('../models/Paper');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Generate paper
router.post('/generate', auth, async (req, res) => {
    try {
        const {
            // University/Institution Details
            universityName,
            logoPath,
            academicYear,

            // Exam Details
            title,
            semester,

            // Course Details
            programmeName,
            courseTitle,
            courseCode,
            subject,

            // Paper Configuration
            totalMarks,
            duration,
            totalPages,
            instructions,
            difficultyDistribution,
            questionTypes,
            questionCounts, // NEW: Exact counts per question type
            unitConfig // Array of { name, topics, percentage }
        } = req.body;

        // Fetch questions from DB based on subject and question types
        const filter = { subject: new RegExp(subject, 'i') };
        if (questionTypes && questionTypes.length > 0) {
            filter.questionType = { $in: questionTypes };
        }

        const availableQuestions = await Question.find(filter);

        if (availableQuestions.length === 0) {
            return res.status(400).json({ error: 'No questions available for the given criteria' });
        }

        // Call Python service for intelligent selection with unitConfig and questionCounts
        const pythonResponse = await axios.post(`${process.env.PYTHON_SERVICE_URL}/generate`, {
            questions: availableQuestions,
            config: {
                totalMarks,
                difficultyDistribution: difficultyDistribution || { 1: 20, 2: 30, 3: 30, 4: 15, 5: 5 },
                questionTypes: questionTypes || ['MCQ', '3 Mark', '5 Mark'],
                questionCounts: questionCounts || {}, // Pass exact question counts
                unitConfig: unitConfig || [] // Pass unit configuration for weighted selection
            }
        });

        const selectedQuestions = pythonResponse.data.selected_questions;
        const questionIds = selectedQuestions.map(q => q._id);

        // Save paper to database with all new fields
        const paper = new Paper({
            // University/Institution Details
            universityName: universityName || 'University Name',
            logoPath: logoPath || null,
            academicYear: academicYear || '2025-2026',

            // Exam Details
            title,
            semester: semester || '',

            // Course Details
            programmeName: programmeName || '',
            courseTitle: courseTitle || subject,
            courseCode: courseCode || '',
            subject,

            // Paper Configuration
            totalMarks,
            duration: duration || 180,
            totalPages: totalPages || 2,
            instructions: instructions || [
                'Follow the instructions given in each section.',
                'Do not write anything on the question paper, except your roll no.',
                'Make sure that you attempt the questions in order.'
            ],
            config: {
                difficultyDistribution: difficultyDistribution || { Easy: 30, Medium: 50, Hard: 20 },
                questionTypes: questionTypes || ['MCQ', '2 Mark', '5 Mark', '10 Mark']
            },
            questions: questionIds,
            createdBy: req.user._id
        });

        await paper.save();

        res.json({
            message: 'Paper generated successfully',
            paper: {
                ...paper.toObject(),
                questionsData: selectedQuestions
            },
            analytics: pythonResponse.data.analytics
        });
    } catch (error) {
        console.error('Paper generation error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Get all papers
router.get('/', auth, async (req, res) => {
    try {
        const papers = await Paper.find({ createdBy: req.user._id })
            .populate('questions')
            .sort({ createdAt: -1 });
        res.json(papers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single paper
router.get('/:id', auth, async (req, res) => {
    try {
        const paper = await Paper.findById(req.params.id).populate('questions');
        if (!paper) {
            return res.status(404).json({ error: 'Paper not found' });
        }
        res.json(paper);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Generate PDF
router.post('/:id/pdf', auth, async (req, res) => {
    try {
        const paper = await Paper.findById(req.params.id).populate('questions');
        if (!paper) {
            return res.status(404).json({ error: 'Paper not found' });
        }

        // Call Python service for PDF generation
        const pythonResponse = await axios.post(
            `${process.env.PYTHON_SERVICE_URL}/create-pdf`,
            {
                paper: paper.toObject(),
                type: req.body.type || 'question_paper' // 'question_paper' or 'summary'
            },
            { responseType: 'arraybuffer' }
        );

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${paper.title.replace(/\s/g, '_')}.pdf"`
        });
        res.send(pythonResponse.data);
    } catch (error) {
        console.error('PDF generation error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Delete paper
router.delete('/:id', auth, async (req, res) => {
    try {
        const paper = await Paper.findByIdAndDelete(req.params.id);
        if (!paper) {
            return res.status(404).json({ error: 'Paper not found' });
        }
        res.json({ message: 'Paper deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
