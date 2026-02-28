import React, { useState, useEffect } from 'react';
import api from '../api';
import { useNavigate, useParams } from 'react-router-dom';

export default function CreateExam() {
    const { examId } = useParams();
    const isEditMode = Boolean(examId);

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [durationMinutes, setDurationMinutes] = useState(60);
    const [published, setPublished] = useState(false);
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(isEditMode);
    const navigate = useNavigate();

    useEffect(() => {
        if (isEditMode) {
            api.get(`/api/exams/${examId}`)
                .then(res => {
                    const exam = res.data;
                    setTitle(exam.title);
                    setDescription(exam.description);
                    setDurationMinutes(exam.durationMinutes);
                    setPublished(exam.published);
                    setQuestions(exam.questions || []);
                    setLoading(false);
                })
                .catch(err => {
                    console.error('Error fetching exam:', err);
                    alert('Could not load exam for editing.');
                    navigate('/instructor-dashboard');
                });
        }
    }, [examId, navigate, isEditMode]);

    const addMCQ = () => {
        setQuestions([...questions, {
            type: 'MCQ',
            text: '',
            image: '',
            options: ['', '', '', ''],
            correctAnswer: '0',
            points: 1
        }]);
    };

    const addCoding = () => {
        setQuestions([...questions, {
            type: 'Coding',
            text: '',
            image: '',
            language: 'javascript',
            testCases: [{ input: '', expectedOutput: '' }],
            points: 5
        }]);
    };

    const updateQuestion = (index, field, value) => {
        const newQuestions = [...questions];
        newQuestions[index][field] = value;
        setQuestions(newQuestions);
    };

    const updateMCQOption = (qIndex, optIndex, value) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].options[optIndex] = value;
        setQuestions(newQuestions);
    };

    const updateTestCase = (qIndex, tcIndex, field, value) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].testCases[tcIndex][field] = value;
        setQuestions(newQuestions);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = { title, description, durationMinutes, published, questions };

            if (isEditMode) {
                await api.put(`/api/exams/${examId}`, payload);
                alert('Exam updated successfully!');
            } else {
                await api.post('/api/exams', payload);
                alert('Exam created successfully!');
            }
            navigate('/instructor-dashboard');
        } catch (err) {
            console.error('Error saving exam:', err);
            alert('Failed to save exam.');
        }
    };

    if (loading) return <div className="ff-spinner"></div>;

    return (
        <div className="container py-4 ff-animate-in" style={{ maxWidth: '900px' }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 style={{ fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '0.15rem' }}>
                        {isEditMode ? 'Edit Exam' : 'Create New Exam'}
                    </h2>
                    <p style={{ color: 'var(--ff-text-muted)', margin: 0, fontSize: '0.9rem' }}>
                        {isEditMode ? 'Update your exam details and questions' : 'Design a new exam with MCQ and coding questions'}
                    </p>
                </div>
            </div>
            <form onSubmit={handleSubmit}>
                {/* General Info */}
                <div className="ff-card mb-4" style={{ transform: 'none' }}>
                    <div className="card-header">
                        <h6 style={{ fontWeight: 700, margin: 0, color: 'var(--ff-text)' }}>
                            <i className="bi bi-info-circle me-2" style={{ color: 'var(--ff-primary-light)' }}></i>
                            General Info
                        </h6>
                    </div>
                    <div className="card-body">
                        <div style={{ marginBottom: '1rem' }}>
                            <label className="ff-label">Exam Title</label>
                            <input type="text" className="ff-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. JavaScript Fundamentals" required />
                        </div>
                        <div style={{ marginBottom: '1rem' }}>
                            <label className="ff-label">Description</label>
                            <textarea className="ff-input" rows="2" value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description of the exam..." style={{ resize: 'vertical' }}></textarea>
                        </div>
                        <div className="row g-3">
                            <div className="col-md-6">
                                <label className="ff-label">Duration (minutes)</label>
                                <input type="number" className="ff-input" value={durationMinutes} onChange={e => setDurationMinutes(Number(e.target.value))} required />
                            </div>
                            <div className="col-md-6 d-flex align-items-end" style={{ paddingBottom: '0.25rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', color: 'var(--ff-text)' }}>
                                    <input type="checkbox" checked={published} onChange={e => setPublished(e.target.checked)} style={{ accentColor: 'var(--ff-primary)', width: 18, height: 18 }} />
                                    <span style={{ fontWeight: 600 }}>Publish Immediately</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Questions */}
                <div style={{ marginBottom: '1rem' }}>
                    <h5 style={{ fontWeight: 700, color: 'var(--ff-text)', marginBottom: '1rem' }}>
                        <i className="bi bi-list-ol me-2" style={{ color: 'var(--ff-accent-light)' }}></i>
                        Questions ({questions.length})
                    </h5>
                    {questions.map((q, qIndex) => (
                        <div key={qIndex} className="ff-card mb-3" style={{ transform: 'none', borderLeft: `3px solid ${q.type === 'MCQ' ? 'var(--ff-primary)' : 'var(--ff-warning)'}` }}>
                            <div className="card-header d-flex justify-content-between align-items-center">
                                <span style={{ fontWeight: 700, color: 'var(--ff-text)', fontSize: '0.9rem' }}>
                                    <span className={`ff-badge ${q.type === 'MCQ' ? 'ff-badge-primary' : 'ff-badge-warning'}`} style={{ marginRight: '0.5rem' }}>{q.type}</span>
                                    Question {qIndex + 1}
                                </span>
                                <button type="button" className="ff-btn ff-btn-ghost" style={{ color: 'var(--ff-danger)', fontSize: '0.8rem' }} onClick={() => setQuestions(questions.filter((_, i) => i !== qIndex))}>
                                    <i className="bi bi-trash me-1"></i> Remove
                                </button>
                            </div>
                            <div className="card-body">
                                <div style={{ marginBottom: '0.75rem' }}>
                                    <label className="ff-label">Question Text</label>
                                    <textarea className="ff-input" value={q.text} onChange={e => updateQuestion(qIndex, 'text', e.target.value)} placeholder="Enter the question..." required></textarea>
                                </div>
                                <div style={{ marginBottom: '0.75rem' }}>
                                    <label className="ff-label"><i className="bi bi-image me-1"></i>Question Image (optional)</label>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <label
                                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.85rem', background: 'var(--ff-bg-elevated)', border: '1px solid var(--ff-border)', borderRadius: 'var(--ff-radius-sm)', cursor: 'pointer', color: 'var(--ff-text-secondary)', fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', transition: 'border-color 0.2s' }}
                                        >
                                            <i className="bi bi-upload"></i> Upload
                                            <input
                                                type="file"
                                                accept="image/*"
                                                style={{ display: 'none' }}
                                                onChange={e => {
                                                    const file = e.target.files[0];
                                                    if (!file) return;
                                                    if (file.size > 2 * 1024 * 1024) { alert('Image must be under 2MB'); return; }
                                                    const reader = new FileReader();
                                                    reader.onload = () => updateQuestion(qIndex, 'image', reader.result);
                                                    reader.readAsDataURL(file);
                                                }}
                                            />
                                        </label>
                                        <span style={{ color: 'var(--ff-text-muted)', fontSize: '0.8rem' }}>or</span>
                                        <input type="url" className="ff-input" style={{ flex: 1, margin: 0 }} value={q.image && !q.image.startsWith('data:') ? q.image : ''} onChange={e => updateQuestion(qIndex, 'image', e.target.value)} placeholder="Paste image URL" />
                                        {q.image && (
                                            <button type="button" className="ff-btn ff-btn-ghost" style={{ color: 'var(--ff-danger)', fontSize: '0.8rem', padding: '0.4rem 0.6rem' }} onClick={() => updateQuestion(qIndex, 'image', '')}>
                                                <i className="bi bi-x-lg"></i>
                                            </button>
                                        )}
                                    </div>
                                    {q.image && (
                                        <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'var(--ff-bg-elevated)', borderRadius: 'var(--ff-radius-sm)', textAlign: 'center' }}>
                                            <img src={q.image} alt="Preview" style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: '6px' }} onError={e => { e.target.style.display = 'none'; }} />
                                        </div>
                                    )}
                                </div>
                                <div style={{ marginBottom: '0.75rem' }}>
                                    <label className="ff-label">Points</label>
                                    <input type="number" className="ff-input" style={{ width: '120px' }} value={q.points} onChange={e => updateQuestion(qIndex, 'points', Number(e.target.value))} required />
                                </div>

                                {q.type === 'MCQ' && (
                                    <div className="row g-3" style={{ borderTop: '1px solid var(--ff-border)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                                        <div className="col-md-8">
                                            <label className="ff-label">Options</label>
                                            {q.options.map((opt, optIndex) => (
                                                <div key={optIndex} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                                    <span style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'var(--ff-bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', color: 'var(--ff-text-muted)', flexShrink: 0 }}>
                                                        {String.fromCharCode(65 + optIndex)}
                                                    </span>
                                                    <input type="text" className="ff-input" value={opt} onChange={e => updateMCQOption(qIndex, optIndex, e.target.value)} placeholder={`Option ${String.fromCharCode(65 + optIndex)}`} required />
                                                </div>
                                            ))}
                                        </div>
                                        <div className="col-md-4">
                                            <label className="ff-label">Correct Answer</label>
                                            <select className="ff-input" value={q.correctAnswer} onChange={e => updateQuestion(qIndex, 'correctAnswer', e.target.value)} style={{ cursor: 'pointer' }}>
                                                {q.options.map((_, idx) => (
                                                    <option key={idx} value={String(idx)}>Option {String.fromCharCode(65 + idx)}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                )}

                                {q.type === 'Coding' && (
                                    <div style={{ borderTop: '1px solid var(--ff-border)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                                        <div className="row g-3 mb-3">
                                            <div className="col-md-4">
                                                <label className="ff-label">Language</label>
                                                <select className="ff-input" value={q.language} onChange={e => updateQuestion(qIndex, 'language', e.target.value)} style={{ cursor: 'pointer' }}>
                                                    <option value="javascript">JavaScript (Node.js)</option>
                                                    <option value="python">Python</option>
                                                    <option value="c">C</option>
                                                    <option value="cpp">C++</option>
                                                    <option value="java">Java</option>
                                                </select>
                                            </div>
                                        </div>
                                        <label className="ff-label">Test Cases</label>
                                        {q.testCases.map((tc, tcIndex) => (
                                            <div key={tcIndex} className="row g-2 mb-2">
                                                <div className="col-md-5">
                                                    <input type="text" className="ff-input" placeholder="Input (stdin)" value={tc.input} onChange={e => updateTestCase(qIndex, tcIndex, 'input', e.target.value)} style={{ fontSize: '0.85rem', padding: '0.5rem 0.75rem' }} />
                                                </div>
                                                <div className="col-md-5">
                                                    <input type="text" className="ff-input" placeholder="Expected Output" value={tc.expectedOutput} onChange={e => updateTestCase(qIndex, tcIndex, 'expectedOutput', e.target.value)} style={{ fontSize: '0.85rem', padding: '0.5rem 0.75rem' }} />
                                                </div>
                                                <div className="col-md-2">
                                                    {tcIndex > 0 && <button type="button" className="ff-btn ff-btn-ghost w-100" style={{ color: 'var(--ff-danger)', fontSize: '0.8rem' }} onClick={() => {
                                                        const newQs = [...questions];
                                                        newQs[qIndex].testCases.splice(tcIndex, 1);
                                                        setQuestions(newQs);
                                                    }}>✕</button>}
                                                </div>
                                            </div>
                                        ))}
                                        <button type="button" className="ff-btn ff-btn-ghost" style={{ fontSize: '0.8rem', color: 'var(--ff-primary-light)' }} onClick={() => {
                                            const newQs = [...questions];
                                            newQs[qIndex].testCases.push({ input: '', expectedOutput: '' });
                                            setQuestions(newQs);
                                        }}>
                                            <i className="bi bi-plus-circle me-1"></i> Add Test Case
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', padding: '1.5rem', border: '1px dashed var(--ff-border)', borderRadius: 'var(--ff-radius)', background: 'var(--ff-bg-card)' }}>
                        <button type="button" className="ff-btn ff-btn-outline" onClick={addMCQ}>
                            <i className="bi bi-check2-square me-1"></i> Add MCQ
                        </button>
                        <button type="button" className="ff-btn ff-btn-outline" onClick={addCoding}>
                            <i className="bi bi-code-square me-1"></i> Add Coding
                        </button>
                    </div>
                </div>

                <div className="d-flex justify-content-end gap-2" style={{ marginTop: '1.5rem' }}>
                    <button type="button" className="ff-btn ff-btn-outline" onClick={() => navigate('/instructor-dashboard')}>Cancel</button>
                    <button type="submit" className="ff-btn ff-btn-primary" style={{ padding: '0.6rem 2rem' }}>
                        <i className="bi bi-check-lg me-1"></i> {isEditMode ? 'Update Exam' : 'Save Exam'}
                    </button>
                </div>
            </form>
        </div>
    );
}

