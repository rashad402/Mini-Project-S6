import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import api from './api';
import 'bootstrap/dist/css/bootstrap.min.css';

import SignIn from './SignIn';
import StudentDashboard from './pages/StudentDashboard';
import InstructorDashboard from './pages/InstructorDashboard';
import ExamInterface from './pages/ExamInterface';
import CreateExam from './pages/CreateExam';
import ChangePassword from './pages/ChangePassword';
import Navbar from './components/layout/Navbar';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/auth/session')
      .then(res => {
        setUser(res.data.user);
        setLoading(false);
      })
      .catch(() => {
        setUser(null);
        setLoading(false);
      });
  }, []);

  const handleLogout = async () => {
    try {
      await api.post('/api/auth/logout');
      setUser(null);
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  if (loading) return <div className="ff-spinner"></div>;

  // If user must change password, show only that page
  if (user && user.mustChangePassword) {
    return (
      <ChangePassword
        user={user}
        onPasswordChanged={(updatedUser) => setUser(updatedUser)}
      />
    );
  }

  return (
    <Router>
      <div className="d-flex flex-column min-vh-100 bg-light">
        {user && <Navbar user={user} onLogout={handleLogout} />}
        <main className="flex-grow-1">
          <Routes>
            <Route path="/" element={
              user ? (user.role === 'Instructor' ? <Navigate to="/instructor-dashboard" /> : <Navigate to="/student-dashboard" />)
                : <SignIn onLogin={setUser} />
            } />
            <Route path="/student-dashboard" element={user && user.role !== 'Instructor' ? <StudentDashboard user={user} /> : <Navigate to="/" />} />
            <Route path="/instructor-dashboard" element={user && user.role === 'Instructor' ? <InstructorDashboard user={user} /> : <Navigate to="/" />} />
            <Route path="/create-exam" element={user && user.role === 'Instructor' ? <CreateExam /> : <Navigate to="/" />} />
            <Route path="/edit-exam/:examId" element={user && user.role === 'Instructor' ? <CreateExam /> : <Navigate to="/" />} />
            <Route path="/exam/:examId" element={user ? <ExamInterface user={user} /> : <Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
