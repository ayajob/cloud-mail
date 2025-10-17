import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { format } from 'date-fns';
import DOMPurify from 'dompurify';
import {
  EnvelopeIcon,
  KeyIcon,
  ArrowPathIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

export default function EmailList() {
  const [prefix, setPrefix] = useState('');
  const [accessPassword, setAccessPassword] = useState('');
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [accessGranted, setAccessGranted] = useState(false);

  const handleAccessSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Verify access
      await api.verifyPrefixAccess(prefix, accessPassword);
      setAccessGranted(true);
      
      // Fetch emails
      const response = await api.fetchEmails(prefix, accessPassword);
      setEmails(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to access emails');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!accessGranted) return;
    
    setLoading(true);
    try {
      await api.refreshEmails(prefix, accessPassword);
      const response = await api.fetchEmails(prefix, accessPassword);
      setEmails(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to refresh emails');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setPrefix('');
    setAccessPassword('');
    setEmails([]);
    setSelectedEmail(null);
    setAccessGranted(false);
    setError('');
  };

  const sanitizeHtml = (html) => {
    return { __html: DOMPurify.sanitize(html) };
  };

  if (!accessGranted) {
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Access Emails</h2>
          
          <form onSubmit={handleAccessSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
            
            <div>
              <label htmlFor="prefix" className="block text-sm font-medium text-gray-700">
                Email Prefix
              </label>
              <div className="mt-1 relative">
                <input
                  type="text"
                  id="prefix"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value.toLowerCase())}
                  required
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="e.g., support, info, contact"
                />
                <KeyIcon className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Enter the prefix for emails like prefix@domain.com
              </p>
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Access Password
              </label>
              <input
                type="password"
                id="password"
                value={accessPassword}
                onChange={(e) => setAccessPassword(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Enter access password"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <ArrowPathIcon className="animate-spin -ml-1 mr-3 h-5 w-5" />
                  Accessing...
                </>
              ) : (
                <>
                  <MagnifyingGlassIcon className="-ml-1 mr-2 h-5 w-5" />
                  Access Emails
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Emails for: <span className="text-indigo-600">{prefix}@*</span>
            </h2>
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
              {emails.length} emails
            </span>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <ArrowPathIcon className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={handleReset}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Change Prefix
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Email List and Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Email List */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="divide-y divide-gray-200">
              {emails.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <EnvelopeIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2">No emails found</p>
                </div>
              ) : (
                emails.map((email) => (
                  <button
                    key={email.message_id}
                    onClick={() => setSelectedEmail(email)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition ${
                      selectedEmail?.message_id === email.message_id ? 'bg-indigo-50' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {email.subject || '(No Subject)'}
                        </p>
                        <p className="text-sm text-gray-500 truncate">{email.sender}</p>
                        <p className="text-xs text-gray-400">
                          {format(new Date(email.date), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                      <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Email Detail */}
        <div className="lg:col-span-2">
          {selectedEmail ? (
            <div className="bg-white shadow rounded-lg p-6">
              <div className="border-b pb-4 mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {selectedEmail.subject || '(No Subject)'}
                </h3>
                <div className="mt-2 space-y-1 text-sm text-gray-600">
                  <p>
                    <span className="font-medium">From:</span> {selectedEmail.sender}
                  </p>
                  <p>
                    <span className="font-medium">To:</span> {selectedEmail.recipient}
                  </p>
                  <p>
                    <span className="font-medium">Date:</span>{' '}
                    {format(new Date(selectedEmail.date), 'MMMM d, yyyy h:mm a')}
                  </p>
                </div>
                
                {selectedEmail.attachments?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-gray-700">Attachments:</p>
                    <div className="mt-1 space-y-1">
                      {selectedEmail.attachments.map((attachment, idx) => (
                        <div key={idx} className="text-sm text-gray-600">
                          📎 {attachment.filename} ({attachment.content_type})
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="prose max-w-none">
                {selectedEmail.body_html ? (
                  <div dangerouslySetInnerHTML={sanitizeHtml(selectedEmail.body_html)} />
                ) : (
                  <pre className="whitespace-pre-wrap font-sans text-sm">
                    {selectedEmail.body_text || 'No content'}
                  </pre>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg p-12 text-center">
              <EnvelopeIcon className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-gray-500">Select an email to view its content</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}