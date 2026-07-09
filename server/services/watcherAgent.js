// services/watcherAgent.js -- KUZATUVCHI AGENT (Yurist AI Pro)
//
// TASHQI xavflarni kuzatadi:
//   1. Shartnoma muddatlari (30/14/7 kun oldin ogohlantirish)
//   2. Qonunchilik o'zgarishlari (lex.uz -- Nia API orqali, real)
//   3. Sud/ijro reyestri kuzatuvi (API ochilgach real ishlaydi)
//
// 8 TILDA ISHLAYDI: alert matnlari foydalanuvchining `lang` sozlamasiga
// qarab agentI18n.js dan olinadi.
//
// SERVERLESS-XAVFSIZ: hech qanday doimiy jarayon yo'q -- runWatcherAgent()
// so'rov kelganda yoki index.js dagi kunlik trigger orqali chaqiriladi.

const WatchProfile = require('../models/WatchProfile');
const ProSubscription = require('../models/ProSubscription');
const User = require('../models/User');
const { sendGenericEmail, sendGenericSMS } = require('../notifier');
const { t, fmtDate } = require('./agentI18n');
const { searchForJurisdiction, isConfigured: niaConfigured } = require('../nia');

// ----------------------------------------------------------------
// YORDAMCHILAR
// ----------------------------------------------------------------
function daysUntil(date) {
  return Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24));
}
function alertLevel(daysLeft) {
  if (daysLeft <= 7) return 'critical';
  if (daysLeft <= 14) return 'warning';
  return 'info';
}

// ----------------------------------------------------------------
// TEKSHIRUV 1: Shartnoma muddatlari
// ----------------------------------------------------------------
function checkContractDeadlines(profile, lang) {
  const alerts = [];

  for (const contract of profile.contracts || []) {
    if (!contract.expiresAt) continue;
    const days = daysUntil(contract.expiresAt);
    const dateStr = fmtDate(contract.expiresAt, lang);

    if (days <= 0) {
      alerts.push({
        agentType: 'watcher',
        level: 'critical',
        title: t('contract_expired_title', lang),
        message: t('contract_expired_msg', lang, contract.title, Math.abs(days)),
      });
      continue;
    }

    // Faqat belgilangan ogohlantirish oynalarida (standart: 30/14/7 kun)
    const notifyDays = contract.notifiedDays && contract.notifiedDays.length
      ? contract.notifiedDays : [30, 14, 7];
    const shouldNotify = notifyDays.some((d) => days <= d);

    if (shouldNotify) {
      alerts.push({
        agentType: 'watcher',
        level: alertLevel(days),
        title: t('contract_expiring_title', lang),
        message: t('contract_expiring_msg', lang, contract.title, days, dateStr),
      });
    }
  }

  return alerts;
}

// ----------------------------------------------------------------
// TEKSHIRUV 2: Qonunchilik o'zgarishlari (Nia -- REAL integratsiya)
// ----------------------------------------------------------------
async function checkLawChanges(profile, lang, jurisdiction) {
  const alerts = [];
  const topics = profile.watchTopics || [];
  if (topics.length === 0) return alerts;

  // Nia sozlanmagan bo'lsa -- foydalanuvchiga kuzatuv faolligini bildirish
  // (yolg'on "yangilik topildi" demaslik -- halollik printsipi)
  if (!niaConfigured()) {
    alerts.push({
      agentType: 'watcher',
      level: 'info',
      title: t('law_watch_title', lang),
      message: t('law_watch_msg', lang, topics.join(', ')),
    });
    return alerts;
  }

  // Har bir mavzu bo'yicha so'nggi o'zgarishlarni qidirish (maks 3 -- xarajat nazorati)
  const currentYear = new Date().getFullYear();
  for (const topic of topics.slice(0, 3)) {
    try {
      const query = `${topic} qonunchilik o'zgarishlari yangi tahrir ${currentYear}`;
      const result = await searchForJurisdiction(query, jurisdiction || 'UZ');

      if (result && result.chunks && result.chunks.length > 0) {
        const top = result.chunks[0];
        const snippet = (top.text || '').slice(0, 140).trim();
        if (snippet) {
          alerts.push({
            agentType: 'watcher',
            level: 'info',
            title: t('law_news_title', lang, topic),
            message: t('law_news_msg', lang, topic, snippet + (top.text.length > 140 ? '…' : '')),
          });
        }
      }
    } catch (e) {
      console.error(`[watcherAgent] Nia qidiruvida xato (${topic}):`, e.message);
    }
  }

  // Hech narsa topilmasa ham kuzatuv faolligini bildirish
  if (alerts.length === 0) {
    alerts.push({
      agentType: 'watcher',
      level: 'info',
      title: t('law_watch_title', lang),
      message: t('law_watch_msg', lang, topics.join(', ')),
    });
  }

  return alerts;
}

