// server/index.js -- Yurist AI backend kirish nuqtasi.
//
// VERCEL / SERVERLESS UCHUN MUHIM: bu fayl ikki xil muhitda ishlaydi:
//   1) Mahalliy kompyuter (localhost) -- `node server/index.js` orqali,
//      `app.listen()` chaqiriladi, doimiy server sifatida ishlaydi.
//   2) Vercel (serverless) -- har bir HTTP so'rov uchun alohida funksiya
//      chaqiriladi, `app.listen()` ISHLATILMAYDI. Buning o'rniga Express
//      ilovasi to'g'ridan-to'g'ri eksport qilinadi (`module.exports = app`),
//      Vercel uni o'zi so'rov-javob (request-response) sifatida ishlatadi.
//
// Ikkisini ham qo'llab-quvvatlash uchun: agar VERCEL muhit o'zgaruvchisi
// mavjud bo'lsa (Vercel buni avtomatik o'rnatadi), `app.listen()` chaqirilmaydi.
require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const { connectDB } = require('./models/connection');

const usersRouter = require('./routes/users');
const documentsRouter = require('./routes/documents');
const riskRouter = require('./routes/risk');
const chatRouter = require('./routes/chat');
const catalogRouter = require('./routes/catalog');
const conversationsRouter = require('./routes/conversations');
const casesRouter = require('./routes/cases');
const socialAuthRouter = require('./routes/socialAuth'); // Google va Apple login
const authRouter = require('./routes/auth');
const promoRouter = require('./routes/promo');
const docgenRouter = require('./routes/docgen');
const proRouter = require('./routes/pro'); // Yurist AI Pro tarifi
const ttsRouter = require('./routes/tts'); // Matnni ovozga aylantirish

// ---- B2B "Yuridik Departament" moduli (B2C'dan butunlay mustaqil) ----
const b2bWorkspacesRouter = require('./b2b/routes/workspaces');
const b2bTemplatesRouter = require('./b2b/routes/templates');
const b2bAuditRouter = require('./b2b/routes/audit');
const b2bDashboardRouter = require('./b2b/routes/dashboard');
const b2bDocumentsRouter = require('./b2b/routes/documents');
const b2bChatRouter = require('./b2b/routes/chat');
const b2bConversationsRouter = require('./b2b/routes/conversations');
const b2bApiKeysRouter = require('./b2b/routes/apiKeys');
const b2bExternalRouter = require('./b2b/routes/external');
const adminRouter = require('./admin/routes');

const app = express();
const PORT = process.env.PORT || 3000;

// ---- XAVFSIZLIK SARLAVHALARI (helmet) ----
// Brauzer darajasidagi standart himoya: clickjacking (X-Frame-Options),
// MIME-sniffing (X-Content-Type-Options), va boshqa odatiy hujum
// turlariga qarshi sarlavhalar. contentSecurityPolicy o'chirilgan, chunki
// bu loyiha tashqi CDN'lardan (masalan rasm, shrift) foydalanadi va
// qattiq CSP ularni bloklab qo'yishi mumkin -- buni alohida sozlash kerak.
const helmet = require('helmet');
app.use(helmet({ contentSecurityPolicy: false }));

// ---- CORS ----
// Standart holatda OCHIQ (hozirgi xavfsizlik darajasini saqlab qolish
// uchun) -- lekin agar ALLOWED_ORIGINS muhit o'zgaruvchisi sozlangan
// bo'lsa (vergul bilan ajratilgan domenlar ro'yxati, masalan
// "https://yurist-ai-business.vercel.app,https://yurist-business-suite.vercel.app"),
// faqat shu domenlardan so'rovlarga ruxsat beriladi. Buni sozlash
// IXTIYORIY -- sozlanmasa, hech narsa buzilmaydi.
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : null;
app.use(cors(allowedOrigins ? { origin: allowedOrigins } : {}));

app.use(express.json({ limit: '5mb' }));

// Health check -- MongoDB ulanishidan MUSTAQIL ishlaydi (server "tirikligini"
// tekshirish uchun, baza holatidan qaramasdan). Shuning uchun bu pastdagi
// MongoDB ulanish middleware'idan OLDIN joylashtirilgan.
app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));
app.get('/api/health/keys', (req, res) => {
  res.json({
    openai: !!process.env.OPENAI_API_KEY,
    nia: !!process.env.NIA_API_KEY,
    mongodb: !!process.env.MONGODB_URI,
  });
});

