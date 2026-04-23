import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { msalInstance, initializeMsal } from '../services/msal';
import { loginRequest } from "../authConfig";
import api from '../api';
import axios from 'axios';
import { Mail, Lock, AlertCircle, CheckCircle, ArrowRight, Sparkles, Eye, EyeOff } from 'lucide-react';

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
        if (location.state && location.state.registrationSuccess) {
            setSuccessMessage('Account created successfully! Please sign in.');
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await api.post('/auth/login', {
                email,
                password
            });

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
            const response = await api.post('/auth/social-login', {
                email,
                name,
                provider
            });

            if (response.data && response.data.token) {
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('user', JSON.stringify(response.data));
                navigate('/dashboard');
            }
        } catch (err: any) {
            console.error(`${provider} Login Error:`, err);
            const message = err.response?.data?.message || err.response?.data || err.message || "Unknown error";
            setError(`${provider} Login Failed: ${message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const loginGoogle = useGoogleLogin({
        flow: 'implicit',
        onSuccess: async (tokenResponse) => {
            try {
                const userInfo = await axios.get(
                    'https://www.googleapis.com/oauth2/v3/userinfo',
                    { headers: { Authorization: `Bearer ${tokenResponse.access_token}` } }
                );

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
        }
    });

    const loginOutlook = async () => {
        setIsLoading(true);
        setError('');
        try {
            await initializeMsal();

            const response = await msalInstance.loginPopup({
                ...loginRequest,
                prompt: 'select_account' 
            });

            if (response && response.account) {
                const email = response.account.username ||
                    (response.idTokenClaims as any)?.email ||
                    (response.idTokenClaims as any)?.preferred_username;

                if (!email) {
                    setError("Could not retrieve email from Outlook account.");
                    return;
                }

                handleSocialLogin(
                    email,
                    response.account.name || 'Outlook User',
                    'Outlook'
                );
            }
        } catch (e: any) {
            console.error("Outlook Login Error:", e);
            if (e.name === "BrowserAuthError" || e.code === "interaction_in_progress") {
                setError("Sign-in interaction is already in progress. If no popup appeared, please refresh the page or clear your browser storage.");
                // Try to clear stuck interaction flags from storage
                Object.keys(sessionStorage).forEach(key => {
                    if (key.includes('msal.interaction.status')) sessionStorage.removeItem(key);
                });
            } else {
                setError("Microsoft Sign-In Failed. " + (e.message || ""));
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-screen flex overflow-hidden bg-slate-950 select-none">
            {/* Left Side - Logo & Branding */}
            <div className="hidden lg:flex lg:w-5/12 bg-gradient-to-br from-indigo-600 via-purple-700 to-indigo-900 items-center justify-center p-12 relative overflow-hidden">
                {/* Animated Background Elements */}
                <div className="absolute inset-0">
                    <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute bottom-20 right-20 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                </div>

                <div className="relative z-10 w-full max-w-xl px-8">
                    <div className="flex flex-col items-center">
                        <div className="flex items-center gap-4 mb-6 transform hover:scale-105 transition-all duration-500">
                            <div className="p-4 bg-white/10 backdrop-blur-3xl rounded-3xl border-2 border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
                                <img src="./recruitai-logo.png" alt="RecruitAI" className="h-14 w-auto brightness-110" onError={(e) => {
                                    (e.target as HTMLImageElement).src = "https://img.icons8.com/isometric/512/group-task.png";
                                }} />
                            </div>
                            <div className="text-left border-l-4 border-white/20 pl-4">
                                <h2 className="text-5xl font-black text-white tracking-tighter flex items-center gap-2">
                                    Recruit AI
                                    <Sparkles className="w-10 h-10 text-yellow-400 fill-yellow-400 animate-pulse" />
                                </h2>
                                <p className="text-indigo-100/80 text-xl font-bold tracking-widest uppercase opacity-90 leading-none">
                                    Intelligent Hiring
                                </p>
                            </div>
                        </div>
                        <div className="w-32 h-1.5 bg-white/20 rounded-full mb-8"></div>
                        <p className="text-indigo-100/70 text-lg font-medium max-w-sm mx-auto text-center leading-relaxed">
                            Empowering teams with the next generation of <span className="text-white font-black underline decoration-indigo-400 underline-offset-4">AI-driven</span> recruitment automation.
                        </p>
                    </div>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="flex-1 flex items-center justify-center p-8 bg-[#0a0a0c]">
                <div className="w-full max-w-md">
                    {/* Header */}
                    <div className="text-center mb-10">
                        <h1 className="text-5xl font-black text-white tracking-tight mb-3">
                            Welcome Back
                        </h1>
                        <p className="text-slate-400 font-medium text-lg">Enter your credentials to continue</p>
                    </div>

                    {/* Card with Glassmorphism */}
                    <div className="bg-slate-900/40 backdrop-blur-2xl rounded-3xl border border-slate-800 p-8 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-600/10 opacity-20 rounded-full -mr-24 -mt-24 blur-3xl group-hover:bg-indigo-600/20 transition-all duration-700"></div>
                        
                        {/* Messages */}
                        {successMessage && (
                            <div className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3 animate-slide-down">
                                <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-emerald-200 font-medium">{successMessage}</p>
                            </div>
                        )}

                        {error && (
                            <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 animate-slide-down">
                                <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-rose-200 font-medium leading-relaxed">{error}</p>
                            </div>
                        )}

                        {/* Form */}
                        <form onSubmit={handleLogin} className="space-y-6">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Email Address</label>
                                <div className="group flex items-center w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-5 py-4 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all duration-300">
                                    <Mail className="w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors flex-shrink-0" />
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-transparent border-none focus:ring-0 text-white placeholder-slate-600 px-4 outline-none text-sm font-bold"
                                        placeholder="name@company.com"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between ml-1">
                                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Password</label>
                                    <a href="#" className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold transition-colors uppercase tracking-widest">
                                        Forgot?
                                    </a>
                                </div>
                                <div className="group flex items-center w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-5 py-4 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all duration-300">
                                    <Lock className="w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors flex-shrink-0" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-transparent border-none focus:ring-0 text-white placeholder-slate-600 px-4 outline-none text-sm font-bold tracking-widest"
                                        placeholder="••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="text-slate-500 hover:text-indigo-400 focus:outline-none transition-colors flex-shrink-0 p-1"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="w-5 h-5" />
                                        ) : (
                                            <Eye className="w-5 h-5" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                id="login-submit-button"
                                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-900/20 hover:bg-indigo-500 hover:shadow-indigo-500/40 transform hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 overflow-hidden group/btn"
                            >
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Processing
                                    </>
                                ) : (
                                    <>
                                        SIGN IN
                                        <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-2 transition-transform duration-300" />
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Divider */}
                        <div className="relative my-10">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-800"></div>
                            </div>
                            <div className="relative flex justify-center text-xs ml-1">
                                <span className="px-5 bg-[#0e0e11] text-slate-500 font-black uppercase tracking-widest">Or continue with</span>
                            </div>
                        </div>

                        {/* Social Buttons */}
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => loginGoogle()}
                                disabled={isLoading}
                                className="flex items-center justify-center gap-3 px-5 py-4 bg-slate-950/70 border border-slate-800 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-300 hover:bg-slate-900 hover:border-slate-700 hover:text-white transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed group/social"
                            >
                                <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5 group-hover/social:scale-110 transition-transform duration-300" />
                                <span>Google</span>
                            </button>

                            <button
                                onClick={loginOutlook}
                                disabled={isLoading}
                                className="flex items-center justify-center gap-3 px-5 py-4 bg-slate-950/70 border border-slate-800 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-300 hover:bg-slate-900 hover:border-slate-700 hover:text-white transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed group/social"
                            >
                                <img src="https://www.svgrepo.com/show/303212/microsoft-outlook-logo.svg" alt="" className="w-5 h-5 group-hover/social:scale-110 transition-transform duration-300" onError={(e) => {
                                    (e.target as HTMLImageElement).src = "https://img.icons8.com/color/48/000000/microsoft-outlook-2019.png";
                                }} />
                                <span>Outlook</span>
                            </button>
                        </div>

                        {/* Sign Up Link */}
                        <p className="text-center text-sm text-slate-500 mt-10 font-medium">
                            Don't have an account?{' '}
                            <Link to="/signup" className="text-indigo-400 hover:text-indigo-300 font-black transition-colors underline decoration-indigo-400/30 underline-offset-8 decoration-2 hover:decoration-indigo-400">
                                Create free account
                            </Link>
                        </p>
                    </div>
                </div>
            </div>

            <style>{`
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-down {
          animation: slide-down 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
        </div>
    );
};

export default SignIn;
