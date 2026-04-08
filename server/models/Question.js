const mongoose = require('mongoose');

// Default time (minutes) based on marks
function getDefaultTime(marks) {
    const timeMap = { 1: 1, 2: 2, 3: 4, 5: 7, 10: 15 };
    if (timeMap[marks]) return timeMap[marks];
    // Interpolate for any other mark value
    if (marks <= 1) return 1;
    if (marks <= 2) return 2;
    if (marks <= 3) return 4;
    if (marks <= 5) return 7;
    if (marks <= 10) return 15;
    return Math.ceil(marks * 1.5);
}

const questionSchema = new mongoose.Schema({
    serialNumber: {
        type: Number,
        unique: true
    },
    text: {
        type: String,
        required: true,
        trim: true
    },
    subject: {
        type: [String],
        required: true
    },
    // Topic/Unit/Chapter
    topic: {
        type: [String],
        required: true
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
    // Estimated time to solve (in minutes) — auto-set from marks if not provided
    estimatedTime: {
        type: Number,
        min: 1
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
    // Image attached to the question (file path relative to uploads/)
    image: {
        type: String,
        default: ''
    },
    options: {
        type: [String],
        default: []
    },
    // Per-option images for MCQs (parallel array to options)
    optionImages: {
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
    },
    // Who created this question
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    }
}, { timestamps: true });

// Auto-assign serialNumber and estimatedTime before saving
questionSchema.pre('save', async function (next) {
    if (!this.serialNumber) {
        const lastQuestion = await mongoose.model('Question')
            .findOne({}, { serialNumber: 1 })
            .sort({ serialNumber: -1 });
        this.serialNumber = (lastQuestion?.serialNumber || 0) + 1;
    }
    // Auto-set estimatedTime from marks if not explicitly provided
    if (!this.estimatedTime && this.marks) {
        this.estimatedTime = getDefaultTime(this.marks);
    }
    next();
});

module.exports = mongoose.model('Question', questionSchema);
