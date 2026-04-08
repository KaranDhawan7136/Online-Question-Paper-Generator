import React, { useState, useEffect } from 'react';
import { syllabusAPI } from '../utils/api';
import toast from 'react-hot-toast';

const SyllabusMaps = () => {
    const [maps, setMaps] = useState([]);
    const [loading, setLoading] = useState(true);
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isAdmin = user?.role === 'admin';
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('cho'); // 'cho' or 'csv'
    const [subject, setSubject] = useState('');
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [previewData, setPreviewData] = useState(null);

    useEffect(() => {
        fetchMaps();
    }, []);

    const fetchMaps = async () => {
        try {
            const res = await syllabusAPI.getAll();
            setMaps(res.data);
        } catch (error) {
            toast.error('Failed to fetch syllabus maps');
        } finally {
            setLoading(false);
        }
    };

    const handleCHOUpload = async (e) => {
        e.preventDefault();
        if (!file) return toast.error('Please select a CHO file');

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        if (subject.trim()) formData.append('subject', subject);

        try {
            const res = await syllabusAPI.uploadCHO(formData);
            toast.success(res.data.message);
            setPreviewData(res.data);
            setShowModal(false);
            setSubject('');
            setFile(null);
            fetchMaps();
        } catch (error) {
            const errMsg = error.response?.data?.error || 'CHO parsing failed';
            toast.error(errMsg);
            if (errMsg.includes('Python AI Service')) {
                toast('Make sure the Python AI service is running:\ncd ai_service && python app.py', { icon: '⚙️', duration: 6000 });
            }
        } finally {
            setUploading(false);
        }
    };

    const handleCSVUpload = async (e) => {
        e.preventDefault();
        if (!file || !subject.trim()) return toast.error('Subject and file are required');

        setUploading(true);
        const formData = new FormData();
        formData.append('subject', subject);
        formData.append('file', file);

        try {
            const res = await syllabusAPI.uploadCSV(formData);
            toast.success(res.data.message);
            setShowModal(false);
            setSubject('');
            setFile(null);
            fetchMaps();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Delete this syllabus mapping? Future questions for this subject will no longer auto-fill.')) {
            try {
                await syllabusAPI.delete(id);
                toast.success('Deleted successfully');
                fetchMaps();
            } catch (error) {
                toast.error('Failed to delete mapping');
            }
        }
    };

    const downloadTemplate = () => {
        const headers = 'Topic,Unit,LectureNumber,CLOMapping';
        const sample1 = 'Arrays,Unit 1,1-4,1';
        const sample2 = 'Linked Lists,Unit 1,5-8,2';
        const sample3 = 'Binary Trees,Unit 2,9-12,3';
        const csvContent = [headers, sample1, sample2, sample3].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'syllabus_mapping_template.csv';
        link.click();
        URL.revokeObjectURL(url);
        toast.success('Template downloaded!');
    };

    const openModal = (mode) => {
        setModalMode(mode);
        setSubject('');
        setFile(null);
        setShowModal(true);
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Syllabus Maps</h1>
                    <p className="page-subtitle">
                        {isAdmin
                            ? 'View all CHO uploads from all faculty members. Upload your own CHO to enable auto-fill.'
                            : 'Upload a Course Handout (CHO) to auto-extract topic → unit/CLO mapping'
                        }
                    </p>
                </div>
                <div className="actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button className="btn btn-secondary" onClick={downloadTemplate}>
                        📥 CSV Template
                    </button>
                    <button className="btn btn-secondary" onClick={() => openModal('csv')}>
                        📊 Upload CSV
                    </button>
                    <button className="btn btn-primary" onClick={() => openModal('cho')} style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none' }}>
                        📄 Upload CHO
                    </button>
                </div>
            </div>

            {/* Info Card */}
            <div className="card" style={{ marginBottom: '24px', background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.08))', border: '1px solid rgba(99,102,241,0.2)' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '28px' }}>🎯</span>
                    <div>
                        <h3 style={{ margin: '0 0 6px', fontSize: '15px', color: 'var(--gray-800)' }}>How Auto-Fill Works</h3>
                        <p style={{ margin: 0, fontSize: '13px', color: 'var(--gray-600)', lineHeight: '1.6' }}>
                            Upload your <strong>Course Handout (CHO)</strong> document (.pdf or .docx) and the system will automatically extract
                            the <strong>Topic → Unit, Lecture Number & CLO</strong> mapping. When you add questions in the Question Bank,
                            these fields will be <strong>auto-filled</strong> based on the topic you select. Bloom's Taxonomy is also auto-calculated from question text.
                        </p>
                    </div>
                </div>
            </div>

            {/* Preview Results (shows after successful CHO parse) */}
            {previewData && (
                <div className="card" style={{ marginBottom: '24px', border: '1px solid rgba(52,211,153,0.4)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h3 style={{ margin: 0, fontSize: '15px', color: 'var(--success)' }}>✅ Last CHO Parse Result — {previewData.subject}</h3>
                        <button className="btn btn-sm btn-secondary" onClick={() => setPreviewData(null)}>Dismiss</button>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--gray-600)', margin: '0 0 12px' }}>
                        Extracted <strong>{previewData.topicsCount}</strong> topic mappings.
                        {previewData.cloDefinitions && Object.keys(previewData.cloDefinitions).length > 0 && (
                            <span> Found <strong>{Object.keys(previewData.cloDefinitions).length}</strong> CLO definitions.</span>
                        )}
                    </p>
                    {previewData.cloDefinitions && Object.keys(previewData.cloDefinitions).length > 0 && (
                        <div style={{ marginBottom: '12px' }}>
                            <strong style={{ fontSize: '13px' }}>CLO Definitions:</strong>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                                {Object.entries(previewData.cloDefinitions).map(([id, desc]) => (
                                    <span key={id} style={{ background: 'rgba(99,102,241,0.1)', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', color: 'var(--gray-700)' }}>
                                        <strong>{id}:</strong> {desc.substring(0, 60)}{desc.length > 60 ? '...' : ''}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                    {previewData.map?.mappings && (
                        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                            <table className="table" style={{ fontSize: '12px' }}>
                                <thead>
                                    <tr><th>Topic</th><th>Unit</th><th>Lectures</th><th>CLO</th></tr>
                                </thead>
                                <tbody>
                                    {previewData.map.mappings.map((m, i) => (
                                        <tr key={i}>
                                            <td style={{ fontWeight: '500' }}>{m.topic}</td>
                                            <td>{m.unit}</td>
                                            <td>{m.lectureNumber}</td>
                                            <td><span className="badge">CLO {m.cloMapping}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Maps Table */}
            <div className="card">
                {loading ? (
                    <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>
                ) : maps.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gray-500)' }}>
                        <p style={{ fontSize: '36px', margin: '0 0 12px' }}>📋</p>
                        <p style={{ fontWeight: '600', fontSize: '15px' }}>No syllabus maps uploaded yet.</p>
                        <p style={{ fontSize: '13px', marginTop: '4px' }}>Upload a Course Handout to get started with auto-filling questions.</p>
                    </div>
                ) : (
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Subject</th>
                                <th>Uploaded By</th>
                                <th>Last Updated</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {maps.map((map) => (
                                <tr key={map._id}>
                                    <td style={{ fontWeight: '600', color: 'var(--primary)' }}>{map.subject}</td>
                                    <td>
                                        <div style={{ fontSize: '13px' }}>
                                            <span style={{ fontFamily: 'monospace', color: 'var(--primary)', fontWeight: '600' }}>{map.createdBy?.memberId}</span>
                                            {isAdmin && map.createdBy?.name && (
                                                <div style={{ fontSize: '11px', color: 'var(--gray-500)', marginTop: '2px' }}>
                                                    {map.createdBy.name}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ fontSize: '13px', color: 'var(--gray-500)' }}>
                                        {new Date(map.updatedAt).toLocaleDateString()} {new Date(map.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </td>
                                    <td>
                                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(map._id)}>Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Upload Modal */}
            {showModal && (
                <div className="modal-backdrop" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
                        <div className="modal-header">
                            <h2 className="modal-title">
                                {modalMode === 'cho' ? '📄 Upload Course Handout (CHO)' : '📊 Upload CSV Map'}
                            </h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <form onSubmit={modalMode === 'cho' ? handleCHOUpload : handleCSVUpload}>
                            <div className="modal-body">
                                {modalMode === 'cho' ? (
                                    <>
                                        <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)', padding: '12px', borderRadius: '8px', fontSize: '13px', color: 'var(--gray-700)', marginBottom: '16px' }}>
                                            <strong>🤖 Smart Parsing:</strong> Upload your CHO document (.pdf or .docx) and the system will automatically extract the subject name, topics, units, lecture numbers, and CLO mappings.
                                        </div>
                                        <div className="form-group" style={{ marginBottom: '16px' }}>
                                            <label className="form-label">Subject Name <span style={{ fontSize: '11px', color: 'var(--gray-500)', fontWeight: 'normal' }}>(optional — auto-detected from CHO)</span></label>
                                            <input type="text" className="form-input"
                                                value={subject} onChange={(e) => setSubject(e.target.value)}
                                                placeholder="Leave blank to auto-detect from document" />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">CHO File (.pdf or .docx) *</label>
                                            <input type="file" accept=".pdf,.docx" required className="form-input"
                                                onChange={(e) => setFile(e.target.files[0])} />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.4)', padding: '12px', borderRadius: '8px', fontSize: '13px', color: 'var(--gray-700)', marginBottom: '16px' }}>
                                            <strong>Manual CSV:</strong> Upload a CSV where each row maps a <strong>Topic</strong> to its <strong>Unit</strong>, <strong>Lecture Number</strong>, and <strong>CLO</strong>.
                                        </div>
                                        <div className="form-group" style={{ marginBottom: '16px' }}>
                                            <label className="form-label">Subject Name *</label>
                                            <input type="text" className="form-input" required
                                                value={subject} onChange={(e) => setSubject(e.target.value)}
                                                placeholder="e.g., Advance Java Programming" />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">CSV File *</label>
                                            <input type="file" accept=".csv" required className="form-input"
                                                onChange={(e) => setFile(e.target.files[0])} />
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={uploading}
                                    style={modalMode === 'cho' ? { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none' } : {}}>
                                    {uploading ? '⏳ Processing...' : modalMode === 'cho' ? '🤖 Parse & Upload' : '📊 Upload'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SyllabusMaps;
