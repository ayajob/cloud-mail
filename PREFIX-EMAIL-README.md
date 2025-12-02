# Prefix-Based Email System

A modern, serverless email system that receives emails for an entire domain via catch-all IMAP and provides access through prefix-based filtering with password authentication.

## 🌟 Features

- **🎯 Prefix-Based Access**: Users access emails by prefix (e.g., `support@domain.com`, `info@domain.com`)
- **🔐 Secure Authentication**: Each prefix has its own access password
- **📧 Catch-All IMAP**: Receives all emails for the domain automatically
- **⚡ Serverless Architecture**: Built on Cloudflare Workers for scalability
- **💾 Persistent Storage**: Uses Cloudflare D1 database and R2 object storage
- **📱 Responsive UI**: Modern Vue.js frontend with Element Plus
- **🔧 Admin Management**: Full admin interface for prefix management
- **📊 Statistics**: Email statistics and access tracking
- **📎 Attachments**: Full support for email attachments

## 🏗️ Architecture

```
Internet → Cloudflare Email Routing → Worker → D1 Database
                                    ↓
Frontend ← API ← Prefix Authentication ← Email Processing
```

### Components

1. **Backend (Cloudflare Worker)**
   - Email processing and storage
   - Prefix-based API endpoints
   - Authentication and authorization
   - Admin management interface

2. **Frontend (Vue.js SPA)**
   - Prefix login interface
   - Email viewing and management
   - Admin panel for prefix management
   - Responsive design

3. **Storage**
   - **D1 Database**: Email metadata and prefix configuration
   - **R2 Object Storage**: Email attachments
   - **KV Storage**: Caching and session data

## 🚀 Quick Start

### Prerequisites

- Cloudflare account with Workers, D1, and R2 enabled
- Domain configured with Cloudflare
- Node.js 18+ and npm

### 1. Setup Configuration

```bash
# Run the setup script
node setup-prefix-email.js

# Copy and configure environment variables
cp .env.example .env
# Edit .env with your values
```

### 2. Database Setup

```bash
# Create D1 database
wrangler d1 create email-db

# Run migrations
wrangler d1 execute email-db --file=./mail-worker/migrations/001_add_prefix_support.sql
```

### 3. Deploy Backend

```bash
cd mail-worker
wrangler deploy
```

### 4. Deploy Frontend

```bash
cd mail-vue
npm install
npm run build
wrangler pages deploy dist
```

### 5. Configure Email Routing

1. Go to Cloudflare Dashboard → Email Routing
2. Enable Email Routing for your domain
3. Add catch-all rule: `*@yourdomain.com` → Send to Worker → `mail-worker`

## 📖 Usage

### For End Users

1. **Access Emails**:
   - Go to `https://yourdomain.com/prefix-login`
   - Enter your prefix (e.g., `support`)
   - Enter your access password
   - View emails sent to `support@yourdomain.com`

2. **Email Management**:
   - Browse emails with pagination
   - Search emails by subject, sender, or content
   - View email details with attachments
   - Mark emails as read

### For Administrators

1. **Admin Access**:
   - Go to `https://yourdomain.com/login`
   - Login with admin credentials
   - Access prefix management at `/prefix-admin`

2. **Prefix Management**:
   - Create new prefixes with passwords
   - Edit existing prefix descriptions and passwords
   - Enable/disable prefixes
   - Delete unused prefixes
   - View access statistics

## 🔧 Configuration

### Environment Variables

```env
# Cloudflare Configuration
CLOUDFLARE_API_TOKEN=your_api_token
CLOUDFLARE_ACCOUNT_ID=your_account_id

# Domain Configuration
DOMAIN=yourdomain.com
ADMIN_EMAIL=admin@yourdomain.com

# Database Configuration
DB_NAME=email-db
DB_ID=your_database_id

# Storage Configuration
R2_BUCKET_NAME=email-attachments
R2_DOMAIN=https://your-r2-domain.com
KV_NAMESPACE_ID=your_kv_id

# Email Configuration (optional)
RESEND_API_KEY=your_resend_key
```

### Wrangler Configuration

The system generates a `wrangler.toml` file with proper bindings:

