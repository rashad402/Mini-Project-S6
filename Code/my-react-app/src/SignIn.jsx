import React, { useState, useEffect } from 'react';
import api from './api';
import { useNavigate } from 'react-router-dom';

export default function SignIn({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMsg, setForgotMsg] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [resetRequestId, setResetRequestId] = useState(null);
  const [resetStatus, setResetStatus] = useState(null); // 'pending' | 'approved' | 'rejected'
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const response = await api.post('/api/auth/login', {
        email,
        password,
      });

      if (response.data.user) {
        onLogin(response.data.user);
        if (response.data.user.role === 'Instructor') {
          navigate('/instructor-dashboard');
        } else {
          navigate('/student-dashboard');
        }
      }
    } catch (err) {
      console.error('Login failed:', err);
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotMsg(''); setForgotError(''); setResetStatus(null);
    setForgotLoading(true);
    try {
      const res = await api.post('/api/auth/forgot-password', { email: forgotEmail });
      setForgotMsg(res.data.message);
      setResetRequestId(res.data.requestId);
      setResetStatus('pending');
    } catch (err) {
      setForgotError(err.response?.data?.message || 'Failed to send reset request.');
    } finally {
      setForgotLoading(false);
    }
  };

  // Poll for reset request status every 5 seconds
  useEffect(() => {
    if (!resetRequestId || resetStatus !== 'pending') return;

    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/api/auth/reset-status/${resetRequestId}`);
        if (res.data.status === 'approved') {
          setResetStatus('approved');
          setForgotMsg('✅ Your password has been reset! You can now log in with the default password: password123');
          clearInterval(interval);
        } else if (res.data.status === 'rejected') {
          setResetStatus('rejected');
          setForgotError('❌ Your reset request was rejected by the instructor.');
          setForgotMsg('');
          clearInterval(interval);
        }
      } catch (err) {
        // Ignore polling errors
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [resetRequestId, resetStatus]);

  return (
    <div className="ff-signin-bg">
      {/* Animated background elements */}
      <div className="ff-orb-3"></div>
      <div className="ff-particles">
        <div className="ff-particle"></div>
        <div className="ff-particle"></div>
        <div className="ff-particle"></div>
        <div className="ff-particle"></div>
        <div className="ff-particle"></div>
        <div className="ff-particle"></div>
        <div className="ff-particle"></div>
        <div className="ff-particle"></div>
      </div>

      <div className="ff-signin-card ff-animate-in">
        <div className="ff-logo">Focus Flow</div>
        <p style={{ textAlign: 'center', color: 'var(--ff-text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>
          AI-Proctored Smart Exam Platform
        </p>

        {!showForgot ? (
          <>
            {error && <div className="ff-alert mb-3"><i className="bi bi-exclamation-triangle me-2"></i>{error}</div>}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1.15rem' }}>
                <label className="ff-label" htmlFor="email">Email Address</label>
                <input
                  id="email"
                  type="email"
                  className="ff-input"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div style={{ marginBottom: '0.5rem' }}>
                <label className="ff-label" htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  className="ff-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div style={{ textAlign: 'right', marginBottom: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => { setShowForgot(true); setError(''); }}
                  style={{ background: 'none', border: 'none', color: 'var(--ff-primary-light)', fontSize: '0.82rem', cursor: 'pointer', padding: 0 }}
                >
                  Forgot Password?
                </button>
              </div>
              <button type="submit" className="ff-btn ff-btn-primary w-100" disabled={isLoading} style={{ padding: '0.7rem', fontSize: '1rem' }}>
                {isLoading ? (
                  <><span className="spinner-border spinner-border-sm me-2"></span> Signing in...</>
                ) : (
                  <><i className="bi bi-box-arrow-in-right me-1"></i> Sign In</>
                )}
              </button>
            </form>


          </>
        ) : (
          <>
            {/* Forgot Password View */}
            <div style={{ marginBottom: '1rem' }}>
              <button
                type="button"
                onClick={() => { setShowForgot(false); setForgotMsg(''); setForgotError(''); setResetStatus(null); }}
                style={{ background: 'none', border: 'none', color: 'var(--ff-text-muted)', fontSize: '0.85rem', cursor: 'pointer', padding: 0 }}
              >
                <i className="bi bi-arrow-left me-1"></i> Back to Sign In
              </button>
            </div>

            <div style={{ background: 'var(--ff-bg-elevated)', borderRadius: 'var(--ff-radius-sm)', padding: '0.85rem 1rem', marginBottom: '1.25rem' }}>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--ff-text-secondary)' }}>
                <i className="bi bi-info-circle me-2" style={{ color: 'var(--ff-primary-light)' }}></i>
                Enter your email below. A password reset request will be sent to your instructor for approval.
              </p>
            </div>

            {forgotMsg && (
              <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--ff-radius-sm)', background: 'rgba(52, 211, 153, 0.1)', border: '1px solid var(--ff-success)', marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--ff-success)' }}>
                <i className="bi bi-check-circle me-2"></i>{forgotMsg}
              </div>
            )}

            {forgotError && (
              <div className="ff-alert mb-3">
                <i className="bi bi-exclamation-triangle me-2"></i>{forgotError}
              </div>
            )}

            {resetStatus === 'pending' && (
              <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--ff-radius-sm)', background: 'rgba(251, 191, 36, 0.1)', border: '1px solid var(--ff-warning)', marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--ff-warning)', textAlign: 'center' }}>
                <span className="spinner-border spinner-border-sm me-2"></span>
                Waiting for instructor approval...
              </div>
            )}

            {resetStatus !== 'approved' && (
              <form onSubmit={handleForgotPassword}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label className="ff-label" htmlFor="forgotEmail">Your Email</label>
                  <input
                    id="forgotEmail"
                    type="email"
                    className="ff-input"
                    placeholder="student@example.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    disabled={resetStatus === 'pending'}
                  />
                </div>
                <button
                  type="submit"
                  className="ff-btn ff-btn-accent w-100"
                  disabled={forgotLoading || resetStatus === 'pending'}
                  style={{ padding: '0.7rem', fontSize: '1rem' }}
                >
                  {forgotLoading ? (
                    <><span className="spinner-border spinner-border-sm me-2"></span> Sending...</>
                  ) : (
                    <><i className="bi bi-send me-1"></i> Send Reset Request</>
                  )}
                </button>
              </form>
            )}

            {resetStatus === 'approved' && (
              <button
                className="ff-btn ff-btn-primary w-100"
                onClick={() => { setShowForgot(false); setResetStatus(null); setForgotMsg(''); }}
                style={{ padding: '0.7rem', fontSize: '1rem' }}
              >
                <i className="bi bi-box-arrow-in-right me-1"></i> Go to Sign In
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}