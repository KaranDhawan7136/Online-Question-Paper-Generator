import { useState, useEffect } from 'react';
import { questionsAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const QuestionBank = () => {
    const { user } = useAuth();
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState(null);
    const [filters, setFilters] = useState({ subject: '', topic: '', difficultyLevel: '', questionType: '', search: '' });
    const [searchTerm, setSearchTerm] = useState('');
    const [showFormatGuide, setShowFormatGuide] = useState(false);
    const [activeSubjectTab, setActiveSubjectTab] = useState('All');
    const [allSubjects, setAllSubjects] = useState([]);
    const [subjectDropdownOpen, setSubjectDropdownOpen] = useState(false);
    const [topicDropdownOpen, setTopicDropdownOpen] = useState(false);
    const [showQBankModal, setShowQBankModal] = useState(false);
    const [qbankFile, setQBankFile] = useState(null);
    const [qbankSubject, setQBankSubject] = useState('');
    const [qbankUploading, setQBankUploading] = useState(false);
    const [lectureFrom, setLectureFrom] = useState('');
    const [lectureTo, setLectureTo] = useState('');
    const [imageUploading, setImageUploading] = useState(false);
    const [lightboxImage, setLightboxImage] = useState(null);
    const [selectedIds, setSelectedIds] = useState(new Set());

    const handleSearch = () => {
        setFilters({ ...filters, search: searchTerm });
    };

    // Bulk delete selected questions
    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        if (!window.confirm(`Delete ${selectedIds.size} selected question(s)? This cannot be undone.`)) return;
        try {
            const res = await questionsAPI.bulkDelete([...selectedIds]);
            toast.success(res.data.message);
            setSelectedIds(new Set());
            fetchQuestions();
        } catch (error) {
            toast.error('Bulk delete failed');
        }
    };

    // Delete all questions for a subject
    const handleDeleteSubject = async (subject) => {
        const count = questions.filter(q => (Array.isArray(q.subject) ? q.subject.includes(subject) : q.subject === subject)).length;
        if (!window.confirm(`Delete ALL ${count} questions for "${subject}"? This cannot be undone.`)) return;
        try {
            const res = await questionsAPI.deleteBySubject(subject);
            toast.success(res.data.message);
            setSelectedIds(new Set());
            if (activeSubjectTab === subject) setActiveSubjectTab('All');
            fetchQuestions();
        } catch (error) {
            toast.error('Delete by subject failed');
        }
    };

    // Toggle select all visible questions
    const toggleSelectAll = () => {
        if (selectedIds.size === filteredQuestions.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredQuestions.map(q => q._id)));
        }
    };

    // Toggle single question selection
    const toggleSelect = (id) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const [formData, setFormData] = useState({
        text: '',
        subject: '',
        topic: '',
        unit: '',
        lectureNumber: '',
        difficultyLevel: 2,
        estimatedTime: 5,
        marks: 1,
        questionType: 'MCQ',
        options: ['', '', '', ''],
        correctAnswer: '',
        bloomsTaxonomy: 'U',
        cloMapping: 1,
        image: '',
        optionImages: ['', '', '', '']
    });

    const difficultyLabels = {
        1: 'Very Easy',
        2: 'Easy',
        3: 'Moderate',
        4: 'Hard',
        5: 'Very Hard'
    };

    const bloomsLabels = {
        R: 'Remember',
        U: 'Understand',
        P: 'Apply',
        E: 'Evaluate',
        N: 'Analyze',
        C: 'Create'
    };

    useEffect(() => {
        fetchQuestions();
    }, [filters]);

    const fetchQuestions = async () => {
        try {
            const queryFilters = { ...filters };
            // Apply subject tab filter
            if (activeSubjectTab !== 'All') {
                queryFilters.subject = activeSubjectTab;
            }
            const res = await questionsAPI.getAll({ ...queryFilters, limit: 1000 });
            const qData = res.data.questions || [];
            setQuestions(qData);

            // Extract unique subjects from all questions for tabs
            const subjects = new Set();
            qData.forEach(q => {
                if (Array.isArray(q.subject)) {
                    q.subject.forEach(s => subjects.add(s));
                } else if (q.subject) {
                    subjects.add(q.subject);
                }
            });
            setAllSubjects([...subjects].sort());
        } catch (error) {
            toast.error('Failed to load questions');
        } finally {
            setLoading(false);
        }
    };

    // Re-fetch when subject tab changes
    useEffect(() => {
        setLoading(true);
        fetchQuestions();
    }, [activeSubjectTab]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const submitData = { ...formData };
            // Clean up internal state fields
            delete submitData._subjectInput;
            delete submitData._topicInput;
            // subject and topic are comma-separated strings; server will parse to array
            if (editingQuestion) {
                await questionsAPI.update(editingQuestion._id, submitData);
                toast.success('Question updated!');
            } else {
                await questionsAPI.create(submitData);
                toast.success('Question added!');
            }
            setShowModal(false);
            resetForm();
            fetchQuestions();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Operation failed');
        }
    };

    const handleEdit = (question) => {
        setEditingQuestion(question);
        const opts = question.options?.length ? question.options : ['', '', '', ''];
        setFormData({
            text: question.text,
            subject: Array.isArray(question.subject) ? question.subject.join(', ') : (question.subject || ''),
            topic: Array.isArray(question.topic) ? question.topic.join(', ') : (question.topic || ''),
            unit: question.unit || '',
            lectureNumber: question.lectureNumber || '',
            difficultyLevel: question.difficultyLevel || 2,
            estimatedTime: question.estimatedTime || 5,
            marks: question.marks,
            questionType: question.questionType,
            options: opts,
            correctAnswer: question.correctAnswer || '',
            bloomsTaxonomy: question.bloomsTaxonomy || 'U',
            cloMapping: question.cloMapping || 1,
            image: question.image || '',
            optionImages: question.optionImages?.length ? [...question.optionImages, ...Array(4).fill('')].slice(0, opts.length) : Array(opts.length).fill('')
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Delete this question?')) {
            try {
                await questionsAPI.delete(id);
                toast.success('Question deleted');
                fetchQuestions();
            } catch (error) {
                toast.error('Delete failed');
            }
        }
    };

    const resetForm = () => {
        setEditingQuestion(null);
        setFormData({
            text: '',
            subject: '',
            topic: '',
            unit: '',
            lectureNumber: '',
            difficultyLevel: 2,
            estimatedTime: 5,
            marks: 1,
            questionType: 'MCQ',
            options: ['', '', '', ''],
            correctAnswer: '',
            bloomsTaxonomy: 'U',
            cloMapping: 1,
            image: '',
            optionImages: ['', '', '', '']
        });
    };

    // Image upload handler
    const handleImageUpload = async (file, target, optionIndex = null) => {
        if (!file) return;
        setImageUploading(true);
        const uploadFormData = new FormData();
        uploadFormData.append('image', file);
        try {
            const res = await questionsAPI.uploadImage(uploadFormData);
            const imageUrl = res.data.imageUrl;
            if (target === 'question') {
                setFormData(prev => ({ ...prev, image: imageUrl }));
            } else if (target === 'option' && optionIndex !== null) {
                setFormData(prev => {
                    const newOptionImages = [...prev.optionImages];
                    newOptionImages[optionIndex] = imageUrl;
                    return { ...prev, optionImages: newOptionImages };
                });
            }
            toast.success('Image uploaded!');
        } catch (error) {
            toast.error('Image upload failed');
        } finally {
            setImageUploading(false);
        }
    };

    const removeImage = (target, optionIndex = null) => {
        if (target === 'question') {
            setFormData(prev => ({ ...prev, image: '' }));
        } else if (target === 'option' && optionIndex !== null) {
            setFormData(prev => {
                const newOptionImages = [...prev.optionImages];
                newOptionImages[optionIndex] = '';
                return { ...prev, optionImages: newOptionImages };
            });
        }
    };

    const handleOptionChange = (index, value) => {
        const newOptions = [...formData.options];
        newOptions[index] = value;
        setFormData({ ...formData, options: newOptions });
    };

    const handleCSVUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const uploadFormData = new FormData();
        uploadFormData.append('file', file);
        try {
            const res = await questionsAPI.uploadCSV(uploadFormData);
            toast.success(`${res.data.count} questions imported!`);
            fetchQuestions();
        } catch (error) {
            toast.error('CSV upload failed');
        }
        e.target.value = '';
    };

    const handleWordUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const uploadFormData = new FormData();
        uploadFormData.append('file', file);
        try {
            const res = await questionsAPI.uploadWord(uploadFormData);
            toast.success(`${res.data.count} questions imported from Word!`);
            if (res.data.errors && res.data.errors.length > 0) {
                toast(`${res.data.errors.length} blocks had issues`, { icon: '⚠️' });
            }
            fetchQuestions();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Word upload failed');
        }
        e.target.value = '';
    };

    const handleQBankUpload = async (e) => {
        e.preventDefault();
        if (!qbankFile) return toast.error('Please select a .docx file');
        if (!qbankSubject.trim()) return toast.error('Subject name is required');

        setQBankUploading(true);
        const uploadFormData = new FormData();
        uploadFormData.append('file', qbankFile);
        uploadFormData.append('subject', qbankSubject.trim());
        if (lectureFrom) uploadFormData.append('lectureFrom', lectureFrom);
        if (lectureTo) uploadFormData.append('lectureTo', lectureTo);

        try {
            const res = await questionsAPI.uploadQBank(uploadFormData);
            toast.success(res.data.message);
            if (res.data.stats) {
                const breakdown = Object.entries(res.data.stats).map(([k, v]) => `${k}: ${v}`).join(', ');
                toast(`Breakdown: ${breakdown}`, { icon: '📊', duration: 5000 });
            }
            setShowQBankModal(false);
            setQBankFile(null);
            setQBankSubject('');
            setLectureFrom('');
            setLectureTo('');
            fetchQuestions();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Question bank import failed');
        } finally {
            setQBankUploading(false);
        }
    };

    const downloadCSVTemplate = () => {
        const headers = 'text,subject,topic,unit,difficultyLevel,estimatedTime,marks,questionType,options,correctAnswer,bloomsTaxonomy,cloMapping';
        const sampleMCQ = '"What is the time complexity of binary search?","Data Structures,Algorithms",Searching,Unit 2,2,2,1,MCQ,"O(n)|O(log n)|O(n²)|O(1)",O(log n),U,1';
        const sampleDesc = '"Define a linked list and explain its advantages over arrays.",Data Structures,Linked Lists,Unit 1,2,5,2,2 Mark,,,U,1';
        const csvContent = [headers, sampleMCQ, sampleDesc].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'question_bank_template.csv';
        link.click();
        URL.revokeObjectURL(url);
        toast.success('CSV template downloaded!');
    };

    // Get display text for subject/topic arrays
    const displayArray = (arr) => {
        if (Array.isArray(arr)) return arr.join(', ');
        return arr || '-';
    };

    // Filter questions by active subject tab (client-side for tabs)
    const filteredQuestions = activeSubjectTab === 'All'
        ? questions
        : questions.filter(q => {
            if (Array.isArray(q.subject)) return q.subject.some(s => s === activeSubjectTab);
            return q.subject === activeSubjectTab;
        });

    // Get unique topics for filter dropdown
    const uniqueTopics = [...new Set(questions.flatMap(q =>
        Array.isArray(q.topic) ? q.topic : [q.topic]
    ).filter(Boolean))];

    const isAdmin = user?.role === 'admin';

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Question Bank</h1>
                    <p className="page-subtitle">{filteredQuestions.length} questions {activeSubjectTab !== 'All' ? `in ${activeSubjectTab}` : 'available'}</p>
                </div>
                <div className="actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button className="btn btn-secondary" onClick={downloadCSVTemplate} title="Download a sample CSV file showing the correct format">
                        📥 CSV Template
                    </button>
                    <label className="btn btn-secondary" title="Upload questions from a CSV file">
                        📤 Upload CSV
                        <input type="file" accept=".csv" onChange={handleCSVUpload} style={{ display: 'none' }} />
                    </label>
                    <label className="btn btn-secondary" title="Upload questions from a Word document (.docx)" style={{ background: '#2b5797', color: '#fff', border: 'none' }}>
                        📄 Upload Word
                        <input type="file" accept=".docx" onChange={handleWordUpload} style={{ display: 'none' }} />
                    </label>
                    <button className="btn btn-secondary" onClick={() => setShowFormatGuide(!showFormatGuide)} style={{ fontSize: '14px' }}>
                        {showFormatGuide ? '✕ Hide Guide' : 'ℹ️ Format Guide'}
                    </button>
                    <button className="btn btn-secondary" onClick={() => setShowQBankModal(true)}
                        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', border: 'none' }}
                        title="Smart import from existing question bank files">
                        🧠 Import Q-Bank
                    </button>
                    <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
                        + Add Question
                    </button>
                </div>
            </div>

            {/* Format Guide Panel */}
            {showFormatGuide && (
                <div className="card" style={{ marginBottom: '24px', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                    <h3 style={{ marginBottom: '16px', color: '#a5b4fc', fontSize: '18px' }}>📋 Upload Format Guide</h3>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                        {/* CSV Format */}
                        <div>
                            <h4 style={{ color: '#34d399', marginBottom: '12px', fontSize: '15px' }}>📊 CSV Format</h4>
                            <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '14px', fontSize: '12px', lineHeight: '1.7' }}>
                                <div style={{ color: '#e2e8f0', marginBottom: '8px', fontWeight: 'bold' }}>Required Columns:</div>
                                <div style={{ color: '#94a3b8' }}>
                                    <code style={{ color: '#f472b6' }}>text</code> — Question text<br/>
                                    <code style={{ color: '#f472b6' }}>subject</code> — Subject(s), comma-separated for multiple<br/>
                                    <code style={{ color: '#f472b6' }}>topic</code> — Topic(s), comma-separated for multiple<br/>
                                    <code style={{ color: '#f472b6' }}>marks</code> — Mark value (1, 2, 3, 5, 10)<br/>
                                    <code style={{ color: '#f472b6' }}>questionType</code> — MCQ / 2 Mark / 3 Mark / 5 Mark / 10 Mark
                                </div>
                                <div style={{ color: '#e2e8f0', marginTop: '10px', marginBottom: '6px', fontWeight: 'bold' }}>Optional Columns:</div>
                                <div style={{ color: '#94a3b8' }}>
                                    <code style={{ color: '#818cf8' }}>unit</code>, <code style={{ color: '#818cf8' }}>difficultyLevel</code> (1-5), <code style={{ color: '#818cf8' }}>estimatedTime</code> (mins), <code style={{ color: '#818cf8' }}>bloomsTaxonomy</code> (R/U/P/E/N/C), <code style={{ color: '#818cf8' }}>cloMapping</code> (1-5)
                                    <br /><span style={{ color: '#34d399', fontSize: '11px' }}>✨ Unit, CLO, Lecture, and Bloom's will be auto-calculated if left blank (if a Syllabus Map exists).</span>
                                </div>
                                <div style={{ color: '#e2e8f0', marginTop: '10px', marginBottom: '6px', fontWeight: 'bold' }}>MCQ Only:</div>
                                <div style={{ color: '#94a3b8' }}>
                                    <code style={{ color: '#fb923c' }}>options</code> — Pipe-separated: <code style={{ color: '#fbbf24' }}>A|B|C|D</code><br/>
                                    <code style={{ color: '#fb923c' }}>correctAnswer</code> — Exact text of correct option
                                </div>
                            </div>
                            <div style={{ marginTop: '8px', fontSize: '12px', color: '#94a3b8' }}>
                                💡 Click <strong style={{ color: '#34d399' }}>"📥 CSV Template"</strong> to download a sample file
                            </div>
                        </div>

                        {/* Word Format */}
                        <div>
                            <h4 style={{ color: '#60a5fa', marginBottom: '12px', fontSize: '15px' }}>📄 Word (.docx) Format</h4>
                            <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '14px', fontSize: '12px', lineHeight: '1.7' }}>
                                <div style={{ color: '#e2e8f0', marginBottom: '8px', fontWeight: 'bold' }}>Each question uses "Label: Value" format.</div>
                                <div style={{ color: '#e2e8f0', marginBottom: '6px', fontWeight: 'bold' }}>Separate questions with <code style={{ color: '#34d399' }}>---</code></div>
                                <pre style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '6px', padding: '10px', color: '#cbd5e1', fontSize: '11px', overflowX: 'auto', margin: '8px 0', whiteSpace: 'pre-wrap' }}>
{`Subject: Data Structures, Algorithms
Topic: Arrays
Type: MCQ
Marks: 1
Difficulty: 2
Time: 2
Blooms: U
CLO: 1
Question: What is the time complexity?
Options: O(1) | O(n) | O(log n) | O(n²)
Answer: O(1)
---
Subject: Data Structures
Topic: Linked Lists
Type: 2 Mark
Marks: 2
Question: Define a linked list.`}
                                </pre>
                                <div style={{ color: '#e2e8f0', marginTop: '6px', fontWeight: 'bold' }}>Required Labels:</div>
                                <div style={{ color: '#94a3b8' }}>
                                    <code style={{ color: '#f472b6' }}>Question</code>, <code style={{ color: '#f472b6' }}>Subject</code>, <code style={{ color: '#f472b6' }}>Type</code>, <code style={{ color: '#f472b6' }}>Topic</code>
                                </div>
                                <div style={{ color: '#fbbf24', marginTop: '8px', fontSize: '11px' }}>
                                    💡 Use commas to add multiple subjects/topics. <br/>
                                    <span style={{ color: '#34d399' }}>✨ Missing fields like Unit and Bloom's will be auto-filled if possible!</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Subject Tabs */}
            {allSubjects.length > 0 && (
                <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: 'var(--gray-500)', fontWeight: '600', marginRight: '4px' }}>Subject:</span>
                    <button
                        className={`btn btn-sm ${activeSubjectTab === 'All' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setActiveSubjectTab('All')}
                        style={{ borderRadius: '20px', padding: '6px 16px', fontSize: '13px' }}
                    >
                        All ({questions.length})
                    </button>
                    {allSubjects.map(subject => {
                        const count = questions.filter(q =>
                            Array.isArray(q.subject) ? q.subject.includes(subject) : q.subject === subject
                        ).length;
                        return (
                            <div key={subject} style={{ display: 'inline-flex', alignItems: 'center', gap: '0' }}>
                                <button
                                    className={`btn btn-sm ${activeSubjectTab === subject ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => setActiveSubjectTab(subject)}
                                    style={{ borderRadius: '20px 0 0 20px', padding: '6px 12px 6px 16px', fontSize: '13px' }}
                                >
                                    {subject} ({count})
                                </button>
                                <button
                                    className="btn btn-sm btn-danger"
                                    onClick={(e) => { e.stopPropagation(); handleDeleteSubject(subject); }}
                                    title={`Delete all ${count} questions for ${subject}`}
                                    style={{ borderRadius: '0 20px 20px 0', padding: '6px 10px', fontSize: '12px', minWidth: 'auto' }}
                                >
                                    🗑️
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Filters */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Search questions by text or topic..."
                        style={{ flex: 1 }}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <button className="btn btn-primary" onClick={handleSearch}>Search</button>
                    {searchTerm && (
                        <button className="btn btn-secondary" onClick={() => { setSearchTerm(''); setFilters({ ...filters, search: '' }); }}>
                            Clear
                        </button>
                    )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                    <select className="form-input" value={filters.difficultyLevel}
                        onChange={(e) => setFilters({ ...filters, difficultyLevel: e.target.value })}>
                        <option value="">All Difficulties</option>
                        {[1, 2, 3, 4, 5].map(d => <option key={d} value={d}>{d} - {difficultyLabels[d]}</option>)}
                    </select>
                    <select className="form-input" value={filters.questionType}
                        onChange={(e) => setFilters({ ...filters, questionType: e.target.value })}>
                        <option value="">All Types</option>
                        <option value="MCQ">MCQ</option>
                        <option value="2 Mark">2 Mark</option>
                        <option value="3 Mark">3 Mark</option>
                        <option value="5 Mark">5 Mark</option>
                        <option value="10 Mark">10 Mark</option>
                    </select>
                    <select className="form-input" value={filters.topic}
                        onChange={(e) => setFilters({ ...filters, topic: e.target.value })}>
                        <option value="">All Topics</option>
                        {uniqueTopics.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <div style={{ display: 'flex', alignItems: 'center', color: 'var(--gray-500)', fontSize: '13px' }}>
                        {user?.memberId && <span>Your ID: <strong style={{ color: 'var(--primary)' }}>{user.memberId}</strong></span>}
                    </div>
                </div>
            </div>

            {/* Questions Table */}
            <div className="card">
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th style={{ width: '40px' }}>
                                        <input type="checkbox"
                                            checked={filteredQuestions.length > 0 && selectedIds.size === filteredQuestions.length}
                                            onChange={toggleSelectAll}
                                            title="Select all"
                                        />
                                    </th>
                                    <th style={{ width: '50px' }}>#</th>
                                    <th style={{ width: '30%' }}>Question</th>
                                    <th>Subject</th>
                                    <th>Topic</th>
                                    <th>Difficulty</th>
                                    <th>Type</th>
                                    <th>Created By</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredQuestions.map(q => (
                                    <tr key={q._id} style={{ background: selectedIds.has(q._id) ? 'rgba(99,102,241,0.06)' : undefined }}>
                                        <td>
                                            <input type="checkbox"
                                                checked={selectedIds.has(q._id)}
                                                onChange={() => toggleSelect(q._id)}
                                            />
                                        </td>
                                        <td style={{ fontFamily: 'monospace', color: 'var(--gray-500)', fontWeight: '600' }}>
                                            {q.serialNumber || '-'}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                                {q.image && (
                                                    <img
                                                        src={q.image}
                                                        alt="Q"
                                                        onClick={() => setLightboxImage(q.image)}
                                                        style={{
                                                            width: '40px', height: '40px', objectFit: 'cover',
                                                            borderRadius: '6px', cursor: 'pointer', flexShrink: 0,
                                                            border: '2px solid var(--primary)', opacity: 0.9
                                                        }}
                                                    />
                                                )}
                                                <span>{q.text.substring(0, 70)}{q.text.length > 70 ? '...' : ''}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                                {(Array.isArray(q.subject) ? q.subject : [q.subject]).map((s, i) => (
                                                    <span key={i} className="badge" style={{ fontSize: '11px', padding: '2px 8px' }}>{s}</span>
                                                ))}
                                            </div>
                                        </td>
                                        <td style={{ fontSize: '13px' }}>{displayArray(q.topic)}</td>
                                        <td>
                                            <span className={`badge badge-diff-${q.difficultyLevel || 2}`}>
                                                {q.difficultyLevel || 2}/5
                                            </span>
                                        </td>
                                        <td><span className="badge">{q.questionType}</span></td>
                                        <td style={{ fontSize: '12px' }}>
                                            {q.creatorInfo ? (
                                                <div>
                                                    <span style={{ fontFamily: 'monospace', color: 'var(--primary)', fontWeight: '600' }}>
                                                        {q.creatorInfo.memberId}
                                                    </span>
                                                    {isAdmin && q.creatorInfo.name && (
                                                        <div style={{ fontSize: '11px', color: 'var(--gray-500)', marginTop: '2px' }}>
                                                            {q.creatorInfo.name}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <span style={{ color: 'var(--gray-400)' }}>—</span>
                                            )}
                                        </td>
                                        <td>
                                            <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(q)}>Edit</button>
                                            <button className="btn btn-sm btn-danger" onClick={() => handleDelete(q._id)} style={{ marginLeft: '8px' }}>Delete</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Bulk Action Bar */}
                {selectedIds.size > 0 && (
                    <div style={{
                        position: 'sticky', bottom: '20px', zIndex: 50,
                        background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                        color: 'white', borderRadius: '12px', padding: '12px 20px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        boxShadow: '0 8px 25px rgba(79,70,229,0.35)',
                        marginTop: '16px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '15px', fontWeight: '600' }}>
                                ✅ {selectedIds.size} question{selectedIds.size > 1 ? 's' : ''} selected
                            </span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                className="btn btn-sm"
                                style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none' }}
                                onClick={() => setSelectedIds(new Set())}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-sm btn-danger"
                                onClick={handleBulkDelete}
                                style={{ fontWeight: '600' }}
                            >
                                🗑️ Delete {selectedIds.size} Question{selectedIds.size > 1 ? 's' : ''}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="modal-backdrop" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">{editingQuestion ? 'Edit Question' : 'Add New Question'}</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                                {/* Question Text */}
                                <div className="form-group">
                                    <label className="form-label">Question Text *</label>
                                    <textarea className="form-input" rows="3" required
                                        value={formData.text} onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                                        placeholder="Enter question text" />
                                </div>

                                {/* Question Image Upload */}
                                <div className="form-group">
                                    <label className="form-label">
                                        📷 Question Image <span style={{ fontSize: '11px', color: 'var(--gray-500)', fontWeight: 'normal' }}>optional — attach a diagram or figure</span>
                                    </label>
                                    {formData.image ? (
                                        <div style={{
                                            display: 'flex', alignItems: 'center', gap: '12px',
                                            padding: '10px', borderRadius: '10px',
                                            background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.08))',
                                            border: '1px solid rgba(99,102,241,0.2)'
                                        }}>
                                            <img src={formData.image} alt="Question" style={{
                                                width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px',
                                                border: '2px solid var(--primary)', cursor: 'pointer'
                                            }} onClick={() => setLightboxImage(formData.image)} />
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: '13px', color: 'var(--gray-700)', fontWeight: '500' }}>Image attached ✓</div>
                                                <div style={{ fontSize: '11px', color: 'var(--gray-500)', marginTop: '2px' }}>Click image to preview full size</div>
                                            </div>
                                            <button type="button" onClick={() => removeImage('question')}
                                                style={{
                                                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                                                    color: '#ef4444', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer',
                                                    fontSize: '12px', fontWeight: '500'
                                                }}>✕ Remove</button>
                                        </div>
                                    ) : (
                                        <label style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                            padding: '16px', borderRadius: '10px', cursor: 'pointer',
                                            border: '2px dashed rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.04)',
                                            transition: 'all 0.2s', fontSize: '14px', color: 'var(--gray-500)'
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'rgba(99,102,241,0.08)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'; e.currentTarget.style.background = 'rgba(99,102,241,0.04)'; }}
                                        >
                                            {imageUploading ? '⏳ Uploading...' : '📷 Click to upload question image'}
                                            <input type="file" accept="image/*" style={{ display: 'none' }}
                                                onChange={(e) => handleImageUpload(e.target.files[0], 'question')}
                                                disabled={imageUploading} />
                                        </label>
                                    )}
                                </div>

                                {/* Subject & Topic Row */}
                                <div className="form-grid">
                                    {/* Subject autocomplete */}
                                    <div className="form-group" style={{ position: 'relative' }}>
                                        <label className="form-label">Subject(s) * <span style={{ fontSize: '11px', color: 'var(--gray-500)', fontWeight: 'normal' }}>type to search or add new</span></label>
                                        {/* Selected subjects as tags */}
                                        {formData.subject && (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                                                {formData.subject.split(',').map(s => s.trim()).filter(Boolean).map((s, i) => (
                                                    <span key={i} style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                                                        background: 'var(--primary)', color: '#fff',
                                                        padding: '4px 10px', borderRadius: '14px', fontSize: '12px', fontWeight: '500'
                                                    }}>
                                                        {s}
                                                        <span style={{ cursor: 'pointer', marginLeft: '2px', fontWeight: 'bold' }}
                                                            onClick={() => {
                                                                const newVal = formData.subject.split(',').map(x => x.trim()).filter(x => x && x !== s).join(', ');
                                                                setFormData({ ...formData, subject: newVal });
                                                            }}>×</span>
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        <input type="text" className="form-input"
                                            placeholder="Click to select or type new subject..."
                                            value={formData._subjectInput || ''}
                                            onChange={(e) => setFormData({ ...formData, _subjectInput: e.target.value })}
                                            onFocus={() => setSubjectDropdownOpen(true)}
                                            onBlur={() => setTimeout(() => setSubjectDropdownOpen(false), 200)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    const val = (formData._subjectInput || '').trim();
                                                    if (val) {
                                                        const current = formData.subject.split(',').map(x => x.trim()).filter(Boolean);
                                                        if (!current.includes(val)) {
                                                            setFormData({ ...formData, subject: [...current, val].join(', '), _subjectInput: '' });
                                                        } else {
                                                            setFormData({ ...formData, _subjectInput: '' });
                                                        }
                                                    }
                                                }
                                            }}
                                        />
                                        {/* Dropdown - shows on focus, filters while typing */}
                                        {subjectDropdownOpen && (() => {
                                            const typed = (formData._subjectInput || '').trim().toLowerCase();
                                            const currentSelected = formData.subject.split(',').map(x => x.trim()).filter(Boolean);
                                            const matches = allSubjects.filter(s =>
                                                (!typed || s.toLowerCase().includes(typed)) && !currentSelected.includes(s)
                                            );
                                            if (matches.length === 0) return null;
                                            return (
                                                <div style={{
                                                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                                                    background: 'white', border: '1px solid var(--gray-200)', borderRadius: '8px',
                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)', maxHeight: '180px', overflowY: 'auto'
                                                }}>
                                                    {matches.map(s => (
                                                        <div key={s}
                                                            style={{ padding: '8px 14px', cursor: 'pointer', fontSize: '13px', borderBottom: '1px solid var(--gray-100)' }}
                                                            onMouseEnter={(e) => e.target.style.background = 'var(--gray-50)'}
                                                            onMouseLeave={(e) => e.target.style.background = 'white'}
                                                            onMouseDown={(e) => {
                                                                e.preventDefault();
                                                                const current = formData.subject.split(',').map(x => x.trim()).filter(Boolean);
                                                                setFormData({ ...formData, subject: [...current, s].join(', '), _subjectInput: '' });
                                                            }}>
                                                            {s}
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        })()}
                                        <input type="hidden" required value={formData.subject} />
                                    </div>

                                    {/* Topic autocomplete */}
                                    <div className="form-group" style={{ position: 'relative' }}>
                                        <label className="form-label">Topic(s) * <span style={{ fontSize: '11px', color: 'var(--gray-500)', fontWeight: 'normal' }}>type to search or add new</span></label>
                                        {/* Selected topics as tags */}
                                        {formData.topic && (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                                                {formData.topic.split(',').map(t => t.trim()).filter(Boolean).map((t, i) => (
                                                    <span key={i} style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                                                        background: '#059669', color: '#fff',
                                                        padding: '4px 10px', borderRadius: '14px', fontSize: '12px', fontWeight: '500'
                                                    }}>
                                                        {t}
                                                        <span style={{ cursor: 'pointer', marginLeft: '2px', fontWeight: 'bold' }}
                                                            onClick={() => {
                                                                const newVal = formData.topic.split(',').map(x => x.trim()).filter(x => x && x !== t).join(', ');
                                                                setFormData({ ...formData, topic: newVal });
                                                            }}>×</span>
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        <input type="text" className="form-input"
                                            placeholder="Click to select or type new topic..."
                                            value={formData._topicInput || ''}
                                            onChange={(e) => setFormData({ ...formData, _topicInput: e.target.value })}
                                            onFocus={() => setTopicDropdownOpen(true)}
                                            onBlur={() => setTimeout(() => setTopicDropdownOpen(false), 200)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    const val = (formData._topicInput || '').trim();
                                                    if (val) {
                                                        const current = formData.topic.split(',').map(x => x.trim()).filter(Boolean);
                                                        if (!current.includes(val)) {
                                                            setFormData({ ...formData, topic: [...current, val].join(', '), _topicInput: '' });
                                                        } else {
                                                            setFormData({ ...formData, _topicInput: '' });
                                                        }
                                                    }
                                                }
                                            }}
                                        />
                                        {/* Dropdown - shows on focus, filters while typing */}
                                        {topicDropdownOpen && (() => {
                                            const typed = (formData._topicInput || '').trim().toLowerCase();
                                            const currentSelected = formData.topic.split(',').map(x => x.trim()).filter(Boolean);
                                            const matches = uniqueTopics.filter(t =>
                                                (!typed || t.toLowerCase().includes(typed)) && !currentSelected.includes(t)
                                            );
                                            if (matches.length === 0) return null;
                                            return (
                                                <div style={{
                                                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                                                    background: 'white', border: '1px solid var(--gray-200)', borderRadius: '8px',
                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)', maxHeight: '180px', overflowY: 'auto'
                                                }}>
                                                    {matches.map(t => (
                                                        <div key={t}
                                                            style={{ padding: '8px 14px', cursor: 'pointer', fontSize: '13px', borderBottom: '1px solid var(--gray-100)' }}
                                                            onMouseEnter={(e) => e.target.style.background = 'var(--gray-50)'}
                                                            onMouseLeave={(e) => e.target.style.background = 'white'}
                                                            onMouseDown={(e) => {
                                                                e.preventDefault();
                                                                const current = formData.topic.split(',').map(x => x.trim()).filter(Boolean);
                                                                setFormData({ ...formData, topic: [...current, t].join(', '), _topicInput: '' });
                                                            }}>
                                                            {t}
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        })()}
                                        <input type="hidden" required value={formData.topic} />
                                    </div>
                                </div>

                                {/* Unit & Lecture Row */}
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label className="form-label">
                                            Unit/Chapter <span style={{ fontSize: '11px', color: 'var(--success)', fontWeight: 'normal' }}>(Auto-filled if syllabus map exists)</span>
                                        </label>
                                        <input type="text" className="form-input"
                                            value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                            placeholder="Leave blank to auto-fill" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">
                                            Lecture Number <span style={{ fontSize: '11px', color: 'var(--success)', fontWeight: 'normal' }}>(Auto-filled)</span>
                                        </label>
                                        <input type="text" className="form-input"
                                            value={formData.lectureNumber} onChange={(e) => setFormData({ ...formData, lectureNumber: e.target.value })}
                                            placeholder="Leave blank to auto-fill" />
                                    </div>
                                </div>

                                {/* Difficulty & Time Row */}
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label className="form-label">Difficulty Level (1-5) *</label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <input type="range" min="1" max="5" style={{ flex: 1 }}
                                                value={formData.difficultyLevel}
                                                onChange={(e) => setFormData({ ...formData, difficultyLevel: parseInt(e.target.value) })} />
                                            <span className={`badge badge-diff-${formData.difficultyLevel}`} style={{ minWidth: '100px', textAlign: 'center' }}>
                                                {formData.difficultyLevel} - {difficultyLabels[formData.difficultyLevel]}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Estimated Time (minutes) *</label>
                                        <input type="number" className="form-input" min="1" max="60" required
                                            value={formData.estimatedTime}
                                            onChange={(e) => setFormData({ ...formData, estimatedTime: parseInt(e.target.value) })} />
                                    </div>
                                </div>

                                {/* Type & Marks Row */}
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label className="form-label">Question Type *</label>
                                        <select className="form-input" required value={formData.questionType}
                                            onChange={(e) => setFormData({ ...formData, questionType: e.target.value })}>
                                            <option value="MCQ">MCQ (1 Mark)</option>
                                            <option value="2 Mark">2 Mark</option>
                                            <option value="3 Mark">3 Mark</option>
                                            <option value="5 Mark">5 Mark</option>
                                            <option value="10 Mark">10 Mark</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Marks *</label>
                                        <input type="number" className="form-input" min="1" required
                                            value={formData.marks}
                                            onChange={(e) => setFormData({ ...formData, marks: parseInt(e.target.value) })} />
                                    </div>
                                </div>

                                {/* Bloom's & CLO Row */}
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label className="form-label">
                                            Bloom's Taxonomy <span style={{ fontSize: '11px', color: 'var(--success)', fontWeight: 'normal' }}>(Auto-calculated from question)</span>
                                        </label>
                                        <select className="form-input" value={formData.bloomsTaxonomy}
                                            onChange={(e) => setFormData({ ...formData, bloomsTaxonomy: e.target.value })}>
                                            <option value="U">Auto Calculate</option>
                                            {Object.entries(bloomsLabels).map(([key, label]) => (
                                                <option key={key} value={key}>{key} - {label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">
                                            CLO Mapping (1-5) <span style={{ fontSize: '11px', color: 'var(--success)', fontWeight: 'normal' }}>(Auto-filled)</span>
                                        </label>
                                        <select className="form-input" value={formData.cloMapping}
                                            onChange={(e) => setFormData({ ...formData, cloMapping: parseInt(e.target.value) })}>
                                            {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>CLO-{n}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* MCQ Options */}
                                {formData.questionType === 'MCQ' && (
                                    <div className="form-group">
                                        <label className="form-label">Options</label>
                                        {formData.options.map((opt, idx) => (
                                            <div key={idx} style={{ marginBottom: '12px', padding: '10px', borderRadius: '10px', background: 'rgba(99,102,241,0.03)', border: '1px solid rgba(99,102,241,0.08)' }}>
                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                    <span style={{ width: '30px', textAlign: 'center', fontWeight: '600', color: 'var(--primary)' }}>({['i', 'ii', 'iii', 'iv'][idx]})</span>
                                                    <input type="text" className="form-input" value={opt}
                                                        onChange={(e) => handleOptionChange(idx, e.target.value)}
                                                        placeholder={`Option ${String.fromCharCode(65 + idx)} text`}
                                                        style={{ flex: 1 }} />
                                                </div>
                                                {/* Option image */}
                                                <div style={{ marginLeft: '38px', marginTop: '6px' }}>
                                                    {formData.optionImages[idx] ? (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <img src={formData.optionImages[idx]} alt={`Option ${idx + 1}`}
                                                                onClick={() => setLightboxImage(formData.optionImages[idx])}
                                                                style={{
                                                                    width: '50px', height: '50px', objectFit: 'cover', borderRadius: '6px',
                                                                    border: '2px solid var(--primary)', cursor: 'pointer'
                                                                }} />
                                                            <button type="button" onClick={() => removeImage('option', idx)}
                                                                style={{
                                                                    background: 'none', border: 'none', color: '#ef4444',
                                                                    cursor: 'pointer', fontSize: '14px', padding: '2px 6px'
                                                                }}>✕</button>
                                                        </div>
                                                    ) : (
                                                        <label style={{
                                                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                                                            fontSize: '12px', color: 'var(--gray-400)', cursor: 'pointer',
                                                            padding: '4px 10px', borderRadius: '6px',
                                                            border: '1px dashed rgba(99,102,241,0.2)',
                                                            transition: 'all 0.2s'
                                                        }}
                                                        onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                                                        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(99,102,241,0.2)'}
                                                        >
                                                            📷 Add image
                                                            <input type="file" accept="image/*" style={{ display: 'none' }}
                                                                onChange={(e) => handleImageUpload(e.target.files[0], 'option', idx)}
                                                                disabled={imageUploading} />
                                                        </label>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        <div className="form-group" style={{ marginTop: '8px' }}>
                                            <label className="form-label">Correct Answer</label>
                                            <select className="form-input" value={formData.correctAnswer}
                                                onChange={(e) => setFormData({ ...formData, correctAnswer: e.target.value })}>
                                                <option value="">Select correct answer</option>
                                                {formData.options.map((opt, idx) => opt && (
                                                    <option key={idx} value={opt}>({['i', 'ii', 'iii', 'iv'][idx]}) {opt}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">{editingQuestion ? 'Update' : 'Add'} Question</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Smart Q-Bank Import Modal */}
            {showQBankModal && (
                <div className="modal-backdrop" onClick={() => setShowQBankModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="modal-header">
                            <h2 className="modal-title">🧠 Smart Import Question Bank</h2>
                            <button className="modal-close" onClick={() => setShowQBankModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleQBankUpload}>
                            <div className="modal-body">
                                <div style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.1))', border: '1px solid rgba(99,102,241,0.3)', padding: '14px', borderRadius: '10px', fontSize: '13px', color: 'var(--gray-700)', marginBottom: '20px' }}>
                                    <strong>🧠 Smart Import:</strong> Upload your question bank (.docx) and the system will automatically:
                                    <ul style={{ margin: '8px 0 0', paddingLeft: '20px', lineHeight: '1.8' }}>
                                        <li>Detect <strong>Section A/B/C/D</strong> boundaries and mark values</li>
                                        <li>Extract <strong>MCQ options</strong> and <strong>descriptive questions</strong></li>
                                        <li>Auto-assign <strong>marks, question type & difficulty</strong></li>
                                        <li>Match each question to <strong>CHO topics</strong> using keyword analysis ⚡</li>
                                    </ul>
                                </div>

                                <div className="form-group" style={{ marginBottom: '16px' }}>
                                    <label className="form-label">Subject Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                                    <input type="text" className="form-input" required
                                        value={qbankSubject} onChange={(e) => setQBankSubject(e.target.value)}
                                        placeholder="e.g., Operating Systems" />
                                    <span style={{ fontSize: '11px', color: 'var(--gray-500)', marginTop: '4px', display: 'block' }}>
                                        This will be set as the subject for all imported questions
                                    </span>
                                </div>

                                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label className="form-label">📖 Lecture From</label>
                                        <input type="number" className="form-input" min="1" max="50"
                                            value={lectureFrom} onChange={(e) => setLectureFrom(e.target.value)}
                                            placeholder="e.g., 1" />
                                    </div>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label className="form-label">📖 Lecture To</label>
                                        <input type="number" className="form-input" min="1" max="50"
                                            value={lectureTo} onChange={(e) => setLectureTo(e.target.value)}
                                            placeholder="e.g., 15" />
                                    </div>
                                </div>
                                <span style={{ fontSize: '11px', color: 'var(--gray-500)', marginTop: '-12px', marginBottom: '16px', display: 'block' }}>
                                    Topics from your CHO within this lecture range will be matched to questions. Leave blank to use all topics.
                                </span>

                                <div className="form-group">
                                    <label className="form-label">Question Bank File (.docx) <span style={{ color: 'var(--danger)' }}>*</span></label>
                                    <input type="file" accept=".docx" required className="form-input"
                                        onChange={(e) => setQBankFile(e.target.files[0])} />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowQBankModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={qbankUploading}
                                    style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none' }}>
                                    {qbankUploading ? '⏳ Parsing...' : '🧠 Import Questions'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Image Lightbox */}
            {lightboxImage && (
                <div onClick={() => setLightboxImage(null)} style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.85)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', zIndex: 9999,
                    cursor: 'pointer', backdropFilter: 'blur(4px)'
                }}>
                    <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
                        <img src={lightboxImage} alt="Preview"
                            style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: '12px', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }} />
                        <button onClick={() => setLightboxImage(null)} style={{
                            position: 'absolute', top: '-12px', right: '-12px',
                            background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%',
                            width: '32px', height: '32px', fontSize: '18px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                        }}>✕</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuestionBank;
