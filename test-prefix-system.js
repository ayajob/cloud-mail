#!/usr/bin/env node

/**
 * Test Script for Prefix-Based Email System
 * 
 * This script tests the basic functionality of the prefix email system.
 */

import fetch from 'node-fetch';

const API_BASE = process.env.API_BASE || 'https://your-worker.your-subdomain.workers.dev';
const TEST_PREFIX = 'test';
const TEST_PASSWORD = 'test123';

console.log('🧪 Testing Prefix-Based Email System...\n');

async function testAPI(endpoint, method = 'GET', body = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const data = await response.json();
    
    return {
      success: response.ok,
      status: response.status,
      data
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function runTests() {
  const tests = [
    {
      name: 'Test Prefix Authentication',
      test: async () => {
        const result = await testAPI('/prefix/stats', 'POST', {
          prefix: TEST_PREFIX,
          password: TEST_PASSWORD
        });
        
        return {
          passed: result.success && result.data.code === 200,
          message: result.success ? 'Authentication successful' : `Failed: ${result.data?.message || result.error}`,
          details: result.data
        };
      }
    },
    
    {
      name: 'Test Email Retrieval',
      test: async () => {
        const result = await testAPI('/prefix/emails', 'POST', {
          prefix: TEST_PREFIX,
          password: TEST_PASSWORD,
          page: 1,
          size: 10
        });
        
        return {
          passed: result.success && result.data.code === 200,
          message: result.success ? `Found ${result.data.data?.total || 0} emails` : `Failed: ${result.data?.message || result.error}`,
          details: result.data
        };
      }
    },
    
    {
      name: 'Test Invalid Authentication',
      test: async () => {
        const result = await testAPI('/prefix/stats', 'POST', {
          prefix: TEST_PREFIX,
          password: 'wrongpassword'
        });
        
        return {
          passed: !result.success && result.data.code === 401,
          message: !result.success ? 'Correctly rejected invalid credentials' : 'Security issue: accepted invalid credentials',
          details: result.data
        };
      }
    },
    
    {
      name: 'Test API Health',
      test: async () => {
        const result = await testAPI('/');
        
        return {
          passed: result.success,
          message: result.success ? 'API is responding' : `API not responding: ${result.error}`,
          details: result.data
        };
      }
    }
  ];
  
  console.log(`🎯 Running ${tests.length} tests...\n`);
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    console.log(`⏳ ${test.name}...`);
    
    try {
      const result = await test.test();
      
      if (result.passed) {
        console.log(`✅ ${test.name}: ${result.message}`);
        passed++;
      } else {
        console.log(`❌ ${test.name}: ${result.message}`);
        if (result.details) {
          console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
        }
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${test.name}: Test error - ${error.message}`);
      failed++;
    }
    
    console.log('');
  }
  
  console.log('📊 Test Results:');
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! System is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the configuration and deployment.');
  }
}

// Configuration check
console.log('🔧 Configuration:');
console.log(`   API Base: ${API_BASE}`);
console.log(`   Test Prefix: ${TEST_PREFIX}`);
console.log(`   Test Password: ${TEST_PASSWORD}`);
console.log('');

if (API_BASE.includes('your-worker') || API_BASE.includes('your-subdomain')) {
  console.log('⚠️  Please update API_BASE environment variable with your actual worker URL');
  console.log('   Example: export API_BASE=https://mail-worker.your-account.workers.dev');
  console.log('');
  process.exit(1);
}

// Run tests
runTests().catch(error => {
  console.error('💥 Test runner error:', error);
  process.exit(1);
});