/**
 * Login Page
 * 
 * Authentication page for sign in and sign up.
 */

import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider';

type AuthMode = 'login' | 'signup';

export function LoginPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { signIn, signUp } = useAuth();

    const [mode, setMode] = useState<AuthMode>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    // Get the redirect path from location state, or default to /recipes
    const from = (location.state as { from?: Location })?.from?.pathname || '/recipes';

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setMessage(null);
        setLoading(true);

        try {
            if (mode === 'signup') {
                const { error } = await signUp(email, password);
                if (error) {
                    setError(error.message);
                } else {
                    setMessage('Check your email for the confirmation link!');
                    setMode('login');
                }
            } else {
                const { error } = await signIn(email, password);
                if (error) {
                    setError(error.message);
                } else {
                    navigate(from, { replace: true });
                }
            }
        } catch (err) {
            setError('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <img
                    src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSFgwa2LDCSHruoAqzMuprzbc8sirba_1HSdA&s"
                    alt="Meal Planner Logo"
                    className="app-logo login-logo"
                />
                <h1>Meal Planner</h1>
                <h2>{mode === 'login' ? 'Sign In' : 'Create Account'}</h2>

                {error && <div className="form-error">{error}</div>}
                {message && <div className="form-success">{message}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            minLength={6}
                        />
                    </div>

                    <button type="submit" className="btn-submit" disabled={loading}>
                        {loading
                            ? 'Loading...'
                            : mode === 'login'
                                ? 'Sign In'
                                : 'Create Account'}
                    </button>
                </form>

                <div className="auth-toggle">
                    {mode === 'login' ? (
                        <p>
                            Don't have an account?{' '}
                            <button type="button" onClick={() => setMode('signup')}>
                                Sign up
                            </button>
                        </p>
                    ) : (
                        <p>
                            Already have an account?{' '}
                            <button type="button" onClick={() => setMode('login')}>
                                Sign in
                            </button>
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
