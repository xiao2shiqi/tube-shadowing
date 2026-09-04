import crypto from 'crypto';

const secret = 'local-dev-jwt-secret-must-be-at-least-32-characters-long';
const header = { alg: 'HS256', typ: 'JWT' };
const payload = { sub: 'test-user-123', email: 'test@example.com', name: 'Test User', picture: '', iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000) + 3600 };

function base64Url(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

function sign(input) {
  return crypto.createHmac('sha256', secret).update(input).digest('base64url');
}

const token = `${base64Url(header)}.${base64Url(payload)}.${sign(`${base64Url(header)}.${base64Url(payload)}`)}`;
console.log(token);
