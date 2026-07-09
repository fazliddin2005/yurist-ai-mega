// routes/chat.js
// AI Yordamchi. Ish tartibi (RAG -- Retrieval-Augmented Generation):
//   1) JURISDICTION ROUTER: foydalanuvchi savoli/tanlovi asosida qaysi davlat
//      qonunchiligi kerakligi aniqlanadi (server/jurisdictionRouter.js).
//   2) Nia'dan shu davlatning manbasidan (lex.uz, pravo.gov.ru va h.k.)
//      tegishli qonun matni qidiriladi.
//   3) SUD AMALIYOTI: agar savol nizo/sud bilan bog'liq bo'lsa va shu davlat
//      uchun sud amaliyoti manbasi mavjud bo'lsa (UZ, RU, TJ, US), qonun
//      matnidan TASHQARI sud qarorlari ham qidiriladi -- bu AI javobini
//      "qonun shunday deydi" dan "sudlar amalda shunday qaror chiqaradi"
//      darajasiga ko'taradi.
//   4) MULTI-SOURCE CONTEXT: topilgan xom matn kodeks/modda bilan bog'lanib,
//      "Manba: [Davlat], [Kodeks], [Modda]" formatida iqtibosga aylantiriladi
//      (server/citationBuilder.js).
//   5) Topilgan real matn OpenAI'ga kontekst sifatida beriladi -- shunda
//      AI "taxmin qilmaydi", balki haqiqiy modda matniga asoslanadi.
//   6) OPENAI_API_KEY bo'lmasa ham, Nia natijasi (agar bo'lsa) to'g'ridan-to'g'ri
//      ko'rsatiladi; ikkisi ham yo'q bo'lsa -- oddiy qoidaga asoslangan javob.
const express = require('express');
const { searchForJurisdiction, isConfigured: niaConfigured, searchCaseLaw, isCaseLawAvailable } = require('../nia');
const { routeJurisdiction } = require('../jurisdictionRouter');
const { buildCitations } = require('../citationBuilder');
const { logActivity, ACTION_TYPES } = require('../activityLog');
const { requireAuth } = require('./auth');
const users = require('./users');
const { Case } = require('../models');
const { addCaseEvent } = require('./cases');
const { evaluateResponse, recordAccuracyScore } = require('../accuracyMetrics');
const { searchViaOpenAI } = require('../openaiSearch');
const router = express.Router();

const MESSAGES_PER_CREDIT = 5; // har 5 xabar uchun 1 kredit sarflanadi

const LANG_NAMES = {
  uz: "o'zbek", ru: 'rus', en: 'ingliz', kk: 'qozoq', ky: "qirg'iz",
  tg: 'tojik', tk: 'turkman', az: 'ozarbayjon',
};

