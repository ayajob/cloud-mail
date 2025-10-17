#!/usr/bin/env node

/**
 * Setup Script for Prefix-Based Email System
 * 
 * This script helps configure the catch-all email system with prefix filtering.
 * Run this after deploying to set up initial configuration.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

console.log('🚀 Setting up Prefix-Based Email System...\n');

// Configuration prompts
const config = {
  // Domain configuration
  domain: process.env.DOMAIN || 'yourdomain.com',
  
  // Admin email
  adminEmail: process.env.ADMIN_EMAIL || 'admin@yourdomain.com',
  
  // Database configuration
  database: {
    type: 'cloudflare-d1',
    name: process.env.DB_NAME || 'email-db'
  },
  
  // IMAP configuration
  imap: {
    enabled: true,
    catchAll: true,
    prefixFiltering: true
  },
  
  // Initial prefixes to create
  initialPrefixes: [
    {
      prefix: 'admin',
      password: 'admin123',
      description: 'Administrator emails'
    },
    {
      prefix: 'support',
      password: 'support123',
      description: 'Customer support emails'
    },
    {
      prefix: 'info',
      password: 'info123',
      description: 'General information emails'
    }
  ]
};

console.log('📋 Configuration Summary:');
console.log(`   Domain: ${config.domain}`);
console.log(`   Admin Email: ${config.adminEmail}`);
console.log(`   Database: ${config.database.name}`);
console.log(`   IMAP Catch-All: ${config.imap.catchAll ? 'Enabled' : 'Disabled'}`);
console.log(`   Initial Prefixes: ${config.initialPrefixes.length}`);
console.log('');

// Generate wrangler configuration
const wranglerConfig = `
name = "mail-worker"
main = "src/index.js"
compatibility_date = "2024-01-01"

[env.production]
name = "mail-worker-prod"

[[env.production.d1_databases]]
binding = "d1"
database_name = "${config.database.name}"
database_id = "YOUR_DATABASE_ID"

[env.production.vars]
admin = "${config.adminEmail}"
domain = "${config.domain}"

[[env.production.r2_buckets]]
binding = "r2"
bucket_name = "email-attachments"

[[env.production.kv_namespaces]]
binding = "kv"
id = "YOUR_KV_ID"

[triggers]
crons = ["0 2 * * *"]

[[email_handlers]]
type = "catch-all"
destination = "*@${config.domain}"
`;

// Generate environment variables template
const envTemplate = `
# Cloudflare Configuration
CLOUDFLARE_API_TOKEN=your_api_token_here
CLOUDFLARE_ACCOUNT_ID=your_account_id_here

# Database Configuration
DB_NAME=${config.database.name}
DB_ID=your_database_id_here

# Domain Configuration
DOMAIN=${config.domain}
ADMIN_EMAIL=${config.adminEmail}

# R2 Storage Configuration
R2_BUCKET_NAME=email-attachments
R2_DOMAIN=https://your-r2-domain.com

# KV Storage Configuration
KV_NAMESPACE_ID=your_kv_namespace_id_here

# Email Configuration
RESEND_API_KEY=your_resend_api_key_here

# Optional: Telegram Notifications
TG_BOT_TOKEN=your_telegram_bot_token
TG_CHAT_ID=your_telegram_chat_id
`;

// Generate deployment instructions
const deploymentInstructions = `
# Prefix-Based Email System Deployment Guide

## Prerequisites

1. Cloudflare account with Workers and D1 enabled
2. Domain configured with Cloudflare
3. Resend account for sending emails (optional)

## Setup Steps

### 1. Database Setup

\`\`\`bash
# Create D1 database
wrangler d1 create ${config.database.name}

# Run migrations
wrangler d1 execute ${config.database.name} --file=./mail-worker/migrations/001_add_prefix_support.sql
\`\`\`

### 2. KV Storage Setup

\`\`\`bash
# Create KV namespace
wrangler kv:namespace create "kv"
\`\`\`

### 3. R2 Storage Setup (Optional)

\`\`\`bash
# Create R2 bucket for attachments
wrangler r2 bucket create email-attachments
\`\`\`

### 4. Email Routing Setup

1. Go to Cloudflare Dashboard > Email Routing
2. Enable Email Routing for your domain
3. Add a catch-all rule:
   - Match: *@${config.domain}
   - Action: Send to Worker
   - Worker: mail-worker

### 5. Deploy Worker

\`\`\`bash
# Deploy backend
cd mail-worker
wrangler deploy

# Deploy frontend
cd ../mail-vue
npm run build
wrangler pages deploy dist
\`\`\`

### 6. Initial Configuration

1. Access the admin panel at: https://your-domain.com/prefix-admin
2. Login with your admin credentials
3. Create initial prefixes:

${config.initialPrefixes.map(p => `   - ${p.prefix}: ${p.description}`).join('\n')}

## Usage

### For End Users

1. Go to: https://your-domain.com/prefix-login
2. Enter prefix and password
3. View emails sent to prefix@${config.domain}

### For Administrators

1. Go to: https://your-domain.com/login
2. Login with admin credentials
3. Manage prefixes at: /prefix-admin

## Email Flow

1. Email sent to any-prefix@${config.domain}
2. Cloudflare Email Routing catches email
3. Worker processes and stores email
4. Users access via prefix authentication
5. Emails filtered by prefix automatically

## Security Notes

- Change default passwords immediately
- Use strong passwords for prefixes
- Enable rate limiting in production
- Monitor access logs regularly
- Consider enabling 2FA for admin access

## Troubleshooting

### Common Issues

1. **Emails not received**: Check Email Routing configuration
2. **Authentication fails**: Verify prefix passwords
3. **Attachments not working**: Check R2 configuration
4. **Database errors**: Verify D1 setup and migrations

### Logs

\`\`\`bash
# View worker logs
wrangler tail

# View D1 data
wrangler d1 execute ${config.database.name} --command="SELECT * FROM prefix LIMIT 10"
\`\`\`

## Support

For issues and questions:
1. Check the logs first
2. Verify configuration
3. Test with simple email
4. Check Cloudflare dashboard for errors
`;

// Write configuration files
try {
  writeFileSync('wrangler.toml', wranglerConfig.trim());
  writeFileSync('.env.example', envTemplate.trim());
  writeFileSync('DEPLOYMENT.md', deploymentInstructions.trim());
  
  console.log('✅ Configuration files generated:');
  console.log('   - wrangler.toml (Cloudflare Worker configuration)');
  console.log('   - .env.example (Environment variables template)');
  console.log('   - DEPLOYMENT.md (Deployment instructions)');
  console.log('');
  
  console.log('🎯 Next Steps:');
  console.log('1. Copy .env.example to .env and fill in your values');
  console.log('2. Follow DEPLOYMENT.md for complete setup');
  console.log('3. Run database migrations');
  console.log('4. Deploy to Cloudflare');
  console.log('5. Configure Email Routing');
  console.log('');
  
  console.log('🔐 Default Prefix Credentials:');
  config.initialPrefixes.forEach(p => {
    console.log(`   ${p.prefix}@${config.domain} - Password: ${p.password}`);
  });
  console.log('');
  
  console.log('⚠️  Remember to change default passwords after setup!');
  console.log('');
  console.log('🚀 Setup complete! Ready for deployment.');
  
} catch (error) {
  console.error('❌ Error generating configuration files:', error);
  process.exit(1);
}