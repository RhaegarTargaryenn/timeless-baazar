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
import './App.css';

const Home = lazy(() => import('./pages/Home'));
const Products = lazy(() => import('./pages/Products'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const OrderTracking = lazy(() => import('./pages/OrderTracking'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));

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
 * Home and the shop paint their own dark header, so the shared light one would
 * stack a second bar on top of it. Everything else still needs it.
 */
const OWN_HEADER = ['/', '/products', '/cart', '/checkout', '/track-order'];

const StorefrontShell = ({ children }) => {
  const { pathname } = useLocation();
  const ownHeader = OWN_HEADER.includes(pathname);

  return (
    <div className="flex flex-col min-h-screen">
      {!ownHeader && <Header />}
      {/* pb keeps the last row clear of the floating nav on phones */}
      <main className={ownHeader ? 'flex-grow' : 'flex-grow pb-28 sm:pb-0'}>{children}</main>
      <BottomNav />
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
