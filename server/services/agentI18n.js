// services/agentI18n.js -- Agent ogohlantirishlari uchun 8 tilli tarjima markazi.
// Foydalanuvchining `lang` sozlamasiga qarab alert sarlavha va matnlari
// shu yerdan olinadi. Til topilmasa -- 'uz' standart.
//
// QOIDA: yangi alert turi qo'shilsa, BARCHA 8 tilga tarjima qo'shilishi SHART.
// Tillar: uz, ru, en, kk (qozoq), ky (qirg'iz), tg (tojik), tk (turkman), az (ozarbayjon)

const T = {
  // ---- KUZATUVCHI AGENT ----
  contract_expiring_title: {
    uz: 'Shartnoma muddati yaqinlashmoqda',
    ru: 'Срок договора истекает',
    en: 'Contract deadline approaching',
    kk: 'Шарт мерзімі жақындап қалды',
    ky: 'Келишим мөөнөтү жакындап калды',
    tg: 'Мӯҳлати шартнома наздик шуда истодааст',
    tk: 'Şertnamanyň möhleti golaýlaşýar',
    az: 'Müqavilə müddəti yaxınlaşır',
  },
  contract_expiring_msg: {
    uz: (c, d, date) => `"${c}" shartnomasi ${d} kun ichida (${date}) tugaydi.${c2(c)} Yangilash yoki uzaytirish kerakmi?`,
    ru: (c, d, date) => `Договор "${c}" истекает через ${d} дн. (${date}).${c2(c)} Нужно продлить или перезаключить?`,
    en: (c, d, date) => `Contract "${c}" expires in ${d} days (${date}).${c2(c)} Consider renewing or extending it.`,
    kk: (c, d, date) => `"${c}" шарты ${d} күн ішінде (${date}) аяқталады. Жаңарту немесе ұзарту керек пе?`,
    ky: (c, d, date) => `"${c}" келишими ${d} күн ичинде (${date}) бүтөт. Жаңылоо же узартуу керекпи?`,
    tg: (c, d, date) => `Шартномаи "${c}" дар давоми ${d} рӯз (${date}) ба охир мерасад. Навсозӣ ё дароз кардан лозим аст?`,
    tk: (c, d, date) => `"${c}" şertnamasy ${d} günüň içinde (${date}) tamamlanýar. Täzelemeli ýa-da uzaltmalymy?`,
    az: (c, d, date) => `"${c}" müqaviləsi ${d} gün ərzində (${date}) bitir. Yeniləmək və ya uzatmaq lazımdırmı?`,
  },
  contract_expired_title: {
    uz: "Shartnoma muddati o'tib ketdi!",
    ru: 'Срок договора истёк!',
    en: 'Contract has expired!',
    kk: 'Шарт мерзімі өтіп кетті!',
    ky: 'Келишим мөөнөтү өтүп кетти!',
    tg: 'Мӯҳлати шартнома гузашт!',
    tk: 'Şertnamanyň möhleti geçdi!',
    az: 'Müqavilə müddəti keçdi!',
  },
  contract_expired_msg: {
    uz: (c, d) => `"${c}" shartnomasi ${d} kun oldin tugagan! Darhol yangilash yoki tugatish hujjatini rasmiylashtiring.`,
    ru: (c, d) => `Договор "${c}" истёк ${d} дн. назад! Срочно оформите продление или расторжение.`,
    en: (c, d) => `Contract "${c}" expired ${d} days ago! Formalize a renewal or termination immediately.`,
    kk: (c, d) => `"${c}" шарты ${d} күн бұрын аяқталған! Дереу жаңарту немесе тоқтату құжатын рәсімдеңіз.`,
    ky: (c, d) => `"${c}" келишими ${d} күн мурун бүткөн! Дароо жаңылоо же токтотуу документин даярдаңыз.`,
    tg: (c, d) => `Шартномаи "${c}" ${d} рӯз пеш ба охир расидааст! Фавран ҳуҷҷати навсозӣ ё қатъро расмӣ кунед.`,
    tk: (c, d) => `"${c}" şertnamasy ${d} gün öň tamamlandy! Derrew täzeleme ýa-da ýatyrma resminamasyny resmileşdiriň.`,
    az: (c, d) => `"${c}" müqaviləsi ${d} gün əvvəl bitib! Dərhal yeniləmə və ya xitam sənədini rəsmiləşdirin.`,
  },
  law_news_title: {
    uz: (t) => `${cap(t)} sohasida qonunchilik yangiligi`,
    ru: (t) => `Изменения законодательства: ${t}`,
    en: (t) => `Legislation update: ${t}`,
    kk: (t) => `Заңнама жаңалығы: ${t}`,
    ky: (t) => `Мыйзам жаңылыгы: ${t}`,
    tg: (t) => `Навигарии қонунгузорӣ: ${t}`,
    tk: (t) => `Kanunçylyk täzeligi: ${t}`,
    az: (t) => `Qanunvericilik yeniliyi: ${t}`,
  },
  law_news_msg: {
    uz: (t, s) => `"${t}" bo'yicha so'nggi qonunchilik: ${s} Batafsil: Yurist AI chat orqali so'rang.`,
    ru: (t, s) => `Последние изменения по теме "${t}": ${s} Подробнее — спросите в чате Yurist AI.`,
    en: (t, s) => `Latest legislation on "${t}": ${s} Ask Yurist AI chat for details.`,
    kk: (t, s) => `"${t}" бойынша соңғы заңнама: ${s} Толығырақ — Yurist AI чатынан сұраңыз.`,
    ky: (t, s) => `"${t}" боюнча акыркы мыйзамдар: ${s} Толугураак — Yurist AI чатынан сураңыз.`,
    tg: (t, s) => `Қонунгузории охирин оид ба "${t}": ${s} Тафсилот — аз чати Yurist AI пурсед.`,
    tk: (t, s) => `"${t}" boýunça soňky kanunçylyk: ${s} Jikme-jiklik üçin Yurist AI çatyndan soraň.`,
    az: (t, s) => `"${t}" üzrə son qanunvericilik: ${s} Ətraflı — Yurist AI çatından soruşun.`,
  },
  law_watch_title: {
    uz: 'Qonunchilik kuzatuvi faol',
    ru: 'Мониторинг законодательства активен',
    en: 'Legislation monitoring active',
    kk: 'Заңнама мониторингі белсенді',
    ky: 'Мыйзам мониторинги активдүү',
    tg: 'Мониторинги қонунгузорӣ фаъол',
    tk: 'Kanunçylyk gözegçiligi işjeň',
    az: 'Qanunvericilik monitorinqi aktivdir',
  },
  law_watch_msg: {
    uz: (topics) => `Kuzatilayotgan mavzular: ${topics}. Yangi o'zgarish topilsa, darhol xabar beramiz.`,
    ru: (topics) => `Отслеживаемые темы: ${topics}. При новых изменениях сразу сообщим.`,
    en: (topics) => `Watched topics: ${topics}. We'll notify you as soon as changes appear.`,
    kk: (topics) => `Бақыланатын тақырыптар: ${topics}. Жаңа өзгеріс табылса, бірден хабарлаймыз.`,
    ky: (topics) => `Байкалып жаткан темалар: ${topics}. Жаңы өзгөрүү табылса, дароо кабарлайбыз.`,
    tg: (topics) => `Мавзӯъҳои назоратшаванда: ${topics}. Ҳангоми тағйироти нав фавран хабар медиҳем.`,
    tk: (topics) => `Gözegçilikdäki temalar: ${topics}. Täze üýtgeşme tapylsa, derrew habar bereris.`,
    az: (topics) => `İzlənən mövzular: ${topics}. Yeni dəyişiklik tapılsa, dərhal xəbər verəcəyik.`,
  },
  court_watch_title: {
    uz: (n) => `Sud reyestri kuzatuvi: ${n}`,
    ru: (n) => `Мониторинг судебного реестра: ${n}`,
    en: (n) => `Court registry watch: ${n}`,
    kk: (n) => `Сот тізілімін бақылау: ${n}`,
    ky: (n) => `Сот реестрин байкоо: ${n}`,
    tg: (n) => `Назорати феҳристи судӣ: ${n}`,
    tk: (n) => `Kazyýet sanawyna gözegçilik: ${n}`,
    az: (n) => `Məhkəmə reyestrinə nəzarət: ${n}`,
  },
  court_watch_msg: {
    uz: (n) => `"${n}" bo'yicha sud va ijro reyestrlari kuzatilmoqda. Yangi ish topilsa darhol ogohlantiramiz. Qo'lda tekshirish: court.gov.uz`,
    ru: (n) => `Реестры судов и исполнительных производств отслеживаются по "${n}". При новом деле сразу предупредим. Ручная проверка: court.gov.uz`,
    en: (n) => `Court and enforcement registries are being monitored for "${n}". You'll be alerted immediately if a new case appears. Manual check: court.gov.uz`,
    kk: (n) => `"${n}" бойынша сот және орындау тізілімдері бақылануда. Жаңа іс табылса, бірден ескертеміз. Қолмен тексеру: court.gov.uz`,
    ky: (n) => `"${n}" боюнча сот жана аткаруу реестрлери көзөмөлдөнүүдө. Жаңы иш табылса дароо эскертебиз. Кол менен текшерүү: court.gov.uz`,
    tg: (n) => `Феҳристҳои судӣ ва иҷроия оид ба "${n}" назорат мешаванд. Ҳангоми парвандаи нав фавран огоҳ мекунем. Санҷиши дастӣ: court.gov.uz`,
    tk: (n) => `"${n}" boýunça kazyýet we ýerine ýetiriş sanawlaryna gözegçilik edilýär. Täze iş tapylsa derrew duýdurarys. El bilen barlamak: court.gov.uz`,
    az: (n) => `"${n}" üzrə məhkəmə və icra reyestrləri izlənilir. Yeni iş tapılsa dərhal xəbərdarlıq edəcəyik. Əl ilə yoxlama: court.gov.uz`,
  },

  // ---- BIZNES SALOMATLIGI AGENTI ----
  tax_due_title: {
    uz: (n) => `Soliq muddati: ${n}`,
    ru: (n) => `Налоговый срок: ${n}`,
    en: (n) => `Tax deadline: ${n}`,
    kk: (n) => `Салық мерзімі: ${n}`,
    ky: (n) => `Салык мөөнөтү: ${n}`,
    tg: (n) => `Мӯҳлати андоз: ${n}`,
    tk: (n) => `Salgyt möhleti: ${n}`,
    az: (n) => `Vergi müddəti: ${n}`,
  },
  tax_due_msg: {
    uz: (n, d, date, urgent) => `${n} muddati ${d} kun ichida (${date}). ${urgent ? "⚠️ Darhol tayyorlash kerak!" : 'Hujjatlarni tayyorlashni boshlang.'}`,
    ru: (n, d, date, urgent) => `Срок "${n}" — через ${d} дн. (${date}). ${urgent ? '⚠️ Срочно подготовьте документы!' : 'Начните подготовку документов.'}`,
    en: (n, d, date, urgent) => `"${n}" is due in ${d} days (${date}). ${urgent ? '⚠️ Prepare immediately!' : 'Start preparing the documents.'}`,
    kk: (n, d, date, urgent) => `${n} мерзімі ${d} күн ішінде (${date}). ${urgent ? '⚠️ Дереу дайындау керек!' : 'Құжаттарды дайындауды бастаңыз.'}`,
    ky: (n, d, date, urgent) => `${n} мөөнөтү ${d} күн ичинде (${date}). ${urgent ? '⚠️ Дароо даярдоо керек!' : 'Документтерди даярдоону баштаңыз.'}`,
    tg: (n, d, date, urgent) => `Мӯҳлати ${n} дар давоми ${d} рӯз (${date}). ${urgent ? '⚠️ Фавран омода кунед!' : 'Омодасозии ҳуҷҷатҳоро оғоз кунед.'}`,
    tk: (n, d, date, urgent) => `${n} möhleti ${d} günüň içinde (${date}). ${urgent ? '⚠️ Derrew taýýarlamaly!' : 'Resminamalary taýýarlap başlaň.'}`,
    az: (n, d, date, urgent) => `${n} müddəti ${d} gün ərzində (${date}). ${urgent ? '⚠️ Dərhal hazırlayın!' : 'Sənədləri hazırlamağa başlayın.'}`,
  },
  social_tax_title: {
    uz: "Ijtimoiy soliq to'lash muddati",
    ru: 'Срок уплаты социального налога',
    en: 'Social tax payment deadline',
    kk: 'Әлеуметтік салық төлеу мерзімі',
    ky: 'Социалдык салык төлөө мөөнөтү',
    tg: 'Мӯҳлати пардохти андози иҷтимоӣ',
    tk: 'Sosial salgyt töleg möhleti',
    az: 'Sosial vergi ödəmə müddəti',
  },
  social_tax_msg: {
    uz: (d, date, emp) => `Ijtimoiy soliq to'lash muddati ${d} kun ichida (${date}).${emp ? ` ${emp} ta xodim uchun hisoblang.` : ''}`,
    ru: (d, date, emp) => `Срок уплаты социального налога — через ${d} дн. (${date}).${emp ? ` Рассчитайте для ${emp} сотрудников.` : ''}`,
    en: (d, date, emp) => `Social tax is due in ${d} days (${date}).${emp ? ` Calculate for ${emp} employees.` : ''}`,
    kk: (d, date, emp) => `Әлеуметтік салық төлеу мерзімі ${d} күн ішінде (${date}).${emp ? ` ${emp} қызметкер үшін есептеңіз.` : ''}`,
    ky: (d, date, emp) => `Социалдык салык төлөө мөөнөтү ${d} күн ичинде (${date}).${emp ? ` ${emp} кызматкер үчүн эсептеңиз.` : ''}`,
    tg: (d, date, emp) => `Мӯҳлати пардохти андози иҷтимоӣ дар давоми ${d} рӯз (${date}).${emp ? ` Барои ${emp} корманд ҳисоб кунед.` : ''}`,
    tk: (d, date, emp) => `Sosial salgyt töleg möhleti ${d} günüň içinde (${date}).${emp ? ` ${emp} işgär üçin hasaplaň.` : ''}`,
    az: (d, date, emp) => `Sosial vergi ödəmə müddəti ${d} gün ərzində (${date}).${emp ? ` ${emp} işçi üçün hesablayın.` : ''}`,
  },
  emp_no_contract_title: {
    uz: (n) => `Xodim shartnomasi yo'q: ${n}`,
    ru: (n) => `Нет трудового договора: ${n}`,
    en: (n) => `No employment contract: ${n}`,
    kk: (n) => `Еңбек шарты жоқ: ${n}`,
    ky: (n) => `Эмгек келишими жок: ${n}`,
    tg: (n) => `Шартномаи меҳнатӣ нест: ${n}`,
    tk: (n) => `Zähmet şertnamasy ýok: ${n}`,
    az: (n) => `Əmək müqaviləsi yoxdur: ${n}`,
  },
  emp_no_contract_msg: {
    uz: (n, p) => `"${n}" (${p}) bilan rasmiy mehnat shartnomasi yo'q. Mehnat kodeksi bo'yicha bu jarima xavfi. Darhol shartnoma rasmiylashtiring — Yurist AI shablonlaridan foydalaning.`,
    ru: (n, p) => `С "${n}" (${p}) не оформлен трудовой договор. По Трудовому кодексу это риск штрафа. Срочно оформите договор — используйте шаблоны Yurist AI.`,
    en: (n, p) => `"${n}" (${p}) has no formal employment contract. Under the Labor Code this risks a fine. Formalize the contract now — use Yurist AI templates.`,
    kk: (n, p) => `"${n}" (${p}) ресми еңбек шартынсыз жұмыс істейді. Еңбек кодексі бойынша бұл айыппұл қаупі. Дереу шарт рәсімдеңіз.`,
    ky: (n, p) => `"${n}" (${p}) расмий эмгек келишимисиз иштейт. Эмгек кодекси боюнча бул айып коркунучу. Дароо келишим түзүңүз.`,
    tg: (n, p) => `"${n}" (${p}) бе шартномаи расмии меҳнатӣ кор мекунад. Тибқи Кодекси меҳнат ин хатари ҷарима аст. Фавран шартнома расмӣ кунед.`,
    tk: (n, p) => `"${n}" (${p}) resmi zähmet şertnamasyz işleýär. Zähmet kodeksine görä bu jerime howpy. Derrew şertnama resmileşdiriň.`,
    az: (n, p) => `"${n}" (${p}) rəsmi əmək müqaviləsi olmadan işləyir. Əmək Məcəlləsinə görə bu cərimə riskidir. Dərhal müqavilə rəsmiləşdirin.`,
  },
  emp_contract_expiring_title: {
    uz: (n) => `Mehnat shartnomasi muddati: ${n}`,
    ru: (n) => `Срок трудового договора: ${n}`,
    en: (n) => `Employment contract deadline: ${n}`,
    kk: (n) => `Еңбек шарты мерзімі: ${n}`,
    ky: (n) => `Эмгек келишим мөөнөтү: ${n}`,
    tg: (n) => `Мӯҳлати шартномаи меҳнатӣ: ${n}`,
    tk: (n) => `Zähmet şertnamasynyň möhleti: ${n}`,
    az: (n) => `Əmək müqaviləsi müddəti: ${n}`,
  },
  emp_contract_expiring_msg: {
    uz: (n, d, date) => `"${n}" bilan muddatli mehnat shartnomasi ${d} kun ichida (${date}) tugaydi. Uzaytirish yoki tugatish buyrug'ini rasmiylashtiring.`,
    ru: (n, d, date) => `Срочный трудовой договор с "${n}" истекает через ${d} дн. (${date}). Оформите продление или приказ о расторжении.`,
    en: (n, d, date) => `Fixed-term contract with "${n}" expires in ${d} days (${date}). Prepare a renewal or termination order.`,
    kk: (n, d, date) => `"${n}" мерзімді еңбек шарты ${d} күн ішінде (${date}) аяқталады. Ұзарту немесе тоқтату бұйрығын рәсімдеңіз.`,
    ky: (n, d, date) => `"${n}" мөөнөттүү эмгек келишими ${d} күн ичинде (${date}) бүтөт. Узартуу же токтотуу буйругун даярдаңыз.`,
    tg: (n, d, date) => `Шартномаи мӯҳлатноки "${n}" дар давоми ${d} рӯз (${date}) ба охир мерасад. Фармони дарозкунӣ ё қатъро омода кунед.`,
    tk: (n, d, date) => `"${n}" bilen möhletli zähmet şertnamasy ${d} günüň içinde (${date}) tamamlanýar. Uzaltma ýa-da ýatyrma buýrugyny taýýarlaň.`,
    az: (n, d, date) => `"${n}" ilə müddətli əmək müqaviləsi ${d} gün ərzində (${date}) bitir. Uzatma və ya xitam əmrini hazırlayın.`,
  },
  emp_contract_expired_title: {
    uz: (n) => `Mehnat shartnomasi tugagan: ${n}`,
    ru: (n) => `Трудовой договор истёк: ${n}`,
    en: (n) => `Employment contract expired: ${n}`,
    kk: (n) => `Еңбек шарты аяқталған: ${n}`,
    ky: (n) => `Эмгек келишими бүткөн: ${n}`,
    tg: (n) => `Шартномаи меҳнатӣ ба охир расидааст: ${n}`,
    tk: (n) => `Zähmet şertnamasy tamamlandy: ${n}`,
    az: (n) => `Əmək müqaviləsi bitib: ${n}`,
  },
  emp_contract_expired_msg: {
    uz: (n, d) => `"${n}" bilan mehnat shartnomasi ${d} kun oldin tugagan! Bu mehnat qonunchiligini buzish. Darhol yangi shartnoma tuzing.`,
    ru: (n, d) => `Трудовой договор с "${n}" истёк ${d} дн. назад! Это нарушение трудового законодательства. Срочно заключите новый договор.`,
    en: (n, d) => `Employment contract with "${n}" expired ${d} days ago! This violates labor law. Sign a new contract immediately.`,
    kk: (n, d) => `"${n}" еңбек шарты ${d} күн бұрын аяқталған! Бұл еңбек заңнамасын бұзу. Дереу жаңа шарт жасаңыз.`,
    ky: (n, d) => `"${n}" эмгек келишими ${d} күн мурун бүткөн! Бул эмгек мыйзамын бузуу. Дароо жаңы келишим түзүңүз.`,
    tg: (n, d) => `Шартномаи меҳнатии "${n}" ${d} рӯз пеш ба охир расидааст! Ин вайронкунии қонуни меҳнат аст. Фавран шартномаи нав бандед.`,
    tk: (n, d) => `"${n}" bilen zähmet şertnamasy ${d} gün öň tamamlandy! Bu zähmet kanunçylygyny bozmak. Derrew täze şertnama baglaşyň.`,
    az: (n, d) => `"${n}" ilə əmək müqaviləsi ${d} gün əvvəl bitib! Bu əmək qanunvericiliyini pozmaqdır. Dərhal yeni müqavilə bağlayın.`,
  },
  emp_medical_title: {
    uz: (n) => `Tibbiy ko'rik muddati: ${n}`,
    ru: (n) => `Срок медосмотра: ${n}`,
    en: (n) => `Medical check due: ${n}`,
    kk: (n) => `Медициналық тексеру мерзімі: ${n}`,
    ky: (n) => `Медициналык кароо мөөнөтү: ${n}`,
    tg: (n) => `Мӯҳлати муоинаи тиббӣ: ${n}`,
    tk: (n) => `Lukmançylyk barlagynyň möhleti: ${n}`,
    az: (n) => `Tibbi müayinə müddəti: ${n}`,
  },
  emp_medical_msg: {
    uz: (n, d, date) => `"${n}" uchun tibbiy ko'rik muddati ${d} kun ichida (${date}). SES tekshiruvida bu hujjat talab qilinadi.`,
    ru: (n, d, date) => `Срок медосмотра для "${n}" — через ${d} дн. (${date}). При проверке СЭС этот документ обязателен.`,
    en: (n, d, date) => `Medical check for "${n}" is due in ${d} days (${date}). Sanitary inspections require this document.`,
    kk: (n, d, date) => `"${n}" үшін медициналық тексеру мерзімі ${d} күн ішінде (${date}). СЭС тексеруінде бұл құжат талап етіледі.`,
    ky: (n, d, date) => `"${n}" үчүн медициналык кароо мөөнөтү ${d} күн ичинде (${date}). СЭС текшерүүсүндө бул документ талап кылынат.`,
    tg: (n, d, date) => `Мӯҳлати муоинаи тиббӣ барои "${n}" дар давоми ${d} рӯз (${date}). Ҳангоми санҷиши СЭС ин ҳуҷҷат талаб мешавад.`,
    tk: (n, d, date) => `"${n}" üçin lukmançylyk barlagy ${d} günüň içinde (${date}). SES barlagynda bu resminama talap edilýär.`,
    az: (n, d, date) => `"${n}" üçün tibbi müayinə müddəti ${d} gün ərzində (${date}). SES yoxlamasında bu sənəd tələb olunur.`,
  },
  emp_summary_title: {
    uz: (c) => `${c} ta xodim rasmiylashtirilmagan`,
    ru: (c) => `${c} сотрудник(ов) не оформлены`,
    en: (c) => `${c} employee(s) not formalized`,
    kk: (c) => `${c} қызметкер рәсімделмеген`,
    ky: (c) => `${c} кызматкер расмийлештирилген эмес`,
    tg: (c) => `${c} корманд расмӣ нашудааст`,
    tk: (c) => `${c} işgär resmileşdirilmedik`,
    az: (c) => `${c} işçi rəsmiləşdirilməyib`,
  },
  emp_summary_msg: {
    uz: (total, c) => `Jami ${total} ta xodimdan ${c} tasida mehnat shartnomasi yo'q. Mehnat inspeksiyasi tekshiruvida bu jiddiy xavf. Yurist AI orqali shartnomalarni yarating.`,
    ru: (total, c) => `Из ${total} сотрудников у ${c} нет трудового договора. При проверке трудовой инспекции это серьёзный риск. Создайте договоры через Yurist AI.`,
    en: (total, c) => `${c} out of ${total} employees have no employment contract. This is a serious risk in a labor inspection. Create contracts via Yurist AI.`,
    kk: (total, c) => `${total} қызметкердің ${c}-інде еңбек шарты жоқ. Еңбек инспекциясы тексеруінде бұл елеулі қауіп. Шарттарды Yurist AI арқылы жасаңыз.`,
    ky: (total, c) => `${total} кызматкердин ${c}инде эмгек келишими жок. Эмгек инспекциясынын текшерүүсүндө бул олуттуу коркунуч. Келишимдерди Yurist AI аркылуу түзүңүз.`,
    tg: (total, c) => `Аз ${total} корманд ${c} нафарашон шартномаи меҳнатӣ надоранд. Ҳангоми санҷиши нозироти меҳнат ин хатари ҷиддӣ аст.`,
    tk: (total, c) => `${total} işgäriň ${c}-sinde zähmet şertnamasy ýok. Zähmet gözegçiliginiň barlagynda bu çynlakaý howp.`,
    az: (total, c) => `${total} işçidən ${c}-ində əmək müqaviləsi yoxdur. Əmək müfəttişliyi yoxlamasında bu ciddi riskdir.`,
  },
  license_expiring_title: {
    uz: (n) => `Litsenziya muddati: ${n}`,
    ru: (n) => `Срок лицензии: ${n}`,
    en: (n) => `License expiring: ${n}`,
    kk: (n) => `Лицензия мерзімі: ${n}`,
    ky: (n) => `Лицензия мөөнөтү: ${n}`,
    tg: (n) => `Мӯҳлати литсензия: ${n}`,
    tk: (n) => `Ygtyýarnama möhleti: ${n}`,
    az: (n) => `Lisenziya müddəti: ${n}`,
  },
  license_expiring_msg: {
    uz: (n, org, d, date) => `"${n}"${org} litsenziyasi ${d} kun ichida (${date}) tugaydi. Yangilash uchun ariza topshiring.`,
    ru: (n, org, d, date) => `Лицензия "${n}"${org} истекает через ${d} дн. (${date}). Подайте заявление на продление.`,
    en: (n, org, d, date) => `License "${n}"${org} expires in ${d} days (${date}). Submit a renewal application.`,
    kk: (n, org, d, date) => `"${n}"${org} лицензиясы ${d} күн ішінде (${date}) аяқталады. Ұзартуға өтініш беріңіз.`,
    ky: (n, org, d, date) => `"${n}"${org} лицензиясы ${d} күн ичинде (${date}) бүтөт. Узартууга арыз бериңиз.`,
    tg: (n, org, d, date) => `Литсензияи "${n}"${org} дар давоми ${d} рӯз (${date}) ба охир мерасад. Барои дарозкунӣ ариза диҳед.`,
    tk: (n, org, d, date) => `"${n}"${org} ygtyýarnamasy ${d} günüň içinde (${date}) tamamlanýar. Uzaltmak üçin arza beriň.`,
    az: (n, org, d, date) => `"${n}"${org} lisenziyası ${d} gün ərzində (${date}) bitir. Uzatma üçün ərizə verin.`,
  },
  license_expired_title: {
    uz: (n) => `Litsenziya muddati o'tib ketdi: ${n}`,
    ru: (n) => `Лицензия истекла: ${n}`,
    en: (n) => `License expired: ${n}`,
    kk: (n) => `Лицензия мерзімі өткен: ${n}`,
    ky: (n) => `Лицензия мөөнөтү өткөн: ${n}`,
    tg: (n) => `Литсензия ба охир расидааст: ${n}`,
    tk: (n) => `Ygtyýarnamanyň möhleti geçdi: ${n}`,
    az: (n) => `Lisenziya müddəti keçib: ${n}`,
  },
  license_expired_msg: {
    uz: (n, d) => `"${n}" litsenziyasi ${d} kun oldin tugagan! Litsenziyasiz faoliyat ma'muriy va jinoiy javobgarlikka olib keladi. Darhol yangilang.`,
    ru: (n, d) => `Лицензия "${n}" истекла ${d} дн. назад! Деятельность без лицензии влечёт административную и уголовную ответственность. Срочно продлите.`,
    en: (n, d) => `License "${n}" expired ${d} days ago! Operating without a license carries administrative and criminal liability. Renew immediately.`,
    kk: (n, d) => `"${n}" лицензиясы ${d} күн бұрын аяқталған! Лицензиясыз қызмет әкімшілік және қылмыстық жауапкершілікке әкеледі. Дереу ұзартыңыз.`,
    ky: (n, d) => `"${n}" лицензиясы ${d} күн мурун бүткөн! Лицензиясыз иштөө административдик жана кылмыш жоопкерчилигине алып келет. Дароо узартыңыз.`,
    tg: (n, d) => `Литсензияи "${n}" ${d} рӯз пеш ба охир расидааст! Фаъолият бе литсензия ҷавобгарии маъмурӣ ва ҷиноӣ дорад. Фавран дароз кунед.`,
    tk: (n, d) => `"${n}" ygtyýarnamasy ${d} gün öň tamamlandy! Ygtyýarnamasyz işlemek administratiw we jenaýat jogapkärçiligine getirýär. Derrew uzaldyň.`,
    az: (n, d) => `"${n}" lisenziyası ${d} gün əvvəl bitib! Lisenziyasız fəaliyyət inzibati və cinayət məsuliyyətinə səbəb olur. Dərhal uzadın.`,
  },
  partner_watch_title: {
    uz: (p) => `Sherik kuzatuvi: ${p}`,
    ru: (p) => `Мониторинг контрагента: ${p}`,
    en: (p) => `Partner watch: ${p}`,
    kk: (p) => `Контрагентті бақылау: ${p}`,
    ky: (p) => `Өнөктөштү байкоо: ${p}`,
    tg: (p) => `Назорати шарик: ${p}`,
    tk: (p) => `Hyzmatdaşa gözegçilik: ${p}`,
    az: (p) => `Tərəfdaş nəzarəti: ${p}`,
  },
  partner_watch_msg: {
    uz: (p) => `"${p}" — soliq va sud reyestrlarida hozircha muammo aniqlanmadi. O'zgarish bo'lsa darhol ogohlantiramiz.`,
    ru: (p) => `"${p}" — в налоговом и судебном реестрах проблем пока не выявлено. При изменениях сразу предупредим.`,
    en: (p) => `"${p}" — no issues found in tax and court registries so far. You'll be alerted immediately if anything changes.`,
    kk: (p) => `"${p}" — салық және сот тізілімдерінде әзірге проблема анықталмады. Өзгеріс болса бірден ескертеміз.`,
    ky: (p) => `"${p}" — салык жана сот реестрлеринде азырынча көйгөй табылган жок. Өзгөрүү болсо дароо эскертебиз.`,
    tg: (p) => `"${p}" — дар феҳристҳои андоз ва судӣ ҳоло мушкилот ёфт нашуд. Ҳангоми тағйирот фавран огоҳ мекунем.`,
    tk: (p) => `"${p}" — salgyt we kazyýet sanawlarynda häzirlikçe mesele tapylmady. Üýtgeşme bolsa derrew duýdurarys.`,
    az: (p) => `"${p}" — vergi və məhkəmə reyestrlərində hələlik problem aşkarlanmadı. Dəyişiklik olsa dərhal xəbərdarlıq edəcəyik.`,
  },

  // ---- XABAR (NOTIFICATION) SARLAVHALARI ----
  notif_header: {
    uz: (agent, biz, c) => `🤖 ${agent} hisoboti\n📋 ${biz} uchun ${c} ta muhim ogohlantirish:`,
    ru: (agent, biz, c) => `🤖 Отчёт: ${agent}\n📋 ${c} важных предупреждений для ${biz}:`,
    en: (agent, biz, c) => `🤖 ${agent} report\n📋 ${c} important alerts for ${biz}:`,
    kk: (agent, biz, c) => `🤖 ${agent} есебі\n📋 ${biz} үшін ${c} маңызды ескерту:`,
    ky: (agent, biz, c) => `🤖 ${agent} отчёту\n📋 ${biz} үчүн ${c} маанилүү эскертүү:`,
    tg: (agent, biz, c) => `🤖 Ҳисоботи ${agent}\n📋 ${c} огоҳии муҳим барои ${biz}:`,
    tk: (agent, biz, c) => `🤖 ${agent} hasabaty\n📋 ${biz} üçin ${c} möhüm duýduryş:`,
    az: (agent, biz, c) => `🤖 ${agent} hesabatı\n📋 ${biz} üçün ${c} vacib xəbərdarlıq:`,
  },
  notif_footer: {
    uz: '➡️ Batafsil: Yurist AI Pro panelingizni oching.',
    ru: '➡️ Подробнее: откройте панель Yurist AI Pro.',
    en: '➡️ Details: open your Yurist AI Pro panel.',
    kk: '➡️ Толығырақ: Yurist AI Pro панелін ашыңыз.',
    ky: '➡️ Толугураак: Yurist AI Pro панелин ачыңыз.',
    tg: '➡️ Тафсилот: панели Yurist AI Pro-ро кушоед.',
    tk: '➡️ Jikme-jiklik: Yurist AI Pro paneliňizi açyň.',
    az: '➡️ Ətraflı: Yurist AI Pro panelinizi açın.',
  },
  agent_watcher_name: {
    uz: 'Kuzatuvchi Agent', ru: 'Агент-Наблюдатель', en: 'Watcher Agent',
    kk: 'Бақылаушы Агент', ky: 'Байкоочу Агент', tg: 'Агенти Нозир',
    tk: 'Gözegçi Agent', az: 'Nəzarətçi Agent',
  },
  agent_health_name: {
    uz: 'Biznes Salomatligi Agenti', ru: 'Агент Здоровья Бизнеса', en: 'Business Health Agent',
    kk: 'Бизнес Денсаулығы Агенті', ky: 'Бизнес Ден соолук Агенти', tg: 'Агенти Саломатии Бизнес',
    tk: 'Biznes Saglygy Agenti', az: 'Biznes Sağlamlığı Agenti',
  },
  your_business: {
    uz: 'Sizning biznesingiz', ru: 'Ваш бизнес', en: 'Your business',
    kk: 'Сіздің бизнесіңіз', ky: 'Сиздин бизнесиңиз', tg: 'Бизнеси шумо',
    tk: 'Siziň işiňiz', az: 'Sizin biznesiniz',
  },
};

