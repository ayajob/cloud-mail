/**
 * Test script for IMAP Email Fetching and Prefix Filtering System
 * 
 * This script demonstrates how to test the various components of the system
 */

// Test data for IMAP configuration
const testImapConfig = {
  host: "imap.gmail.com",
  port: 993,
  username: "your-catchall@gmail.com",
  password: "your-app-password",
  useTLS: 1,
  useSSL: 1,
  mailbox: "INBOX"
};

// Test data for prefix access
const testPrefixAccess = {
  prefix: "support",
  accessPassword: "test-password-123",
  userId: 1,
  accountId: 1
};

// Test functions
const testFunctions = {
  // Test IMAP configuration creation
  async testImapConfigCreation() {
    console.log("Testing IMAP configuration creation...");
    
    try {
      const response = await fetch('/api/imap/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer YOUR_ADMIN_TOKEN'
        },
        body: JSON.stringify(testImapConfig)
      });
      
      if (response.ok) {
        console.log("✅ IMAP configuration created successfully");
        return await response.json();
      } else {
        console.log("❌ Failed to create IMAP configuration:", await response.text());
      }
    } catch (error) {
      console.log("❌ Error creating IMAP configuration:", error);
    }
  },

  // Test prefix access creation
  async testPrefixAccessCreation() {
    console.log("Testing prefix access creation...");
    
    try {
      const response = await fetch('/api/prefix-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer YOUR_USER_TOKEN'
        },
        body: JSON.stringify(testPrefixAccess)
      });
      
      if (response.ok) {
        console.log("✅ Prefix access created successfully");
        return await response.json();
      } else {
        console.log("❌ Failed to create prefix access:", await response.text());
      }
    } catch (error) {
      console.log("❌ Error creating prefix access:", error);
    }
  },

  // Test prefix verification
  async testPrefixVerification() {
    console.log("Testing prefix verification...");
    
    try {
      const response = await fetch(`/api/prefix-access/${testPrefixAccess.prefix}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          accessPassword: testPrefixAccess.accessPassword
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log("✅ Prefix verification result:", result.data.valid);
        return result.data.valid;
      } else {
        console.log("❌ Failed to verify prefix:", await response.text());
      }
    } catch (error) {
      console.log("❌ Error verifying prefix:", error);
    }
  },

  // Test email access by prefix
  async testEmailAccess() {
    console.log("Testing email access by prefix...");
    
    try {
      const response = await fetch(`/api/prefix-access/${testPrefixAccess.prefix}/emails`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          accessPassword: testPrefixAccess.accessPassword,
          type: "receive",
          size: 10,
          emailId: 0,
          timeSort: 1
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log("✅ Email access successful, found", result.data.list?.length || 0, "emails");
        return result.data;
      } else {
        console.log("❌ Failed to access emails:", await response.text());
      }
    } catch (error) {
      console.log("❌ Error accessing emails:", error);
    }
  },

  // Test manual email fetch
  async testManualEmailFetch() {
    console.log("Testing manual email fetch...");
    
    try {
      const response = await fetch('/api/imap/fetch', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer YOUR_ADMIN_TOKEN'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log("✅ Manual email fetch successful");
        return result.data;
      } else {
        console.log("❌ Failed to fetch emails:", await response.text());
      }
    } catch (error) {
      console.log("❌ Error fetching emails:", error);
    }
  },

  // Run all tests
  async runAllTests() {
    console.log("🚀 Starting IMAP Email System Tests\n");
    
    // Note: These tests require proper authentication tokens and database setup
    console.log("⚠️  Note: Update the authentication tokens and ensure database is set up before running tests\n");
    
    // Uncomment the following lines to run tests:
    // await testFunctions.testImapConfigCreation();
    // await testFunctions.testPrefixAccessCreation();
    // await testFunctions.testPrefixVerification();
    // await testFunctions.testEmailAccess();
    // await testFunctions.testManualEmailFetch();
    
    console.log("✅ All tests completed");
  }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = testFunctions;
}

// Run tests if this file is executed directly
if (typeof window === 'undefined' && require.main === module) {
  testFunctions.runAllTests();
}

// Browser usage
if (typeof window !== 'undefined') {
  window.testImapSystem = testFunctions;
}