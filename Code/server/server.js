import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import passport from './config/passport.js';
import authRoutes from './routes/auth.js';
import examRoutes from './routes/exams.js';
import proctorRoutes from './routes/proctor.js';
import compileRoutes from './routes/compile.js';
import submissionRoutes from './routes/submissions.js';
import studentRoutes from './routes/students.js';
import User from './models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/login_demo';

// Middleware
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Session Configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback_secret_key_change_in_production',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: MONGO_URI }),
    cookie: {
        maxAge: 1000 * 60 * 60 * 24,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// MongoDB Connection
mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('Connected to MongoDB');
        seedUser();
    })
    .catch(err => console.error('Could not connect to MongoDB:', err));

// Seed Initial User
async function seedUser() {
    try {
        const existingUser = await User.findOne({ email: 'admin@example.com' });
        if (!existingUser) {
            const newUser = new User({
                email: 'admin@example.com',
                password: 'password123',
                role: 'Admin'
            });
            await newUser.save();
            console.log('Default user created: admin@example.com / password123');
        } else {
            console.log('Default user already exists.');
        }

        const existingStudent = await User.findOne({ email: 'student@example.com' });
        if (!existingStudent) {
            const newStudent = new User({
                email: 'student@example.com',
                password: 'password123',
                role: 'Student'
            });
            await newStudent.save();
            console.log('Default student created: student@example.com / password123');
        }

        const existingInstructor = await User.findOne({ email: 'instructor@example.com' });
        if (!existingInstructor) {
            const newInstructor = new User({
                email: 'instructor@example.com',
                password: 'password123',
                role: 'Instructor'
            });
            await newInstructor.save();
            console.log('Default instructor created: instructor@example.com / password123');
        }
    } catch (error) {
        console.error('Error seeding users:', error);
    }
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/proctor', proctorRoutes);
app.use('/api/compile', compileRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/students', studentRoutes);

// Root Route
app.get('/', (req, res) => {
    res.send('Backend API is running.');
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
