import React, { useState, useEffect } from 'react';
import api from '../api';
import { Link } from 'react-router-dom';

export default function InstructorDashboard({ user }) {
    const [exams, setExams] = useState([]);
    const [submissions, setSubmissions] = useState([]);
    const [students, setStudents] = useState([]);
    const [detailedAnalytics, setDetailedAnalytics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [addEmail, setAddEmail] = useState('');
    const [addMsg, setAddMsg] = useState('');
    const [addError, setAddError] = useState('');
    const [activeTab, setActiveTab] = useState('analytics');
    const [expandedStudent, setExpandedStudent] = useState(null);
    const [resetRequests, setResetRequests] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [examsRes, subsRes, studentsRes, detailedRes, resetRes] = await Promise.all([
                    api.get('/api/exams'),
                    api.get('/api/submissions/instructor'),
                    api.get('/api/students'),
                    api.get('/api/submissions/instructor/detailed'),
                    api.get('/api/students/reset-requests')
                ]);
                setExams(examsRes.data);
                setSubmissions(subsRes.data);
                setStudents(studentsRes.data);
                setDetailedAnalytics(detailedRes.data);
                setResetRequests(resetRes.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleAddStudent = async (e) => {
        e.preventDefault();
        setAddMsg(''); setAddError('');
        try {
            const res = await api.post('/api/students/add', { email: addEmail });
            setAddMsg(res.data.message);
            setAddEmail('');
            const studentsRes = await api.get('/api/students');
            setStudents(studentsRes.data);
        } catch (err) {
            setAddError(err.response?.data?.message || 'Failed to add student.');
        }
    };

    const handleDeleteExam = async (examId, title) => {
        if (!window.confirm(`Delete "${title}"? This will also remove all submissions and proctor logs for this exam.`)) return;
        try {
            await api.delete(`/api/exams/${examId}`);
            setExams(prev => prev.filter(e => e._id !== examId));
            setSubmissions(prev => prev.filter(s => s.examId !== examId));
            // Refresh analytics
            const detailedRes = await api.get('/api/submissions/instructor/detailed');
            setDetailedAnalytics(detailedRes.data);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to delete exam.');
        }
    };

    const handleDeleteStudent = async (studentId, email) => {
        if (!window.confirm(`Remove "${email}"? This will delete all their submissions and proctor logs.`)) return;
        try {
            await api.delete(`/api/students/${studentId}`);
            setStudents(prev => prev.filter(s => s._id !== studentId));
            // Refresh analytics
            const detailedRes = await api.get('/api/submissions/instructor/detailed');
            setDetailedAnalytics(detailedRes.data);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to delete student.');
        }
    };

    if (loading) return <div className="ff-spinner"></div>;

    const activeExamsCount = exams.filter(e => e.published).length;
    const avgScore = submissions.length > 0 ? (submissions.reduce((s, sub) => s + sub.percentage, 0) / submissions.length).toFixed(0) : '—';

    const tabs = [
        { key: 'analytics', label: 'Student Analytics', icon: 'bi-bar-chart-line' },
        { key: 'exams', label: 'Manage Exams', icon: 'bi-collection' },
        { key: 'students', label: 'Manage Students', icon: 'bi-people' }
    ];

    return (
        <div className="container py-4 ff-animate-in">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 style={{ fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '0.15rem' }}>Instructor Dashboard</h2>
                    <p style={{ color: 'var(--ff-text-muted)', margin: 0, fontSize: '0.9rem' }}>Manage exams, students, and monitor performance</p>
                </div>
                <Link to="/create-exam" className="ff-btn ff-btn-primary">
                    <i className="bi bi-plus-lg"></i> Create Exam
                </Link>
            </div>

            {/* Stat Cards */}
            <div className="row g-3 mb-4">
                <div className="col-sm-3">
                    <div className="ff-stat-card primary">
                        <div className="stat-value" style={{ color: 'var(--ff-primary-light)' }}>{activeExamsCount}</div>
                        <div className="stat-label">Published</div>
                    </div>
                </div>
                <div className="col-sm-3">
                    <div className="ff-stat-card accent">
                        <div className="stat-value" style={{ color: 'var(--ff-accent-light)' }}>{exams.length}</div>
                        <div className="stat-label">Total Exams</div>
                    </div>
                </div>
                <div className="col-sm-3">
                    <div className="ff-stat-card success">
                        <div className="stat-value" style={{ color: 'var(--ff-success)' }}>{students.length}</div>
                        <div className="stat-label">Students</div>
                    </div>
                </div>
                <div className="col-sm-3">
                    <div className="ff-stat-card danger">
                        <div className="stat-value" style={{ color: 'var(--ff-warning)' }}>{avgScore}%</div>
                        <div className="stat-label">Avg. Score</div>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem', background: 'var(--ff-bg-card)', borderRadius: 'var(--ff-radius)', padding: '0.3rem', border: '1px solid var(--ff-border)' }}>
                {tabs.map(t => (
                    <button
                        key={t.key}
                        className={`ff-btn ${activeTab === t.key ? 'ff-btn-primary' : 'ff-btn-ghost'}`}
                        style={{ flex: 1, borderRadius: 'var(--ff-radius-sm)', fontSize: '0.85rem' }}
                        onClick={() => setActiveTab(t.key)}
                    >
                        <i className={`bi ${t.icon} me-1`}></i> {t.label}
                    </button>
                ))}
            </div>

            {/* ===================== STUDENT ANALYTICS TAB ===================== */}
            {activeTab === 'analytics' && (
                <div className="ff-card" style={{ transform: 'none' }}>
                    <div className="card-header d-flex justify-content-between align-items-center">
                        <h6 style={{ fontWeight: 700, margin: 0, color: 'var(--ff-text)' }}>
                            <i className="bi bi-bar-chart-line me-2" style={{ color: 'var(--ff-primary-light)' }}></i>
                            Per-Student Analytics
                        </h6>
                        <span className="ff-badge ff-badge-primary">{detailedAnalytics.length} students</span>
                    </div>
                    <div style={{ padding: 0 }}>
                        {detailedAnalytics.length === 0 ? (
                            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--ff-text-muted)' }}>
                                <i className="bi bi-graph-up" style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}></i>
                                No student data yet. Students need to take exams first.
                            </div>
                        ) : (
                            detailedAnalytics.map(s => (
                                <div key={s.email}>
                                    {/* Student Summary Row */}
                                    <div
                                        className="ff-list-item"
                                        style={{ cursor: 'pointer', gap: '1rem' }}
                                        onClick={() => setExpandedStudent(expandedStudent === s.email ? null : s.email)}
                                    >
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600, color: 'var(--ff-text)', marginBottom: '0.2rem', fontSize: '0.95rem' }}>
                                                <i className="bi bi-person-circle me-2" style={{ color: 'var(--ff-primary-light)' }}></i>
                                                {s.email}
                                            </div>
                                            <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8rem', flexWrap: 'wrap' }}>
                                                <span style={{ color: 'var(--ff-text-muted)' }}>
                                                    <i className="bi bi-journal-check me-1"></i>{s.totalExams} exams
                                                </span>
                                                <span style={{ color: 'var(--ff-accent-light)' }}>
                                                    <i className="bi bi-graph-up-arrow me-1"></i>Avg: {s.avgScore}%
                                                </span>
                                                <span style={{ color: 'var(--ff-success)' }}>
                                                    <i className="bi bi-trophy me-1"></i>Best: {s.bestExam} ({s.bestScore}%)
                                                </span>
                                                <span style={{ color: 'var(--ff-danger)' }}>
                                                    <i className="bi bi-arrow-down-circle me-1"></i>Worst: {s.worstExam} ({s.worstScore}%)
                                                </span>
                                                {s.proctorViolations > 0 && (
                                                    <span className="ff-badge ff-badge-danger">
                                                        <i className="bi bi-exclamation-triangle me-1"></i>{s.proctorViolations} violation(s)
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <i className={`bi ${expandedStudent === s.email ? 'bi-chevron-up' : 'bi-chevron-down'}`} style={{ color: 'var(--ff-text-muted)', fontSize: '1.1rem' }}></i>
                                        </div>
                                    </div>

                                    {/* Expanded Exam Details */}
                                    {expandedStudent === s.email && (
                                        <div style={{ background: 'var(--ff-bg)', padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--ff-border)' }}>
                                            <table className="table mb-0 ff-table" style={{ fontSize: '0.85rem' }}>
                                                <thead>
                                                    <tr>
                                                        <th>Exam</th>
                                                        <th>Score</th>
                                                        <th>Percentage</th>
                                                        <th>Proctoring</th>
                                                        <th>Submitted</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {s.submissions.map(sub => (
                                                        <tr key={sub._id}>
                                                            <td style={{ fontWeight: 600 }}>{sub.examTitle}</td>
                                                            <td>{sub.score}/{sub.totalPoints}</td>
                                                            <td>
                                                                <span className={`ff-badge ${sub.percentage >= 70 ? 'ff-badge-success' : sub.percentage >= 40 ? 'ff-badge-warning' : 'ff-badge-danger'}`}>
                                                                    {sub.percentage}%
                                                                </span>
                                                            </td>
                                                            <td>
                                                                {sub.terminatedByProctor ? (
                                                                    <span className="ff-badge ff-badge-danger"><i className="bi bi-x-circle me-1"></i>Terminated</span>
                                                                ) : (
                                                                    <span className="ff-badge ff-badge-success"><i className="bi bi-check-circle me-1"></i>Clean</span>
                                                                )}
                                                            </td>
                                                            <td style={{ color: 'var(--ff-text-muted)' }}>
                                                                {new Date(sub.submittedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* ===================== MANAGE EXAMS TAB ===================== */}
            {activeTab === 'exams' && (
                <div className="ff-card" style={{ transform: 'none' }}>
                    <div className="card-header d-flex justify-content-between align-items-center">
                        <h6 style={{ fontWeight: 700, margin: 0, color: 'var(--ff-text)' }}>
                            <i className="bi bi-collection me-2" style={{ color: 'var(--ff-primary-light)' }}></i>
                            Manage Exams
                        </h6>
                        <span className="ff-badge ff-badge-primary">{exams.length} total</span>
                    </div>
                    <div style={{ padding: 0 }}>
                        {exams.length === 0 ? (
                            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--ff-text-muted)' }}>
                                <i className="bi bi-journal-plus" style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}></i>
                                No exams created yet.
                                <Link to="/create-exam" style={{ display: 'block', marginTop: '0.5rem', color: 'var(--ff-primary-light)', textDecoration: 'none' }}>Create your first exam →</Link>
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <table className="table mb-0 ff-table">
                                    <thead>
                                        <tr>
                                            <th style={{ paddingLeft: '1.25rem' }}>Title</th>
                                            <th>Status</th>
                                            <th>Duration</th>
                                            <th>Questions</th>
                                            <th style={{ textAlign: 'right', paddingRight: '1.25rem' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {exams.map(exam => (
                                            <tr key={exam._id}>
                                                <td style={{ paddingLeft: '1.25rem', fontWeight: 600 }}>{exam.title}</td>
                                                <td>
                                                    <span className={`ff-badge ${exam.published ? 'ff-badge-success' : 'ff-badge-muted'}`}>
                                                        {exam.published ? '● Published' : '○ Draft'}
                                                    </span>
                                                </td>
                                                <td style={{ color: 'var(--ff-text-secondary)' }}>{exam.durationMinutes} min</td>
                                                <td style={{ color: 'var(--ff-text-secondary)' }}>{exam.questions?.length || 0}</td>
                                                <td style={{ textAlign: 'right', paddingRight: '1.25rem' }}>
                                                    <Link to={`/edit-exam/${exam._id}`} className="ff-btn ff-btn-ghost" style={{ fontSize: '0.85rem' }}>
                                                        <i className="bi bi-pencil-square me-1"></i> Edit
                                                    </Link>
                                                    <button
                                                        className="ff-btn ff-btn-ghost ms-1"
                                                        style={{ fontSize: '0.85rem', color: 'var(--ff-danger)' }}
                                                        onClick={() => handleDeleteExam(exam._id, exam.title)}
                                                    >
                                                        <i className="bi bi-trash me-1"></i> Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ===================== MANAGE STUDENTS TAB ===================== */}
            {activeTab === 'students' && (
                <div>
                    {/* Add Student Form */}
                    <div className="ff-card mb-4" style={{ transform: 'none' }}>
                        <div className="card-header">
                            <h6 style={{ fontWeight: 700, margin: 0, color: 'var(--ff-text)' }}>
                                <i className="bi bi-person-plus me-2" style={{ color: 'var(--ff-accent-light)' }}></i>
                                Add Student
                            </h6>
                        </div>
                        <div className="card-body">
                            <form onSubmit={handleAddStudent}>
                                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
                                    <div style={{ flex: 1 }}>
                                        <label className="ff-label">Student Email</label>
                                        <input
                                            type="email"
                                            className="ff-input"
                                            placeholder="student@example.com"
                                            value={addEmail}
                                            onChange={e => setAddEmail(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <button type="submit" className="ff-btn ff-btn-accent" style={{ whiteSpace: 'nowrap' }}>
                                        <i className="bi bi-plus-lg me-1"></i> Add Student
                                    </button>
                                </div>
                                <p style={{ fontSize: '0.8rem', color: 'var(--ff-text-muted)', marginTop: '0.5rem', marginBottom: 0 }}>
                                    <i className="bi bi-info-circle me-1"></i>
                                    Default password: <code style={{ color: 'var(--ff-primary-light)' }}>password123</code> — student will be asked to change it on first login.
                                </p>
                                {addMsg && <p style={{ color: 'var(--ff-success)', marginTop: '0.5rem', marginBottom: 0, fontSize: '0.85rem' }}><i className="bi bi-check-circle me-1"></i>{addMsg}</p>}
                                {addError && <p style={{ color: 'var(--ff-danger)', marginTop: '0.5rem', marginBottom: 0, fontSize: '0.85rem' }}><i className="bi bi-exclamation-circle me-1"></i>{addError}</p>}
                            </form>
                        </div>
                    </div>

                    {/* Password Reset Requests */}
                    {resetRequests.length > 0 && (
                        <div className="ff-card mb-4" style={{ transform: 'none' }}>
                            <div className="card-header d-flex justify-content-between align-items-center">
                                <h6 style={{ fontWeight: 700, margin: 0, color: 'var(--ff-text)' }}>
                                    <i className="bi bi-key me-2" style={{ color: 'var(--ff-warning)' }}></i>
                                    Password Reset Requests
                                </h6>
                                <span className="ff-badge ff-badge-warning">{resetRequests.length} pending</span>
                            </div>
                            <div style={{ padding: 0 }}>
                                {resetRequests.map(req => (
                                    <div key={req._id} className="ff-list-item" style={{ justifyContent: 'space-between', gap: '1rem' }}>
                                        <div>
                                            <div style={{ fontWeight: 600, color: 'var(--ff-text)', fontSize: '0.95rem' }}>
                                                <i className="bi bi-person-exclamation me-2" style={{ color: 'var(--ff-warning)' }}></i>
                                                {req.student?.email || 'Unknown'}
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--ff-text-muted)', marginTop: '0.15rem' }}>
                                                Requested {new Date(req.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button
                                                className="ff-btn ff-btn-ghost"
                                                style={{ color: 'var(--ff-success)', fontSize: '0.85rem' }}
                                                onClick={async () => {
                                                    try {
                                                        await api.post(`/api/students/reset-requests/${req._id}/approve`, {});
                                                        setResetRequests(prev => prev.filter(r => r._id !== req._id));
                                                    } catch (err) { alert(err.response?.data?.message || 'Error'); }
                                                }}
                                            >
                                                <i className="bi bi-check-lg me-1"></i> Approve
                                            </button>
                                            <button
                                                className="ff-btn ff-btn-ghost"
                                                style={{ color: 'var(--ff-danger)', fontSize: '0.85rem' }}
                                                onClick={async () => {
                                                    try {
                                                        await api.post(`/api/students/reset-requests/${req._id}/reject`, {});
                                                        setResetRequests(prev => prev.filter(r => r._id !== req._id));
                                                    } catch (err) { alert(err.response?.data?.message || 'Error'); }
                                                }}
                                            >
                                                <i className="bi bi-x-lg me-1"></i> Reject
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Students List */}
                    <div className="ff-card" style={{ transform: 'none' }}>
                        <div className="card-header d-flex justify-content-between align-items-center">
                            <h6 style={{ fontWeight: 700, margin: 0, color: 'var(--ff-text)' }}>
                                <i className="bi bi-people me-2" style={{ color: 'var(--ff-success)' }}></i>
                                Enrolled Students
                            </h6>
                            <span className="ff-badge ff-badge-success">{students.length} students</span>
                        </div>
                        <div style={{ padding: 0 }}>
                            {students.length === 0 ? (
                                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--ff-text-muted)' }}>
                                    <i className="bi bi-person-x" style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}></i>
                                    No students enrolled yet. Add one above.
                                </div>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table mb-0 ff-table">
                                        <thead>
                                            <tr>
                                                <th style={{ paddingLeft: '1.25rem' }}>Email</th>
                                                <th>Status</th>
                                                <th>Joined</th>
                                                <th style={{ textAlign: 'right', paddingRight: '1.25rem' }}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {students.map(s => (
                                                <tr key={s._id}>
                                                    <td style={{ paddingLeft: '1.25rem', fontWeight: 600 }}>
                                                        <i className="bi bi-person me-2" style={{ color: 'var(--ff-primary-light)' }}></i>
                                                        {s.email}
                                                    </td>
                                                    <td>
                                                        {s.mustChangePassword ? (
                                                            <span className="ff-badge ff-badge-warning"><i className="bi bi-clock me-1"></i>Pending</span>
                                                        ) : (
                                                            <span className="ff-badge ff-badge-success"><i className="bi bi-check-circle me-1"></i>Active</span>
                                                        )}
                                                    </td>
                                                    <td style={{ color: 'var(--ff-text-muted)', fontSize: '0.85rem' }}>
                                                        {new Date(s.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </td>
                                                    <td style={{ textAlign: 'right', paddingRight: '1.25rem' }}>
                                                        <button
                                                            className="ff-btn ff-btn-ghost"
                                                            style={{ fontSize: '0.85rem', color: 'var(--ff-danger)' }}
                                                            onClick={() => handleDeleteStudent(s._id, s.email)}
                                                        >
                                                            <i className="bi bi-trash me-1"></i> Remove
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
