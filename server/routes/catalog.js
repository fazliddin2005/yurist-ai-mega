// routes/catalog.js
const express = require('express');
const { LAWYERS, TEMPLATES } = require('../seed');
const { LEGAL_DB, JURIS_ORDER } = require('../legalData');
const { searchForJurisdiction, isConfigured: niaConfigured } = require('../nia');
const uzLaborCode = require('../legal-content/uz/laborCode');
const uzCivilCode = require('../legal-content/uz/civilCode');
const uzCivilCode2 = require('../legal-content/uz/civilCode_part2');
const uzTaxCode = require('../legal-content/uz/taxCode');
const uzCrimCode = require('../legal-content/uz/crimCode');
const uzFamilyCode = require('../legal-content/uz/familyCode');
const uzAdminCode = require('../legal-content/uz/adminCode');
const uzLandCode = require('../legal-content/uz/landCode');
const uzCivilProcCode = require('../legal-content/uz/civilProcCode');
const uzConstitution = require('../legal-content/uz/constitution');
const uzCategories = require('../legal-content/uz/categories');
const ArticleCache = require('../models/ArticleCache');

const router = express.Router();

// ─────────────────────────────────────────────
// MODDA KESHI -- MongoDB'da saqlanadi (server qayta ishga tushsa ham
// yo'qolmaydi), til bo'yicha alohida kalit (`_uz`, `_ru`, ...), va TTL
// index orqali muddati o'tgan yozuvlar avtomatik o'chadi (qarang:
// models/ArticleCache.js) -- shuning uchun hajmi cheksiz o'smaydi.
// ─────────────────────────────────────────────
function buildCacheKey(jurisdiction, lawKey, articleNo, lang) {
  return `${jurisdiction}_${lawKey}_${articleNo}_${lang}`;
}

async function getCachedArticle(cacheKey) {
  try {
    const doc = await ArticleCache.findOne({ cacheKey }).lean();
    return doc ? doc.data : null;
  } catch (e) {
    // Kesh o'qishda xato bo'lsa ham ilova ishlashda davom etsin -- shunchaki
    // qayta generatsiya qilinadi, foydalanuvchi javobsiz qolmaydi.
    console.error('[article-cache] o\'qishda xato:', e.message);
    return null;
  }
}

async function setCachedArticle(cacheKey, jurisdiction, lawKey, articleNo, lang, data, ttlMs) {
  try {
    await ArticleCache.findOneAndUpdate(
      { cacheKey },
      { cacheKey, jurisdiction, lawKey, articleNo, lang, data, expiresAt: new Date(Date.now() + ttlMs) },
      { upsert: true }
    );
  } catch (e) {
    console.error('[article-cache] yozishda xato:', e.message);
  }
}

const DETAILED_TOC = {
  UZ_const: uzConstitution,
  UZ_labor: uzLaborCode,
  UZ_civil: uzCivilCode,
  UZ_civil2: uzCivilCode2,
  UZ_tax: uzTaxCode,
  UZ_crim: uzCrimCode,
  UZ_family: uzFamilyCode,
  UZ_admin: uzAdminCode,
  UZ_land: uzLandCode,
  UZ_civilproc: uzCivilProcCode,
};

const FULLY_INDEXED_JURISDICTIONS = ['UZ', 'RU', 'TJ', 'US'];

