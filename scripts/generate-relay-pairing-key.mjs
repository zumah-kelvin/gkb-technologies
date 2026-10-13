import { createHash, randomBytes } from 'node:crypto';

const pairingKey = randomBytes(32).toString('base64url');
const pairingKeyHash = createHash('sha256').update(pairingKey, 'utf8').digest('hex');

console.log('Keep this output private. Do not commit it or paste it into chat.');
console.log(`PAIRING_KEY=${pairingKey}`);
console.log(`PAIRING_KEY_SHA256=${pairingKeyHash}`);
