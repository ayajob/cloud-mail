import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import EmailList from './pages/EmailList';
import PrefixManagement from './pages/PrefixManagement';
import AllEmails from './pages/AllEmails';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <Layout>
                <Home />
              </Layout>
            }
          />
          
          <Route
            path="/emails"
            element={
              <PrivateRoute>
                <Layout>
                  <EmailList />
                </Layout>
              </PrivateRoute>
            }
          />
          
          <Route
            path="/admin/prefixes"
            element={
              <PrivateRoute adminOnly>
                <Layout>
                  <PrefixManagement />
                </Layout>
              </PrivateRoute>
            }
          />
          
          <Route
            path="/admin/all-emails"
            element={
              <PrivateRoute adminOnly>
                <Layout>
                  <AllEmails />
                </Layout>
              </PrivateRoute>
            }
          />
          
          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;