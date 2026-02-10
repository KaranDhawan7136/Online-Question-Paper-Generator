import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { papersAPI, questionsAPI } from '../utils/api';
import toast from 'react-hot-toast';

// Default config
const defaultConfig = {
    // University/Institution Details
    universityName: '',
    academicYear: '2025-2026',

    // Exam Details
    title: '',
    semester: '',

    // Course Details
    programmeName: '',
    courseTitle: '',
    courseCode: '',
    subject: '',

    // Paper Configuration
    totalMarks: 40,
    duration: 90,
    totalPages: 2,

    // Unit-based Configuration (NEW)
    unitConfig: [
        { name: 'Unit 1', topics: [], percentage: 50 },
        { name: 'Unit 2', topics: [], percentage: 50 }
    ],

    // Difficulty Distribution (1-5 scale, percentages)
    difficultyDistribution: { 1: 20, 2: 30, 3: 30, 4: 15, 5: 5 },

    // Question Types
    questionTypes: ['MCQ', '2 Mark', '3 Mark', '5 Mark', '10 Mark'],

    // Question Counts (exact number of each type)
    questionCounts: { 'MCQ': 0, '2 Mark': 0, '3 Mark': 0, '5 Mark': 0, '10 Mark': 0 },

    // Optional Questions Config (for each section: total questions and how many to attempt)
    optionalConfig: {
        '2 Mark': { totalQuestions: 0, attemptRequired: 0 },
        '3 Mark': { totalQuestions: 0, attemptRequired: 0 },
        '5 Mark': { totalQuestions: 0, attemptRequired: 0 },
        '10 Mark': { totalQuestions: 0, attemptRequired: 0 }
    },

    // Instructions
    instructions: [
        'Follow the instructions given in each section.',
        'Do not write anything on the question paper, except your roll no.',
        'Make sure that you attempt the questions in order.'
    ]
};

// Load saved config from localStorage
const loadSavedConfig = () => {
    try {
        const saved = localStorage.getItem('paperGeneratorConfig');
        if (saved) {
            return { ...defaultConfig, ...JSON.parse(saved) };
        }
    } catch (e) {
        console.error('Failed to load saved config');
    }
    return defaultConfig;
};

