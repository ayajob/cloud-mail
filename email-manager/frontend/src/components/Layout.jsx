import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  HomeIcon,
  EnvelopeIcon,
  KeyIcon,
  UserIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';

export default function Layout({ children }) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <Link to="/" className="flex items-center">
                <EnvelopeIcon className="h-8 w-8 text-indigo-600" />
                <span className="ml-2 text-xl font-semibold">Email Manager</span>
              </Link>
              
              <div className="hidden sm:ml-8 sm:flex sm:space-x-8">
                <Link
                  to="/emails"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 border-b-2 border-transparent hover:border-gray-300"
                >
                  <EnvelopeIcon className="h-5 w-5 mr-1" />
                  Emails
                </Link>
                
                {isAdmin && (
                  <>
                    <Link
                      to="/admin/prefixes"
                      className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 border-b-2 border-transparent hover:border-gray-300"
                    >
                      <KeyIcon className="h-5 w-5 mr-1" />
                      Prefixes
                    </Link>
                    
                    <Link
                      to="/admin/all-emails"
                      className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 border-b-2 border-transparent hover:border-gray-300"
                    >
                      <Cog6ToothIcon className="h-5 w-5 mr-1" />
                      All Emails
                    </Link>
                  </>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <div className="flex items-center text-sm text-gray-700">
                    <UserIcon className="h-5 w-5 mr-1" />
                    {user.email}
                    {isAdmin && (
                      <span className="ml-2 px-2 py-1 text-xs bg-indigo-100 text-indigo-800 rounded">
                        Admin
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center text-sm text-gray-700 hover:text-gray-900"
                  >
                    <ArrowRightOnRectangleIcon className="h-5 w-5 mr-1" />
                    Logout
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="inline-flex items-center text-sm text-gray-700 hover:text-gray-900"
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5 mr-1" />
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}