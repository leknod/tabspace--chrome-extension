/**
 * Genera un par de claves RSA para fijar el ID de la extension.
 *
 * Sin esto, cada "Cargar descomprimida" en chrome://extensions puede darte
 * un ID distinto, y el OAuth client de Google Cloud (tipo "Extension de Chrome")
 * esta atado a un ID fijo -> el login se rompe. Con la clave publica puesta en
 * manifest.json ("key"), el ID queda fijo aunque recargues la extension.
 *
 * Uso: node scripts/generate-extension-key.mjs
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

// El ID de extension de Chrome = primeros 16 bytes del SHA256 de la
// clave publica DER, con cada nibble hex mapeado a una letra a-p.
const hash = createHash('sha256').update(publicKey).digest();
const extensionId = [...hash.subarray(0, 16)]
  .flatMap((byte) => [byte >> 4, byte & 0x0f])
  .map((nibble) => String.fromCharCode('a'.charCodeAt(0) + nibble))
  .join('');

const publicKeyBase64 = publicKey.toString('base64');

writeFileSync(path.join(secretsDir, 'private-key.pem'), privateKey);
writeFileSync(path.join(secretsDir, 'public-key.base64.txt'), publicKeyBase64);
writeFileSync(path.join(secretsDir, 'extension-id.txt'), extensionId);

console.log('Clave privada guardada en extension-key/private-key.pem (no la subas a git).');
console.log('\nID de extension fijo:');
console.log('  ' + extensionId);
console.log('\nAgrega este bloque a manifest.template.json (nivel raiz, junto a "manifest_version"):');
console.log(`  "key": "${publicKeyBase64}",`);
console.log('\nUsa el ID de extension como "Item ID" al crear el OAuth client (tipo "Extension de Chrome") en Google Cloud Console.');
