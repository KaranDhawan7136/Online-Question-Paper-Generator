const mongoose = require('mongoose');

const paperSchema = new mongoose.Schema({
    // University/Institution Details
    universityName: {
        type: String,
        default: 'University Name'
    },
    logoPath: {
        type: String,
        default: null
    },
    academicYear: {
        type: String,
        default: '2025-2026'
    },

    // Exam Details
    title: {
        type: String,
        required: true
    },
    semester: {
        type: String,
        default: ''
    },

    // Course Details
    programmeName: {
        type: String,
        default: ''
    },
    courseTitle: {
        type: String,
        required: true
    },
    courseCode: {
        type: String,
        default: ''
    },
    subject: {
        type: String,
        required: true
    },

    // Paper Configuration
    totalMarks: {
        type: Number,
        required: true
    },
    duration: {
        type: Number, // in minutes
        default: 180
    },
    totalPages: {
        type: Number,
        default: 2
    },

    // Instructions
    instructions: {
        type: [String],
        default: [
            'Follow the instructions given in each section.',
            'Do not write anything on the question paper, except your roll no.',
            'Make sure that you attempt the questions in order.'
        ]
    },

    config: {
        difficultyDistribution: {
            Easy: { type: Number, default: 30 },
            Medium: { type: Number, default: 50 },
            Hard: { type: Number, default: 20 }
        },
        questionTypes: {
            type: [String],
            default: ['MCQ', '2 Mark', '5 Mark', '10 Mark']
        }
    },
    questions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question'
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    pdfPath: {
        type: String,
        default: null
    },
    summaryPdfPath: {
        type: String,
        default: null
    }
}, { timestamps: true });

module.exports = mongoose.model('Paper', paperSchema);

