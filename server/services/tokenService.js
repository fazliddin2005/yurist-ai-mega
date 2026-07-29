'use strict';
// server/services/tokenService.js
// ============================================================================
// JWT TOKEN BOSHQARUVI -- Harvey AI darajasi
//
// IKKI DARAJALI TOKEN TIZIMI:
//   Access token:  qisqa muddatli (15 daqiqa) -- API so'rovlari uchun
//   Refresh token: uzoq muddatli (30 kun)     -- yangi access token olish uchun
//
// Bu nima beradi?
//   - Access token o'g'irlansa, 15 daqiqada yaroqsiz bo'ladi
//   - Foydalanuvchi har 15 daqiqada login qilmaydi (refresh token ishlaydi)
//   - Refresh token o'g'irlansa, /auth/logout orqali bekor qilish mumkin
//   - Barcha qurilmalardan chiqish: user.refreshTokens = [] → save()
// ============================================================================

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(48).toString('hex');
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET || crypto.randomBytes(48).toString('hex');

const ACCESS_TOKEN_EXPIRY = '15m';   // 15 daqiqa
const REFRESH_TOKEN_EXPIRY = '30d';  // 30 kun

// ---------------------------------------------------------------------------
// Access token yaratish
// ---------------------------------------------------------------------------
function createAccessToken(userId) {
  return jwt.sign({ uid: userId, type: 'access' }, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

// ---------------------------------------------------------------------------
// Refresh token yaratish + hash
// ---------------------------------------------------------------------------
function createRefreshToken(userId) {
  const rawToken = crypto.randomBytes(48).toString('hex');
  const token = jwt.sign(
    { uid: userId, type: 'refresh', jti: rawToken.slice(0, 8) },
    REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
  // DB ga saqlash uchun hash
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  return { token, hash };
}

// ---------------------------------------------------------------------------
// Access token tekshirish
// ---------------------------------------------------------------------------
function verifyAccessToken(token) {
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.type !== 'access') return null;
    return payload;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Refresh token tekshirish
// ---------------------------------------------------------------------------
function verifyRefreshToken(token) {
  try {
    const payload = jwt.verify(token, REFRESH_SECRET);
    if (payload.type !== 'refresh') return null;
    return payload;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Token hash (DB saqlash uchun)
// ---------------------------------------------------------------------------
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// ---------------------------------------------------------------------------
// Middleware: access token yoki refresh orqali autentifikatsiya
// (mavjud requireAuth bilan bir qatorda ishlatish mumkin)
// ---------------------------------------------------------------------------
async function requireAuthV2(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Tizimga kirish talab qilinadi' });

  // 1. Access token tekshirish
  const payload = verifyAccessToken(token);
  if (payload) {
    const { User } = require('../models');
    const user = await User.findById(payload.uid);
    if (!user) return res.status(401).json({ error: 'Foydalanuvchi topilmadi' });
    req.user = user;
    return next();
  }

  // 2. Eski 30d JWT (backward compat -- avvalgi foydalanuvchilar uchun)
  try {
    const oldPayload = jwt.verify(token, JWT_SECRET);
    if (oldPayload.uid) {
      const { User } = require('../models');
      const user = await User.findById(oldPayload.uid);
      if (!user) return res.status(401).json({ error: 'Foydalanuvchi topilmadi' });
      req.user = user;
      return next();
    }
  } catch { /* eski token ham yaroqsiz */ }

  return res.status(401).json({ error: 'Token yaroqsiz yoki muddati tugagan', code: 'TOKEN_EXPIRED' });
}

module.exports = {
  createAccessToken,
  createRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
  requireAuthV2,
};
