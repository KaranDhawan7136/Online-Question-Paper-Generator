const mongoose = require('mongoose');

const syllabusMapSchema = new mongoose.Schema({
    subject: {
        type: String,
        required: true,
        trim: true
    },
    mappings: [{
        topic: {
            type: String,
            required: true,
            trim: true
        },
        unit: {
            type: String,
            required: true,
            trim: true
        },
        lectureNumber: {
            type: String,
            trim: true
        },
        cloMapping: {
            type: Number,
            min: 1,
            max: 5
        }
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { timestamps: true });

// Each user can have only one CHO per subject, but different users can have their own
syllabusMapSchema.index({ subject: 1, createdBy: 1 }, { unique: true });

module.exports = mongoose.model('SyllabusMap', syllabusMapSchema);
