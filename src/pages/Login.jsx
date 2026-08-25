import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  sendEmailVerification,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { motion } from 'framer-motion';
import { HiMail, HiLockClosed, HiEye, HiEyeOff, HiArrowLeft } from 'react-icons/hi';
import { FcGoogle } from 'react-icons/fc';
import toast from 'react-hot-toast';

const Login = () => {
  const navigate = useNavigate();
  const [emailForm, setEmailForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // ── Email Login ──
  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, emailForm.email, emailForm.password);
      if (!result.user.emailVerified) {
        await auth.signOut();
        toast(
          (t) => (
            <div>
              <p className="font-semibold text-gray-900">Email not verified!</p>
              <p className="text-sm text-gray-600 mt-1">Check your inbox (and spam folder) for the verification link.</p>
              <button
                className="mt-2 text-xs text-green-600 underline"
                onClick={async () => {
                  toast.dismiss(t.id);
                  const r = await signInWithEmailAndPassword(auth, emailForm.email, emailForm.password).catch(() => null);
                  if (r) {
                    await sendEmailVerification(r.user, { url: window.location.origin + '/login' });
                    await auth.signOut();
                    toast.success('Verification email resent! Check inbox & spam. 📧');
                  }
                }}
              >
                Resend verification email
              </button>
            </div>
          ),
          { duration: 8000 }
        );
        return;
      }
      toast.success('Welcome back! 🎉');
      const returnUrl = sessionStorage.getItem('returnUrl');
      sessionStorage.removeItem('returnUrl');
      setTimeout(() => navigate(returnUrl || '/'), 300);
    } catch (err) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        toast.error('Invalid email or password!');
      } else if (err.code === 'auth/user-not-found') {
        toast.error('No account found. Please sign up!');
      } else if (err.code === 'auth/too-many-requests') {
        toast.error('Too many attempts. Try again later.');
      } else {
        toast.error('Login failed. Please try again.');
      }
    } finally { setLoading(false); }
  };

  // ── Google ──
  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, provider);
      await setDoc(doc(db, 'users', result.user.uid), {
        name: result.user.displayName, email: result.user.email,
        createdAt: new Date().toISOString(), orders: [],
      }, { merge: true });
      toast.success(`Welcome, ${result.user.displayName}! 🎉`);
      const returnUrl = sessionStorage.getItem('returnUrl');
      sessionStorage.removeItem('returnUrl');
      setTimeout(() => navigate(returnUrl || '/'), 300);
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request')
        toast.error('Google sign-in failed.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center py-10 px-4">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full max-w-sm">

        {/* Brand */}
        <div className="text-center mb-6">
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.15 }}
            className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-lg mx-auto mb-3"
          >TB</motion.div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Welcome Back</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Sign in to continue shopping</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700">
          <div className="p-6 space-y-4">
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Email</label>
                <div className="relative">
                  <HiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input type="email" value={emailForm.email} onChange={(e) => setEmailForm({ ...emailForm, email: e.target.value })} required autoComplete="email"
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 focus:border-green-500 focus:ring-2 focus:ring-green-200 dark:focus:ring-green-800/50 outline-none transition-all"
                    placeholder="you@example.com" />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Password</label>
                  <button type="button" className="text-xs text-green-600 dark:text-green-400 hover:underline">Forgot?</button>
                </div>
                <div className="relative">
                  <HiLockClosed className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input type={showPassword ? 'text' : 'password'} value={emailForm.password} onChange={(e) => setEmailForm({ ...emailForm, password: e.target.value })} required autoComplete="current-password"
                    className="w-full pl-9 pr-9 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 focus:border-green-500 focus:ring-2 focus:ring-green-200 dark:focus:ring-green-800/50 outline-none transition-all"
                    placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPassword ? <HiEyeOff className="w-4 h-4" /> : <HiEye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                className="w-full py-2.5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-xl shadow-md transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Signing in...</span> : 'Sign In'}
              </motion.button>
            </form>

            <div className="flex items-center gap-3"><div className="flex-1 h-px bg-gray-100 dark:bg-gray-700" /><span className="text-xs text-gray-400">OR</span><div className="flex-1 h-px bg-gray-100 dark:bg-gray-700" /></div>

            <motion.button onClick={handleGoogleSignIn} disabled={loading} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
              className="w-full py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl flex items-center justify-center gap-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all text-sm font-medium text-gray-700 dark:text-gray-300 disabled:opacity-50">
              <FcGoogle className="w-5 h-5" /> Continue with Google
            </motion.button>

            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              No account? <Link to="/signup" className="text-green-600 dark:text-green-400 font-semibold hover:underline">Create one</Link>
            </p>
          </div>
        </div>

        <div className="text-center mt-5">
          <Link to="/" className="text-sm text-gray-400 hover:text-green-600 flex items-center justify-center gap-1">
            <HiArrowLeft className="w-3.5 h-3.5" /> Back to Home
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
