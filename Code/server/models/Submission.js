import mongoose from 'mongoose';

const submissionSchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    exam: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
    answers: [{
        questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
        answer: { type: String } // Selected option or code
    }],
    score: { type: Number, default: 0 },
    terminatedByProctor: { type: Boolean, default: false },
    submittedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Enforce one submission per student per exam at the database level
submissionSchema.index({ student: 1, exam: 1 }, { unique: true });

const Submission = mongoose.model('Submission', submissionSchema);
export default Submission;
