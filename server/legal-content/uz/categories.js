// server/legal-content/uz/categories.js
// O'zbekiston Respublikasi qonunchilik katalogi
// Manba: lex.uz | Har bir hujjat rasmiy havolaga ega

// ─────────────────────────────────────────────
// QONUNLAR (O'RQ)
// ─────────────────────────────────────────────
const QONUNLAR = [

  // TADBIRKORLIK VA KORPORATIV HUQUQ
  {
    category: "Tadbirkorlik va korporativ huquq",
    name: "Tadbirkorlik faoliyati erkinligining kafolatlari to'g'risida",
    number: "O'RQ-267",
    adoptedDate: '2012-05-02',
    effectiveDate: '2012-05-02',
    desc: "Tadbirkorlar huquqlarini himoya qilish, tekshirishlarni cheklash, biznes muhitini yaxshilash",
    url: 'https://lex.uz/docs/-1959037',
  },
  {
    category: "Tadbirkorlik va korporativ huquq",
    name: "Aksiyadorlik jamiyatlari to'g'risida",
    number: "O'RQ-223",
    adoptedDate: '1996-04-26',
    effectiveDate: '1996-04-26',
    desc: "Aksiyadorlik jamiyatlarini tashkil etish, boshqarish, huquqlari va majburiyatlari",
    url: 'https://lex.uz/docs/-20591',
  },
  {
    category: "Tadbirkorlik va korporativ huquq",
    name: "Mas'uliyati cheklangan jamiyatlar to'g'risida",
    number: "O'RQ-148",
    adoptedDate: '1998-12-06',
    effectiveDate: '1998-12-06',
    desc: "MChJ tashkil etish tartibi, ustav kapitali, ishtirokchilar huquqlari",
    url: 'https://lex.uz/docs/-63478',
  },
  {
    category: "Tadbirkorlik va korporativ huquq",
    name: "Davlat ro'yxatidan o'tkazish to'g'risida",
    number: "O'RQ-283",
    adoptedDate: '2014-08-11',
    effectiveDate: '2014-08-11',
    desc: "Yuridik shaxslar va yakka tartibdagi tadbirkorlarni davlat ro'yxatidan o'tkazish tartibi",
    url: 'https://lex.uz/docs/-2397021',
  },
  {
    category: "Tadbirkorlik va korporativ huquq",
    name: "Bankrotlik to'g'risida",
    number: "O'RQ-385",
    adoptedDate: '2018-03-16',
    effectiveDate: '2018-03-16',
    desc: "Korxonani bankrot deb topish, tashqi boshqaruv va tugatish tartiblari",
    url: 'https://lex.uz/docs/-3550260',
  },
  {
    category: "Tadbirkorlik va korporativ huquq",
    name: "Litsenziyalash to'g'risida",
    number: "O'RQ-936",
    adoptedDate: '2024-08-07',
    effectiveDate: '2024-08-07',
    desc: "Litsenziya talab qilinadigan faoliyat turlari va litsenziya olish tartibi",
    url: 'https://lex.uz/docs/-7074421',
  },
  {
    category: "Tadbirkorlik va korporativ huquq",
    name: "Raqobat to'g'risida",
    number: "O'RQ-319",
    adoptedDate: '2012-01-06',
    effectiveDate: '2012-01-06',
    desc: "Monopoliyaga qarshi qoidalar, adolatsiz raqobat, bozor munosabatlari",
    url: 'https://lex.uz/docs/-1867822',
  },
  {
    category: "Tadbirkorlik va korporativ huquq",
    name: "Elektron tijorat to'g'risida",
    number: "O'RQ-613",
    adoptedDate: '2015-04-29',
    effectiveDate: '2015-04-29',
    desc: "Internet orqali savdo-sotiq qoidalari, elektron shartnomalar, iste'molchi huquqlari",
    url: 'https://lex.uz/docs/-2664600',
  },

  // SHARTNOMA VA MULK HUQUQI
  {
    category: "Shartnoma va mulk huquqi",
    name: "Iste'molchilar huquqlarini himoya qilish to'g'risida",
    number: "O'RQ-73",
    adoptedDate: '1996-04-26',
    effectiveDate: '1996-04-26',
    desc: "Sifatsiz tovar va xizmatlar, kafolatlar, tovar qaytarish, iste'molchi himoyasi",
    url: 'https://lex.uz/docs/-20589',
  },
  {
    category: "Shartnoma va mulk huquqi",
    name: "Ipoteka to'g'risida",
    number: "O'RQ-140",
    adoptedDate: '1998-04-01',
    effectiveDate: '1998-04-01',
    desc: "Ko'chmas mulk garovi, ipoteka shartnomasi, bank va qarz oluvchi huquqlari",
    url: 'https://lex.uz/docs/-48095',
  },
  {
    category: "Shartnoma va mulk huquqi",
    name: "Lizing to'g'risida",
    number: "O'RQ-214",
    adoptedDate: '1999-04-14',
    effectiveDate: '1999-04-14',
    desc: "Lizing shartnomasi, lizing to'lovlari, mulk o'tkazish tartibi",
    url: 'https://lex.uz/docs/-1399',
  },
  {
    category: "Shartnoma va mulk huquqi",
    name: "Ko'chmas mulk to'g'risida",
    number: "O'RQ-558",
    adoptedDate: '2014-12-11',
    effectiveDate: '2014-12-11',
    desc: "Ko'chmas mulkni davlat ro'yxatidan o'tkazish, egachilik huquqi, kadastr",
    url: 'https://lex.uz/docs/-2533428',
  },

  // MOLIYA VA BANK
  {
    category: "Moliya va bank huquqi",
    name: "Banklar va bank faoliyati to'g'risida",
    number: "O'RQ-163",
    adoptedDate: '1996-04-25',
    effectiveDate: '1996-04-25',
    desc: "Banklarni litsenziyalash, bank operatsiyalari, depozit va kreditlar tartibi",
    url: 'https://lex.uz/docs/-104708',
  },
  {
    category: "Moliya va bank huquqi",
    name: "Qimmatli qog'ozlar bozori to'g'risida",
    number: "O'RQ-557",
    adoptedDate: '2015-07-22',
    effectiveDate: '2015-07-22',
    desc: "Qimmatli qog'ozlar chiqarish, muomalaga kiritish, birja savdolari",
    url: 'https://lex.uz/docs/-2689833',
  },
  {
    category: "Moliya va bank huquqi",
    name: "Sug'urta faoliyati to'g'risida",
    number: "O'RQ-510",
    adoptedDate: '2002-04-05',
    effectiveDate: '2002-04-05',
    desc: "Sug'urta kompaniyalari, sug'urta shartnomasi, majburiy va ixtiyoriy sug'urta",
    url: 'https://lex.uz/docs/-34945',
  },
  {
    category: "Moliya va bank huquqi",
    name: "Pul o'tkazmalari to'g'risida",
    number: "O'RQ-595",
    adoptedDate: '2015-11-18',
    effectiveDate: '2015-11-18',
    desc: "Pul o'tkazmalari xizmati, to'lov tizimlari, valyuta muomalasi",
    url: 'https://lex.uz/docs/-2739826',
  },
  {
    category: "Moliya va bank huquqi",
    name: "2026-yil uchun Davlat budjeti to'g'risida",
    number: "O'RQ-1105",
    adoptedDate: '2025-12-25',
    effectiveDate: '2026-01-01',
    desc: "2026-yilga mo'ljallangan davlat budjeti daromad va xarajatlari",
    url: 'https://lex.uz/docs/-7949060',
  },

  // MEHNAT VA IJTIMOIY HIMOYA
  {
    category: "Mehnat va ijtimoiy himoya",
    name: "Aholi bandligi to'g'risida",
    number: "O'RQ-611",
    adoptedDate: '1992-01-13',
    effectiveDate: '1992-01-13',
    desc: "Ishsizlik nafaqasi, bandlik markazlari, kasbga o'qitish, ish bilan ta'minlash",
    url: 'https://lex.uz/docs/-26513',
  },
  {
    category: "Mehnat va ijtimoiy himoya",
    name: "Pensiya ta'minoti to'g'risida",
    number: "O'RQ-703",
    adoptedDate: '2021-12-29',
    effectiveDate: '2022-01-01',
    desc: "Pensiya hisoblash tartibi, pensiya yoshlari, nogironlik pensiyasi",
    url: 'https://lex.uz/docs/-5734641',
  },
  {
    category: "Mehnat va ijtimoiy himoya",
    name: "Mehnat migratsiyasi to'g'risida",
    number: "O'RQ-510",
    adoptedDate: '2012-11-30',
    effectiveDate: '2012-11-30',
    desc: "Xorijda ishlash uchun ruxsat, mehnat muhojirlarini himoya qilish",
    url: 'https://lex.uz/docs/-2012781',
  },
  {
    category: "Mehnat va ijtimoiy himoya",
    name: "Nogironligi bo'lgan shaxslarni ijtimoiy himoya qilish to'g'risida",
    number: "O'RQ-129",
    adoptedDate: '1991-11-18',
    effectiveDate: '1991-11-18',
    desc: "Nogironligi bo'lgan shaxslarga imtiyozlar, pensiya, reabilitatsiya",
    url: 'https://lex.uz/docs/-26524',
  },

  // TA'LIM VA FAN
  {
    category: "Ta'lim va fan",
    name: "Ta'lim to'g'risida",
    number: "O'RQ-637",
    adoptedDate: '2020-09-23',
    effectiveDate: '2021-01-01',
    desc: "Ta'lim tizimi, maktabgacha ta'lim, umumta'lim, oliy ta'lim tartib-qoidalari",
    url: 'https://lex.uz/docs/-5013009',
  },
  {
    category: "Ta'lim va fan",
    name: "O'zbekiston Respublikasi oliy ta'lim tizimini 2030-yilgacha rivojlantirish konsepsiyasini tasdiqlash to'g'risida",
    number: "PF-5847",
    adoptedDate: '2019-10-08',
    effectiveDate: '2019-10-08',
    desc: "Universitetlar, oliy ta'lim standartlari, xalqaro reytinglar, ta'lim sifatini oshirish",
    url: 'https://lex.uz/docs/-4545884',
  },
  {
    category: "Ta'lim va fan",
    name: "Fan to'g'risida",
    number: "O'RQ-427",
    adoptedDate: '1998-08-29',
    effectiveDate: '1998-08-29',
    desc: "Ilmiy faoliyatni tashkil etish, ilmiy darajalar, tadqiqot moliyalashtirish",
    url: 'https://lex.uz/docs/-43977',
  },

  // SOGLIQNI SAQLASH
  {
    category: "Sog'liqni saqlash",
    name: "Fuqarolar sog'lig'ini muhofaza qilish to'g'risida",
    number: "O'RQ-707",
    adoptedDate: '1996-08-29',
    effectiveDate: '1996-08-29',
    desc: "Tibbiy yordam, shifoxonalar, kasalxona davosi, dori vositalari",
    url: 'https://lex.uz/docs/-20545',
  },
  {
    category: "Sog'liqni saqlash",
    name: "Tibbiy sug'urta to'g'risida",
    number: "O'RQ-663",
    adoptedDate: '2019-11-26',
    effectiveDate: '2021-01-01',
    desc: "Majburiy tibbiy sug'urta, to'lovlar, tibbiy xizmat ko'rsatish kafolatlari",
    url: 'https://lex.uz/docs/-4699064',
  },

  // AXBOROT TEXNOLOGIYALARI
  {
    category: "Axborot texnologiyalari",
    name: "Axborot to'g'risida",
    number: "O'RQ-611",
    adoptedDate: '2003-12-11',
    effectiveDate: '2003-12-11',
    desc: "Axborot resurslari, axborotga kirish huquqi, axborot xavfsizligi",
    url: 'https://lex.uz/docs/-58888',
  },
  {
    category: "Axborot texnologiyalari",
    name: "Elektron hujjat aylanmasi to'g'risida",
    number: "O'RQ-389",
    adoptedDate: '2015-04-29',
    effectiveDate: '2015-04-29',
    desc: "Elektron imzo, elektron hujjatlar, raqamli ma'lumotlarning yuridik kuchi",
    url: 'https://lex.uz/docs/-2664497',
  },
  {
    category: "Axborot texnologiyalari",
    name: "Shaxsiy ma'lumotlar to'g'risida",
    number: "O'RQ-547",
    adoptedDate: '2019-07-02',
    effectiveDate: '2019-07-02',
    desc: "Shaxsiy ma'lumotlarni to'plash, saqlash, himoya qilish va ishlatish qoidalari",
    url: 'https://lex.uz/docs/-4378932',
  },

  // DAVLAT BOSHQARUVI
  {
    category: "Davlat boshqaruvi",
    name: "Fuqarolarning murojaatlari to'g'risida",
    number: "O'RQ-378",
    adoptedDate: '2014-12-03',
    effectiveDate: '2014-12-03',
    desc: "Ariza, shikoyat, taklif berish tartibi, davlat organlarining javob berish muddatlari",
    url: 'https://lex.uz/docs/-2530280',
  },
  {
    category: "Davlat boshqaruvi",
    name: "Davlat xizmati to'g'risida",
    number: "O'RQ-547",
    adoptedDate: '2016-09-09',
    effectiveDate: '2016-09-09',
    desc: "Davlat xizmatchilari huquqlari, ish haqi, ta'til, korrupsiyaga qarshi talablar",
    url: 'https://lex.uz/docs/-2949614',
  },
  {
    category: "Davlat boshqaruvi",
    name: "Davlat-xususiy sheriklik to'g'risida",
    number: "O'RQ-561",
    adoptedDate: '2019-05-10',
    effectiveDate: '2019-05-10',
    desc: "Davlat va xususiy sektor hamkorligi, konsessiya, investitsiya loyihalari",
    url: 'https://lex.uz/docs/-4395485',
  },
  {
    category: "Davlat boshqaruvi",
    name: "Normativ-huquqiy hujjatlar to'g'risida",
    number: "O'RQ-682",
    adoptedDate: '2021-04-20',
    effectiveDate: '2021-04-20',
    desc: "Qonun chiqarish jarayoni, normativ hujjatlar ierarxiyasi, kuchga kirish tartibi",
    url: 'https://lex.uz/docs/-5378966',
  },

  // EKOLOGIYA VA TABIAT
  {
    category: "Ekologiya va tabiat",
    name: "Tabiatni muhofaza qilish to'g'risida",
    number: "O'RQ-754",
    adoptedDate: '1992-12-09',
    effectiveDate: '1992-12-09',
    desc: "Atrof-muhitni muhofaza qilish, ekologik me'yorlar, korxonalar javobgarligi",
    url: 'https://lex.uz/docs/-26534',
  },
  {
    category: "Ekologiya va tabiat",
    name: "Suv to'g'risida",
    number: "O'RQ-837",
    adoptedDate: '2009-05-06',
    effectiveDate: '2009-05-06',
    desc: "Suv resurslaridan foydalanish, sug'orish, suv muhofazasi qoidalari",
    url: 'https://lex.uz/docs/-1440769',
  },
  {
    category: "Ekologiya va tabiat",
    name: "Issiqxona gazlari chiqarilishini cheklash to'g'risida",
    number: "O'RQ-1073",
    adoptedDate: '2025-07-07',
    effectiveDate: '2026-01-09',
    desc: "Iqlim o'zgarishiga qarshi chora-tadbirlar, emissiyalarni cheklash",
    url: 'https://lex.uz/docs/7618153',
  },
];

