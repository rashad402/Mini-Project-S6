import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function Navbar({ user, onLogout }) {
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <nav className="navbar ff-navbar" style={{ position: 'relative' }}>
            <div className="container d-flex align-items-center justify-content-between" style={{ flexWrap: 'nowrap', gap: '0.5rem' }}>
                {/* Brand + Role badge — always visible */}
                <div className="d-flex align-items-center gap-2" style={{ minWidth: 0 }}>
                    <Link className="navbar-brand" to="/" style={{ marginRight: 0, whiteSpace: 'nowrap' }}>Focus Flow</Link>
                    <span className="ff-badge ff-badge-primary" style={{ fontSize: '0.65rem', whiteSpace: 'nowrap' }}>{user?.role}</span>
                </div>

                {/* Desktop: inline email + logout */}
                <div className="d-none d-md-flex align-items-center gap-3">
                    <span style={{ color: 'var(--ff-text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>
                        <i className="bi bi-person-circle me-1"></i>
                        {user?.email}
                    </span>
                    <button className="ff-btn ff-btn-outline" style={{ padding: '0.35rem 1rem', fontSize: '0.85rem' }} onClick={onLogout}>
                        <i className="bi bi-box-arrow-right me-1"></i> Logout
                    </button>
                </div>

                {/* Mobile: hamburger toggle */}
                <button
                    className="d-md-none"
                    onClick={() => setMenuOpen(!menuOpen)}
                    style={{
                        background: 'none', border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: '6px', padding: '0.3rem 0.5rem', cursor: 'pointer',
                        color: 'var(--ff-text-secondary)', fontSize: '1.2rem', lineHeight: 1,
                    }}
                    aria-label="Toggle menu"
                >
                    <i className={`bi ${menuOpen ? 'bi-x-lg' : 'bi-list'}`}></i>
                </button>
            </div>

            {/* Mobile dropdown menu */}
            {menuOpen && (
                <div
                    className="d-md-none"
                    style={{
                        position: 'absolute', top: '100%', left: 0, right: 0,
                        background: 'var(--ff-bg-card)', borderBottom: '1px solid var(--ff-border)',
                        padding: '0.75rem 1rem',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                        zIndex: 1000, animation: 'ffSlideDown 0.2s ease-out',
                    }}
                >
                    <div style={{
                        color: 'var(--ff-text-secondary)', fontSize: '0.85rem', fontWeight: 500,
                        marginBottom: '0.6rem', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                        <i className="bi bi-person-circle me-2"></i>{user?.email}
                    </div>
                    <button
                        className="ff-btn ff-btn-outline w-100"
                        style={{ padding: '0.4rem', fontSize: '0.85rem' }}
                        onClick={() => { setMenuOpen(false); onLogout(); }}
                    >
                        <i className="bi bi-box-arrow-right me-1"></i> Logout
                    </button>
                </div>
            )}
        </nav>
    );
}
