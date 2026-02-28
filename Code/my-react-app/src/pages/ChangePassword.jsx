import React, { useState } from 'react';
import api from '../api';

export default function ChangePassword({ user, onPasswordChanged }) {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (newPassword.length < 6) {
            return setError('New password must be at least 6 characters.');
        }
        if (newPassword !== confirmPassword) {
            return setError('Passwords do not match.');
        }

        setIsLoading(true);
        try {
            const res = await api.post('/api/auth/change-password', {
                currentPassword,
                newPassword
            });

            onPasswordChanged(res.data.user);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to change password.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="ff-signin-bg">
            <div className="ff-signin-card ff-animate-in" style={{ maxWidth: '440px' }}>
                <div className="ff-logo">Focus Flow</div>
                <p style={{ textAlign: 'center', color: 'var(--ff-text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                    Change Your Password
                </p>

                <div style={{ background: 'var(--ff-bg-elevated)', borderRadius: 'var(--ff-radius-sm)', padding: '0.85rem 1rem', marginBottom: '1.5rem' }}>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--ff-warning)' }}>
                        <i className="bi bi-shield-lock me-2"></i>
                        You must change your default password before continuing.
                    </p>
                </div>

                {error && <div className="ff-alert mb-3"><i className="bi bi-exclamation-triangle me-2"></i>{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '1rem' }}>
                        <label className="ff-label" htmlFor="currentPwd">Current Password</label>
                        <input
                            id="currentPwd"
                            type="password"
                            className="ff-input"
                            placeholder="Enter current password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            required
                        />
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                        <label className="ff-label" htmlFor="newPwd">New Password</label>
                        <input
                            id="newPwd"
                            type="password"
                            className="ff-input"
                            placeholder="At least 6 characters"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                        />
                    </div>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label className="ff-label" htmlFor="confirmPwd">Confirm New Password</label>
                        <input
                            id="confirmPwd"
                            type="password"
                            className="ff-input"
                            placeholder="Re-enter new password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" className="ff-btn ff-btn-primary w-100" disabled={isLoading} style={{ padding: '0.7rem', fontSize: '1rem' }}>
                        {isLoading ? (
                            <><span className="spinner-border spinner-border-sm me-2"></span> Updating...</>
                        ) : (
                            <><i className="bi bi-check-lg me-1"></i> Change Password</>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
