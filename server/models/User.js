const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: function() { return this.authProvider !== 'google'; },
        minlength: 6
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true
    },
    authProvider: {
        type: String,
        enum: ['local', 'google'],
        default: 'local'
    },
    role: {
        type: String,
        enum: ['admin', 'faculty'],
        default: 'faculty'
    },
    memberId: {
        type: String,
        unique: true,
        sparse: true
    },
    isApproved: {
        type: Boolean,
        default: false
    },
    resetToken: String,
    resetTokenExpiry: Date
}, { timestamps: true });

// Auto-generate memberId before saving (if not set)
userSchema.pre('save', async function (next) {
    // Generate memberId for new users
    if (!this.memberId) {
        const count = await mongoose.model('User').countDocuments();
        this.memberId = `MEM-${String(count + 1).padStart(3, '0')}`;
    }

    // Hash password before saving (only if password exists — Google users don't have one)
    if (this.password && this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
