import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Loader = ({ label }) => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-surface-sunken">
    <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    <p className="text-sm text-ink-muted">{label}</p>
  </div>
);

/**
 * Gate the admin panel.
 *
 * Waits on both signals: Firebase restoring the session, and GET /api/me
 * answering whether this uid is an admin. Deciding on a half-known state would
 * bounce the client out of their own panel on every refresh — the same class of
 * bug that made the storefront's login feel broken.
 *
 * This only controls what renders. Every write is checked again by requireAdmin
 * on the server, so getting past this screen grants nothing on its own.
 */
const AdminRoute = ({ children }) => {
  const { isSignedIn, isAdmin, loading, profileLoading } = useAuth();
  const location = useLocation();

  if (loading) return <Loader label="Checking your session..." />;

  if (!isSignedIn) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (profileLoading) return <Loader label="Checking permissions..." />;

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-surface-sunken">
        <div className="w-full max-w-sm bg-surface-raised rounded-card border border-line p-8 text-center shadow-card">
          <div className="w-14 h-14 bg-amber-50 dark:bg-amber-950/40 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-7 h-7 text-amber-600 dark:text-amber-400" />
          </div>
          <h1 className="text-lg font-bold text-ink mb-2">
            This area is for the shop owner
          </h1>
          <p className="text-sm text-ink-muted mb-6">
            Your account does not have access to the admin panel.
          </p>
          <Link
            to="/"
            className="inline-block w-full py-3 bg-brand-600 text-white font-bold rounded-full shadow-brand"
          >
            Back to shop
          </Link>
        </div>
      </div>
    );
  }

  return children;
};

export default AdminRoute;
