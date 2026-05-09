import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const Login = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'faculty'
    });

    const { login, register, googleLogin } = useAuth();
    const navigate = useNavigate();
    const googleBtnRef = useRef(null);

    const handleGoogleResponse = useCallback(async (response) => {
        setLoading(true);
        try {
            const res = await googleLogin(response.credential);
            if (res.requiresApproval) {
                toast.success('Registration successful! Please wait for Admin approval before logging in.', { duration: 5000 });
            } else if (res.user) {
                toast.success('Welcome!');
                navigate('/');
            }
        } catch (error) {
            const msg = error.response?.data?.error || 'Google sign-in failed';
            if (error.response?.data?.requiresApproval) {
                toast.success('Your account is pending admin approval.', { duration: 5000 });
            } else {
                toast.error(msg);
            }
        } finally {
            setLoading(false);
        }
    }, [googleLogin, navigate]);

    useEffect(() => {
        if (!GOOGLE_CLIENT_ID) return;

        const initGoogle = () => {
            if (window.google?.accounts?.id) {
                window.google.accounts.id.initialize({
                    client_id: GOOGLE_CLIENT_ID,
                    callback: handleGoogleResponse,
                    auto_select: false
                });
                if (googleBtnRef.current) {
                    window.google.accounts.id.renderButton(googleBtnRef.current, {
                        theme: 'outline',
                        size: 'large',
                        width: '100%',
                        text: 'signin_with',
                        shape: 'rectangular',
                        logo_alignment: 'center'
                    });
                }
            }
        };

        // GSI script may load async — retry if not ready
        if (window.google?.accounts?.id) {
            initGoogle();
        } else {
            const interval = setInterval(() => {
                if (window.google?.accounts?.id) {
                    clearInterval(interval);
                    initGoogle();
                }
            }, 200);
            return () => clearInterval(interval);
        }
    }, [handleGoogleResponse]);

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
                    toast.success('Registration successful! Please wait for Admin approval before logging in.', { duration: 5000 });
                    // Switch to login view so user is directed to sign in
                    setIsLogin(true);
                    setFormData({ name: '', email: formData.email, password: '', role: 'faculty', accessCode: '' });
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

                {/* Google Sign-In Button */}
                {GOOGLE_CLIENT_ID && (
                    <>
                        <div
                            ref={googleBtnRef}
                            id="google-signin-btn"
                            style={{
                                display: 'flex',
                                justifyContent: 'center',
                                marginBottom: '8px'
                            }}
                        ></div>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            margin: '16px 0',
                            color: 'var(--gray-400)',
                            fontSize: '13px'
                        }}>
                            <div style={{ flex: 1, height: '1px', background: 'var(--gray-200)' }}></div>
                            <span>or</span>
                            <div style={{ flex: 1, height: '1px', background: 'var(--gray-200)' }}></div>
                        </div>
                    </>
                )}

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