// ─────────────────────────────────────────────
// PREZIDENT HUJJATLARI (Farmon PF- va Qaror PQ-)
// ─────────────────────────────────────────────
const PREZIDENT_HUJJATLARI = [

  // STRATEGIK DASTURLAR
  {
    category: "Strategik dasturlar",
    name: "2022–2026-yillarga mo'ljallangan Yangi O'zbekiston Taraqqiyot Strategiyasi to'g'risida",
    number: "PF-60",
    type: "Farmon",
    date: '2022-01-28',
    desc: "Mamlakatni rivojlantirishning besh yillik asosiy strategiyasi — 100 maqsad",
    url: 'https://lex.uz/docs/-5958019',
  },
  {
    category: "Strategik dasturlar",
    name: "O'zbekiston Respublikasini 2030-yilgacha rivojlantirish strategiyasi to'g'risida",
    number: "PF-158",
    type: "Farmon",
    date: '2023-09-11',
    desc: "Uzoq muddatli ijtimoiy-iqtisodiy rivojlanish maqsadlari va yo'nalishlari",
    url: 'https://lex.uz/docs/-6600413',
  },
  {
    category: "Strategik dasturlar",
    name: "O'zbekiston Respublikasida korrupsiyaning oldini olish va unga qarshi kurashish tizimini yanada takomillashtirish to'g'risida",
    number: "PF-270",
    type: "Farmon",
    date: '2025-12-30',
    desc: "Korrupsiyaning oldini olish, tizimli nazorat, jamoatchilik nazorati",
    url: 'https://lex.uz/docs/-7962922',
  },

  // IQTISODIYOT VA BIZNES
  {
    category: "Iqtisodiyot va tadbirkorlik",
    name: "O'zbekiston Respublikasi Prezidentining tadbirkorlar bilan to'rtinchi ochiq muloqotida belgilangan vazifalarni amalga oshirish chora-tadbirlari to'g'risida",
    number: "PF-132",
    type: "Farmon",
    date: '2024-08-30',
    desc: "Soliq yukini kamaytirish, imtiyozlar, tadbirkorlarni qo'llab-quvvatlash",
    url: 'https://lex.uz/uz/docs/-7089547',
  },
  {
    category: "Iqtisodiyot va tadbirkorlik",
    name: "\"Mahallani rivojlantirish va jamiyatni yuksaltirish\" yilida ustuvor yo'nalishlar bo'yicha islohotlar dasturlari va \"O'zbekiston-2030\" strategiyasini amalga oshirish bo'yicha davlat dasturi to'g'risida",
    number: "PF-22",
    type: "Farmon",
    date: '2026-02-16',
    desc: "Import o'rnini bosadigan mahsulot ishlab chiqarishni rag'batlantirish, sanoat kooperatsiyasi (yillik islohotlar dasturi doirasida)",
    url: 'https://www.lex.uz/uz/docs/-8050787',
  },
  {
    category: "Iqtisodiyot va tadbirkorlik",
    name: "Uy-joy va ipoteka bozorini yanada rivojlantirishga oid qo'shimcha chora-tadbirlar to'g'risida",
    number: "PF-26",
    type: "Farmon",
    date: '2025-02-21',
    desc: "Ipoteka kreditlash tizimini yaxshilash, uy-joy qurilishini rag'batlantirish",
    url: 'https://lex.uz/docs/-7395923',
  },
  {
    category: "Iqtisodiyot va tadbirkorlik",
    name: "2023-yilda qishloq xo'jaligi mahsulotlari ishlab chiqarish, qayta ishlashni kengaytirish va qo'llab-quvvatlashning qo'shimcha chora-tadbirlari to'g'risida",
    number: "PQ-113",
    type: "Qaror",
    date: '2023-04-05',
    desc: "Agrar soha uchun subsidiyalar, ishlab chiqarishni kengaytirish, qayta ishlashni qo'llab-quvvatlash",
    url: 'https://lex.uz/docs/-6424449',
  },
  {
    category: "Iqtisodiyot va tadbirkorlik",
    name: "Maxsus iqtisodiy zonalar to'g'risida",
    number: "O'RQ-604",
    type: "Qonun",
    date: '2020-02-17',
    desc: "EIZ va MEZ tartib-qoidalari, soliq imtiyozlari, investorlar uchun shart-sharoitlar",
    url: 'https://lex.uz/docs/-4737511',
  },

  // RAQAMLASHTIRISH
  {
    category: "Raqamlashtirish va IT",
    name: "«Raqamli O'zbekiston — 2030» Strategiyasi to'g'risida",
    number: "PF-17",
    type: "Farmon",
    date: '2020-10-05',
    desc: "Davlat xizmatlarini raqamlashtirish, e-hukumat, IT iqtisodiyoti",
    url: 'https://lex.uz/docs/-4768449',
  },
  {
    category: "Raqamlashtirish va IT",
    name: "Sun'iy intellekt texnologiyalarini 2030-yilga qadar rivojlantirish strategiyasini tasdiqlash to'g'risida",
    number: "PQ-358",
    type: "Qaror",
    date: '2024-10-14',
    desc: "SI ni davlat boshqaruviga joriy etish, IT ta'lim, raqamli iqtisodiyot",
    url: 'https://www.lex.uz/docs/-7158604',
  },

  // IJTIMOIY SOHA
  {
    category: "Ijtimoiy soha",
    name: "Aholi bandligini ta'minlash va qashshoqlikni qisqartirish dasturi to'g'risida",
    number: "PF-4398",
    type: "Farmon",
    date: '2019-02-07',
    desc: "Ish o'rinlari yaratish, ijtimoiy himoya, qashshoq oilalarga yordam",
    url: 'https://lex.uz/docs/-4237803',
  },
  {
    category: "Ijtimoiy soha",
    name: "Yoshlarga oid davlat siyosati to'g'risida",
    number: "O'RQ-406",
    type: "Qonun",
    date: '2016-09-14',
    desc: "Yoshlarni qo'llab-quvvatlash, ta'lim, sport, tadbirkorlikka undash",
    url: 'https://lex.uz/docs/-3026246',
  },
  {
    category: "Ijtimoiy soha",
    name: "Xotin-qizlarning mehnat huquqlari kafolatlarini yanada kuchaytirish va tadbirkorlik faoliyatini qo'llab-quvvatlashga oid chora-tadbirlar to'g'risida",
    number: "PQ-4235",
    type: "Qaror",
    date: '2019-03-07',
    desc: "Ayollarning huquqlari, mehnatga jalb qilish, tadbirkorlik, ta'lim imkoniyatlari",
    url: 'https://lex.uz/ru/docs/-4230944',
  },

  // INVESTITSIYA
  {
    category: "Investitsiya va tashqi iqtisodiyot",
    name: "Investitsiyalar va investitsiya faoliyati to'g'risida",
    number: "O'RQ-598",
    type: "Qonun",
    date: '2019-12-25',
    desc: "Xorijiy investorlar uchun kafolatlar, soliq imtiyozlari, mulk himoyasi",
    url: 'https://lex.uz/docs/-4664142',
  },
  {
    category: "Investitsiya va tashqi iqtisodiyot",
    name: "Tashqi bozorlarda mahalliy mahsulotlar raqobatdoshligini ta'minlash va eksportini rag'batlantirishga doir qo'shimcha chora-tadbirlari to'g'risida",
    number: "PF-5286",
    type: "Farmon",
    date: '2017-12-15',
    desc: "Eksport qiladigan korxonalarga soliq imtiyozlari, subsidiyalar, qo'llab-quvvatlash",
    url: 'https://lex.uz/docs/-3460651',
  },

  // MINERAL RESURSLAR
  {
    category: "Sanoat va resurslar",
    name: "Respublikada mis xom ashyosini chuqur qayta ishlashni yanada jadallashtirish chora-tadbirlari to'g'risida",
    number: "PQ-77",
    type: "Qaror",
    date: '2024-02-19',
    desc: "Tog'-kon sanoati, metallurgiya, chuqur qayta ishlash dasturi",
    url: 'https://www.lex.uz/ru/docs/6808348',
  },
  {
    category: "Sanoat va resurslar",
    name: "Zargarlik buyumlarini ishlab chiqarish sohasini qo'llab-quvvatlash bo'yicha qo'shimcha chora-tadbirlar to'g'risida",
    number: "PQ-207",
    type: "Qaror",
    date: '2025-06-26',
    desc: "Zargarlik sanoatini rivojlantirish, eksport imkoniyatlarini kengaytirish",
    url: 'https://lex.uz/docs/-7604300',
  },
];

