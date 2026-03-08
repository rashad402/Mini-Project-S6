import express from 'express';
import axios from 'axios';
import Submission from '../models/Submission.js';
import { Exam } from '../models/Exam.js';
import { requireAuth } from '../middleware/auth.js';

// Judge0 CE — same as compile route
const JUDGE0_URL = 'https://ce.judge0.com';
const LANGUAGE_MAP = {
    javascript: 63,
    python: 71,
    c: 50,
    cpp: 54,
    java: 62,
};

// Helper: run code against a single test case via Judge0
async function runTestCase(code, language, input, timeout = 30000) {
    const languageId = LANGUAGE_MAP[language] || LANGUAGE_MAP.javascript;
    try {
        const response = await axios.post(
            `${JUDGE0_URL}/submissions?base64_encoded=true&wait=true`,
            {
                source_code: Buffer.from(code).toString('base64'),
                language_id: languageId,
                stdin: Buffer.from(input || '').toString('base64'),
                cpu_time_limit: 5,
                memory_limit: 128000
            },
            {
                headers: { 'Content-Type': 'application/json' },
                timeout
            }
        );
        const result = response.data;
        const stdout = result.stdout ? Buffer.from(result.stdout, 'base64').toString() : '';
        const stderr = result.stderr ? Buffer.from(result.stderr, 'base64').toString() : '';
        const isError = result.status && result.status.id > 3;
        return { output: stdout.trim(), error: isError ? (stderr || 'Execution error') : null };
    } catch (err) {
        return { output: '', error: err.message };
    }
}

const router = express.Router();

// Submit an exam
router.post('/', requireAuth, async (req, res) => {
    try {
        const { examId, answers, terminatedByProctor } = req.body;

        // Check if student already submitted this exam
        const existingSubmission = await Submission.findOne({ student: req.user._id, exam: examId });
        if (existingSubmission) {
            return res.status(400).json({ message: 'You have already submitted this exam.' });
        }

        const exam = await Exam.findById(examId);
        if (!exam) return res.status(404).json({ message: 'Exam not found' });

        let score = 0;
        let totalPoints = 0;

        // Grade each question
        for (const q of exam.questions) {
            totalPoints += q.points;
            const studentAns = answers.find(a => a.questionId.toString() === q._id.toString());
            if (!studentAns) continue;

            if (q.type === 'MCQ') {
                if (studentAns.answer === q.correctAnswer) {
                    score += q.points;
                }
            } else if (q.type === 'Coding') {
                const testCases = q.testCases || [];
                if (testCases.length === 0) continue;

                const language = (q.language || 'javascript').toLowerCase();
                let passed = 0;

                for (const tc of testCases) {
                    const result = await runTestCase(studentAns.answer, language, tc.input);
                    if (!result.error && result.output === (tc.expectedOutput || '').trim()) {
                        passed++;
                    }
                }

                const earnedPoints = (passed / testCases.length) * q.points;
                score += Math.round(earnedPoints * 100) / 100;
            }
        }

        score = Math.round(score);

        const submission = new Submission({
            student: req.user._id,
            exam: examId,
            answers,
            score,
            terminatedByProctor: !!terminatedByProctor
        });

        await submission.save();
        res.status(201).json({ message: 'Exam submitted', score, totalPoints });
    } catch (err) {
        console.error('Submission error:', err);
        res.status(500).json({ message: 'Error submitting exam', error: err.message });
    }
});

// Get user's submissions
router.get('/my-submissions', requireAuth, async (req, res) => {
    try {
        const submissions = await Submission.find({ student: req.user._id })
            .populate('exam', 'title durationMinutes questions createdAt')
            .sort({ submittedAt: -1 });

        const analyticsData = submissions.map(sub => {
            const totalPoints = sub.exam.questions.reduce((sum, q) => sum + q.points, 0);
            return {
                _id: sub._id,
                examId: sub.exam._id,
                examTitle: sub.exam.title,
                score: sub.score,
                totalPoints,
                percentage: totalPoints > 0 ? (sub.score / totalPoints) * 100 : 0,
                submittedAt: sub.submittedAt
            };
        });

        res.json(analyticsData);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching submissions', error: err.message });
    }
});

