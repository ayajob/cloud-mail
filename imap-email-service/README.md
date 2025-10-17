# IMAP Email Service with Prefix-Based Filtering

A modern email management system that fetches emails from an IMAP server and provides prefix-based filtering with authentication.

## Features

- 📧 **IMAP Integration**: Automatically fetches emails from a catch-all mailbox
- 🔐 **Prefix-Based Authentication**: Each prefix has its own password for secure access
- 📱 **Modern UI**: Clean, responsive interface built with React
- 🔄 **Auto-Refresh**: Emails are fetched automatically every 2 minutes
- 👨‍💼 **Admin Panel**: Manage prefixes and view statistics
- 📎 **Attachment Support**: View email attachments metadata
- 🎨 **HTML Email Support**: View both HTML and plain text versions of emails

## How It Works

The system works with email prefixes. For example, if your domain is `example.com`:

- Emails sent to `sales@example.com` or `sales+anything@example.com` will be accessible with the `sales` prefix
- Emails sent to `support@example.com` or `support+anything@example.com` will be accessible with the `support` prefix
- Each prefix has its own password for secure access

## Prerequisites

- Node.js 18+ installed
- An IMAP-enabled email account with catch-all configured
- Your email domain configured to forward all emails to the catch-all mailbox

## Installation

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd imap-email-service/backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file (copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```

4. Configure your `.env` file:
   ```env
   PORT=3001
   JWT_SECRET=your-random-secret-key-here
   
   # Your IMAP server details
   IMAP_HOST=imap.gmail.com
   IMAP_PORT=993
   IMAP_USER=catchall@yourdomain.com
   IMAP_PASSWORD=your-imap-password
   IMAP_TLS=true
   
   EMAIL_DOMAIN=yourdomain.com
   DEFAULT_ADMIN_PASSWORD=admin123
   ```

5. Create the data directory:
   ```bash
   mkdir -p data
   ```

6. Start the backend:
   ```bash
   npm start
   ```

   For development with auto-reload:
   ```bash
   npm run dev
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd imap-email-service/frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser to `http://localhost:3000`

## Usage

### First Login

1. Open the application at `http://localhost:3000`
2. Use the default admin credentials:
   - **Prefix**: `admin`
   - **Password**: `admin123` (or whatever you set in `DEFAULT_ADMIN_PASSWORD`)

### Managing Prefixes (Admin Only)

1. Log in with the admin prefix
2. Click "Admin Panel" in the header
3. Click "Add New Prefix" to create a new prefix
4. Enter a prefix name (e.g., `sales`, `support`) and password
5. The new prefix is now active and can receive emails

### Accessing Emails

1. Log in with your prefix and password
2. View all emails sent to `{prefix}@yourdomain.com` or `{prefix}+anything@yourdomain.com`
3. Click on an email to view its full content
4. Use the refresh button to manually check for new emails (auto-refreshes every 30 seconds)

### Email Formats Supported

- `prefix@yourdomain.com` → accessible by `prefix`
- `prefix+tag@yourdomain.com` → accessible by `prefix`
- `prefix+customer123@yourdomain.com` → accessible by `prefix`

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with prefix and password
- `GET /api/auth/verify` - Verify JWT token

### Emails
- `GET /api/emails` - Get emails for authenticated prefix
- `GET /api/emails/:id` - Get single email details
- `PATCH /api/emails/:id/read` - Mark email as read/unread
- `DELETE /api/emails/:id` - Delete an email

### Admin (Admin prefix only)
- `GET /api/admin/prefixes` - List all prefixes
- `POST /api/admin/prefixes` - Create new prefix
- `PUT /api/admin/prefixes/:id` - Update prefix password
- `DELETE /api/admin/prefixes/:id` - Delete prefix
- `GET /api/admin/stats` - Get system statistics

## Configuration

### IMAP Settings

The system supports various IMAP providers:

**Gmail:**
```env
IMAP_HOST=imap.gmail.com
IMAP_PORT=993
IMAP_TLS=true
```

**Outlook/Office 365:**
```env
IMAP_HOST=outlook.office365.com
IMAP_PORT=993
IMAP_TLS=true
```

**Custom Server:**
```env
IMAP_HOST=mail.yourdomain.com
IMAP_PORT=993
IMAP_TLS=true
```

### Email Fetch Frequency

By default, emails are fetched every 2 minutes. To change this, edit `backend/src/server.js`:

```javascript
// Change '*/2 * * * *' to your desired cron schedule
cron.schedule('*/5 * * * *', async () => { // Every 5 minutes
  // ...
});
```

## Production Deployment

### Backend

1. Build and run with PM2 or similar process manager:
   ```bash
   npm install -g pm2
   pm2 start src/server.js --name imap-email-backend
   ```

2. Set up a reverse proxy (nginx) to handle SSL:
   ```nginx
   server {
       listen 443 ssl;
       server_name api.yourdomain.com;
       
       location /api/ {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

### Frontend

1. Build the frontend:
   ```bash
   npm run build
   ```

2. Serve the `dist` folder with nginx or any static file server:
   ```nginx
   server {
       listen 443 ssl;
       server_name mail.yourdomain.com;
       root /path/to/frontend/dist;
       
       location / {
           try_files $uri $uri/ /index.html;
       }
       
       location /api/ {
           proxy_pass http://localhost:3001;
       }
   }
   ```

## Security Considerations

1. **Change the default admin password** immediately after first login
2. **Use strong JWT secret** - Generate a random string for `JWT_SECRET`
3. **Enable HTTPS** in production
4. **Secure your IMAP credentials** - Use app-specific passwords when possible
5. **Regular backups** of the SQLite database in `backend/data/emails.db`
6. **Firewall rules** - Restrict access to backend port (3001) if needed

## Troubleshooting

### IMAP Connection Issues

1. Check your IMAP credentials
2. Ensure IMAP is enabled in your email provider
3. For Gmail: Enable "Less secure app access" or use App Passwords
4. Check firewall rules allow outbound connection to IMAP port

### No Emails Showing Up

1. Verify the prefix exists in the admin panel
2. Check that emails are actually being sent to `prefix@yourdomain.com`
3. Review backend logs for IMAP fetch errors
4. Ensure catch-all is properly configured on your email server

### Database Issues

The SQLite database is stored at `backend/data/emails.db`. If you need to reset:

```bash
rm backend/data/emails.db
# Restart the backend to recreate the database
```

## Technology Stack

### Backend
- Node.js + Express
- SQLite (better-sqlite3)
- IMAP (email fetching)
- mailparser (email parsing)
- JWT authentication
- bcrypt (password hashing)

### Frontend
- React 18
- React Router
- Axios
- Vite (build tool)

## License

MIT License - Feel free to use this for personal or commercial projects.

## Support

For issues, questions, or contributions, please open an issue on the GitHub repository.