// ----------------------------------------------------------------
// TEKSHIRUV 3: Sud/ijro reyestri
// ----------------------------------------------------------------
// HALOLLIK: O'zbekiston sud reyestri (court.gov.uz) ochiq API bermaydi.
// Foydalanuvchiga kuzatuv faol ekanini bildiramiz, lekin YOLG'ON natija
// ("da'vo topildi/topilmadi") aytmaymiz. API ulangach shu funksiya
// real natija qaytaradi -- boshqa hech narsa o'zgarmaydi.
function checkCourtRegistry(profile, lang) {
  const alerts = [];
  for (const name of profile.courtWatchNames || []) {
    alerts.push({
      agentType: 'watcher',
      level: 'info',
      title: t('court_watch_title', lang, name),
      message: t('court_watch_msg', lang, name),
    });
  }
  return alerts;
}

// ----------------------------------------------------------------
// ASOSIY: Kuzatuvchi Agentni ishga tushirish
// ----------------------------------------------------------------
async function runWatcherAgent(userId) {
  try {
    const sub = await ProSubscription.findOne({ userId, status: 'active' });
    if (!sub || !sub.isActive()) return { ok: false, error: 'PRO_INACTIVE' };
    if (!sub.agents?.watcher) return { ok: false, error: 'AGENT_DISABLED' };

    const profile = await WatchProfile.findOne({ userId });
    if (!profile) return { ok: false, error: 'PROFILE_MISSING' };

    // Foydalanuvchi tili va yurisdiksiyasi
    const user = await User.findById(userId).lean();
    const lang = user?.lang || 'uz';
    const jurisdiction = user?.jurisdiction || 'UZ';

    const allAlerts = [
      ...checkContractDeadlines(profile, lang),
      ...(await checkLawChanges(profile, lang, jurisdiction)),
      ...checkCourtRegistry(profile, lang),
    ];

    // Tarixga yozish (oxirgi 50 ta saqlanadi)
    if (allAlerts.length > 0) {
      const withTime = allAlerts.map((a) => ({ ...a, createdAt: new Date(), isRead: false }));
      const existing = (profile.alertHistory || []).map((a) =>
        typeof a.toObject === 'function' ? a.toObject() : a
      );
      profile.alertHistory = [...withTime, ...existing].slice(0, 50);
    }
    profile.lastWatcherRunAt = new Date();
    await profile.save();

    await sendNotifications(sub, profile, allAlerts, t('agent_watcher_name', lang), lang, user);

    return { ok: true, alertsFound: allAlerts.length, alerts: allAlerts, ranAt: new Date().toISOString() };
  } catch (e) {
    console.error('[watcherAgent] Xato:', e.message);
    return { ok: false, error: e.message };
  }
}