// Get submissions for instructor's exams
router.get('/instructor', requireAuth, async (req, res) => {
    if (req.user.role !== 'Instructor' && req.user.role !== 'Admin') {
        return res.status(403).json({ message: 'Access denied' });
    }
    try {
        // First find all exams created by this instructor
        const exams = await Exam.find({ instructor: req.user._id }).select('_id title');
        const examIds = exams.map(e => e._id);

        // Then find all submissions for these exams
        const submissions = await Submission.find({ exam: { $in: examIds } })
            .populate('student', 'email')
            .populate('exam', 'title durationMinutes questions createdAt')
            .sort({ submittedAt: -1 });

        // Filter out submissions whose exam or student was deleted
        const validSubs = submissions.filter(sub => sub.exam && sub.student);

        const formattedSubmissions = validSubs.map(sub => {
            const totalPoints = sub.exam.questions.reduce((sum, q) => sum + q.points, 0);
            return {
                _id: sub._id,
                examTitle: sub.exam.title,
                examId: sub.exam._id,
                studentEmail: sub.student.email,
                score: sub.score,
                totalPoints,
                percentage: totalPoints > 0 ? (sub.score / totalPoints) * 100 : 0,
                terminatedByProctor: sub.terminatedByProctor || false,
                submittedAt: sub.submittedAt
            };
        });

        res.json(formattedSubmissions);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching submissions', error: err.message });
    }
});

// Detailed per-student analytics for instructor
router.get('/instructor/detailed', requireAuth, async (req, res) => {
    if (req.user.role !== 'Instructor' && req.user.role !== 'Admin') {
        return res.status(403).json({ message: 'Access denied' });
    }
    try {
        const exams = await Exam.find({ instructor: req.user._id }).select('_id title');
        const examIds = exams.map(e => e._id);

        const submissions = await Submission.find({ exam: { $in: examIds } })
            .populate('student', 'email')
            .populate('exam', 'title questions')
            .sort({ submittedAt: -1 });

        // Filter out submissions whose exam was deleted (populate returns null)
        const validSubmissions = submissions.filter(sub => sub.exam && sub.student);

        // Group by student
        const studentMap = {};
        validSubmissions.forEach(sub => {
            const email = sub.student.email;
            if (!studentMap[email]) {
                studentMap[email] = { email, submissions: [] };
            }
            const totalPoints = sub.exam.questions.reduce((sum, q) => sum + q.points, 0);
            studentMap[email].submissions.push({
                _id: sub._id,
                examTitle: sub.exam.title,
                examId: sub.exam._id,
                score: sub.score,
                totalPoints,
                percentage: totalPoints > 0 ? Math.round((sub.score / totalPoints) * 100) : 0,
                terminatedByProctor: sub.terminatedByProctor || false,
                submittedAt: sub.submittedAt
            });
        });

        // Compute per-student stats
        const result = Object.values(studentMap).map(s => {
            const subs = s.submissions;
            const avgScore = subs.length > 0
                ? Math.round(subs.reduce((sum, x) => sum + x.percentage, 0) / subs.length)
                : 0;
            const best = subs.reduce((b, x) => x.percentage > b.percentage ? x : b, subs[0]);
            const worst = subs.reduce((w, x) => x.percentage < w.percentage ? x : w, subs[0]);
            const proctorViolations = subs.filter(x => x.terminatedByProctor).length;

            return {
                email: s.email,
                totalExams: subs.length,
                avgScore,
                bestExam: best ? best.examTitle : '—',
                bestScore: best ? best.percentage : 0,
                worstExam: worst ? worst.examTitle : '—',
                worstScore: worst ? worst.percentage : 0,
                proctorViolations,
                submissions: subs
            };
        });

        res.json(result);
    } catch (err) {
        console.error('Detailed analytics error:', err);
        res.status(500).json({ message: 'Error fetching detailed analytics' });
    }
});

export default router;
