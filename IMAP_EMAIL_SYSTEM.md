# IMAP Email Fetching and Prefix Filtering System

This document describes the implementation of an IMAP email fetching system with prefix-based filtering for the Cloud Mail application.

## Overview

The system allows the application to:
1. Connect to an IMAP server with a catch-all mailbox
2. Fetch emails automatically on a scheduled basis
3. Filter emails based on configurable prefixes
4. Provide secure access to emails using prefix-specific passwords
5. Allow users to access their emails through a web interface

## Architecture

### Backend Components

#### 1. Database Schema

**IMAP Configuration Table (`imap_config`)**
- Stores IMAP server connection details
- Manages active configuration
- Tracks last fetch time

**Prefix Access Table (`prefix_access`)**
- Maps email prefixes to user accounts
- Stores hashed access passwords
- Controls access permissions

#### 2. Services

**IMAP Service (`imap-service.js`)**
- Handles IMAP server connections
- Fetches emails from catch-all mailbox
- Processes and filters emails by prefix
- Manages email parsing and storage

**Prefix Access Service (`prefix-access-service.js`)**
- Manages prefix access records
- Handles password verification
- Provides email filtering by prefix

#### 3. API Endpoints

**IMAP Management (Admin Only)**
- `POST /api/imap/config` - Create IMAP configuration
- `PUT /api/imap/config/:configId` - Update IMAP configuration
- `DELETE /api/imap/config/:configId` - Delete IMAP configuration
- `GET /api/imap/config` - Get current IMAP configuration
- `POST /api/imap/fetch` - Trigger manual email fetch

**Prefix Access Management**
- `POST /api/prefix-access` - Create prefix access record
- `PUT /api/prefix-access/:prefixId` - Update prefix access record
- `DELETE /api/prefix-access/:prefixId` - Delete prefix access record
- `GET /api/prefix-access` - Get user's prefix access records

**Public Prefix Access**
- `POST /api/prefix-access/:prefix/emails` - Access emails by prefix
- `POST /api/prefix-access/:prefix/verify` - Verify prefix access

### Frontend Components

#### Prefix Access Interface (`/prefix/:prefix`)
- Secure login form for prefix and password
- Email list view with filtering options
- Email detail modal
- Responsive design for mobile and desktop

## Setup Instructions

### 1. Database Migration

Add the new tables to your database schema:

```sql
-- IMAP Configuration Table
CREATE TABLE imap_config (
    config_id INTEGER PRIMARY KEY AUTOINCREMENT,
    host TEXT NOT NULL,
    port INTEGER NOT NULL,
    username TEXT NOT NULL,
    password TEXT NOT NULL,
    use_tls INTEGER DEFAULT 1 NOT NULL,
    use_ssl INTEGER DEFAULT 0 NOT NULL,
    mailbox TEXT DEFAULT 'INBOX' NOT NULL,
    is_active INTEGER DEFAULT 1 NOT NULL,
    last_fetch_time TEXT,
    create_time TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
    update_time TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Prefix Access Table
CREATE TABLE prefix_access (
    prefix_id INTEGER PRIMARY KEY AUTOINCREMENT,
    prefix TEXT NOT NULL UNIQUE,
    access_password TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    account_id INTEGER NOT NULL,
    is_active INTEGER DEFAULT 1 NOT NULL,
    create_time TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
    update_time TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
);
```

### 2. Environment Configuration

Add the following environment variables to your Cloudflare Workers configuration:

```toml
# wrangler.toml
[vars]
# ... existing variables ...

# IMAP Configuration (optional - can be set via API)
IMAP_HOST = "imap.example.com"
IMAP_PORT = "993"
IMAP_USERNAME = "catchall@example.com"
IMAP_PASSWORD = "your-imap-password"
IMAP_USE_TLS = "1"
IMAP_USE_SSL = "1"
IMAP_MAILBOX = "INBOX"
```

### 3. Dependencies

The following npm packages are required:

```json
{
  "imap": "^0.8.19",
  "mailparser": "^3.6.5"
}
```

Install them in the worker directory:

```bash
cd mail-worker
npm install imap mailparser
```

### 4. Scheduled Tasks

The system automatically fetches emails every 5 minutes via Cloudflare Workers scheduled events. Ensure your worker has the scheduled trigger enabled:

```toml
# wrangler.toml
[triggers]
crons = ["*/5 * * * *"]
```

## Usage

### 1. Configure IMAP Server (Admin)

As an admin user, configure the IMAP server connection:

```javascript
// POST /api/imap/config
{
  "host": "imap.example.com",
  "port": 993,
  "username": "catchall@example.com",
  "password": "your-password",
  "useTLS": 1,
  "useSSL": 1,
  "mailbox": "INBOX"
}
```

### 2. Create Prefix Access Records

Create prefix access for users:

```javascript
// POST /api/prefix-access
{
  "prefix": "support",
  "accessPassword": "secure-password-123",
  "accountId": 1
}
```

### 3. Access Emails by Prefix

Users can access their emails using the prefix interface:

1. Navigate to `/prefix/support` (replace 'support' with your prefix)
2. Enter the prefix and access password
3. View and manage emails

### 4. API Access

Programmatic access to emails:

```javascript
// POST /api/prefix-access/support/emails
{
  "accessPassword": "secure-password-123",
  "type": "receive",
  "size": 20,
  "emailId": 0,
  "timeSort": 1
}
```

## Email Processing Flow

1. **Scheduled Fetch**: Every 5 minutes, the system connects to the IMAP server
2. **Email Retrieval**: Fetches unread emails since the last fetch time
3. **Prefix Matching**: For each email, checks if the recipient matches any configured prefix
4. **Email Storage**: Stores matching emails in the database with proper user/account association
5. **Access Control**: Users can only access emails for their configured prefixes

## Security Features

- **Password Hashing**: Access passwords are hashed using bcrypt
- **Prefix Isolation**: Users can only access emails for their assigned prefixes
- **Admin Controls**: Only admins can manage IMAP configuration
- **Secure Headers**: Email recipient extraction from multiple header sources

## Error Handling

- IMAP connection failures are logged and retried
- Invalid prefix/password combinations return 401 errors
- Email parsing errors are logged but don't stop processing
- Graceful degradation when IMAP service is unavailable

## Monitoring

- Check Cloudflare Workers logs for IMAP fetch status
- Monitor email processing success/failure rates
- Track prefix access attempts and failures

## Troubleshooting

### Common Issues

1. **IMAP Connection Failed**
   - Verify server credentials and network access
   - Check firewall settings
   - Ensure TLS/SSL configuration is correct

2. **Emails Not Appearing**
   - Verify prefix configuration matches email recipients
   - Check if emails are being marked as read
   - Verify account association

3. **Access Denied**
   - Verify prefix and password combination
   - Check if prefix access record is active
   - Ensure user has proper permissions

### Debug Mode

Enable detailed logging by setting the worker environment variable:
```
DEBUG_IMAP = "true"
```

## Future Enhancements

- Real-time email notifications
- Advanced filtering rules
- Email forwarding by prefix
- Bulk prefix management
- Email statistics and analytics
- Multi-domain support
- Custom email templates

## Support

For issues or questions regarding the IMAP email system, please check the application logs and refer to this documentation. For additional support, contact the system administrator.