// ----------------------------------------------------------------
// XABAR YUBORISH (Telegram / Email / SMS -- foydalanuvchi tilida)
// ----------------------------------------------------------------
// ================================================================
// PRO AGENT → ISHLARIM INTEGRATSIYASI
// Pro Agent ogohlantirish topganda, foydalanuvchining tegishli
// "Ish" (Case) ga avtomatik yozuv qo'shadi
// ================================================================
async function saveAlertsToCase(userId, alerts, agentName) {
  try {
    const { Case } = require('../models');
    if (!alerts || alerts.length === 0) return;
    const important = alerts.filter(a => a.level !== 'info');
    if (important.length === 0) return;

    // Foydalanuvchining faol ishlarini topish
    const cases = await Case.find({ userId, scope: 'b2c', status: 'active' }).limit(10);
    if (cases.length === 0) return;

    // Har bir ogohlantirish uchun tegishli ishni topish
    for (const alert of important) {
      const alertTitle = (alert.title || '').toLowerCase();
      const alertMsg = (alert.message || '').toLowerCase();

      // Ogohlantirish matni bilan mos keluvchi ishni qidirish
      let targetCase = cases.find(c => {
        const caseTitle = c.title.toLowerCase();
        // Shartnoma muddati ogohlantirishlari
        if (alertTitle.includes('muddat') || alertTitle.includes('срок') || alertTitle.includes('deadline')) {
          return caseTitle.includes('shartnoma') || caseTitle.includes('договор') || caseTitle.includes('contract');
        }
        // Soliq ogohlantirishlari
        if (alertTitle.includes('soliq') || alertTitle.includes('налог') || alertTitle.includes('tax')) {
          return caseTitle.includes('soliq') || caseTitle.includes('налог') || caseTitle.includes('tax');
        }
        return false;
      });

      // Mos ish topilmasa -- birinchi faol ishga yozamiz
      if (!targetCase) targetCase = cases[0];

      // Ishga event qo'shish
      if (targetCase) {
        targetCase.timeline = targetCase.timeline || [];
        targetCase.timeline.push({
          type: 'agent_alert',
          summary: `🤖 ${agentName}: ${alert.title} — ${alert.message}`,
          createdAt: new Date(),
        });
        targetCase.lastActivityAt = new Date();
        await targetCase.save();
      }
    }
    console.log('[watcherAgent] Pro Agent ogohlantirishlari Ishlarimga yozildi:', important.length, 'ta');
  } catch (e) {
    console.error('[watcherAgent] Ishlarimga yozishda xato:', e.message);
  }
}

async function sendNotifications(sub, profile, alerts, agentName, lang, user) {
  if (!alerts || alerts.length === 0) return;
  const important = alerts.filter((a) => a.level !== 'info');
  if (important.length === 0) return;

  const bizName = profile.businessName || t('your_business', lang);
  const text = [
    t('notif_header', lang, agentName, bizName, important.length),
    '',
    ...important.map((a, i) => {
      const icon = a.level === 'critical' ? '🔴' : '🟡';
      return `${icon} ${i + 1}. ${a.title}\n${a.message}`;
    }),
    '',
    t('notif_footer', lang),
  ].join('\n');

  // Telegram (bot token sozlangan bo'lsa)
  if (sub.notifyChannel === 'telegram' && sub.telegramChatId && process.env.TELEGRAM_BOT_TOKEN) {
    try {
      const resp = await fetch(
        `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: sub.telegramChatId, text }),
        }
      );
      if (!resp.ok) {
        const err = await resp.text().catch(() => '');
        console.error('[watcherAgent] Telegram xatosi:', resp.status, err.slice(0, 150));
      }
    } catch (e) {
      console.error('[watcherAgent] Telegram xabarda xato:', e.message);
    }
  }

  // Pro Agent → Ishlarim integratsiyasi
  if (user?._id || user?.id) {
    saveAlertsToCase(user._id || user.id, alerts, agentName).catch(() => {});
  }

  // Email
  if (sub.notifyChannel === 'email' && user?.email) {
    await sendGenericEmail(user.email, `${agentName} — Yurist AI Pro`, text);
  }

  // SMS (qisqartirilgan)
  if (sub.notifyChannel === 'sms' && user?.phone) {
    const shortText = `Yurist AI Pro (${agentName}): ${important.length} ta ogohlantirish. Panelni oching.`;
    await sendGenericSMS(user.phone, shortText);
  }
}

module.exports = { runWatcherAgent, sendNotifications, _checkContractDeadlines: checkContractDeadlines, _checkCourtRegistry: checkCourtRegistry };
