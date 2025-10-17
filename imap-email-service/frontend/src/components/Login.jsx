import React, { useState } from 'react';
import axios from 'axios';

function Login({ onLogin }) {
  const [prefix, setPrefix] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post('/api/auth/login', {
        prefix,
        password
      });

      onLogin(response.data.token, response.data.prefix);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>IMAP Email Service</h1>
        <p className="subtitle">Sign in with your prefix and password</p>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="prefix">Prefix</label>
            <input
              id="prefix"
              type="text"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              placeholder="Enter your prefix"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="info-box">
          <p><strong>Default Admin Access:</strong></p>
          <p>Prefix: <code>admin</code></p>
          <p>Password: <code>admin123</code></p>
        </div>
      </div>
    </div>
  );
}

export default Login;