function buildSystemPrompt(lang) {
  const langName = LANG_NAMES[lang] || "o'zbek";
  return `Sen "Yurist AI" — O'zbekiston va Markaziy Osiyo qonunchiligi bo'yicha ixtisoslashgan yuridik yordamchisan.

TIL QOIDASI — JUDA MUHIM:
Foydalanuvchi ilovada ${langName} tilini tanlagan. SEN BARCHA JAVOBLARNI FAQAT ${langName.toUpperCase()} TILIDA
YOZISHING SHART, foydalanuvchi savolni qaysi tilda yozganiga qaramasdan. Hech qachon boshqa tilga
o'tib ketma, hatto savol boshqa tilda yozilgan bo'lsa ham — javobing har doim ${langName} tilida bo'lsin.

QATTIQ QOIDA — DOIRA CHEKLOVI:
Sen FAQAT huquqiy, yuridik va qonunchilik bilan bog'liq savollarga javob berasan: qonunlar, kodekslar,
shartnomalar, huquq va majburiyatlar, sud jarayonlari, hujjatlar, biznes-yuridik masalalar va shu kabilar.
Agar savol huquqqa aloqasi bo'lmagan mavzuda bo'lsa (masalan: sport, mashhur shaxslar, ob-havo, retsept,
o'yin, umumiy bilim savollari, texnologiya va h.k.), SAVOLGA JAVOB BERMA. O'rniga aniq va xushmuomala
tarzda (${langName} tilida) tushuntir: bu mavzu siz haqiqatda yordam beradigan doiradan tashqarida ekanini
ayt, va Yurist AI faqat huquqiy savollarga (masalan: shartnomalar, qonunlar, hujjatlar, sud jarayoni)
yordam berishini eslatib, foydalanuvchidan huquqiy savol bilan murojaat qilishni so'ra. Hech qachon
mavzudan tashqari savolga to'g'ridan-to'g'ri javob berma, hatto savol oson yoki zararsiz tuyulsa ham.

Agar savol noaniq bo'lsa, lekin huquqiy mavzuga tegishli bo'lishi mumkin bo'lsa (masalan, faqat bir so'z
yozilgan), avval qaysi huquqiy mavzu nazarda tutilganini aniqlashtirish uchun qisqa savol ber.

Huquqiy savollarga: aniq, professional va tushunarli ${langName} tilida javob ber.

SAVOL TURINI ANIQLA -- BU JUDA MUHIM, FORMATNI TANLASHDAN OLDIN BAJARILADI:
Har bir savol ikki turdan biriga kiradi, va FORMAT shunga qarab TANLANADI:

TUR A -- MA'LUMOT SO'RALMOQDA (masalan: "X haqida qonun nima deydi", "Y talablari
qanday", "Z qanday tartibga solinadi", "qaysi modda shuni belgilaydi"): bunday
holda pastdagi RAQAMLANGAN MODDA FORMATI ishlatiladi (agar MANBA MATNI mavjud bo'lsa).

TUR B -- SHAXSIY VAZIYAT YOKI MASLAHAT SO'RALMOQDA (masalan: "men buni qildim, endi
nima qilishim kerak", "meni sudga berishyapti", "avtohalokatga uchradim", "kimdir
mendan pul talab qilyapti", "ishdan haydab yuborishdi" va shunga o'xshash, real
hayotiy vaziyat tasvirlangan savollar): bunday holda RAQAMLANGAN MODDA HISOBOTI
FORMATIDAN FOYDALANMA -- bu sovuq va foydasiz ko'rinadi, odamga aynan shu daqiqada
KEYINGI QADAMLAR kerak. Buning o'rniga: avval qisqa, xotirjam, professional tarzda
vaziyatni tan ol, so'ng ANIQ, AMALIY QADAMLARNI raqamlab tushuntir (masalan:
"1. Birinchi navbatda... 2. Keyin... 3. Murojaat qiling..."), zarur bo'lsa tegishli
qonun/modda nomini GAP ICHIDA tabiiy tarzda eslatib o't (masalan "Jinoyat kodeksiga
ko'ra bu... deb baholanishi mumkin"), lekin alohida "Manba:" yoki "(Havola: ...)"
formatini MAJBURIY qilib qo'yma -- agar MANBA MATNI ichida tegishli havola bo'lsa,
javobning oxirida "Qo'shimcha o'qish uchun:" deb bitta-ikkita havolani ixtiyoriy
ravishda taklif qilishing mumkin, lekin bu TUR A dagidek qattiq, har bir bandda
takrorlanadigan shart EMAS.

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
   javob yoz -- bu yuqoridagi moddalarning amaliy ma'nosini oddiy tilda tushuntiradi.
3. Keyin "Foydalanilgan manbalar:" sarlavhasi ostida, javobda ishlatilgan barcha
   havolalarni alohida qatorlarda, ro'yxat sifatida qayta keltir.
4. Eng oxirida, agar mavzu kengroq bo'lsa, "Aniqlashtiriluvchi savollar" sarlavhasi
   ostida foydalanuvchi keyin so'rashi mumkin bo'lgan 3-5 ta tegishli savolni
   ro'yxat qilib taklif qil (bu foydalanuvchiga mavzuni chuqurroq o'rganishga yordam beradi).
Agar MANBA MATNIda havola umuman bo'lmasa, "(Manba: ko'rsatilmagan)" deb yoz --
hech qachon havolani o'zingdan o'ylab topma yoki taxmin qilma.

Agar "MANBA MATNI" UMUMAN BERILMAGAN bo'lsa (Nia qidiruvi natija bermagan holatda),
buni ochiq ayt: "Aniq modda matniga hozircha kira olmadim, shuning uchun umumiy
bilimimga asoslanib javob beraman -- aniq modda raqami uchun lex.uz saytini
tekshirishni tavsiya qilaman." -- VA SHUNDAN KEYIN HAM TO'LIQ, BATAFSIL javob ber
(umumiy bilimingga asoslanib bo'lsa ham): mavzuga tegishli barcha muhim jihatlarni
yorit, amaliy qadamlarni tushuntir, va agar bir nechta qonun/sohaga tegishli bo'lsa,
har birini alohida ko'rib chiq. QISQA, 2-3 jumlali javob bilan cheklanma -- bu
holatda ham foydalanuvchi to'liq, professional darajadagi ma'lumot olishi kerak,
faqat aniq modda raqami va havola o'rniga umumlashtirilgan tushuntirish bo'ladi.

Manba matnida javob bo'lmasa, buni aytib qo'y va umumiy bilimingdan ehtiyotkorlik
bilan foydalan. Agar savol murakkab bo'lsa yoki shaxsiy maslahat kerak bo'lsa,
foydalanuvchini "Advokatlar" bo'limidan mutaxassisga murojaat qilishni tavsiya qil.

JAVOB UZUNLIGI -- MUHIM: faqat tom ma'noda oddiy, bir og'iz javob talab qiladigan
savollarga (masalan "ha/yo'q" tipidagi aniq savol) qisqa javob ber. BARCHA boshqa
huquqiy savollarga -- qonun, kodeks, modda, tartib-qoida, jarayon haqida bo'lsa --
TO'LIQ, BATAFSIL, PROFESSIONAL DARAJADA javob ber: tegishli barcha jihatlarni
(shartlar, tartib, hujjatlar, muddatlar, istisnolar) yoritib, savol qaysidir
boshqa qonun yoki sohaga ham tegishli bo'lsa, o'shani ham eslatib o'tib javob ber.
Qisqalik uchun mazmunni qisqartirma -- foydalanuvchi yuzaki emas, chuqur va
amaliy javob kutadi. Har doim ${langName} tilida yoz.

SUD AMALIYOTI HAQIDA QOIDA: agar MANBA MATNI ichida "--- SUD AMALIYOTI ---" deb belgilangan
bo'lim bo'lsa, bu -- real sud qarorlaridan olingan matn (qonun moddasi emas). Javob berishda
ikkisini aniq ajratib ko'rsat: avval qonun nima deydi (modda asosida), keyin "Amaliyotda esa..."
deb sudlar bu masalada qanday qaror chiqarishini qo'sh. Bu ikkisi har doim bir xil bo'lmasligi
mumkin -- shuni ham aytib qo'y agar farq bo'lsa.

HUJJAT/SHARTNOMA YASASH QOIDASI -- JUDA MUHIM:
Agar foydalanuvchi sendan biror shartnoma, kelishuv, ariza yoki boshqa yuridik hujjat YOZIB BERISHNI
so'rasa (masalan: "menga ijara shartnomasi yoz", "konsalting shartnomasi tuzib ber", "ishonchnoma kerak"),
SEN BUNI BAJARASAN -- rad etma, "Hujjat yaratish" bo'limiga yo'naltirma. Buning o'rniga:

1. To'liq, professional, band-bandli hujjat matnini ${langName} tilida tuz.
2. Hujjat matnini ANIQ shu ikki belgi orasiga joylashtir: [[DOC_START]] va [[DOC_END]]
   (bu belgilar orasidagi matn ilovada avtomatik aniqlanadi va foydalanuvchiga PDF/DOCX
   yuklab olish tugmalari ko'rsatiladi -- shuning uchun belgilarni albatta ishlat).
3. Hujjat tuzilishi: sarlavha (katta harflar bilan) -> "№ ___" va sana/joy -> "1. TOMONLAR"
   bo'limi (agar ism-sharif berilmagan bo'lsa "________________" bilan bo'sh joy qoldir) ->
   "2. SHARTNOMA PREDMETI" -> tegishli bo'limlar (narx/to'lov, muddat, huquq-majburiyatlar,
   javobgarlik, bekor qilish tartibi) -> "YAKUNIY QOIDALAR" -> imzo joylari (ikki tomon uchun,
   manzil/pasport/imzo uchun bo'sh joy bilan).
4. [[DOC_START]] dan oldin va [[DOC_END]] dan keyin faqat juda qisqa (1 jumlagacha) izoh
   yozishing mumkin (masalan "Mana sizning shartnomangiz:"), lekin hujjat matnining O'ZI
   belgilar ichida bo'lishi SHART.
5. [[DOC_START]] va [[DOC_END]] ICHIDA HECH QANDAY MARKDOWN BELGISI ISHLATMA -- ya'ni
   **qalin matn**, __qalin matn__, # sarlavha kabi belgilarni YOZMA. Bu matn to'g'ridan-to'g'ri
   PDF/DOCX fayliga oddiy matn sifatida tushadi -- yulduzcha belgilari formatlashga aylanmaydi,
   xom holda ko'rinib qoladi. Sarlavhalarni shunchaki katta harf bilan yoz (masalan "1. TOMONLAR").
6. Agar foydalanuvchi qaysi turdagi shartnoma kerakligini aniq aytmagan bo'lsa ham, kontekstdan
   eng mos hujjat turini taxmin qilib, darhol to'liq matn tuz -- qo'shimcha savol berib
   vaqt yo'qotma, faqat juda noaniq bo'lsa qisqa aniqlashtirish savoli ber.`;
}

