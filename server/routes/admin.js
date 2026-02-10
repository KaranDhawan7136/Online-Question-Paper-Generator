const express = require('express');
const User = require('../models/User');
const SystemConfig = require('../models/SystemConfig');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Middleware to ensure admin access
router.use(auth, adminOnly);

// Get pending users
router.get('/users/pending', async (req, res) => {
    try {
        const users = await User.find({ isApproved: false }).select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Approve user
router.put('/users/:id/approve', async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.id, { isApproved: true }, { new: true });
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ message: 'User approved successfully', user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// EMERGENCY: Approve ALL pending users
router.post('/users/approve-all', async (req, res) => {
    try {
        const result = await User.updateMany(
            { isApproved: { $ne: true } },
            { $set: { isApproved: true } }
        );
        res.json({ message: `Approved ${result.modifiedCount} users` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Admin: Reset any user's password
router.put('/users/:email/reset-password', async (req, res) => {
    try {
        const { newPassword } = req.body;
        const user = await User.findOne({ email: req.params.email });
        if (!user) return res.status(404).json({ error: 'User not found' });
        user.password = newPassword;
        await user.save();
        res.json({ message: `Password for ${req.params.email} has been reset.` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Reject (Delete) user
router.delete('/users/:id/reject', async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ message: 'User rejected and removed' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get current registration access code
router.get('/config/access-code', async (req, res) => {
    try {
        let config = await SystemConfig.findOne({ key: 'registration_access_code' });
        const code = config ? config.value : (process.env.ADMIN_SECRET || 'admin123');
        res.json({ accessCode: code });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update registration access code
router.put('/config/access-code', async (req, res) => {
    try {
        const { accessCode } = req.body;
        if (!accessCode || accessCode.length < 6) {
            return res.status(400).json({ error: 'Access code must be at least 6 characters' });
        }

        const config = await SystemConfig.findOneAndUpdate(
            { key: 'registration_access_code' },
            { value: accessCode },
            { upsert: true, new: true }
        );
        res.json({ message: 'Access code updated', accessCode: config.value });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
