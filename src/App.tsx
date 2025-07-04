import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Dashboard from './components/Dashboard';
import Sidebar from './components/Sidebar';
import EmployeeManagement from './components/EmployeeManagement';
import MobileNavigation from './components/MobileNavigation';
import AuthForm from './components/AuthForm';
import { Calendar, Users } from 'lucide-react';

type View = 'dashboard' | 'employees';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Calendar },
    { id: 'employees', label: 'OSS', icon: Users },
  ];

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'employees':
        return <EmployeeManagement />;
      default:
        return <Dashboard />;
    }
  };

  const handleViewChange = (view: string) => {
    setCurrentView(view as View);
    setIsMobileMenuOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Mobile Navigation (top bar with hamburger) */}
      <div className="lg:hidden">
        <MobileNavigation
          menuItems={menuItems}
          currentView={currentView}
          onViewChange={handleViewChange}
          isOpen={isMobileMenuOpen}
          onToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />
      </div>

      <div className="flex flex-1">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <Sidebar
            menuItems={menuItems}
            currentView={currentView}
            onViewChange={handleViewChange}
          />
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-auto minimal-container py-4 sm:py-8">
          {renderCurrentView()}
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
        <Toaster 
          position="top-center"
          toastOptions={{
            className: 'dark:bg-gray-800 dark:text-white',
            style: {
              borderRadius: '12px',
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: '500',
              maxWidth: '90vw',
            },
            success: {
              style: {
                background: '#10B981',
                color: 'white',
              },
            },
            error: {
              style: {
                background: '#EF4444',
                color: 'white',
              },
            },
          }}
        />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;