// Yordamchi: hamkor qo'shimchasi (contract msg ichida ishlatiladi)
function c2(counterparty) {
  return '';
}
function cap(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

const SUPPORTED_LANGS = ['uz', 'ru', 'en', 'kk', 'ky', 'tg', 'tk', 'az'];

/**
 * Tarjima olish. key -- T dagi kalit, lang -- foydalanuvchi tili,
 * args -- funksiya bo'lsa unga uzatiladigan argumentlar.
 */
function t(key, lang, ...args) {
  const entry = T[key];
  if (!entry) return key;
  const safeLang = SUPPORTED_LANGS.includes(lang) ? lang : 'uz';
  const value = entry[safeLang] || entry.uz;
  return typeof value === 'function' ? value(...args) : value;
}

/**
 * Sana formatini foydalanuvchi tiliga moslashtirish
 */
function fmtDate(date, lang) {
  const locales = {
    uz: 'uz-UZ', ru: 'ru-RU', en: 'en-GB', kk: 'kk-KZ',
    ky: 'ky-KG', tg: 'tg-TJ', tk: 'tk-TM', az: 'az-AZ',
  };
  try {
    return new Date(date).toLocaleDateString(locales[lang] || 'uz-UZ');
  } catch (e) {
    return new Date(date).toISOString().slice(0, 10);
  }
}

module.exports = { t, fmtDate, SUPPORTED_LANGS };
