// server/claude.js
// Anthropic Claude API klienti -- B2B Risk Audit uchun CHUQUR AI tahlil qatlami.
//
// NEGA ALOHIDA MODUL: openaiSearch.js kabi, bu ham "yo'q bo'lsa ham ishlayveradi"
// tamoyilida qurilgan -- ANTHROPIC_API_KEY sozlanmagan bo'lsa, audit avvalgidek
// faqat riskEngine (qoidaga asoslangan) natijasini qaytaradi, hech narsa buzilmaydi.
//
// NEGA FABLE 5 (va nega faqat B2B auditda):
//   - claude-fable-5 -- Anthropic'ning eng kuchli umumiy modeli (2026-06-09),
//     1M token kontekst -- butun shartnoma + Nia'dan topilgan moddalar bitta
//     so'rovga sig'adi, bo'laklashsiz.
//   - Narxi: $10/$50 per 1M token (kirish/chiqish) -- gpt-4o-mini'dan ~60-80x
//     qimmat. SHUNING UCHUN oddiy chatda ISHLATILMAYDI -- faqat B2B audit
//     (premium, hujjat-boshiga to'lanadigan) oqimida.
//   - Modelni CLAUDE_AUDIT_MODEL env orqali almashtirsa bo'ladi (masalan test
//     paytida arzonroq 'claude-sonnet-4-6' qo'yish uchun).
//
// MUHIM API FARQLARI (OpenAI'dan):
//   1) Endpoint: https://api.anthropic.com/v1/messages
//   2) Headers: 'x-api-key' (Authorization Bearer EMAS) + 'anthropic-version'
//   3) System prompt alohida 'system' maydonida, messages ichida emas
//   4) Javob data.content[] massivida ({type:'text', text:...} bloklar)
//   5) Fable 5 rad etsa HTTP 200 + stop_reason:'refusal' qaytarishi mumkin --
//      bu XATO EMAS, oddiy oqim sifatida ushlanadi (pastda ko'ring).

const API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

// Xarajat nazorati: shartnoma matnini ~120 ming belgigacha kesamiz
// (~40-45 ming token ≈ $0.40-0.45 kirish xarajati Fable 5'da). O'zbek
// amaliyotidagi shartnomalar odatda bundan ancha qisqa; kesish faqat juda
// katta hujjatlarda ishlaydi va foydalanuvchiga ogohlantirish qaytadi.
const MAX_CONTRACT_CHARS = 120_000;

function isConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function modelName() {
  return process.env.CLAUDE_AUDIT_MODEL || 'claude-sonnet-4-6';
}

// Til kodiga qarab AI'ga javob tilini aytamiz (riskEngine 8 tilda ishlaydi,
// AI tahlil ham foydalanuvchi tilida bo'lishi kerak).
const LANG_NAMES = {
  uz: "o'zbek tilida (lotin alifbosida)",
  ru: 'на русском языке',
  en: 'in English',
  kk: 'қазақ тілінде',
  ky: 'кыргыз тилинде',
  tg: 'бо забони тоҷикӣ',
  tr: 'Türkçe olarak',
  az: 'Azərbaycan dilində',
};

function buildSystemPrompt(lang) {
  const langLine = LANG_NAMES[lang] || LANG_NAMES.uz;
  return [
    'Siz korporativ yuridik departament uchun ishlaydigan tajribali shartnoma-tahlilchi yuristsiz.',
    'Sizga: (1) shartnomaning TO\'LIQ matni, (2) avtomatik qoida-tizim topgan xavflar ro\'yxati,',
    '(3) rasmiy manbalardan (lex.uz va h.k.) topilgan tegishli qonun moddalari beriladi.',
    '',
    'Vazifangiz -- qoida-tizim KO\'RA OLMAYDIGAN narsalarni topish:',
    '- moddalar ORASIDAGI ziddiyatlar (masalan, 3-bandda 30 kun, 7-bandda 10 kun deyilgan)',
    '- bir tomonga og\'ib ketgan shartlar (javobgarlik, jarima, bekor qilish huquqi nomutanosibligi)',
    '- YO\'Q bo\'lgan, lekin bo\'lishi shart bandlar (fors-major, nizolarni hal qilish, amal qilish muddati)',
    '- berilgan qonun moddalariga zid keladigan shartlar',
    '',
    'QOIDALAR:',
    '- Faqat shartnoma matnida HAQIQATAN bor narsaga tayaning; taxmin qilmang.',
    '- Har bir topilmada shartnomaning aniq bandi/joyini ko\'rsating.',
    '- Qonunga havola qilsangiz, faqat sizga BERILGAN modda matnlaridan foydalaning.',
    `- Javobni ${langLine} yozing.`,
    '',
    'JAVOB FORMATI -- FAQAT toza JSON qaytaring (markdown backtick YO\'Q, izohsiz):',
    '{',
    '  "summary": "2-3 gaplik umumiy xulosa: shartnoma kimning foydasiga, asosiy xatar nima",',
    '  "keyRisks": [ { "title": "...", "severity": "high|med|low", "detail": "...", "clauseRef": "shartnomadagi joy" } ],',
    '  "missingClauses": [ "yo\'q bo\'lgan muhim band nomi va nega kerakligi" ],',
    '  "recommendations": [ "aniq, bajarilishi mumkin tavsiya" ],',
    '  "score": 85,  // 0-100 ball: 90+ alo, 70-89 yaxshi, 50-69 ortacha, 0-49 yomon',
    '}',
  ].join('\n');
}