// ---- MONGODB ULANISHI -- har bir API so'rovidan oldin ----
// Serverless muhitda (Vercel) har bir funksiya chaqiruvi yangi, "sovuq"
// boshlanishi mumkin -- shuning uchun ulanishni har bir so'rov oldidan
// ta'minlaymiz (agar allaqachon ulangan bo'lsa, connectDB() darhol qaytadi,
// qayta ulanmaydi -- qarang: models/connection.js keshlash mexanizmi).
app.use('/api', async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (e) {
    console.error('[server] MongoDB ulanishida xato:', e.message);
    res.status(500).json({
      error: "Ma'lumotlar bazasiga ulanishda xato. MONGODB_URI to'g'ri sozlanganini tekshiring.",
    });
  }
});

// ---- HISOBNI O'CHIRISH -- MUDDATI O'TGAN SO'ROVLARNI AVTOMATIK TOZALASH ----
// VERCEL UCHUN MUHIM: bu yerda an'anaviy "cron job" ishlatilmaydi, chunki
// serverless muhitda doimiy fon jarayoni yo'q. Buning o'rniga: har bir API
// so'rovida (lekin ko'pi bilan SOATIGA BIR MARTA) fonda tekshiruv ishga
// tushadi -- foydalanuvchi so'rovini SEKINLASHTIRMAYDI (await qilinmaydi),
// shunchaki "platforma faol bo'lganda" muddati o'tgan hisoblarni topib
// tozalaydi. Mahalliy serverda (Vercel emas) bu baribir ishlaydi, chunki
// u ham har bir so'rovda chaqiriladi.
const PURGE_CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 soat
let lastPurgeCheckAt = 0;
app.use('/api', (req, res, next) => {
  const now = Date.now();
  if (now - lastPurgeCheckAt > PURGE_CHECK_INTERVAL_MS) {
    lastPurgeCheckAt = now;
    const { runScheduledPurge } = require('./accountDeletion');
    runScheduledPurge().catch((e) => console.error('[server] Rejalashtirilgan tozalashda xato:', e.message));
  }
  next();
});

// ---- YURIST AI PRO -- AGENTLARNING KUNLIK AVTOMATIK ISHGA TUSHISHI ----
// VERCEL UCHUN MUHIM: serverless muhitda cron yo'q -- yuqoridagi purge
// mexanizmi kabi, har bir API so'rovda (lekin ko'pi bilan 6 SOATDA BIR)
// fonda barcha faol Pro obunachilarning agentlari ishga tushiriladi.
// Har bir foydalanuvchi uchun oxirgi ishga tushish 20+ soat oldin bo'lsagina
// qayta ishlaydi (kuniga ~1 marta). await qilinmaydi -- so'rovni sekinlashtirmaydi.
const AGENT_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 soat
const AGENT_MIN_GAP_MS = 20 * 60 * 60 * 1000; // foydalanuvchi uchun min 20 soat oraliq
let lastAgentCheckAt = 0;
app.use('/api', (req, res, next) => {
  const now = Date.now();
  if (now - lastAgentCheckAt > AGENT_CHECK_INTERVAL_MS) {
    lastAgentCheckAt = now;
    (async () => {
      try {
        const ProSubscription = require('./models/ProSubscription');
        const WatchProfile = require('./models/WatchProfile');
        const { runWatcherAgent } = require('./services/watcherAgent');
        const { runHealthAgent } = require('./services/proHealthAgent');

        const activeSubs = await ProSubscription.find({
          status: 'active',
          expiresAt: { $gt: new Date() },
        }).limit(200).lean(); // xavfsizlik: bitta siklda maks 200 obunachi

        for (const sub of activeSubs) {
          const profile = await WatchProfile.findOne({ userId: sub.userId })
            .select('lastWatcherRunAt lastHealthRunAt businessName').lean();
          if (!profile || !profile.businessName) continue; // profil to'ldirilmagan

          const lastRun = Math.max(
            profile.lastWatcherRunAt ? new Date(profile.lastWatcherRunAt).getTime() : 0,
            profile.lastHealthRunAt ? new Date(profile.lastHealthRunAt).getTime() : 0
          );
          if (Date.now() - lastRun < AGENT_MIN_GAP_MS) continue; // bugun ishlagan

          // Ketma-ket ishga tushirish (parallel emas -- DB/API yukini tejash)
          await runWatcherAgent(sub.userId).catch((e) =>
            console.error('[server] Kunlik watcher xatosi:', e.message));
          await runHealthAgent(sub.userId).catch((e) =>
            console.error('[server] Kunlik health xatosi:', e.message));
        }
      } catch (e) {
        console.error('[server] Kunlik agent siklida xato:', e.message);
      }
    })();
  }
  next();
});

