import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import EmailList from './components/EmailList';
import EmailDetail from './components/EmailDetail';
import AdminPanel from './components/AdminPanel';
import './App.css';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [prefix, setPrefix] = useState(localStorage.getItem('prefix'));

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      localStorage.setItem('prefix', prefix);
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('prefix');
    }
  }, [token, prefix]);

  const handleLogin = (newToken, newPrefix) => {
    setToken(newToken);
    setPrefix(newPrefix);
  };

  const handleLogout = () => {
    setToken(null);
    setPrefix(null);
  };

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={!token ? <Login onLogin={handleLogin} /> : <Navigate to="/" />}
        />
        <Route
          path="/"
          element={
            token ? (
              <EmailList token={token} prefix={prefix} onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/email/:id"
          element={
            token ? (
              <EmailDetail token={token} prefix={prefix} onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/admin"
          element={
            token && prefix === 'admin' ? (
              <AdminPanel token={token} onLogout={handleLogout} />
            ) : (
              <Navigate to="/" />
            )
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