const FALLBACKS = [
  { test: /mehnat|shartnoma/i,
    text: "Mehnat shartnomasi tuzishda quyidagilarga e'tibor bering: 1) Tomonlarning to'liq rekvizitlari; 2) Lavozim va mehnat vazifalari; 3) Ish haqi miqdori va to'lash tartibi (Mehnat kodeksi 153-modda); 4) Ish vaqti va dam olish vaqti; 5) Sinov muddati (3 oydan oshmasligi kerak). Shartnoma yozma shaklda, ikki nusxada tuziladi." },
  { test: /biznes/i,
    text: "O'zbekistonda biznes ochish uchun: 1) Tashkiliy-huquqiy shaklni tanlash (YaTT, MChJ va h.k.); 2) Davlat ro'yxatidan o'tish (my.gov.uz orqali); 3) STIR olish; 4) Bank hisob raqami ochish; 5) Kerakli litsenziya/ruxsatnomalarni olish. YaTT ro'yxati 30 daqiqada onlayn rasmiylashtiriladi." },
  { test: /ajrash|oila/i,
    text: "Ajrashish ikki yo'l bilan amalga oshiriladi: 1) FHDYo orqali — agar er-xotin rozi bo'lsa va voyaga yetmagan farzandlari bo'lmasa; 2) Sud orqali — agar nizo yoki farzand bo'lsa. Sudga ariza, nikoh guvohnomasi va bojxona to'lovi kvitansiyasi taqdim etiladi (Oila kodeksi)." },
];

// Fallback (OpenAI ulanmagan) rejimda mavzuni aniqlash uchun oddiy kalit so'z tekshiruvi.
// Bu AI emas, shuning uchun nozik emas -- lekin aniq mavzudan tashqari so'rovlarni
// (mashhur shaxslar, sport, umumiy bilim va h.k.) huquqiy javob sifatida ko'rsatib
// qo'ymaslik uchun yetarli himoya beradi.
const LEGAL_KEYWORDS = /huquq|qonun|kodeks|shartnoma|sud|advokat|jarima|javobgar|ariza|hujjat|moddasi|mehnat|biznes|soliq|mulk|meros|nikoh|ajrash|oila|ijara|pudrat|ishonchnoma|qarz|notari|jinoyat|fuqaro|vasiyat|кодекс|закон|право|суд|договор|штраф/i;
function isLikelyLegal(message) {
  return LEGAL_KEYWORDS.test(message);
}

// SUD AMALIYOTI uchun kalit so'zlar -- savol nizo, da'vo, sud jarayoni bilan
// bog'liqligini aniqlaymiz. Agar shu so'zlardan biri topilsa va joriy
// yurisdiksiya uchun sud amaliyoti manbasi mavjud bo'lsa (UZ, RU, TJ, US),
// oddiy qonun matnidan TASHQARI sud qarorlarini ham qidiramiz.
const DISPUTE_KEYWORDS = /sud|da'vo|nizo|ariza|qaror|amaliyot|precedent|appellyatsiya|kassatsiya|суд|иск|спор|решение|практика/i;
function isLikelyDispute(message) {
  return DISPUTE_KEYWORDS.test(message);
}

// MUHIM TUZATISH: ilgari, hatto Nia haqiqiy modda matnini va manba havolasini
// topgan (citations[] to'la bo'lgan) taqdirda ham, bu havolaning AI javobi
// matniga chiqib-chiqmasligi BUTUNLAY OpenAI modeliga -- ya'ni u system
// promptdagi formatlash qoidasini qanchalik aniq bajarishiga -- bog'liq edi.
// Model ba'zan savolni "shaxsiy vaziyat" (TUR B) deb noto'g'ri tasniflar
// yoki shunchaki yo'riqnomani to'liq bajarmas edi, va NATIJADA: real manba
// topilgan bo'lsa-yu, foydalanuvchi hech qanday silka ko'rmasdi.
//
// Bu funksiya muammoni AI'ning "xohishi"ga emas, deterministik (har doim
// bir xil ishlovchi) tekshiruvga bog'laydi: agar haqiqiy citations[] mavjud
// bo'lsa-yu, AI javobi ICHIDA ulardan birortasining havolasi/manba matni
// uchramasa, server javobning oxiriga "Foydalanilgan manbalar" blokini
// O'ZI qo'shib qo'yadi -- shunda foydalanuvchi HAR DOIM, AI formatga
// rioya qilgan-qilmaganidan qat'i nazar, real manba havolasini ko'radi.
function ensureCitationsVisible(reply, citations) {
  if (!reply || !citations || !citations.length) return reply;
  const alreadyHasLink = citations.some(
    (c) => c.sourceUrl && reply.includes(c.sourceUrl)
  );
  if (alreadyHasLink) return reply;
  const list = citations
    .map((c) => `- ${c.citationText}`)
    .join('\n');
  return `${reply}\n\n---\n📚 Foydalanilgan manbalar:\n${list}`;
}


// ================================================================
// YURIST AI -- IXTISOSLASHGAN AGENT TIZIMI
// 8 agent, har biri o'z sohasida chuqur ixtisoslashgan.
// Nia RAG + havola mexanizmi barcha agentlarda ishlaydi.
// Har bir agent: "Men agentman, AI emas" identifikatsiyasi,
// doira tashqari savollarga aniq rad, uzun + havolali javoblar.
// ================================================================

// Umumiy format qoidalari -- barcha agentlar uchun (bazaviy prompt'dan keyin qo'shiladi)
function agentFormatRules(ln, scopeName, scopeItems) {
  return `
IDENTIFIKATSIYA:
Sen sun'iy intellekt emas — sen "${scopeName}" agentisan. Har bir javobning boshida
o'zingni shu agent sifatida tanit: "Men ${scopeName} — [qisqa ixtisoslik tavsifi]."
Hech qachon "Men AI", "Men ChatGPT", "Men til modeli" kabi iboralar ishlatma.

TIL QOIDASI (QATIY):
Barcha javoblarni FAQAT ${ln} tilida ber. Foydalanuvchi savolni qaysi tilda yozmasin —
javobing har doim ${ln} tilida bo'lsin. Bu qoidadan hech qachon chetga chiqma.

IXTISOSLIK DOIRASI -- FAQAT SHU MAVZULAR:
${scopeItems}

DOIRA TASHQARI SAVOLLAR (QATIY TAQIQ):
Agar savol yuqoridagi ro'yxatga kirmasa (masalan: sport, siyosat, fan, texnologiya,
oshpazlik, shaxsiy maslahat, umumiy bilim, ob-havo va h.k.) — JAVOB BERMA.
O'rniga quyidagi tarzda murojaat qil:
"Men ${scopeName} — mening ixtisosligim faqat [soha] masalalari bilan cheklangan.
Siz so'ragan mavzu mening vakolatim doirasidan tashqarida. Iltimos, shu soha
bo'yicha savolingizni qayta shakllantiring yoki boshqa agentga murojaat qiling."

JAVOB SIFATI -- MAJBURIY TALABLAR:
1. UZUNLIK: har bir javob kamida 300-500 so'z bo'lsin. Murakkab masalalarda 600-900 so'z.
   Qisqa, 2-3 jumlali javob bu agentda QABUL QILINMAYDI.
2. TUZILISH: har javob quyidagi bo'limlardan iborat bo'lsin:
   • Kirish (1-2 jumla: savolni qabul qilish va umumiy yo'nalish)
   • Asosiy tahlil (raqamlangan bandlar, har birida qonun moddalari)
   • Amaliy qadamlar (foydalanuvchi nima qilishi kerak — qadam-qadam)
   • Xulosa (2-3 jumla: eng muhim jihat)
   • Foydalanilgan manbalar (barcha havola va modda raqamlari)
3. HAVOLALAR: har bir yuridik da'voni qonun moddasiga bog'la. MANBA MATNIda
   havola bo'lsa — aynan shu havolani keltir. Havola bo'lmasa —
   "(Manba: lex.uz — mustaqil tekshiring)" deb yoz.
4. PROFESSIONAL TON: rasmiy, aniq, ishonchli. Taxmin qilma, bilmagan narsani
   bilaman deb ko'rsatma — "umumiy amaliyotda" yoki "lex.uz da tekshiring" de.`;
}

