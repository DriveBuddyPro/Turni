import React from 'react';
import { DivideIcon as LucideIcon, Building2, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import ThemeToggle from './ThemeToggle';

interface MenuItem {
  id: string;
  label: string;
  icon: typeof LucideIcon;
}

interface SidebarProps {
  menuItems: MenuItem[];
  currentView: string;
  onViewChange: (view: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ menuItems, currentView, onViewChange }) => {
  const { signOut, user } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="w-64 min-h-screen bg-white dark:bg-gray-800 shadow-lg transition-colors duration-200 flex flex-col justify-between">
      <div>
        <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">GestoreTurni</h1>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Edizione Pro</p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
        
        <nav className="mt-4 sm:mt-6 px-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`w-full flex items-center px-4 py-3 text-left rounded-lg mb-1 last:mb-0 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  currentView === item.id
                    ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-r-4 border-blue-600'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
      
      <div className="w-full p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 space-y-4">
        {/* User Info */}
        {user && (
          <div className="text-center">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-white font-bold text-sm">
                {user.email?.charAt(0).toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
              {user.email}
            </p>
          </div>
        )}
        
        {/* Sign Out Button */}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/50 rounded-lg transition-colors text-sm font-medium"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Disconnetti
        </button>
        
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
          <p>Versione 1.0.3</p>
          <p>© 2025 GestoreTurni</p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;