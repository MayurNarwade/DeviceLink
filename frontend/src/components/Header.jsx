import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sun, Moon, ArrowLeft } from 'lucide-react';
import useUiStore from '../store/uiStore';

export default function Header() {
  const darkMode = useUiStore((s) => s.darkMode);
  const toggleDarkMode = useUiStore((s) => s.toggleDarkMode);
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {!isHome && (
            <Link to="/" className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
              <ArrowLeft size={20} />
            </Link>
          )}
          <Link to="/" className="font-bold text-lg">AetherLink</Link>
        </div>
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          aria-label="Toggle theme"
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  );
}