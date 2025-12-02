/**
 * IMAP Configuration for Catch-All Email System
 * 
 * This configuration defines how the system handles incoming emails
 * from the IMAP catch-all server.
 */

const imapConfig = {
  // Email processing settings
  processing: {
    // Whether to enable catch-all processing
    enabled: true,
    
    // Whether to store all emails regardless of prefix existence
    storeAll: true,
    
    // Whether to extract prefix from email addresses
    extractPrefix: true,
    
    // Default prefix for emails without clear prefix
    defaultPrefix: 'general',
    
    // Whether to normalize prefixes (lowercase, trim)
    normalizePrefix: true
  },

  // Prefix extraction settings
  prefixExtraction: {
    // How to handle plus addressing (e.g., user+tag@domain.com)
    // 'ignore' - treat as part of prefix
    // 'strip' - remove plus part and everything after
    plusAddressing: 'strip',
    
    // Characters to strip from prefix
    stripCharacters: ['.', '_', '-'],
    
    // Maximum prefix length
    maxLength: 50,
    
    // Minimum prefix length
    minLength: 1
  },

  // Security settings
  security: {
    // Whether to require prefix authentication for access
    requireAuth: true,
    
    // Whether to log access attempts
    logAccess: true,
    
    // Rate limiting (requests per minute per IP)
    rateLimit: 60
  },

  // Storage settings
  storage: {
    // Whether to store email content
    storeContent: true,
    
    // Whether to store attachments
    storeAttachments: true,
    
    // Maximum email size (in bytes)
    maxEmailSize: 25 * 1024 * 1024, // 25MB
    
    // Maximum attachment size (in bytes)
    maxAttachmentSize: 10 * 1024 * 1024 // 10MB
  },

  // Notification settings
  notifications: {
    // Whether to send notifications for new emails
    enabled: false,
    
    // Webhook URL for notifications
    webhookUrl: null,
    
    // Email subjects to ignore for notifications
    ignoreSubjects: ['SPAM', 'JUNK', 'BOUNCE']
  }
};

export default imapConfig;