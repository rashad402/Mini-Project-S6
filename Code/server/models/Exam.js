import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
    type: { type: String, enum: ['MCQ', 'Coding'], required: true },
    text: { type: String, required: true },
    image: { type: String }, // Optional image URL for the question
    options: [{ type: String }], // For MCQ
    correctAnswer: { type: String }, // For MCQ
    language: { type: String }, // For Coding
    testCases: [{
        input: { type: String },
        expectedOutput: { type: String }
    }], // For Coding
    points: { type: Number, default: 1 }
});

const Question = mongoose.model('Question', questionSchema);

const examSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    durationMinutes: { type: Number, required: true, default: 60 },
    questions: [questionSchema], // Embedding questions or could use refs
    published: { type: Boolean, default: false }
}, { timestamps: true });

const Exam = mongoose.model('Exam', examSchema);

export { Exam, Question };
