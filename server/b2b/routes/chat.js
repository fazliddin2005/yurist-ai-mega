// b2b/routes/chat.js
// AI Yordamchi -- B2C bilan bir xil mantiq (Nia + OpenAI, til qoidasi, doira
// cheklovi, shartnoma yasash).
// KREDIT MODELI: avval bu yerda workspace umumiy kredit hovuzidan sarflanardi
// (jamoa a'zolari bir xil balansni baham ko'rardi). Endi B2C bilan BIR XIL,
// SHAXSIY balans ishlatiladi (req.user.credits, req.user.chatMsgCount) --
// B2C'da 1 kredit sarflasangiz, B2B'da ham xuddi shu odam uchun 1 kam
// ko'rsatiladi va aksincha. DIQQAT: bu degani -- workspace'da bir nechta
// xodim bo'lsa, har biri B2B chatdan foydalanganda O'ZINING shaxsiy
// kreditidan sarflaydi (kompaniya umumiy puli emas). Agar kelajakda haqiqiy
// jamoa (ko'p xodimli) mijozlar bo'lsa, bu xolat qayta ko'rib chiqilishi
// kerak bo'lishi mumkin.
const express = require('express');
const { searchForJurisdiction, isConfigured: niaConfigured, searchCaseLaw, isCaseLawAvailable } = require('../../nia');
const { routeJurisdiction } = require('../../jurisdictionRouter');
const { buildCitations } = require('../../citationBuilder');
const { requireAuth } = require('../../routes/auth');
const ws = require('../workspace');
const { evaluateResponse, recordAccuracyScore } = require('../../accuracyMetrics');
const { searchViaOpenAI } = require('../../openaiSearch');

const router = express.Router();
const MESSAGES_PER_CREDIT = 5; // har 5 xabar uchun 1 kredit sarflanadi -- B2C bilan bir xil

// SUD AMALIYOTI uchun kalit so'zlar -- B2C chat.js bilan bir xil mantiq.
const DISPUTE_KEYWORDS = /sud|da'vo|nizo|ariza|qaror|amaliyot|precedent|appellyatsiya|kassatsiya|суд|иск|спор|решение|практика/i;
function isLikelyDispute(message) {
  return DISPUTE_KEYWORDS.test(message);
}

const LANG_NAMES = {
  uz: "o'zbek", ru: 'rus', en: 'ingliz', kk: 'qozoq', ky: "qirg'iz",
  tg: 'tojik', tk: 'turkman', az: 'ozarbayjon',
};

