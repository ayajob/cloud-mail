# Email Manager System

A comprehensive email management system that provides prefix-based email filtering with secure access control. The system connects to a catch-all mailbox via IMAP and allows users to access emails sent to specific prefixes with password protection.

## Features

- **Prefix-based Email Filtering**: Access emails sent to specific prefixes (e.g., support@, info@, contact@)
- **Secure Access Control**: Each prefix is protected with its own access password
- **IMAP Integration**: Connects to any IMAP-compatible email server
- **Admin Dashboard**: Manage prefixes, passwords, and view all emails
- **Modern UI**: React-based frontend with Tailwind CSS
- **RESTful API**: FastAPI backend with JWT authentication
- **Email Caching**: Redis-based caching for improved performance
- **Docker Support**: Easy deployment with Docker Compose

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Frontend  │────▶│   Backend    │────▶│ IMAP Server │
│   (React)   │     │  (FastAPI)   │     │  (Catch-all)│
└─────────────┘     └──────────────┘     └─────────────┘
                            │
                    ┌───────┴────────┐
                    │                 │
                ┌───▼───┐      ┌─────▼────┐
                │ Redis │      │PostgreSQL│
                └───────┘      └──────────┘
```

## Prerequisites

- Docker and Docker Compose (for containerized deployment)
- OR Python 3.11+ and Node.js 18+ (for local development)
- An IMAP email account configured as a catch-all mailbox

## Quick Start with Docker

1. **Clone the repository**
   ```bash
   cd email-manager
   ```

2. **Configure environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   # IMAP Configuration
   IMAP_HOST=imap.gmail.com
   IMAP_PORT=993
   IMAP_USERNAME=catchall@yourdomain.com
   IMAP_PASSWORD=your-app-specific-password
   IMAP_USE_SSL=true
   
   # Admin Account
   ADMIN_EMAIL=admin@yourdomain.com
   ADMIN_PASSWORD=secure-admin-password
   
   # Security
   SECRET_KEY=your-secret-key-here-generate-with-openssl-rand-hex-32
   ```

3. **Start the services**
   ```bash
   docker-compose up -d
   ```

4. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

## Manual Setup

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up PostgreSQL database**
   ```bash
   # Create database and user
   createdb emailmanager
   createuser emailuser
   ```

5. **Configure environment**
   
   Copy `.env.example` to `.env` and update with your settings:
   ```bash
   cp .env.example .env
   ```

6. **Run database migrations**
   ```bash
   alembic upgrade head
   ```

7. **Start the backend server**
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure API endpoint**
   
   Create `.env.local`:
   ```env
   VITE_API_URL=http://localhost:8000
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

## Configuration

### IMAP Settings

The system requires access to an IMAP server with a catch-all mailbox. Common configurations:

**Gmail/Google Workspace:**
- Host: `imap.gmail.com`
- Port: `993`
- SSL: `true`
- Username: Your full email address
- Password: App-specific password (2FA required)

**Office 365:**
- Host: `outlook.office365.com`
- Port: `993`
- SSL: `true`
- Username: Your full email address
- Password: Your password or app password

**Custom Mail Server:**
- Host: Your IMAP server hostname
- Port: Usually `993` (SSL) or `143` (non-SSL)
- SSL: Based on your server configuration
- Username: Usually full email address
- Password: Your password

### Creating App-Specific Passwords

**For Gmail:**
1. Enable 2-factor authentication
2. Go to https://myaccount.google.com/apppasswords
3. Generate an app password for "Mail"
4. Use this password in the IMAP_PASSWORD setting

## Usage

### Admin Functions

1. **Login as Admin**
   - Use the admin credentials configured in environment variables
   - Admin users have access to additional features

2. **Manage Prefixes**
   - Navigate to "Prefixes" in the admin menu
   - Create new prefixes (e.g., "support", "info", "sales")
   - Set access passwords for each prefix
   - Enable/disable prefixes as needed

3. **View All Emails**
   - Access the "All Emails" section to see all emails in the catch-all mailbox
   - Useful for monitoring and debugging

### User Functions

1. **Access Emails**
   - Navigate to the "Emails" section
   - Enter the prefix (e.g., "support" for support@domain.com)
   - Enter the access password for that prefix
   - View all emails sent to that specific address

2. **Email Features**
   - View email content (text and HTML)
   - See attachment information
   - Refresh to fetch new emails
   - Search and filter capabilities

## API Documentation

The backend provides a comprehensive REST API. Access the interactive documentation at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Key Endpoints

- `POST /api/auth/login` - User authentication
- `POST /api/auth/register` - User registration
- `GET /api/prefixes/` - List all prefixes (admin)
- `POST /api/prefixes/` - Create new prefix (admin)
- `POST /api/prefixes/verify` - Verify prefix access
- `POST /api/emails/fetch` - Fetch emails for a prefix
- `GET /api/emails/admin/all` - Get all emails (admin)

## Security Considerations

1. **Password Security**
   - All passwords are hashed using bcrypt
   - JWT tokens for session management
   - Tokens expire after 30 minutes by default

2. **Access Control**
   - Each prefix has its own access password
   - Admin functions require admin privileges
   - API endpoints are protected with authentication

3. **IMAP Security**
   - Always use SSL/TLS for IMAP connections
   - Store IMAP credentials securely
   - Use app-specific passwords when available

4. **Production Deployment**
   - Generate a strong SECRET_KEY
   - Use HTTPS in production
   - Configure proper CORS settings
   - Use environment variables for sensitive data
   - Regular security updates

## Troubleshooting

### Common Issues

1. **IMAP Connection Failed**
   - Verify IMAP settings (host, port, SSL)
   - Check username and password
   - Ensure less secure app access or app passwords are configured
   - Check firewall settings

2. **Database Connection Error**
   - Ensure PostgreSQL is running
   - Verify database credentials
   - Check if database exists

3. **Emails Not Showing**
   - Verify the catch-all configuration on your mail server
   - Check if emails are actually being delivered to the catch-all
   - Try refreshing the email list
   - Check prefix spelling (case-insensitive)

4. **Frontend Can't Connect to Backend**
   - Verify VITE_API_URL is correct
   - Check if backend is running
   - Verify CORS settings

## Development

### Project Structure

```
email-manager/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI application
│   │   ├── models.py         # Database models
│   │   ├── schemas.py        # Pydantic schemas
│   │   ├── auth.py           # Authentication logic
│   │   ├── imap_service.py   # IMAP email fetching
│   │   └── routers/          # API endpoints
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/             # API client
│   │   ├── components/      # React components
│   │   ├── contexts/        # React contexts
│   │   ├── pages/           # Page components
│   │   └── App.jsx          # Main application
│   └── package.json
└── docker-compose.yml
```

### Running Tests

```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - See LICENSE file for details

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review existing issues on GitHub
3. Create a new issue with detailed information

## Roadmap

- [ ] Email search functionality
- [ ] Bulk operations support
- [ ] Email forwarding capabilities
- [ ] Webhook integrations
- [ ] Multi-language support
- [ ] Advanced filtering rules
- [ ] Email templates
- [ ] Audit logging