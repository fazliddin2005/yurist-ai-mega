// models/User.js
// B2C foydalanuvchi (shaxsiy hisob). B2B'da ham xuddi shu model ishlatiladi --
// bitta login orqali ham B2C, ham B2B'ga kirish ta'minlanadi.
const { mongoose } = require('./connection');
const { Schema } = mongoose;

const userSchema = new Schema(
  {
    name: { type: String, default: null },
    email: { type: String, default: null, lowercase: true, trim: true },
    phone: { type: String, default: null, trim: true },
    passwordHash: { type: String, required: false, default: null },
    isDemo: { type: Boolean, default: false },
    verified: { type: Boolean, default: true },
    credits: { type: Number, default: 5 },
    jurisdiction: { type: String, default: 'UZ' },
    lang: { type: String, default: 'uz' },
    googleId: { type: String, default: null, sparse: true },
    appleId: { type: String, default: null, sparse: true },
    avatar: { type: String, default: null },
    emailVerified: { type: Boolean, default: false },
    chatMsgCount: { type: Number, default: 0 }, // B2C/B2B AI chatda har 5 xabarga 1 kredit
    // HUQUQIY DALIL: foydalanuvchi qaysi versiyaga, qachon va qaysi IP
    // manzildan rozilik berganini saqlaymiz -- bu kelajakda "men bu
    // shartlarni o'qimagandim/ko'rmagandim" degan da'volarga qarshi muhim
    // dalil bo'ladi. termsAcceptedVersion joriy TERMS_VERSION dan KICHIK
    // bo'lsa (yoki umuman bo'lmasa), foydalanuvchidan qayta rozilik so'raladi.
    termsAcceptedVersion: { type: String, default: null },
    termsAcceptedAt: { type: Date, default: null },
    termsAcceptedIp: { type: String, default: null },
    // ---- 2FA / MFA (Harvey AI darajasi) ----
    twoFactorEnabled:  { type: Boolean, default: false },
    twoFactorSecret:   { type: String,  default: null },   // TOTP secret (AES encrypted)
    twoFactorBackupCodes: { type: [String], default: [] }, // 8 ta bir martalik kod
    // ---- JWT refresh tokens ----
    refreshTokens: { type: [String], default: [] }, // hashed refresh token lar
    // ---- Login history ----
    lastLoginAt: { type: Date, default: null },
    lastLoginIp: { type: String, default: null },
    failedLoginCount: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

// Email va telefon bo'yicha tezkor qidirish uchun indekslar (login/register paytida)
userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ termsAcceptedIp: 1 }); // huquqiy dalil qidiruvi uchun

// Eski JSON tizimdagi `id` maydoni o'rniga Mongo avtomatik `_id` beradi --
// lekin frontend va boshqa kod `id` kutadi, shuning uchun virtual maydon
// qo'shamiz va JSON'ga aylantirishda passwordHash'ni avtomatik olib tashlaymiz.
userSchema.virtual('id').get(function () {
  return this._id.toString();
});
userSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;
    delete ret.passwordHash;    // MAXFIYLIK: parol xeshi hech qachon chiqmasin
    delete ret.termsAcceptedIp; // XUSUSIY: foydalanuvchining IP manzili
    delete ret.googleId;        // MAXFIY: OAuth ID tashqi tizimga kerak emas
    delete ret.appleId;         // MAXFIY: OAuth ID tashqi tizimga kerak emas
    delete ret.chatMsgCount;    // ICHKI: kredit hisoblagich foydalanuvchiga kerak emas
    return ret;
  },
});
userSchema.set('toObject', { virtuals: true });

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
