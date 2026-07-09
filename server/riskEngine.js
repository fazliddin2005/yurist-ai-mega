// riskEngine.js -- Shartnoma xavf tahlili dvigatel
// API ishlatmaydi -- sof regex + lingvistik tahlil
// 8 til: uz, ru, en, kk, ky, tg, tk, az
// Barcha valyutalar qo'llab-quvvatlanadi

'use strict';

const CHECKS = [
  {
    key: 'tomonlar', label: 'Tomonlar', sev: 'high',
    re: /tomon|fio|passport|stir|mchj|mas.?uliyati|сторон|фио|паспорт|инн|ооо|зао|ип\b|party|parties|llc|llp|ltd|inc\b|corp\b|represented by|hereinafter|organiz|директор|director|компани|company|address|адрес|manzil|bin\b|tin\b|bic\b|тарап|тараф|тараф|tarap|tərəf/i,
    bad: "Tomonlarning rekvizitlari (ism, tashkilot nomi, manzil, ro'yxat raqami) aniq ko'rsatilmagan.",
  },
  {
    key: 'predmet', label: 'Shartnoma predmeti', sev: 'high',
    re: /predmet|mol.?mulk|xizmat|tovar|ish baj|yetkazib|sotib ol|sotib ber|ijara|qurilish|предмет|объект|услуг|товар|работ|поставк|аренд|купл|продаж|выполнен|subject of|scope of|services|goods|works|lease|purchase|sale|supply|exhibition|участи|площадь|participation|space|rental|нысан|мавзу/i,
    bad: "Shartnoma predmeti (nima sotilayapti yoki ko'rsatilayapti) aniq yozilmagan.",
  },
  {
    key: 'narx', label: "Narx va to'lov", sev: 'high',
    re: /so.?m\b|сум\b|uzs|usd|eur|kzt|rub|\$\s*\d|\d\s*\$|€\s*\d|\d\s*€|dollar|евро|рубл|тенге|narx|цена|price|cost|стоимост|to.?lov|оплат|payment|бағасы|нарх|сумм|amount|total|итого|predoplat|предоплат|prepay|аванс|advance|million|миллион|thousand|тысяч|ming\b/i,
    bad: "Shartnomada narx yoki to'lov shartlari aniq ko'rsatilmagan.",
  },
  {
    key: 'muddat', label: 'Muddat va sana', sev: 'med',
    re: /\d{1,2}[.\-\/]\d{1,2}[.\-\/]\d{2,4}|20\d\d[\s\-.]|yanvar|fevral|mart\b|aprel|iyun|iyul|avgust|sentabr|oktabr|noyabr|dekabr|январ|феврал|март\b|апрел|май\b|июн|июл|август|сентябр|октябр|ноябр|декабр|january|february|march|april|june|july|august|september|october|november|december|muddat|срок|term\b|duration|validity|period|мерзім|действует|kuchga kir/i,
    bad: "Shartnomaning muddati (boshlanish va tugash sanasi) ko'rsatilmagan.",
  },
  {
    key: 'jarima', label: 'Javobgarlik va jarima', sev: 'med',
    re: /jarima|штраф|penalty|fine\b|penya|пеня|неустойк|javobgar|ответствен|liable|liability|зиён|убытк|damages|компенсац|0[.,]1\s*%|0[.,]5\s*%|\d+\s*%\s*(?:dan|за|for)|айыппұл|айыппул|cərimə|jerime/i,
    bad: "Majburiyatlar buzilganda javobgarlik va jarima miqdori ko'rsatilmagan.",
  },
  {
    key: 'bekor', label: 'Bekor qilish tartibi', sev: 'med',
    re: /bekor|расторж|расторг|termination|terminate|cancel|bir tomonlama|односторон|unilateral|ogohlantir|уведомл|notify|notice|бекор|бұзу|бузуу|xitam/i,
    bad: "Shartnomani bekor qilish tartibi va muddatlari ko'rsatilmagan.",
  },
  {
    key: 'nizo', label: 'Nizolarni hal qilish', sev: 'low',
    re: /nizo|спор|dispute|conflict|sud\b|суд|court|tribunal|arbitr|арбитраж|mediatsiya|медиац|muzokara|переговор|negotiat|межрайонн|economic court|хозяйствен/i,
    bad: "Nizolarni hal qilish tartibi (sud, arbitraj, muzokaralar) ko'rsatilmagan.",
  },
  {
    key: 'imzo', label: "Imzo bo'limi", sev: 'low',
    re: /imzo|подпис|signature|signed|м\.п\.?|печат|print|директор|director|уполномоч|authorized|muhur|stamp|қолтаңба|имзо|imza/i,
    bad: "Imzo va muhur uchun joy ko'rsatilmagan.",
  },
];

const RED_FLAGS = [
  {
    sev: 'high',
    re: /istalgan vaqtda.*bekor|at any time.*terminat|without.{0,20}(?:cause|reason|notice)\b|в любой момент.*раст/i,
    exclude: /force.?majeur|форс.?мажор|favqulodda/i,
    msg: "«Istalgan vaqtda sababsiz bekor qilish» — bir tomon uchun adolatsiz band.",
  },
  {
    sev: 'high',
    re: /(?:xaridor|sotuvchi|buyer|seller|client)\s+(?:hech\s+qanday\s+)?javobgar\s+emas|не\s+несет\s+(?:никакой\s+)?ответствен|not\s+liable\s+for\s+any/i,
    exclude: /ni odna|ни одна|neither party|force.?majeur|форс.?мажор|favqulodda|har ikki tomon|обе стороны/i,
    msg: "Faqat bir tomon javobgarlikdan ozod qilingan — adolatsiz band.",
  },
];