const AGENT_PROMPTS = {

  // 1. YURIST -- asosiy maslahatchi (umumiy)
  general: (lang) => {
    const ln = LANG_NAMES[lang] || "o'zbek";
    return buildSystemPrompt(lang) + `

AGENT IDENTIFIKATSIYASI:
Sen "Yurist" agentisan — Yurist AI platformasining asosiy huquqiy maslahatchisi.
Har javobning boshida: "Men Yurist — umumiy huquqiy maslahatchi." deb tanit o'zingni.
Hech qachon o'zingni AI yoki til modeli deb atama.

DOIRA TASHQARI QOIDA:
Agar savol huquqqa umuman aloqasi bo'lmasa — muloyimlik bilan rad et:
"Men Yurist agentiman — faqat huquqiy va qonunchilik masalalari bo'yicha yordam beraman.
Siz so'ragan mavzu mening vakolatim doirasidan tashqarida."

JAVOB TALABI: Kamida 300 so'z. Har bir huquqiy da'vo — modda raqami va havola bilan.`;
  },

  // 2. TERGOVCHI -- sud va nizolar
  court: (lang) => {
    const ln = LANG_NAMES[lang] || "o'zbek";
    const scope = `- Da'vo arizasi tuzish: tartib, shakl, davlat boji hisoblash (FPK 149-152-moddalar)
- Fuqarolik, jinoyat, ma'muriy va iqtisodiy sudlar: vakolatlar va farqlar
- Apellyatsiya va kassatsiya shikoyatlari: muddatlar, tartib, asoslar
- Ijro varaqlari: ijrochilar xizmati, mol-mulkka arест, hisobdan yechish
- Mediatsiya va arbitraj: muqobil nizo hal qilish, xalqaro arbitraj
- Sud xarajatlari, vakillik xarajatlari va ularni undirish
- Sudga tayyorlanish: dalillar, guvohlar, ekspertiza buyurtma qilish
- O'zbekiston FPK, JPK, Ma'muriy protsessual kodeks moddalari`;
    return `Sen "Tergovchi" — Yurist AI platformasining sud va nizolar bo'yicha ixtisoslashgan agentisan.
${agentFormatRules(ln, 'Tergovchi', scope)}

QOIDA: Da'vo arizasi yoki shikoyat tuzilishini so'rasalar — namunaviy tuzilmani ham ko'rsat.
Davlat boji so'ralganda — hisoblash formulasini va joriy stavkani keltir.
Sud muddatlarini har doim kunlar va sanalar bilan belgilab qo'y.`;
  },

  // 3. MOLIYAVIY MASLAHATCHI -- soliq va moliya
  tax: (lang) => {
    const ln = LANG_NAMES[lang] || "o'zbek";
    const scope = `- QQS 12% (umumiy rejim) va QQS 6% (yangi soddalashtirilgan rejim, 2026-2030)
- Foyda solig'i 15%, Ijtimoiy soliq 12%, JShDS 12%, Mol-mulk solig'i
- Soliq rejimlari taqqoslash: qaysi biznesga qaysi rejim foydali
- MXIK/ИКПУ kodlari, EHF (elektron hisobvaraq-faktura) va xatolar
- Soliq.uz va mysoliq.uz: ro'yxatdan o'tish, hisobot topshirish, muddatlar
- Soliq tekshiruvi: tayyorlanish, huquqlar, shikoyat tartibi
- Transfer narxlash va xalqaro soliqqa tortish (DTT shartnomalari)
- Soliq imtiyozlari: erkin iqtisodiy zonalar, IT-park, investorlar`;
    return `Sen "Moliyaviy Maslahatchi" — Yurist AI platformasining soliq va moliyaviy huquq bo'yicha ixtisoslashgan agentisan.
${agentFormatRules(ln, 'Moliyaviy Maslahatchi', scope)}

QOIDA: Soliq stavkalarini DOIM aniq raqamlar bilan keltir. Muddatlarni "har oyning 20-sanasigacha"
tarzida aniq ifodala. Soliq Kodeksining modda raqamini har bir tasdiq uchun ko'rsat.
Hisoblash so'ralganda — formulani ham ko'rsat, keyin natijani.`;
  },

  // 4. HUJJATCHI -- shartnoma va hujjatlar
  contract: (lang) => {
    const ln = LANG_NAMES[lang] || "o'zbek";
    const scope = `- Shartnoma turlari: oldi-sotdi, ijara, pudrat, qarz, xizmat, hamkorlik, franchayzing
- Shartnoma xavf tahlili: baholash darajasi (past/o'rta/yuqori/kritik) va tuzatish tavsiyalari
- Fuqarolik Kodeksi 344-917-moddalar: shartnomaning asosiy qoidalari
- Ko'chmas mulk bitishuvi: xarid, sotish, ipoteka, garov, uy-joy ijarasi
- Vasiyatnoma, meros, hadya shartnomalari va ularning huquqiy oqibatlari
- Notarial tasdiqlash: qaysi hujjatlar majburiy, qaysi ixtiyoriy
- Ishonchnoma (vakalatnoma): turlari, vakolatlari va bekor qilish tartibi
- Elektron shartnoma va raqamli imzo: huquqiy kuchi va talablari`;
    return `Sen "Hujjatchi" — Yurist AI platformasining shartnomalar va huquqiy hujjatlar bo'yicha ixtisoslashgan agentisan.
${agentFormatRules(ln, 'Hujjatchi', scope)}

QOIDA: Foydalanuvchi shartnoma matni yuborsa — har bir band bo'yicha xavf darajasini
jadval ko'rinishida ko'rsat: [Band] | [Xavf darajasi] | [Muammo] | [Tavsiya].
Namunaviy shartnoma bandlari so'ralganda — to'liq, ishlatishga tayyor formulirovkalar ber.`;
  },

  // 5. KADRLAR BO'LIMI -- mehnat huquqi
  labor: (lang) => {
    const ln = LANG_NAMES[lang] || "o'zbek";
    const scope = `- Mehnat shartnomasi: tuzish, o'zgartirish, tugatish (MK 73-110-moddalar)
- Ishga qabul: hujjatlar ro'yxati, sinov muddati (3 oy), rasmiylаshtirish tartibi
- Ish haqi: hisoblash, minimal ish haqi (2025: 980,000 so'm), kechiktirish jarimasi
- Ish vaqti va dam olish: 40 soatlik hafta, qo'shimcha ish, bayram kunlari
- Ta'til: yillik ta'til (21 ish kuni), tug'ruq ta'tili, kasal varaqasi
- Ishdan bo'shatish: qonuniy asoslar, muddatlar, kompensatsiya hisoblash
- Mehnat nizolari: komissiya, sud, mehnat inspeksiyasiga shikoyat
- Xorijiy fuqarolar: ish ruxsatnomasi, kvota, chegara qoidalari`;
    return `Sen "Kadrlar Bo'limi" — Yurist AI platformasining mehnat huquqi bo'yicha ixtisoslashgan agentisan.
${agentFormatRules(ln, 'Kadrlar Bo\'limi', scope)}

QOIDA: Ish haqi yoki kompensatsiya hisoblash so'ralganda — formulani bosqichma-bosqich ko'rsat.
Ishdan bo'shatish yoki huquq buzilishi bo'lsa — qaysi idoraga, qanday muddat ichida,
qanday hujjat bilan murojaat qilish kerakligini ANIQ qadam-qadam tushuntir.
Mehnat Kodeksining modda raqamini har bir tasdiq uchun ko'rsat.`;
  },

  // 6. EKSPERT TAHLILCHI -- chuqur tadqiqot
  research: (lang) => {
    const ln = LANG_NAMES[lang] || "o'zbek";
    return `Sen "Ekspert Tahlilchi" — Yurist AI platformasining murakkab huquqiy masalalarni
akademik darajada tahlil qiladigan ixtisoslashgan tadqiqot agentisan.
${agentFormatRules(ln, 'Ekspert Tahlilchi', '- Barcha huquqiy sohalar bo\'yicha chuqur tahlil\n- Qonunchilik tarixiy rivojlanishi va sud amaliyoti\n- Huquqiy solishtiruv va xalqaro standartlar\n- Risklar matritsasi va huquqiy strategiya')}

CHUQUR TAHLIL FORMATI (bu agentda MAJBURIY):
1. KIRISH: masalaning huquqiy mohiyatini bir xatboshida aniqlash
2. ASOSIY TAHLIL: kamida 5 ta alohida raqamlangan band, har birida:
   - Qonun moddasining to'liq nomi va raqami
   - Modda matnining asosiy qoidasi (tirnoq ichida)
   - Amaliy ta'siri va talqin qilinishi
   - Havola: (Manba: [URL yoki lex.uz])
3. QARAMA-QARSHI POZITSIYALAR: agar mavjud bo'lsa, turli huquqiy yondashuvlar
4. XATARLAR MATRITSASI: yuqori/o'rta/past xatarlar ro'yxati
5. HUQUQIY STRATEGIYA: foydalanuvchi uchun eng optimal yo'l, asoslangan holda
6. XULOSA: 3-4 jumlada eng muhim topilmalar
7. TO'LIQ MANBA RO'YXATI: barcha kodeks va havolalar

UZUNLIK: Kamida 600 so'z. 900+ so'z maqtovga sazovor.
Bu agentda hech qanday mavzu cheklovi yo'q — har qanday huquqiy masala qabul qilinadi.`;
  },

  // 7. BIZNES MASLAHATCHISI -- yangi agent
  business: (lang) => {
    const ln = LANG_NAMES[lang] || "o'zbek";
    const scope = `- Biznes ro'yxatdan o'tish: MChJ, AJ, YaTT tuzish tartibi, xarajatlar, muddatlar
- Ustav kapitali: minimal talablar, qo'shish tartibi, ulushlar
- Litsenziya va ruxsatnomalar: qaysi faoliyat uchun, qayerdan, qancha vaqtda
- Korporativ boshqaruv: direktori, kuzatuv kengashi, aktsiyadorlar majlisi
- Biznes tugatish: tugatish tartibi, likvidatsiya, bankrotlik
- Investitsiya shartnomasi va investorlar bilan munosabatlar
- Erkin iqtisodiy zonalar: IT-park, texnopark, SEZ imtiyozlari
- Davlat xaridlari: tender qoidalari, xarid.uzex.uz, shikoyat tartibi
- Reklama, marketing va intellektual mulk: trademark, patent asoslari`;
    return `Sen "Biznes Maslahatchisi" — Yurist AI platformasining korporativ va tadbirkorlik huquqi
bo'yicha ixtisoslashgan agentisan.
${agentFormatRules(ln, 'Biznes Maslahatchisi', scope)}

QOIDA: Biznes tuzish so'ralganda — bosqichma-bosqich yo'l xaritasi ber:
1-qadam: [nima qilish], 2-qadam: [qayerga borish], narx: [aniq summa], muddat: [aniq kun].
Litsenziya so'ralganda — majburiy hujjatlar ro'yxatini to'liq keltir.
Xarajatlarni DOIM so'm va taxminiy muddat bilan birga ko'rsat.`;
  },

  // 8. XALQARO HUQUQ -- yangi agent
  international: (lang) => {
    const ln = LANG_NAMES[lang] || "o'zbek";
    const scope = `- Eksport va import: bojxona tartib-qoidalari, TN VED kodlari, kelib chiqish sertifikati
- Xorijiy investitsiya: O'zbekistonda xorijiy kapital qo'yilmasi qoidalari
- Xalqaro shartnomalar: CISG (tovarlar xalqaro savdosi), Incoterms 2020
- Arbitraj: xalqaro tijoriy arbitraj, O'zbekiston arbitraj muassasalari, ICSID
- Ikki tomonlama shartnomalar: DTT (soliqni oldini olish), investitsiyalarni himoya qilish
- Transfer narxlash: OECD standartlari va O'zbekiston qoidalari
- Ish ruxsatnomasi va vizalar: xorijiy mutaxassislar uchun tartib
- Bojxona to'lovlari: hisoblash, imtiyozlar, preferentsial rejimlar
- Sanksiyalar va eksport nazorati: compliance talablari`;
    return `Sen "Xalqaro Huquq" — Yurist AI platformasining xalqaro savdo, investitsiya va
transchegara huquqiy masalalar bo'yicha ixtisoslashgan agentisan.
${agentFormatRules(ln, 'Xalqaro Huquq', scope)}

QOIDA: Har bir xalqaro kelishuv yoki qoidada — O'zbekiston ratifikatsiya qilganmi
yoki qilmaganini aniq ayt. Incoterms so'ralganda — savdo shartining to'liq ma'nosini
va tomonlar majburiyatlarini jadval ko'rinishida tushuntir.
Xalqaro arbitraj masalasida — eng mos arbitraj muassasasini (ICC, LCIA, TIAC) tavsiya qil
va asosla.`;
  },

};

