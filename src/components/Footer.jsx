import React from 'react';
import { Link } from 'react-router-dom';
import { FaPhone, FaWhatsapp, FaHeart, FaEnvelope, FaMapMarkerAlt } from 'react-icons/fa';
import { HiLocationMarker, HiMail } from 'react-icons/hi';
import { motion } from 'framer-motion';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-orange-900/50 dark:from-black dark:via-gray-900 dark:to-orange-900/30 text-white border-t border-orange-800/30 dark:border-orange-900/20 transition-all duration-500 overflow-hidden">
      {/* Decorative Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnoiIHN0cm9rZT0iI0ZGOTgwMCIgc3Ryb2tlLXdpZHRoPSIxIiBzdHJva2Utb3BhY2l0eT0iLjA1Ii8+PC9nPjwvc3ZnPg==')] opacity-30"></div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-accent-600 rounded-xl flex items-center justify-center shadow-glow">
                <span className="text-2xl font-bold text-white">TB</span>
              </div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-accent-500 bg-clip-text text-transparent">
                Timeless Baazar
              </h3>
            </div>
            <p className="text-sm text-gray-300 mb-6 leading-relaxed">
              Your trusted grocery destination. Fresh quality products delivered with care and love.
            </p>
            <div className="flex items-center gap-2 text-gray-300 text-sm">
              <span className="font-medium">Made with</span>
              <motion.div
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                <FaHeart className="text-red-500" />
              </motion.div>
              <span className="font-medium">for you</span>
            </div>
          </motion.div>

          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            viewport={{ once: true }}
          >
            <h4 className="text-base font-bold text-white mb-6 flex items-center gap-2">
              <span className="text-orange-500">→</span>
              Quick Links
            </h4>
            <ul className="space-y-3">
              <motion.li whileHover={{ x: 8 }} transition={{ duration: 0.2 }}>
                <Link to="/" className="text-sm text-gray-300 hover:text-orange-400 transition-colors duration-300 flex items-center gap-2 group">
                  <span className="text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity">•</span> 
                  <span>Home</span>
                </Link>
              </motion.li>
              <motion.li whileHover={{ x: 8 }} transition={{ duration: 0.2 }}>
                <Link to="/products" className="text-sm text-gray-300 hover:text-orange-400 transition-colors duration-300 flex items-center gap-2 group">
                  <span className="text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity">•</span> 
                  <span>Products</span>
                </Link>
              </motion.li>
              <motion.li whileHover={{ x: 8 }} transition={{ duration: 0.2 }}>
                <Link to="/cart" className="text-sm text-gray-300 hover:text-orange-400 transition-colors duration-300 flex items-center gap-2 group">
                  <span className="text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity">•</span> 
                  <span>Shopping Cart</span>
                </Link>
              </motion.li>
            </ul>
          </motion.div>

          {/* Customer Service */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <h4 className="text-base font-bold text-white mb-6 flex items-center gap-2">
              <span className="text-orange-500">→</span>
              Customer Service
            </h4>
            <ul className="space-y-3">
              <motion.li whileHover={{ x: 8 }} transition={{ duration: 0.2 }}>
                <Link to="/track-order" className="text-sm text-gray-300 hover:text-orange-400 transition-colors duration-300 flex items-center gap-2 group">
                  <span className="text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity">•</span> 
                  <span>Track Order</span>
                </Link>
              </motion.li>
              <motion.li whileHover={{ x: 8 }} transition={{ duration: 0.2 }}>
                <Link to="/about" className="text-sm text-gray-300 hover:text-orange-400 transition-colors duration-300 flex items-center gap-2 group">
                  <span className="text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity">•</span> 
                  <span>About Us</span>
                </Link>
              </motion.li>
              <motion.li whileHover={{ x: 8 }} transition={{ duration: 0.2 }}>
                <a href="tel:9266667069" className="text-sm text-gray-300 hover:text-orange-400 transition-colors duration-300 flex items-center gap-2 group">
                  <span className="text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity">•</span> 
                  <span>Contact Us</span>
                </a>
              </motion.li>
            </ul>
          </motion.div>

          {/* Contact Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            viewport={{ once: true }}
          >
            <h4 className="text-base font-bold text-white mb-6 flex items-center gap-2">
              <span className="text-orange-500">→</span>
              Contact
            </h4>
            <div className="space-y-4">
              <motion.div whileHover={{ x: 5, scale: 1.02 }} className="flex items-center space-x-3 p-3 rounded-xl bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
                <div className="p-2 bg-orange-500/20 rounded-lg">
                  <FaPhone className="text-orange-400 text-base" />
                </div>
                <a href="tel:9266667069" className="text-sm text-gray-200 hover:text-orange-400 transition-colors duration-300 font-medium">
                  9266667069
                </a>
              </motion.div>
              <motion.div whileHover={{ x: 5, scale: 1.02 }} className="flex items-center space-x-3 p-3 rounded-xl bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
                <div className="p-2 bg-orange-500/20 rounded-lg">
                  <FaPhone className="text-orange-400 text-base" />
                </div>
                <a href="tel:9654653719" className="text-sm text-gray-200 hover:text-orange-400 transition-colors duration-300 font-medium">
                  9654653719
                </a>
              </motion.div>
              <motion.div whileHover={{ x: 5, scale: 1.02 }} className="flex items-center space-x-3 p-3 rounded-xl bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
                <div className="p-2 bg-success-500/20 rounded-lg">
                  <FaWhatsapp className="text-success-500 text-base" />
                </div>
                <a
                  href="https://wa.me/919266667069"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-200 hover:text-success-400 transition-colors duration-300 font-medium"
                >
                  WhatsApp Us
                </a>
              </motion.div>
              <motion.div whileHover={{ x: 5, scale: 1.02 }} className="flex items-center space-x-3 p-3 rounded-xl bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
                <div className="p-2 bg-orange-500/20 rounded-lg">
                  <HiMail className="text-orange-400 text-base" />
                </div>
                <a href="mailto:timelessbazzar76@gmail.com" className="text-sm text-gray-200 hover:text-orange-400 transition-colors duration-300 font-medium break-all">
                  timelessbazzar76@gmail.com
                </a>
              </motion.div>
              <motion.div whileHover={{ x: 5, scale: 1.02 }} className="flex items-start space-x-3 p-3 rounded-xl bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
                <div className="p-2 bg-orange-500/20 rounded-lg">
                  <HiLocationMarker className="text-orange-400 text-base" />
                </div>
                <span className="text-sm text-gray-200 font-medium leading-relaxed">
                  Faridabad
                </span>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Bottom Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          viewport={{ once: true }}
          className="mt-12 pt-8 border-t border-orange-800/30"
        >
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-400 text-center md:text-left">
              © {currentYear} <span className="font-semibold text-orange-400">Timeless Baazar</span>. All rights reserved.
            </p>
            <div className="flex gap-4 text-xs text-gray-400">
              <span className="hover:text-orange-400 transition-colors cursor-pointer">Privacy Policy</span>
              <span>•</span>
              <span className="hover:text-orange-400 transition-colors cursor-pointer">Terms of Service</span>
              <span>•</span>
              <span className="hover:text-orange-400 transition-colors cursor-pointer">Refund Policy</span>
            </div>
          </div>
        </motion.div>
      </div>
    </footer>
  );
};

export default Footer;
