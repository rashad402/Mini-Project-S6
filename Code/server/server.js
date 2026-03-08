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

// Trust the reverse proxy (Render) so secure cookies can be sent over HTTP
app.set('trust proxy', 1);

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

// Seed Initial Users (creates or resets password to ensure login works)
async function seedUser() {
    const defaults = [
        { email: 'admin@example.com', password: 'password123', role: 'Admin' },
        { email: 'student@example.com', password: 'password123', role: 'Student' },
        { email: 'instructor@example.com', password: 'password123', role: 'Instructor' }
    ];

    for (const { email, password, role } of defaults) {
        try {
            let user = await User.findOne({ email });
            if (!user) {
                user = new User({ email, password, role });
                await user.save();
                console.log(`Default ${role.toLowerCase()} created: ${email}`);
            } else {
                // Reset password to ensure it works
                user.password = password;
                await user.save();
                console.log(`Default ${role.toLowerCase()} password reset: ${email}`);
            }
        } catch (error) {
            console.error(`Error seeding ${email}:`, error);
        }
    }
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/proctor', proctorRoutes);
app.use('/api/compile', compileRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/students', studentRoutes);

// Serve React frontend in production
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.env.NODE_ENV === 'production') {
    const clientBuildPath = path.join(__dirname, '..', 'my-react-app', 'dist');
    app.use(express.static(clientBuildPath));

    // SPA catch-all: any non-API route serves index.html
    app.get(/^(?!\/api).*/, (req, res) => {
        res.sendFile(path.join(clientBuildPath, 'index.html'));
    });
} else {
    app.get('/', (req, res) => {
        res.send('Backend API is running.');
    });
}

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
