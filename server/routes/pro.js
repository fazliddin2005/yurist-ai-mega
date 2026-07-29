// routes/pro.js -- Yurist AI Pro tarifi API routelari
//
// AUTH: mavjud routes/auth.js dagi requireAuth ishlatiladi (req.user to'liq
// User hujjati bo'ladi) -- alohida JWT logikasi YO'Q, bitta manba printsipi.
//
// ENDPOINT'LAR:
//   POST   /api/pro/subscribe    -- Pro tarifga yozilish (test to'lov rejimi)
//   GET    /api/pro/status       -- obuna holati (Pro bo'lmaganlar uchun ham ochiq)
//   GET    /api/pro/profile      -- kuzatuv profilini olish
//   POST   /api/pro/profile      -- kuzatuv profilini yaratish/yangilash
//   POST   /api/pro/run-watcher  -- Kuzatuvchi Agentni qo'lda ishga tushirish
//   POST   /api/pro/run-health   -- Biznes Salomatligi Agentini ishga tushirish
//   POST   /api/pro/run-all      -- ikkalasini parallel ishga tushirish
//   GET    /api/pro/alerts       -- ogohlantirish tarixi
//   POST   /api/pro/alerts/read  -- hammasini o'qilgan deb belgilash
//   DELETE /api/pro/cancel       -- obunani bekor qilish

const express = require('express');
const router = express.Router();

const { requireAuth } = require('./auth');
const ProSubscription = require('../models/ProSubscription');
const WatchProfile = require('../models/WatchProfile');
const { runWatcherAgent } = require('../services/watcherAgent');
const { runHealthAgent } = require('../services/proHealthAgent');

// ----------------------------------------------------------------
// MIDDLEWARE: Pro obuna tekshirish (requireAuth dan KEYIN ishlatiladi)
// ----------------------------------------------------------------
async function requirePro(req, res, next) {
  try {
    const sub = await ProSubscription.findOne({ userId: req.user._id });
    if (!sub || !sub.isActive()) {
      return res.status(403).json({
        error: 'Bu funksiya Yurist AI Pro tarifida mavjud',
        code: 'PRO_REQUIRED',
      });
    }
    req.proSub = sub;
    next();
  } catch (e) {
    next(e);
  }
}

// Kirish ma'lumotlarini tozalash: satr massivlarini xavfsiz qabul qilish
function cleanStringArray(arr, maxLen = 20, maxItemLen = 200) {
  if (!Array.isArray(arr)) return undefined;
  return arr
    .filter((s) => typeof s === 'string' && s.trim())
    .map((s) => s.trim().slice(0, maxItemLen))
    .slice(0, maxLen);
}

// ----------------------------------------------------------------
// POST /api/pro/subscribe
// ----------------------------------------------------------------
router.post('/subscribe', requireAuth, async (req, res) => {
  try {
    const { plan = 'b2c', notifyChannel = 'inapp', telegramChatId } = req.body || {};

    if (!['b2c', 'b2b'].includes(plan)) {
      return res.status(400).json({ error: "Noto'g'ri tarif turi" });
    }
    if (!['telegram', 'email', 'sms', 'inapp'].includes(notifyChannel)) {
      return res.status(400).json({ error: "Noto'g'ri xabar kanali" });
    }

    const existing = await ProSubscription.findOne({ userId: req.user._id });
    if (existing && existing.isActive()) {
      return res.json({ ok: true, alreadyActive: true, subscription: existing });
    }

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    let sub;
    if (existing) {
      existing.status = 'active';
      existing.plan = plan;
      existing.notifyChannel = notifyChannel;
      existing.telegramChatId = typeof telegramChatId === 'string' ? telegramChatId.trim().slice(0, 64) : null;
      existing.startedAt = new Date();
      existing.expiresAt = expiresAt;
      sub = await existing.save();
    } else {
      sub = await ProSubscription.create({
        userId: req.user._id,
        plan,
        notifyChannel,
        telegramChatId: typeof telegramChatId === 'string' ? telegramChatId.trim().slice(0, 64) : null,
        expiresAt,
        paymentMethod: 'test', // Payme/Click ulangach shu maydon o'zgaradi
      });
    }

    // Bo'sh kuzatuv profili -- foydalanuvchi keyin to'ldiradi
    const profileExists = await WatchProfile.findOne({ userId: req.user._id });
    if (!profileExists) {
      await WatchProfile.create({ userId: req.user._id });
    }

    res.json({ ok: true, subscription: sub });
  } catch (e) {
    console.error('[pro/subscribe]', e.message);
    res.status(500).json({ error: 'Obunani faollashtirishda xato yuz berdi' });
  }
});