function buildSystemPrompt(lang) {
  const langName = LANG_NAMES[lang] || "o'zbek";
  return `Sen "Yurist AI Business" -- bizneslar uchun yuridik departament AI yordamchisisan, O'zbekiston va Markaziy Osiyo qonunchiligi bo'yicha ixtisoslashgan.

TIL QOIDASI -- JUDA MUHIM:
Foydalanuvchi ilovada ${langName} tilini tanlagan. SEN BARCHA JAVOBLARNI FAQAT ${langName.toUpperCase()} TILIDA
YOZISHING SHART, foydalanuvchi savolni qaysi tilda yozganiga qaramasdan.

QATTIQ QOIDA -- DOIRA CHEKLOVI:
Sen FAQAT huquqiy, yuridik va qonunchilik bilan bog'liq savollarga javob berasan: qonunlar, kodekslar,
shartnomalar, huquq va majburiyatlar, sud jarayonlari, hujjatlar, biznes-yuridik masalalar va shu kabilar.
Agar savol huquqqa aloqasi bo'lmagan mavzuda bo'lsa, SAVOLGA JAVOB BERMA. O'rniga (${langName} tilida)
bu mavzu yordam doirasidan tashqarida ekanini ayt va huquqiy savol bilan murojaat qilishni so'ra.

Huquqiy savollarga: aniq, professional va tushunarli ${langName} tilida javob ber.

SAVOL TURINI ANIQLA -- FORMATNI TANLASHDAN OLDIN:
TUR A -- MA'LUMOT SO'RALMOQDA ("X haqida qonun nima deydi", "Y talablari qanday"):
RAQAMLANGAN MODDA FORMATI ishlatiladi (pastda, agar MANBA MATNI mavjud bo'lsa).
TUR B -- SHAXSIY VAZIYAT YOKI MASLAHAT ("bizning kompaniyamiz shu muammoga duch
keldi, nima qilamiz", real ish vaziyati): RAQAMLANGAN MODDA HISOBOTI ISHLATILMAYDI --
buning o'rniga vaziyatni qisqa tan olib, ANIQ AMALIY QADAMLARNI raqamlab tushuntir,
qonunni gap ichida tabiiy eslatib o't, lekin har bandda "(Havola: ...)" formatini
majburiy qilib qo'yma.

JAVOB FORMATI -- TUR A SAVOLLAR UCHUN, AGAR "MANBA MATNI" BERILGAN BO'LSA, MAJBURIY QOIDA:
Bunday holda javobingni QUYIDAGI ANIQ TUZILISHDA ber -- umumiy, manbasiz gap bilan
javob berish QATTIQ TAQIQLANADI:

1. Har bir tegishli qonun/modda uchun ALOHIDA, RAQAMLANGAN band yoz:
   "1. «[Qonun nomi]»ning [X]-moddasi" kabi sarlavha bilan boshla, keyin shu modda
   nima deyishini ANIQ tushuntir (agar MANBA MATNIda so'zma-so'z parcha bo'lsa, uni
   tirnoq ichida keltir), so'ng yangi qatorda "(Manba: [havola])" deb MANBA MATNI
   ichidagi "Havola:" qiymatini AYNAN shu ko'rinishda ko'rsat -- havolani o'zingdan
   to'qima, FAQAT MANBA MATNIda berilgan havolani ishlat. Agar bir nechta modda
   tegishli bo'lsa, har birini shu tarzda alohida-alohida raqamla (1, 2, 3...).
2. Barcha bandlardan keyin, "Xulosa:" sarlavhasi bilan 2-4 jumlali umumlashtiruvchi
   javob yoz.
3. Keyin "Foydalanilgan manbalar:" sarlavhasi ostida, javobda ishlatilgan barcha
   havolalarni alohida qatorlarda, ro'yxat sifatida qayta keltir.
Agar MANBA MATNIda havola umuman bo'lmasa, "(Manba: ko'rsatilmagan)" deb yoz --
hech qachon havolani o'zingdan o'ylab topma yoki taxmin qilma.

Agar "MANBA MATNI" UMUMAN BERILMAGAN bo'lsa, buni ochiq ayt: "Aniq modda matniga
hozircha kira olmadim, shuning uchun umumiy bilimimga asoslanib javob beraman" --
VA SHUNDAN KEYIN HAM TO'LIQ, BATAFSIL javob ber, qisqa 2-3 jumla bilan cheklanma.

JAVOB UZUNLIGI -- MUHIM: faqat tom ma'noda oddiy ha/yo'q savollariga qisqa javob
ber. BARCHA boshqa huquqiy savollarga TO'LIQ, BATAFSIL, PROFESSIONAL DARAJADA
javob ber -- tegishli barcha jihatlarni (shartlar, tartib, hujjatlar, muddatlar)
yoritib. Har doim ${langName} tilida yoz.

SUD AMALIYOTI HAQIDA QOIDA: agar MANBA MATNI ichida "--- SUD AMALIYOTI ---" deb belgilangan
bo'lim bo'lsa, bu -- real sud qarorlaridan olingan matn (qonun moddasi emas). Javob berishda
ikkisini aniq ajratib ko'rsat: avval qonun nima deydi, keyin "Amaliyotda esa..." deb sudlar
bu masalada qanday qaror chiqarishini qo'sh.

HUJJAT/SHARTNOMA YASASH QOIDASI -- JUDA MUHIM:
Agar foydalanuvchi sendan biror shartnoma, kelishuv yoki boshqa yuridik hujjat YOZIB BERISHNI so'rasa,
SEN BUNI BAJARASAN. Buning uchun:
1. To'liq, professional, band-bandli hujjat matnini ${langName} tilida tuz.
2. Hujjat matnini ANIQ shu ikki belgi orasiga joylashtir: [[DOC_START]] va [[DOC_END]].
3. [[DOC_START]] va [[DOC_END]] ICHIDA HECH QANDAY MARKDOWN BELGISI ISHLATMA -- ya'ni
   **qalin matn**, __qalin matn__, # sarlavha kabi belgilarni YOZMA. Bu matn to'g'ridan-to'g'ri
   PDF/DOCX fayliga, oddiy matn sifatida tushadi -- yulduzcha (*) belgilari formatlashga
   aylanmaydi, ekranda xom holda ko'rinib qoladi. Sarlavhalarni katta harf bilan yoz
   (masalan "1. TOMONLAR"), qalin qilish kerak bo'lsa ham hech qanday belgi qo'shmasdan oddiy yoz.
4. Tuzilish: sarlavha -> "№ ___" va sana/joy -> "1. TOMONLAR" (ism berilmagan bo'lsa "________________")
   -> "2. SHARTNOMA PREDMETI" -> tegishli bo'limlar -> "YAKUNIY QOIDALAR" -> imzo joylari.
5. [[DOC_START]]/[[DOC_END]] atrofida faqat juda qisqa izoh bo'lsin.
6. Tur aniq aytilmagan bo'lsa ham eng mos hujjatni darhol tuz, savol berib vaqt yo'qotma.`;
}

