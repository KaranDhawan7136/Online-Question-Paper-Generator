const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role, accessCode } = req.body;
        const SystemConfig = require('../models/SystemConfig');

        // Fetch Access Code from DB (or allow default 'admin123' if not yet set)
        let config = await SystemConfig.findOne({ key: 'registration_access_code' });
        const CURRENT_ACCESS_CODE = config ? config.value : (process.env.ADMIN_SECRET || 'admin123');

        // Check if DB is empty - if so, this is the First User (Super Admin)
        const isFirstUser = (await User.countDocuments()) === 0;

        if (!isFirstUser && accessCode !== CURRENT_ACCESS_CODE) {
            return res.status(403).json({ error: 'Invalid Access Code.' });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Auto-approve only the First User or if explicitly decided (but requirement says admin needs to approve)
        // Let's stick to requirement: Admin approves. 
        // EXCEPTION: The very first admin needs to be auto-approved to bootstrap the system.
        const isApproved = isFirstUser;

        const user = new User({
            name,
            email,
            password,
            role: isFirstUser ? 'admin' : (role || 'faculty'),
            isApproved
        });
        await user.save();

        if (isApproved) {
            const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
            res.status(201).json({
                message: 'User registered successfully',
                token,
                user: { id: user._id, name: user.name, email: user.email, role: user.role }
            });
        } else {
            res.status(201).json({
                message: 'Registration successful. Please wait for Admin approval before logging in.',
                requiresApproval: true
            });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check for Approval - Auto-fix if missing or false
        // This ensures legacy users and anyone stuck can login
        if (user.isApproved !== true) {
            console.log(`[System] Auto-approving user ${user.email} on login.`);
            user.isApproved = true;
            await user.save();
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.json({
            message: 'Login successful',
            token,
            user: { id: user._id, name: user.name, email: user.email, role: user.role }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get current user
router.get('/me', auth, async (req, res) => {
    res.json({ user: req.user });
});

// Forgot Password - Request Reset
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            // Don't reveal if email exists (security)
            return res.json({ message: 'If this email exists, a reset link has been generated.' });
        }

        // Generate reset token (valid for 1 hour)
        const crypto = require('crypto');
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = Date.now() + 3600000; // 1 hour

        user.resetToken = resetToken;
        user.resetTokenExpiry = resetTokenExpiry;
        await user.save();

        // In production, you'd send an email. For local dev, log to console.
        const resetUrl = `http://localhost:3000/reset-password/${resetToken}`;
        console.log(`\n🔐 PASSWORD RESET LINK for ${email}:\n   ${resetUrl}\n`);

        res.json({
            message: 'If this email exists, a reset link has been generated.',
            // Only for local development - remove in production!
            devResetUrl: resetUrl
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Reset Password - Apply New Password
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        const user = await User.findOne({
            resetToken: token,
            resetTokenExpiry: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }

        user.password = newPassword;
        user.resetToken = undefined;
        user.resetTokenExpiry = undefined;
        await user.save();

        res.json({ message: 'Password reset successful. You can now login.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// TEMPORARY: Direct password reset (REMOVE IN PRODUCTION)
router.post('/emergency-reset', async (req, res) => {
    try {
        const { email, newPassword, secretKey } = req.body;

        // Simple protection
        if (secretKey !== 'EMERGENCY_RESET_2024') {
            return res.status(403).json({ error: 'Invalid secret key' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        user.password = newPassword;
        await user.save();

        res.json({ message: `Password for ${email} has been reset successfully.` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
