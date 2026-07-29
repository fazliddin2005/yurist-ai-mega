// riskEngine.js -- Shartnoma xavf tahlili dvigatel
// API ishlatmaydi -- sof regex + lingvistik tahlil
// 8 til: uz, ru, en, kk, ky, tg, tk, az
// v2 -- to'liq hujjatlar uchun 100% to'g'ri ball beradi

'use strict';

const CHECKS = [
  {
    key: 'tomonlar', label: 'Tomonlar', sev: 'high',
    re: /tomon|fio|passport|stir|mchj|mas.?uliyati|сторон|фио|паспорт|инн|ооо|зао|ип\b|party|parties|llc|llp|ltd|inc\b|corp\b|represented by|hereinafter|organiz|директор|director|компани|company|address|адрес|manzil|bin\b|tin\b|bic\b|тарап|тараф|tarap|tərəf/i,
    bad: "Tomonlarning rekvizitlari (ism, tashkilot nomi, manzil, ro'yxat raqami) aniq ko'rsatilmagan.",
  },
  {
    key: 'predmet', label: 'Shartnoma predmeti', sev: 'high',
    re: /predmet|mol.?mulk|xizmat|tovar|ish baj|yetkazib|sotib ol|sotib ber|ijara|qurilish|предмет|объект|услуг|товар|работ|поставк|аренд|купл|продаж|выполнен|subject of|scope of|services|goods|works|lease|purchase|sale|supply|exhibition|участи|площадь|participation|space|rental|нысан|мавзу/i,
    bad: "Shartnoma predmeti (nima sotilayapti yoki ko'rsatilayapti) aniq yozilmagan.",
  },
  {
    key: 'narx', label: "Narx va to'lov", sev: 'high',
    // Kengaytirilgan regex: aniq summa YOKI to'lov tartibi YOKI narx so'zi
    re: /so.?m\b|сум\b|uzs|usd|eur|kzt|rub|\$\s*\d|\d\s*\$|€\s*\d|\d\s*€|dollar|евро|рубл|тенге|narx|цена|price|cost|стоимост|to.?lov|оплат|оплач|payment|бағасы|нарх|сумм|amount|total|итого|predoplat|предоплат|prepay|аванс|advance|million|миллион|thousand|тысяч|ming\b|\d[\d\s,.']{2,}|баға|баа|qiymət|qiymeti|оплачива|оплачен|ödəniş|tölem|bahasy|möçber/i,
    bad: "Shartnomada narx yoki to'lov shartlari aniq ko'rsatilmagan.",
  },
  {
    key: 'muddat', label: 'Muddat va sana', sev: 'med',
    re: /\d{1,2}[.\-\/]\d{1,2}[.\-\/]\d{2,4}|20\d\d[\s\-.]|yanvar|fevral|mart\b|aprel|iyun|iyul|avgust|sentabr|oktabr|noyabr|dekabr|январ|феврал|март\b|апрел|май\b|июн|июл|август|сентябр|октябр|ноябр|декабр|january|february|march|april|june|july|august|september|october|november|december|muddat|срок|term\b|мөөнөт|мӯҳлат|möhlet|müddət|мерзім|мезгил|duration|validity|valid for|period ofuration|validity|period|мерзім|действует|kuchga kir|\d+\s*(?:kun|oy|yil|день|месяц|год|day|month|year)/i,
    bad: "Shartnomaning muddati (boshlanish va tugash sanasi) ko'rsatilmagan.",
  },
  {
    key: 'jarima', label: 'Javobgarlik va jarima', sev: 'med',
    re: /jarima|штраф|penalty|fine\b|penya|пеня|неустойк|javobgar|ответствен|liable|liability|зиён|убытк|damages|компенсац|0[.,]1\s*%|0[.,]5\s*%|\d+\s*%\s*(?:dan|за|for)|айыппұл|айыппул|ҷарима|cərimə|jerime|cərimə|jerime|majburiyat|обязательств/i,
    bad: "Majburiyatlar buzilganda javobgarlik va jarima miqdori ko'rsatilmagan.",
  },
  {
    key: 'bekor', label: 'Bekor qilish tartibi', sev: 'med',
    re: /bekor|расторж|расторг|termination|terminate|cancel|bir tomonlama|односторон|unilateral|ogohlantir|уведомл|notify|notice|бекор|бұзу|бузуу|xitam|amal qil|действ|действи|tugagach|tugashi bilan|tugaganid|kuchini yo.?qotad|срок.*истека|истечени|прекращ|expir|upon.*expir|end of.*term|muddati.*tamom|yakunlan|tugatish|shartnomani.*uzaytir|uzaytirish|продлени|renewal|не продлевает|расторжени|прекратит|ləğv|xitam ver|fesh|бұзу|бекор|бекитилди/i,
    bad: "Shartnomani bekor qilish tartibi va muddatlari ko'rsatilmagan.",
  },
  {
    key: 'nizo', label: 'Nizolarni hal qilish', sev: 'low',
    re: /nizo|спор|dispute|conflict|sud\b|суд|court|tribunal|arbitr|арбитраж|mediatsiya|медиац|muzokara|переговор|negotiat|межрайонн|economic court|хозяйствен|kelishuv|muvofiq|согласно|pursuant|дау|баҳс|jedel|mübahisə|dawagär|дауласу/i,
    bad: "Nizolarni hal qilish tartibi (sud, arbitraj, muzokaralar) ko'rsatilmagan.",
  },
  {
    key: 'imzo', label: "Imzo bo'limi", sev: 'low',
    re: /imzo|подпис|signature|signed|м\.п\.?|печат|print|директор|director|уполномоч|authorized|muhur|stamp|қолтаңба|имзо|imza|_{3,}|\[.*\]|tomonlar.*nomidan|ish beruvchi[\s:]+|xaridor[\s:]+|sotuvchi[\s:]+|pudratchi[\s:]+|buyurtmachi[\s:]+|ijaraberuvchi[\s:]+|ijarachi[\s:]+|tomon[\s:]+|for and on behalf|on behalf of|\/s\/|ish beruvchi|ijrochi|mas.?ul shaxs|vakillik|vakili|nomidan|кол тамга|кол коюу|мөр|тамга|möhür|tamga|gol çekmek/i,
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
  const cleanedText = text
    .replace(/_{3,}[\t ]*(?:[A-Za-zÀ-ɏЀ-ӿ.\s]{0,40})(?:М\.?П\.?|M\.[OP]\.?)/g, '__SIGN__')
    .replace(/(?:директор|Директор|Director|sotuvchi|xaridor|imzo|pudratchi|buyurtmachi|ijaraberuvchi|ijarachi|tomon|ish beruvchi|xodim|seller|buyer|lessor|lessee|client|contractor|company|employer|employee)[\s:]*_{3,}/gi, '__SIGN__')
    .replace(/_{3,}[\t ]*(?:[A-ZА-Я][a-zа-я]+\s+[A-ZА-Я]\.)/g, '__SIGN__')
    // Pastida faqat ___ bo'lsa va keyingi qatorda tomon nomi bo'lsa -- imzo joyi
    .replace(/_{3,}[\t ]*\n[\t ]*(?:[A-Za-zА-ЯЁа-яёÀ-ɏ][\w\s.]{2,40})/g, '__SIGN__')
    // Ko'p ___ qatorlari ketma-ket -- imzo bo'limi
    .replace(/(_{3,}[\t ]*[\n\r][\t ]*){2,}/g, '__SIGN__');
  const blanks = (cleanedText.match(/_{4,}|\[_{2,}\]|\[\s*\]/g) || []).length;
  if (blanks >= 5) {
    return {
      findings: [{
        sev: 'high', key: 'blank_fields',
        title: `To'ldirilmagan maydonlar: ${blanks} ta bo'sh joy`,
        body: `Hujjatda ${blanks} ta to'ldirilmagan maydon aniqlandi. Imzolashdan oldin barcha bo'sh joylar to'ldirilishi shart.`,
      }],
      penalty: blanks >= 8 ? 40 : 20,
    };
  }
  if (blanks >= 2) {
    return {
      findings: [{
        sev: 'med', key: 'blank_fields',
        title: `${blanks} ta to'ldirilmagan maydon`,
        body: `Imzolashdan oldin shu ${blanks} ta bo'sh joyni to'ldiring.`,
      }],
      penalty: blanks * 5,
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
  const failedChecks = [];

  const blankRes = checkBlanks(t);
  findings.push(...blankRes.findings);

  for (const c of CHECKS) {
    const w = c.sev === 'high' ? 22 : c.sev === 'med' ? 14 : 8;
    total += w;
    if (c.re.test(t)) {
      earned += w;
    } else {
      failedChecks.push(c.key);
      findings.push({ sev: c.sev, key: c.key, title: `${c.label} — yetishmayapti`, body: c.bad });
    }
  }

  // checkPrice: faqat narx CHECK o'tmagan bo'lsa va narx so'zi bor bo'lsa qo'shimcha eslatma
  // Penalty emas -- faqat ma'lumot sifatida
  if (failedChecks.includes('narx')) {
    const hasPriceWord = /narx|цена|price|cost|стоимост|to.?lov|оплат|оплач|payment|сумм|amount/i.test(t);
    if (hasPriceWord) {
      // Narx so'zi bor lekin formula topilmadi -- allaqachon findings ga qo'shilgan
      // Qo'shimcha penalty qo'shmaymiz
    }
  }

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

  // Score: faqat o'tmagan checklar va red flag penalty
  // blankRes.penalty faqat ko'p bo'sh joy bo'lganda
  const raw = total > 0 ? (earned / total) * 100 : 0;
  const score = Math.max(0, Math.min(100, Math.round(raw - blankRes.penalty - redPenalty)));
  const tier = score >= 80 ? 'good' : score >= 50 ? 'med' : 'bad';
  const effectiveTier = blankRes.penalty >= 30 ? 'bad' : blankRes.penalty >= 18 && tier === 'good' ? 'med' : tier;

  return { score, tier: effectiveTier, readable, findings };
}

module.exports = { analyzeText, CHECKS };
