/**
 * Setup script for IMAP Email Fetching and Prefix Filtering System
 * 
 * This script helps set up the initial configuration for the IMAP system
 */

// Configuration template
const setupConfig = {
  // IMAP Server Configuration
  imap: {
    host: "imap.gmail.com", // Change to your IMAP server
    port: 993,
    username: "your-catchall@example.com", // Your catch-all email
    password: "your-app-password", // App-specific password
    useTLS: true,
    useSSL: true,
    mailbox: "INBOX"
  },
  
  // Example prefix configurations
  prefixes: [
    {
      prefix: "support",
      accessPassword: "support-password-123",
      userId: 1, // Replace with actual user ID
      accountId: 1 // Replace with actual account ID
    },
    {
      prefix: "sales",
      accessPassword: "sales-password-456",
      userId: 2, // Replace with actual user ID
      accountId: 2 // Replace with actual account ID
    },
    {
      prefix: "info",
      accessPassword: "info-password-789",
      userId: 3, // Replace with actual user ID
      accountId: 3 // Replace with actual account ID
    }
  ]
};

// Setup functions
const setupFunctions = {
  // Generate SQL for database setup
  generateDatabaseSQL() {
    console.log("-- Database Setup SQL for IMAP Email System\n");
    
    const sql = `
-- IMAP Configuration Table
CREATE TABLE IF NOT EXISTS imap_config (
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
CREATE TABLE IF NOT EXISTS prefix_access (
    prefix_id INTEGER PRIMARY KEY AUTOINCREMENT,
    prefix TEXT NOT NULL UNIQUE,
    access_password TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    account_id INTEGER NOT NULL,
    is_active INTEGER DEFAULT 1 NOT NULL,
    create_time TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
    update_time TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Insert default IMAP configuration
INSERT INTO imap_config (host, port, username, password, use_tls, use_ssl, mailbox, is_active)
VALUES ('${setupConfig.imap.host}', ${setupConfig.imap.port}, '${setupConfig.imap.username}', '${setupConfig.imap.password}', ${setupConfig.imap.useTLS ? 1 : 0}, ${setupConfig.imap.useSSL ? 1 : 0}, '${setupConfig.imap.mailbox}', 1);

-- Insert example prefix configurations
${setupConfig.prefixes.map(prefix => 
  `INSERT INTO prefix_access (prefix, access_password, user_id, account_id, is_active)
VALUES ('${prefix.prefix}', '${prefix.accessPassword}', ${prefix.userId}, ${prefix.accountId}, 1);`
).join('\n')}
`;

    console.log(sql);
    return sql;
  },

  // Generate environment configuration
  generateEnvironmentConfig() {
    console.log("-- Environment Configuration for Cloudflare Workers\n");
    
    const envConfig = `
# Add to your wrangler.toml or environment variables

[vars]
# IMAP Configuration (optional - can be set via API)
IMAP_HOST = "${setupConfig.imap.host}"
IMAP_PORT = "${setupConfig.imap.port}"
IMAP_USERNAME = "${setupConfig.imap.username}"
IMAP_PASSWORD = "${setupConfig.imap.password}"
IMAP_USE_TLS = "${setupConfig.imap.useTLS ? 1 : 0}"
IMAP_USE_SSL = "${setupConfig.imap.useSSL ? 1 : 0}"
IMAP_MAILBOX = "${setupConfig.imap.mailbox}"

# Enable scheduled tasks
[triggers]
crons = ["*/5 * * * *"]
`;

    console.log(envConfig);
    return envConfig;
  },

  // Generate API test examples
  generateAPITests() {
    console.log("-- API Test Examples\n");
    
    const apiTests = `
// 1. Create IMAP Configuration (Admin only)
fetch('/api/imap/config', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_ADMIN_TOKEN'
  },
  body: JSON.stringify(${JSON.stringify(setupConfig.imap, null, 2)})
});

// 2. Create Prefix Access
${setupConfig.prefixes.map(prefix => `
fetch('/api/prefix-access', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_USER_TOKEN'
  },
  body: JSON.stringify(${JSON.stringify(prefix, null, 2)})
});`).join('')}

// 3. Access Emails by Prefix
fetch('/api/prefix-access/support/emails', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    accessPassword: 'support-password-123',
    type: 'receive',
    size: 20,
    emailId: 0,
    timeSort: 1
  })
});

// 4. Verify Prefix Access
fetch('/api/prefix-access/support/verify', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    accessPassword: 'support-password-123'
  })
});
`;

    console.log(apiTests);
    return apiTests;
  },

  // Generate frontend usage examples
  generateFrontendExamples() {
    console.log("-- Frontend Usage Examples\n");
    
    const frontendExamples = `
<!-- 1. Direct link to prefix access -->
<a href="/prefix/support">Access Support Emails</a>
<a href="/prefix/sales">Access Sales Emails</a>
<a href="/prefix/info">Access Info Emails</a>

<!-- 2. Embed prefix access in existing pages -->
<iframe src="/prefix/support" width="100%" height="600px"></iframe>

<!-- 3. JavaScript integration -->
<script>
// Check if user has access to a prefix
async function checkPrefixAccess(prefix, password) {
  const response = await fetch(\`/api/prefix-access/\${prefix}/verify\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessPassword: password })
  });
  return response.ok;
}

// Get emails for a prefix
async function getPrefixEmails(prefix, password) {
  const response = await fetch(\`/api/prefix-access/\${prefix}/emails\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      accessPassword: password,
      type: 'receive',
      size: 20
    })
  });
  return response.json();
}
</script>
`;

    console.log(frontendExamples);
    return frontendExamples;
  },

  // Run complete setup
  runSetup() {
    console.log("🚀 IMAP Email System Setup Guide\n");
    console.log("=" .repeat(50));
    
    console.log("\n1. Database Setup:");
    this.generateDatabaseSQL();
    
    console.log("\n2. Environment Configuration:");
    this.generateEnvironmentConfig();
    
    console.log("\n3. API Test Examples:");
    this.generateAPITests();
    
    console.log("\n4. Frontend Usage Examples:");
    this.generateFrontendExamples();
    
    console.log("\n" + "=" .repeat(50));
    console.log("✅ Setup guide generated successfully!");
    console.log("\nNext steps:");
    console.log("1. Update the configuration values above");
    console.log("2. Run the database SQL in your database");
    console.log("3. Update your wrangler.toml with environment variables");
    console.log("4. Deploy your Cloudflare Worker");
    console.log("5. Test the system using the API examples");
  }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = setupFunctions;
}

// Run setup if this file is executed directly
if (typeof window === 'undefined' && require.main === module) {
  setupFunctions.runSetup();
}

// Browser usage
if (typeof window !== 'undefined') {
  window.setupImapSystem = setupFunctions;
}