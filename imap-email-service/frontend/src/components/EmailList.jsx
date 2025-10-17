import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

function EmailList({ token, prefix, onLogout }) {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const navigate = useNavigate();

  useEffect(() => {
    fetchEmails();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchEmails, 30000);
    return () => clearInterval(interval);
  }, [page]);

  const fetchEmails = async () => {
    try {
      const response = await axios.get('/api/emails', {
        headers: { Authorization: `Bearer ${token}` },
        params: { page, limit: 50 }
      });

      setEmails(response.data.emails);
      setTotalPages(response.data.totalPages);
      setLoading(false);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        onLogout();
      } else {
        setError('Failed to load emails');
      }
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const deleteEmail = async (id, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this email?')) {
      return;
    }

    try {
      await axios.delete(`/api/emails/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchEmails();
    } catch (err) {
      alert('Failed to delete email');
    }
  };

  if (loading) {
    return <div className="loading">Loading emails...</div>;
  }

  return (
    <div className="email-list-container">
      <header className="header">
        <div className="header-content">
          <h1>📧 Emails for: <span className="prefix-badge">{prefix}</span></h1>
          <div className="header-actions">
            {prefix === 'admin' && (
              <button className="btn-secondary" onClick={() => navigate('/admin')}>
                Admin Panel
              </button>
            )}
            <button className="btn-secondary" onClick={fetchEmails}>
              Refresh
            </button>
            <button className="btn-secondary" onClick={onLogout}>
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="main-content">
        {error && <div className="error-message">{error}</div>}

        {emails.length === 0 ? (
          <div className="empty-state">
            <h2>No emails yet</h2>
            <p>Emails sent to <code>{prefix}@yourdomain.com</code> or <code>{prefix}+anything@yourdomain.com</code> will appear here.</p>
          </div>
        ) : (
          <>
            <div className="email-list">
              {emails.map((email) => (
                <Link
                  key={email.id}
                  to={`/email/${email.id}`}
                  className={`email-item ${email.is_read ? 'read' : 'unread'}`}
                >
                  <div className="email-header">
                    <span className="email-from">{email.from_address}</span>
                    <span className="email-date">{formatDate(email.received_date)}</span>
                  </div>
                  <div className="email-subject">
                    {!email.is_read && <span className="unread-dot">●</span>}
                    {email.subject}
                  </div>
                  <div className="email-preview">
                    {email.body_text?.substring(0, 100)}...
                  </div>
                  <div className="email-actions">
                    {email.attachments.length > 0 && (
                      <span className="attachment-badge">
                        📎 {email.attachments.length}
                      </span>
                    )}
                    <button
                      className="btn-delete"
                      onClick={(e) => deleteEmail(email.id, e)}
                    >
                      Delete
                    </button>
                  </div>
                </Link>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-secondary"
                >
                  Previous
                </button>
                <span>Page {page} of {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="btn-secondary"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default EmailList;
