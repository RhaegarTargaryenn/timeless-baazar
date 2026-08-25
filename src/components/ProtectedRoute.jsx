import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AuthLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
    <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

/**
 * Gate a route behind sign-in.
 *
 * The important part is waiting on `loading`. Redirecting while Firebase is
 * still restoring the session is what used to throw signed-in users back to
 * /login on a hard refresh.
 *
 * Where the user was headed is passed through router state rather than
 * sessionStorage, so a stale returnUrl from an abandoned attempt can't send
 * someone somewhere they didn't ask to go.
 */
const ProtectedRoute = ({ children }) => {
  const { isSignedIn, loading } = useAuth();
  const location = useLocation();

  if (loading) return <AuthLoader />;

  if (!isSignedIn) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
};

export default ProtectedRoute;
