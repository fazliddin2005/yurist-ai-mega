// models/ArticleCache.js
// Qonun moddalari matnining keshi -- MongoDB'da saqlanadi (avval xotirada --
// server (yoki Vercel'ning "sovuq boshlanish"i) qayta ishga tushganda
// yo'qolib qolardi, endi doimiy saqlanadi).
//
// TIL BO'YICHA AJRATISH: bir xil modda turli tillarda so'ralishi mumkin
// (`_uz`, `_ru`, `_en` va h.k.) -- shuning uchun kalit tarkibiga `lang` ham
// kiradi (qarang: buildCacheKey()), har bir til alohida hujjat sifatida
// saqlanadi.
//
// HAJM NAZORATI: qo'lda "eski yozuvlarni o'chirish" logikasi yozish o'rniga
// MongoDB'ning TTL (Time-To-Live) index'idan foydalanamiz -- `expiresAt`
// maydoni belgilangan vaqtga yetganda MongoDB ORQALI O'ZI fon jarayonida
// hujjatni o'chiradi (har ~60 soniyada tekshiradi). Bu degani: kesh hajmi
// hech qachon cheksiz o'smaydi, bizga alohida "tozalash" kodi kerak emas.
const { mongoose } = require('./connection');
const { Schema } = mongoose;

const articleCacheSchema = new Schema(
  {
    // Masalan: "UZ_civil_101_uz" -- jurisdiction_lawKey_articleNo_lang
    cacheKey: { type: String, required: true, unique: true, index: true },
    jurisdiction: { type: String, required: true },
    lawKey: { type: String, required: true },
    articleNo: { type: String, required: true },
    lang: { type: String, required: true, default: 'uz' },
    // Modda matni va unga tegishli meta-ma'lumot (found, text, source,
    // officialUrl, isAiGenerated, fetchedAt) -- catalog.js javobi bilan bir xil.
    data: { type: Schema.Types.Mixed, required: true },
    // TTL index shu maydon asosida ishlaydi -- muddati o'tgan yozuvlarni
    // MongoDB o'zi avtomatik o'chiradi (expireAfterSeconds: 0 => aynan shu
    // sanada/vaqtda o'chirish).
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } }
);

module.exports = mongoose.models.ArticleCache || mongoose.model('ArticleCache', articleCacheSchema);