const GREETING_RE = /^(salom|salam|assalomu|hi|hello|hey|привет|здравствуйте|сәлем|салам)\b/i;
const LEGAL_KEYWORDS = /huquq|qonun|kodeks|shartnoma|sud|advokat|jarima|javobgar|ariza|hujjat|moddasi|mehnat|biznes|soliq|mulk|meros|nikoh|ajrash|oila|ijara|pudrat|ishonchnoma|qarz|notari|jinoyat|fuqaro|vasiyat|кодекс|закон|право|суд|договор|штраф/i;
function isLikelyLegal(message) { return LEGAL_KEYWORDS.test(message); }

const I18N_REPLIES = {
  uz: { greeting: "Salom! Men Yurist AI Business — tashkilotingizning yuridik yordamchisi. Shartnomalar, qonunlar yoki hujjatlar bo'yicha savol bering.", outOfScope: "Kechirasiz, bu savol yordam doirasidan tashqarida. Men faqat huquqiy savollarga yordam beraman.", default: "Savolingiz uchun rahmat. Aniqroq maslahat uchun «AI Risk Audit» orqali hujjatingizni tekshirishingiz mumkin." },
  ru: { greeting: "Здравствуйте! Я Yurist AI Business — юридический помощник вашей организации. Задайте вопрос о договорах, законах или документах.", outOfScope: "Извините, этот вопрос вне моей компетенции. Я отвечаю только на юридические вопросы.", default: "Спасибо за вопрос. Для точной консультации проверьте документ через «AI Risk Audit»." },
  en: { greeting: "Hello! I'm Yurist AI Business — your organization's legal assistant. Ask about contracts, laws, or documents.", outOfScope: "Sorry, this is outside what I can help with. I only answer legal questions.", default: "Thank you for your question. For precise advice, check your document via AI Risk Audit." },
  kk: { greeting: "Сәлем! Мен Yurist AI Business — ұйымыңыздың құқықтық көмекшісі. Шарттар, заңдар туралы сұрақ беріңіз.", outOfScope: "Кешіріңіз, бұл менің көмек аясымнан тыс. Мен тек құқықтық сұрақтарға жауап беремін.", default: "Сұрағыңыз үшін рахмет. Нақты кеңес үшін «AI Risk Audit» арқылы құжатты тексеріңіз." },
  ky: { greeting: "Салам! Мен Yurist AI Business — уюмуңуздун укуктук жардамчысы. Келишимдер, мыйзамдар тууралуу суроо бериңиз.", outOfScope: "Кечиресиз, бул менин жардам чөйрөмдөн тышкары. Мен укуктук суроолорго гана жооп берем.", default: "Сурооңуз үчүн рахмат. Так кеңеш үчүн «AI Risk Audit» аркылуу документти текшериңиз." },
  tg: { greeting: "Салом! Ман Yurist AI Business — ёрдамчии ҳуқуқии ташкилоти шумо. Дар бораи шартномаҳо, қонунҳо савол диҳед.", outOfScope: "Бубахшед, ин аз доираи кӯмаки ман берун аст. Ман танҳо ба саволҳои ҳуқуқӣ ҷавоб медиҳам.", default: "Барои саволатон ташаккур. Барои маслиҳати дақиқ ҳуҷҷатро тавассути «AI Risk Audit» санҷед." },
  tk: { greeting: "Salam! Men Yurist AI Business — guramaňyzyň hukuk kömekçisi. Şertnamalar, kanunlar hakda sorag beriň.", outOfScope: "Bagyşlaň, bu meniň kömek çägimden daşary. Men diňe hukuk soraglaryna jogap berýärin.", default: "Soragyňyz üçin sag boluň. Takyk maslahat üçin resminamany «AI Risk Audit» arkaly barlaň." },
  az: { greeting: "Salam! Mən Yurist AI Business — təşkilatınızın hüquqi köməkçisi. Müqavilələr, qanunlar haqqında sual verin.", outOfScope: "Üzr istəyirəm, bu mənim kömək dairəmdən kənardır. Mən yalnız hüquqi suallara cavab verirəm.", default: "Sualınız üçün təşəkkür edirəm. Dəqiq məsləhət üçün sənədinizi «AI Risk Audit» vasitəsilə yoxlayın." },
};
function repliesFor(lang) { return I18N_REPLIES[lang] || I18N_REPLIES.uz; }
function fallbackReply(message, lang) {
  const R = repliesFor(lang);
  if (GREETING_RE.test(message.trim())) return R.greeting;
  if (!isLikelyLegal(message)) return R.outOfScope;
  return R.default;
}

