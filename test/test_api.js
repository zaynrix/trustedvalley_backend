// ملف لاختبار الـ API بسرعة
// شغله بـ: node test-api.js

// Polyfill `fetch` for Node versions that don't have it (Node < 18).
if (typeof fetch === 'undefined') {
  // dynamic import so this file works in both CommonJS and ESM runtimes
  global.fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
}

const baseURL = 'http://localhost:3000';

async function testAPI() {
  console.log('🧪 اختبار الـ API...\n');
  
  // Test 1: Health Check
  console.log('1️⃣ Testing Health Check...');
  try {
    const response = await fetch(baseURL);
    const data = await response.json();
    console.log('✅ Server is running:', data.message);
  } catch (error) {
    console.log('❌ Server not running!');
    return;
  }
  
  console.log('\n---\n');
  
  // Test 2: Register User
  console.log('2️⃣ Testing Register...');
  try {
    const response = await fetch(`${baseURL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Ahmed Test',
        email: 'ahmed@test.com',
        // compliant password: min 8 chars, uppercase and special character
        password: 'Password123!'
      })
    });
    const data = await response.json();
    console.log('✅ Register Response:', data);
  } catch (error) {
    console.log('❌ Register Failed:', error.message);
  }
  
  console.log('\n---\n');
  
  // Test 3: Login
  console.log('3️⃣ Testing Login...');
  try {
    const response = await fetch(`${baseURL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'ahmed@test.com',
        password: 'Password123!'
      })
    });
    const data = await response.json();
    console.log('✅ Login Response:', data);
  } catch (error) {
    console.log('❌ Login Failed:', error.message);
  }
  
  console.log('\n---\n');
  
  // Test 4: Create Request
  console.log('4️⃣ Testing Create Request...');
  try {
    const response = await fetch(`${baseURL}/api/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'user_123',
        title: 'Test Request',
        description: 'This is a test request',
        priority: 'high'
      })
    });
    const data = await response.json();
    console.log('✅ Create Request Response:', data);
  } catch (error) {
    console.log('❌ Create Request Failed:', error.message);
  }
  
  console.log('\n---\n');
  console.log('✅ All tests completed!');
}

// تشغيل الاختبارات
testAPI();