import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  sendEmailVerification,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { motion } from 'framer-motion';
import { HiMail, HiLockClosed, HiUser, HiEye, HiEyeOff, HiArrowLeft } from 'react-icons/hi';
import { FcGoogle } from 'react-icons/fc';
import toast from 'react-hot-toast';

const Signup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [emailForm, setEmailForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const destination = location.state?.from?.pathname || '/';
  const goToDestination = () => navigate(destination, { replace: true });

  // ── Google (primary) ──
  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, provider);
      await setDoc(
        doc(db, 'users', result.user.uid),
        {
          name: result.user.displayName,
          email: result.user.email,
          createdAt: new Date().toISOString(),
        },
        { merge: true }
      );
      toast.success(`Welcome, ${result.user.displayName?.split(' ')[0] || 'there'}!`);
      goToDestination();
    } catch (err) {
      if (
        err.code !== 'auth/popup-closed-by-user' &&
        err.code !== 'auth/cancelled-popup-request'
      ) {
        toast.error('Google sign-up failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Email + password ──
  // The verification mail still goes out, but the account stays signed in and
  // can browse and build a cart immediately. Checkout is where verification is
  // actually enforced. Signing people out here — the old behaviour — stranded
  // them on a mail that usually landed in spam.
  const handleEmailSignup = async (e) => {
    e.preventDefault();
    if (emailForm.password !== emailForm.confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }
    if (emailForm.password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        emailForm.email,
        emailForm.password
      );
      await updateProfile(credential.user, { displayName: emailForm.name });
      await setDoc(doc(db, 'users', credential.user.uid), {
        name: emailForm.name,
        email: emailForm.email,
        createdAt: new Date().toISOString(),
      });

      // Best effort — a failed send must not block the signup itself, and the
      // user can resend from checkout.
      sendEmailVerification(credential.user, {
        url: `${window.location.origin}/checkout`,
      }).catch(() => {});

      toast.success('Account created! Check your inbox to verify your email.');
      goToDestination();
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        toast.error('Email already in use. Log in instead.');
      } else if (err.code === 'auth/invalid-email') {
        toast.error('Invalid email address.');
      } else if (err.code === 'auth/weak-password') {
        toast.error('Password too weak.');
      } else {
        toast.error('Signup failed. Try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const passwordsMismatch =
    emailForm.confirmPassword && emailForm.password !== emailForm.confirmPassword;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center py-10 px-4">
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
            className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-lg mx-auto mb-3"
          >
            TB
          </motion.div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Create Account</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Join Timeless Baazar today
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700">
          <div className="p-6 space-y-4">
            <motion.button
              onClick={handleGoogleSignIn}
              disabled={loading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full py-3.5 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl flex items-center justify-center gap-3 hover:border-green-400 dark:hover:border-green-600 hover:shadow-md transition-all text-sm font-semibold text-gray-800 dark:text-gray-100 disabled:opacity-50"
            >
              <FcGoogle className="w-5 h-5" /> Continue with Google
            </motion.button>

            <p className="text-center text-xs text-gray-400">
              One tap — nothing to verify, nothing to remember
            </p>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-100 dark:bg-gray-700" />
              <span className="text-xs text-gray-400">OR</span>
              <div className="flex-1 h-px bg-gray-100 dark:bg-gray-700" />
            </div>

            {!showEmailForm ? (
              <button
                onClick={() => setShowEmailForm(true)}
                className="w-full py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 transition-colors"
              >
                Sign up with email instead
              </button>
            ) : (
              <form onSubmit={handleEmailSignup} className="space-y-3.5">
                {[
                  {
                    label: 'Full Name',
                    name: 'name',
                    type: 'text',
                    icon: <HiUser className="w-4 h-4" />,
                    placeholder: 'Your Name',
                    autocomplete: 'name',
                  },
                  {
                    label: 'Email',
                    name: 'email',
                    type: 'email',
                    icon: <HiMail className="w-4 h-4" />,
                    placeholder: 'you@example.com',
                    autocomplete: 'email',
                  },
                ].map(({ label, name, type, icon, placeholder, autocomplete }) => (
                  <div key={name}>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                      {label}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        {icon}
                      </span>
                      <input
                        type={type}
                        value={emailForm[name]}
                        onChange={(e) => setEmailForm({ ...emailForm, [name]: e.target.value })}
                        required
                        autoComplete={autocomplete}
                        className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 focus:border-green-500 focus:ring-2 focus:ring-green-200 dark:focus:ring-green-800/50 outline-none transition-all"
                        placeholder={placeholder}
                      />
                    </div>
                  </div>
                ))}

                {/* Password */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                    Password
                  </label>
                  <div className="relative">
                    <HiLockClosed className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={emailForm.password}
                      onChange={(e) => setEmailForm({ ...emailForm, password: e.target.value })}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      className="w-full pl-9 pr-9 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
                      placeholder="Min. 6 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    >
                      {showPassword ? <HiEyeOff className="w-4 h-4" /> : <HiEye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <HiLockClosed className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={emailForm.confirmPassword}
                      onChange={(e) =>
                        setEmailForm({ ...emailForm, confirmPassword: e.target.value })
                      }
                      required
                      autoComplete="new-password"
                      className={`w-full pl-9 pr-9 py-2.5 text-sm border rounded-xl bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 outline-none transition-all ${
                        passwordsMismatch
                          ? 'border-red-400 focus:border-red-400 focus:ring-red-200'
                          : 'border-gray-200 dark:border-gray-600 focus:border-green-500 focus:ring-green-200'
                      }`}
                      placeholder="Re-enter password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    >
                      {showConfirm ? <HiEyeOff className="w-4 h-4" /> : <HiEye className="w-4 h-4" />}
                    </button>
                  </div>
                  {passwordsMismatch && (
                    <p className="text-xs text-red-500 mt-1">Passwords don't match</p>
                  )}
                </div>

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="w-full py-2.5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-xl shadow-md transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating...
                    </span>
                  ) : (
                    'Create Account'
                  )}
                </motion.button>
              </form>
            )}

            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              Have an account?{' '}
              <Link
                to="/login"
                state={location.state}
                className="text-green-600 dark:text-green-400 font-semibold hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <div className="text-center mt-5">
          <Link
            to="/"
            className="text-sm text-gray-400 hover:text-green-600 flex items-center justify-center gap-1"
          >
            <HiArrowLeft className="w-3.5 h-3.5" /> Back to Home
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default Signup;
