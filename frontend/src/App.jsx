import React, { useState } from 'react';
import AdminDashboard from './admin/AdminDashboard';
import AuthPage from './pages/AuthPage';
import ClientApp from './client/App.jsx';
import authService from './api/auth';

export default function App() {
  // Always start with the Login page as requested
  const [currentView, setCurrentView] = useState('auth'); // 'auth' | 'admin' | 'client'
  const [currentUser, setCurrentUser] = useState(null);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);

    // Reset browser pathname to '/' so client lands directly on Loan Planner
    if (window.location.pathname !== '/') {
      window.history.replaceState(null, '', '/');
    }

    if (user?.role === 'admin') {
      setCurrentView('admin');
    } else {
      setCurrentView('client');
    }
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
    setCurrentView('auth');
    if (window.location.pathname !== '/') {
      window.history.replaceState(null, '', '/');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* 1. Only Login Page at Start */}
      {currentView === 'auth' && (
        <AuthPage onLoginSuccess={handleLoginSuccess} />
      )}

      {/* 2. Admin Panel - Opened if credentials are Admin */}
      {currentView === 'admin' && (
        <AdminDashboard user={currentUser} onLogout={handleLogout} />
      )}

      {/* 3. Client Loan Planner - Opened if credentials are Client */}
      {currentView === 'client' && (
        <ClientApp user={currentUser} onLogout={handleLogout} />
      )}
    </div>
  );
}