// Statik frontend (public/ ichidagi index.html va boshqalar)
app.use(express.static(path.join(__dirname, '..', 'public')));

// API marshrutlari
app.use('/api/auth', authRouter);
app.use('/api/auth', socialAuthRouter); // Google va Apple login
app.use('/api/users', usersRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/risk', riskRouter);
app.use('/api/chat', chatRouter);
app.use('/api/tts', ttsRouter);
app.use('/api/catalog', catalogRouter);
app.use('/api/conversations', conversationsRouter);
app.use('/api/cases', casesRouter);
app.use('/api/promo', promoRouter);
app.use('/api/docgen', docgenRouter);
app.use('/api/pro', proRouter); // Yurist AI Pro -- Kuzatuvchi + Biznes Salomatligi agentlari

// B2B "Yuridik Departament" moduli -- B2C foydalanuvchi ma'lumotlariga
// HECH QANDAY ulanish yo'q, faqat umumiy auth (JWT) orqali bog'lanadi.
app.use('/api/b2b/workspaces', b2bWorkspacesRouter);
app.use('/api/b2b/templates', b2bTemplatesRouter);
app.use('/api/b2b/audit', b2bAuditRouter);
app.use('/api/b2b/dashboard', b2bDashboardRouter);
app.use('/api/b2b/documents', b2bDocumentsRouter);
app.use('/api/b2b/chat', b2bChatRouter);
app.use('/api/b2b/conversations', b2bConversationsRouter);
app.use('/api/b2b/api-keys', b2bApiKeysRouter);
app.use('/api/b2b/external', b2bExternalRouter);
app.use('/api/admin', adminRouter);

// B2B "Yuridik Departament" interfeysi -- B2C'dan butunlay alohida sahifa.
// /b2b/invite/:token kabi ichki yo'llar ham shu yerga tushadi -- b2b.js
// brauzer tomonida URL'ni o'qib, taklif oynasini avtomatik ochadi.
app.get(['/b2b', '/b2b/*'], (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'b2b.html'));
});

// Super Admin paneli -- platforma egasi uchun, B2C/B2B'dan butunlay alohida.
// Sahifaning o'zi ochiq, lekin ichidagi API so'rovlari ADMIN_PASSWORD orqali
// himoyalangan (qarang: server/admin/auth.js) -- shuning uchun sahifani
// ko'rish hali hech narsani oshkor qilmaydi, faqat parol kiritish formasi.
app.get(['/admin', '/admin/*'], (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin.html'));
});

// Yurist AI Pro paneli -- Kuzatuvchi + Biznes Salomatligi agentlari sahifasi
app.get(['/pro', '/pro/*'], (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'pro.html'));
});

// SPA fallback -- boshqa barcha yo'llar uchun index.html (B2C) qaytariladi
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  if (req.path.startsWith('/b2b')) return next();
  if (req.path.startsWith('/admin')) return next();
  if (req.path.startsWith('/pro')) return next();
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Xatolarni yagona joyda ushlash
app.use((err, req, res, next) => {
  console.error('[server xatosi]', err);
  res.status(500).json({ error: 'Serverda kutilmagan xato yuz berdi' });
});

