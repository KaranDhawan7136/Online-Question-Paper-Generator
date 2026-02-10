import { useState, useEffect } from 'react';
import { questionsAPI } from '../utils/api';
import toast from 'react-hot-toast';

const QuestionBank = () => {
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState(null);
    const [filters, setFilters] = useState({ subject: '', topic: '', difficultyLevel: '', questionType: '', search: '' });
    const [searchTerm, setSearchTerm] = useState('');

    const handleSearch = () => {
        setFilters({ ...filters, search: searchTerm });
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
        cloMapping: 1
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
            const res = await questionsAPI.getAll(filters);
            setQuestions(res.data.questions || []);
        } catch (error) {
            toast.error('Failed to load questions');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingQuestion) {
                await questionsAPI.update(editingQuestion._id, formData);
                toast.success('Question updated!');
            } else {
                await questionsAPI.create(formData);
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
        setFormData({
            text: question.text,
            subject: question.subject,
            topic: question.topic || '',
            unit: question.unit || '',
            lectureNumber: question.lectureNumber || '',
            difficultyLevel: question.difficultyLevel || 2,
            estimatedTime: question.estimatedTime || 5,
            marks: question.marks,
            questionType: question.questionType,
            options: question.options?.length ? question.options : ['', '', '', ''],
            correctAnswer: question.correctAnswer || '',
            bloomsTaxonomy: question.bloomsTaxonomy || 'U',
            cloMapping: question.cloMapping || 1
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
            cloMapping: 1
        });
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
    };

    // Get unique topics and subjects for filters
    const uniqueSubjects = [...new Set(questions.map(q => q.subject))];
    const uniqueTopics = [...new Set(questions.map(q => q.topic).filter(Boolean))];

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Question Bank</h1>
                    <p className="page-subtitle">{questions.length} questions available</p>
                </div>
                <div className="actions">
                    <label className="btn btn-secondary">
                        📤 Upload CSV
                        <input type="file" accept=".csv" onChange={handleCSVUpload} style={{ display: 'none' }} />
                    </label>
                    <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
                        + Add Question
                    </button>
                </div>
            </div>

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
                    <select className="form-input" value={filters.subject}
                        onChange={(e) => setFilters({ ...filters, subject: e.target.value })}>
                        <option value="">All Subjects</option>
                        {uniqueSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select className="form-input" value={filters.topic}
                        onChange={(e) => setFilters({ ...filters, topic: e.target.value })}>
                        <option value="">All Topics</option>
                        {uniqueTopics.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
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
                </div>
            </div>

            {/* Questions Table */}
            <div className="card">
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>
                ) : (
                    <table className="table">
                        <thead>
                            <tr>
                                <th style={{ width: '35%' }}>Question</th>
                                <th>Subject</th>
                                <th>Topic</th>
                                <th>Difficulty</th>
                                <th>Time</th>
                                <th>Type</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {questions.map(q => (
                                <tr key={q._id}>
                                    <td>{q.text.substring(0, 80)}{q.text.length > 80 ? '...' : ''}</td>
                                    <td>{q.subject}</td>
                                    <td>{q.topic || '-'}</td>
                                    <td>
                                        <span className={`badge badge-diff-${q.difficultyLevel || 2}`}>
                                            {q.difficultyLevel || 2}/5
                                        </span>
                                    </td>
                                    <td>{q.estimatedTime || 5} min</td>
                                    <td><span className="badge">{q.questionType}</span></td>
                                    <td>
                                        <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(q)}>Edit</button>
                                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(q._id)} style={{ marginLeft: '8px' }}>Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
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

                                {/* Subject & Topic Row */}
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label className="form-label">Subject *</label>
                                        <input type="text" className="form-input" required
                                            value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                            placeholder="e.g., Computer Science" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Topic *</label>
                                        <input type="text" className="form-input" required
                                            value={formData.topic} onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                                            placeholder="e.g., Computer Fundamentals" />
                                    </div>
                                </div>

                                {/* Unit & Lecture Row */}
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label className="form-label">Unit/Chapter</label>
                                        <input type="text" className="form-input"
                                            value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                            placeholder="e.g., Unit 1" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Lecture Number</label>
                                        <input type="text" className="form-input"
                                            value={formData.lectureNumber} onChange={(e) => setFormData({ ...formData, lectureNumber: e.target.value })}
                                            placeholder="e.g., 1-15 or 6" />
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
                                        <label className="form-label">Bloom's Taxonomy</label>
                                        <select className="form-input" value={formData.bloomsTaxonomy}
                                            onChange={(e) => setFormData({ ...formData, bloomsTaxonomy: e.target.value })}>
                                            {Object.entries(bloomsLabels).map(([key, label]) => (
                                                <option key={key} value={key}>{key} - {label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">CLO Mapping (1-5)</label>
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
                                            <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                                <span style={{ width: '30px', textAlign: 'center' }}>({['i', 'ii', 'iii', 'iv'][idx]})</span>
                                                <input type="text" className="form-input" value={opt}
                                                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                                                    placeholder={`Option ${String.fromCharCode(65 + idx)}`} />
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
        </div>
    );
};

export default QuestionBank;
