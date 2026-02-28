import React, { useState, useEffect } from 'react';
import api from '../api';
import { Link } from 'react-router-dom';
import {
    Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function StudentDashboard({ user }) {
    const [availableExams, setAvailableExams] = useState([]);
    const [analytics, setAnalytics] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [examsRes, analyticsRes] = await Promise.all([
                    api.get('/api/exams/available'),
                    api.get('/api/submissions/my-submissions')
                ]);
                setAvailableExams(examsRes.data);
                setAnalytics(analyticsRes.data);
            } catch (err) {
                console.error('Error fetching data for student dashboard', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const chartData = {
        labels: analytics.map(a => a.examTitle),
        datasets: [
            {
                label: 'Score %',
                data: analytics.map(a => a.percentage),
                backgroundColor: 'rgba(99, 102, 241, 0.5)',
                borderColor: '#818cf8',
                borderWidth: 2,
                borderRadius: 6,
                hoverBackgroundColor: 'rgba(99, 102, 241, 0.75)',
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: { display: false },
            title: { display: false },
            tooltip: {
                backgroundColor: '#1e293b',
                borderColor: '#334155',
                borderWidth: 1,
                titleColor: '#f1f5f9',
                bodyColor: '#94a3b8',
                cornerRadius: 8,
                padding: 12,
            }
        },
        scales: {
            y: {
                beginAtZero: true, max: 100,
                grid: { color: 'rgba(51, 65, 85, 0.5)' },
                ticks: { color: '#64748b', font: { weight: 600 } }
            },
            x: {
                grid: { display: false },
                ticks: { color: '#94a3b8', font: { weight: 500 } }
            }
        }
    };

    if (loading) return <div className="ff-spinner"></div>;

    const takenExamIds = new Set(analytics.map(a => String(a.examId)));
    const avgScore = analytics.length > 0 ? (analytics.reduce((s, a) => s + a.percentage, 0) / analytics.length).toFixed(0) : '—';

    return (
        <div className="container py-4 ff-animate-in">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 style={{ fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '0.15rem' }}>Student Dashboard</h2>
                    <p style={{ color: 'var(--ff-text-muted)', margin: 0, fontSize: '0.9rem' }}>Track your exams and performance</p>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="row g-3 mb-4">
                <div className="col-sm-4">
                    <div className="ff-stat-card primary">
                        <div className="stat-value" style={{ color: 'var(--ff-primary-light)' }}>{availableExams.length}</div>
                        <div className="stat-label">Available Exams</div>
                    </div>
                </div>
                <div className="col-sm-4">
                    <div className="ff-stat-card success">
                        <div className="stat-value" style={{ color: 'var(--ff-success)' }}>{analytics.length}</div>
                        <div className="stat-label">Completed</div>
                    </div>
                </div>
                <div className="col-sm-4">
                    <div className="ff-stat-card accent">
                        <div className="stat-value" style={{ color: 'var(--ff-accent-light)' }}>{avgScore}%</div>
                        <div className="stat-label">Average Score</div>
                    </div>
                </div>
            </div>

            {/* Available Exams */}
            <div className="ff-card mb-4">
                <div className="card-header d-flex justify-content-between align-items-center">
                    <h6 style={{ fontWeight: 700, margin: 0, color: 'var(--ff-text)' }}>
                        <i className="bi bi-journal-text me-2" style={{ color: 'var(--ff-primary-light)' }}></i>
                        Available Exams
                    </h6>
                    <span className="ff-badge ff-badge-primary">{availableExams.length} active</span>
                </div>
                <div>
                    {availableExams.length === 0 ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--ff-text-muted)' }}>
                            <i className="bi bi-inbox" style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}></i>
                            No exams available right now
                        </div>
                    ) : (
                        availableExams.map(exam => {
                            const alreadyTaken = takenExamIds.has(String(exam._id));
                            return (
                                <div key={exam._id} className="ff-list-item">
                                    <div>
                                        <div style={{ fontWeight: 600, color: 'var(--ff-text)', marginBottom: '0.15rem' }}>{exam.title}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--ff-text-muted)' }}>
                                            <i className="bi bi-clock me-1"></i>{exam.durationMinutes} min
                                            <span style={{ margin: '0 0.5rem', opacity: 0.3 }}>•</span>
                                            <i className="bi bi-list-check me-1"></i>{exam.questions?.length || 0} questions
                                        </div>
                                    </div>
                                    {alreadyTaken ? (
                                        <span className="ff-badge ff-badge-success"><i className="bi bi-check-circle me-1"></i> Completed</span>
                                    ) : (
                                        <Link to={`/exam/${exam._id}`} className="ff-btn ff-btn-primary" style={{ fontSize: '0.85rem', padding: '0.4rem 1.2rem' }}>
                                            <i className="bi bi-play-fill"></i> Start
                                        </Link>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Analytics Row */}
            <div className="row g-3">
                <div className="col-md-5">
                    <div className="ff-card h-100">
                        <div className="card-header">
                            <h6 style={{ fontWeight: 700, margin: 0, color: 'var(--ff-text)' }}>
                                <i className="bi bi-clock-history me-2" style={{ color: 'var(--ff-success)' }}></i>
                                Submission History
                            </h6>
                        </div>
                        <div>
                            {analytics.length === 0 ? (
                                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--ff-text-muted)' }}>
                                    <i className="bi bi-journal-x" style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}></i>
                                    No submissions yet
                                </div>
                            ) : (
                                analytics.map(sub => (
                                    <div key={sub._id} className="ff-list-item">
                                        <div>
                                            <div style={{ fontWeight: 600, color: 'var(--ff-text)', fontSize: '0.9rem' }}>{sub.examTitle}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--ff-text-muted)' }}>
                                                {new Date(sub.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </div>
                                        </div>
                                        <span className={`ff-badge ${sub.percentage >= 70 ? 'ff-badge-success' : sub.percentage >= 40 ? 'ff-badge-warning' : 'ff-badge-danger'}`}>
                                            {sub.score}/{sub.totalPoints} ({sub.percentage.toFixed(0)}%)
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <div className="col-md-7">
                    <div className="ff-card h-100">
                        <div className="card-header">
                            <h6 style={{ fontWeight: 700, margin: 0, color: 'var(--ff-text)' }}>
                                <i className="bi bi-bar-chart-line me-2" style={{ color: 'var(--ff-accent-light)' }}></i>
                                Performance Analytics
                            </h6>
                        </div>
                        <div className="card-body">
                            {analytics.length === 0 ? (
                                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--ff-text-muted)' }}>
                                    <i className="bi bi-graph-up" style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}></i>
                                    Complete an exam to view analytics
                                </div>
                            ) : (
                                <Bar data={chartData} options={chartOptions} />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