// Faqat mahalliy ishga tushirishda app.listen() chaqiramiz. Vercel buni
// avtomatik VERCEL=1 muhit o'zgaruvchisi orqali bildiradi -- u holatda
// app shunchaki eksport qilinadi (pastdagi module.exports), Vercel platforma
// o'zi so'rov-javobni boshqaradi.
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Yurist AI backend ${PORT}-portda ishga tushdi: http://localhost:${PORT}`);
    const ok = '✅ topildi';
    const no = '❌ TOPILMADI';
    const show = (val, n=8) => val ? ok+' ('+val.slice(0,n)+'...)' : no;

    console.log('');
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║         KALITLAR HOLATI (.env)               ║');
    console.log('╠══════════════════════════════════════════════╣');
    // Majburiy kalitlar
    console.log('║ MAJBURIY KALITLAR:                           ║');
    console.log(`║ MONGODB_URI       : ${process.env.MONGODB_URI ? '✅ ulangan              ' : '❌ TOPILMADI (server ishlamaydi!)'}║`);
    console.log(`║ JWT_SECRET        : ${process.env.JWT_SECRET ? '✅ ulangan              ' : '⚠️  vaqtinchalik (har restart)  '}║`);
    console.log('║                                              ║');
    // AI kalitlari
    console.log('║ AI KALITLARI:                                ║');
    console.log(`║ OPENAI_API_KEY    : ${process.env.OPENAI_API_KEY ? '✅ '+process.env.OPENAI_API_KEY.slice(0,10)+'...         ' : '❌ yo\'q (AI ishlamaydi)         '}║`);
    console.log(`║ ANTHROPIC_API_KEY : ${process.env.ANTHROPIC_API_KEY ? '✅ '+process.env.ANTHROPIC_API_KEY.slice(0,10)+'...         ' : '❌ yo\'q (Claude ishlamaydi)     '}║`);
    console.log(`║ NIA_API_KEY       : ${process.env.NIA_API_KEY ? '✅ '+process.env.NIA_API_KEY.slice(0,10)+'...         ' : '❌ yo\'q (lex.uz RAG ishlamaydi) '}║`);
    console.log('║                                              ║');
    // Ijtimoiy login
    console.log('║ IJTIMOIY LOGIN:                              ║');
    console.log(`║ GOOGLE_CLIENT_ID  : ${process.env.GOOGLE_CLIENT_ID ? '✅ '+process.env.GOOGLE_CLIENT_ID.slice(0,12)+'...       ' : '❌ yo\'q (Google login o\'chiq)   '}║`);
    console.log(`║ APPLE_CLIENT_ID   : ${process.env.APPLE_CLIENT_ID ? '✅ '+process.env.APPLE_CLIENT_ID.slice(0,12)+'...       ' : '❌ yo\'q (Apple login o\'chiq)    '}║`);
    console.log('║                                              ║');
    console.log('║ EMAIL YUBORISH:                              ║');
    console.log(`║ GMAIL_USER        : ${process.env.GMAIL_USER ? '✅ '+process.env.GMAIL_USER.slice(0,20)+'  ' : '❌ yo’q (email kod yuborilmaydi)  '}║`);
    console.log(`║ GMAIL_APP_PASSWORD: ${process.env.GMAIL_APP_PASSWORD ? '✅ o’rnatilgan (16 xonali)       ' : '❌ yo’q (Gmail App Password kerak) '}║`);
    console.log(`║ SMTP_HOST         : ${process.env.SMTP_HOST ? '✅ '+process.env.SMTP_HOST.slice(0,20)+'  ' : '⬜ Gmail bo’lsa SMTP shart emas  '}║`);
    console.log('║                                              ║');
    // To'lov
    console.log('║ TO’LOV TIZIMI:                               ║');
    console.log(`║ PAYME_MERCHANT_ID : ${process.env.PAYME_MERCHANT_ID ? '✅ '+process.env.PAYME_MERCHANT_ID.slice(0,8)+'...           ' : '❌ yo\'q (Payme o\'chiq)          '}║`);
    console.log(`║ CLICK_MERCHANT_ID : ${process.env.CLICK_MERCHANT_ID ? '✅ '+process.env.CLICK_MERCHANT_ID.slice(0,8)+'...           ' : '❌ yo\'q (Click o\'chiq)          '}║`);
    console.log('║                                              ║');
    // Telegram
    console.log('║ TELEGRAM:                                    ║');
    console.log(`║ TELEGRAM_BOT_TOKEN: ${process.env.TELEGRAM_BOT_TOKEN ? '✅ '+process.env.TELEGRAM_BOT_TOKEN.slice(0,10)+'...         ' : '❌ yo\'q (Telegram xabar yo\'q)   '}║`);
    console.log('║                                              ║');
    // Admin
    console.log('║ ADMIN:                                       ║');
    console.log(`║ ADMIN_PASSWORD    : ${process.env.ADMIN_PASSWORD ? '✅ o\'rnatilgan              ' : '❌ yo\'q                          '}║`);
    console.log(`║ ADMIN_JWT_SECRET  : ${process.env.ADMIN_JWT_SECRET ? '✅ o\'rnatilgan              ' : '⚠️  vaqtinchalik                  '}║`);
    console.log('║                                              ║');
    // Claude model
    console.log('║ MODEL SOZLAMALARI:                           ║');
    console.log(`║ CLAUDE_AUDIT_MODEL: ${(process.env.CLAUDE_AUDIT_MODEL||'claude-sonnet-4-6 (default)').slice(0,24)+'  '}║`);
    console.log('╚══════════════════════════════════════════════╝');
    console.log('');
  });
}

module.exports = app;
