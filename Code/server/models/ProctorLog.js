import mongoose from 'mongoose';

const proctorLogSchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    exam: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
    flagType: { type: String, enum: ['LookingAway', 'FaceNotDetected', 'TabSwitched', 'MultipleFaces'], required: true },
    timestamp: { type: Date, default: Date.now },
    details: { type: String }
}, { timestamps: true });

const ProctorLog = mongoose.model('ProctorLog', proctorLogSchema);
export default ProctorLog;
