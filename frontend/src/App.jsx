import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import Header from './components/Header';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import BottomNav from './components/BottomNav';
import { cx, PageSkeleton } from './components/ui';
import { IconContext } from './components/icons';
import { warmUpApi } from './lib/api';
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
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders'));
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts'));
const AdminProductForm = lazy(() => import('./pages/admin/AdminProductForm'));
const AdminCoupons = lazy(() => import('./pages/admin/AdminCoupons'));

/**
 * Shown while a lazily-loaded route chunk is in flight. On a good connection
 * this is a couple of frames; on 3G outside the shop it is a few seconds, and
 * that is the case it is drawn for.
 */
const PageLoader = () => <PageSkeleton />;

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
          'flex-grow w-full max-w-7xl mx-auto',
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

/**
 * The app-wide icon defaults.
 *
 * `bold` because Phosphor's `regular` is roughly a 1.5px stroke where lucide
 * was a flat 2px, so defaulting to regular would have made every screen
 * abruptly lighter than the design it was matched against. Individual icons
 * pass `weight="regular"` where they are large enough to carry it, or
 * `weight="fill"` where they are active or selected.
 *
 * `size="1em"` makes an icon inherit the font size of whatever contains it, so
 * the Tailwind `w-*` / `h-*` classes already on every call site stay in charge
 * of dimensions and nothing had to be resized during the migration.
 *
 * Defined outside the component: a fresh object on every render would
 * invalidate the context for every icon in the tree on every render.
 */
const ICON_DEFAULTS = { weight: 'bold', size: '1em' };

function App() {
  // Start Render's container booting the moment the app loads, rather than
  // when the customer first asks it for something. See warmUpApi.
  useEffect(warmUpApi, []);

  return (
    <IconContext.Provider value={ICON_DEFAULTS}>
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
                  {/* Orders is the landing screen: it is the only one with
                      customers waiting on it. */}
                  <Route index element={<Navigate to="/admin/orders" replace />} />
                  <Route path="orders" element={<AdminOrders />} />
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
    </IconContext.Provider>
  );
}

export default App;
