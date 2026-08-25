import React, { useState, useRef } from 'react';
import { HiSearch } from 'react-icons/hi';

const SearchBar = ({ onSearch, placeholder = 'Search products...' }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const timerRef = useRef(null);

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onSearch(value), 300);
  };

  return (
    <div className="relative w-full max-w-xl">
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
        <HiSearch className="h-5 w-5 text-orange-400" />
      </div>
      <input
        type="text"
        value={searchTerm}
        onChange={handleSearch}
        placeholder={placeholder}
        className="w-full pl-12 pr-4 py-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-2 border-orange-200 dark:border-orange-900/30 rounded-2xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-orange-400 dark:focus:border-orange-600 transition-colors"
      />
    </div>
  );
};

export default SearchBar;
