'use strict';
// routes/twoFactor.js
// ============================================================================
// 2FA API yo'llari:
//   POST /api/auth/2fa/setup       -- QR kod va secret yaratish
//   POST /api/auth/2fa/confirm     -- kodni tasdiqlash va 2FA yoqish
//   POST /api/auth/2fa/disable     -- 2FA o'chirish
//   POST /api/auth/2fa/verify      -- login paytida 2FA tekshirish
//   GET  /api/auth/2fa/backup-codes -- yangi backup kodlar
// ============================================================================

const express = require('express');
const rateLimit = require('express-rate-limit');
const { requireAuth } = require('./auth');
const { setup2FA, verifyTOTP, verifyBackupCode, generateBackupCodes, hashBackupCode } = require('../services/twoFactor');
const { logActivity } = require('../activityLog');
const SecurityIncident = require('../models/SecurityIncident');

const router = express.Router();

// 2FA endpointlari uchun qattiq rate limit
const mfaLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Juda ko'p urinish. 15 daqiqadan keyin qaytadan urinib ko'ring." },
  standardHeaders: true,
  legacyHeaders: false,
});

// ---------------------------------------------------------------------------
// GET /api/auth/2fa/status -- 2FA holati
// ---------------------------------------------------------------------------
router.get('/status', requireAuth, (req, res) => {
  res.json({
    enabled: !!req.user.twoFactorEnabled,
    backupCodesCount: (req.user.twoFactorBackupCodes || []).length,
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/2fa/setup -- 1-qadam: QR kod va secret yaratish
//   Foydalanuvchi hali 2FA ni yoqmagan, setup boshlaydi.
//   Qaytaradi: { qrDataUrl, manualEntry, backupCodes }
// ---------------------------------------------------------------------------
router.post('/setup', requireAuth, async (req, res) => {
  try {
    if (req.user.twoFactorEnabled) {
      return res.status(400).json({ error: "2FA allaqachon yoqilgan. Avval o'chiring." });
    }

    const { secret, rawSecret, qrDataUrl, backupCodes, hashedBackups, manualEntry } = await setup2FA(req.user);

    // Vaqtinchalik saqlaymiz (hali faol emas -- confirm qilgandan keyin faollashadi)
    req.user.twoFactorSecret = secret;
    req.user.twoFactorBackupCodes = hashedBackups;
    await req.user.save();

    res.json({
      qrDataUrl,
      manualEntry,
      backupCodes, // FAQAT BU SAFAR ko'rsatiladi -- foydalanuvchi saqlashi kerak
      message: "Authenticator ilovasida QR kodni skanlang, keyin 6 xonali kodni /2fa/confirm ga yuboring.",
    });
  } catch (e) {
    console.error('[2fa/setup]', e.message);
    res.status(500).json({ error: '2FA sozlashda xato yuz berdi' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/2fa/confirm -- 2-qadam: TOTP kodni tasdiqlash va yoqish
//   { token: "123456" }
// ---------------------------------------------------------------------------
router.post('/confirm', mfaLimiter, requireAuth, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'TOTP kodi talab qilinadi' });
    if (!req.user.twoFactorSecret) {
      return res.status(400).json({ error: "Avval /2fa/setup ni chaqiring" });
    }
    if (req.user.twoFactorEnabled) {
      return res.status(400).json({ error: "2FA allaqachon yoqilgan" });
    }

    const valid = verifyTOTP(req.user.twoFactorSecret, String(token));
    if (!valid) {
      await SecurityIncident.create({
        type: '2fa_confirm_failed', severity: 'low',
        ip: req.ip, userId: req.user.id, path: req.path,
        detectedAt: new Date(),
      }).catch(() => {});
      return res.status(400).json({ error: "Noto'g'ri kod. Authenticator ilovasidagi kodni tekshiring." });
    }

    req.user.twoFactorEnabled = true;
    await req.user.save();

    logActivity({ type: '2fa_enabled', userId: req.user.id, meta: { ip: req.ip } });

    res.json({ ok: true, message: "2FA muvaffaqiyatli yoqildi!" });
  } catch (e) {
    console.error('[2fa/confirm]', e.message);
    res.status(500).json({ error: '2FA tasdiqlashda xato' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/2fa/verify -- Login paytida 2FA tekshirish
//   { token: "123456", tempToken: "..." }
//   Harvey AI: login 2 bosqichli -- 1. parol → tempToken, 2. TOTP → real JWT
// ---------------------------------------------------------------------------
router.post('/verify', mfaLimiter, async (req, res) => {
  try {
    const { token, backupCode, userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId talab qilinadi' });

    const { User } = require('../models');
    const user = await User.findById(userId).select('+twoFactorSecret +twoFactorBackupCodes +twoFactorEnabled');
    if (!user || !user.twoFactorEnabled) {
      return res.status(400).json({ error: "Foydalanuvchi yoki 2FA topilmadi" });
    }

    let verified = false;

    if (token) {
      // TOTP kodi
      verified = verifyTOTP(user.twoFactorSecret, String(token));
    } else if (backupCode) {
      // Backup kod
      const idx = verifyBackupCode(user, backupCode);
      if (idx !== false) {
        // Bir martalik -- o'chiramiz
        user.twoFactorBackupCodes.splice(idx, 1);
        await user.save();
        verified = true;
        logActivity({ type: '2fa_backup_used', userId: user.id, meta: { ip: req.ip } });
      }
    }

    if (!verified) {
      await SecurityIncident.create({
        type: '2fa_verify_failed', severity: 'medium',
        ip: req.ip, userId: user.id, path: req.path,
        detectedAt: new Date(),
      }).catch(() => {});
      return res.status(401).json({ error: "Noto'g'ri 2FA kodi" });
    }

    // 2FA o'tdi -- to'liq JWT beramiz
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || require('crypto').randomBytes(48).toString('hex');
    const jwtToken = jwt.sign({ uid: user.id }, JWT_SECRET, { expiresIn: '30d' });

    logActivity({ type: '2fa_login_success', userId: user.id, meta: { ip: req.ip } });

    const { publicUser } = require('./auth');
    res.json({ token: jwtToken, user: await publicUser(user) });
  } catch (e) {
    console.error('[2fa/verify]', e.message);
    res.status(500).json({ error: '2FA tekshirishda xato' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/2fa/disable -- 2FA o'chirish
//   { password: "...", token: "123456" }
// ---------------------------------------------------------------------------
router.post('/disable', mfaLimiter, requireAuth, async (req, res) => {
  try {
    const { password, token } = req.body;
    if (!password) return res.status(400).json({ error: 'Parol talab qilinadi' });

    // Parolni tekshirish
    const bcrypt = require('bcryptjs');
    const user = req.user;
    if (!user.passwordHash) {
      return res.status(400).json({ error: "Parol o'rnatilmagan (Google orqali kirgansiz)" });
    }
    const validPw = await bcrypt.compare(password, user.passwordHash);
    if (!validPw) return res.status(401).json({ error: "Parol noto'g'ri" });

    // Agar 2FA yoqilgan bo'lsa, TOTP ham talab qilinadi
    if (user.twoFactorEnabled && token) {
      const valid = verifyTOTP(user.twoFactorSecret, String(token));
      if (!valid) return res.status(401).json({ error: "2FA kodi noto'g'ri" });
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    user.twoFactorBackupCodes = [];
    await user.save();

    logActivity({ type: '2fa_disabled', userId: user.id, meta: { ip: req.ip } });
    res.json({ ok: true, message: "2FA o'chirildi" });
  } catch (e) {
    console.error('[2fa/disable]', e.message);
    res.status(500).json({ error: '2FA o\'chirishda xato' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/2fa/backup-codes/regenerate -- Yangi backup kodlar
//   { token: "123456" } -- joriy TOTP talab qilinadi
// ---------------------------------------------------------------------------
router.post('/backup-codes/regenerate', mfaLimiter, requireAuth, async (req, res) => {
  try {
    if (!req.user.twoFactorEnabled) {
      return res.status(400).json({ error: "2FA yoqilmagan" });
    }
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'TOTP kodi talab qilinadi' });

    const valid = verifyTOTP(req.user.twoFactorSecret, String(token));
    if (!valid) return res.status(401).json({ error: "TOTP kodi noto'g'ri" });

    const newCodes = generateBackupCodes();
    req.user.twoFactorBackupCodes = newCodes.map(hashBackupCode);
    await req.user.save();

    logActivity({ type: '2fa_backup_regenerated', userId: req.user.id });
    res.json({ backupCodes: newCodes, message: "Yangi backup kodlar yaratildi. Ularni xavfsiz joyda saqlang!" });
  } catch (e) {
    console.error('[2fa/backup-codes]', e.message);
    res.status(500).json({ error: 'Backup kod yaratishda xato' });
  }
});

module.exports = router;
