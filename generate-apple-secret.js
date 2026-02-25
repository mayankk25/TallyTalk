// Run this script to generate Apple client secret for Supabase
// Usage: node generate-apple-secret.js

const crypto = require('crypto');
const fs = require('fs');

// ============ FILL IN THESE VALUES ============
const TEAM_ID = 'G56XFGV6A2';        // 10 characters, from Apple Developer Membership
const KEY_ID = 'YKNFF6464M';          // 10 characters, shown next to your key in Apple Developer
const CLIENT_ID = 'com.voicebudget.app'; // Your Bundle ID or Services ID
const P8_FILE_PATH = '/Users/mayank.agrawal/Desktop/ClaudeCode/budget_app/AuthKey_YKNFF6464M.p8'; // Path to your .p8 file
// ==============================================

function generateAppleClientSecret() {
  const privateKey = fs.readFileSync(P8_FILE_PATH, 'utf8');

  const now = Math.floor(Date.now() / 1000);
  const expiry = now + (86400 * 180); // 180 days

  // Header
  const header = {
    alg: 'ES256',
    kid: KEY_ID,
    typ: 'JWT'
  };

  // Payload
  const payload = {
    iss: TEAM_ID,
    iat: now,
    exp: expiry,
    aud: 'https://appleid.apple.com',
    sub: CLIENT_ID
  };

  // Encode
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  // Sign
  const sign = crypto.createSign('SHA256');
  sign.update(signatureInput);
  const signature = sign.sign(privateKey, 'base64url');

  const jwt = `${signatureInput}.${signature}`;

  console.log('\n========== APPLE CLIENT SECRET ==========\n');
  console.log(jwt);
  console.log('\n==========================================');
  console.log('\nCopy the above JWT and paste it into Supabase as the "Secret Key"');
  console.log('This secret expires in 180 days.\n');

  return jwt;
}

generateAppleClientSecret();
