import express from 'express';
import { Exam } from '../models/Exam.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get all exams for an instructor
router.get('/', requireAuth, requireRole(['Instructor', 'Admin']), async (req, res) => {
    try {
        const exams = await Exam.find({ instructor: req.user._id }).sort({ createdAt: -1 });
        res.json(exams);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching exams', error: err.message });
    }
});

// Get available exams for students
router.get('/available', requireAuth, requireRole(['Student']), async (req, res) => {
    try {
        const exams = await Exam.find({ published: true }).select('-questions.correctAnswer');
        // Important: Remove correct answers when sending to students
        res.json(exams);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching exams', error: err.message });
    }
});

// Get a single exam by ID
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const exam = await Exam.findById(req.params.id);
        if (!exam) return res.status(404).json({ message: 'Exam not found' });

        // Students can only access published exams
        if (req.user.role === 'Student' && !exam.published) {
            return res.status(403).json({ message: 'This exam is not available' });
        }

        // Strip correct answers if it's a student requesting
        if (req.user.role === 'Student') {
            const strippedExam = exam.toObject();
            strippedExam.questions.forEach(q => delete q.correctAnswer);
            return res.json(strippedExam);
        }
        res.json(exam);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching exam', error: err.message });
    }
});

// Create a new exam
router.post('/', requireAuth, requireRole(['Instructor', 'Admin']), async (req, res) => {
    try {
        const { title, description, durationMinutes, questions, published } = req.body;

        const newExam = new Exam({
            title,
            description,
            durationMinutes,
            questions, // Expecting an array of question objects
            published: published || false,
            instructor: req.user._id
        });

        await newExam.save();
        res.status(201).json(newExam);
    } catch (err) {
        res.status(500).json({ message: 'Error creating exam', error: err.message });
    }
});

// Update an exam
router.put('/:id', requireAuth, requireRole(['Instructor', 'Admin']), async (req, res) => {
    try {
        const { title, description, durationMinutes, questions, published } = req.body;

        const updatedExam = await Exam.findOneAndUpdate(
            { _id: req.params.id, instructor: req.user._id },
            { title, description, durationMinutes, questions, published },
            { new: true, runValidators: true }
        );

        if (!updatedExam) {
            return res.status(404).json({ message: 'Exam not found or unauthorized' });
        }

        // Clear all previous submissions so students can retake the updated exam
        const Submission = (await import('../models/Submission.js')).default;
        const deleted = await Submission.deleteMany({ exam: req.params.id });
        console.log(`Exam updated: cleared ${deleted.deletedCount} old submissions for exam ${req.params.id}`);

        res.json(updatedExam);
    } catch (err) {
        res.status(500).json({ message: 'Error updating exam', error: err.message });
    }
});

// Delete an exam (cascade: remove submissions + proctor logs)
router.delete('/:id', requireAuth, requireRole(['Instructor', 'Admin']), async (req, res) => {
    try {
        const exam = await Exam.findOneAndDelete({ _id: req.params.id, instructor: req.user._id });
        if (!exam) return res.status(404).json({ message: 'Exam not found or unauthorized' });

        const Submission = (await import('../models/Submission.js')).default;
        const ProctorLog = (await import('../models/ProctorLog.js')).default;
        await Submission.deleteMany({ exam: req.params.id });
        await ProctorLog.deleteMany({ exam: req.params.id });

        res.json({ message: 'Exam deleted successfully.' });
    } catch (err) {
        res.status(500).json({ message: 'Error deleting exam', error: err.message });
    }
});

export default router;
