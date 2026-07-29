// models/WatchProfile.js -- Foydalanuvchining kuzatuv profili.
// Pro tarif sotib olinganida BITTA marta to'ldiriladi.
// Keyin ikkala agent (Kuzatuvchi + Biznes Salomatligi) shu profilga
// asoslanib ishlaydi -- foydalanuvchi qayta kiritmasdan ham agent ishlayveradi.

const { mongoose } = require('./connection');
const { Schema } = mongoose;

// Shartnoma muddatlari uchun kichik schema
const contractSchema = new Schema(
  {
    title: { type: String, required: true },       // "Ijara shartnomasi - Yunusobod"
    counterparty: { type: String, default: null }, // "Hamkor MChJ"
    signedAt: { type: Date, default: null },        // imzolangan sana
    expiresAt: { type: Date, required: true },      // tugash sanasi
    value: { type: Number, default: null },         // shartnoma summasi (so'm)
    notes: { type: String, default: null },
    notifiedDays: { type: [Number], default: [30, 14, 7] }, // necha kun oldin ogohlantirish
  },
  { _id: true }
);

// Xodim ma'lumotlari uchun kichik schema
const employeeSchema = new Schema(
  {
    name: { type: String, required: true },
    position: { type: String, default: null },
    hiredAt: { type: Date, default: null },
    contractType: {
      type: String,
      enum: ['fixed', 'indefinite', 'parttime', 'contractor'],
      default: 'indefinite',
    },
    contractExpiresAt: { type: Date, default: null }, // muddatli bo'lsa
    medicalCheckDue: { type: Date, default: null },   // tibbiy ko'rik muddati
    hasContract: { type: Boolean, default: true },
  },
  { _id: true }
);

// Litsenziya/ruxsatnoma uchun kichik schema
const licenseSchema = new Schema(
  {
    name: { type: String, required: true },   // "Oziq-ovqat sertifikati"
    issuedBy: { type: String, default: null }, // "SES"
    issuedAt: { type: Date, default: null },
    expiresAt: { type: Date, required: true },
    licenseNumber: { type: String, default: null },
  },
  { _id: true }
);

const watchProfileSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },

    // ---- UMUMIY BIZNES MA'LUMOTLARI ----
    businessName: { type: String, default: null },    // "Bahor MChJ"
    businessType: { type: String, default: null },    // "savdo", "xizmat", "ishlab chiqarish"
    taxRegime: {
      type: String,
      enum: ['qqs_12', 'qqs_6', 'simplified', 'individual', null],
      default: null,
    },
    inn: { type: String, default: null },              // STIR raqami
    region: { type: String, default: 'Toshkent' },

    // ---- KUZATUVCHI AGENT MA'LUMOTLARI ----
    // Shartnomalar ro'yxati (muddatlarni kuzatish uchun)
    contracts: { type: [contractSchema], default: [] },

    // Kuzatilishi kerak bo'lgan qonunchilik sohalari
    watchTopics: {
      type: [String],
      default: ['mehnat', 'soliq', 'litsenziya'],
      // Mumkin qiymatlar: 'mehnat', 'soliq', 'litsenziya', 'ijara', 'import_eksport', 'reklama'
    },

    // Sud/ijro kuzatuvi uchun kompaniya/shaxs nomi
    courtWatchNames: { type: [String], default: [] }, // ["Bahor MChJ", "Karimov Jasur"]

    // ---- BIZNES SALOMATLIGI AGENTI MA'LUMOTLARI ----
    // Xodimlar ro'yxati
    employees: { type: [employeeSchema], default: [] },

    // Litsenziyalar va ruxsatnomalar
    licenses: { type: [licenseSchema], default: [] },

    // Keyingi soliq to'lov sanalari (agent to'g'ri taqdim etadi)
    taxNextDueAt: { type: Date, default: null },

    // Sherik tekshiruvi uchun saqlanadigan kompaniyalar
    watchPartners: { type: [String], default: [] }, // ["Hamkor MChJ", "Logistika Plus"]

    // ---- AGENT ISHLASH HOLATI ----
    lastWatcherRunAt: { type: Date, default: null },   // Kuzatuvchi Agent oxirgi ishlagan vaqt
    lastHealthRunAt: { type: Date, default: null },    // Biznes Salomatligi oxirgi ishlagan vaqt

    // Topilgan xavflar tarixi (oxirgi 30 ta)
    alertHistory: {
      type: [
        {
          agentType: { type: String, enum: ['watcher', 'health'] },
          level: { type: String, enum: ['info', 'warning', 'critical'] },
          title: { type: String },
          message: { type: String },
          createdAt: { type: Date, default: Date.now },
          isRead: { type: Boolean, default: false },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

// Eslatma: userId'da `unique: true` allaqachon indeks yaratadi -- takrorlamaymiz.

watchProfileSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports =
  mongoose.models.WatchProfile ||
  mongoose.model('WatchProfile', watchProfileSchema);
