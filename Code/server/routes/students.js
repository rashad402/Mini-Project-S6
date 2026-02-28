import express from 'express';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Instructor adds a student with a default password
router.post('/add', requireAuth, async (req, res) => {
    if (req.user.role !== 'Instructor' && req.user.role !== 'Admin') {
        return res.status(403).json({ message: 'Access denied. Instructors only.' });
    }
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: 'Email is required.' });

        // Check if user already exists
        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(409).json({ message: 'A user with this email already exists.' });
        }

        const student = new User({
            email,
            password: 'password123', // default password, will be hashed by pre-save hook
            role: 'Student',
            mustChangePassword: true
        });
        await student.save();

        res.status(201).json({
            message: 'Student added successfully.',
            student: { id: student._id, email: student.email, role: student.role }
        });
    } catch (err) {
        console.error('Add student error:', err);
        res.status(500).json({ message: 'Failed to add student.', error: err.message });
    }
});

// List all students (for instructors)
router.get('/', requireAuth, async (req, res) => {
    if (req.user.role !== 'Instructor' && req.user.role !== 'Admin') {
        return res.status(403).json({ message: 'Access denied.' });
    }
    try {
        const students = await User.find({ role: 'Student' })
            .select('email createdAt mustChangePassword')
            .sort({ createdAt: -1 });
        res.json(students);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch students.' });
    }
});

// Delete a student (cascade: remove submissions + proctor logs)
router.delete('/:id', requireAuth, async (req, res) => {
    if (req.user.role !== 'Instructor' && req.user.role !== 'Admin') {
        return res.status(403).json({ message: 'Access denied.' });
    }
    try {
        const student = await User.findOneAndDelete({ _id: req.params.id, role: 'Student' });
        if (!student) return res.status(404).json({ message: 'Student not found.' });

        const Submission = (await import('../models/Submission.js')).default;
        const ProctorLog = (await import('../models/ProctorLog.js')).default;
        await Submission.deleteMany({ student: req.params.id });
        await ProctorLog.deleteMany({ student: req.params.id });

        res.json({ message: 'Student deleted successfully.' });
    } catch (err) {
        console.error('Delete student error:', err);
        res.status(500).json({ message: 'Failed to delete student.' });
    }
});

// Get pending password reset requests
router.get('/reset-requests', requireAuth, async (req, res) => {
    if (req.user.role !== 'Instructor' && req.user.role !== 'Admin') {
        return res.status(403).json({ message: 'Access denied.' });
    }
    try {
        const PasswordResetRequest = (await import('../models/PasswordResetRequest.js')).default;
        const requests = await PasswordResetRequest.find({ status: 'pending' })
            .populate('student', 'email')
            .sort({ createdAt: -1 });
        res.json(requests);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch reset requests.' });
    }
});

// Approve a password reset request
router.post('/reset-requests/:id/approve', requireAuth, async (req, res) => {
    if (req.user.role !== 'Instructor' && req.user.role !== 'Admin') {
        return res.status(403).json({ message: 'Access denied.' });
    }
    try {
        const PasswordResetRequest = (await import('../models/PasswordResetRequest.js')).default;
        const request = await PasswordResetRequest.findById(req.params.id);
        if (!request || request.status !== 'pending') {
            return res.status(404).json({ message: 'Request not found or already handled.' });
        }

        // Reset student password to default
        const student = await User.findById(request.student);
        if (!student) return res.status(404).json({ message: 'Student not found.' });

        student.password = 'password123';
        student.mustChangePassword = true;
        await student.save();

        request.status = 'approved';
        request.resolvedBy = req.user._id;
        request.resolvedAt = new Date();
        await request.save();

        res.json({ message: `Password reset approved for ${student.email}. Default password set.` });
    } catch (err) {
        console.error('Approve reset error:', err);
        res.status(500).json({ message: 'Failed to approve request.' });
    }
});

// Reject a password reset request
router.post('/reset-requests/:id/reject', requireAuth, async (req, res) => {
    if (req.user.role !== 'Instructor' && req.user.role !== 'Admin') {
        return res.status(403).json({ message: 'Access denied.' });
    }
    try {
        const PasswordResetRequest = (await import('../models/PasswordResetRequest.js')).default;
        const request = await PasswordResetRequest.findById(req.params.id);
        if (!request || request.status !== 'pending') {
            return res.status(404).json({ message: 'Request not found or already handled.' });
        }

        request.status = 'rejected';
        request.resolvedBy = req.user._id;
        request.resolvedAt = new Date();
        await request.save();

        res.json({ message: 'Password reset request rejected.' });
    } catch (err) {
        console.error('Reject reset error:', err);
        res.status(500).json({ message: 'Failed to reject request.' });
    }
});

export default router;
