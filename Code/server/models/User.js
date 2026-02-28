import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String },
    role: { type: String, enum: ['Student', 'Instructor', 'Admin'], default: 'Student' },
    mustChangePassword: { type: Boolean, default: false }
}, { timestamps: true });

// Method to verify password
userSchema.methods.isValidPassword = async function (password) {
    if (!this.password) return false;
    return await bcrypt.compare(password, this.password);
};

// Hook to hash password before saving if it is new or modified
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

const User = mongoose.model('User', userSchema);
export default User;
