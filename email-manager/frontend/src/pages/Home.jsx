import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  EnvelopeIcon,
  KeyIcon,
  ShieldCheckIcon,
  ServerIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

export default function Home() {
  const { isAuthenticated, isAdmin } = useAuth();

  const features = [
    {
      icon: EnvelopeIcon,
      title: 'Prefix-based Email Filtering',
      description: 'Access emails sent to specific prefixes like support@, info@, or contact@',
    },
    {
      icon: KeyIcon,
      title: 'Secure Access Control',
      description: 'Each prefix is protected with its own access password for enhanced security',
    },
    {
      icon: ServerIcon,
      title: 'IMAP Integration',
      description: 'Connects to your catch-all mailbox via IMAP to fetch and manage emails',
    },
    {
      icon: ShieldCheckIcon,
      title: 'Admin Management',
      description: 'Administrators can create and manage email prefixes and access passwords',
    },
  ];

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="bg-white shadow rounded-lg px-8 py-12 text-center">
        <EnvelopeIcon className="mx-auto h-16 w-16 text-indigo-600" />
        <h1 className="mt-4 text-4xl font-bold text-gray-900">Email Manager</h1>
        <p className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto">
          A comprehensive email management system with prefix-based filtering and secure access control
        </p>
        
        {!isAuthenticated ? (
          <div className="mt-8 flex justify-center space-x-4">
            <Link
              to="/login"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Sign In
              <ChevronRightIcon className="ml-2 h-5 w-5" />
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Create Account
            </Link>
          </div>
        ) : (
          <div className="mt-8 flex justify-center space-x-4">
            <Link
              to="/emails"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Access Emails
              <ChevronRightIcon className="ml-2 h-5 w-5" />
            </Link>
            {isAdmin && (
              <Link
                to="/admin/prefixes"
                className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Manage Prefixes
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Features Grid */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Key Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div key={index} className="bg-white shadow rounded-lg p-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <Icon className="h-8 w-8 text-indigo-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900">{feature.title}</h3>
                    <p className="mt-2 text-gray-600">{feature.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-white shadow rounded-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">How It Works</h2>
        <div className="space-y-4">
          <div className="flex items-start">
            <span className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-semibold">
              1
            </span>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">Configure IMAP Connection</h3>
              <p className="mt-1 text-gray-600">
                The system connects to your email server's catch-all mailbox via IMAP
              </p>
            </div>
          </div>
          
          <div className="flex items-start">
            <span className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-semibold">
              2
            </span>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">Create Email Prefixes</h3>
              <p className="mt-1 text-gray-600">
                Administrators create prefixes (e.g., support, info) with unique access passwords
              </p>
            </div>
          </div>
          
          <div className="flex items-start">
            <span className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-semibold">
              3
            </span>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">Access Filtered Emails</h3>
              <p className="mt-1 text-gray-600">
                Users enter a prefix and password to view emails sent to that specific address
              </p>
            </div>
          </div>
          
          <div className="flex items-start">
            <span className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-semibold">
              4
            </span>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">View and Manage</h3>
              <p className="mt-1 text-gray-600">
                Browse emails with full content, attachments info, and refresh to get new messages
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Notice */}
      {isAdmin && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
          <div className="flex items-start">
            <ShieldCheckIcon className="h-8 w-8 text-indigo-600 flex-shrink-0" />
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-indigo-900">Administrator Access</h3>
              <p className="mt-1 text-indigo-700">
                As an administrator, you have access to manage email prefixes and view all emails
                in the catch-all mailbox. Use the navigation menu to access these features.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}