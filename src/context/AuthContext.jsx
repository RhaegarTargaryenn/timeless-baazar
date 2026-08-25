import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from 'react';
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  sendEmailVerification,
} from 'firebase/auth';
import { auth } from '../firebase/config';

/**
 * One auth subscription for the whole app.
 *
 * Header, Checkout and OrderTracking each used to call onAuthStateChanged
 * themselves. Firebase resolves those listeners independently, so on a refresh
 * the header could still think nobody was signed in while Checkout had already
 * decided otherwise — which is how a logged-in user ended up being bounced to
 * /login with a "please login to checkout" toast.
 */
const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  // `loading` is true only until Firebase reports for the first time. Every
  // consumer must wait for it: rendering a "logged out" state before Firebase
  // has restored the session is the flicker users read as "it logged me out".
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signOut = useCallback(() => firebaseSignOut(auth), []);

  /**
   * Ask Firebase for the freshest user record.
   *
   * `user.emailVerified` is a snapshot from when the token was issued. After
   * someone clicks the link in their inbox, the local object keeps saying
   * false until it is reloaded — which looked like "I verified and it still
   * won't let me through".
   */
  const refreshUser = useCallback(async () => {
    if (!auth.currentUser) return null;
    await auth.currentUser.reload();
    setUser({ ...auth.currentUser });
    return auth.currentUser;
  }, []);

  const resendVerificationEmail = useCallback(async () => {
    if (!auth.currentUser) {
      throw new Error('Nobody is signed in');
    }
    await sendEmailVerification(auth.currentUser, {
      url: `${window.location.origin}/checkout`,
    });
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isSignedIn: Boolean(user),

      // Google accounts arrive verified. Only email/password signups can be
      // unverified, and we only care at checkout.
      isVerified: Boolean(user?.emailVerified),

      signOut,
      refreshUser,
      resendVerificationEmail,
    }),
    [user, loading, signOut, refreshUser, resendVerificationEmail]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
