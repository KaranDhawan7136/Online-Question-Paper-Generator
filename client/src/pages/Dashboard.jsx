import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { questionsAPI, papersAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import AdminPanel from '../components/AdminPanel';

const Dashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [papers, setPapers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [statsRes, papersRes] = await Promise.all([
                questionsAPI.getStats(),
                papersAPI.getAll()
            ]);
            setStats(statsRes.data);
            setPapers(papersRes.data.slice(0, 5));
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
            </div>
        );
    }



    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Dashboard</h1>
                    <p className="page-subtitle">Overview of your question bank and papers</p>
                </div>
                <Link to="/generate" className="btn btn-primary">
                    + Generate New Paper
                </Link>
            </div>

            {/* Admin Panel */}
            {user?.role === 'admin' && <AdminPanel />}

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon primary">📚</div>
                    <div>
                        <div className="stat-value">{stats?.total || 0}</div>
                        <div className="stat-label">Total Questions</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon success">📄</div>
                    <div>
                        <div className="stat-value">{papers.length}</div>
                        <div className="stat-label">Papers Generated</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon warning">📊</div>
                    <div>
                        <div className="stat-value">{stats?.bySubject?.length || 0}</div>
                        <div className="stat-label">Subjects</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon danger">🎯</div>
                    <div>
                        <div className="stat-value">{stats?.byDifficulty?.find(d => d._id === 'Hard')?.count || 0}</div>
                        <div className="stat-label">Hard Questions</div>
                    </div>
                </div>
            </div>



            <div className="card" style={{ marginTop: '24px' }}>
                <div className="card-header">
                    <h3 className="card-title">Recent Papers</h3>
                    <Link to="/papers" className="btn btn-secondary btn-sm">View All</Link>
                </div>
                {papers.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">📝</div>
                        <div className="empty-state-title">No papers yet</div>
                        <p>Generate your first question paper to see it here.</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Title</th>
                                    <th>Subject</th>
                                    <th>Marks</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {papers.map(paper => (
                                    <tr key={paper._id}>
                                        <td>{paper.title}</td>
                                        <td>{paper.subject}</td>
                                        <td>{paper.totalMarks}</td>
                                        <td>{new Date(paper.createdAt).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