// ----------------------------------------------------------------
// GET /api/pro/status
// ----------------------------------------------------------------
router.get('/status', requireAuth, async (req, res) => {
  try {
    const sub = await ProSubscription.findOne({ userId: req.user._id });
    if (!sub) return res.json({ isPro: false });

    const profile = await WatchProfile.findOne({ userId: req.user._id }).lean();
    const unreadAlerts = profile
      ? (profile.alertHistory || []).filter((a) => !a.isRead).length
      : 0;

    res.json({
      isPro: sub.isActive(),
      status: sub.status,
      plan: sub.plan,
      expiresAt: sub.expiresAt,
      daysLeft: Math.max(0, Math.ceil((sub.expiresAt - new Date()) / (1000 * 60 * 60 * 24))),
      agents: sub.agents,
      notifyChannel: sub.notifyChannel,
      profileFilled: !!(profile && profile.businessName),
      unreadAlerts,
      lastWatcherRunAt: profile?.lastWatcherRunAt || null,
      lastHealthRunAt: profile?.lastHealthRunAt || null,
    });
  } catch (e) {
    console.error('[pro/status]', e.message);
    res.status(500).json({ error: 'Holatni olishda xato' });
  }
});

// ----------------------------------------------------------------
// GET /api/pro/profile
// ----------------------------------------------------------------
router.get('/profile', requireAuth, requirePro, async (req, res) => {
  try {
    const profile = await WatchProfile.findOne({ userId: req.user._id });
    if (!profile) return res.json({ filled: false });
    res.json({ filled: !!profile.businessName, profile });
  } catch (e) {
    console.error('[pro/profile GET]', e.message);
    res.status(500).json({ error: 'Profilni olishda xato' });
  }
});

// ----------------------------------------------------------------
// POST /api/pro/profile
// ----------------------------------------------------------------
router.post('/profile', requireAuth, requirePro, async (req, res) => {
  try {
    const body = req.body || {};
    let profile = await WatchProfile.findOne({ userId: req.user._id });
    if (!profile) profile = new WatchProfile({ userId: req.user._id });

    // Oddiy satr maydonlari (uzunlik cheklovlari bilan)
    if (body.businessName !== undefined) profile.businessName = String(body.businessName || '').slice(0, 200) || null;
    if (body.businessType !== undefined) profile.businessType = String(body.businessType || '').slice(0, 100) || null;
    if (body.inn !== undefined) profile.inn = String(body.inn || '').slice(0, 20) || null;
    if (body.region !== undefined) profile.region = String(body.region || '').slice(0, 100) || 'Toshkent';
    if (body.taxRegime !== undefined) {
      const allowed = ['qqs_12', 'qqs_6', 'simplified', 'individual', null];
      profile.taxRegime = allowed.includes(body.taxRegime) ? body.taxRegime : null;
    }
    if (body.taxNextDueAt !== undefined) {
      const d = new Date(body.taxNextDueAt);
      profile.taxNextDueAt = isNaN(d) ? null : d;
    }

    // Massivlar
    const watchTopics = cleanStringArray(body.watchTopics, 10, 50);
    if (watchTopics !== undefined) profile.watchTopics = watchTopics;
    const courtNames = cleanStringArray(body.courtWatchNames, 10, 150);
    if (courtNames !== undefined) profile.courtWatchNames = courtNames;
    const partners = cleanStringArray(body.watchPartners, 20, 150);
    if (partners !== undefined) profile.watchPartners = partners;

    // Murakkab massivlar -- Mongoose schema validatsiya qiladi,
    // lekin hajm cheklovini o'zimiz qo'yamiz (xotira himoyasi)
    if (Array.isArray(body.contracts)) profile.contracts = body.contracts.slice(0, 50);
    if (Array.isArray(body.employees)) profile.employees = body.employees.slice(0, 200);
    if (Array.isArray(body.licenses)) profile.licenses = body.licenses.slice(0, 30);

    await profile.save();
    res.json({ ok: true, profile });
  } catch (e) {
    console.error('[pro/profile POST]', e.message);
    // Mongoose validatsiya xatosi -- foydalanuvchiga tushunarli javob
    if (e.name === 'ValidationError') {
      return res.status(400).json({ error: "Ma'lumotlar formati noto'g'ri: " + e.message });
    }
    res.status(500).json({ error: 'Profilni saqlashda xato' });
  }
});

