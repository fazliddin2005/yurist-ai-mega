// routes/tts.js -- Matnni ovozga aylantirish (OpenAI TTS)
// Timeout: 10 sekund -- agar OpenAI javob bermasa xato qaytaradi

const express = require('express');
const rateLimit = require('express-rate-limit');

// TTS -- OpenAI TTS qimmat, 1 daqiqada max 10 ta
const ttsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,

  message: { error: "TTS limitiga yetdingiz. Bir daqiqada 10 ta so'rov mumkin." },
  standardHeaders: true,
  legacyHeaders: false,
});
const { requireAuth } = require('./auth');
const router = express.Router();

router.post('/', requireAuth, ttsLimiter, async (req, res) => {
  try {
    const { text, lang } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Matn bo\'sh' });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'TTS sozlanmagan', code: 'NO_API_KEY' });
    }

    // Matn tozalash va cheklash (2000 belgi)
    const cleanText = text
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 2000);

    // Ovoz tanlash
    // Til bo'yicha optimal ovoz tanlash (OpenAI TTS ovozlari)
  // alloy=neytral, echo=erkak, fable=brit, nova=ayol(yaxshi), onyx=past erkak, shimmer=yumshoq
  const VOICE_BY_LANG = {
    uz: 'nova',    // O'zbek -- nova natural eshitiladi
    ru: 'nova',    // Rus -- nova yaxshi
    en: 'alloy',   // Ingliz -- alloy standard
    kk: 'nova',    // Qozoq
    ky: 'nova',    // Qirg'iz
    tg: 'nova',    // Tojik
    tk: 'nova',    // Turkman
    az: 'nova',    // Ozarbayjon
  };
  const voice = VOICE_BY_LANG[lang] || 'nova';

    // 10 sekund timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    let response;
    try {
      response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tts-1-hd',
          input: cleanText,
          voice: voice,
          response_format: 'mp3',
          speed: 0.95,
        }),
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error('[tts] OpenAI xato:', response.status, err?.error?.message || '');
      return res.status(502).json({ error: 'TTS xizmati javob bermadi' });
    }

    // Audio stream yuborish
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=3600');

    const arrayBuffer = await response.arrayBuffer();
    res.end(Buffer.from(arrayBuffer));

  } catch (e) {
    if (e.name === 'AbortError') {
      console.log('[tts] Timeout -- 10 sekund oshdi');
      return res.status(504).json({ error: 'TTS javob berish vaqti tugadi' });
    }
    console.error('[tts] Xato:', e.message);
    res.status(500).json({ error: 'TTS xizmatida xato' });
  }
});

module.exports = router;
