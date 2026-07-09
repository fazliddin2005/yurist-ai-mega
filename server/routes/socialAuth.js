// routes/socialAuth.js -- Google login (via userinfo endpoint)
const express = require('express');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { logActivity, ACTION_TYPES } = require('../activityLog');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || require('crypto').randomBytes(48).toString('hex');
const TOKEN_EXPIRY = '30d';
const STARTER_CREDITS = 100;

// POST /api/auth/google
// Frontend sends: { accessToken } -- Google OAuth access token
router.post('/google', async (req, res) => {
  try {
    const { accessToken, idToken } = req.body;
    const token = accessToken || idToken;
    if (!token) return res.status(400).json({ error: 'Google token talab qilinadi' });

    // Google userinfo endpoint orqali foydalanuvchi ma'lumotlarini olish
    let userInfo;
    try {
      // Access token bilan userinfo
      let resp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: 'Bearer ' + token }
      });
      if (!resp.ok) {
        // ID token bilan tokeninfo sinab ko'rish
        resp = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + token);
      }
      if (!resp.ok) throw new Error('Google token noto\'g\'ri');
      userInfo = await resp.json();
    } catch (e) {
      return res.status(401).json({ error: 'Google orqali tekshirishda xato: ' + e.message });
    }

    const { sub: googleId, email, name, picture } = userInfo;
    if (!googleId) return res.status(401).json({ error: 'Google foydalanuvchi ID topilmadi' });

    // Foydalanuvchi topish yoki yaratish
    let user = await User.findOne({
      $or: [
        { googleId },
        ...(email ? [{ email: email.toLowerCase() }] : [])
      ]
    });

    if (!user) {
      user = await User.create({
        name: name || email?.split('@')[0] || 'Foydalanuvchi',
        email: email?.toLowerCase() || null,
        googleId,
        avatar: picture || null,
        credits: STARTER_CREDITS,
        lang: 'uz',
        role: 'user',
        emailVerified: true,
      });
      logActivity({ type: ACTION_TYPES.USER_REGISTER, userId: user._id, meta: { via: 'google' } });
    } else {
      if (!user.googleId) user.googleId = googleId;
      if (picture && !user.avatar) user.avatar = picture;
      await user.save();
    }

    const jwtToken = jwt.sign({ uid: user._id }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY }); // auth.js bilan bir xil format
    logActivity({ type: ACTION_TYPES.USER_LOGIN, userId: user._id, meta: { via: 'google' } });

    res.json({
      token: jwtToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        credits: user.credits,
        lang: user.lang,
        role: user.role,
        avatar: user.avatar,
      },
    });
  } catch (e) {
    console.error('[auth/google]', e.message);
    res.status(500).json({ error: 'Google orqali kirishda xato' });
  }
});

module.exports = router;
