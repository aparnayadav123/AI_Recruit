import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import axios from 'axios';
import { useGoogleLogin } from '@react-oauth/google';
import { msalInstance, initializeMsal } from '../services/msal';
import { loginRequest } from '../authConfig';
import {
    Mail,
    Lock,
    User as UserIcon,
    AlertCircle,
    Eye,
    EyeOff,
    Sparkles,
    ArrowRight,
    Check,
} from 'lucide-react';

const SignUp: React.FC = () => {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // ---------------- client-side validation ----------------
    const passwordChecks = [
        { label: 'At least 6 characters', valid: password.length >= 6 },
        { label: 'Passwords match',       valid: password.length > 0 && password === confirmPassword },
    ];
    const emailValid = /^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email);
    const formValid = name.trim().length > 0 && emailValid && passwordChecks.every(c => c.valid);

    const extractErrorMessage = (err: any): string => {
        const data = err?.response?.data;
        if (!data) return err?.message || 'Registration failed. Please try again.';
        if (typeof data === 'string') return data;
        if (typeof data.message === 'string') return data.message;
        if (data.error) return String(data.error);
        return 'Registration failed. Please try again.';
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!formValid) {
            setError('Please fix the highlighted fields and try again.');
            return;
        }

        setIsLoading(true);
        try {
            const response = await api.post('/auth/register', { name, email, password });
            if (response.data) {
                navigate('/login', { state: { registrationSuccess: true } });
            }
        } catch (err: any) {
            setError(extractErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    };

    const handleSocialLogin = async (em: string, nm: string, provider: 'Google' | 'Outlook') => {
        setIsLoading(true);
        setError('');
        try {
            const response = await api.post('/auth/social-login', { email: em, name: nm, provider });
            if (response.data && response.data.token) {
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('user', JSON.stringify(response.data));
                navigate('/dashboard');
            }
        } catch (err: any) {
            console.error(`${provider} Login Error:`, err);
            setError(`${provider} sign-in failed: ${extractErrorMessage(err)}`);
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
                    const nm = userInfo.data.name || userInfo.data.email.split('@')[0];
                    await handleSocialLogin(userInfo.data.email, nm, 'Google');
                } else {
                    throw new Error('No email provided by Google');
                }
            } catch (e: any) {
                console.error('Google UserInfo Error:', e);
                setError(e?.message || 'Failed to fetch Google user information');
                setIsLoading(false);
            }
        },
        onError: (er) => {
            console.error('Google Login Error:', er);
            setError(`Google sign-in failed: ${er.error_description || 'Unknown error'}`);
        },
    });

    const loginOutlook = async () => {
        setIsLoading(true);
        setError('');
        try {
            await initializeMsal();
            const response = await msalInstance.loginPopup({ ...loginRequest, prompt: 'select_account' });
            if (response && response.account) {
                const em = response.account.username
                    || (response.idTokenClaims as any)?.email
                    || (response.idTokenClaims as any)?.preferred_username;
                if (!em) {
                    setError('Could not retrieve email from Outlook account.');
                    return;
                }
                handleSocialLogin(em, response.account.name || 'Outlook User', 'Outlook');
            }
        } catch (e: any) {
            console.error('Outlook Login Error:', e);
            if (e.name === 'BrowserAuthError' || e.code === 'interaction_in_progress') {
                setError('Sign-in interaction is already in progress. Refresh and try again.');
                Object.keys(sessionStorage).forEach(key => {
                    if (key.includes('msal.interaction.status')) sessionStorage.removeItem(key);
                });
            } else {
                setError('Microsoft sign-in failed. ' + (e.message || ''));
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-slate-50 select-none relative overflow-hidden">
            {/* Subtle ambient gradient — same as the SignIn page */}
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
                    <div className="mb-7 text-center">
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-1.5">
                            Create your account
                        </h1>
                        <p className="text-sm text-slate-600 font-medium">
                            Start hiring smarter in under a minute
                        </p>
                    </div>

                    {error && (
                        <div className="mb-5 p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2 animate-slide-down">
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                            <p className="text-xs text-rose-800 font-semibold leading-relaxed">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleRegister} className="space-y-4">
                        {/* Name */}
                        <div>
                            <label htmlFor="su-name" className="block text-xs font-bold text-slate-700 mb-1.5">Full Name</label>
                            <div className="relative">
                                <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                <input
                                    id="su-name"
                                    type="text"
                                    required
                                    autoComplete="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Aparna Boligerla"
                                    className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 font-semibold placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 outline-none transition-all"
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div>
                            <label htmlFor="su-email" className="block text-xs font-bold text-slate-700 mb-1.5">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                <input
                                    id="su-email"
                                    type="email"
                                    required
                                    autoComplete="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@company.com"
                                    className={`w-full pl-10 pr-3 py-2.5 bg-white border rounded-lg text-sm text-slate-900 font-semibold placeholder:text-slate-400 focus:ring-2 outline-none transition-all ${
                                        email.length === 0
                                            ? 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-500/15'
                                            : emailValid
                                                ? 'border-emerald-300 focus:border-emerald-500 focus:ring-emerald-500/15'
                                                : 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/15'
                                    }`}
                                />
                            </div>
                            {email.length > 0 && !emailValid && (
                                <p className="text-[10px] font-semibold text-rose-600 mt-1">Please enter a valid email address.</p>
                            )}
                        </div>

                        {/* Password */}
                        <div>
                            <label htmlFor="su-pwd" className="block text-xs font-bold text-slate-700 mb-1.5">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                <input
                                    id="su-pwd"
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    autoComplete="new-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="At least 6 characters"
                                    className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 font-semibold placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 outline-none transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors p-1"
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label htmlFor="su-pwd2" className="block text-xs font-bold text-slate-700 mb-1.5">Confirm Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                <input
                                    id="su-pwd2"
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    required
                                    autoComplete="new-password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Re-enter your password"
                                    className={`w-full pl-10 pr-10 py-2.5 bg-white border rounded-lg text-sm text-slate-900 font-semibold placeholder:text-slate-400 focus:ring-2 outline-none transition-all ${
                                        confirmPassword.length === 0
                                            ? 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-500/15'
                                            : password === confirmPassword
                                                ? 'border-emerald-300 focus:border-emerald-500 focus:ring-emerald-500/15'
                                                : 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/15'
                                    }`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors p-1"
                                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Live password rules — fade in only when user starts typing */}
                        {password.length > 0 && (
                            <ul className="space-y-1 pt-1">
                                {passwordChecks.map((c, i) => (
                                    <li key={i} className="flex items-center gap-1.5 text-xs">
                                        <span
                                            className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-colors ${
                                                c.valid ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'
                                            }`}
                                        >
                                            <Check className="w-2.5 h-2.5" strokeWidth={3} />
                                        </span>
                                        <span className={`font-semibold ${c.valid ? 'text-emerald-700' : 'text-slate-500'}`}>
                                            {c.label}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isLoading || !formValid}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 mt-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg shadow-md shadow-indigo-600/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-indigo-600"
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Creating account…
                                </>
                            ) : (
                                <>
                                    Create account
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="my-6 flex items-center gap-3">
                        <div className="flex-1 h-px bg-slate-200" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">or sign up with</span>
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

                {/* Sign in + legal */}
                <p className="text-center text-sm text-slate-600 font-medium mt-6">
                    Already have an account?{' '}
                    <Link to="/login" className="text-indigo-600 hover:text-indigo-700 font-bold transition-colors">
                        Sign in
                    </Link>
                </p>
                <p className="text-center text-xs text-slate-400 mt-6 leading-relaxed">
                    By creating an account you agree to our{' '}
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

export default SignUp;
