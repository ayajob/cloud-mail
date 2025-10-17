# Quick Setup Guide

## Step-by-Step Installation

### 1. Prerequisites

- Node.js 18 or higher installed
- An email account with IMAP enabled
- Catch-all email configured for your domain

### 2. Backend Setup

```bash
# Navigate to backend directory
cd imap-email-service/backend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your settings
# Use your preferred text editor to configure:
# - JWT_SECRET (generate a random string)
# - IMAP credentials
# - Email domain

# Create data directory
mkdir -p data

# Start the backend
npm start
```

The backend will start on `http://localhost:3001`

### 3. Frontend Setup

```bash
# Open a new terminal
# Navigate to frontend directory
cd imap-email-service/frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend will start on `http://localhost:3000`

### 4. First Login

1. Open your browser to `http://localhost:3000`
2. Log in with default credentials:
   - Prefix: `admin`
   - Password: `admin123`

### 5. Configure Your First Prefix

1. Click "Admin Panel"
2. Click "Add New Prefix"
3. Create a prefix (e.g., `sales`)
4. Set a strong password
5. Test by sending an email to `sales@yourdomain.com`
6. Log out and log in with the new prefix

## Common IMAP Configurations

### Gmail

```env
IMAP_HOST=imap.gmail.com
IMAP_PORT=993
IMAP_USER=your-email@gmail.com
IMAP_PASSWORD=your-app-password
IMAP_TLS=true
```

**Note**: For Gmail, you need to:
1. Enable 2-Factor Authentication
2. Generate an App Password
3. Use the App Password in IMAP_PASSWORD

### Outlook/Office 365

```env
IMAP_HOST=outlook.office365.com
IMAP_PORT=993
IMAP_USER=your-email@outlook.com
IMAP_PASSWORD=your-password
IMAP_TLS=true
```

### Custom Domain (cPanel, Plesk, etc.)

```env
IMAP_HOST=mail.yourdomain.com
IMAP_PORT=993
IMAP_USER=catchall@yourdomain.com
IMAP_PASSWORD=your-password
IMAP_TLS=true
```

## Verifying Setup

### Check Backend Health

```bash
curl http://localhost:3001/api/health
```

Expected response:
```json
{"status":"ok","message":"IMAP Email Service is running"}
```

### Check Email Fetching

1. Send a test email to `admin@yourdomain.com`
2. Wait 2 minutes (automatic fetch interval)
3. Refresh the frontend
4. The email should appear

### Check Logs

Backend logs will show:
- IMAP connection status
- Email fetch operations
- Any errors

## Troubleshooting

### "Cannot connect to IMAP server"

1. Verify IMAP credentials in `.env`
2. Check if IMAP is enabled in your email provider
3. Try disabling TLS temporarily: `IMAP_TLS=false`
4. Check firewall/network restrictions

### "No emails showing"

1. Verify emails are being sent to the correct address
2. Check if prefix exists in admin panel
3. Verify catch-all is configured on your email server
4. Check backend logs for fetch errors

### "Login failed"

1. Verify you're using the correct prefix (lowercase)
2. Check if prefix exists in admin panel
3. Try the default admin credentials
4. Check backend logs

## Docker Setup (Alternative)

If you prefer Docker:

```bash
# From imap-email-service directory
docker-compose up -d
```

This will start both backend and frontend in containers.

## Next Steps

1. **Change admin password**: Go to Admin Panel → Manage Prefixes → Change Password
2. **Create prefixes**: Add prefixes for different departments/purposes
3. **Configure catch-all**: Ensure your email server forwards all emails to the IMAP mailbox
4. **Set up SSL**: In production, use nginx or similar to add HTTPS
5. **Schedule backups**: Backup `backend/data/emails.db` regularly

## Production Deployment

For production deployment, see the main README.md file for:
- PM2 process manager setup
- Nginx reverse proxy configuration
- SSL/HTTPS setup
- Security best practices
