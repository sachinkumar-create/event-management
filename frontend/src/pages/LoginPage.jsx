import { useState } from 'react';
import { Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { loginUser } from '../services/api';
import { BsShieldLock } from 'react-icons/bs';

export default function LoginPage() {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await loginUser(email, password);
            login(res.data.token, res.data.user, res.data.pendingInvite);
        } catch (err) {
            console.error('Login Error Object:', err);
            const msg = err.response?.data?.error || err.message || 'Login failed. Check console.';
            setError(msg);
            if (err.message === 'Network Error') {
                setError('Network Error: Cannot connect to backend. Check CORS headers in db.php and verify URL.');
            }
        }
        setLoading(false);
    };

    return (
        <div className="login-page d-flex align-items-center justify-content-center vh-100">
            <div className="login-card p-5">
                <div className="text-center mb-4">
                    <div className="logo-icon">
                        <BsShieldLock />
                    </div>
                    <h3 style={{ fontWeight: 800, color: 'var(--text-primary)' }}>EventHub</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Event Management System</p>
                </div>

                {error && <Alert variant="danger" className="py-2" style={{ fontSize: '0.85rem', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>{error}</Alert>}

                <Form onSubmit={handleSubmit}>
                    <Form.Group className="mb-3">
                        <Form.Label>Email</Form.Label>
                        <Form.Control
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="admin@event.com"
                            required
                            className="form-control-dark"
                        />
                    </Form.Group>
                    <Form.Group className="mb-4">
                        <Form.Label>Password</Form.Label>
                        <Form.Control
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            className="form-control-dark"
                        />
                    </Form.Group>
                    <Button type="submit" className="btn-accent w-100 py-2" disabled={loading}>
                        {loading ? <Spinner size="sm" /> : 'Sign In'}
                    </Button>
                </Form>

                <div className="mt-4 text-center" style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    <p className="mb-1" style={{ fontWeight: 600 }}>Demo Accounts</p>
                    <p className="mb-0" style={{ color: 'var(--text-muted)' }}>
                        admin@example.com
                    </p>
                    <p className="mb-0" style={{ color: 'var(--text-muted)' }}>Password: <code style={{ color: 'var(--accent)', background: 'rgba(139,92,246,0.1)', padding: '2px 6px', borderRadius: 4 }}>admin123</code></p>
                </div>
            </div>
        </div>
    );
}
