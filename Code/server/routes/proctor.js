import express from 'express';
import ProctorLog from '../models/ProctorLog.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Save a proctor flag event
router.post('/flag', requireAuth, async (req, res) => {
    try {
        const { examId, flagType, details } = req.body;
        if (!examId || !flagType) {
            return res.status(400).json({ message: 'examId and flagType are required' });
        }

        const log = new ProctorLog({
            student: req.user._id,
            exam: examId,
            flagType,
            details
        });

        await log.save();
        res.status(201).json({ message: 'Flag event logged successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Error logging flag', error: err.message });
    }
});

// Get proctor logs for an exam (Instructors only)
router.get('/:examId', requireAuth, async (req, res) => {
    if (req.user.role !== 'Instructor' && req.user.role !== 'Admin') {
        return res.status(403).json({ message: 'Access denied' });
    }
    try {
        const logs = await ProctorLog.find({ exam: req.params.examId })
            .populate('student', 'email')
            .sort({ timestamp: -1 });
        res.json(logs);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching logs', error: err.message });
    }
});

export default router;