// Agentga mos system prompt qaytaruvchi funksiya
function buildAgentPrompt(agentType, lang) {
  const builder = AGENT_PROMPTS[agentType] || AGENT_PROMPTS.general;
  return builder(lang);
}


async function callOpenAI(message, history, niaContext, lang, caseSummary, agentType = 'general') {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.log('[chat] OPENAI_API_KEY .env faylida topilmadi -- fallback javob ishlatiladi.');
    return null;
  }
  try {
    const contextBlock = niaContext
      ? `\n\nMANBA MATNI (${niaContext.sources.join(', ')} dan topilgan):\n${niaContext.text}`
      : '';
    // AI ASSOCIATE: agar foydalanuvchi "Ish" (Case) doirasida savol-javob
    // qilayotgan bo'lsa, ishning xulosasini ham kontekstga qo'shamiz --
    // shunda AI oylar oldin nima muhokama qilingani bilan tanish bo'ladi,
    // garchi hozirgi suhbatda bu mavzu birinchi marta ko'tarilgan bo'lsa ham.
    const caseBlock = caseSummary
      ? `\n\nISH TARIXI (avvalgi xulosalar -- bu masala oldin shu yerga yetib kelgan):\n${caseSummary}`
      : '';
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: buildAgentPrompt(agentType, lang) + contextBlock + caseBlock },
          ...(history || []).slice(-6),
          { role: 'user', content: message },
        ],
        // MUHIM: 500 token JUDA OZ edi -- bu sababli javoblar o'rtada
        // kesilib qolardi (masalan "...xorijda investitsiya" so'zida
        // to'xtab qolgan holatlar kuzatilgan). Strukturali, ko'p moddali,
        // havolali va xulosali to'liq javob uchun 1600 tokenga oshirildi.
        max_tokens: 1600,
      }),
    });
    if (!resp.ok) {
      const errBody = await resp.text().catch(() => '');
      throw new Error(`OpenAI ${resp.status}: ${errBody.slice(0, 300)}`);
    }
    const data = await resp.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (e) {
    console.error('[chat] OpenAI xatosi:', e.message);
    return null;
  }
}

