import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Layout = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="app-container">
            <aside className="sidebar">
                <div className="sidebar-header">
                    <div className="sidebar-logo">📝</div>
                    <div>
                        <div className="sidebar-title">QP Generator</div>
                        <div className="sidebar-subtitle">{user?.role || 'Faculty'}</div>
                    </div>
                </div>

                <nav>
                    <ul className="nav-menu">
                        <li className="nav-item">
                            <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="3" width="7" height="7" rx="1" />
                                    <rect x="14" y="3" width="7" height="7" rx="1" />
                                    <rect x="3" y="14" width="7" height="7" rx="1" />
                                    <rect x="14" y="14" width="7" height="7" rx="1" />
                                </svg>
                                Dashboard
                            </NavLink>
                        </li>
                        <li className="nav-item">
                            <NavLink to="/questions" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
                                    <rect x="9" y="3" width="6" height="4" rx="1" />
                                    <path d="M9 12h6M9 16h6" />
                                </svg>
                                Question Bank
                            </NavLink>
                        </li>
                        <li className="nav-item">
                            <NavLink to="/generate" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                                </svg>
                                Generate Paper
                            </NavLink>
                        </li>
                        <li className="nav-item">
                            <NavLink to="/papers" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                                    <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                                </svg>
                                My Papers
                            </NavLink>
                        </li>
                    </ul>
                </nav>

                <div style={{ marginTop: 'auto', paddingTop: '24px', borderTop: '1px solid var(--gray-700)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: 'var(--gradient-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '16px',
                            fontWeight: '600'
                        }}>
                            {user?.name?.charAt(0) || 'U'}
                        </div>
                        <div>
                            <div style={{ fontSize: '14px', fontWeight: '600' }}>{user?.name || 'User'}</div>
                            <div style={{ fontSize: '12px', color: 'var(--gray-400)' }}>{user?.email}</div>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="btn btn-secondary"
                        style={{ width: '100%' }}
                    >
                        Logout
                    </button>
                </div>
            </aside>

            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;
