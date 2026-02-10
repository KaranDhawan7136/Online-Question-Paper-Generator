import { useState, useEffect } from 'react';
import { papersAPI } from '../utils/api';
import toast from 'react-hot-toast';

const Papers = () => {
    const [papers, setPapers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchPapers(); }, []);

    const fetchPapers = async () => {
        try {
            const res = await papersAPI.getAll();
            setPapers(res.data);
        } catch (error) {
            toast.error('Failed to fetch papers');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (paper, type) => {
        try {
            const response = await papersAPI.downloadPDF(paper._id, type);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${paper.title.replace(/\s/g, '_')}_${type}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('PDF downloaded!');
        } catch (error) {
            toast.error('Download failed');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this paper?')) return;
        try {
            await papersAPI.delete(id);
            toast.success('Paper deleted');
            fetchPapers();
        } catch (error) {
            toast.error('Failed to delete');
        }
    };

    if (loading) {
        return <div className="loading-container"><div className="spinner"></div></div>;
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">My Papers</h1>
                    <p className="page-subtitle">View and download your generated papers</p>
                </div>
            </div>

            {papers.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-state-icon">📄</div>
                        <div className="empty-state-title">No papers yet</div>
                        <p>Generate your first question paper to see it here.</p>
                    </div>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '20px' }}>
                    {papers.map(paper => (
                        <div key={paper._id} className="card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>{paper.title}</h3>
                                    <div style={{ display: 'flex', gap: '16px', color: 'var(--gray-500)', fontSize: '14px' }}>
                                        <span>📚 {paper.subject}</span>
                                        <span>📝 {paper.totalMarks} marks</span>
                                        <span>⏱️ {paper.duration} min</span>
                                        <span>❓ {paper.questions?.length || 0} questions</span>
                                    </div>
                                    <div style={{ marginTop: '8px', color: 'var(--gray-400)', fontSize: '13px' }}>
                                        Created: {new Date(paper.createdAt).toLocaleString()}
                                    </div>
                                </div>
                                <div className="actions">
                                    <button className="btn btn-primary btn-sm" onClick={() => handleDownload(paper, 'question_paper')}>
                                        📄 Paper PDF
                                    </button>
                                    <button className="btn btn-success btn-sm" onClick={() => handleDownload(paper, 'summary')}>
                                        📊 Summary PDF
                                    </button>
                                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(paper._id)}>
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Papers;