const SUBTOPICS_BY_LAW_KEY = {
  const: ['asosiy qoidalar va davlat tuzilishi', 'fuqarolarning huquq va erkinliklari', 'davlat hokimiyati organlari', 'fuqarolarning asosiy majburiyatlari'],
  civil: ['umumiy qoidalar va fuqarolik huquq subyektlari', 'yuridik shaxslarni tashkil etish va tugatish', 'mulk huquqi va boshqa ashyoviy huquqlar', 'shartnoma tuzish va bekor qilish qoidalari', 'majburiyatlarni bajarish va ta\'minlash usullari', 'oldi-sotdi, ijara, pudrat shartnomalari', 'fuqaroviy javobgarlik va zarar to\'lash', 'meros huquqi'],
  crim: ['jinoyat tarkibi va javobgarlik asoslari', 'jazo turlari va ularni tayinlash', 'jinoyatlarning asosiy turlari', 'jinoiy javobgarlikdan ozod qilish'],
  labor: ['mehnat shartnomasi tuzish va bekor qilish', 'ish vaqti va dam olish vaqti', 'ish haqi va mehnat muhofazasi', 'mehnat nizolarini hal qilish'],
  tax: ['soliq turlari va stavkalari', 'soliq deklaratsiyasi va to\'lash muddatlari', 'soliq imtiyozlari', 'soliq javobgarligi'],
  family: ['nikoh tuzish va bekor qilish', 'er-xotinning huquq va majburiyatlari', 'farzandlarni tarbiyalash va alimentlar', 'vasiylik va homiylik'],
  admin: ['ma\'muriy huquqbuzarlik tarkibi', 'ma\'muriy jazo turlari', 'ma\'muriy javobgarlikka tortish tartibi', 'ma\'muriy nazorat organlari'],
  land: ['yer egaligi va foydalanish huquqi', 'yer uchastkasini ajratish tartibi', 'yer monitoringi va muhofazasi', 'yer nizolarini hal qilish'],
};

