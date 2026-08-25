import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MailCheck, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

/**
 * Shown in place of checkout when an email/password account has not confirmed
 * its address yet.
 *
 * Verification used to be enforced at login, which meant a brand-new customer
 * was signed out and left staring at a spam folder. Here they have already
 * browsed, filled a cart, and have a reason to finish the step — and the two
 * things they need (resend, re-check) are on screen.
 *
 * Google accounts never reach this: Firebase reports them verified.
 */
const VerifyEmailGate = () => {
  const { user, refreshUser, resendVerificationEmail } = useAuth();
  const [checking, setChecking] = useState(false);
  const [sending, setSending] = useState(false);

  const handleRecheck = async () => {
    setChecking(true);
    try {
      const fresh = await refreshUser();
      if (fresh?.emailVerified) {
        toast.success('Email verified. Taking you to checkout.');
      } else {
        toast('Still not verified. Click the link in your email, then try again.');
      }
    } catch {
      toast.error('Could not check right now.');
    } finally {
      setChecking(false);
    }
  };

  const handleResend = async () => {
    setSending(true);
    try {
      await resendVerificationEmail();
      toast.success('Verification email sent.');
    } catch (err) {
      toast.error(
        err?.code === 'auth/too-many-requests'
          ? 'Too many requests. Wait a few minutes and try again.'
          : 'Could not send the email.'
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl shadow-smooth-lg border border-gray-200 dark:border-gray-700 p-8 text-center"
      >
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <MailCheck className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>

        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Confirm your email to order
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
          We need a working email to send your order confirmation.
        </p>
        <p className="text-sm font-semibold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-2.5 my-4 break-all">
          {user?.email}
        </p>

        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-left mb-6">
          <p className="text-xs font-bold text-amber-800 dark:text-amber-300 mb-1">
            Not in your inbox?
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
            Check <span className="font-bold">Spam</span> or <span className="font-bold">Promotions</span>.
            Mark it <span className="font-bold">Not Spam</span> so future emails arrive properly.
          </p>
        </div>

        <div className="space-y-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleRecheck}
            disabled={checking}
            className="w-full py-3.5 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold rounded-2xl shadow-smooth flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
            {checking ? 'Checking...' : "I've verified — continue"}
          </motion.button>

          <button
            onClick={handleResend}
            disabled={sending}
            className="w-full py-3 text-sm font-semibold text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-2xl transition-colors disabled:opacity-60"
          >
            {sending ? 'Sending...' : 'Resend verification email'}
          </button>
        </div>

        <p className="text-xs text-gray-400 mt-6">
          Your cart is saved — nothing is lost.
        </p>
      </motion.div>
    </div>
  );
};

export default VerifyEmailGate;
