'use strict';
// routes/docgen.js -- Harvey AI darajasi: streaming + 16000 token + ko'p hujjat turi
const express = require('express');
const { requireAuth } = require('./auth');
const users = require('./users');
const { logActivity } = require('../activityLog');
const router = express.Router();
const CREDIT_COST_STREAM = 2;

const LANG_NAMES = {
  uz:"o'zbek",ru:'rus',en:'ingliz',kk:'qozoq',ky:"qirg'iz",tg:'tojik',tk:'turkman',az:'ozarbayjon',
};

const DOC_TYPES = {
  contract:   "TO'LIQ band-bandli shartnoma. Sarlavha, tomonlar, predmet, narx, muddat, huquqlar, javobgarlik, bekor qilish, imzolar.",
  employment: "Mehnat shartnomasi. Lavozim, ish haqi, ish vaqti, ta'til, majburiyatlar, disciplina, fesox tartibi.",
  lease:      "Ijara shartnomasi. Tomonlar, mulk tavsifi, ijara haqi, muddat, ta'mirlash, bekor qilish, imzolar.",
  nda:        "Maxfiylik shartnomasi (NDA). Tomonlar, maxfiy ma'lumot ta'rifi, majburiyatlar, muddat, javobgarlik, istisnolar.",
  service:    "Xizmat ko'rsatish shartnomasi. Xizmat turi, hajmi, sifat, to'lov, muddatlar, javobgarlik.",
  letter:     "Rasmiy huquqiy xat. Sarlavha, manzil, sana, asosiy matn, xulosa, imzo joyi.",
  memo:       "Huquqiy memorandum. Muammo - Qonuniy asos - Tahlil - Xulosa - Tavsiya.",
};

function buildPrompt(lang, docType) {
  const ln = LANG_NAMES[lang] || "o'zbek";
  return 'Sen "Yurist AI" -- yuridik hujjat tuzish mutaxassisi.\n\nTIL: FAQAT ' + ln.toUpperCase() + ' TILIDA.\n\n' +
    (DOC_TYPES[docType] || DOC_TYPES.contract) +
    '\n\nQOIDALAR: har band raqamlangan (1., 1.1.), bo\'sh joy "________________", sana "[SANA]", faqat hujjat matni, markdown yo\'q.';
}

// POST /api/docgen/generate -- oddiy, 4000 token
router.post('/generate', requireAuth, async (req, res) => {
  const { description, lang, docType = 'contract' } = req.body;
  if (!description?.trim()) return res.status(400).json({ error: "Hujjat tasvirini kiriting" });
  const user = req.user;
  if (user.credits < 1) return res.status(402).json({ error: 'Kredit yetarli emas', code: 'NO_CREDITS' });
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: "OPENAI_API_KEY sozlanmagan", code: 'AI_NOT_CONFIGURED' });
  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: buildPrompt(lang, docType) }, { role: 'user', content: description }],
        max_tokens: 4000,
      }),
    });
    if (!resp.ok) throw new Error('OpenAI ' + resp.status);
    const data = await resp.json();
    const generatedText = data.choices?.[0]?.message?.content;
    if (!generatedText) throw new Error("AI bo'sh javob qaytardi");
    await users.adjustCredits(user.id, -1);
    const title = (generatedText.split('\n').find(l => l.trim()) || 'Hujjat').trim().slice(0, 80);
    res.json({ title, generatedText, creditsLeft: Math.max(0, user.credits - 1) });
  } catch (e) {
    console.error('[docgen]', e.message);
    res.status(500).json({ error: "Hujjat yaratishda xato yuz berdi" });
  }
});

// POST /api/docgen/stream -- Harvey AI usuli: SSE, gpt-4o, 16000 token
router.post('/stream', requireAuth, async (req, res) => {
  const { description, lang, docType = 'contract' } = req.body;
  if (!description?.trim()) return res.status(400).json({ error: "Hujjat tasvirini kiriting" });
  const user = req.user;
  if (user.credits < CREDIT_COST_STREAM) return res.status(402).json({ error: 'Kredit yetarli emas', code: 'NO_CREDITS' });
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: "OPENAI_API_KEY sozlanmagan" });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const send = (type, data) => res.write('event: ' + type + '\ndata: ' + JSON.stringify(data) + '\n\n');

  try {
    send('start', { docType, lang, timestamp: Date.now() });
    const openaiResp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'system', content: buildPrompt(lang, docType) }, { role: 'user', content: description }],
        max_tokens: 16000,
        stream: true,
      }),
    });

    if (!openaiResp.ok) {
      const err = await openaiResp.text().catch(() => '');
      send('error', { message: 'OpenAI ' + openaiResp.status + ': ' + err.slice(0, 200) });
      return res.end();
    }

    let fullText = '';
    const decoder = new TextDecoder();
    for await (const chunk of openaiResp.body) {
      const text = decoder.decode(chunk, { stream: true });
      for (const line of text.split('\n')) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (raw === '[DONE]') continue;
        try {
          const delta = JSON.parse(raw).choices?.[0]?.delta?.content || '';
          if (delta) { fullText += delta; send('chunk', { text: delta }); }
        } catch { /* incomplete JSON */ }
      }
    }

    await users.adjustCredits(user.id, -CREDIT_COST_STREAM);
    logActivity({ type: 'doc_generated_long', userId: user.id, meta: { docType, lang, chars: fullText.length } });
    const title = (fullText.split('\n').find(l => l.trim()) || 'Hujjat').trim().slice(0, 80);
    send('done', { title, totalChars: fullText.length, creditsLeft: Math.max(0, user.credits - CREDIT_COST_STREAM) });
    res.end();
  } catch (e) {
    console.error('[docgen/stream]', e.message);
    send('error', { message: e.message });
    res.end();
  }
});

// GET /api/docgen/types -- hujjat turlari ro'yxati
router.get('/types', (req, res) => {
  res.json({ types: [
    { key: 'contract',   label: "Umumiy shartnoma",             icon: '📄', credits: 1 },
    { key: 'employment', label: "Mehnat shartnomasi",            icon: '🤝', credits: 1 },
    { key: 'lease',      label: "Ijara shartnomasi",             icon: '🏠', credits: 1 },
    { key: 'nda',        label: "Maxfiylik (NDA)",               icon: '🔒', credits: 1 },
    { key: 'service',    label: "Xizmat shartnomasi",            icon: '⚙️', credits: 1 },
    { key: 'letter',     label: "Huquqiy xat",                   icon: '✉️', credits: 1 },
    { key: 'memo',       label: "Huquqiy memorandum",            icon: '📋', credits: 1 },
    { key: 'contract',   label: "Katta shartnoma (AI stream)",   icon: '📜', credits: 2, stream: true },
  ]});
});

module.exports = router;