```toml
name = "mail-worker"
main = "src/index.js"

[[d1_databases]]
binding = "d1"
database_name = "email-db"

[[r2_buckets]]
binding = "r2"
bucket_name = "email-attachments"

[[kv_namespaces]]
binding = "kv"

[[email_handlers]]
type = "catch-all"
destination = "*@yourdomain.com"
```

## 🔐 Security Features

### Authentication
- **Prefix-based access**: Each prefix requires a password
- **Admin authentication**: Separate admin login system
- **Session management**: Secure session handling

### Authorization
- **Prefix isolation**: Users can only access their prefix emails
- **Admin privileges**: Full system access for administrators
- **Rate limiting**: Protection against brute force attacks

### Data Protection
- **Encrypted storage**: All data encrypted at rest
- **Secure transmission**: HTTPS/TLS for all communications
- **Access logging**: Track access attempts and usage

## 📊 API Reference

### Prefix Authentication Endpoints

```javascript
// Get emails for prefix
POST /prefix/emails
{
  "prefix": "support",
  "password": "password123",
  "page": 1,
  "size": 20
}

// Get email detail
POST /prefix/email/detail
{
  "prefix": "support",
  "password": "password123",
  "emailId": 123
}

// Get prefix statistics
POST /prefix/stats
{
  "prefix": "support",
  "password": "password123"
}
```

### Admin Management Endpoints

```javascript
// Create prefix
POST /prefix/manage
{
  "action": "create",
  "prefix": "newprefix",
  "password": "newpassword",
  "description": "Description"
}

// List all prefixes
GET /prefix/list?page=1&size=20

// Delete prefix
DELETE /prefix/delete?prefix=oldprefix
```

## 🛠️ Development

### Local Development

```bash
# Backend development
cd mail-worker
wrangler dev

# Frontend development
cd mail-vue
npm run dev
```

### Testing

```bash
# Run backend tests
cd mail-worker
npm test

# Run frontend tests
cd mail-vue
npm run test
```

### Database Migrations

```bash
# Create new migration
wrangler d1 execute email-db --file=./migrations/new_migration.sql

# View database schema
wrangler d1 execute email-db --command="SELECT sql FROM sqlite_master WHERE type='table'"
```

## 📈 Monitoring

### Logs and Analytics

```bash
# View worker logs
wrangler tail

# View email processing logs
wrangler tail --format=pretty

# Database queries
wrangler d1 execute email-db --command="SELECT COUNT(*) FROM email"
```

### Performance Metrics

- **Email Processing**: Average processing time per email
- **API Response**: Response times for prefix endpoints
- **Storage Usage**: Database and R2 storage consumption
- **Access Patterns**: Prefix usage and access frequency

## 🔧 Troubleshooting

### Common Issues

1. **Emails Not Received**
   - Check Email Routing configuration
   - Verify catch-all rule is active
   - Check worker deployment status

2. **Authentication Failures**
   - Verify prefix exists and is active
   - Check password correctness
   - Review access logs

3. **Database Errors**
   - Verify D1 database connection
   - Check migration status
   - Review database logs

4. **Attachment Issues**
   - Verify R2 bucket configuration
   - Check R2 domain settings
   - Review storage permissions

### Debug Commands

```bash
# Check worker status
wrangler status

# Test database connection
wrangler d1 execute email-db --command="SELECT 1"

# View recent emails
wrangler d1 execute email-db --command="SELECT * FROM email ORDER BY create_time DESC LIMIT 5"

# Check prefix configuration
wrangler d1 execute email-db --command="SELECT * FROM prefix"
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built on the excellent [Cloud Mail](https://github.com/Dogtiti/cloudflare-mail) foundation
- Uses [Cloudflare Workers](https://workers.cloudflare.com/) for serverless execution
- Frontend powered by [Vue.js](https://vuejs.org/) and [Element Plus](https://element-plus.org/)
- Email parsing with [postal-mime](https://github.com/postalsys/postal-mime)

## 📞 Support

- 📧 Email: admin@yourdomain.com
- 💬 Issues: [GitHub Issues](https://github.com/yourusername/prefix-email/issues)
- 📖 Documentation: [Wiki](https://github.com/yourusername/prefix-email/wiki)

---

**Made with ❤️ for modern email management**