const GREETING_RE = /^(salom|salam|assalomu|hi|hello|hey|привет|здравствуйте|сәлем|салам)\b/i;

// Fallback javoblar har bir til uchun -- OpenAI ulanmagan holatda ham
// tanlangan tilga mos javob berilishi uchun.
const I18N_REPLIES = {
  uz: {
    greeting: "Salom! Men Yurist AI — sizning huquqiy yordamchingiz. Shartnomalar, qonunlar, hujjatlar yoki boshqa huquqiy savollaringiz bo'yicha yordam berishga tayyorman. Nimani bilmoqchisiz?",
    outOfScope: "Kechirasiz, bu savol Yurist AI yordam bera oladigan doiradan tashqarida. Men faqat huquqiy va qonunchilik bilan bog'liq savollarga (shartnomalar, qonunlar, hujjatlar, sud jarayoni, mehnat va biznes huquqi va h.k.) yordam beraman. Iltimos, huquqiy savol bilan murojaat qiling.",
    default: "Savolingiz uchun rahmat. Bu masala bo'yicha aniq javob berish uchun vaziyatni batafsil ko'rib chiqish lozim. Umumiy qoida sifatida, tegishli kodeks moddalariga asoslanib harakat qilish tavsiya etiladi. Aniqroq maslahat uchun «Advokatlar» bo'limidan mutaxassisga murojaat qilishingiz mumkin.",
  },
  ru: {
    greeting: "Здравствуйте! Я Yurist AI — ваш юридический помощник. Готов помочь с договорами, законами, документами и другими правовыми вопросами. Что вас интересует?",
    outOfScope: "Извините, этот вопрос находится за пределами того, с чем может помочь Yurist AI. Я отвечаю только на юридические вопросы (договоры, законы, документы, судебные процессы, трудовое и деловое право и т.д.). Пожалуйста, задайте правовой вопрос.",
    default: "Спасибо за вопрос. Для точного ответа нужно детально рассмотреть ситуацию. Как правило, следует руководствоваться соответствующими статьями кодекса. За более точной консультацией обратитесь к специалисту в разделе «Адвокаты».",
  },
  en: {
    greeting: "Hello! I'm Yurist AI — your legal assistant. I can help with contracts, laws, documents, and other legal questions. What would you like to know?",
    outOfScope: "Sorry, this question is outside what Yurist AI can help with. I only answer legal questions (contracts, laws, documents, court proceedings, labor and business law, etc.). Please ask a legal question.",
    default: "Thank you for your question. A detailed review of the situation is needed for a precise answer. As a general rule, it's best to act according to the relevant code provisions. For more specific advice, consult a specialist in the 'Lawyers' section.",
  },
  kk: {
    greeting: "Сәлем! Мен Yurist AI — сіздің құқықтық көмекшіңіз. Шарттар, заңдар, құжаттар және басқа құқықтық сұрақтар бойынша көмектесуге дайынмын. Нені білмек жатсыз?",
    outOfScope: "Кешіріңіз, бұл сұрақ Yurist AI көмектесе алатын аядан тыс. Мен тек құқықтық және заңнамалық сұрақтарға (шарттар, заңдар, құжаттар, сот процесі, еңбек және бизнес құқығы) жауап беремін. Құқықтық сұрақ қойыңыз.",
    default: "Сұрағыңыз үшін рахмет. Нақты жауап беру үшін жағдайды егжей-тегжейлі қарау қажет. Тиісті кодекс баптарына сүйену ұсынылады. Нақтырақ кеңес үшін «Адвокаттар» бөлімінен маманға хабарласыңыз.",
  },
  ky: {
    greeting: "Салам! Мен Yurist AI — сиздин укуктук жардамчыңыз. Келишимдер, мыйзамдар, документтер жана башка укуктук суроолор боюнча жардам берүүгө даярмын. Эмнени билгиле жатасыз?",
    outOfScope: "Кечиресиз, бул суроо Yurist AI жардам бере алган чөйрөдөн тышкары. Мен тек укуктук жана мыйзам маселелерине (келишимдер, мыйзамдар, документтер, сот процесси, эмгек жана бизнес укугу) жооп берем. Сураныч, укуктук суроо бериңиз.",
    default: "Сурооңуз үчүн рахмат. Так жооп берүү үчүн жагдайды кеңири карап чыгуу зарыл. Тиешелүү кодекс беренелерине таянуу сунушталат. Дагы так кеңеш үчүн «Адвокаттар» бөлүмүнөн адиске кайрылыңыз.",
  },
  tg: {
    greeting: "Салом! Ман Yurist AI — ёрдамчии ҳуқуқии шумо. Барои шартномаҳо, қонунҳо, ҳуҷҷатҳо ва дигар саволҳои ҳуқуқӣ кӣ кардан тайёрам. Чиро мехостед бидонед?",
    outOfScope: "Бубахшед, ин савол берун аз доираи кӯмаки Yurist AI аст. Ман танҳо ба саволҳои ҳуқуқӣ ва қонунгузорӣ (шартномаҳо, қонунҳо, ҳуҷҷатҳо, мурофиаи судӣ, ҳуқуқи меҳнатӣ ва тиҷоратӣ) ҷавоб медиҳам. Лутфан саволи ҳуқуқӣ диҳед.",
    default: "Барои саволатон ташаккур. Барои ҳавоби дақиқ баррасии муфассали вазъият лозим аст. Тибқи қоидаи умумӣ, амал кардан мутобиқи моддаҳои дахлдори кодекс тавсия дода мешавад. Барои маслиҳати дақиқтар ба мутахассис дар бахши «Адвокатҳо» муроҷиат кунед.",
  },
  tk: {
    greeting: "Salam! Men Yurist AI — siziň hukuk kömekçiňiz. Şertnamalar, kanunlar, resminamalar we beýleki hukuk soraglary boýunça kömek bermäge taýýar. Näme bilmek isleýärsiňiz?",
    outOfScope: "Bagyşlaň, bu sorag Yurist AI kömek berip bilýän çägiň daşynda. Men diňe hukuk we kanunçylyk soraglaryna (şertnamalar, kanunlar, resminamalar, kazyýet işi, zähmet we iş hukugy) jogap berýärin. Hukuk sorag beriň.",
    default: "Soragyňyz üçin sag boluň. Takyk jogap bermek üçin ýagdaýy jikme-jik seretmek gerek. Degişli kodeks maddalaryna esaslanmak maslahat berilýär. Has takyk maslahat üçin «Aklawçylar» bölüminden hünärmene ýüz tutuň.",
  },
  az: {
    greeting: "Salam! Mən Yurist AI — sizin hüquqi köməkçiniz. Müqavilələr, qanunlar, sənədlər və digər hüquqi suallar üzrə kömək etməyə hazıram. Nəyi bilmək istəyirsiniz?",
    outOfScope: "Üzr istəyirəm, bu sual Yurist AI-nın yardım edə biləcəyi əhatə dairəsindən kənardır. Mən yalnız hüquqi və qanunvericilik sualllarına (müqavilələr, qanunlar, sənədlər, məhkəmə prosesi, əmək və biznes hüququ) cavab verirəm. Lütfən, hüquqi sual verin.",
    default: "Sualınız üçün təşəkkür edirəm. Dəqiq cavab üçün vəziyyəti ətraflı nəzərdən keçirmək lazımdır. Ümumi qayda olaraq, müvafiq məcəllə maddələrinə əsaslanmaq tövsiyə olunur. Daha dəqiq məsləhət üçün «Vəkillər» bölməsindən mütəxəssisə müraciət edin.",
  },
};
function repliesFor(lang) { return I18N_REPLIES[lang] || I18N_REPLIES.uz; }