// Noto'g'ri kontent belgilari
const BAD_PATTERNS = [
  /SKILL\.md/i, /Output format/i, /Amendment History/i,
  /\[Counterparty\]/i, /\[Provision\]/i, /\[date of first\]/i,
  /\[Agreement type\]/i, /claude-for-legal/i, /commercial-legal/i,
  /anthropics\//i, /gfw\.report/i, /obsidian\.md/i,
  /## What changed/i, /Net current state/i, /Watch items/i,
  /ASCII Characters Exemption/i, /usenixsecurity/i, /```markdown/i,
];

const TRUSTED_LAW_DOMAINS = /lex\.uz|nrm\.uz|adlia\.uz|parliament\.uz|norma\.uz|zakon\.uz|sud\.uz|gov\.uz|minjust\.uz/i;
const LEGAL_WORDS = /modda|kodeks|qonun|huquq|majburiyat|shartnoma|xodim|soliq|fuqaro|tashkilot|sud|jarima|muddati|tartib/i;

// AI modelning "men bunday matnni bera olmayman" tarzidagi rad javoblarini
// aniqlash uchun -- bunday javob hech qachon foydalanuvchiga ko'rsatilmasligi
// va keshlanmasligi kerak (ilgari shu narsa tekshirilmasdi, shuning uchun
// ba'zi moddalarda doimiy ravishda rad javobi ko'rsatilib turardi).
const REFUSAL_PATTERNS = [
  /kechirasiz,?\s*(lekin|biroq)?\s*men/i, /taqdim eta olmayman/i, /bera olmayman/i,
  /aniq nusxa(sini|lar)?\s*(ni)?\s*(taqdim|bera)/i, /mumkin emas/i,
  /i (cannot|can'?t|am not able to|apologi[sz]e)/i, /i'?m sorry/i,
  /as an ai/i, /i don'?t have access/i, /извините/i, /не могу предоставить/i,
];
function isRefusal(text) {
  return REFUSAL_PATTERNS.some(p => p.test(text));
}

function isBadContent(text) {
  return BAD_PATTERNS.some(p => p.test(text));
}
function isGoodContent(text) {
  return !isBadContent(text) && LEGAL_WORDS.test(text);
}

// Tillar bo'yicha prompt sozlamalari
// MUHIM: bu kodlar frontend (public/index.html, public/i18n.js)dagi curLang
// qiymatlari bilan ANIQ mos kelishi shart -- ilgari 'kg'/'tj' ishlatilgan
// edi, lekin frontend 'ky' (qirg'iz) va 'tg' (tojik) ishlatadi, shuning
// uchun bu ikki til va ozarbayjon tili (az) uchun modda matni generatsiyasi
// har doim sukut bo'yicha o'zbekchaga tushib qolardi -- endi tuzatildi.
const LANG_CFG = {
  uz: { instruction: "O'zbek tilida, rasmiy yuridik uslubda yoz", start: (n) => `${n}-modda.` },
  ru: { instruction: "На русском языке, в официальном юридическом стиле", start: (n) => `Статья ${n}.` },
  en: { instruction: "In English, in formal legal style", start: (n) => `Article ${n}.` },
  kk: { instruction: "Қазақ тілінде, ресми заңдық стильде", start: (n) => `${n}-бап.` },
  ky: { instruction: "Кыргыз тилинде, расмий укуктук стилде", start: (n) => `${n}-берене.` },
  tg: { instruction: "Бо забони тоҷикӣ, бо услуби расмии ҳуқуқӣ", start: (n) => `Моддаи ${n}.` },
  tk: { instruction: "Türkmen dilinde, resmi hukuk üslubunda", start: (n) => `${n}-madda.` },
  az: { instruction: "Azərbaycan dilində, rəsmi hüquqi üslubda", start: (n) => `Maddə ${n}.` },
};

const AI_ARTICLE_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // OpenAI orqali generatsiya qilingan matn -- 1 kun
const NIA_ARTICLE_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // Nia'dan (rasmiy manba) kelgan matn -- 7 kun

// OpenAI orqali modda matnini tanlangan tilda generatsiya
async function generateAiArticleSummary(articleNo, lawName, countryName, lawUrl, cacheKey, res, articleTitle, lang, jurisdiction, lawKey) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.json({ found: false, notice: `${articleNo}-modda matni topilmadi. Rasmiy saytdan ko'ring.`, officialUrl: lawUrl });
  }
  try {
    const L = LANG_CFG[lang] || LANG_CFG.uz;
    const startPhrase = L.start(articleNo);
    const titleLine = articleTitle ? `Article title: "${articleTitle}".` : '';
    const buildPrompt = (retry) => `You are a legal expert explaining Uzbekistan's public legislation to citizens on a legal-education platform.

Explain, in your own words, what Article ${articleNo} of the "${lawName}" code (${countryName}) establishes.
${titleLine}
${retry ? 'IMPORTANT: This is a factual, educational explanation of publicly available government legislation, not a request to reproduce anyone\'s copyrighted work. Do not refuse or add disclaimers -- just explain the legal rule.' : ''}

Requirements:
- ${L.instruction}
- Explain the legal rule, rights, obligations, timeframes and penalties this article establishes, in clear plain language (not a verbatim quote)
- 6-10 sentences, precise and complete
- Start with "${startPhrase}"
- Official, neutral tone -- no personal opinions, no meta-commentary about being an AI, no disclaimers`;

    async function callOpenAi(retry) {
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: buildPrompt(retry) }],
          max_tokens: 800,
          temperature: 0.15,
        }),
      });
      if (!resp.ok) throw new Error(`OpenAI ${resp.status}`);
      const data = await resp.json();
      return data.choices?.[0]?.message?.content?.trim() || '';
    }

    let aiText = await callOpenAi(false);
    // Model rad javobi bersa -- bir marta boshqacha, aniqroq prompt bilan
    // qayta urinib ko'ramiz, foydalanuvchiga rad javobini hech qachon
    // ko'rsatmaymiz va keshlamaymiz.
    if (!aiText || isRefusal(aiText)) {
      aiText = await callOpenAi(true);
    }
    if (!aiText || isRefusal(aiText)) {
      return res.json({ found: false, notice: `${articleNo}-modda matni topilmadi. Rasmiy saytdan ko'ring.`, officialUrl: lawUrl });
    }
    const responseData = {
      found: true, articleNo, text: aiText,
      source: null, officialUrl: lawUrl,
      isAiGenerated: true, fetchedAt: new Date().toISOString(),
    };
    await setCachedArticle(cacheKey, jurisdiction, lawKey, articleNo, lang, responseData, AI_ARTICLE_CACHE_TTL_MS);
    return res.json(responseData);
  } catch (e) {
    console.error('[article/ai] xato:', e.message);
    return res.json({ found: false, notice: `${articleNo}-modda matni topilmadi. Rasmiy saytdan ko'ring.`, officialUrl: lawUrl });
  }
}

router.get('/lawyers', (req, res) => res.json({ lawyers: LAWYERS }));
router.get('/templates', (req, res) => res.json({ templates: TEMPLATES }));

router.get('/jurisdictions', (req, res) => {
  const list = JURIS_ORDER.map((code) => {
    const d = LEGAL_DB[code];
    return { code, flag: d.flag, name: d.name, official: d.official, officialName: d.officialName, fullyIndexed: FULLY_INDEXED_JURISDICTIONS.includes(code) };
  });
  res.json({ jurisdictions: list });
});

