import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function AdminPanel({ token, onLogout }) {
  const navigate = useNavigate();
  const [prefixes, setPrefixes] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPrefix, setNewPrefix] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [prefixesRes, statsRes] = await Promise.all([
        axios.get('/api/admin/prefixes', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('/api/admin/stats', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setPrefixes(prefixesRes.data);
      setStats(statsRes.data);
      setLoading(false);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        onLogout();
      }
      setLoading(false);
    }
  };

  const handleAddPrefix = async (e) => {
    e.preventDefault();
    setError('');

    try {
      await axios.post('/api/admin/prefixes', {
        prefix: newPrefix,
        password: newPassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setShowAddModal(false);
      setNewPrefix('');
      setNewPassword('');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create prefix');
    }
  };

  const handleDeletePrefix = async (id) => {
    if (!confirm('Are you sure you want to delete this prefix?')) {
      return;
    }

    try {
      await axios.delete(`/api/admin/prefixes/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete prefix');
    }
  };

  const handleUpdatePassword = async (id) => {
    const newPass = prompt('Enter new password (minimum 6 characters):');
    if (!newPass || newPass.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    try {
      await axios.put(`/api/admin/prefixes/${id}`, {
        password: newPass
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Password updated successfully');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update password');
    }
  };

  if (loading) {
    return <div className="loading">Loading admin panel...</div>;
  }

  return (
    <div className="admin-container">
      <header className="header">
        <div className="header-content">
          <h1>🔧 Admin Panel</h1>
          <div className="header-actions">
            <button className="btn-secondary" onClick={() => navigate('/')}>
              Back to Inbox
            </button>
            <button className="btn-secondary" onClick={onLogout}>
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="admin-content">
        {stats && (
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Total Prefixes</h3>
              <p className="stat-number">{stats.totalPrefixes}</p>
            </div>
            <div className="stat-card">
              <h3>Total Emails</h3>
              <p className="stat-number">{stats.totalEmails}</p>
            </div>
          </div>
        )}

        <div className="section">
          <div className="section-header">
            <h2>Manage Prefixes</h2>
            <button className="btn-primary" onClick={() => setShowAddModal(true)}>
              Add New Prefix
            </button>
          </div>

          <div className="prefixes-table">
            <table>
              <thead>
                <tr>
                  <th>Prefix</th>
                  <th>Created At</th>
                  <th>Email Count</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {prefixes.map((prefix) => {
                  const emailCount = stats?.emailsByPrefix.find(e => e.prefix === prefix.prefix)?.count || 0;
                  return (
                    <tr key={prefix.id}>
                      <td><code>{prefix.prefix}</code></td>
                      <td>{new Date(prefix.created_at).toLocaleDateString()}</td>
                      <td>{emailCount}</td>
                      <td>
                        <button
                          className="btn-small"
                          onClick={() => handleUpdatePassword(prefix.id)}
                        >
                          Change Password
                        </button>
                        {prefix.prefix !== 'admin' && (
                          <button
                            className="btn-small btn-danger"
                            onClick={() => handleDeletePrefix(prefix.id)}
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {stats?.emailsByPrefix && stats.emailsByPrefix.length > 0 && (
          <div className="section">
            <h2>Emails by Prefix</h2>
            <div className="email-stats">
              {stats.emailsByPrefix.map((item) => (
                <div key={item.prefix} className="email-stat-item">
                  <span className="prefix-name">{item.prefix}</span>
                  <span className="email-count">{item.count} emails</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add New Prefix</h2>
            <form onSubmit={handleAddPrefix}>
              <div className="form-group">
                <label>Prefix</label>
                <input
                  type="text"
                  value={newPrefix}
                  onChange={(e) => setNewPrefix(e.target.value)}
                  placeholder="e.g., sales, support"
                  required
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  required
                  minLength={6}
                />
              </div>
              {error && <div className="error-message">{error}</div>}
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create Prefix
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPanel;
