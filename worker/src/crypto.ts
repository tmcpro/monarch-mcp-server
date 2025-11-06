/**
 * Crypto utilities for encrypting and decrypting sensitive data
 * Uses Web Crypto API (SubtleCrypto) available in Cloudflare Workers
 */

/**
 * Derive a key from the provided secret string
 */
async function deriveKey(secret: string): Promise<CryptoKey> {
  // Convert secret to Uint8Array
  const encoder = new TextEncoder();
  const secretData = encoder.encode(secret);

  // Import the secret as a key
  const baseKey = await crypto.subtle.importKey(
    'raw',
    secretData,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  // Derive a key using PBKDF2
  // Using fixed salt for simplicity - in production, you could use a per-user salt
  const salt = encoder.encode('monarch-mcp-salt-v1');

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a string using AES-GCM
 * @param secret - The encryption secret/password
 * @param plaintext - The string to encrypt
 * @returns Base64-encoded encrypted data with IV prepended
 */
export async function encryptString(secret: string, plaintext: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);

    // Derive encryption key
    const key = await deriveKey(secret);

    // Generate a random IV (Initialization Vector)
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt the data
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      data
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);

    // Convert to base64
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt a string using AES-GCM
 * @param secret - The encryption secret/password (must match encryption secret)
 * @param ciphertext - Base64-encoded encrypted data with IV prepended
 * @returns The decrypted plaintext string
 */
export async function decryptString(secret: string, ciphertext: string): Promise<string> {
  try {
    // Decode from base64
    const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));

    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);

    // Derive decryption key
    const key = await deriveKey(secret);

    // Decrypt the data
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      data
    );

    // Convert back to string
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data. The encryption key may be incorrect or the data may be corrupted.');
  }
}
