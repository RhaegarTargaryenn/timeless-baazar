import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from '../firebase/config';
import { motion } from 'framer-motion';
import { Mail, LockClosed, Eye, EyeOff, ArrowLeft } from '../components/icons';
import { FcGoogle } from 'react-icons/fc';
import toast from 'react-hot-toast';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [emailForm, setEmailForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [loading, setLoading] = useState(false);

  // ProtectedRoute passes the page the user was actually trying to reach.
  // Falling back to "/" is safer than a sessionStorage returnUrl, which could
  // survive an abandoned attempt and redirect somewhere unexpected later.
  const destination = location.state?.from?.pathname || '/';

  const goToDestination = () => navigate(destination, { replace: true });

  // ── Google (primary) ──
  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, provider);
      // The MongoDB profile is created by GET /api/me on the next render --
      // no second write here, and no Firestore.
      toast.success(`Welcome, ${result.user.displayName?.split(' ')[0] || 'back'}!`);
      goToDestination();
    } catch (err) {
      if (
        err.code !== 'auth/popup-closed-by-user' &&
        err.code !== 'auth/cancelled-popup-request'
      ) {
        toast.error('Google sign-in failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Email + password ──
  // Deliberately does NOT block unverified accounts. Verification is asked for
  // at checkout instead: the old flow signed people straight back out and left
  // them waiting on a mail that usually landed in spam.
  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, emailForm.email, emailForm.password);
      toast.success('Welcome back!');
      goToDestination();
    } catch (err) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        toast.error('Invalid email or password.');
      } else if (err.code === 'auth/user-not-found') {
        toast.error('No account found. Please sign up.');
      } else if (err.code === 'auth/too-many-requests') {
        toast.error('Too many attempts. Try again in a few minutes.');
      } else {
        toast.error('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!emailForm.email) {
      toast.error('Enter your email first, then tap Forgot.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, emailForm.email);
      toast.success('Reset link sent. Check your inbox and spam folder.');
    } catch {
      toast.error('Could not send the reset link.');
    }
  };

  return (
    <div className="min-h-screen bg-forest flex items-center justify-center py-10 px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        {/* Brand */}
        <div className="text-center mb-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.15 }}
            className="w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center text-white text-xl font-extrabold shadow-brand mx-auto mb-4"
          >
            TB
          </motion.div>
          <h1 className="text-2xl font-extrabold text-white">Welcome Back</h1>
          <p className="text-sm text-white/55 mt-1">
            Sign in to continue shopping
          </p>
        </div>

        <div className="bg-surface rounded-sheet shadow-lift">
          <div className="p-6 space-y-4">
            {/* Google is the primary path: one tap, no password, arrives verified */}
            <motion.button
              onClick={handleGoogleSignIn}
              disabled={loading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full h-14 bg-surface-sunken border-2 border-line rounded-2xl flex items-center justify-center gap-3 hover:border-brand-400 transition-colors text-sm font-bold text-ink disabled:opacity-50"
            >
              <FcGoogle className="w-5 h-5" /> Continue with Google
            </motion.button>

            <p className="text-center text-xs text-ink-faint">
              Fastest way in — no password to remember
            </p>

            {!showEmailForm ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-line" />
                  <span className="text-xs text-ink-faint">OR</span>
                  <div className="flex-1 h-px bg-line" />
                </div>

                <button
                  onClick={() => setShowEmailForm(true)}
                  className="w-full py-3 text-sm font-semibold text-ink-muted hover:text-brand-600 transition-colors"
                >
                  Sign in with email instead
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-line" />
                  <span className="text-xs text-ink-faint">OR</span>
                  <div className="flex-1 h-px bg-line" />
                </div>

                <form onSubmit={handleEmailLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-ink-muted mb-1.5">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint w-4 h-4" />
                      <input
                        type="email"
                        value={emailForm.email}
                        onChange={(e) => setEmailForm({ ...emailForm, email: e.target.value })}
                        required
                        autoComplete="email"
                        className="w-full h-12 pl-10 pr-3 text-sm rounded-2xl bg-surface-sunken border border-line text-ink placeholder:text-ink-faint focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 outline-none transition-all"
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-ink-muted">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        className="text-xs text-brand-600 font-semibold hover:underline"
                      >
                        Forgot?
                      </button>
                    </div>
                    <div className="relative">
                      <LockClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint w-4 h-4" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={emailForm.password}
                        onChange={(e) => setEmailForm({ ...emailForm, password: e.target.value })}
                        required
                        autoComplete="current-password"
                        className="w-full h-12 pl-10 pr-10 text-sm rounded-2xl bg-surface-sunken border border-line text-ink placeholder:text-ink-faint focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 outline-none transition-all"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-faint"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="w-full h-13 py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-full shadow-brand transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Signing in...
                      </span>
                    ) : (
                      'Sign In'
                    )}
                  </motion.button>
                </form>
              </>
            )}

            <p className="text-center text-sm text-ink-muted">
              No account?{' '}
              <Link
                to="/signup"
                state={location.state}
                className="text-brand-600 font-bold hover:underline"
              >
                Create one
              </Link>
            </p>
          </div>
        </div>

        <div className="text-center mt-5">
          <Link
            to="/"
            className="text-sm text-white/50 hover:text-white flex items-center justify-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