function checkBlanks(text) {
  // Imzo qatorlarini oldindan tozalash -- ular bo'sh joy hisoblanmasin
  // "_________ Иванов М.П." yoki "Директор _________ Komilov" imzo joylari
  const cleanedText = text
    .replace(/_{3,}[	 ]*(?:[A-Za-zÀ-ɏЀ-ӿ.\s]{0,40})(?:М\.?П\.?|M\.?[OP]\.?)/g, '__SIGN__')
    .replace(/(?:директор|Директор|Director|sotuvchi|xaridor|imzo)[\s:]*_{3,}/gi, '__SIGN__')
    .replace(/_{3,}[	 ]*(?:[A-ZА-Я][a-zа-я]+\s+[A-ZА-Я]\.)/g, '__SIGN__');
  const blanks = (cleanedText.match(/_{3,}|\[_{2,}\]|\[\s*\]/g) || []).length;
  if (blanks >= 3) {
    return {
      findings: [{
        sev: 'high', key: 'blank_fields',
        title: `To'ldirilmagan maydonlar: ${blanks} ta bo'sh joy`,
        body: `Hujjatda ${blanks} ta to'ldirilmagan maydon aniqlandi. Imzolashdan oldin barcha bo'sh joylar (tomonlar ismi, summa, sana, manzil) to'ldirilishi shart. To'ldirilmagan shartnomaning yuridik kuchi bo'lmaydi.`,
      }],
      penalty: blanks >= 8 ? 45 : blanks >= 5 ? 30 : 18,
    };
  }
  if (blanks >= 1) {
    return {
      findings: [{
        sev: 'med', key: 'blank_fields',
        title: `${blanks} ta to'ldirilmagan maydon`,
        body: `Imzolashdan oldin shu ${blanks} ta bo'sh joyni to'ldiring.`,
      }],
      penalty: blanks * 6,
    };
  }
  return { findings: [], penalty: 0 };
}

function checkPrice(text) {
  const hasPriceWord = /narx|цена|price|cost|стоимост|to.?lov|оплат|payment|сумм|amount/i.test(text);
  const hasActualPrice =
    /\d[\d\s,.']*\s*(?:so.?m\b|сум|uzs|usd|eur|kzt|rub|\$|€|£|dollar|евро|рубл|тенге|thousand|тысяч|ming\b|million|миллион)/i.test(text) ||
    /(?:fifty|hundred|thousand|million|пятьдесят|сто|тысяч|миллион|elli|yuz|ming\b)\s+(?:thousand\s+)?(?:us\s+)?(?:dollars?|euros?|сум|тенге)/i.test(text) ||
    /(?:total|общая\s+сумма|contract\s+amount|общий\s+размер)[^.]{0,80}\d/i.test(text);

  if (hasPriceWord && !hasActualPrice) {
    return {
      findings: [{
        sev: 'med', key: 'price_blank',
        title: "Narx miqdori aniq ko'rsatilmagan",
        body: "Shartnomada narx bandi bor, lekin aniq pul miqdori (raqam va valyuta) ko'rsatilmagan. Imzolashdan oldin to'lov summasini aniq yozing.",
      }],
      penalty: 10,
    };
  }
  return { findings: [], penalty: 0 };
}

function getCtx(text, idx, len, r) {
  return text.slice(Math.max(0, idx - r), Math.min(text.length, idx + len + r));
}

function analyzeText(text) {
  const t = (text || '').replace(/\r\n/g, '\n');
  const readable = t.replace(/\s/g, '').length > 40;
  if (!readable) return { score: null, tier: 'unknown', readable: false, findings: [] };

  const findings = [];
  let earned = 0, total = 0;

  const blankRes = checkBlanks(t);
  findings.push(...blankRes.findings);

  for (const c of CHECKS) {
    const w = c.sev === 'high' ? 22 : c.sev === 'med' ? 14 : 8;
    total += w;
    if (c.re.test(t)) {
      earned += w;
    } else {
      findings.push({ sev: c.sev, key: c.key, title: `${c.label} — yetishmayapti`, body: c.bad });
    }
  }

  const priceRes = checkPrice(t);
  findings.push(...priceRes.findings);

  let redPenalty = 0;
  for (const rf of RED_FLAGS) {
    const m = rf.re.exec(t);
    if (m) {
      const ctx = getCtx(t, m.index, m[0].length, 200);
      if (rf.exclude && rf.exclude.test(ctx)) continue;
      findings.push({ sev: rf.sev, key: 'red_flag', title: 'Adolatsiz band aniqlandi', body: rf.msg });
      redPenalty += rf.sev === 'high' ? 15 : 8;
    }
  }

  const raw = total > 0 ? (earned / total) * 100 : 0;
  const score = Math.max(0, Math.min(100, Math.round(raw - blankRes.penalty - priceRes.penalty - redPenalty)));
  const tier = score >= 80 ? 'good' : score >= 50 ? 'med' : 'bad';
  const effectiveTier = blankRes.penalty >= 30 ? 'bad' : blankRes.penalty >= 18 && tier === 'good' ? 'med' : tier;

  return { score, tier: effectiveTier, readable, findings };
}

module.exports = { analyzeText };