// ASOSIY FUNKSIYA: B2B audit oqimidan chaqiriladi.
// Muvaffaqiyatsizlikda null qaytaradi -- audit AI'siz davom etadi (Nia pattern).
async function deepContractAnalysis({ contractText, findings, legalRefs, lang }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.log('[claude] ANTHROPIC_API_KEY topilmadi -- AI chuqur tahlil o\'tkazib yuboriladi.');
    return null;
  }
  try {
    const truncated = contractText.length > MAX_CONTRACT_CHARS;
    const text = truncated ? contractText.slice(0, MAX_CONTRACT_CHARS) : contractText;

    const findingsBlock = (findings || [])
      .map((f) => `- [${f.sev}] ${f.title}: ${f.body}`)
      .join('\n') || '(qoida-tizim xavf topmadi)';

    const refsBlock = (legalRefs || [])
      .map((r) => `- ${r.citationText || ''}\n  ${r.excerpt || ''}`)
      .join('\n') || '(qonun moddalari topilmadi)';

    const userContent = [
      'SHARTNOMA MATNI:',
      '"""',
      text,
      '"""',
      truncated ? '(DIQQAT: matn juda uzun bo\'lgani uchun qisqartirildi)' : '',
      '',
      'QOIDA-TIZIM TOPGAN XAVFLAR:',
      findingsBlock,
      '',
      'RASMIY MANBALARDAN TOPILGAN QONUN MODDALARI:',
      refsBlock,
    ].join('\n');

    const resp = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: modelName(),
        // Chiqish narxi $50/1M -- eng qimmat tomoni. 3000 token strukturali
        // JSON hisobot uchun yetarli va bitta audit ~$0.15 chiqishdan oshmaydi.
        max_tokens: 3000,
        system: buildSystemPrompt(lang),
        messages: [{ role: 'user', content: userContent }],
      }),
    });

    if (!resp.ok) {
      const errBody = await resp.text().catch(() => '');
      throw new Error(`Anthropic ${resp.status}: ${errBody.slice(0, 300)}`);
    }
    const data = await resp.json();

    // Fable 5'ga xos: rad etish HTTP 200 + stop_reason:'refusal' bo'lib
    // kelishi mumkin. Yuridik shartnomalar odatda bunga tushmaydi, lekin
    // production'da bu holat XATO emas, oddiy "AI tahlil yo'q" deb qaytamiz.
    if (data.stop_reason === 'refusal') {
      console.warn('[claude] Model so\'rovni rad etdi (stop_reason=refusal) -- AI tahlilsiz davom etamiz.');
      return null;
    }

    const raw = (data.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
    if (!raw) return null;

    // JSON tozalash: model ba'zan ```json ... ``` bilan o'rab yuborishi mumkin.
    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch {
      // JSON buzilgan bo'lsa ham matnni yo'qotmaymiz -- summary sifatida saqlaymiz.
      parsed = { summary: raw, keyRisks: [], missingClauses: [], recommendations: [] };
    }

    return {
      summary: String(parsed.summary || ''),
      keyRisks: Array.isArray(parsed.keyRisks) ? parsed.keyRisks : [],
      missingClauses: Array.isArray(parsed.missingClauses) ? parsed.missingClauses : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      model: data.model || modelName(),
      truncatedInput: truncated,
      usage: data.usage
        ? { inputTokens: data.usage.input_tokens, outputTokens: data.usage.output_tokens }
        : null,
    };
  } catch (e) {
    console.error('[claude] Chuqur tahlil xatosi:', e.message);
    return null;
  }
}

module.exports = { isConfigured, deepContractAnalysis, modelName };
