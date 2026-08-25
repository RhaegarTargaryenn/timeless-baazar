import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './context/ThemeContext';
import Header from './components/Header';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import './App.css';

const Home = lazy(() => import('./pages/Home'));
const Products = lazy(() => import('./pages/Products'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const OrderTracking = lazy(() => import('./pages/OrderTracking'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
    <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

function App() {
  return (
    <ThemeProvider>
      <Router>
        <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
          <Header />
          
          <main className="flex-grow">
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/products" element={<Products />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/track-order" element={<OrderTracking />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
              </Routes>
            </Suspense>
          </main>

          {/* PWA Install Prompt */}
          <PWAInstallPrompt />

          {/* Toast Notifications */}
          <Toaster
            position="bottom-center"
            toastOptions={{
              duration: 2000,
              className: 'dark:bg-gray-800 dark:text-white',
              style: {
                background: '#DBEAFE',
                color: '#1E3A8A',
                border: '1px solid #93C5FD',
              },
            }}
          />
        </div>
      </Router>
    </ThemeProvider>
  );
}

// Simple About Page
// eslint-disable-next-line no-unused-vars
const About = () => (
  <div className="min-h-screen bg-gradient-to-br from-charcoal-900 via-charcoal-800 to-wood-900 py-16">
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <h1 className="text-5xl font-bold font-serif text-gold-400 mb-8 text-center">
        About Timeless Baazar
      </h1>
      
      <div className="bg-gradient-to-br from-charcoal-800 to-charcoal-900 rounded-2xl p-8 shadow-xl border-2 border-wood-700">
        <p className="text-gold-200 text-lg mb-6">
          Welcome to <span className="text-gold-400 font-bold">Timeless Baazar</span> - Your One
          Stop Grocery Destination!
        </p>
        
        <p className="text-gold-300 mb-4">
          We provide fresh, quality grocery items at the best prices. From premium daal and
          aromatic rice to essential spices and flours, we have everything you need for your
          kitchen.
        </p>
        
        <p className="text-gold-300 mb-6">
          All grocery items are available here! We pride ourselves on quality products and
          excellent customer service.
        </p>

        <div className="bg-charcoal-700 rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gold-400 mb-4">Contact Us</h2>
          <div className="space-y-2 text-gold-200">
            <p>📞 Phone: <a href="tel:9266667069" className="text-gold-400 hover:underline">9266667069</a></p>
            <p>📞 Phone: <a href="tel:9654653719" className="text-gold-400 hover:underline">9654653719</a></p>
            <p>🛒 Tagline: "Your One Stop Grocery Destination!"</p>
          </div>
        </div>

        <div className="bg-forest-900/30 rounded-lg p-6">
          <h3 className="text-xl font-bold text-gold-400 mb-3">Why Choose Us?</h3>
          <ul className="space-y-2 text-gold-300">
            <li>✓ Premium Quality Products</li>
            <li>✓ Best Prices in Town</li>
            <li>✓ Cash on Delivery Available</li>
            <li>✓ Fresh Stock Always</li>
            <li>✓ Multiple Package Sizes (1kg, 500g)</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
);

export default App;
