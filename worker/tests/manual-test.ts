/**
 * Manual Test Script
 * Run this to test basic functionality without deploying
 */

import { encryptString, decryptString } from '../src/crypto.js';

async function runTests() {
  console.log('🧪 Starting manual tests...\n');

  // Test 1: Crypto functions
  console.log('Test 1: Crypto encryption/decryption');
  try {
    const secret = 'test-secret-key-12345';
    const plaintext = 'my-monarch-token-xyz';

    console.log('  Encrypting:', plaintext);
    const encrypted = await encryptString(secret, plaintext);
    console.log('  Encrypted:', encrypted.substring(0, 50) + '...');

    console.log('  Decrypting...');
    const decrypted = await decryptString(secret, encrypted);
    console.log('  Decrypted:', decrypted);

    if (decrypted === plaintext) {
      console.log('  ✅ Crypto test PASSED\n');
    } else {
      console.log('  ❌ Crypto test FAILED\n');
    }
  } catch (error) {
    console.log('  ❌ Crypto test FAILED:', error);
  }

  // Test 2: Wrong secret should fail
  console.log('Test 2: Decryption with wrong secret should fail');
  try {
    const secret1 = 'secret-1';
    const secret2 = 'secret-2';
    const plaintext = 'test-data';

    const encrypted = await encryptString(secret1, plaintext);
    await decryptString(secret2, encrypted);

    console.log('  ❌ Should have thrown an error\n');
  } catch (error) {
    console.log('  ✅ Correctly rejected wrong secret\n');
  }

  // Test 3: Special characters
  console.log('Test 3: Special characters and Unicode');
  try {
    const secret = 'test-secret';
    const plaintext = '🔐 Token: abc-123-中文-العربية';

    const encrypted = await encryptString(secret, plaintext);
    const decrypted = await decryptString(secret, encrypted);

    if (decrypted === plaintext) {
      console.log('  ✅ Unicode test PASSED\n');
    } else {
      console.log('  ❌ Unicode test FAILED\n');
    }
  } catch (error) {
    console.log('  ❌ Unicode test FAILED:', error);
  }

  console.log('✅ All manual tests completed!\n');
}

// Run tests
runTests().catch(console.error);