// ─────────────────────────────────────────────
// HUKUMAT (VAZIRLAR MAHKAMASI) QARORLARI
// ─────────────────────────────────────────────
const HUKUMAT_QARORLARI = [

  // MEHNAT VA IJTIMOIY TA'MINOT
  {
    category: "Mehnat va ijtimoiy ta'minot",
    name: "Ish haqi miqdorini oshirish to'g'risida",
    number: "PF-138",
    date: '2022-05-20',
    effectiveDate: '2022-06-01',
    desc: "Belgilangan minimal ish haqi miqdori — barcha korxona va tashkilotlar uchun majburiy",
    // Izoh: bu mavzu (eng kam ish haqi miqdorini belgilash) O'zbekistonda doimo
    // Prezident farmoni bilan tartibga solinadi, Vazirlar Mahkamasi qarori bilan
    // emas -- shuning uchun raqam formati "PF-" ga o'zgartirildi. Miqdor vaqti-vaqti
    // bilan yangi farmon bilan oshirilib turadi (eng so'nggisi -- PF-196, 2023-11-17).
    url: 'https://www.lex.uz/uz/docs/-6027058',
  },
  {
    category: "Mehnat va ijtimoiy ta'minot",
    name: "Ish haqi, pensiyalar va nafaqalar miqdorini oshirish to'g'risida",
    number: "PF-108",
    date: '2024-08-12',
    effectiveDate: '2024-09-01',
    desc: "Pensiya, nafaqa va moddiy yordamlar miqdorlarini oshirish tartibi",
    // Izoh: bu ham doimo Prezident farmoni bilan tartibga solinadi (Vazirlar
    // Mahkamasi emas) -- miqdorlar vaqti-vaqti bilan yangi farmon bilan
    // yangilanib turadi.
    url: 'https://lex.uz/docs/-7059431',
  },
  {
    category: "Mehnat va ijtimoiy ta'minot",
    name: "Nikoh, oila va fuqarolik holati dalolatnomalarini qayd etish sohasidagi normativ-huquqiy hujjatlarni tizimlashtirish to'g'risida",
    number: "550-son",
    date: '2023-10-20',
    effectiveDate: '2023-10-20',
    desc: "Tug'ilish, nikoh, ajralish, vafot qayd etish tartiblari",
    url: 'https://lex.uz/docs/-6638940',
  },

  // SOLIQ VA BOJXONA
  {
    category: "Soliq va bojxona",
    name: "O'zbekiston Respublikasining tashqi iqtisodiy faoliyatini yanada tartibga solish hamda bojxona-tarif jihatdan tartibga solish tizimini takomillashtirish chora-tadbirlari to'g'risida",
    number: "PQ-3818",
    date: '2018-06-29',
    effectiveDate: '2018-06-29',
    desc: "Tovarlarni Respublika hududiga olib kirishda qo'llaniladigan bojxona tarifi",
    // Izoh: import bojxona bojlari stavkalari doimo Prezident qarori bilan
    // tasdiqlanadi (VM emas) va vaqti-vaqti bilan yangilanib turadi.
    url: 'https://lex.uz/acts/-3802363',
  },
  {
    category: "Soliq va bojxona",
    name: "Soliq va budjet siyosatining 2023-yilga mo'ljallangan asosiy yo'nalishlari qabul qilinganligi munosabati bilan O'zbekiston Respublikasining ayrim qonun hujjatlariga o'zgartish va qo'shimchalar kiritish to'g'risida",
    number: "O'RQ-812",
    date: '2022-12-30',
    effectiveDate: '2023-01-01',
    desc: "Spirtli ichimliklar, tamaki, yoqilg'i va boshqa aksizga tortiluvchi tovarlar uchun stavkalar",
    // Izoh: aksiz solig'i stavkalari alohida VM qarori bilan emas, har yilgi
    // soliq siyosati qonuni (Soliq kodeksiga o'zgartirish kiritish orqali)
    // bilan belgilanadi va yangilanib turadi.
    url: 'https://lex.uz/docs/-6333246',
  },

  // UY-JOY VA KOMMUNAL XIZMATLAR
  {
    category: "Uy-joy va kommunal xizmatlar",
    name: "Yoqilg'i-energetika tarmog'ida tarif siyosatini yanada takomillashtirishga doir qo'shimcha chora-tadbirlar to'g'risida",
    number: "337-son",
    date: '2024-06-15',
    effectiveDate: '2024-06-15',
    desc: "Elektr energiyasi, gaz, suv, isitish tarif stavkalari aholisi va korxonalar uchun",
    url: 'https://lex.uz/docs/-6972980',
  },
  {
    category: "Uy-joy va kommunal xizmatlar",
    name: "2023-yilda bozor tamoyillariga asoslangan ipoteka kreditlari orqali aholini uy-joy bilan ta'minlash dasturini amalga oshirish chora-tadbirlari to'g'risida",
    number: "PF-51",
    date: '2023-04-13',
    effectiveDate: '2023-04-13',
    desc: "Subsidiyalangan uy-joy qurilishi, arzon ipoteka, yosh oilalarga ko'maklashish",
    url: 'https://www.lex.uz/uz/docs/-6433775',
  },

  // TA'LIM
  {
    category: "Ta'lim",
    name: "Umumiy o'rta va o'rta maxsus, kasb-hunar ta'limining davlat ta'lim standartlarini tasdiqlash to'g'risida",
    number: "187-son",
    date: '2017-04-06',
    effectiveDate: '2017-04-06',
    desc: "Maktab ta'limi, DTS, o'quv dasturlari, darslik talablariga qo'yiladigan normalar",
    url: 'https://www.lex.uz/docs/-3153714',
  },
  {
    category: "Ta'lim",
    name: "Maktabgacha ta'lim sohasida davlat-xususiy sheriklik munosabatlarini zamonaviy raqamli texnologiyalar yordamida soddalashtirish chora-tadbirlari to'g'risida",
    number: "426-son",
    date: '2022-08-02',
    effectiveDate: '2022-08-02',
    desc: "Bog'cha to'lovlari, davlat subsidiyalari, litsenziyalash talablari",
    url: 'https://lex.uz/uz/docs/-6141472',
  },

  // SOGLIQNI SAQLASH
  {
    category: "Sog'liqni saqlash",
    name: "Sog'liqni saqlash tizimini tashkil etishning yangi modeli va davlat tibbiy sug'urtasi mexanizmlarini joriy etish chora-tadbirlari to'g'risida",
    number: "PQ-4890",
    date: '2020-11-12',
    effectiveDate: '2020-11-12',
    desc: "Tibbiy sug'urta tizimini boshqarish, sug'urta badallari, xizmat ko'rsatish tartibi",
    url: 'https://lex.uz/docs/-5430140',
  },

  // TADBIRKORLIK
  {
    category: "Tadbirkorlik muhiti",
    name: "Tekshiruvlarni elektron ro'yxatga olish yagona tizimi orqali vakolatli organni xabardor etish tartibi to'g'risida",
    number: "PF-5490",
    type: "Farmon",
    date: '2018-07-27',
    desc: "Korxonalarga rejali va rejalashmagan tekshirishlar cheklash va o'tkazish qoidalari",
    url: 'https://lex.uz/uz/docs/-4726130',
  },
  {
    category: "Tadbirkorlik muhiti",
    name: "Davlat xaridlarini amalga oshirish bilan bog'liq tartib-taomillarni tashkil etish va o'tkazish tartibi to'g'risidagi nizomni tasdiqlash haqida",
    number: "276-son",
    date: '2022-05-20',
    effectiveDate: '2022-05-20',
    desc: "Davlat xaridlari platformasi, tender o'tkazish, shaffoflik talablari",
    url: 'https://lex.uz/uz/docs/-6026643',
  },

  // EKOLOGIYA
  {
    category: "Ekologiya",
    name: "Chiqindilarni boshqarish tizimini takomillashtirish va ularning ekologik vaziyatga salbiy ta'sirini kamaytirish bo'yicha chora-tadbirlar to'g'risida",
    number: "PF-5",
    type: "Farmon",
    date: '2024-01-04',
    desc: "Maishiy va sanoat chiqindilari, qayta ishlash tartibi, korxonalar javobgarligi",
    url: 'https://lex.uz/en/docs/-6732832',
  },

  // TRANSPORT
  {
    category: "Transport",
    name: "Toshkent metropoliteni faoliyatining samaradorligini oshirish chora-tadbirlari to'g'risida",
    number: "PQ-5260",
    type: "Qaror",
    date: '2021-10-16',
    desc: "Metro yo'nalishlari, moliyalashtirish, qurilish muddatlari",
    url: 'https://lex.uz/docs/-5680284',
  },
  {
    category: "Transport",
    name: "Avtomobil yo'llarini qurish, rekonstruksiya qilish, ta'mirlash va ulardan foydalanish ishlarini tashkil etish chora-tadbirlari to'g'risida",
    number: "901-son",
    date: '2024-12-30',
    effectiveDate: '2024-12-30',
    desc: "Respublika yo'llarini ta'mirlash, yangi yo'llar qurilishi, moliyalashtirish",
    url: 'https://lex.uz/docs/-7309816',
  },
];

const HUKUMAT_QARORLARI_SOURCE_URL = 'https://lex.uz/docs/Government';

module.exports = {
  QONUNLAR,
  PREZIDENT_HUJJATLARI,
  HUKUMAT_QARORLARI,
  HUKUMAT_QARORLARI_SOURCE_URL,
};
