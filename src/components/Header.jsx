import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Search, Menu, X, Moon, Sun, User, LogOut, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import useCartStore from '../store/cartStore';
import { useTheme } from '../context/ThemeContext';
import toast from 'react-hot-toast';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const navigate = useNavigate();
  const items = useCartStore(state => state.items);
  const totalItems = items.reduce((total, item) => total + item.quantity, 0);
  const { isDark, toggleTheme } = useTheme();

  // Listen to auth state changes
  useEffect(() => {
    console.log('🔍 Header - Setting up auth listener');
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log('🔐 Header - Auth State:', currentUser ? currentUser.uid : 'No user');
      setUser(currentUser);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // PWA Install prompt handler
  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstallButton(false);
      return;
    }

    // Listen for beforeinstallprompt event
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      setShowInstallButton(false);
      toast.success('App installed successfully! 🎉');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }

    // Show install prompt
    deferredPrompt.prompt();

    // Wait for user choice
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      toast.success('Installing app... 📥');
    }

    setDeferredPrompt(null);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success('Logged out successfully!');
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Logout failed!');
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery)}`);
      setShowSearchBar(false);
      setIsMenuOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 glass border-b border-green-200/30 dark:border-green-800/20">
      {/* Top Bar */}
      <div className="backdrop-blur-md transition-all duration-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-[72px]">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group flex-shrink-0">
              <motion.div 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-green-400 via-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-smooth"
              >
                <span className="text-2xl sm:text-3xl font-bold text-white">TB</span>
              </motion.div>
              <div>
                <h1 className="text-base sm:text-lg lg:text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  Timeless Baazar
                </h1>
                <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 font-medium -mt-0.5">Premium Quality</p>
              </div>
            </Link>

            {/* Right Side Icons */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Search Icon */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowSearchBar(!showSearchBar)}
                className="p-2.5 sm:p-3 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 dark:hover:text-green-400 transition-all"
              >
                <Search className="w-5 h-5 sm:w-6 sm:h-6" />
              </motion.button>

              {/* PWA Install Button */}
              {showInstallButton && (
                <motion.button
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleInstallClick}
                  className="p-2.5 sm:p-3 rounded-xl bg-gradient-to-r from-green-500 to-green-600 text-white shadow-smooth hover:shadow-smooth-lg transition-all duration-300"
                  title="Install App"
                >
                  <Download className="w-5 h-5 sm:w-6 sm:h-6" />
                </motion.button>
              )}


              {/* Cart */}
              <Link to="/cart">
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative p-2.5 sm:p-3 rounded-xl bg-gradient-to-br from-green-500 to-green-600 text-white shadow-smooth hover:shadow-smooth-lg transition-all duration-300"
                >
                  <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />
                  {totalItems > 0 && (
                    <motion.span 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 bg-green-600 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-smooth"
                    >
                      {totalItems}
                    </motion.span>
                  )}
                </motion.button>
              </Link>

              {/* Hamburger Menu Button */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2.5 sm:p-3 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 dark:hover:text-green-400 transition-all"
              >
                <AnimatePresence mode="wait">
                  {isMenuOpen ? (
                    <motion.div
                      key="close"
                      initial={{ rotate: -90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: 90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <X className="w-5 h-5 sm:w-6 sm:h-6" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="menu"
                      initial={{ rotate: 90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: -90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      {/* Expandable Search Bar */}
      <AnimatePresence>
        {showSearchBar && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-md border-t border-green-200/30 dark:border-green-800/20 overflow-hidden"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  autoFocus
                  className="w-full px-5 py-3 pl-12 text-sm text-gray-800 dark:text-white bg-white dark:bg-gray-800 border border-green-200 dark:border-green-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent shadow-smooth transition-all"
                />
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hamburger Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-t border-green-200/30 dark:border-green-800/20 overflow-hidden"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="max-w-4xl mx-auto space-y-3 max-h-[80vh] overflow-y-auto">
              {/* User Info */}
              {user ? (
                <div className="px-4 py-3 mb-2 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl border border-green-200/30 dark:border-green-800/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                      <User className="w-5 h-5" />
                      <span className="text-sm font-semibold truncate">{user.displayName || user.email?.split('@')[0]}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate">{user.email}</p>
                </div>
              ) : (
                !authLoading && (
                  <div className="flex gap-2 mb-3">
                    <Link to="/login" onClick={() => setIsMenuOpen(false)} className="flex-1">
                      <button className="w-full px-4 py-3 text-sm font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-2xl transition-all">
                        Login
                      </button>
                    </Link>
                    <Link to="/signup" onClick={() => setIsMenuOpen(false)} className="flex-1">
                      <button className="w-full px-4 py-3 text-sm font-semibold text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 rounded-2xl shadow-smooth hover:shadow-smooth-lg transition-all">
                        Sign Up
                      </button>
                    </Link>
                  </div>
                )
              )}

              {/* Quick Links */}
              <div className="border-t border-green-200/30 dark:border-green-800/20 pt-3 mt-3 space-y-2">
                <Link
                  to="/track-order"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-3 text-sm font-semibold bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-2xl transition-all"
                >
                  <ShoppingCart className="w-4 h-4" />
                  My Orders
                </Link>


                {/* Dark Mode Toggle */}
                <button
                  onClick={() => {
                    toggleTheme();
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center gap-2 w-full px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-2xl transition-all"
                >
                  {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  {isDark ? 'Light Mode' : 'Dark Mode'}
                </button>

                {/* Logout Button */}
                {user && (
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      handleLogout();
                    }}
                    className="flex items-center gap-2 w-full px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-all"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                )}
              </div>
            </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
