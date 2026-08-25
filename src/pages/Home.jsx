import { useState, useEffect } from 'react';
import { useNavigate,Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Truck, DollarSign, ShieldCheck, ArrowRight, ShoppingCart } from 'lucide-react';
import { categories } from '../data/products';


const Home = () => {
  const navigate = useNavigate();
  
  // Rotating quotes
  const quotes = [
    "Straight from Farm",
    "Fresh Groceries",
    "Quality Products",
    "Best Prices",
    "Fast Delivery"
  ];
  
  const [currentQuote, setCurrentQuote] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuote((prev) => (prev + 1) % quotes.length);
    }, 5000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCategoryClick = (categoryId) => {
    navigate(`/products?category=${categoryId}`);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-500">
      {/* Hero Section */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-gray-900 dark:via-green-900/10 dark:to-gray-800"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="text-center lg:text-left z-10">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="mb-6"
              >
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-green-600 dark:text-green-400 text-sm font-semibold rounded-full shadow-smooth border border-green-200 dark:border-green-800">
                  <CheckCircle className="w-4 h-4" />
                  Premium Quality Guaranteed
                </span>
              </motion.div>

              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-5xl sm:text-6xl lg:text-7xl font-extrabold mb-6 leading-tight"
              >
                <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  Fresh Groceries
                </span>
                <br />
                <span className="text-gray-900 dark:text-white">
                  Delivered Daily
                </span>
              </motion.h1>
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="h-12 mb-8"
              >
                <motion.p 
                  key={currentQuote}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.5 }}
                  className="text-xl sm:text-2xl text-green-600 dark:text-green-400 font-semibold"
                >
                  {quotes[currentQuote]}
                </motion.p>
              </motion.div>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto lg:mx-0"
              >
                Premium quality groceries at your doorstep. Fresh from farm to your family with care and trust.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
              >
                <motion.button
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate('/products')}
                  className="group px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold rounded-2xl shadow-smooth hover:shadow-smooth-lg transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="w-5 h-5" />
                  <span>Shop Now</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </motion.button>
              </motion.div>

              {/* Trust Badges */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="mt-12 flex flex-wrap gap-6 justify-center lg:justify-start"
              >
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <ShieldCheck className="w-6 h-6 text-green-600" />
                  <span className="text-sm font-semibold">100% Fresh</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <DollarSign className="w-6 h-6 text-green-600" />
                  <span className="text-sm font-semibold">Best Prices</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <Truck className="w-6 h-6 text-green-600" />
                  <span className="text-sm font-semibold">Fast Delivery</span>
                </div>
              </motion.div>
            </div>

            {/* Right Image/Illustration - Grocery Bag */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="relative h-[300px] sm:h-[400px] lg:h-[500px] mt-8 lg:mt-0"
            >
              <div className="relative h-full flex items-center justify-center">
                {/* Enhanced Background Glow Effects */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[400px] lg:w-[500px] h-[300px] sm:h-[400px] lg:h-[500px] bg-gradient-to-br from-green-400/40 via-emerald-400/30 to-teal-400/40 rounded-full blur-3xl opacity-80 animate-pulse" style={{ zIndex: 1 }}></div>
                <div className="absolute top-1/4 right-1/4 w-[150px] sm:w-[200px] lg:w-[250px] h-[150px] sm:h-[200px] lg:h-[250px] bg-green-300/30 dark:bg-green-600/30 rounded-full blur-3xl" style={{ zIndex: 1 }}></div>
                <div className="absolute bottom-1/4 left-1/4 w-[120px] sm:w-[160px] lg:w-[200px] h-[120px] sm:h-[160px] lg:h-[200px] bg-emerald-300/30 dark:bg-emerald-600/30 rounded-full blur-3xl" style={{ zIndex: 1 }}></div>
                
                {/* Floating UI Card - Top Right (Fresh Quality Badge) */}
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.8, repeat: Infinity, repeatType: "reverse", repeatDelay: 2 }}
                  className="absolute top-8 sm:top-12 lg:top-16 right-0 sm:right-4 lg:right-8 bg-white dark:bg-gray-800 backdrop-blur-xl rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 shadow-smooth-lg border border-gray-100 dark:border-gray-700 scale-75 sm:scale-90 lg:scale-100"
                  style={{ zIndex: 20 }}
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 lg:w-12 lg:h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Quality</p>
                      <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white whitespace-nowrap">100% Fresh</p>
                    </div>
                  </div>
                </motion.div>

                {/* Floating UI Card - Bottom Left (Best Price Badge) */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 1, repeat: Infinity, repeatType: "reverse", repeatDelay: 2.5 }}
                  className="absolute bottom-20 sm:bottom-28 lg:bottom-36 left-0 sm:left-4 lg:left-8 bg-white dark:bg-gray-800 backdrop-blur-xl rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 shadow-smooth-lg border border-gray-100 dark:border-gray-700 scale-75 sm:scale-90 lg:scale-100"
                  style={{ zIndex: 20 }}
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 lg:w-12 lg:h-12 bg-gradient-to-br from-orange-400 to-red-500 rounded-xl flex items-center justify-center">
                      <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Pricing</p>
                      <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white whitespace-nowrap">Best Deals</p>
                    </div>
                  </div>
                </motion.div>

                {/* Floating UI Card - Top Left (Fast Delivery Badge) */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: 1.2, repeat: Infinity, repeatType: "reverse", repeatDelay: 3 }}
                  className="absolute top-16 sm:top-24 lg:top-28 left-0 sm:left-0 lg:left-4 bg-white dark:bg-gray-800 backdrop-blur-xl rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 shadow-smooth-lg border border-gray-100 dark:border-gray-700 scale-75 sm:scale-90 lg:scale-100"
                  style={{ zIndex: 20 }}
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 lg:w-12 lg:h-12 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-xl flex items-center justify-center">
                      <Truck className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Delivery</p>
                      <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white whitespace-nowrap">Super Fast</p>
                    </div>
                  </div>
                </motion.div>
                
                {/* Main Delivery Boy Image */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.8, delay: 0.5 }}
                  className="relative w-full max-w-[280px] sm:max-w-[350px] lg:max-w-md mx-auto"
                  style={{ zIndex: 10 }}
                >
                  {/* Shadow under image */}
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-8 bg-gradient-to-r from-transparent via-black/20 to-transparent rounded-full blur-xl"></div>
                  
                  <img 
                    src="/delivery_boy.png" 
                    alt="Delivery Boy"
                    className="relative w-full h-auto object-contain drop-shadow-2xl"
                    style={{ zIndex: 10 }}
                  />
                </motion.div>

                {/* Decorative Elements - Floating Shapes */}
                <motion.div 
                  className="hidden sm:block absolute top-16 sm:top-20 lg:top-24 right-12 sm:right-16 lg:right-20 w-16 sm:w-20 lg:w-24 h-16 sm:h-20 lg:h-24 border-3 sm:border-4 border-green-400/40 dark:border-green-500/40 rounded-3xl rotate-12"
                  animate={{ 
                    rotate: [12, 20, 12],
                    scale: [1, 1.05, 1]
                  }}
                  transition={{
                    duration: 5,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  style={{ zIndex: 5 }}
                ></motion.div>
                <motion.div 
                  className="hidden sm:block absolute bottom-20 sm:bottom-24 lg:bottom-32 right-16 sm:right-20 lg:right-24 w-12 sm:w-16 lg:w-20 h-12 sm:h-16 lg:h-20 border-3 sm:border-4 border-emerald-400/40 dark:border-emerald-500/40 rounded-full"
                  animate={{ 
                    scale: [1, 1.1, 1],
                    opacity: [0.4, 0.6, 0.4]
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  style={{ zIndex: 5 }}
                ></motion.div>
                
                {/* Small Floating Dots */}
                <motion.div 
                  className="absolute top-1/4 left-8 sm:left-12 w-3 h-3 sm:w-4 sm:h-4 bg-green-400 dark:bg-green-500 rounded-full"
                  animate={{ 
                    y: [0, -20, 0],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  style={{ zIndex: 5 }}
                ></motion.div>
                <motion.div 
                  className="absolute bottom-1/3 right-8 sm:right-12 w-2 h-2 sm:w-3 sm:h-3 bg-emerald-400 dark:bg-emerald-500 rounded-full"
                  animate={{ 
                    y: [0, 15, 0],
                    opacity: [0.6, 1, 0.6]
                  }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.5
                  }}
                  style={{ zIndex: 5 }}
                ></motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Categories Section */}
      <section className="py-8 md:py-12 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Categories
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              All Categories
            </p>
          </motion.div>
          
          {/* Category Grid */}
          <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 sm:gap-8">
            {categories.filter(cat => cat.id !== 'all').map((category, index) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
                onClick={() => handleCategoryClick(category.id)}
                className="cursor-pointer flex flex-col items-center"
              >
                {/* Category Image - Clean Icon Style */}
                <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 mb-3 rounded-2xl overflow-hidden transition-transform duration-300">
                  <img 
                    src={category.image} 
                    alt={category.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {/* Category Name */}
                <h3 className="text-xs sm:text-sm md:text-base font-bold text-gray-900 dark:text-white text-center mb-1 hover:text-green-600 dark:hover:text-green-400 transition-colors">
                  {category.name}
                </h3>
                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 text-center">
                  {category.nameHindi}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <motion.section 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        viewport={{ once: true }}
        className="relative py-16 md:py-20 overflow-hidden bg-gray-50 dark:bg-gray-900"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content - Benefits List */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              {/* Section Header */}
              <div>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4">
                  Why Choose us?
                </h2>
                <p className="text-gray-600 dark:text-gray-400 max-w-md">
                  We provide the best quality products with unmatched service to ensure your satisfaction
                </p>
                <div className="w-16 h-1 bg-green-600 mt-4"></div>
              </div>

              {/* Benefits List */}
              <div className="space-y-6">
                {/* Benefit 1 */}
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  viewport={{ once: true }}
                  className="flex items-start gap-4"
                >
                  <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-smooth">
                    1
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2">
                      100% Payment Secure
                    </h3>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                      Safe and secure payment options with multiple payment methods for your convenience
                    </p>
                  </div>
                </motion.div>

                {/* Benefit 2 */}
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  viewport={{ once: true }}
                  className="flex items-start gap-4"
                >
                  <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-smooth">
                    2
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2">
                      Fast Delivery Just
                    </h3>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                      Quick and reliable delivery service to get your orders to you as fast as possible
                    </p>
                  </div>
                </motion.div>

                {/* Benefit 3 */}
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  viewport={{ once: true }}
                  className="flex items-start gap-4"
                >
                  <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-smooth">
                    3
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2">
                      Completely 100% Fresh & Organic Food
                    </h3>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                      Sourced directly from farms ensuring freshness and quality in every product
                    </p>
                  </div>
                </motion.div>

                {/* Benefit 4 */}
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  viewport={{ once: true }}
                  className="flex items-start gap-4"
                >
                  <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-smooth">
                    4
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2">
                      Skip or Cancel Anytime
                    </h3>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                      Flexible ordering with the freedom to modify or cancel orders as per your needs
                    </p>
                  </div>
                </motion.div>
              </div>
            </motion.div>

            {/* Right Content - Image with Planet Rings */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              className="relative flex items-center justify-center"
            >
              <div className="relative w-full max-w-[400px] sm:max-w-[500px] lg:max-w-[600px] aspect-square">
                
                {/* Outer Ring - Rotating Clockwise */}
                <motion.div 
                  className="absolute inset-0 flex items-center justify-center"
                  animate={{ 
                    rotate: 360
                  }}
                  transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                  style={{ transformOrigin: "center" }}
                >
                  {/* Outer ring ellipse */}
                  <div className="relative w-full h-full">
                    <div 
                      className="absolute inset-0 border-4 border-green-300/40 dark:border-green-500/40 rounded-full"
                      style={{ 
                        transform: "scaleY(0.3)", 
                        transformOrigin: "center"
                      }}
                    ></div>
                    
                    {/* Small elements on outer ring */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-green-400 dark:bg-green-500 rounded-full shadow-lg"></div>
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-emerald-400 dark:bg-emerald-500 rounded-full shadow-lg"></div>
                    <div className="absolute top-1/2 left-0 -translate-y-1/2 w-3 h-3 bg-teal-400 dark:bg-teal-500 rounded-full shadow-lg"></div>
                    <div className="absolute top-1/2 right-0 -translate-y-1/2 w-4 h-4 bg-green-500 dark:bg-green-600 rounded-full shadow-lg"></div>
                  </div>
                </motion.div>

                {/* Inner Ring - Rotating Counter-Clockwise */}
                <motion.div 
                  className="absolute inset-0 flex items-center justify-center"
                  animate={{ 
                    rotate: -360
                  }}
                  transition={{
                    duration: 15,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                  style={{ transformOrigin: "center" }}
                >
                  {/* Inner ring ellipse */}
                  <div className="relative w-4/5 h-4/5">
                    <div 
                      className="absolute inset-0 border-4 border-orange-300/50 dark:border-orange-500/50 rounded-full"
                      style={{ 
                        transform: "scaleY(0.25)", 
                        transformOrigin: "center"
                      }}
                    ></div>
                    
                    {/* Small elements on inner ring */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-orange-400 dark:bg-orange-500 rounded-full shadow-lg"></div>
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-yellow-400 dark:bg-yellow-500 rounded-full shadow-lg"></div>
                    <div className="absolute top-1/2 left-0 -translate-y-1/2 w-2.5 h-2.5 bg-red-300 dark:bg-red-400 rounded-full shadow-lg"></div>
                    <div className="absolute top-1/2 right-0 -translate-y-1/2 w-3 h-3 bg-orange-300 dark:bg-orange-400 rounded-full shadow-lg"></div>
                  </div>
                </motion.div>

                {/* Central Bag Image - No Background */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div 
                    className="relative w-full h-full flex items-center justify-center"
                    animate={{ 
                      y: [0, -15, 0],
                      scale: [1, 1.05, 1]
                    }}
                    transition={{
                      duration: 5,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    <img 
                      src="/bag.png" 
                      alt="Fresh Groceries"
                      className="w-4/5 h-4/5 object-contain drop-shadow-2xl"
                    />
                  </motion.div>
                </div>

                {/* Additional Floating Orbs */}
                <motion.div 
                  className="absolute -top-8 -right-8 w-16 h-16 bg-gradient-to-br from-yellow-300 to-orange-400 rounded-full opacity-80 shadow-xl"
                  animate={{ 
                    y: [0, -25, 0],
                    x: [0, 10, 0],
                    scale: [1, 1.2, 1]
                  }}
                  transition={{
                    duration: 6,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                ></motion.div>
                <motion.div 
                  className="absolute -bottom-10 -left-10 w-20 h-20 bg-gradient-to-br from-green-300 to-teal-400 rounded-full opacity-70 shadow-xl"
                  animate={{ 
                    y: [0, 20, 0],
                    x: [0, -15, 0],
                    scale: [1, 1.15, 1]
                  }}
                  transition={{
                    duration: 7,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 1
                  }}
                ></motion.div>
                <motion.div 
                  className="absolute top-16 -left-6 w-12 h-12 bg-gradient-to-br from-blue-300 to-cyan-400 rounded-full opacity-60 shadow-lg"
                  animate={{ 
                    y: [0, -15, 0],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{
                    duration: 5,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.5
                  }}
                ></motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Smooth Gradient Transition */}
      <div className="h-32 bg-gradient-to-b from-white via-white/50 to-transparent"></div>

      {/* Modern Minimalist Footer */}
      <footer className="relative mt-[-8rem] overflow-hidden">
        {/* Mountain Background Image */}
        <div 
          className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat"
          style={{ 
            backgroundImage: `url('/mountain.svg')`,
            zIndex: 0
          }}
        ></div>

        {/* Dark Gradient Overlay for Readability */}
        <div 
          className="absolute inset-0 bg-gradient-to-b from-gray-900/85 via-gray-900/90 to-gray-950/95"
          style={{ zIndex: 1 }}
        ></div>

        {/* Footer Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
            
            {/* About Column */}
            <div className="space-y-4">
              <h3 className="text-white text-sm font-semibold tracking-wide uppercase opacity-90">About Us</h3>
              <p className="text-gray-300 text-xs leading-relaxed opacity-75">
                Premium quality groceries delivered fresh to your doorstep. Your trusted partner for daily essentials.
              </p>
              <div className="flex items-center gap-3 pt-2">
                <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <span className="text-green-400 font-bold text-xs">TB</span>
                </div>
                <span className="text-white text-xs font-medium opacity-80">Timeless Baazar</span>
              </div>
            </div>

            {/* Quick Links Column */}
            <div className="space-y-4">
              <h3 className="text-white text-sm font-semibold tracking-wide uppercase opacity-90">Quick Links</h3>
              <ul className="space-y-2">
                <li>
                  <a href="/products" className="text-gray-300 text-xs hover:text-green-400 transition-colors opacity-75 hover:opacity-100">
                    Shop All Products
                  </a>
                </li>
                <li>
                  <a href="/cart" className="text-gray-300 text-xs hover:text-green-400 transition-colors opacity-75 hover:opacity-100">
                    My Cart
                  </a>
                </li>
                <li>
                  <a href="/orders" className="text-gray-300 text-xs hover:text-green-400 transition-colors opacity-75 hover:opacity-100">
                    Track Order
                  </a>
                </li>
                <li>
                  <button className="text-gray-300 text-xs hover:text-green-400 transition-colors opacity-75 hover:opacity-100">
                    Help & Support
                  </button>
                </li>
              </ul>
            </div>

            {/* Contact Column */}
            <div className="space-y-4">
              <h3 className="text-white text-sm font-semibold tracking-wide uppercase opacity-90">Contact</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <div className="mt-0.5">
                    <svg className="w-3.5 h-3.5 text-green-400 opacity-75" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                  </div>
                  <a href="mailto:timelessbazzar76@gmail.com" className="text-gray-300 text-xs hover:text-green-400 transition-colors opacity-75 hover:opacity-100">
                    timelessbazzar76@gmail.com
                  </a>
                </div>
                <div className="flex items-start gap-2">
                  <div className="mt-0.5">
                    <svg className="w-3.5 h-3.5 text-green-400 opacity-75" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                    </svg>
                  </div>
                  <a href="tel:+919266667069" className="text-gray-300 text-xs hover:text-green-400 transition-colors opacity-75 hover:opacity-100">
                    +91 92666 67069
                  </a>
                </div>
                <div className="flex items-start gap-2">
                  <div className="mt-0.5">
                    <svg className="w-3.5 h-3.5 text-green-400 opacity-75" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-gray-300 text-xs opacity-75">
                    Faridabad, India
                  </span>
                </div>
              </div>
            </div>

            {/* Follow Us Column */}
            <div className="space-y-4">
              <h3 className="text-white text-sm font-semibold tracking-wide uppercase opacity-90">Follow Us</h3>
              <div className="flex items-center gap-3">
                <Link 
                  to="/" 
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-green-500/20 flex items-center justify-center transition-all group"
                  aria-label="Facebook"
                >
                  <svg className="w-4 h-4 text-gray-400 group-hover:text-green-400 transition-colors" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </Link>
                <Link 
                  to="/" 
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-green-500/20 flex items-center justify-center transition-all group"
                  aria-label="Instagram"
                >
                  <svg className="w-4 h-4 text-gray-400 group-hover:text-green-400 transition-colors" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </Link>
                <Link 
                  to="/" 
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-green-500/20 flex items-center justify-center transition-all group"
                  aria-label="Twitter"
                >
                  <svg className="w-4 h-4 text-gray-400 group-hover:text-green-400 transition-colors" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                </Link>
              </div>
              <p className="text-gray-400 text-xs opacity-60 pt-2">
                Stay updated with our latest offers and products
              </p>
            </div>

          </div>

          {/* Bottom Bar */}
          <div className="mt-12 pt-8 border-t border-white/10">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <p className="text-gray-400 text-xs opacity-60">
                © {new Date().getFullYear()} Timeless Baazar. All rights reserved.
              </p>
              <div className="flex items-center gap-6">
                <button className="text-gray-400 text-xs hover:text-green-400 transition-colors opacity-60 hover:opacity-100">
                  Privacy Policy
                </button>
                <button className="text-gray-400 text-xs hover:text-green-400 transition-colors opacity-60 hover:opacity-100">
                  Terms of Service
                </button>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
