import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { msalInstance, initializeMsal } from '../services/msal';
import { loginRequest } from '../authConfig';
import api from '../api';
import axios from 'axios';
import {
    Mail,
    Lock,
    AlertCircle,
    CheckCircle2,
    ArrowRight,
    Eye,
    EyeOff,
    Sparkles,
} from 'lucide-react';

const SignIn: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        if (location.state && (location.state as any).registrationSuccess) {
            setSuccessMessage('Account created successfully. Please sign in.');
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const response = await api.post('/auth/login', { email, password });
            if (response.data && response.data.token) {
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('user', JSON.stringify(response.data));
                navigate('/dashboard');
            }
        } catch (err: any) {
            if (err.response && err.response.data) {
                setError(err.response.data.message || err.response.data);
            } else {
                setError('Invalid credentials or server error.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleSocialLogin = async (email: string, name: string, provider: 'Google' | 'Outlook') => {
        setIsLoading(true);
        setError('');
        try {
            const response = await api.post('/auth/social-login', { email, name, provider });
            if (response.data && response.data.token) {
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('user', JSON.stringify(response.data));
                navigate('/dashboard');
            }
        } catch (err: any) {
            console.error(`${provider} Login Error:`, err);
            const message = err.response?.data?.message || err.response?.data || err.message || 'Unknown error';
            setError(`${provider} Login Failed: ${message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const loginGoogle = useGoogleLogin({
        flow: 'implicit',
        onSuccess: async (tokenResponse) => {
            try {
                const userInfo = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
                });
                if (userInfo.data.email) {
                    const name = userInfo.data.name || userInfo.data.email.split('@')[0];
                    await handleSocialLogin(userInfo.data.email, name, 'Google');
                } else {
                    throw new Error('No email provided by Google');
                }
            } catch (error: any) {
                console.error('Google UserInfo Error:', error);
                setError(error.response?.data?.error || error.message || 'Failed to fetch Google user information');
                setIsLoading(false);
            }
        },
        onError: (errorResponse) => {
            console.error('Google Login Error:', errorResponse);
            setError(`Google Login Failed: ${errorResponse.error_description || 'Unknown error'}`);
        },
    });

    const loginOutlook = async () => {
        setIsLoading(true);
        setError('');
        try {
            await initializeMsal();
            const response = await msalInstance.loginPopup({ ...loginRequest, prompt: 'select_account' });
            if (response && response.account) {
                const email = response.account.username
                    || (response.idTokenClaims as any)?.email
                    || (response.idTokenClaims as any)?.preferred_username;
                if (!email) {
                    setError('Could not retrieve email from Outlook account.');
                    return;
                }
                handleSocialLogin(email, response.account.name || 'Outlook User', 'Outlook');
            }
        } catch (e: any) {
            console.error('Outlook Login Error:', e);
            if (e.name === 'BrowserAuthError' || e.code === 'interaction_in_progress') {
                setError('Sign-in interaction is already in progress. Refresh the page and try again.');
                Object.keys(sessionStorage).forEach(key => {
                    if (key.includes('msal.interaction.status')) sessionStorage.removeItem(key);
                });
            } else {
                setError('Microsoft Sign-In Failed. ' + (e.message || ''));
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-slate-50 select-none relative overflow-hidden">
            {/* Very subtle ambient glow — keeps the background from feeling flat */}
            <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[60rem] h-[40rem] bg-indigo-100/40 rounded-full blur-3xl opacity-70" />
            <div className="pointer-events-none absolute bottom-0 right-0 w-[30rem] h-[30rem] bg-blue-100/40 rounded-full blur-3xl opacity-60" />

            <div className="relative w-full max-w-sm">
                {/* Brand mark */}
                <div className="flex items-center justify-center gap-2 mb-8">
                    <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-md shadow-indigo-600/25">
                        <Sparkles className="w-5 h-5" />
                    </div>
                    <span className="text-xl font-black tracking-tight text-slate-900">Recruit AI</span>
                </div>

                {/* Card */}
                <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-200 p-8">
                    {/* Header */}
                    <div className="mb-7 text-center">
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-1.5">
                            Welcome back
                        </h1>
                        <p className="text-sm text-slate-600 font-medium">
                            Sign in to continue to your dashboard
                        </p>
                    </div>

                    {/* Status banners */}
                    {successMessage && (
                        <div className="mb-5 p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start gap-2 animate-slide-down">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            <p className="text-xs text-emerald-800 font-semibold leading-relaxed">{successMessage}</p>
                        </div>
                    )}
                    {error && (
                        <div className="mb-5 p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2 animate-slide-down">
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                            <p className="text-xs text-rose-800 font-semibold leading-relaxed">{error}</p>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-xs font-bold text-slate-700 mb-1.5">
                                Email
                            </label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                                    <Mail className="w-4 h-4 text-slate-400" />
                                </span>
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@company.com"
                                    className="w-full h-11 pl-10 pr-3 bg-white border border-slate-300 rounded-lg text-sm leading-none text-slate-900 font-semibold placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label htmlFor="password" className="block text-xs font-bold text-slate-700">
                                    Password
                                </label>
                                <a
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        alert("Password reset isn't available yet. Please contact your administrator.");
                                    }}
                                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                                >
                                    Forgot?
                                </a>
                            </div>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                                    <Lock className="w-4 h-4 text-slate-400" />
                                </span>
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    className="w-full h-11 pl-10 pr-10 bg-white border border-slate-300 rounded-lg text-sm leading-none text-slate-900 font-semibold placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 outline-none transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-700 transition-colors"
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            id="login-submit-button"
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 mt-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg shadow-md shadow-indigo-600/20 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Signing in…
                                </>
                            ) : (
                                <>
                                    Sign in
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="my-6 flex items-center gap-3">
                        <div className="flex-1 h-px bg-slate-200" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">or</span>
                        <div className="flex-1 h-px bg-slate-200" />
                    </div>

                    {/* Social */}
                    <div className="grid grid-cols-2 gap-2.5">
                        <button
                            onClick={() => loginGoogle()}
                            disabled={isLoading}
                            className="flex items-center justify-center gap-2 px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 48 48" aria-hidden="true">
                                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
                                <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.6 16 18.9 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                                <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.4-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
                                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C41.4 35 44 30 44 24c0-1.3-.1-2.4-.4-3.5z" />
                            </svg>
                            Google
                        </button>
                        <button
                            onClick={loginOutlook}
                            disabled={isLoading}
                            className="flex items-center justify-center gap-2 px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                                <rect x="1"  y="1"  width="10" height="10" fill="#F25022" />
                                <rect x="13" y="1"  width="10" height="10" fill="#7FBA00" />
                                <rect x="1"  y="13" width="10" height="10" fill="#00A4EF" />
                                <rect x="13" y="13" width="10" height="10" fill="#FFB900" />
                            </svg>
                            Outlook
                        </button>
                    </div>
                </div>

                {/* Sign up + legal — outside the card, premium-spaced */}
                <p className="text-center text-sm text-slate-600 font-medium mt-6">
                    Don't have an account?{' '}
                    <Link
                        to="/signup"
                        className="text-indigo-600 hover:text-indigo-700 font-bold transition-colors"
                    >
                        Create one
                    </Link>
                </p>
                <p className="text-center text-xs text-slate-400 mt-6 leading-relaxed">
                    By continuing you agree to our{' '}
                    <a href="#" onClick={(e) => { e.preventDefault(); alert('This document is not available in the demo.'); }} className="text-slate-600 hover:text-slate-900 font-semibold">Terms</a>
                    {' '}and{' '}
                    <a href="#" onClick={(e) => { e.preventDefault(); alert('This document is not available in the demo.'); }} className="text-slate-600 hover:text-slate-900 font-semibold">Privacy Policy</a>.
                </p>
            </div>

            <style>{`
                @keyframes slide-down {
                    from { opacity: 0; transform: translateY(-6px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .animate-slide-down { animation: slide-down 0.25s cubic-bezier(0.16, 1, 0.3, 1); }
            `}</style>
        </div>
    );
};

export default SignIn;
