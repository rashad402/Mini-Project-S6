import express from 'express';
import passport from 'passport';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Login
router.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) return next(err);
        if (!user) return res.status(401).json({ message: info.message });

        req.logIn(user, (err) => {
            if (err) return next(err);
            return res.json({
                message: 'Login successful',
                user: { id: user._id, email: user.email, role: user.role, mustChangePassword: user.mustChangePassword }
            });
        });
    })(req, res, next);
});

// Logout
router.post('/logout', (req, res) => {
    req.logout((err) => {
        if (err) return res.status(500).json({ message: 'Error logging out' });
        res.json({ message: 'Logout successful' });
    });
});

// Check Session
router.get('/session', (req, res) => {
    if (req.isAuthenticated()) {
        res.json({ user: { id: req.user._id, email: req.user.email, role: req.user.role, mustChangePassword: req.user.mustChangePassword } });
    } else {
        res.status(401).json({ message: 'Not authenticated' });
    }
});

// Change Password
router.post('/change-password', requireAuth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Current password and new password are required.' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters.' });
        }

        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found.' });

        const isValid = await user.isValidPassword(currentPassword);
        if (!isValid) return res.status(401).json({ message: 'Current password is incorrect.' });

        user.password = newPassword;
        user.mustChangePassword = false;
        await user.save(); // pre-save hook will hash the new password

        res.json({ message: 'Password changed successfully.', user: { id: user._id, email: user.email, role: user.role, mustChangePassword: false } });
    } catch (err) {
        console.error('Change password error:', err);
        res.status(500).json({ message: 'Failed to change password.' });
    }
});

// Forgot Password — creates a reset request for instructor to approve
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: 'Email is required.' });

        const user = await User.findOne({ email, role: 'Student' });
        if (!user) return res.status(404).json({ message: 'No student account found with this email.' });

        const PasswordResetRequest = (await import('../models/PasswordResetRequest.js')).default;

        // Check if there's already a pending request
        const existing = await PasswordResetRequest.findOne({ student: user._id, status: 'pending' });
        if (existing) {
            return res.json({ message: 'A reset request is already pending. Please wait for instructor approval.', requestId: existing._id });
        }

        const request = new PasswordResetRequest({ student: user._id });
        await request.save();

        res.json({ message: 'Password reset request sent to instructor. Please wait for approval.', requestId: request._id });
    } catch (err) {
        console.error('Forgot password error:', err);
        res.status(500).json({ message: 'Failed to submit reset request.' });
    }
});

// Check reset request status (polled from sign-in page)
router.get('/reset-status/:requestId', async (req, res) => {
    try {
        const PasswordResetRequest = (await import('../models/PasswordResetRequest.js')).default;
        const request = await PasswordResetRequest.findById(req.params.requestId);
        if (!request) return res.status(404).json({ status: 'not_found' });
        res.json({ status: request.status });
    } catch (err) {
        res.status(500).json({ message: 'Error checking status.' });
    }
});

export default router;