const GeneratePaper = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [preview, setPreview] = useState(null);
    const [availableTopics, setAvailableTopics] = useState([]);
    const [availableSubjects, setAvailableSubjects] = useState([]);
    const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);
    const [subjectStats, setSubjectStats] = useState({});
    const isFirstRender = useRef(true);

    // Initialize config from localStorage
    const [config, setConfig] = useState(loadSavedConfig);

    // Fetch available subjects on mount
    useEffect(() => {
        const fetchSubjects = async () => {
            try {
                const res = await questionsAPI.getStats();
                const subjects = (res.data.bySubject || []).map(s => s._id).filter(Boolean);
                setAvailableSubjects(subjects);
            } catch (error) {
                console.error('Failed to fetch subjects');
            }
        };
        fetchSubjects();
    }, []);

    // Save config to localStorage when it changes (skip first render)
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        localStorage.setItem('paperGeneratorConfig', JSON.stringify(config));
    }, [config]);

    // Fetch available topics and question stats when subject changes
    useEffect(() => {
        const fetchTopicsAndStats = async () => {
            if (config.subject) {
                try {
                    const res = await questionsAPI.getAll({ subject: config.subject, limit: 1000 });
                    const questions = res.data.questions || [];
                    const topics = [...new Set(questions.map(q => q.topic).filter(Boolean))];
                    setAvailableTopics(topics);

                    // Calculate available questions per type
                    const stats = {};
                    ['MCQ', '2 Mark', '3 Mark', '5 Mark', '10 Mark'].forEach(type => {
                        stats[type] = questions.filter(q => q.questionType === type).length;
                    });
                    setSubjectStats(stats);
                } catch (error) {
                    console.error('Failed to fetch topics');
                }
            }
        };
        fetchTopicsAndStats();
    }, [config.subject]);

    // Filter subjects based on input - show all if empty, filter when typing
    const filteredSubjects = config.subject.trim() === ''
        ? availableSubjects
        : availableSubjects.filter(s =>
            s.toLowerCase().includes(config.subject.toLowerCase())
        );

    // Handle question count change
    const handleQuestionCountChange = (type, count) => {
        const newCounts = { ...config.questionCounts, [type]: parseInt(count) || 0 };
        setConfig({ ...config, questionCounts: newCounts });
    };

    // Calculate total marks from question counts
    const getCalculatedMarks = () => {
        const markValues = { 'MCQ': 1, '2 Mark': 2, '3 Mark': 3, '5 Mark': 5, '10 Mark': 10 };
        return Object.entries(config.questionCounts).reduce((total, [type, count]) => {
            return total + (count * (markValues[type] || 0));
        }, 0);
    };

    // Check if any question counts are set
    const hasQuestionCounts = () => {
        return Object.values(config.questionCounts).some(count => count > 0);
    };

    // Handle optional config change
    const handleOptionalConfigChange = (type, field, value) => {
        const newOptional = {
            ...config.optionalConfig,
            [type]: {
                ...config.optionalConfig[type],
                [field]: parseInt(value) || 0
            }
        };
        setConfig({ ...config, optionalConfig: newOptional });
    };

    // Get display label for question types
    const getTypeLabel = (type) => {
        if (type === 'MCQ') return 'MCQ (1 Mark)';
        return type;
    };

    const handleDifficultyChange = (level, value) => {
        const newDist = { ...config.difficultyDistribution, [level]: parseInt(value) };
        setConfig({ ...config, difficultyDistribution: newDist });
    };

    const handleTypeToggle = (type) => {
        const types = config.questionTypes.includes(type)
            ? config.questionTypes.filter(t => t !== type)
            : [...config.questionTypes, type];
        setConfig({ ...config, questionTypes: types });
    };

    // Unit Management Functions
    const addUnit = () => {
        const newUnit = { name: `Unit ${config.unitConfig.length + 1}`, topics: [], percentage: 0 };
        setConfig({ ...config, unitConfig: [...config.unitConfig, newUnit] });
    };

    const removeUnit = (idx) => {
        if (config.unitConfig.length <= 1) return;
        const newUnits = config.unitConfig.filter((_, i) => i !== idx);
        setConfig({ ...config, unitConfig: newUnits });
    };

    const updateUnitName = (idx, name) => {
        const newUnits = [...config.unitConfig];
        newUnits[idx] = { ...newUnits[idx], name };
        setConfig({ ...config, unitConfig: newUnits });
    };

    const updateUnitPercentage = (idx, percentage) => {
        const newUnits = [...config.unitConfig];
        newUnits[idx] = { ...newUnits[idx], percentage: parseInt(percentage) || 0 };
        setConfig({ ...config, unitConfig: newUnits });
    };

    const toggleUnitTopic = (unitIdx, topic) => {
        const newUnits = [...config.unitConfig];
        const currentTopics = newUnits[unitIdx].topics;
        newUnits[unitIdx] = {
            ...newUnits[unitIdx],
            topics: currentTopics.includes(topic)
                ? currentTopics.filter(t => t !== topic)
                : [...currentTopics, topic]
        };
        setConfig({ ...config, unitConfig: newUnits });
    };

    const getTotalUnitPercentage = () => {
        return config.unitConfig.reduce((sum, unit) => sum + unit.percentage, 0);
    };

    const handleInstructionChange = (idx, value) => {
        const newInstructions = [...config.instructions];
        newInstructions[idx] = value;
        setConfig({ ...config, instructions: newInstructions });
    };

    const addInstruction = () => {
        setConfig({ ...config, instructions: [...config.instructions, ''] });
    };

    const removeInstruction = (idx) => {
        const newInstructions = config.instructions.filter((_, i) => i !== idx);
        setConfig({ ...config, instructions: newInstructions });
    };

    const getTotalDifficulty = () => {
        return Object.values(config.difficultyDistribution).reduce((a, b) => a + b, 0);
    };

    const handleGenerate = async (e) => {
        e.preventDefault();

        const total = getTotalDifficulty();
        if (total !== 100) {
            toast.error('Difficulty percentages must sum to 100%');
            return;
        }

        // Validate unit percentages
        const unitTotal = getTotalUnitPercentage();
        if (config.unitConfig.length > 0 && unitTotal !== 100) {
            toast.error('Unit percentages must sum to 100%');
            return;
        }

        if (config.questionTypes.length === 0) {
            toast.error('Select at least one question type');
            return;
        }

        setLoading(true);
        try {
            const res = await papersAPI.generate(config);
            setPreview({
                paper: res.data.paper,
                questions: res.data.paper.questionsData,
                analytics: res.data.analytics
            });
            toast.success('Paper generated successfully!');
        } catch (error) {
            toast.error(error.response?.data?.error || 'Generation failed. Add more questions first.');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (type) => {
        try {
            const response = await papersAPI.downloadPDF(preview.paper._id, type);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${preview.paper.title.replace(/\s/g, '_')}_${type}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('PDF downloaded!');
        } catch (error) {
            toast.error('Download failed');
        }
    };

    const difficultyLabels = { 1: 'Very Easy', 2: 'Easy', 3: 'Moderate', 4: 'Hard', 5: 'Very Hard' };

    if (preview) {
        return (
            <div>
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Paper Preview</h1>
                        <p className="page-subtitle">{preview.paper.title}</p>
                    </div>
                    <div className="actions">
                        <button className="btn btn-secondary" onClick={() => setPreview(null)}>← Back</button>
                        <button className="btn btn-primary" onClick={() => handleDownload('question_paper')}>📄 Download Paper</button>
                        <button className="btn btn-success" onClick={() => handleDownload('summary')}>📊 Download Summary</button>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '24px' }}>
                    <div className="card">
                        <div className="paper-preview">
                            {/* University Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                <div><strong>{preview.paper.universityName || 'University Name'}</strong></div>
                                <div><strong>{preview.paper.academicYear || '2025-2026'}</strong></div>
                            </div>

                            <div className="paper-header">
                                <div className="paper-university">{preview.paper.title}</div>
                                {preview.paper.semester && <div className="paper-subject">Semester: {preview.paper.semester}</div>}
                            </div>

                            {/* Course Info */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '14px' }}>
                                <div>
                                    <div><strong>Roll No.:</strong> _________________</div>
                                    {preview.paper.programmeName && <div><strong>Programme:</strong> {preview.paper.programmeName}</div>}
                                    <div><strong>Course Title:</strong> {preview.paper.courseTitle}</div>
                                    {preview.paper.courseCode && <div><strong>Course Code:</strong> {preview.paper.courseCode}</div>}
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div><strong>[Total No. of Pages: {preview.paper.totalPages || 2}]</strong></div>
                                    <div><strong>Time:</strong> {preview.paper.duration} minutes</div>
                                    <div><strong>Max. Marks:</strong> {preview.paper.totalMarks}</div>
                                </div>
                            </div>

                            {/* General Instructions */}
                            <div style={{ marginBottom: '20px' }}>
                                <strong>General Instructions:</strong>
                                <ul style={{ paddingLeft: '20px', marginTop: '8px', listStyle: 'none' }}>
                                    {preview.paper.instructions.map((inst, idx) => (
                                        <li key={idx} style={{ marginBottom: '4px' }}>• {inst}</li>
                                    ))}
                                </ul>
                            </div>

                            {/* Sections */}
                            {['MCQ', '2 Mark', '3 Mark', '5 Mark', '10 Mark'].map(type => {
                                const questions = preview.questions.filter(q => q.questionType === type);
                                if (questions.length === 0) return null;
                                const sectionConfig = {
                                    MCQ: { name: 'Section-A', note: '(All Questions are Compulsory. Each question carries 01 mark)' },
                                    '2 Mark': { name: 'Section-B', note: '(Attempt any 5 questions, each question carries 02 marks)' },
                                    '3 Mark': { name: 'Section-B', note: '(Attempt any 5 questions, each question carries 03 marks)' },
                                    '5 Mark': { name: 'Section-C', note: '(Attempt any 2 questions, each carries 5 marks)' },
                                    '10 Mark': { name: 'Section-D', note: '(Attempt any 1 question, each carries 10 marks)' }
                                };
                                return (
                                    <div key={type} className="paper-section">
                                        <div className="paper-section-title" style={{ textDecoration: 'underline' }}>
                                            {sectionConfig[type].name}
                                        </div>
                                        <div style={{ fontStyle: 'italic', textAlign: 'center', marginBottom: '12px', fontSize: '12px' }}>
                                            {sectionConfig[type].note}
                                        </div>
                                        {questions.map((q, idx) => (
                                            <div key={q._id} className="paper-question">
                                                <span className="paper-question-num">{idx + 1}.</span> {q.text}
                                                {type === 'MCQ' && q.options && (
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', marginTop: '8px', paddingLeft: '20px', gap: '4px' }}>
                                                        {q.options.map((opt, i) => (
                                                            <div key={i}>({['i', 'ii', 'iii', 'iv'][i]}) {opt}</div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div>
                        <div className="card" style={{ marginBottom: '16px' }}>
                            <h3 className="card-title" style={{ marginBottom: '16px' }}>Analytics Summary</h3>
                            <div style={{ marginBottom: '12px' }}>
                                <strong>Total Questions:</strong> {preview.analytics.totalQuestions}
                            </div>
                            <div style={{ marginBottom: '12px' }}>
                                <strong>Total Marks:</strong> {preview.analytics.totalMarks}
                            </div>
                            <div style={{ marginBottom: '12px' }}>
                                <strong>Estimated Time:</strong> {preview.analytics.estimatedTime || 'N/A'} min
                            </div>
                            <div style={{ marginBottom: '16px' }}>
                                <strong>Difficulty Breakdown:</strong>
                                {Object.entries(preview.analytics.difficultyDistribution?.counts || {}).map(([diff, count]) => (
                                    <div key={diff} style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                                        <span>Level {diff}</span>
                                        <span>{count} questions</span>
                                    </div>
                                ))}
                            </div>
                            <div>
                                <strong>Topic Coverage:</strong>
                                {Object.entries(preview.analytics.topicDistribution?.counts || {}).map(([topic, count]) => (
                                    <div key={topic} style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                                        <span>{topic}</span>
                                        <span>{count} questions</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Generate Question Paper</h1>
                    <p className="page-subtitle">Configure topics and difficulty to generate a paper</p>
                </div>
            </div>

            <div className="card">
                <form onSubmit={handleGenerate}>
                    {/* University/Institution Section */}
                    <h3 style={{ marginBottom: '16px', color: 'var(--primary)' }}>🏛️ University/Institution Details</h3>
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">University/Institution Name</label>
                            <input type="text" className="form-input" placeholder="e.g., Chitkara University"
                                value={config.universityName} onChange={(e) => setConfig({ ...config, universityName: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Academic Year</label>
                            <input type="text" className="form-input" placeholder="e.g., 2025-2026"
                                value={config.academicYear} onChange={(e) => setConfig({ ...config, academicYear: e.target.value })} />
                        </div>
                    </div>

                    {/* Exam Details Section */}
                    <h3 style={{ marginTop: '24px', marginBottom: '16px', color: 'var(--primary)' }}>📋 Exam Details</h3>
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Exam Title *</label>
                            <input type="text" className="form-input" placeholder="e.g., Sessional Test I - September 2025"
                                value={config.title} onChange={(e) => setConfig({ ...config, title: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Semester</label>
                            <input type="text" className="form-input" placeholder="e.g., 1st"
                                value={config.semester} onChange={(e) => setConfig({ ...config, semester: e.target.value })} />
                        </div>
                    </div>

                    {/* Course Details Section */}
                    <h3 style={{ marginTop: '24px', marginBottom: '16px', color: 'var(--primary)' }}>📚 Course Details</h3>
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Programme Name</label>
                            <input type="text" className="form-input" placeholder="e.g., BCA – AI&ML"
                                value={config.programmeName} onChange={(e) => setConfig({ ...config, programmeName: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Course Title *</label>
                            <input type="text" className="form-input" placeholder="e.g., Basics of Computer Science"
                                value={config.courseTitle} onChange={(e) => setConfig({ ...config, courseTitle: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Course Code</label>
                            <input type="text" className="form-input" placeholder="e.g., 25COA1101"
                                value={config.courseCode} onChange={(e) => setConfig({ ...config, courseCode: e.target.value })} />
                        </div>
                        <div className="form-group" style={{ position: 'relative' }}>
                            <label className="form-label">Subject (for filtering questions) *</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Start typing to search subjects..."
                                value={config.subject}
                                onChange={(e) => setConfig({ ...config, subject: e.target.value })}
                                onFocus={() => setShowSubjectDropdown(true)}
                                onBlur={() => setTimeout(() => setShowSubjectDropdown(false), 200)}
                                required
                            />
                            {showSubjectDropdown && filteredSubjects.length > 0 && (
                                <div style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    right: 0,
                                    background: 'white',
                                    border: '1px solid var(--gray-200)',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                    zIndex: 100,
                                    maxHeight: '200px',
                                    overflowY: 'auto'
                                }}>
                                    {filteredSubjects.map(subject => (
                                        <div
                                            key={subject}
                                            style={{
                                                padding: '10px 16px',
                                                cursor: 'pointer',
                                                borderBottom: '1px solid var(--gray-100)',
                                                transition: 'background 0.2s'
                                            }}
                                            onMouseEnter={(e) => e.target.style.background = 'var(--gray-50)'}
                                            onMouseLeave={(e) => e.target.style.background = 'white'}
                                            onClick={() => {
                                                setConfig({ ...config, subject });
                                                setShowSubjectDropdown(false);
                                            }}
                                        >
                                            {subject}
                                        </div>
                                    ))}
                                </div>
                            )}
                            {config.subject && filteredSubjects.length === 0 && showSubjectDropdown && (
                                <div style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    right: 0,
                                    background: 'white',
                                    border: '1px solid var(--gray-200)',
                                    borderRadius: '8px',
                                    padding: '10px 16px',
                                    color: 'var(--gray-500)',
                                    fontSize: '14px'
                                }}>
                                    No matching subjects found
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Question Count Configuration */}
                    {config.subject && (
                        <>
                            <h3 style={{ marginTop: '24px', marginBottom: '16px', color: 'var(--primary)' }}>
                                🔢 Question Count Configuration
                            </h3>
                            <p style={{ fontSize: '14px', color: 'var(--gray-500)', marginBottom: '16px' }}>
                                Specify exact number of questions for each type. For optional sections, set total questions and how many to attempt.
                            </p>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                gap: '16px',
                                marginBottom: '16px'
                            }}>
                                {['MCQ', '2 Mark', '3 Mark', '5 Mark', '10 Mark'].map(type => (
                                    <div key={type} style={{
                                        background: 'var(--gray-50)',
                                        padding: '16px',
                                        borderRadius: '12px',
                                        border: config.questionCounts[type] > 0 ? '2px solid var(--primary)' : '2px solid transparent'
                                    }}>
                                        <div style={{ fontWeight: '600', marginBottom: '8px', color: 'var(--gray-700)' }}>
                                            {getTypeLabel(type)}
                                        </div>
                                        <div style={{ marginBottom: '8px' }}>
                                            <label style={{ fontSize: '12px', color: 'var(--gray-500)' }}>Total Questions</label>
                                            <input
                                                type="number"
                                                min="0"
                                                max={subjectStats[type] || 100}
                                                className="form-input"
                                                style={{ textAlign: 'center', fontWeight: '600' }}
                                                value={config.questionCounts[type]}
                                                onChange={(e) => handleQuestionCountChange(type, e.target.value)}
                                            />
                                        </div>
                                        {type !== 'MCQ' && config.questionCounts[type] > 0 && (
                                            <div style={{ marginTop: '8px' }}>
                                                <label style={{ fontSize: '12px', color: 'var(--gray-500)' }}>Attempt Required</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={config.questionCounts[type]}
                                                    className="form-input"
                                                    style={{ textAlign: 'center', fontWeight: '600' }}
                                                    value={config.optionalConfig[type]?.attemptRequired || 0}
                                                    onChange={(e) => handleOptionalConfigChange(type, 'attemptRequired', e.target.value)}
                                                    placeholder="e.g., 5 of 7"
                                                />
                                                {config.optionalConfig[type]?.attemptRequired > 0 &&
                                                    config.optionalConfig[type]?.attemptRequired < config.questionCounts[type] && (
                                                        <div style={{
                                                            fontSize: '11px',
                                                            color: 'var(--primary)',
                                                            marginTop: '4px',
                                                            fontStyle: 'italic',
                                                            textAlign: 'center'
                                                        }}>
                                                            Attempt any {config.optionalConfig[type]?.attemptRequired} of {config.questionCounts[type]}
                                                        </div>
                                                    )}
                                            </div>
                                        )}
                                        <div style={{
                                            fontSize: '12px',
                                            color: 'var(--gray-500)',
                                            marginTop: '8px',
                                            textAlign: 'center'
                                        }}>
                                            Available: {subjectStats[type] || 0}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {hasQuestionCounts() && (
                                <div style={{
                                    padding: '12px 20px',
                                    background: 'linear-gradient(135deg, var(--primary-light), var(--success-light))',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '16px'
                                }}>
                                    <span style={{ fontWeight: '600' }}>📊 Total Calculated Marks:</span>
                                    <span style={{
                                        fontSize: '24px',
                                        fontWeight: '700',
                                        color: 'var(--primary)'
                                    }}>
                                        {getCalculatedMarks()}
                                    </span>
                                </div>
                            )}
                        </>
                    )}


                    {/* Unit Configuration Section */}
                    {availableTopics.length > 0 && (
                        <>
                            <h3 style={{ marginTop: '24px', marginBottom: '16px', color: 'var(--primary)' }}>
                                📦 Unit Configuration
                            </h3>
                            <p style={{ fontSize: '14px', color: 'var(--gray-500)', marginBottom: '16px' }}>
                                Configure units with topics and percentage of marks each unit should cover.
                                Total percentage must equal 100%.
                            </p>

                            {config.unitConfig.map((unit, unitIdx) => (
                                <div key={unitIdx} className="card" style={{
                                    background: 'var(--gray-50)',
                                    marginBottom: '16px',
                                    border: '2px solid var(--primary-light)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                                            <input
                                                type="text"
                                                className="form-input"
                                                style={{ maxWidth: '200px', fontWeight: '600' }}
                                                value={unit.name}
                                                onChange={(e) => updateUnitName(unitIdx, e.target.value)}
                                                placeholder="Unit Name"
                                            />
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <label style={{ fontSize: '14px', fontWeight: '500' }}>Marks %:</label>
                                                <input
                                                    type="number"
                                                    className="form-input"
                                                    style={{ width: '80px' }}
                                                    min="0"
                                                    max="100"
                                                    value={unit.percentage}
                                                    onChange={(e) => updateUnitPercentage(unitIdx, e.target.value)}
                                                />
                                                <span style={{ color: 'var(--gray-500)' }}>%</span>
                                            </div>
                                        </div>
                                        {config.unitConfig.length > 1 && (
                                            <button
                                                type="button"
                                                className="btn btn-danger btn-sm"
                                                onClick={() => removeUnit(unitIdx)}
                                            >
                                                ✕ Remove
                                            </button>
                                        )}
                                    </div>

                                    <div style={{ marginBottom: '8px' }}>
                                        <label style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px', display: 'block' }}>
                                            Select Topics for {unit.name}:
                                        </label>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                            {availableTopics.map(topic => (
                                                <label key={topic} style={{
                                                    display: 'flex', alignItems: 'center', gap: '6px',
                                                    padding: '6px 12px',
                                                    background: unit.topics.includes(topic) ? 'var(--primary)' : 'white',
                                                    color: unit.topics.includes(topic) ? 'white' : 'inherit',
                                                    borderRadius: '6px', cursor: 'pointer',
                                                    border: '1px solid var(--gray-200)',
                                                    fontSize: '13px'
                                                }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={unit.topics.includes(topic)}
                                                        onChange={() => toggleUnitTopic(unitIdx, topic)}
                                                        style={{ display: 'none' }}
                                                    />
                                                    <span>{topic}</span>
                                                </label>
                                            ))}
                                        </div>
                                        {unit.topics.length === 0 && (
                                            <p style={{ marginTop: '8px', color: 'var(--warning)', fontSize: '12px' }}>
                                                ⚠️ No topics selected - all topics will be used for this unit
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <button type="button" className="btn btn-secondary" onClick={addUnit}>
                                    + Add Another Unit
                                </button>
                                <div style={{
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    background: getTotalUnitPercentage() === 100 ? 'var(--success-light)' : 'var(--danger-light)',
                                    color: getTotalUnitPercentage() === 100 ? 'var(--success)' : 'var(--danger)',
                                    fontWeight: '600'
                                }}>
                                    Total: {getTotalUnitPercentage()}%
                                    {getTotalUnitPercentage() !== 100 && ' (Must equal 100%)'}
                                </div>
                            </div>
                        </>
                    )}

                    {/* Paper Configuration Section */}
                    <h3 style={{ marginTop: '24px', marginBottom: '16px', color: 'var(--primary)' }}>⚙️ Paper Configuration</h3>
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Total Marks *</label>
                            <input type="number" className="form-input" min="10" max="200" value={config.totalMarks}
                                onChange={(e) => setConfig({ ...config, totalMarks: parseInt(e.target.value) })} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Duration (minutes) *</label>
                            <input type="number" className="form-input" min="30" max="300" value={config.duration}
                                onChange={(e) => setConfig({ ...config, duration: parseInt(e.target.value) })} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Total Pages</label>
                            <input type="number" className="form-input" min="1" max="20" value={config.totalPages}
                                onChange={(e) => setConfig({ ...config, totalPages: parseInt(e.target.value) })} />
                        </div>
                    </div>

                    {/* Difficulty Distribution (1-5) */}
                    <div className="form-group" style={{ marginTop: '24px' }}>
                        <label className="form-label">Difficulty Distribution (%) - Scale 1 to 5</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
                            {[1, 2, 3, 4, 5].map(level => (
                                <div key={level} style={{ background: 'var(--gray-50)', padding: '12px', borderRadius: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px' }}>
                                        <span className={`badge badge-diff-${level}`}>{level}</span>
                                        <span>{config.difficultyDistribution[level]}%</span>
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--gray-500)', marginBottom: '4px' }}>{difficultyLabels[level]}</div>
                                    <input type="range" min="0" max="100" style={{ width: '100%' }}
                                        value={config.difficultyDistribution[level]}
                                        onChange={(e) => handleDifficultyChange(level, e.target.value)} />
                                </div>
                            ))}
                        </div>
                        <div style={{ textAlign: 'center', marginTop: '8px', color: getTotalDifficulty() === 100 ? 'var(--success)' : 'var(--danger)' }}>
                            Total: {getTotalDifficulty()}% {getTotalDifficulty() !== 100 && '(Must equal 100%)'}
                        </div>
                    </div>

                    {/* Question Types */}
                    <div className="form-group" style={{ marginTop: '24px' }}>
                        <label className="form-label">Question Types</label>
                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                            {['MCQ', '2 Mark', '3 Mark', '5 Mark', '10 Mark'].map(type => (
                                <label key={type} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input type="checkbox" checked={config.questionTypes.includes(type)}
                                        onChange={() => handleTypeToggle(type)} />
                                    <span>{type}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* General Instructions */}
                    <h3 style={{ marginTop: '24px', marginBottom: '16px', color: 'var(--primary)' }}>📝 General Instructions</h3>
                    {config.instructions.map((inst, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                            <input type="text" className="form-input" value={inst}
                                onChange={(e) => handleInstructionChange(idx, e.target.value)}
                                placeholder={`Instruction ${idx + 1}`} />
                            <button type="button" className="btn btn-danger btn-sm" onClick={() => removeInstruction(idx)}>✕</button>
                        </div>
                    ))}
                    <button type="button" className="btn btn-secondary btn-sm" onClick={addInstruction}>+ Add Instruction</button>

                    <button type="submit" className="btn btn-primary btn-lg" style={{ marginTop: '32px', width: '100%' }} disabled={loading}>
                        {loading ? '⏳ Generating...' : '🎯 Generate Paper'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default GeneratePaper;
