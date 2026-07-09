// uz_constitution.js
// ============================================================================
// O'ZBEKISTON RESPUBLIKASI KONSTITUTSIYASI -- TO'LIQ MUNDARIJA
// Manba: https://lex.uz/docs/-6445145 (2023-yil 30-aprel referendumida qabul
// qilingan YANGI TAHRIR, 2023-yil 1-maydan kuchga kirgan -- HOZIRDA AMALDAGI)
//
// TUZILISH (bo'lim/bob/modda raqamlari) lex.uz sahifasining rasmiy
// mundarijasidan (docNavbar) to'g'ridan-to'g'ri olingan va TASDIQLANGAN --
// 6 bo'lim, 27 bob, 155 modda.
//
// MUHIM IZOH (halollik uchun, boshqa kodekslar fayllaridagi kabi): bu fayl
// har bir moddaning TO'LIQ MATNINI o'z ichiga OLMAYDI. Bundan tashqari,
// Konstitutsiya moddalari lex.uz'da (boshqa kodekslardan farqli) RASMIY
// NOMGA ega emas -- faqat tartib raqami bilan beriladi ("1-modda.", va h.k.).
// Shu sababli quyidagi "title" maydonlari rasmiy modda nomi EMAS, balki
// navigatsiya uchun qulay bo'lgan qisqa mazmun ko'rsatkichi (1-15-moddalar
// uchun lex.uz'dan olingan haqiqiy matn asosida aniq; 16-155-moddalar uchun
// bobning mavzusidan kelib chiqqan taxminiy, umumiy tavsif). Modda ustiga
// bosilganda esa HAR DOIM haqiqiy, to'liq matn (Nia orqali lex.uz'dan yoki
// OpenAI orqali) jonli yuklanadi -- title'ning taxminiyligi bosilgach
// ko'rsatiladigan matnga ta'sir qilmaydi.
// ============================================================================

const BASE_URL = 'https://lex.uz/docs/-6445145';