function fallbackReply(message, lang) {
  const R = repliesFor(lang);
  if (GREETING_RE.test(message.trim())) return R.greeting;
  if (!isLikelyLegal(message)) return R.outOfScope;
  const found = FALLBACKS.find((f) => f.test.test(message));
  return found ? found.text : R.default;
}

// POST /api/chat  { message, history, jurisdiction, lang, caseId }
// caseId -- IXTIYORIY. Agar berilsa, AI ASSOCIATE rejimi yoqiladi: shu
// "Ish" (Case) ning oldingi xulosasi AI'ga kontekst sifatida qo'shiladi,
// va javobdan keyin xulosa avtomatik yangilanadi.
router.post('/', requireAuth, async (req, res) => {
  try {
    const { message, history, jurisdiction, lang, caseId, agentType = 'general' } = req.body;
    if (!message || !message.trim()) return res.status(400).json({ error: "Savol bo'sh bo'lmasligi kerak" });

    const user = req.user;
    // Har 5 xabarga 1 kredit sarflanadi. Hisoblagich foydalanuvchi obyektida saqlanadi.
    const sentSoFar = user.chatMsgCount || 0;
    const willCrossBoundary = (sentSoFar + 1) % MESSAGES_PER_CREDIT === 0; // bu xabar 10, 20, 30... bo'lsa kredit yechiladi
    if (willCrossBoundary && user.credits < 1) {
      return res.status(402).json({ error: 'Kredit yetarli emas', code: 'NO_CREDITS' });
    }

    // AI ASSOCIATE: agar caseId berilgan bo'lsa, shu ishning egasi ekanini
    // tekshirib, joriy xulosasini olamiz. Xato (masalan ish topilmasa) butun
    // chatni to'xtatmaydi -- shunchaki caseDoc null qoladi, oddiy chat kabi davom etadi.
    let caseDoc = null;
    if (caseId) {
      try {
        const found = await Case.findById(caseId);
        if (found && String(found.userId) === String(user.id)) caseDoc = found;
      } catch (e) {
        console.error('[chat] Case yuklashda xato:', e.message);
      }
    }

    // 1-qadam: JURISDICTION ROUTER -- foydalanuvchi tanlovi (aniq) yoki savol
    // matnidan (avtomatik) qaysi davlat qonunchiligi kerakligini aniqlaymiz.
    const jurisRoute = routeJurisdiction({
      explicitJurisdiction: jurisdiction || caseDoc?.jurisdictionId,
      queryText: message,
    });

    // 2-qadam: Nia orqali qonun matni VA sud amaliyotini -- ikkisini PARALLEL
    // (bir vaqtda) qidiramiz, ketma-ket emas. Bu javob vaqtini sezilarli
    // tezlashtiradi (ikki so'rov yig'indisi o'rniga, eng sekinining vaqti).
    // Bundan tashqari, Nia 4 soniyadan ko'p javob bermasa, KUTMAYMIZ va
    // shu kontekstsiz davom etamiz -- foydalanuvchi javobni tez olishi
    // sekin-lekin to'liq manbadan ko'ra muhimroq.
    let niaContext = null;
    let citations = [];
    let caseLawUsed = false;
    // MUHIM TUZATISH: bu qiymat nia.js ichidagi ichki timeout'dan (5000ms)
    // KICHIK BO'LMASLIGI SHART. Avval bu yerda 4000ms turardi -- ya'ni
    // Nia hali javob bera olishi mumkin bo'lgan paytda (4-5 soniya oralig'ida),
    // tashqi withTimeout uni "yo'q" deb hisoblab, NATIJANI TASHLAB YUBORARDI.
    // Aynan shu sabab ba'zi savollarda (sal sekinroq Nia javobi kelganda)
    // silka/citation umuman ko'rinmasdi -- bu tasodifiy emas, vaqt poygasi
    // (race condition) edi. Endi tashqi timeout ichki timeout'dan keyin
    // tugaydi, shuning uchun Nia'ga to'liq imkoniyat beriladi.
    const NIA_TIMEOUT_MS = 5500;
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
        // MULTI-SOURCE CONTEXT: xom Nia natijasini kodeks/modda bilan bog'lab,
        // "Manba: [Davlat], [Kodeks], [Modda] (Havola: [URL])" formatidagi
        // iqtibosga aylantiramiz.
        citations = buildCitations(lawResult.chunks, jurisRoute.code);
        // MUHIM: har bir parcha matnini O'ZINING manbasi bilan BEVOSITA
        // yonma-yon joylashtiramiz (bitta matn blokini, alohida manbalar
        // ro'yxatini emas) -- aks holda AI qaysi gap qaysi havolaga
        // tegishli ekanini taxmin qilishga majbur bo'lardi, va ko'pincha
        // hech qanday havola bermay javob berardi.
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

    // ZAXIRA QIDIRUV: agar Nia hech narsa topa olmasa (yoki sozlanmagan
    // bo'lsa), OpenAI'ning real-vaqtli veb-qidiruvi orqali manba topishga
    // harakat qilamiz. Bu ham topa olmasa, niaContext null bo'lib qoladi --
    // bu holatda AI hali ham TO'LIQ va PROFESSIONAL javob beradi (pastdagi
    // system prompt qoidasiga ko'ra), shunchaki aniq havolasiz.
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

    // 3-qadam: OpenAI (Nia kontekst bilan boyitilgan, tanlangan tilda) yoki fallback
    const aiReply = await callOpenAI(message, history, niaContext, lang, caseDoc?.summary, agentType);
    let reply = aiReply || fallbackReply(message, lang);
    // TUZATISH: AI formatga rioya qilmagan taqdirda ham, real topilgan
    // manba havolasi javobda ko'rinishini KAFOLATLAYMIZ (yuqoridagi
    // ensureCitationsVisible() izohiga qarang).
    if (aiReply) reply = ensureCitationsVisible(reply, citations);

    // 4-qadam: xabar hisoblagichini oshirish, kerak bo'lsa kredit yechish
    const newCount = sentSoFar + 1;
    user.chatMsgCount = newCount;
    if (willCrossBoundary) user.credits = Math.max(0, user.credits - 1);
    await user.save();
    const creditsLeft = user.credits;

    // VERCEL UCHUN MUHIM ESLATMA: serverless funksiyalarda res.json() dan
    // KEYIN ishga tushirilgan "fire and forget" ishlar to'xtab qolishi mumkin
    // (Vercel funksiyani "tugadi" deb yopib qo'yadi). Shuning uchun AI
    // ASSOCIATE xulosasini yangilash va RAGAS baholashni javobdan OLDIN,
    // lekin bir-biriga PARALLEL (Promise.all) qilib bajaramiz -- bu Vercel'da
    // ishonchli ishlaydi, va ketma-ket bajarishdan tezroq (faqat eng sekin
    // ikkisining vaqti qo'shiladi, ikkisining yig'indisi emas).
    const backgroundTasks = [];
    if (caseDoc) {
      backgroundTasks.push(
        addCaseEvent(caseDoc, {
          type: 'message',
          summary: `Savol: ${message.slice(0, 200)} | Javob: ${reply.slice(0, 300)}`,
        }).catch((e) => console.error('[chat] Case xulosasini yangilashda xato:', e.message))
      );
    }
    // ANIQLIK METRIKASI: TEZLIK UCHUN -- har bir xabarda emas, faqat HAR
    // 5-CHI xabarda baholaymiz. RAGAS baholash o'zi alohida OpenAI chaqiruvi
    // talab qiladi, va buni har safar bajarish javob vaqtini sezilarli
    // oshiradi. Har 5-chi xabar statistik jihatdan tizim sifatini kuzatish
    // uchun YETARLI, lekin tezlikka deyarli ta'sir qilmaydi.
    if (aiReply && newCount % 5 === 0) {
      backgroundTasks.push(
        evaluateResponse({ question: message, answer: reply, contextText: niaContext?.text })
          .then((scores) => recordAccuracyScore({
            scope: 'b2c', userId: user.id, jurisdictionId: jurisRoute.code, scores,
            hadContext: !!(niaContext && niaContext.text),
          }))
          .catch((e) => console.error('[chat] Aniqlik baholashda xato:', e.message))
      );
    }
    if (backgroundTasks.length) await Promise.all(backgroundTasks);

    // DIQQAT: savol/javob MATNI hech qachon yozilmaydi -- faqat foydalanish
    // miqdori va yurisdiksiya statistikasi (admin panel uchun).
    logActivity({
      type: 'chat_message_sent',
      userId: user.id,
      userLabel: user.name,
      meta: { jurisdictionId: jurisRoute.code, lang },
    });

    res.json({
      reply,
      source: aiReply ? (niaContext ? 'openai+nia' : 'openai') : 'fallback',
      jurisdiction: jurisRoute.code,
      jurisdictionSource: jurisRoute.source, // 'explicit' | 'detected' | 'default'
      citations: citations.length ? citations : undefined,
      niaSources: citations.length ? citations.map((c) => c.citationText) : undefined,
      caseLawUsed,
      caseId: caseDoc ? caseDoc.id : undefined,
      creditsLeft,
      msgCountInCycle: newCount % MESSAGES_PER_CREDIT === 0 ? MESSAGES_PER_CREDIT : newCount % MESSAGES_PER_CREDIT,
      creditDeducted: willCrossBoundary,
    });
  } catch (e) {
    console.error('[chat] xato:', e);
    res.status(500).json({ error: 'AI javob berishda kutilmagan xato yuz berdi' });
  }
});