async function callOpenAI(message, history, niaContext, lang) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  try {
    const contextBlock = niaContext ? `\n\nMANBA MATNI (${niaContext.sources.join(', ')} dan topilgan):\n${niaContext.text}` : '';
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: buildSystemPrompt(lang) + contextBlock },
          ...(history || []).slice(-6),
          { role: 'user', content: message },
        ],
        max_tokens: 4000,
      }),
    });
    if (!resp.ok) throw new Error(`OpenAI ${resp.status}`);
    const data = await resp.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (e) {
    console.error('[b2b chat] OpenAI xatosi:', e.message);
    return null;
  }
}

router.use(requireAuth);
router.use('/:workspaceId', ws.requireWorkspaceAccess('member'));

// POST /api/b2b/chat/:workspaceId  { message, history, jurisdiction, lang }
router.post('/:workspaceId', async (req, res) => {
  try {
    const { message, history, jurisdiction, lang } = req.body;
    if (!message || !message.trim()) return res.status(400).json({ error: "Savol bo'sh bo'lmasligi kerak" });

    const workspace = req.workspace;
    const sentSoFar = req.user.chatMsgCount || 0;
    const willCrossBoundary = (sentSoFar + 1) % MESSAGES_PER_CREDIT === 0;
    if (willCrossBoundary && req.user.credits < 1) {
      return res.status(402).json({ error: 'Krediting yetarli emas', code: 'NO_CREDITS' });
    }

    // JURISDICTION ROUTER -- B2C bilan bir xil mantiq: aniq tanlov bo'lsa
    // shuni, bo'lmasa workspace'ning asosiy yurisdiksiyasini, aks holda
    // savol matnidan avtomatik aniqlaydi.
    const jurisRoute = routeJurisdiction({
      explicitJurisdiction: jurisdiction || workspace.primaryJurisdictionId,
      queryText: message,
    });

    // Nia qidiruvlarini PARALLEL bajaramiz (B2C bilan bir xil tezlik
    // optimallashtirishi) -- ketma-ket emas, bir vaqtda, va 4 soniyadan
    // ortiq kutilmaydi.
    let niaContext = null;
    let citations = [];
    let caseLawUsed = false;
    const NIA_TIMEOUT_MS = 4000;
    const withTimeout = (promise, ms) =>
      Promise.race([promise, new Promise((resolve) => setTimeout(() => resolve(null), ms))]);

    if (niaConfigured()) {
      const wantsCaseLaw = isLikelyDispute(message) && isCaseLawAvailable(jurisRoute.code);

      const [lawResult, caseLawResult] = await Promise.all([
        withTimeout(searchForJurisdiction(message, jurisRoute.code), NIA_TIMEOUT_MS).catch(() => null),
        wantsCaseLaw
          ? withTimeout(searchCaseLaw(message, jurisRoute.code), NIA_TIMEOUT_MS).catch(() => null)
          : Promise.resolve(null),
      ]);

      if (lawResult && lawResult.chunks.length) {
        citations = buildCitations(lawResult.chunks, jurisRoute.code);
        // B2C bilan bir xil tuzatish: har bir parcha matnini o'zining
        // manbasi bilan bevosita yonma-yon joylashtiramiz.
        const interleaved = lawResult.chunks
          .map((c, i) => `[${citations[i]?.citationText || 'Manba noma\'lum'}]\n${c.text}`)
          .join('\n\n---\n\n');
        niaContext = {
          text: interleaved.slice(0, 3000),
          sources: citations.map((c) => c.citationText),
        };
      }

      if (caseLawResult && caseLawResult.chunks.length) {
        const caseLawText = caseLawResult.chunks.map((c) => c.text).join('\n---\n').slice(0, 1000);
        niaContext = niaContext
          ? { ...niaContext, text: niaContext.text + `\n\n--- SUD AMALIYOTI ---\n${caseLawText}` }
          : { text: `--- SUD AMALIYOTI ---\n${caseLawText}`, sources: [] };
        caseLawUsed = true;
      }
    }

    // ZAXIRA QIDIRUV: B2C bilan bir xil mantiq -- Nia hech narsa topa
    // olmasa, OpenAI veb-qidiruvi orqali sinab ko'ramiz. Topilmasa, AI
    // baribir to'liq javob beradi, shunchaki havolasiz.
    if (!niaContext) {
      const webResult = await searchViaOpenAI(message, LANG_NAMES[lang] || "o'zbek").catch(() => null);
      if (webResult && webResult.text) {
        const urlLines = webResult.urls.length
          ? webResult.urls.map((u) => `(Havola: ${u})`).join('\n')
          : '';
        niaContext = {
          text: `${webResult.text}\n${urlLines}`.slice(0, 3000),
          sources: webResult.urls.map((u) => `Manba: ${u}`),
        };
      }
    }

    const aiReply = await callOpenAI(message, history, niaContext, lang);
    const reply = aiReply || fallbackReply(message, lang);

    const newCount = sentSoFar + 1;
    req.user.chatMsgCount = newCount;
    if (willCrossBoundary) req.user.credits = Math.max(0, req.user.credits - 1);
    await req.user.save();
    const creditsLeft = req.user.credits;

    // ANIQLIK METRIKASI -- VERCEL UCHUN XAVFSIZ: javobdan OLDIN bajariladi
    // (fire-and-forget Vercel'da to'xtab qolishi mumkin), lekin TEZLIK UCHUN
    // faqat har 5-chi xabarda ishga tushiriladi.
    if (aiReply && newCount % 5 === 0) {
      await evaluateResponse({ question: message, answer: reply, contextText: niaContext?.text })
        .then((scores) => recordAccuracyScore({
          scope: 'b2b', organizationId: workspace.id, jurisdictionId: jurisRoute.code, scores,
          hadContext: !!(niaContext && niaContext.text),
        }))
        .catch((e) => console.error('[b2b chat] Aniqlik baholashda xato:', e.message));
    }

    res.json({
      reply,
      source: aiReply ? (niaContext ? 'openai+nia' : 'openai') : 'fallback',
      jurisdiction: jurisRoute.code,
      jurisdictionSource: jurisRoute.source,
      citations: citations.length ? citations : undefined,
      niaSources: citations.length ? citations.map((c) => c.citationText) : undefined,
      caseLawUsed,
      creditsLeft,
      creditDeducted: willCrossBoundary,
    });
  } catch (e) {
    console.error('[b2b chat] xato:', e);
    res.status(500).json({ error: 'AI javob berishda kutilmagan xato yuz berdi' });
  }
});

