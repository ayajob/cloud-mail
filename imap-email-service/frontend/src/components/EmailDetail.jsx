import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

function EmailDetail({ token, prefix, onLogout }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showHtml, setShowHtml] = useState(true);

  useEffect(() => {
    fetchEmail();
  }, [id]);

  const fetchEmail = async () => {
    try {
      const response = await axios.get(`/api/emails/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmail(response.data);
      setLoading(false);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        onLogout();
      } else if (err.response?.status === 404) {
        setError('Email not found');
      } else {
        setError('Failed to load email');
      }
      setLoading(false);
    }
  };

  const deleteEmail = async () => {
    if (!confirm('Are you sure you want to delete this email?')) {
      return;
    }

    try {
      await axios.delete(`/api/emails/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      navigate('/');
    } catch (err) {
      alert('Failed to delete email');
    }
  };

  if (loading) {
    return <div className="loading">Loading email...</div>;
  }

  if (error || !email) {
    return (
      <div className="error-container">
        <h2>Error</h2>
        <p>{error || 'Email not found'}</p>
        <button className="btn-primary" onClick={() => navigate('/')}>
          Back to Inbox
        </button>
      </div>
    );
  }

  return (
    <div className="email-detail-container">
      <header className="header">
        <div className="header-content">
          <button className="btn-secondary" onClick={() => navigate('/')}>
            ← Back to Inbox
          </button>
          <div className="header-actions">
            <button className="btn-secondary" onClick={deleteEmail}>
              Delete
            </button>
            <button className="btn-secondary" onClick={onLogout}>
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="email-detail">
        <div className="email-metadata">
          <h1 className="email-subject">{email.subject}</h1>
          
          <div className="email-info">
            <div className="info-row">
              <strong>From:</strong> {email.from_address}
            </div>
            <div className="info-row">
              <strong>To:</strong> {email.to_address}
            </div>
            <div className="info-row">
              <strong>Date:</strong> {new Date(email.received_date).toLocaleString()}
            </div>
            {email.attachments && email.attachments.length > 0 && (
              <div className="info-row">
                <strong>Attachments:</strong>
                <div className="attachments-list">
                  {email.attachments.map((att, idx) => (
                    <div key={idx} className="attachment-item">
                      📎 {att.filename} ({Math.round(att.size / 1024)} KB)
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="email-body">
          {email.body_html && (
            <div className="view-toggle">
              <button
                className={showHtml ? 'active' : ''}
                onClick={() => setShowHtml(true)}
              >
                HTML View
              </button>
              <button
                className={!showHtml ? 'active' : ''}
                onClick={() => setShowHtml(false)}
              >
                Text View
              </button>
            </div>
          )}

          {showHtml && email.body_html ? (
            <div className="email-html-content">
              <iframe
                srcDoc={email.body_html}
                title="Email content"
                sandbox="allow-same-origin"
                style={{ width: '100%', minHeight: '400px', border: 'none' }}
              />
            </div>
          ) : (
            <div className="email-text-content">
              <pre>{email.body_text || 'No text content'}</pre>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default EmailDetail;
