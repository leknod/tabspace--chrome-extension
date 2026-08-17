/**
 * Generates an RSA key pair to pin the extension's ID.
 *
 * Without this, every "Load unpacked" in chrome://extensions can give you
 * a different ID, and the Google Cloud OAuth client (type "Chrome Extension")
 * is tied to a fixed ID -> login breaks. With the public key set in
 * manifest.json ("key"), the ID stays fixed even when you reload the extension.
 *
 * Usage: node scripts/generate-extension-key.mjs
 */
import { generateKeyPairSync, createHash } from 'node:crypto';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url)) + '/..';
const secretsDir = path.join(root, 'extension-key');
mkdirSync(secretsDir, { recursive: true });

const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'der' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

// Chrome's extension ID = first 16 bytes of the SHA256 of the DER public
// key, with each hex nibble mapped to a letter a-p.
const hash = createHash('sha256').update(publicKey).digest();
const extensionId = [...hash.subarray(0, 16)]
  .flatMap((byte) => [byte >> 4, byte & 0x0f])
  .map((nibble) => String.fromCharCode('a'.charCodeAt(0) + nibble))
  .join('');

const publicKeyBase64 = publicKey.toString('base64');

writeFileSync(path.join(secretsDir, 'private-key.pem'), privateKey);
writeFileSync(path.join(secretsDir, 'public-key.base64.txt'), publicKeyBase64);
writeFileSync(path.join(secretsDir, 'extension-id.txt'), extensionId);

console.log('Private key saved to extension-key/private-key.pem (do not commit it).');
console.log('\nFixed extension ID:');
console.log('  ' + extensionId);
console.log('\nAdd this block to manifest.template.json (top level, next to "manifest_version"):');
console.log(`  "key": "${publicKeyBase64}",`);
console.log('\nUse the extension ID as the "Item ID" when creating the OAuth client (type "Chrome Extension") in Google Cloud Console.');
