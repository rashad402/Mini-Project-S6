import React from 'react';
import { Link } from 'react-router-dom';

export default function Navbar({ user, onLogout }) {
    return (
        <nav className="navbar navbar-expand-lg ff-navbar">
            <div className="container">
                <Link className="navbar-brand" to="/">Focus Flow</Link>
                <button className="navbar-toggler border-0" type="button" data-bs-toggle="collapse" data-bs-target="#navbarContent">
                    <span className="navbar-toggler-icon"></span>
                </button>
                <div className="collapse navbar-collapse" id="navbarContent">
                    <ul className="navbar-nav me-auto mb-2 mb-lg-0">
                        <li className="nav-item">
                            <span className="nav-link">
                                <span className="ff-badge ff-badge-primary" style={{ fontSize: '0.7rem' }}>{user?.role}</span>
                            </span>
                        </li>
                    </ul>
                    <div className="d-flex align-items-center gap-3">
                        <span style={{ color: 'var(--ff-text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>
                            <i className="bi bi-person-circle me-1"></i>
                            {user?.email}
                        </span>
                        <button className="ff-btn ff-btn-outline" style={{ padding: '0.35rem 1rem', fontSize: '0.85rem' }} onClick={onLogout}>
                            <i className="bi bi-box-arrow-right me-1"></i> Logout
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
}
