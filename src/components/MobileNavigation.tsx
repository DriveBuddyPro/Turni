import React from 'react';
import { Menu, X, Building2, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import ThemeToggle from './ThemeToggle';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
}

interface MobileNavigationProps {
  menuItems: MenuItem[];
  currentView: string;
  onViewChange: (view: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const MobileNavigation: React.FC<MobileNavigationProps> = ({
  menuItems,
  currentView,
  onViewChange,
  isOpen,
  onToggle
}) => {
  const { signOut, user } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">GestoreTurni</h1>
          </div>
        </div>
        <div className="flex items-center space-x-1 sm:space-x-2">
          <ThemeToggle />
          <button
            onClick={onToggle}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {isOpen ? (
              <X className="w-6 h-6 text-gray-600 dark:text-gray-300" />
            ) : (
              <Menu className="w-6 h-6 text-gray-600 dark:text-gray-300" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onToggle} />
          <div className="fixed top-0 right-0 h-full w-64 bg-white dark:bg-gray-800 shadow-xl transform transition-transform duration-300 flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className="p-2 bg-blue-600 rounded-lg">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">GestoreTurni</h1>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Edizione Pro</p>
                  </div>
                </div>
                <button
                  onClick={onToggle}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </button>
              </div>
            </div>
            
            <nav className="mt-2 sm:mt-4 flex-1 px-4">
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

            {/* User Info and Sign Out */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
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
              
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/50 rounded-lg transition-colors text-sm font-medium"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Disconnetti
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MobileNavigation;