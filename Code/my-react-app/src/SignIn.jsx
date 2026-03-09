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
  const [resetStatus, setResetStatus] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const response = await api.post('/api/auth/login', { email, password });
      if (response.data.user) {
        onLogin(response.data.user);
        navigate(response.data.user.role === 'Instructor' ? '/instructor-dashboard' : '/student-dashboard');
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
      } catch (err) { /* ignore */ }
    }, 5000);
    return () => clearInterval(interval);
  }, [resetRequestId, resetStatus]);

  // Underline input styles
  const inputGroupStyle = { marginBottom: '1.25rem' };
  const labelStyle = {
    display: 'block', fontSize: '0.72rem', fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '0.08em',
    color: '#64748b', marginBottom: '0.35rem',
  };
  const inputStyle = {
    width: '100%', background: 'transparent', border: 'none',
    borderBottom: '1.5px solid #334155', padding: '0.6rem 0',
    fontSize: '0.95rem', color: '#f1f5f9', outline: 'none',
    transition: 'border-color 0.3s', fontWeight: 500,
  };
  const alertStyle = {
    padding: '0.6rem 0.85rem', borderRadius: '8px',
    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
    color: '#f87171', fontSize: '0.82rem', marginBottom: '1rem',
  };
  const successStyle = {
    padding: '0.6rem 0.85rem', borderRadius: '8px',
    background: 'rgba(52,211,153,0.1)', border: '1px solid #34d399',
    color: '#34d399', fontSize: '0.82rem', marginBottom: '1rem',
  };
  const pendingStyle = {
    padding: '0.6rem 0.85rem', borderRadius: '8px',
    background: 'rgba(251,191,36,0.1)', border: '1px solid #fbbf24',
    color: '#fbbf24', fontSize: '0.82rem', marginBottom: '1rem', textAlign: 'center',
  };

  return (
    <div className="ff-signin-bg">
      {/* Animated background — flying orbs */}
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

      {/* Main Card — split layout */}
      <div className="ff-animate-in ff-signin-card-split" style={{
        maxWidth: '820px', width: '100%',
        background: 'rgba(15, 17, 23, 0.92)', backdropFilter: 'blur(24px)',
        borderRadius: '16px', overflow: 'hidden',
        boxShadow: '0 25px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.1)',
        border: '1px solid rgba(99,102,241,0.08)',
      }}>

        {/* Left — Logo Side */}
        <div className="ff-signin-logo-side">
          <div className="ff-signin-logo-box">
            <img src="/focusflow-logo.jpg" alt="Focus Flow" />
          </div>
          <div style={{
            fontSize: '0.72rem', color: '#475569', textAlign: 'center',
            lineHeight: 1.4, fontWeight: 500,
          }}>
            <span style={{ color: '#94a3b8', fontWeight: 600 }}>Powered by</span> MediaPipe AI
          </div>
        </div>

        {/* Right — Form Side */}
        <div style={{
          flex: 1, padding: '2.5rem',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
        }}>

          {!showForgot ? (
            <>
              <div style={{ marginBottom: '1.75rem' }}>
                <h2 style={{
                  fontSize: '1.6rem', fontWeight: 800, color: '#f1f5f9',
                  letterSpacing: '-0.02em', marginBottom: '0.25rem',
                }}>
                  Sign In to <span style={{ color: '#818cf8' }}>Focus Flow</span>
                </h2>
                <p style={{ color: '#64748b', fontSize: '0.88rem', margin: 0 }}>
                  AI-Proctored Smart Exam Platform
                </p>
              </div>

              {error && (
                <div style={alertStyle}>
                  <i className="bi bi-exclamation-triangle me-2"></i>{error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div style={inputGroupStyle}>
                  <label style={labelStyle} htmlFor="email">Your email</label>
                  <input
                    id="email" type="email" style={inputStyle}
                    placeholder="name@example.com"
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    onFocus={(e) => e.target.style.borderBottomColor = '#818cf8'}
                    onBlur={(e) => e.target.style.borderBottomColor = '#334155'}
                    required
                  />
                </div>
                <div style={inputGroupStyle}>
                  <label style={labelStyle} htmlFor="password">Your password</label>
                  <input
                    id="password" type="password" style={inputStyle}
                    placeholder="••••••••"
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    onFocus={(e) => e.target.style.borderBottomColor = '#818cf8'}
                    onBlur={(e) => e.target.style.borderBottomColor = '#334155'}
                    required
                  />
                </div>

                <div style={{ textAlign: 'right', marginBottom: '1rem' }}>
                  <button type="button"
                    onClick={() => { setShowForgot(true); setError(''); }}
                    style={{
                      background: 'none', border: 'none', color: '#818cf8',
                      fontSize: '0.8rem', cursor: 'pointer', padding: 0, fontWeight: 500,
                    }}
                  >
                    Forgot Password?
                  </button>
                </div>

                <button type="submit" disabled={isLoading} style={{
                  width: '100%', padding: '0.75rem', borderRadius: '8px', border: 'none',
                  background: 'linear-gradient(135deg, #6366f1, #818cf8)', color: '#fff',
                  fontSize: '0.95rem', fontWeight: 700, letterSpacing: '0.04em',
                  cursor: 'pointer', textTransform: 'uppercase',
                  boxShadow: '0 4px 20px rgba(99,102,241,0.3)',
                  transition: 'all 0.3s', marginTop: '0.5rem',
                }}>
                  {isLoading ? (
                    <><span className="spinner-border spinner-border-sm me-2"></span> Signing in...</>
                  ) : 'SIGN IN'}
                </button>
              </form>

            </>

          ) : (
            <>
              {/* Forgot Password View */}
              <div style={{ marginBottom: '1rem' }}>
                <button type="button"
                  onClick={() => { setShowForgot(false); setForgotMsg(''); setForgotError(''); setResetStatus(null); }}
                  style={{
                    background: 'none', border: 'none', color: '#64748b',
                    fontSize: '0.85rem', cursor: 'pointer', padding: 0, fontWeight: 500,
                  }}
                >
                  <i className="bi bi-arrow-left me-1"></i> Back to Sign In
                </button>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{
                  fontSize: '1.4rem', fontWeight: 800, color: '#f1f5f9',
                  letterSpacing: '-0.02em', marginBottom: '0.25rem',
                }}>
                  Reset <span style={{ color: '#818cf8' }}>Password</span>
                </h2>
                <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>
                  <i className="bi bi-info-circle me-1"></i>
                  A reset request will be sent to your instructor for approval.
                </p>
              </div>

              {forgotMsg && <div style={successStyle}><i className="bi bi-check-circle me-2"></i>{forgotMsg}</div>}
              {forgotError && <div style={alertStyle}><i className="bi bi-exclamation-triangle me-2"></i>{forgotError}</div>}

              {resetStatus === 'pending' && (
                <div style={pendingStyle}>
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  Waiting for instructor approval...
                </div>
              )}

              {resetStatus !== 'approved' && (
                <form onSubmit={handleForgotPassword}>
                  <div style={inputGroupStyle}>
                    <label style={labelStyle} htmlFor="forgotEmail">Your Email</label>
                    <input
                      id="forgotEmail" type="email" style={inputStyle}
                      placeholder="student@example.com"
                      value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)}
                      onFocus={(e) => e.target.style.borderBottomColor = '#818cf8'}
                      onBlur={(e) => e.target.style.borderBottomColor = '#334155'}
                      required disabled={resetStatus === 'pending'}
                    />
                  </div>
                  <button type="submit" disabled={forgotLoading || resetStatus === 'pending'} style={{
                    width: '100%', padding: '0.75rem', borderRadius: '8px', border: 'none',
                    background: 'linear-gradient(135deg, #6366f1, #818cf8)', color: '#fff',
                    fontSize: '0.95rem', fontWeight: 700, letterSpacing: '0.04em',
                    cursor: 'pointer', textTransform: 'uppercase',
                    boxShadow: '0 4px 20px rgba(99,102,241,0.3)', transition: 'all 0.3s',
                  }}>
                    {forgotLoading ? (
                      <><span className="spinner-border spinner-border-sm me-2"></span> Sending...</>
                    ) : (
                      <><i className="bi bi-send me-1"></i> SEND RESET REQUEST</>
                    )}
                  </button>
                </form>
              )}

              {resetStatus === 'approved' && (
                <button style={{
                  width: '100%', padding: '0.75rem', borderRadius: '8px', border: 'none',
                  background: 'linear-gradient(135deg, #6366f1, #818cf8)', color: '#fff',
                  fontSize: '0.95rem', fontWeight: 700, letterSpacing: '0.04em',
                  cursor: 'pointer', textTransform: 'uppercase',
                  boxShadow: '0 4px 20px rgba(99,102,241,0.3)', transition: 'all 0.3s',
                }}
                  onClick={() => { setShowForgot(false); setResetStatus(null); setForgotMsg(''); }}
                >
                  <i className="bi bi-box-arrow-in-right me-1"></i> GO TO SIGN IN
                </button>
              )}
            </>
          )}

          <p style={{
            textAlign: 'center', color: '#475569', fontSize: '0.75rem',
            marginTop: '1.5rem', marginBottom: 0,
          }}>
            By signing in, you agree to Focus Flow's proctoring policies.
          </p>
        </div>
      </div>
    </div>
  );
}