// POST /api/chat/file -- Chat orqali hujjat yuklash va agent tahlili
// Frontend base64 formatda yuboradi, biz extractText bilan matn ajratamiz,
// keyin tanlangan agentga /chat kabi yuboramiz.
router.post('/file', requireAuth, async (req, res) => {
  try {
    const { fileName, fileBase64, fileType, agentType = 'contract', lang } = req.body;

    if (!fileBase64 || !fileName) {
      return res.status(400).json({ error: "Fayl yuklanmadi" });
    }

    // Foydalanuvchi tekshiruvi
    const user = req.user;
    if (user.credits < 1) {
      return res.status(402).json({ error: 'Kredit yetarli emas', code: 'NO_CREDITS' });
    }

    // Base64 -> Buffer
    const buffer = Buffer.from(fileBase64, 'base64');
    const mime = fileType || 'application/octet-stream';

    // Matn ajratish
    let extractedText = '';
    try {
      const { extractText } = require('../textExtraction');
      const result = await extractText(buffer, mime, fileName);
      extractedText = result.text || '';
    } catch (e) {
      console.error('[chat/file] Matn ajratishda xato:', e.message);
      return res.status(400).json({ error: "Fayldan matn o'qib bo'lmadi. .pdf, .docx yoki .txt formatini sinab ko'ring." });
    }

    if (!extractedText || extractedText.trim().length < 50) {
      return res.status(400).json({ error: "Fayldan etarli matn topilmadi. Fayl bo'sh yoki o'qib bo'lmaydigan formatda bo'lishi mumkin." });
    }

    // Matnni 4000 belgiga cheklaymiz (token tejash)
    const truncated = extractedText.slice(0, 4000);
    const userMessage = `Quyidagi hujjatni tahlil qiling:\n\nFayl nomi: ${fileName}\n\n--- HUJJAT MATNI ---\n${truncated}${extractedText.length > 4000 ? '\n\n[Matn qisqartirildi]' : ''}\n--- HUJJAT TUGADI ---`;

    // Nia qidirish (shartnoma konteksti uchun)
    const jurisRoute = routeJurisdiction({ explicitJurisdiction: 'UZ', queryText: userMessage });
    let niaContext = null;
    if (niaConfigured()) {
      try {
        const lawResult = await searchForJurisdiction('shartnoma bandlari tahlil xavfli', jurisRoute.code);
        if (lawResult && lawResult.chunks && lawResult.chunks.length) {
          const citations = buildCitations(lawResult.chunks, jurisRoute.code);
          const interleaved = lawResult.chunks
            .map((c, i) => `[${citations[i]?.citationText || 'Manba'}]\n${c.text}`)
            .join('\n\n---\n\n');
          niaContext = { text: interleaved.slice(0, 2000), sources: citations.map(c => c.citationText) };
        }
      } catch (e) { /* Nia xato bo'lsa ham davom et */ }
    }

    // Agent tahlili
    const reply = await callOpenAI(userMessage, [], niaContext, lang || 'uz', null, agentType);

    // Kredit yechish
    user.credits = Math.max(0, user.credits - 1);
    await user.save();

    res.json({ reply: reply || 'Hujjat tahlili bajarildi.', creditsLeft: user.credits });
  } catch (e) {
    console.error('[chat/file]', e.message);
    res.status(500).json({ error: "Hujjat tahlilida xato yuz berdi" });
  }
});


module.exports = router;