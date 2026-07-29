'use strict';
// server/services/twoFactor.js
// ============================================================================
// 2FA / MFA -- TOTP (Time-based One-Time Password)
// Harvey AI darajasi: Google Authenticator / Authy bilan ishlaydi.
//
// XAVFSIZLIK ARXITEKTURASI:
//   1. Foydalanuvchi 2FA ni yoqadi → server secret yaratadi → QR kod beradi
//   2. Foydalanuvchi authenticator ilovasida QR ni skanerlaydi
//   3. 6 xonali kodni kiritib tasdiqlaydi → 2FA faollashadi
//   4. Keyingi loginlarda: parol to'g'ri bo'lsa, 2FA kodi so'raladi
//   5. 8 ta backup kod beriladi → telefon yo'qolsa ishlatiladi
// ============================================================================

const { authenticator } = require('otplib');
const QRCode = require('qrcode');
const crypto = require('crypto');

// TOTP sozlamalari (RFC 6238 standart)
authenticator.options = {
  window: 1,   // ±30 soniya tolerans (clock drift uchun)
  step: 30,    // 30 soniyada yangi kod
  digits: 6,   // 6 xonali kod
};

// Secret ni AES-256 bilan shifrlash (DB da ochiq saqlanmasligi uchun)
// TWO_FACTOR_ENCRYPTION_KEY env da 32 byte hex bo'lishi kerak
const ENCRYPTION_KEY_HEX = process.env.TWO_FACTOR_ENCRYPTION_KEY;

function getEncryptionKey() {
  if (ENCRYPTION_KEY_HEX) {
    return Buffer.from(ENCRYPTION_KEY_HEX, 'hex');
  }
  // Key yo'q bo'lsa, server start uchun deterministik fallback
  // PRODUCTION DA TWO_FACTOR_ENCRYPTION_KEY ni albatta sozlang!
  return crypto.scryptSync('yurist-2fa-fallback', 'salt', 32);
}

function encryptSecret(plaintext) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decryptSecret(ciphertext) {
  try {
    const [ivHex, encHex] = ciphertext.split(':');
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    return Buffer.concat([decipher.update(Buffer.from(encHex, 'hex')), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Backup kodlar: 8 ta, har biri 10 belgili, bir martalik
// ---------------------------------------------------------------------------
function generateBackupCodes() {
  return Array.from({ length: 8 }, () =>
    crypto.randomBytes(5).toString('hex').toUpperCase()
  );
}

// Backup kod ni hash qilib saqlaymiz (oddiy matn saqlanmaydi)
function hashBackupCode(code) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

// ---------------------------------------------------------------------------
// 2FA yoqish -- setup
// ---------------------------------------------------------------------------
async function setup2FA(user) {
  const rawSecret = authenticator.generateSecret(20);
  const encryptedSecret = encryptSecret(rawSecret);

  // QR kod URI (Google Authenticator formati)
  const appName = 'Yurist AI';
  const label = encodeURIComponent(user.email || user.phone || user.name || 'user');
  const otpauthUrl = `otpauth://totp/${appName}:${label}?secret=${rawSecret}&issuer=${appName}&algorithm=SHA1&digits=6&period=30`;

  const qrDataUrl = await QRCode.toDataURL(otpauthUrl);

  const backupCodes = generateBackupCodes();
  const hashedBackups = backupCodes.map(hashBackupCode);

  return {
    secret: encryptedSecret,          // DB ga saqlanadi
    rawSecret,                         // FAQAT bu bir marta ko'rsatiladi
    qrDataUrl,                         // Frontendda <img src> ga qo'yiladi
    backupCodes,                       // Foydalanuvchiga ko'rsatiladi (bir marta)
    hashedBackups,                     // DB ga saqlanadi
    manualEntry: rawSecret,            // QR skaner bo'lmasa qo'lda kiritish uchun
  };
}

// ---------------------------------------------------------------------------
// TOTP kodini tekshirish
// ---------------------------------------------------------------------------
function verifyTOTP(encryptedSecret, token) {
  const rawSecret = decryptSecret(encryptedSecret);
  if (!rawSecret) return false;
  try {
    return authenticator.check(token, rawSecret);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Backup kodni tekshirish va ishlatilganini belgilash
// ---------------------------------------------------------------------------
function verifyBackupCode(user, code) {
  const normalizedCode = code.replace(/[\s-]/g, '').toUpperCase();
  const hash = hashBackupCode(normalizedCode);
  const idx = (user.twoFactorBackupCodes || []).indexOf(hash);
  if (idx === -1) return false;
  // Bir martalik -- ishlatilgan kodni o'chirish caller da bajariladi
  return idx;
}

module.exports = {
  setup2FA,
  verifyTOTP,
  verifyBackupCode,
  generateBackupCodes,
  hashBackupCode,
  encryptSecret,
  decryptSecret,
};
