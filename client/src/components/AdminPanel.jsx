import { useState, useEffect } from 'react';
import { adminAPI } from '../utils/api';
import toast from 'react-hot-toast';

const AdminPanel = () => {
    const [pendingUsers, setPendingUsers] = useState([]);
    const [accessCode, setAccessCode] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [usersRes, configRes] = await Promise.all([
                adminAPI.getPendingUsers(),
                adminAPI.getAccessCode()
            ]);
            setPendingUsers(usersRes.data);
            setAccessCode(configRes.data.accessCode);
        } catch (error) {
            console.error('Failed to load admin data', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id) => {
        try {
            await adminAPI.approveUser(id);
            toast.success('User approved!');
            fetchData();
        } catch (error) {
            toast.error('Failed to approve user');
        }
    };

    const handleReject = async (id) => {
        if (window.confirm('Are you sure you want to reject and remove this user?')) {
            try {
                await adminAPI.rejectUser(id);
                toast.success('User rejected');
                fetchData();
            } catch (error) {
                toast.error('Failed to reject user');
            }
        }
    };

    const handleUpdateCode = async () => {
        try {
            await adminAPI.updateAccessCode(accessCode);
            toast.success('Access code updated!');
        } catch (error) {
            toast.error('Failed to update access code');
        }
    };

    if (loading) return <div>Loading admin panel...</div>;

    return (
        <div className="card" style={{ marginTop: '24px', border: '1px solid var(--primary)' }}>
            <div className="card-header" style={{ borderBottom: '1px solid var(--gray-200)', background: '#eff6ff' }}>
                <h3 className="card-title" style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🛡️ Admin Panel
                </h3>
            </div>

            <div style={{ padding: '20px' }}>
                {/* Access Code Management */}
                <div style={{ marginBottom: '32px' }}>
                    <h4 style={{ marginBottom: '12px', fontSize: '16px' }}>🔑 Registration Access Code</h4>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <input
                            type="text"
                            className="form-input"
                            style={{ maxWidth: '300px' }}
                            value={accessCode}
                            onChange={(e) => setAccessCode(e.target.value)}
                        />
                        <button className="btn btn-primary" onClick={handleUpdateCode}>Update Code</button>
                    </div>
                </div>

                {/* Pending Approvals */}
                <div>
                    <h4 style={{ marginBottom: '12px', fontSize: '16px' }}>
                        👥 Pending User Approvals ({pendingUsers.length})
                    </h4>
                    {pendingUsers.length === 0 ? (
                        <p style={{ color: 'var(--gray-500)', fontStyle: 'italic' }}>No pending approvals.</p>
                    ) : (
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Role</th>
                                        <th>Registered</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pendingUsers.map(user => (
                                        <tr key={user._id}>
                                            <td>{user.name}</td>
                                            <td>{user.email}</td>
                                            <td><span className="badge">{user.role}</span></td>
                                            <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                                            <td>
                                                <button
                                                    className="btn btn-sm btn-primary"
                                                    style={{ marginRight: '8px', background: '#10b981', borderColor: '#10b981' }}
                                                    onClick={() => handleApprove(user._id)}
                                                >
                                                    Approve
                                                </button>
                                                <button
                                                    className="btn btn-sm btn-danger"
                                                    onClick={() => handleReject(user._id)}
                                                >
                                                    Reject
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
    );
};

export default AdminPanel;
