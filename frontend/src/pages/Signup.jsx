import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  sendEmailVerification,
} from 'firebase/auth';
import { auth } from '../firebase/config';
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
      // The MongoDB profile is created by GET /api/me on the next render --
      // no second write here, and no Firestore.
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
          <h1 className="text-2xl font-extrabold text-white">Create Account</h1>
          <p className="text-sm text-white/55 mt-1">
            Join Timeless Baazar today
          </p>
        </div>

        <div className="bg-surface rounded-sheet shadow-lift">
          <div className="p-6 space-y-4">
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
              One tap — nothing to verify, nothing to remember
            </p>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-line" />
              <span className="text-xs text-ink-faint">OR</span>
              <div className="flex-1 h-px bg-line" />
            </div>

            {!showEmailForm ? (
              <button
                onClick={() => setShowEmailForm(true)}
                className="w-full py-3 text-sm font-semibold text-ink-muted hover:text-brand-600 transition-colors"
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
                    <label className="block text-xs font-semibold text-ink-muted mb-1.5">
                      {label}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint">
                        {icon}
                      </span>
                      <input
                        type={type}
                        value={emailForm[name]}
                        onChange={(e) => setEmailForm({ ...emailForm, [name]: e.target.value })}
                        required
                        autoComplete={autocomplete}
                        className="w-full h-12 pl-10 pr-3 text-sm rounded-2xl bg-surface-sunken border border-line text-ink placeholder:text-ink-faint focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 outline-none transition-all"
                        placeholder={placeholder}
                      />
                    </div>
                  </div>
                ))}

                {/* Password */}
                <div>
                  <label className="block text-xs font-semibold text-ink-muted mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <HiLockClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint w-4 h-4" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={emailForm.password}
                      onChange={(e) => setEmailForm({ ...emailForm, password: e.target.value })}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      className="w-full h-12 pl-10 pr-10 text-sm rounded-2xl bg-surface-sunken border border-line text-ink placeholder:text-ink-faint focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 outline-none transition-all"
                      placeholder="Min. 6 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-faint"
                    >
                      {showPassword ? <HiEyeOff className="w-4 h-4" /> : <HiEye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-semibold text-ink-muted mb-1.5">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <HiLockClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint w-4 h-4" />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={emailForm.confirmPassword}
                      onChange={(e) =>
                        setEmailForm({ ...emailForm, confirmPassword: e.target.value })
                      }
                      required
                      autoComplete="new-password"
                      className={`w-full h-12 pl-10 pr-10 text-sm rounded-2xl bg-surface-sunken border text-ink placeholder:text-ink-faint focus:ring-2 outline-none transition-all ${
                        passwordsMismatch
                          ? 'border-coral focus:border-coral focus:ring-coral/25'
                          : 'border-line focus:border-brand-500 focus:ring-brand-500/25'
                      }`}
                      placeholder="Re-enter password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-faint"
                    >
                      {showConfirm ? <HiEyeOff className="w-4 h-4" /> : <HiEye className="w-4 h-4" />}
                    </button>
                  </div>
                  {passwordsMismatch && (
                    <p className="text-xs text-coral mt-1">Passwords don't match</p>
                  )}
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
                      Creating...
                    </span>
                  ) : (
                    'Create Account'
                  )}
                </motion.button>
              </form>
            )}

            <p className="text-center text-sm text-ink-muted">
              Have an account?{' '}
              <Link
                to="/login"
                state={location.state}
                className="text-brand-600 font-bold hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <div className="text-center mt-5">
          <Link
            to="/"
            className="text-sm text-white/50 hover:text-white flex items-center justify-center gap-1"
          >
            <HiArrowLeft className="w-3.5 h-3.5" /> Back to Home
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default Signup;
