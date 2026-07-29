'use strict';
// routes/clauseAnalysis.js -- Harvey AI darajasi
// Hujjatni har bir band (clause) ni alohida tahlil qiladi:
//   - Band matni
//   - Risk darajasi (low/medium/high/critical)
//   - Muammo tavsifi
//   - Muqobil variant (tavsiya)
// Bu oddiy Risk Engine dan farqi: u UMUMIY baho beradi,
// bu esa HAR BIR BAND uchun alohida tahlil va muqobil matn beradi.
const express = require('express');
const rateLimit = require('express-rate-limit');
const { requireAuth } = require('./auth');
const { logActivity } = require('../activityLog');
const router = express.Router();

const clauseLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, max: 10,
  message: { error: "5 daqiqada 10 ta tahlildan oshib ketdingiz." },
  standardHeaders: true, legacyHeaders: false,
});

const LANG_NAMES = {
  uz:"o'zbek",ru:'rus',en:'ingliz',kk:'qozoq',ky:"qirg'iz",tg:'tojik',tk:'turkman',az:'ozarbayjon',
};

function buildClausePrompt(lang) {
  const ln = LANG_NAMES[lang] || "o'zbek";
  return [
    'Sen yuridik hujjat tahlilchisisan. Berilgan hujjatni har bir band bo\'yicha tahlil qil.',
    '',
    'TIL: Barcha javoblar FAQAT ' + ln.toUpperCase() + ' tilida.',
    '',
    'TOPSHIRIQ: Hujjatdagi har bir muhim bandni topib, quyidagi JSON formatida qaytarish:',
    '',
    '{',
    '  "summary": "Hujjat haqida 1-2 jumlali umumiy baho",',
    '  "overallRisk": "low|medium|high|critical",',
    '  "clauses": [',
    '    {',
    '      "id": 1,',
    '      "title": "Band nomi/raqami",',
    '      "originalText": "Original band matni (qisqartirilgan, max 200 belgi)",',
    '      "risk": "low|medium|high|critical",',
    '      "issue": "Bu bandda nima muammo bor (yo\'q bo\'lsa null)",',
    '      "suggestion": "Muqobil yoki yaxshilangan variant (yo\'q bo\'lsa null)",',
    '      "missing": "Bu turdagi hujjatda bo\'lishi kerak bo\'lgan, lekin yo\'q narsa (yo\'q bo\'lsa null)"',
    '    }',
    '  ],',
    '  "missingClauses": ["Bo\'lishi kerak bo\'lgan band 1", "Band 2"],',
    '  "positives": ["Hujjatdagi yaxshi tomonlar"]',
    '}',
    '',
    'MUHIM: Faqat JSON qaytarish kerak, boshqa matn yo\'q.',
  ].join('\n');
}

// POST /api/clause-analysis/analyze
// { text: "hujjat matni", lang: "uz" }
router.post('/analyze', requireAuth, clauseLimiter, async (req, res) => {
  const { text, lang = 'uz' } = req.body;
  if (!text || text.trim().length < 100) {
    return res.status(400).json({ error: "Hujjat matni juda qisqa (kamida 100 belgi)" });
  }

  const user = req.user;
  if (user.credits < 2) return res.status(402).json({ error: 'Kredit yetarli emas', code: 'NO_CREDITS' });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: "OPENAI_API_KEY sozlanmagan" });

  try {
    // Matnni 8000 belgiga cheklaymiz
    const truncated = text.slice(0, 8000);
    const prompt = buildClausePrompt(lang);

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: 'Quyidagi hujjatni band-band tahlil qil:\n\n' + truncated },
        ],
        max_tokens: 4000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!resp.ok) throw new Error('OpenAI ' + resp.status);
    const data = await resp.json();
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) throw new Error("AI bo'sh javob qaytardi");

    let analysis;
    try {
      analysis = JSON.parse(raw);
    } catch {
      throw new Error("AI JSON formatini buzdi");
    }

    // Kredit yechish
    const { adjustCredits } = require('./users');
    await adjustCredits(user.id, -2);

    logActivity({
      type: 'clause_analysis',
      userId: user.id,
      meta: { lang, clauses: (analysis.clauses || []).length, risk: analysis.overallRisk },
    });

    res.json({
      ...analysis,
      creditsLeft: Math.max(0, user.credits - 2),
      analyzedChars: truncated.length,
      truncated: text.length > 8000,
    });

  } catch (e) {
    console.error('[clause-analysis]', e.message);
    res.status(500).json({ error: "Band tahlilida xato yuz berdi: " + e.message });
  }
});

module.exports = router;