const SECTIONS = [
  {
    part: "BIRINCHI BO'LIM. ASOSIY PRINSIPLAR",
    chapters: [
      {
        title: "I bob. Davlat suvereniteti",
        articles: [
          { no: "1", title: "Davlatning respublika shakli, suveren-demokratik-huquqiy-ijtimoiy-dunyoviy tabiati" },
          { no: "2", title: "Davlat xalq irodasini ifoda etadi, organlar jamiyat oldida mas'ul" },
          { no: "3", title: "Milliy-davlat va ma'muriy-hududiy tuzilish, davlat chegarasi va hududining daxlsizligi" },
          { no: "4", title: "Davlat tili -- o'zbek tili, millat va elatlar tillariga hurmat" },
          { no: "5", title: "Davlat ramzlari -- bayroq, gerb, madhiya" },
          { no: "6", title: "Poytaxt -- Toshkent shahri" },
        ],
      },
      {
        title: "II bob. Xalq hokimiyatchiligi",
        articles: [
          { no: "7", title: "Xalq -- davlat hokimiyatining birdan-bir manbai" },
          { no: "8", title: "Fuqarolik -- Oʻzbekiston xalqini tashkil etuvchi asos" },
          { no: "9", title: "Referendum -- eng muhim masalalarni umumxalq ovoziga qo'yish" },
          { no: "10", title: "Xalq nomidan faqat Oliy Majlis va Prezident ish olib borishi" },
          { no: "11", title: "Hokimiyatning qonun chiqaruvchi, ijro etuvchi va sud hokimiyatiga bo'linishi" },
          { no: "12", title: "Mafkuraviy xilma-xillik, davlat mafkurasining o'rnatilishi taqiqi" },
          { no: "13", title: "Demokratiya umuminsoniy prinsiplari, inson qadr-qimmatining oliy qadriyat ekanligi" },
          { no: "14", title: "Davlat faoliyatining qonuniylik, ijtimoiy adolat va birdamlik prinsiplari" },
        ],
      },
      {
        title: "III bob. Konstitutsiya va qonunning ustunligi",
        articles: [
          { no: "15", title: "Konstitutsiya va qonunlarning ustunligi, Konstitutsiyaning oliy yuridik kuchi" },
          { no: "16", title: "Xalqaro huquq normalarining ustuvorligi, qonunlarning Konstitutsiyaga muvofiqligi" },
        ],
      },
      {
        title: "IV bob. Tashqi siyosat",
        articles: [
          { no: "17", title: "Tashqi siyosat prinsiplari -- suverenitet, teng huquqlilik, tinchliksevarlik" },
          { no: "18", title: "Xalqaro shartnomalarning O'zbekiston huquqiy tizimidagi o'rni" },
        ],
      },
    ],
  },
  {
    part: "IKKINCHI BO'LIM. INSON VA FUQARONING ASOSIY HUQUQLARI, ERKINLIKLARI VA BURCHLARI",
    chapters: [
      {
        title: "V bob. Umumiy qoidalar",
        articles: [
          { no: "19", title: "Inson huquq va erkinliklarining tabiiy va daxlsiz ekanligi" },
          { no: "20", title: "Barcha fuqarolarning qonun oldida tengligi, kamsitishning taqiqlanishi" },
          { no: "21", title: "Huquq va erkinliklarni amalga oshirishda boshqalarning manfaatlariga putur yetkazmaslik" },
        ],
      },
      {
        title: "VI bob. Fuqarolik",
        articles: [
          { no: "22", title: "O'zbekiston Respublikasi fuqaroligi tushunchasi va yagonaligi" },
          { no: "23", title: "Fuqarolikni olish va yo'qotish asoslari, ikki fuqarolikka yo'l qo'yilmasligi" },
          { no: "24", title: "Fuqaroning O'zbekistondan chiqarib yuborilishi yoki begona davlatga berilishi taqiqi" },
        ],
      },
      {
        title: "VII bob. Shaxsiy huquq va erkinliklar",
        articles: [
          { no: "25", title: "Yashash huquqi -- har bir insonning uzviy huquqi" },
          { no: "26", title: "Erkinlik va shaxsiy daxlsizlik huquqi" },
          { no: "27", title: "Aybsizlik prezumpsiyasi, sudning qonuniy kuchga kirgan hukmigacha aybdor deb topilmaslik" },
          { no: "28", title: "Qiynoqqa solish, shafqatsiz muomala taqiqi" },
          { no: "29", title: "Shaxsiy hayotning daxlsizligi, shaxsiy va oilaviy sirni saqlash huquqi" },
          { no: "30", title: "Uy-joy daxlsizligi huquqi" },
          { no: "31", title: "Yozishmalar, telefon so'zlashuvlari va boshqa xabarlar sirining saqlanishi" },
          { no: "32", title: "Yurish-turish va yashash joyini tanlash erkinligi" },
          { no: "33", title: "Vijdon erkinligi huquqi" },
          { no: "34", title: "Fikrlash, so'z va e'tiqod erkinligi, ma'lumot izlash va olish huquqi" },
          { no: "35", title: "Shaxsiy ma'lumotlarning himoya qilinishi huquqi" },
        ],
      },
      {
        title: "VIII bob. Siyosiy huquqlar",
        articles: [
          { no: "36", title: "Davlat va jamiyat ishlarini boshqarishda ishtirok etish huquqi" },
          { no: "37", title: "Saylash va saylanish huquqi" },
          { no: "38", title: "Birlashish, siyosiy partiyalar va jamoat birlashmalari tuzish huquqi" },
          { no: "39", title: "Yig'ilishlar, mitinglar va namoyishlar o'tkazish huquqi" },
          { no: "40", title: "Davlat organlariga murojaat qilish huquqi" },
        ],
      },
      {
        title: "IX bob. Iqtisodiy, ijtimoiy, madaniy va ekologik huquqlar",
        articles: [
          { no: "41", title: "Mulkdor bo'lish huquqi, mulkning daxlsizligi va himoyasi" },
          { no: "42", title: "Tadbirkorlik faoliyati bilan shug'ullanish erkinligi" },
          { no: "43", title: "Mehnat qilish, kasb va faoliyat turini erkin tanlash huquqi" },
          { no: "44", title: "Adolatli mehnat sharoitlari va dam olish huquqi" },
          { no: "45", title: "Ish haqi, ijtimoiy himoya va nafaqa olish huquqi" },
          { no: "46", title: "Uy-joyga bo'lgan huquq" },
          { no: "47", title: "Sog'liqni saqlash va tibbiy yordam olish huquqi" },
          { no: "48", title: "Sog'lom va qulay atrof-muhitga bo'lgan huquq" },
          { no: "49", title: "Ta'lim olish huquqi, majburiy umumiy o'rta ta'lim" },
          { no: "50", title: "Ilmiy va texnikaviy ijodkorlik, madaniy hayotda ishtirok etish erkinligi" },
          { no: "51", title: "Intellektual mulk huquqlarining himoyasi" },
          { no: "52", title: "Ijtimoiy himoyaga muhtoj shaxslarning davlat qo'llab-quvvatlashiga huquqi" },
          { no: "53", title: "Nogironligi bo'lgan shaxslarning huquqlari va ularni qo'llab-quvvatlash" },
        ],
      },
      {
        title: "X bob. Inson hamda fuqaroning huquq va erkinliklari kafolatlari",
        articles: [
          { no: "54", title: "Huquq va erkinliklarning sud orqali himoya qilinishi kafolati" },
          { no: "55", title: "Malakali yuridik yordam olish, himoyalanish huquqi" },
          { no: "56", title: "Inson huquqlari bo'yicha vakil (ombudsman) instituti" },
          { no: "57", title: "Noqonuniy harakatlar natijasida yetkazilgan zararning qoplanishi huquqi" },
          { no: "58", title: "Konstitutsiyaviy sudga murojaat qilish huquqi" },
        ],
      },
      {
        title: "XI bob. Fuqarolarning burchlari",
        articles: [
          { no: "59", title: "Konstitutsiya va qonunlarga rioya etish burchi" },
          { no: "60", title: "Boshqa shaxslarning huquq, erkinlik, sha'ni va qadr-qimmatini hurmat qilish burchi" },
          { no: "61", title: "Soliq va mahalliy yig'imlarni to'lash burchi" },
          { no: "62", title: "Tabiatni va madaniy merosni asrab-avaylash burchi" },
          { no: "63", title: "Vatanni himoya qilish burchi, harbiy xizmat" },
          { no: "64", title: "Ota-onalarning farzandlarini voyaga yetkazish, farzandlarning ota-onaga g'amxo'rlik qilish burchi" },
        ],
      },
    ],
  },
  {
    part: "UCHINCHI BO'LIM. JAMIYAT VA SHAXS",
    chapters: [
      {
        title: "XII bob. Jamiyatning iqtisodiy negizlari",
        articles: [
          { no: "65", title: "Iqtisodiyotning ijtimoiy yo'naltirilgan bozor munosabatlariga asoslanishi" },
          { no: "66", title: "Mulkchilikning turli shakllari tengligi va davlat tomonidan himoyasi" },
          { no: "67", title: "Yer, yer osti boyliklari va tabiiy resurslarning umummilliy boylik ekanligi" },
          { no: "68", title: "Erkin raqobat, iqtisodiy faoliyatning monopoliyaga qarshi tartibga solinishi" },
        ],
      },
      {
        title: "XIII bob. Fuqarolik jamiyati institutlari",
        articles: [
          { no: "69", title: "Fuqarolik jamiyati institutlarining rivojlanishi uchun sharoit yaratish" },
          { no: "70", title: "Nodavlat notijorat tashkilotlarining faoliyat erkinligi" },
          { no: "71", title: "Fuqarolarning o'zini o'zi boshqarish organlari (mahalla) roli" },
          { no: "72", title: "Kasaba uyushmalari va mehnat jamoalarining huquqlari" },
          { no: "73", title: "Diniy tashkilotlar va konfessiyalararo totuvlik" },
          { no: "74", title: "Ommaviy tadbirlarni o'tkazish va fuqarolik faolligi" },
          { no: "75", title: "Jamoatchilik nazorati mexanizmlari" },
        ],
      },
      {
        title: "XIV bob. Oila, bolalar va yoshlar",
        articles: [
          { no: "76", title: "Oila jamiyatning asosiy bo'g'ini sifatida davlat muhofazasida bo'lishi" },
          { no: "77", title: "Nikoh erkinligi va er-xotinning teng huquqliligi" },
          { no: "78", title: "Bolalarning huquqlari, ularni tarbiyalash va himoya qilish" },
          { no: "79", title: "Yetim bolalar va ota-ona qaramog'idan mahrum bolalarga davlat g'amxo'rligi" },
          { no: "80", title: "Yoshlarga oid davlat siyosati, yoshlarni qo'llab-quvvatlash" },
        ],
      },
      {
        title: "XV bob. Ommaviy axborot vositalari",
        articles: [
          { no: "81", title: "OAV erkinligi, senzuraning taqiqlanishi" },
          { no: "82", title: "Jurnalistlarning huquq va majburiyatlari, manba maxfiyligini saqlash" },
        ],
      },
    ],
  },
  {
    part: "TO'RTINCHI BO'LIM. MA'MURIY-HUDUDIY VA DAVLAT TUZILISHI",
    chapters: [
      {
        title: "XVI bob. O'zbekiston Respublikasining ma'muriy-hududiy tuzilishi",
        articles: [
          { no: "83", title: "Viloyatlar, tumanlar, shaharlar va Qoraqalpog'iston Respublikasidan iborat tuzilish" },
          { no: "84", title: "Ma'muriy-hududiy chegaralarni o'zgartirish tartibi" },
        ],
      },
      {
        title: "XVII bob. Qoraqalpog'iston Respublikasi",
        articles: [
          { no: "85", title: "Qoraqalpog'iston Respublikasining O'zbekiston tarkibidagi suveren maqomi" },
          { no: "86", title: "Qoraqalpog'iston Respublikasining o'z Konstitutsiyasiga ega bo'lishi" },
          { no: "87", title: "Qoraqalpog'iston Respublikasi hududi va chegaralarining daxlsizligi" },
          { no: "88", title: "Qoraqalpog'iston Respublikasining O'zbekistondan ajralib chiqish huquqi (referendum orqali)" },
          { no: "89", title: "Ikki respublika o'rtasidagi munosabatlarning shartnomalar bilan tartibga solinishi" },
          { no: "90", title: "Qoraqalpog'iston Respublikasi davlat hokimiyati organlari tizimi" },
        ],
      },
    ],
  },
  {
    part: "BESHINCHI BO'LIM. DAVLAT HOKIMIYATINING TASHKIL ETILISHI",
    chapters: [
      {
        title: "XVIII bob. O'zbekiston Respublikasi Oliy Majlisi",
        articles: [
          { no: "91", title: "Oliy Majlis -- eng oliy davlat vakillik organi, ikki palatali tuzilish" },
          { no: "92", title: "Qonunchilik palatasi va Senatning shakllantirilish tartibi" },
          { no: "93", title: "Oliy Majlis Qonunchilik palatasining vakolatlari" },
          { no: "94", title: "Oliy Majlis Senatining vakolatlari" },
          { no: "95", title: "Deputat va senatorlarning huquqiy holati, daxlsizligi" },
          { no: "96", title: "Qonunlarni qabul qilish va e'lon qilish tartibi" },
          { no: "97", title: "Qonunchilik palatasi va Senat sessiyalari, majlislarning ochiqligi" },
          { no: "98", title: "Qonun loyihalarini kiritish (qonunchilik tashabbusi) huquqi" },
          { no: "99", title: "Davlat budjetini qabul qilish va uning ijrosini nazorat qilish" },
          { no: "100", title: "Oliy Majlis palatalarining birgalikdagi majlislari" },
          { no: "101", title: "Qonunchilik palatasi Spikeri va Senat Raisining vakolatlari" },
          { no: "102", title: "Oliy Majlis qo'mitalari va komissiyalari" },
          { no: "103", title: "Palatalarni muddatidan ilgari tarqatib yuborish asoslari" },
          { no: "104", title: "Deputatlik va senatorlik vakolatining tugash asoslari" },
        ],
      },
      {
        title: "XIX bob. O'zbekiston Respublikasining Prezidenti",
        articles: [
          { no: "105", title: "Prezident -- davlat boshlig'i, ijro etuvchi hokimiyat rahbari" },
          { no: "106", title: "Prezidentlikka saylanish shartlari va tartibi" },
          { no: "107", title: "Prezident vakolat muddati, qayta saylanish cheklovi" },
          { no: "108", title: "Prezidentning qasamyod qabul qilish tartibi" },
          { no: "109", title: "Prezidentning vakolatlari ro'yxati (qonun imzolash, kadrlar, tashqi siyosat va h.k.)" },
          { no: "110", title: "Prezident farmonlari, qarorlari va farmoyishlari" },
          { no: "111", title: "Prezident daxlsizligi va uni lavozimidan chetlashtirish (impichment) tartibi" },
          { no: "112", title: "Prezident vakolatlarining muddatidan ilgari tugashi holatlari" },
          { no: "113", title: "Prezident vazifasini vaqtincha bajarish tartibi" },
        ],
      },
      {
        title: "XX bob. O'zbekiston Respublikasi Vazirlar Mahkamasi",
        articles: [
          { no: "114", title: "Vazirlar Mahkamasi -- ijro etuvchi hokimiyatni amalga oshiruvchi organ" },
          { no: "115", title: "Vazirlar Mahkamasi tarkibi va uni shakllantirish tartibi" },
          { no: "116", title: "Bosh vazirning Oliy Majlis oldida hisobot berishi" },
          { no: "117", title: "Vazirlar Mahkamasining vakolatlari" },
          { no: "118", title: "Vazirlar Mahkamasi qarorlari va farmoyishlari, ularning yuridik kuchi" },
          { no: "119", title: "Vazirlar Mahkamasining vakolat muddati va istеfosi" },
        ],
      },
      {
        title: "XXI bob. Mahalliy davlat hokimiyati asoslari. Fuqarolarning o'zini o'zi boshqarish organlari",
        articles: [
          { no: "120", title: "Mahalliy davlat hokimiyati organlari tizimi (hokimliklar, Kengashlar)" },
          { no: "121", title: "Xalq deputatlari Kengashlarining vakolatlari" },
          { no: "122", title: "Hokimlarning tayinlanishi/saylanishi va vakolatlari" },
          { no: "123", title: "Mahalliy byudjetni shakllantirish va boshqarish" },
          { no: "124", title: "Fuqarolarning o'zini o'zi boshqarish organlari (mahalla) maqomi" },
          { no: "125", title: "Mahalla yig'inlari va ularning vakolatlari" },
          { no: "126", title: "Mahalliy hokimiyat organlari faoliyatining ochiqligi" },
          { no: "127", title: "Mahalliy davlat hokimiyati organlari qarorlarining yuridik kuchi" },
        ],
      },
      {
        title: "XXII bob. Saylov tizimi",
        articles: [
          { no: "128", title: "Saylov huquqi -- umumiy, teng va to'g'ridan-to'g'ri, yashirin ovoz berish orqali" },
          { no: "129", title: "Markaziy saylov komissiyasi va saylovlarni tashkil etish tartibi" },
        ],
      },
      {
        title: "XXIII bob. Sud hokimiyati",
        articles: [
          { no: "130", title: "Sud hokimiyati -- qonun chiqaruvchi va ijro etuvchi hokimiyatdan mustaqil" },
          { no: "131", title: "Sudlar tizimi -- Konstitutsiyaviy sud, Oliy sud va boshqa sudlar" },
          { no: "132", title: "Sudyalarning mustaqilligi va daxlsizligi kafolatlari" },
          { no: "133", title: "Sudyalarni tayinlash va lavozimdan ozod etish tartibi" },
          { no: "134", title: "Sudlov ishini yuritishning asosiy prinsiplari (tortishuvchanlik, oshkoralik)" },
          { no: "135", title: "Konstitutsiyaviy sudning vakolatlari" },
          { no: "136", title: "Oliy sudning vakolatlari" },
          { no: "137", title: "Sudyalar oliy kengashi -- sud tizimini shakllantiruvchi organ" },
          { no: "138", title: "Fuqarolarning sudda himoyalanish va apellyatsiya huquqi" },
          { no: "139", title: "Sud qarorlarining barcha uchun majburiyligi" },
          { no: "140", title: "Sudlarni moliyaviy va moddiy-texnik ta'minlash kafolatlari" },
        ],
      },
      {
        title: "XXIV bob. Advokatura",
        articles: [
          { no: "141", title: "Advokatura -- huquqiy yordam ko'rsatuvchi mustaqil institut" },
          { no: "142", title: "Advokatlik faoliyatining kafolatlari va advokat siri" },
        ],
      },
      {
        title: "XXV bob. Prokuratura",
        articles: [
          { no: "143", title: "Prokuratura tizimi va uning vazifalari" },
          { no: "144", title: "Bosh prokurorni tayinlash va lavozimdan ozod etish tartibi" },
          { no: "145", title: "Prokuraturaning qonunlar ijrosi ustidan nazorati" },
          { no: "146", title: "Prokuratura organlarining mustaqilligi kafolatlari" },
        ],
      },
      {
        title: "XXVI bob. Moliya, pul va bank tizimi",
        articles: [
          { no: "147", title: "Davlat budjeti tizimi va budjet jarayoni" },
          { no: "148", title: "Milliy valyuta -- so'm, pul muomalasini tartibga solish" },
          { no: "149", title: "Markaziy bankning mustaqilligi va vazifalari" },
          { no: "150", title: "Hisob palatasi -- davlat mablag'laridan foydalanish ustidan nazorat" },
          { no: "151", title: "Soliq tizimi va soliqlarni joriy etish tartibi" },
        ],
      },
      {
        title: "XXVII bob. Mudofaa va xavfsizlik",
        articles: [
          { no: "152", title: "Qurolli Kuchlar -- mamlakat mudofaasi va suverenitetini ta'minlash vazifasi" },
          { no: "153", title: "Davlat xavfsizligini ta'minlovchi organlar faoliyati qonun asosida" },
        ],
      },
    ],
  },
  {
    part: "OLTINCHI BO'LIM. KONSTITUTSIYANI O'ZGARTIRISH TARTIBI",
    chapters: [
      {
        title: "",
        articles: [
          { no: "154", title: "Konstitutsiyaga o'zgartirish kiritish tashabbusi va tartibi" },
          { no: "155", title: "Konstitutsiyaviy qonunlarni qabul qilish uchun malakali ko'pchilik ovoz talabi" },
        ],
      },
    ],
  },
];

module.exports = { BASE_URL, SECTIONS };
