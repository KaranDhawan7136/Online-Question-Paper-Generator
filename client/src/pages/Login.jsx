import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const Login = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'faculty'
    });

    const { login, register } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isLogin) {
                await login(formData.email, formData.password);
                toast.success('Welcome back!');
                navigate('/');
            } else {
                const res = await register(formData);
                if (res.requiresApproval) {
                    toast.success('Registration successful. Please wait for Admin approval.');
                    // Do not navigate, let them see the message
                    setFormData({ ...formData, role: 'faculty' }); // Reset form slightly
                } else {
                    toast.success('Account created successfully!');
                    navigate('/');
                }
            }
        } catch (error) {
            toast.error(error.response?.data?.error || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <div className="login-logo">📝</div>
                    <h1 className="login-title">Question Paper Generator</h1>
                    <p className="login-subtitle">
                        {isLogin ? 'Sign in to your account' : 'Create a new account'}
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    {!isLogin && (
                        <div className="form-group">
                            <label className="form-label">Full Name</label>
                            <input
                                type="text"
                                name="name"
                                className="form-input"
                                placeholder="Enter your name"
                                value={formData.name}
                                onChange={handleChange}
                                required={!isLogin}
                            />
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label">Email Address</label>
                        <input
                            type="email"
                            name="email"
                            className="form-input"
                            placeholder="Enter your email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input
                            type="password"
                            name="password"
                            className="form-input"
                            placeholder="Enter your password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            minLength={6}
                        />
                        {isLogin && (
                            <button
                                type="button"
                                onClick={() => {
                                    const email = formData.email;
                                    if (!email) return toast.error('Enter your email first');
                                    import('../utils/api').then(({ authAPI }) => {
                                        authAPI.forgotPassword(email).then(res => {
                                            toast.success('Check the server console for reset link!');
                                            if (res.data.devResetUrl) {
                                                console.log('Reset URL:', res.data.devResetUrl);
                                            }
                                        }).catch(() => toast.error('Failed to send reset'));
                                    });
                                }}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--primary)',
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    marginTop: '8px',
                                    padding: 0
                                }}
                            >
                                Forgot Password?
                            </button>
                        )}
                    </div>

                    {!isLogin && (
                        <>
                            <div className="form-group">
                                <label className="form-label">Role</label>
                                <select
                                    name="role"
                                    className="form-select"
                                    value={formData.role}
                                    onChange={handleChange}
                                >
                                    <option value="faculty">Faculty</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Access Code (Admin Permission)</label>
                                <input
                                    type="password"
                                    name="accessCode"
                                    className="form-input"
                                    placeholder="Enter Access Code"
                                    value={formData.accessCode || ''}
                                    onChange={handleChange}
                                    required={!isLogin}
                                />
                            </div>
                        </>
                    )}

                    <button
                        type="submit"
                        className="btn btn-primary btn-lg"
                        style={{ width: '100%', marginTop: '16px' }}
                        disabled={loading}
                    >
                        {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
                    </button>
                </form>

                <p style={{ textAlign: 'center', marginTop: '24px', color: 'var(--gray-500)' }}>
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--primary)',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}
                    >
                        {isLogin ? 'Sign Up' : 'Sign In'}
                    </button>
                </p>
            </div>
        </div>
    );
};

export default Login;
