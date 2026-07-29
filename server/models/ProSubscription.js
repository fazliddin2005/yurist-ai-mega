// models/ProSubscription.js -- Yurist AI Pro tarifi.
// Foydalanuvchi Pro tarifni sotib olganda shu model yaratiladi.
// Ikki agent shu model orqali aktivlanadi:
//   1. Kuzatuvchi Agent  -- tashqi xavflar (qonun o'zgarishi, shartnoma muddati, sud)
//   2. Biznes Salomatligi Agenti -- ichki xavflar (soliq, xodim, litsenziya, sherik)

const { mongoose } = require('./connection');
const { Schema } = mongoose;

const proSubscriptionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // bitta foydalanuvchi -- bitta Pro obuna
    },

    // Tarif turi: 'b2c' (shaxsiy) | 'b2b' (korporativ)
    plan: {
      type: String,
      enum: ['b2c', 'b2b'],
      default: 'b2c',
    },

    // Holat: 'active' | 'expired' | 'cancelled'
    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled'],
      default: 'active',
    },

    // Obuna boshlanish va tugash vaqti
    startedAt: { type: Date, default: Date.now },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 kun
    },

    // To'lov ma'lumotlari (hozircha test rejim)
    paymentMethod: { type: String, default: 'test' }, // 'payme' | 'click' | 'test'
    paymentRef: { type: String, default: null }, // to'lov ID (Payme/Click dan)

    // Qaysi agentlar yoqilgan
    agents: {
      watcher: { type: Boolean, default: true },   // Kuzatuvchi Agent
      health: { type: Boolean, default: true },     // Biznes Salomatligi Agenti
    },

    // Xabar yuborish kanali
    notifyChannel: {
      type: String,
      enum: ['telegram', 'email', 'sms', 'inapp'],
      default: 'inapp',
    },
    telegramChatId: { type: String, default: null }, // Telegram chat ID (ixtiyoriy)
  },
  { timestamps: true }
);

// Eslatma: userId'da `unique: true` allaqachon indeks yaratadi -- takrorlamaymiz.
proSubscriptionSchema.index({ status: 1, expiresAt: 1 }); // muddati o'tganlarni topish uchun

// Obuna faolmi?
proSubscriptionSchema.methods.isActive = function () {
  return this.status === 'active' && this.expiresAt > new Date();
};

proSubscriptionSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports =
  mongoose.models.ProSubscription ||
  mongoose.model('ProSubscription', proSubscriptionSchema);
