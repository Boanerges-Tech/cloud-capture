import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import SharedMedia from './components/SharedMedia';
import PaymentCallback from './components/PaymentCallback';
import { ThemeProvider } from './components/ThemeContext';
import { API_BASE } from './config/api';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      axios.get(`${API_BASE}/auth/me`)
        .then(res => setUser(res.data.user))
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;

  return (
    <ThemeProvider>
      <Router>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
          <Routes>
            <Route
              path="/"
              element={user ? <Dashboard user={user} setUser={setUser} /> : <Auth setUser={setUser} />}
            />
            <Route
              path="/shared/:token"
              element={<SharedMedia />}
            />
            <Route
              path="/payment/callback"
              element={user ? <PaymentCallback user={user} setUser={setUser} /> : <Navigate to="/" />}
            />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;