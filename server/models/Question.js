const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    text: {
        type: String,
        required: true,
        trim: true
    },
    subject: {
        type: String,
        required: true,
        trim: true
    },
    // Topic/Unit/Chapter
    topic: {
        type: String,
        required: true,
        trim: true
    },
    unit: {
        type: String,
        default: '',
        trim: true
    },
    // Lecture number (e.g., "1-15", "6", "9,10")
    lectureNumber: {
        type: String,
        default: '',
        trim: true
    },
    // Difficulty on scale of 1-5 (1=very easy, 5=very hard)
    difficultyLevel: {
        type: Number,
        min: 1,
        max: 5,
        required: true,
        default: 2
    },
    // Estimated time to solve (in minutes)
    estimatedTime: {
        type: Number,
        min: 1,
        default: 5
    },
    marks: {
        type: Number,
        required: true,
        min: 1
    },
    questionType: {
        type: String,
        enum: ['MCQ', '2 Mark', '3 Mark', '5 Mark', '10 Mark'],
        required: true
    },
    options: {
        type: [String],
        default: []
    },
    correctAnswer: {
        type: String,
        default: ''
    },
    // Bloom's Taxonomy: R=Remember, U=Understand, P=Apply, E=Evaluate, N=Analyze, C=Create
    bloomsTaxonomy: {
        type: String,
        enum: ['R', 'U', 'P', 'E', 'N', 'C'],
        default: 'U'
    },
    // Course Learning Outcome (1-5)
    cloMapping: {
        type: Number,
        min: 1,
        max: 5,
        default: 1
    },
    internalChoiceGroup: {
        type: String,
        default: null
    }
}, { timestamps: true });

module.exports = mongoose.model('Question', questionSchema);