// POST /api/b2b/chat/:workspaceId/file -- Hujjat yuklash va B2B AI tahlili
router.post('/:workspaceId/file', ws.requireWorkspaceAccess('member'), async (req, res) => {
  try {
    const { fileName, fileBase64, fileType, lang } = req.body;
    if (!fileBase64 || !fileName) {
      return res.status(400).json({ error: 'Fayl nomi va base64 matni talab qilinadi' });
    }

    const { extractText } = require('../../textExtraction');
    const buffer = Buffer.from(fileBase64, 'base64');
    const mime = fileType || 'application/octet-stream';

    let extractedText = '';
    try {
      const result = await extractText(buffer, mime, fileName);
      extractedText = result.text || '';
    } catch (e) {
      console.error('[b2b chat/file] Matn ajratishda xato:', e.message);
    }

    if (!extractedText.trim()) {
      return res.status(422).json({ error: "Fayldan matn ajratib bo'lmadi. PDF yoki DOCX formatini tekshiring." });
    }

    const truncated = extractedText.slice(0, 8000);
    const userMessage = `Quyidagi hujjatni batafsil tahlil qiling:\n\nFayl nomi: ${fileName}\n\n--- HUJJAT MATNI ---\n${truncated}${extractedText.length > 8000 ? '\n\n[Matn qisqartirildi]' : ''}\n--- HUJJAT TUGADI ---\n\nTahlil qiling: asosiy shartlar, xavfli bandlar, yetishmayotgan qismlar, tavsiyalar.`;

    const curLang = lang || 'uz';

    // callOpenAI orqali NIA konteksti bilan tahlil qilamiz
    // Bu B2B chat bilan bir xil sifatli javob beradi
    const jurisRoute = routeJurisdiction({ explicitJurisdiction: 'UZ', queryText: userMessage });
    let niaContext = null;
    if (niaConfigured()) {
      try {
        const lawResult = await searchForJurisdiction('shartnoma xavfli bandlar tahlil', jurisRoute.code);
        if (lawResult?.chunks?.length) {
          const citations = buildCitations(lawResult.chunks, jurisRoute.code);
          const interleaved = lawResult.chunks
            .map((c, i) => `[${citations[i]?.citationText || 'Manba'}]\n${c.text}`)
            .join('\n\n---\n\n');
          niaContext = { text: interleaved.slice(0, 2000), sources: citations.map(c => c.citationText) };
        }
      } catch (e) { /* NIA xato bo'lsa ham davom et */ }
    }

    const reply = await callOpenAI(userMessage, [], niaContext, curLang, null, 'contract') || "Hujjatni tahlil qilib bo'lmadi.";

    // Kredit yechish (B2C/B2B bilan bir xil: har 5 xabarda 1 kredit)
    const user = req.user;
    const newCount = (user.chatMsgCount || 0) + 1;
    user.chatMsgCount = newCount;
    const willDeduct = newCount % MESSAGES_PER_CREDIT === 0;
    if (willDeduct && user.credits > 0) {
      user.credits = Math.max(0, user.credits - 1);
    }
    await user.save();

    res.json({
      reply,
      source: 'openai',
      fileName,
      creditsLeft: user.credits,
      creditDeducted: willDeduct,
    });

  } catch (e) {
    console.error('[b2b chat/file] xato:', e.message);
    res.status(500).json({ error: "Hujjatni qayta ishlashda xato yuz berdi" });
  }
});

