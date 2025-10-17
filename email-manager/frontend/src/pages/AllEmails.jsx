import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { format } from 'date-fns';
import DOMPurify from 'dompurify';
import {
  EnvelopeIcon,
  ArrowPathIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

export default function AllEmails() {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [limit] = useState(50);
  const [offset] = useState(0);

  useEffect(() => {
    loadEmails();
  }, []);

  const loadEmails = async () => {
    setLoading(true);
    try {
      const response = await api.getAllEmails(limit, offset);
      setEmails(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load emails');
    } finally {
      setLoading(false);
    }
  };

  const sanitizeHtml = (html) => {
    return { __html: DOMPurify.sanitize(html) };
  };

  if (loading && emails.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-gray-900">All Emails (Catch-all)</h2>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
              {emails.length} emails
            </span>
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
              Admin View
            </span>
          </div>
          <button
            onClick={loadEmails}
            disabled={loading}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <ArrowPathIcon className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
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
                        <p className="text-sm text-gray-500 truncate">
                          From: {email.sender}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          To: {email.recipient}
                        </p>
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
                  <p>
                    <span className="font-medium">Message ID:</span>{' '}
                    <span className="font-mono text-xs">{selectedEmail.message_id}</span>
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