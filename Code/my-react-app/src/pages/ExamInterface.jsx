import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import Editor from '@monaco-editor/react';
import { FaceDetector, ObjectDetector, FilesetResolver } from '@mediapipe/tasks-vision';

export default function ExamInterface({ user }) {
    const { examId } = useParams();
    const navigate = useNavigate();
    const [exam, setExam] = useState(null);
    const [answers, setAnswers] = useState({});
    const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
    const [output, setOutput] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [timeLeft, setTimeLeft] = useState(null); // in seconds
    const timeLeftRef = useRef(null);
    const timerIdRef = useRef(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    // Proctoring states
    const videoRef = useRef(null);
    const [proctorStatus, setProctorStatus] = useState('Initializing...');
    const detectorRef = useRef(null);
    const objDetectorRef = useRef(null);
    const streamRef = useRef(null);
    const lastFlagTimeRef = useRef(0);

    const [violations, setViolations] = useState(0);
    const violationsRef = useRef(0);
    const submittingRef = useRef(false);

    // Load Exam
    useEffect(() => {
        const loadExam = async () => {
            try {
                // Check if already submitted
                const subsRes = await api.get('/api/submissions/my-submissions');
                const alreadySubmitted = subsRes.data.some(s => String(s.examId) === String(examId));
                if (alreadySubmitted) {
                    alert('You have already submitted this exam.');
                    navigate('/student-dashboard');
                    return;
                }

                const res = await api.get(`/api/exams/${examId}`);
                setExam(res.data);
                const totalSeconds = (res.data.durationMinutes || 60) * 60;
                setTimeLeft(totalSeconds);
                timeLeftRef.current = totalSeconds;
            } catch (err) {
                console.error(err);
                alert('Exam not found or unavailable.');
                navigate('/');
            }
        };
        loadExam();
    }, [examId, navigate]);

    // Countdown Timer
    useEffect(() => {
        if (timeLeft === null || timeLeft <= 0) return;

        const timerId = setInterval(() => {
            setTimeLeft(prev => {
                const next = prev - 1;
                timeLeftRef.current = next;
                if (next <= 0) {
                    clearInterval(timerId);
                    timerIdRef.current = null;
                    submittingRef.current = true; // Guard before any alert
                    alert('⏰ Time is up! Your exam is being auto-submitted.');
                    timeUpSubmit();
                    return 0;
                }
                return next;
            });
        }, 1000);
        timerIdRef.current = timerId;

        return () => { clearInterval(timerId); timerIdRef.current = null; };
    }, [exam]); // only start once exam is loaded

    const formatTime = (seconds) => {
        if (seconds === null) return '--:--';
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // Proctoring Setup
    useEffect(() => {
        let loopId;
        let isTerminated = false;

        const handleViolation = (flagType, details) => {
            if (isTerminated) return;
            reportFlag(flagType, details);

            const newCount = violationsRef.current + 1;
            violationsRef.current = newCount;
            setViolations(newCount);

            if (newCount > 3) {
                isTerminated = true;
                submittingRef.current = true; // Guard before alert
                alert("The test has been terminated due to proctoring violation");
                forceSubmitExam();
            }
        };

        const initProctoring = async () => {
            try {
                // Request Camera
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    streamRef.current = stream;
                }

                // Initialize Vision WASM runtime
                const vision = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
                );

                // --- Load Face Detector (required) ---
                const faceDetector = await FaceDetector.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite`,
                        delegate: "GPU"
                    },
                    runningMode: "VIDEO"
                });
                detectorRef.current = faceDetector;

                // --- Load Object Detector (optional — face detection works without it) ---
                try {
                    const objectDetector = await ObjectDetector.createFromOptions(vision, {
                        baseOptions: {
                            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/int8/1/efficientdet_lite0.tflite`,
                            delegate: "GPU"
                        },
                        scoreThreshold: 0.5,
                        runningMode: "VIDEO"
                    });
                    objDetectorRef.current = objectDetector;
                    console.log("ObjectDetector loaded successfully.");
                } catch (objErr) {
                    console.warn("ObjectDetector failed to load — phone detection disabled:", objErr);
                    objDetectorRef.current = null;
                }

                setProctorStatus('Active & Monitoring');

                // --- Detection Loop ---
                let lastFaceTimestamp = 0;
                let lastObjTimestamp = 0;

                const detectionLoop = () => {
                    if (isTerminated) return;

                    if (videoRef.current && videoRef.current.readyState >= 2 && detectorRef.current) {
                        const now = Date.now();

                        // Run detection every ~1 second
                        if (now - lastFaceTimestamp >= 1000) {
                            try {
                                const ts = performance.now();

                                // Face Detection
                                const faceResult = detectorRef.current.detectForVideo(videoRef.current, ts);
                                const numFaces = faceResult.detections.length;
                                lastFaceTimestamp = now;

                                // Object Detection (separate timestamp to avoid conflicts)
                                let hasPhone = false;
                                if (objDetectorRef.current) {
                                    try {
                                        const objResult = objDetectorRef.current.detectForVideo(videoRef.current, ts + 1);
                                        hasPhone = objResult.detections.some(d =>
                                            d.categories.some(c => c.categoryName === 'cell phone')
                                        );
                                        lastObjTimestamp = now;
                                    } catch (objErr) {
                                        console.warn("Object detection frame error:", objErr);
                                    }
                                }

                                // Visual Feedback
                                if (hasPhone) {
                                    setProctorStatus('⚠️ Cell Phone Detected!');
                                } else if (numFaces === 0) {
                                    setProctorStatus('⚠️ No Face Detected');
                                } else if (numFaces > 1) {
                                    setProctorStatus('⚠️ Multiple Faces Detected');
                                } else {
                                    setProctorStatus('Active & Monitoring');
                                }

                                // Backend Throttling (1 flag per 5 seconds)
                                if (now - lastFlagTimeRef.current > 5000) {
                                    if (hasPhone) {
                                        handleViolation('PhoneDetected', 'Cell phone detected in webcam frame');
                                        lastFlagTimeRef.current = now;
                                    } else if (numFaces === 0) {
                                        handleViolation('FaceNotDetected', 'No face detected in webcam');
                                        lastFlagTimeRef.current = now;
                                    } else if (numFaces > 1) {
                                        handleViolation('MultipleFaces', `${numFaces} faces detected in webcam`);
                                        lastFlagTimeRef.current = now;
                                    }
                                }
                            } catch (detectErr) {
                                console.error("Detection frame error:", detectErr);
                            }
                        }
                    }

                    if (!isTerminated) {
                        loopId = setTimeout(detectionLoop, 300);
                    }
                };
                detectionLoop();

            } catch (err) {
                console.error("Proctoring init failed: ", err);
                setProctorStatus('Failed to access camera');
            }
        };

        if (exam) {
            initProctoring();

            // Enter fullscreen mode
            let hasEnteredFullscreen = false;

            const handleFullscreenChange = () => {
                if (document.fullscreenElement) {
                    // Fullscreen was entered successfully
                    hasEnteredFullscreen = true;
                } else if (hasEnteredFullscreen && !isTerminated && !submittingRef.current) {
                    // Fullscreen was exited after being active — terminate
                    isTerminated = true;
                    reportFlag('FullscreenExit', 'Student exited fullscreen mode — exam terminated');
                    alert('The test has been terminated because you exited fullscreen mode.');
                    forceSubmitExam();
                }
            };
            document.addEventListener('fullscreenchange', handleFullscreenChange);

            // Request fullscreen
            const el = document.documentElement;
            if (el.requestFullscreen) {
                el.requestFullscreen().catch(() => {
                    console.warn('Fullscreen request denied — skipping enforcement');
                });
            }

            // Tab Switching Detection (visibility API)
            const handleVisibilityChange = () => {
                if (document.hidden && !isTerminated && !submittingRef.current) {
                    handleViolation('TabSwitched', 'User switched tabs or minimized browser');
                }
            };
            document.addEventListener('visibilitychange', handleVisibilityChange);

            // Window blur detection (catches Alt+Tab, clicking outside)
            const handleWindowBlur = () => {
                if (!isTerminated && !submittingRef.current) {
                    handleViolation('TabSwitched', 'Window lost focus — possible tab switch or Alt+Tab');
                }
            };
            window.addEventListener('blur', handleWindowBlur);

            return () => {
                isTerminated = true;
                if (loopId) window.clearTimeout(loopId);
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                    streamRef.current = null;
                }
                if (detectorRef.current) { try { detectorRef.current.close(); } catch (e) { } }
                if (objDetectorRef.current) { try { objDetectorRef.current.close(); } catch (e) { } }
                document.removeEventListener('visibilitychange', handleVisibilityChange);
                document.removeEventListener('fullscreenchange', handleFullscreenChange);
                window.removeEventListener('blur', handleWindowBlur);
                if (document.fullscreenElement) document.exitFullscreen().catch(() => { });
            };
        }
    }, [examId, exam]);

    const reportFlag = async (flagType, details) => {
        try {
            await api.post('/api/proctor/flag', {
                examId, flagType, details
            });
            console.warn(`Proctor Flag: ${flagType}`);
        } catch (err) {
            console.error('Failed to report flag', err);
        }
    };

    const answersRef = useRef({});

    const handleAnswerChange = (val) => {
        setAnswers(prev => {
            const next = { ...prev, [currentQuestionIdx]: val };
            answersRef.current = next; // Sync to ref for safe access during unmount/submit
            return next;
        });
    };

    const runCode = async () => {
        const q = exam.questions[currentQuestionIdx];
        const code = answers[currentQuestionIdx] || '';
        setIsRunning(true);
        setOutput('Executing...');

        try {
            const res = await api.post('/api/compile/execute', {
                code,
                language: q.language
            });

            if (res.data.success) {
                setOutput(res.data.output || 'No output.');
            } else {
                setOutput(res.data.error || 'Execution failed.');
            }
        } catch (err) {
            console.error('Code execution error:', err);
            const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'Server error during execution.';
            setOutput(`Error: ${msg}`);
        } finally {
            setIsRunning(false);
        }
    };

    const submitData = async (answersData, terminated = false) => {
        // Double-submit guard
        if (submitData._inProgress) return;
        submitData._inProgress = true;

        const formattedAnswers = Object.keys(answersData).map(key => ({
            questionId: exam.questions[key]._id,
            answer: answersData[key]
        }));

        // Clear the timer so it doesn't fire after we leave
        if (timerIdRef.current) {
            clearInterval(timerIdRef.current);
            timerIdRef.current = null;
        }

        // Stop webcam before navigating
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        try {
            await api.post('/api/submissions', {
                examId, answers: formattedAnswers, terminatedByProctor: terminated
            });
        } catch (err) {
            console.error('Failed to submit exam details.', err);
        } finally {
            navigate('/student-dashboard');
        }
    };

    const forceSubmitExam = async () => {
        submittingRef.current = true;
        await submitData(answersRef.current, true);
    };

    const timeUpSubmit = async () => {
        submittingRef.current = true;
        await submitData(answersRef.current, false);
    };

    const submitExam = () => {
        // Show in-page confirm modal instead of window.confirm (which exits fullscreen)
        setShowConfirmModal(true);
    };

    const confirmSubmit = async () => {
        setShowConfirmModal(false);
        submittingRef.current = true;
        await submitData(answersRef.current, false);
    };

    const cancelSubmit = () => {
        setShowConfirmModal(false);
    };

    if (!exam) return <div className="ff-spinner"></div>;

    const currentQ = exam.questions[currentQuestionIdx];

    return (
        <div className="container-fluid py-3" style={{ minHeight: '100vh', background: 'var(--ff-bg)' }}>
            {/* In-page Submit Confirmation Modal */}
            {showConfirmModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
                }}>
                    <div style={{
                        background: 'var(--ff-bg-card)', border: '1px solid var(--ff-border)',
                        borderRadius: 'var(--ff-radius-lg)', padding: '2rem', maxWidth: '420px', width: '90%',
                        boxShadow: '0 8px 40px rgba(0,0,0,0.4)', textAlign: 'center'
                    }}>
                        <i className="bi bi-exclamation-triangle" style={{ fontSize: '2.5rem', color: '#f59e0b', display: 'block', marginBottom: '1rem' }}></i>
                        <h5 style={{ color: 'var(--ff-text)', fontWeight: 700, marginBottom: '0.5rem' }}>Submit Exam?</h5>
                        <p style={{ color: 'var(--ff-text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                            Are you sure you want to submit? You cannot undo this action.
                        </p>
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                            <button className="ff-btn ff-btn-outline" onClick={cancelSubmit} style={{ minWidth: '100px' }}>
                                Cancel
                            </button>
                            <button className="ff-btn ff-btn-danger" onClick={confirmSubmit} style={{ minWidth: '100px' }}>
                                <i className="bi bi-send me-1"></i> Submit
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <div className="row g-3">
                {/* Main Content */}
                <div className="col-md-9">
                    <div className="ff-card h-100 d-flex flex-column" style={{ transform: 'none' }}>
                        {/* Header */}
                        <div className="card-header d-flex justify-content-between align-items-center" style={{ padding: '0.85rem 1.25rem' }}>
                            <h6 style={{ fontWeight: 700, margin: 0, color: 'var(--ff-text)', fontSize: '0.95rem' }}>
                                {exam.title}
                                <span style={{ color: 'var(--ff-text-muted)', fontWeight: 400, marginLeft: '0.5rem' }}>
                                    — Q{currentQuestionIdx + 1}/{exam.questions.length}
                                </span>
                            </h6>
                            <span className={`ff-timer ${timeLeft !== null && timeLeft <= 60 ? 'urgent' : 'normal'}`}>
                                <i className="bi bi-stopwatch me-1"></i> {formatTime(timeLeft)}
                            </span>
                        </div>

                        {/* Question */}
                        <div className="card-body d-flex flex-column flex-grow-1">
                            <div style={{ marginBottom: '1.25rem' }}>
                                <span className={`ff-badge ${currentQ.type === 'MCQ' ? 'ff-badge-primary' : 'ff-badge-warning'}`} style={{ marginBottom: '0.75rem', display: 'inline-block' }}>
                                    {currentQ.type === 'MCQ' ? 'Multiple Choice' : 'Coding'} — {currentQ.points} pts
                                </span>
                                <h5 style={{ fontWeight: 600, color: 'var(--ff-text)', lineHeight: 1.5, marginTop: '0.5rem' }}>
                                    {currentQ.text}
                                </h5>
                                {currentQ.image && (
                                    <div style={{ marginTop: '0.75rem', textAlign: 'center', padding: '0.5rem', background: 'var(--ff-bg-elevated)', borderRadius: 'var(--ff-radius-sm)' }}>
                                        <img
                                            src={currentQ.image}
                                            alt="Question"
                                            style={{ maxWidth: '100%', maxHeight: '250px', borderRadius: '8px', objectFit: 'contain' }}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* MCQ Options */}
                            {currentQ.type === 'MCQ' && (
                                <div className="flex-grow-1 ff-radio-group">
                                    {currentQ.options.map((opt, idx) => (
                                        <label
                                            key={idx}
                                            className={`ff-radio-option ${answers[currentQuestionIdx] === String(idx) ? 'selected' : ''}`}
                                        >
                                            <input
                                                type="radio"
                                                name="mcqAnswer"
                                                checked={answers[currentQuestionIdx] === String(idx)}
                                                onChange={() => handleAnswerChange(String(idx))}
                                            />
                                            <span style={{ color: 'var(--ff-text)', fontSize: '0.95rem' }}>
                                                <strong style={{ color: 'var(--ff-text-muted)', marginRight: '0.5rem' }}>{String.fromCharCode(65 + idx)}.</strong>
                                                {opt}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            )}

                            {/* Coding Editor */}
                            {currentQ.type === 'Coding' && (
                                <div className="flex-grow-1 d-flex flex-column">
                                    <div className="d-flex justify-content-between align-items-center" style={{ marginBottom: '0.5rem' }}>
                                        <span className="ff-badge ff-badge-muted" style={{ textTransform: 'uppercase' }}>
                                            <i className="bi bi-code-slash me-1"></i>{currentQ.language || 'javascript'}
                                        </span>
                                        {currentQ.testCases && currentQ.testCases.length > 0 && (
                                            <span style={{ fontSize: '0.8rem', color: 'var(--ff-text-muted)' }}>
                                                <i className="bi bi-check2-all me-1"></i>{currentQ.testCases.length} test case(s) evaluated on submit
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ borderRadius: 'var(--ff-radius-sm)', overflow: 'hidden', flex: 1, minHeight: '300px', border: '1px solid var(--ff-border)' }}>
                                        <Editor
                                            height="100%"
                                            language={{ python: 'python', c: 'c', cpp: 'cpp', java: 'java' }[currentQ.language] || 'javascript'}
                                            theme="vs-dark"
                                            value={answers[currentQuestionIdx] || { python: '# Write your answer here...\n', c: '#include <stdio.h>\n\nint main() {\n    // Write your answer here...\n    return 0;\n}\n', cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your answer here...\n    return 0;\n}\n', java: 'import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        // Write your answer here...\n    }\n}\n' }[currentQ.language] || '// Write your answer here...\n'}
                                            onChange={val => handleAnswerChange(val)}
                                        />
                                    </div>
                                    <div className="d-flex justify-content-between align-items-center" style={{ marginTop: '0.75rem', marginBottom: '0.4rem' }}>
                                        <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--ff-text-secondary)' }}>
                                            <i className="bi bi-terminal me-1"></i> Output
                                        </span>
                                        <button className="ff-btn ff-btn-accent" style={{ fontSize: '0.85rem', padding: '0.35rem 1.2rem' }} onClick={runCode} disabled={isRunning}>
                                            {isRunning ? <><span className="spinner-border spinner-border-sm me-1"></span> Running...</> : <><i className="bi bi-play-fill me-1"></i> Run Code</>}
                                        </button>
                                    </div>
                                    <div className="ff-code-output">
                                        {output || '$ waiting for output...'}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer Nav */}
                        <div style={{ borderTop: '1px solid var(--ff-border)', padding: '0.85rem 1.25rem', display: 'flex', justifyContent: 'space-between' }}>
                            <button
                                className="ff-btn ff-btn-outline"
                                disabled={currentQuestionIdx === 0}
                                onClick={() => setCurrentQuestionIdx(currentQuestionIdx - 1)}
                            >
                                <i className="bi bi-chevron-left"></i> Previous
                            </button>

                            {currentQuestionIdx < exam.questions.length - 1 ? (
                                <button className="ff-btn ff-btn-primary" onClick={() => setCurrentQuestionIdx(currentQuestionIdx + 1)}>
                                    Next <i className="bi bi-chevron-right"></i>
                                </button>
                            ) : (
                                <button className="ff-btn ff-btn-danger" onClick={submitExam}>
                                    <i className="bi bi-send me-1"></i> Submit Exam
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="col-md-3">
                    {/* Proctoring */}
                    <div className="ff-proctor-card mb-3">
                        <div className="proctor-header d-flex align-items-center gap-2">
                            <span className={`spinner-grow spinner-grow-sm ${proctorStatus.includes('Active') ? '' : 'd-none'}`} role="status" style={{ width: '8px', height: '8px' }}></span>
                            <i className="bi bi-eye"></i> AI Proctoring
                        </div>
                        <div style={{ padding: '0.75rem' }}>
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                style={{
                                    width: '100%', borderRadius: 'var(--ff-radius-sm)',
                                    transform: 'scaleX(-1)', minHeight: '140px',
                                    background: '#000', border: '1px solid var(--ff-border)'
                                }}
                            ></video>
                            <div style={{
                                marginTop: '0.6rem', fontWeight: 700, fontSize: '0.8rem', textAlign: 'center',
                                color: proctorStatus.includes('Active') ? 'var(--ff-success)' : 'var(--ff-danger)'
                            }}>
                                {proctorStatus}
                            </div>
                            <div style={{
                                marginTop: '0.3rem', textAlign: 'center', fontSize: '0.75rem',
                                color: violations > 0 ? 'var(--ff-danger)' : 'var(--ff-text-muted)',
                                fontWeight: violations > 0 ? 700 : 400
                            }}>
                                Violations: {violations} / 3
                            </div>
                        </div>
                    </div>

                    {/* Question Navigator */}
                    <div className="ff-card" style={{ transform: 'none' }}>
                        <div className="card-header" style={{ padding: '0.75rem 1rem' }}>
                            <h6 style={{ fontWeight: 700, margin: 0, color: 'var(--ff-text)', fontSize: '0.85rem' }}>
                                <i className="bi bi-grid-3x3 me-2" style={{ color: 'var(--ff-primary-light)' }}></i>
                                Questions
                            </h6>
                        </div>
                        <div className="card-body" style={{ padding: '0.75rem 1rem' }}>
                            <div className="ff-question-nav">
                                {exam.questions.map((_, idx) => (
                                    <div
                                        key={idx}
                                        className={`ff-question-dot ${currentQuestionIdx === idx ? 'active' : ''} ${answers[idx] && currentQuestionIdx !== idx ? 'answered' : ''}`}
                                        onClick={() => setCurrentQuestionIdx(idx)}
                                    >
                                        {idx + 1}
                                    </div>
                                ))}
                            </div>
                            <div style={{ marginTop: '0.75rem', fontSize: '0.7rem', color: 'var(--ff-text-muted)', display: 'flex', gap: '0.75rem' }}>
                                <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: 'var(--ff-primary)', marginRight: 4 }}></span>Current</span>
                                <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: 'rgba(34,197,94,0.3)', marginRight: 4 }}></span>Answered</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
