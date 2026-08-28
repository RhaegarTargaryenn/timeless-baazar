import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import Header from './components/Header';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import BottomNav from './components/BottomNav';
import { cx } from './components/ui';
import './App.css';

const Home = lazy(() => import('./pages/Home'));
const Products = lazy(() => import('./pages/Products'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const OrderTracking = lazy(() => import('./pages/OrderTracking'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const Account = lazy(() => import('./pages/Account'));
const AccountAddresses = lazy(() => import('./pages/AccountAddresses'));

// The admin panel ships as its own chunk: customers never download it, and it
// lives in this app rather than a separate one so the API client, auth and
// design tokens stay in one place.
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts'));
const AdminProductForm = lazy(() => import('./pages/admin/AdminProductForm'));
const AdminCoupons = lazy(() => import('./pages/admin/AdminCoupons'));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-surface-sunken">
    <div className="w-8 h-8 border-[3px] border-brand-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

/**
 * Storefront chrome: the customer header and the install prompt.
 *
 * The admin panel deliberately renders outside this. It has its own header, and
 * stacking the customer one on top wastes the vertical space the client needs
 * on a phone.
 */
/**
 * These screens paint their own header, so the shared one would stack a second
 * bar on top of it -- on a phone. From `sm` up BottomNav is gone, so the shared
 * header is the only navigation there and has to render on every screen; these
 * paths just hide it below `sm`.
 */
const OWN_HEADER = [
  '/',
  '/products',
  '/cart',
  '/checkout',
  '/track-order',
  '/account',
  '/account/addresses',
];

/**
 * Where the nav does not belong.
 *
 * Checkout is a focused flow -- offering a way to wander off mid-payment is
 * wrong on its own, and on the order-accepted screen the bar would sit right
 * on top of the "Back to home" button.
 *
 * Login and Signup are the other case. Three of the five tabs there lead
 * somewhere that immediately bounces back to the very screen you are standing
 * on, because they are behind `ProtectedRoute` -- a bar of buttons that return
 * you to where you already are is worse than no bar.
 *
 * Everywhere else keeps it, including the sub-pages: Delivery Address is
 * reached from Account and Orders' detail view is not a route of its own, so
 * in both places the tabs are still the way out.
 */
const NO_NAV = ['/checkout', '/login', '/signup'];

const StorefrontShell = ({ children }) => {
  const { pathname } = useLocation();
  const ownHeader = OWN_HEADER.includes(pathname);
  const showNav = !NO_NAV.includes(pathname);

  return (
    <div className="flex flex-col min-h-screen">
      <Header className={ownHeader ? 'hidden sm:block' : undefined} />
      {/*
        The screens are drawn for a 375px phone. Left to run full width they
        stretch a 51px search field across a 27" monitor, so the column is
        capped at the header's own width and centred; `pb` keeps the last row
        clear of the floating nav on phones.
      */}
      <main
        className={cx(
          'flex-grow w-full max-w-5xl mx-auto',
          !ownHeader && 'pb-28 sm:pb-0'
        )}
      >
        {children}
      </main>
      {showNav && <BottomNav />}
      <PWAInstallPrompt />
    </div>
  );
};

const StorefrontRoutes = () => (
  <StorefrontShell>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/products" element={<Products />} />
      <Route path="/cart" element={<Cart />} />
      <Route
        path="/checkout"
        element={
          <ProtectedRoute>
            <Checkout />
          </ProtectedRoute>
        }
      />
      <Route
        path="/track-order"
        element={
          <ProtectedRoute>
            <OrderTracking />
          </ProtectedRoute>
        }
      />
      <Route
        path="/account"
        element={
          <ProtectedRoute>
            <Account />
          </ProtectedRoute>
        }
      />
      <Route
        path="/account/addresses"
        element={
          <ProtectedRoute>
            <AccountAddresses />
          </ProtectedRoute>
        }
      />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
    </Routes>
  </StorefrontShell>
);

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-surface-sunken transition-colors">
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Admin: its own chrome */}
                <Route
                  path="/admin"
                  element={
                    <AdminRoute>
                      <AdminLayout />
                    </AdminRoute>
                  }
                >
                  <Route index element={<Navigate to="/admin/products" replace />} />
                  <Route path="products" element={<AdminProducts />} />
                  <Route path="products/:id" element={<AdminProductForm />} />
                  <Route path="coupons" element={<AdminCoupons />} />
                </Route>

                {/* Everything else */}
                <Route path="*" element={<StorefrontRoutes />} />
              </Routes>
            </Suspense>

            {/*
              Sits above the bottom nav on phones. The old toast was hardcoded
              blue on a green app.
            */}
            <Toaster
              position="bottom-center"
              containerStyle={{ bottom: 'calc(4.5rem + env(safe-area-inset-bottom) + 12px)' }}
              toastOptions={{
                duration: 2200,
                style: {
                  background: 'rgb(17 24 32)',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 500,
                  borderRadius: '14px',
                  padding: '10px 14px',
                  maxWidth: '88vw',
                },
              }}
            />
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