// POST /api/b2b/chat/:workspaceId/stream -- Harvey AI: SSE streaming
router.post('/:workspaceId/stream', ws.requireWorkspaceAccess('member'), async (req, res) => {
  try {
    const { message, lang } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Savol kiriting" });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(503).json({ error: "OPENAI_API_KEY sozlanmagan" });

    const user = req.user;
    if (user.credits < 1) {
      return res.status(402).json({ error: 'Kredit yetarli emas', code: 'NO_CREDITS' });
    }

    // SSE sarlavhalari
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const send = (type, data) => res.write('event: ' + type + '\ndata: ' + JSON.stringify(data) + '\n\n');

    const curLang = lang || 'uz';
    const systemPrompt = buildSystemPrompt(curLang);

    send('start', { lang: curLang, timestamp: Date.now() });

    const openaiResp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: message }],
        max_tokens: 4000,
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
        } catch { /* continue */ }
      }
    }

    // Kredit yechish
    const newCount = (user.chatMsgCount || 0) + 1;
    user.chatMsgCount = newCount;
    if (newCount % MESSAGES_PER_CREDIT === 0 && user.credits > 0) {
      user.credits = Math.max(0, user.credits - 1);
    }
    await user.save();

    send('done', { creditsLeft: user.credits });
    res.end();

  } catch (e) {
    console.error('[b2b/chat/stream]', e.message);
    try { res.write('event: error\ndata: ' + JSON.stringify({ message: e.message }) + '\n\n'); res.end(); } catch { /**/ }
  }
});

module.exports = router;