// ----------------------------------------------------------------
// AGENT ISHGA TUSHIRISH
// ----------------------------------------------------------------
router.post('/run-watcher', requireAuth, requirePro, async (req, res) => {
  const result = await runWatcherAgent(req.user._id);
  res.status(result.ok ? 200 : 400).json(result);
});

router.post('/run-health', requireAuth, requirePro, async (req, res) => {
  const result = await runHealthAgent(req.user._id);
  res.status(result.ok ? 200 : 400).json(result);
});

router.post('/run-all', requireAuth, requirePro, async (req, res) => {
  try {
    const [watcher, health] = await Promise.all([
      runWatcherAgent(req.user._id),
      runHealthAgent(req.user._id),
    ]);
    const totalAlerts = (watcher.alertsFound || 0) + (health.alertsFound || 0);
    res.json({ ok: true, totalAlerts, watcher, health, ranAt: new Date().toISOString() });
  } catch (e) {
    console.error('[pro/run-all]', e.message);
    res.status(500).json({ error: 'Agentlarni ishga tushirishda xato' });
  }
});

// ----------------------------------------------------------------
// OGOHLANTIRISHLAR
// ----------------------------------------------------------------
router.get('/alerts', requireAuth, requirePro, async (req, res) => {
  try {
    const profile = await WatchProfile.findOne({ userId: req.user._id }).lean();
    if (!profile) return res.json({ alerts: [], unread: 0, total: 0 });

    const alerts = profile.alertHistory || [];
    const unread = alerts.filter((a) => !a.isRead).length;

    // Saralash: critical > warning > info, ichida yangi > eski
    const order = { critical: 0, warning: 1, info: 2 };
    const sorted = [...alerts].sort((a, b) => {
      const lv = (order[a.level] ?? 2) - (order[b.level] ?? 2);
      if (lv !== 0) return lv;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.json({ alerts: sorted, unread, total: sorted.length });
  } catch (e) {
    console.error('[pro/alerts]', e.message);
    res.status(500).json({ error: 'Ogohlantirishlarni olishda xato' });
  }
});

router.post('/alerts/read', requireAuth, requirePro, async (req, res) => {
  try {
    // BUG FIX: mongoose subdocument'ni spread qilish o'rniga to'g'ridan-to'g'ri
    // maydonni yangilaymiz -- subdoc metadata buzilmasligi uchun
    await WatchProfile.updateOne(
      { userId: req.user._id },
      { $set: { 'alertHistory.$[].isRead': true } }
    );
    res.json({ ok: true });
  } catch (e) {
    console.error('[pro/alerts/read]', e.message);
    res.status(500).json({ error: 'Belgilashda xato' });
  }
});

// ----------------------------------------------------------------
// POST /api/pro/notify-channel -- xabar kanalini yangilash
// ----------------------------------------------------------------
router.post('/notify-channel', requireAuth, requirePro, async (req, res) => {
  try {
    const { notifyChannel, telegramChatId } = req.body || {};
    if (!['telegram', 'email', 'sms', 'inapp'].includes(notifyChannel)) {
      return res.status(400).json({ error: "Noto'g'ri xabar kanali" });
    }
    req.proSub.notifyChannel = notifyChannel;
    if (telegramChatId !== undefined) {
      req.proSub.telegramChatId = typeof telegramChatId === 'string'
        ? telegramChatId.trim().slice(0, 64) || null : null;
    }
    await req.proSub.save();
    res.json({ ok: true, notifyChannel: req.proSub.notifyChannel });
  } catch (e) {
    console.error('[pro/notify-channel]', e.message);
    res.status(500).json({ error: 'Kanalni yangilashda xato' });
  }
});

// ----------------------------------------------------------------
// DELETE /api/pro/cancel
// ----------------------------------------------------------------
router.delete('/cancel', requireAuth, requirePro, async (req, res) => {
  try {
    req.proSub.status = 'cancelled';
    await req.proSub.save();
    res.json({ ok: true, expiresAt: req.proSub.expiresAt });
  } catch (e) {
    console.error('[pro/cancel]', e.message);
    res.status(500).json({ error: 'Bekor qilishda xato' });
  }
});

module.exports = router;