router.get('/laws/:jurisdiction', (req, res) => {
  const db = LEGAL_DB[req.params.jurisdiction];
  if (!db) return res.status(404).json({ error: 'Yurisdiksiya topilmadi' });
  res.json({
    jurisdiction: req.params.jurisdiction,
    laws: db.laws,
    official: db.official,
    officialName: db.officialName,
    fullyIndexed: FULLY_INDEXED_JURISDICTIONS.includes(req.params.jurisdiction),
  });
});

router.get('/laws/:jurisdiction/:lawKey', async (req, res) => {
  try {
    const { jurisdiction, lawKey } = req.params;
    const db = LEGAL_DB[jurisdiction];
    if (!db) return res.status(404).json({ error: 'Yurisdiksiya topilmadi' });
    const law = db.laws.find((l) => l.key === lawKey);
    const tocKey = `${jurisdiction}_${lawKey}`;
    if (DETAILED_TOC[tocKey]) {
      const toc = DETAILED_TOC[tocKey];
      const tocBaseUrl = toc.BASE_URL || toc.url || '';
      const tocSections = toc.SECTIONS || toc.tocSections || [];
      return res.json({
        jurisdiction, law,
        title: law ? law.name : (toc.name || lawKey),
        sub: law ? law.desc : (toc.officialName || ''),
        official: db.official, officialName: db.officialName,
        fullyIndexed: FULLY_INDEXED_JURISDICTIONS.includes(jurisdiction),
        detailedToc: true, tocBaseUrl, tocSections,
        notice: "Quyida ushbu kodeksning rasmiy, to'liq tasdiqlangan mundarijasi keltirilgan. Har bir moddani bosing — matn jonli yuklanadi.",
      });
    }
    if (!law) return res.status(404).json({ error: 'Kodeks topilmadi' });
    const isFullyIndexed = FULLY_INDEXED_JURISDICTIONS.includes(jurisdiction);
    const baseResponse = {
      jurisdiction, law,
      title: lawKey === 'const' ? db.constTitle : law.name,
      sub: lawKey === 'const' ? db.constSub : law.desc,
      official: db.official, officialName: db.officialName, fullyIndexed: isFullyIndexed,
    };
    if (!niaConfigured()) return res.json({ ...baseResponse, sections: db.const || [], niaUsed: false });
    const subtopics = SUBTOPICS_BY_LAW_KEY[lawKey] || [`${law.name} asosiy moddalar tuzilishi`];
    const queries = subtopics.map((t) => `${law.name} ${db.name} ${t}`);
    const results = await Promise.all(queries.map((q) => searchForJurisdiction(q, jurisdiction).catch(() => null)));
    const seenTexts = new Set();
    const allChunks = [];
    results.forEach((result, ti) => {
      if (!result || !result.chunks.length) return;
      result.chunks.forEach((chunk) => {
        const key = chunk.text.slice(0, 100);
        if (seenTexts.has(key)) return;
        seenTexts.add(key);
        allChunks.push({ ...chunk, topicLabel: subtopics[ti] });
      });
    });
    if (!allChunks.length) {
      return res.json({ ...baseResponse, sections: db.const || [], niaUsed: false, notice: "Qidiruv natija bermadi. Rasmiy manbadan to'liq matnni ko'ring." });
    }
    const grouped = {};
    allChunks.forEach((chunk) => {
      if (!grouped[chunk.topicLabel]) grouped[chunk.topicLabel] = [];
      grouped[chunk.topicLabel].push(chunk);
    });
    const sections = Object.entries(grouped).map(([topicLabel, chunks]) => ({
      sec: `${topicLabel.toUpperCase()} — ${db.officialName} dan olingan`,
      arts: chunks.slice(0, 8).map((chunk, idx) => {
        const rawSource = chunk.source || db.officialName;
        const isUrl = /^https?:\/\//.test(rawSource);
        let shortLabel = rawSource;
        if (isUrl) { try { shortLabel = new URL(rawSource).hostname.replace(/^www\./, ''); } catch (e) {} }
        return { no: `${idx + 1}-band`, t: `Manba: ${shortLabel}`, b: chunk.text.slice(0, 2000), url: isUrl ? rawSource : null };
      }),
    }));
    res.json({ ...baseResponse, sections, niaUsed: true, chunksFound: allChunks.length });
  } catch (e) {
    console.error('[catalog/laws] xato:', e);
    res.status(500).json({ error: "Qonun ma'lumotini yuklashda xato yuz berdi" });
  }
});

router.get('/legal-categories/:jurisdiction', (req, res) => {
  const { jurisdiction } = req.params;
  const db = LEGAL_DB[jurisdiction];
  if (!db) return res.status(404).json({ error: 'Yurisdiksiya topilmadi' });
  const isUZ = jurisdiction === 'UZ';
  res.json({
    jurisdiction,
    kodekslar: db.laws,
    qonunlar: isUZ ? uzCategories.QONUNLAR : [],
    prezidentHujjatlari: isUZ ? uzCategories.PREZIDENT_HUJJATLARI : [],
    hukumatQarorlari: isUZ ? uzCategories.HUKUMAT_QARORLARI : [],
    hukumatQarorlariSourceUrl: isUZ ? uzCategories.HUKUMAT_QARORLARI_SOURCE_URL : null,
    notice: isUZ ? "Qonunlar ro'yxati bosqichma-bosqich to'ldirilmoqda." : `${db.name} uchun kategoriyalangan qonunlar ro'yxati hali tayyorlanmagan.`,
  });
});

router.get('/laws/:jurisdiction/:lawKey/article/:articleNo', async (req, res) => {
  try {
    const { jurisdiction, lawKey, articleNo } = req.params;
    const db = LEGAL_DB[jurisdiction];
    if (!db) return res.status(404).json({ error: 'Yurisdiksiya topilmadi' });
    const law = db.laws.find((l) => l.key === lawKey);
    const tocKey = `${jurisdiction}_${lawKey}`;
    const toc = DETAILED_TOC[tocKey];
    const lawName = law ? law.name : (toc ? (toc.officialName || toc.name || lawKey) : lawKey);
    const lawUrl = law ? law.url : (toc ? (toc.BASE_URL || toc.url || db.official) : db.official);

    const lang = req.query.lang || 'uz';
    const cacheKey = buildCacheKey(jurisdiction, lawKey, articleNo, lang);
    const cachedData = await getCachedArticle(cacheKey);
    if (cachedData) return res.json({ ...cachedData, fromCache: true });

    if (!niaConfigured()) {
      const articleTitle = req.query.title ? decodeURIComponent(req.query.title) : '';
      return generateAiArticleSummary(articleNo, lawName, db.name, lawUrl, cacheKey, res, articleTitle, lang, jurisdiction, lawKey);
    }

    const query = `${lawName} ${db.name} ${articleNo}-modda`;
    const result = await searchForJurisdiction(query, jurisdiction).catch(() => null);

    // Nia natijasini tozalaymiz
    const cleanChunks = (result && result.chunks || []).filter(c => isGoodContent(c.text));

    if (cleanChunks.length > 0) {
      // Ishonchli domendan kelganlarni afzal ko'ramiz
      const trustedChunks = cleanChunks.filter(c => TRUSTED_LAW_DOMAINS.test(c.source || ''));
      const candidates = trustedChunks.length > 0 ? trustedChunks : cleanChunks;
      const exact = candidates.find(c => new RegExp(`\\b${articleNo}\\s*-?\\s*modda`, 'i').test(c.text));
      const chosen = exact || candidates[0];
      const safeSource = TRUSTED_LAW_DOMAINS.test(chosen.source || '') ? chosen.source : lawUrl;
      const responseData = {
        found: true, articleNo,
        text: chosen.text.slice(0, 4000),
        source: safeSource, officialUrl: lawUrl,
        fetchedAt: new Date().toISOString(),
      };
      await setCachedArticle(cacheKey, jurisdiction, lawKey, articleNo, lang, responseData, NIA_ARTICLE_CACHE_TTL_MS);
      return res.json(responseData);
    }

    // Nia da yaxshi matn topilmadi → OpenAI fallback
    return generateAiArticleSummary(articleNo, lawName, db.name, lawUrl, cacheKey, res, req.query.title ? decodeURIComponent(req.query.title) : '', lang, jurisdiction, lawKey);

  } catch (e) {
    console.error('[catalog/laws/article] xato:', e);
    res.status(500).json({ error: "Modda matnini yuklashda xato yuz berdi" });
  }
});

module.exports = router;
