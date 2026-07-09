// services/proHealthAgent.js -- BIZNES SALOMATLIGI AGENTI (Yurist AI Pro)
//
// ICHKI xavflarni kuzatadi:
//   1. Soliq muddatlari (QQS 12%/6%, aylanma, ijtimoiy soliq)
//   2. Xodim huquqiy xavflari (shartnoma yo'qligi, muddati, tibbiy ko'rik)
//   3. Litsenziya va ruxsatnomalar muddati
//   4. Kontragent (sherik) kuzatuvi
//
// 8 TILDA ISHLAYDI -- agentI18n.js orqali.

const WatchProfile = require('../models/WatchProfile');
const ProSubscription = require('../models/ProSubscription');
const User = require('../models/User');
const { sendNotifications } = require('./watcherAgent');
const { t, fmtDate } = require('./agentI18n');

function daysUntil(date) {
  return Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24));
}
function alertLevel(daysLeft) {
  if (daysLeft <= 7) return 'critical';
  if (daysLeft <= 14) return 'warning';
  return 'info';
}

// Soliq nomlari -- 8 tilda
const TAX_NAMES = {
  qqs: {
    uz: 'QQS hisoboti', ru: 'Отчёт по НДС', en: 'VAT report', kk: 'ҚҚС есебі',
    ky: 'КНС отчёту', tg: 'Ҳисоботи ААИ', tk: 'GBS hasabaty', az: 'ƏDV hesabatı',
  },
  turnover: {
    uz: 'Aylanma soliq hisoboti', ru: 'Отчёт по налогу с оборота', en: 'Turnover tax report',
    kk: 'Айналым салығы есебі', ky: 'Жүгүртүү салык отчёту', tg: 'Ҳисоботи андози гардиш',
    tk: 'Dolanyşyk salgyt hasabaty', az: 'Dövriyyə vergisi hesabatı',
  },
};

// ----------------------------------------------------------------
// TEKSHIRUV 1: Soliq muddatlari
// ----------------------------------------------------------------
// O'ZBEKISTON SOLIQ TAQVIMI (Soliq kodeksi bo'yicha asosiy muddatlar):
//   - QQS (12% va 6% rejimlar): har oyning 20-sanasigacha hisobot + to'lov
//   - Aylanma soliq: har oyning 15-sanasigacha
//   - Ijtimoiy soliq: oylik ish haqi bilan birga (har oyning 15-sida deb olamiz)
// Eslatma: aniq muddatlar rejimga qarab farq qilishi mumkin -- foydalanuvchi
// profildagi taxNextDueAt orqali o'z muddatini qo'lda ham belgilashi mumkin.
function checkTaxDeadlines(profile, lang) {
  const alerts = [];
  const now = new Date();
  const regime = profile.taxRegime;

  // QQS rejimlari uchun: keyingi oyning 20-sanasi
  if (regime === 'qqs_12' || regime === 'qqs_6') {
    let due = new Date(now.getFullYear(), now.getMonth(), 20);
    if (due <= now) due = new Date(now.getFullYear(), now.getMonth() + 1, 20);
    const days = daysUntil(due);
    if (days <= 14) {
      const taxName = t !== undefined ? (TAX_NAMES.qqs[lang] || TAX_NAMES.qqs.uz) : 'QQS';
      alerts.push({
        agentType: 'health',
        level: alertLevel(days),
        title: t('tax_due_title', lang, taxName),
        message: t('tax_due_msg', lang, taxName, days, fmtDate(due, lang), days <= 7),
      });
    }
  }

  // Soddalashtirilgan (aylanma) rejim: har oyning 15-sanasi
  if (regime === 'simplified') {
    let due = new Date(now.getFullYear(), now.getMonth(), 15);
    if (due <= now) due = new Date(now.getFullYear(), now.getMonth() + 1, 15);
    const days = daysUntil(due);
    if (days <= 14) {
      const taxName = TAX_NAMES.turnover[lang] || TAX_NAMES.turnover.uz;
      alerts.push({
        agentType: 'health',
        level: alertLevel(days),
        title: t('tax_due_title', lang, taxName),
        message: t('tax_due_msg', lang, taxName, days, fmtDate(due, lang), days <= 7),
      });
    }
  }

  // Foydalanuvchi qo'lda belgilagan maxsus muddat
  if (profile.taxNextDueAt) {
    const days = daysUntil(profile.taxNextDueAt);
    if (days <= 14 && days >= -1) {
      alerts.push({
        agentType: 'health',
        level: alertLevel(Math.max(days, 0)),
        title: t('tax_due_title', lang, '—'),
        message: t('tax_due_msg', lang, '—', Math.max(days, 0), fmtDate(profile.taxNextDueAt, lang), days <= 7),
      });
    }
  }

  // Ijtimoiy soliq -- xodimlar bo'lsa (har oyning 15-si)
  if ((profile.employees || []).length > 0) {
    let due = new Date(now.getFullYear(), now.getMonth(), 15);
    if (due <= now) due = new Date(now.getFullYear(), now.getMonth() + 1, 15);
    const days = daysUntil(due);
    if (days <= 10) {
      alerts.push({
        agentType: 'health',
        level: alertLevel(days),
        title: t('social_tax_title', lang),
        message: t('social_tax_msg', lang, days, fmtDate(due, lang), profile.employees.length),
      });
    }
  }

  return alerts;
}

// ----------------------------------------------------------------
// TEKSHIRUV 2: Xodim huquqiy xavflari
// ----------------------------------------------------------------
function checkEmployeeRisks(profile, lang) {
  const alerts = [];
  const employees = profile.employees || [];
  if (employees.length === 0) return alerts;

  const unknownPos = { uz: 'lavozim kiritilmagan', ru: 'должность не указана', en: 'position not set',
    kk: 'лауазым көрсетілмеген', ky: 'кызмат орду көрсөтүлгөн эмес', tg: 'вазифа нишон дода нашудааст',
    tk: 'wezipe görkezilmedi', az: 'vəzifə göstərilməyib' };

  for (const emp of employees) {
    if (!emp.hasContract) {
      alerts.push({
        agentType: 'health',
        level: 'critical',
        title: t('emp_no_contract_title', lang, emp.name),
        message: t('emp_no_contract_msg', lang, emp.name, emp.position || (unknownPos[lang] || unknownPos.uz)),
      });
    }

    if (emp.contractType === 'fixed' && emp.contractExpiresAt) {
      const days = daysUntil(emp.contractExpiresAt);
      if (days < 0) {
        alerts.push({
          agentType: 'health',
          level: 'critical',
          title: t('emp_contract_expired_title', lang, emp.name),
          message: t('emp_contract_expired_msg', lang, emp.name, Math.abs(days)),
        });
      } else if (days <= 30) {
        alerts.push({
          agentType: 'health',
          level: alertLevel(days),
          title: t('emp_contract_expiring_title', lang, emp.name),
          message: t('emp_contract_expiring_msg', lang, emp.name, days, fmtDate(emp.contractExpiresAt, lang)),
        });
      }
    }

    if (emp.medicalCheckDue) {
      const days = daysUntil(emp.medicalCheckDue);
      if (days <= 30 && days >= 0) {
        alerts.push({
          agentType: 'health',
          level: alertLevel(days),
          title: t('emp_medical_title', lang, emp.name),
          message: t('emp_medical_msg', lang, emp.name, days, fmtDate(emp.medicalCheckDue, lang)),
        });
      }
    }
  }

  // Umumiy xulosa: bir nechta rasmiylashtirilmagan xodim bo'lsa
  const noContractCount = employees.filter((e) => !e.hasContract).length;
  if (noContractCount > 1) {
    alerts.push({
      agentType: 'health',
      level: 'critical',
      title: t('emp_summary_title', lang, noContractCount),
      message: t('emp_summary_msg', lang, employees.length, noContractCount),
    });
  }

  return alerts;
}

// ----------------------------------------------------------------
// TEKSHIRUV 3: Litsenziya va ruxsatnomalar
// ----------------------------------------------------------------
function checkLicenses(profile, lang) {
  const alerts = [];
  for (const lic of profile.licenses || []) {
    if (!lic.expiresAt) continue;
    const days = daysUntil(lic.expiresAt);

    if (days < 0) {
      alerts.push({
        agentType: 'health',
        level: 'critical',
        title: t('license_expired_title', lang, lic.name),
        message: t('license_expired_msg', lang, lic.name, Math.abs(days)),
      });
    } else if (days <= 60) {
      const org = lic.issuedBy ? ` (${lic.issuedBy})` : '';
      alerts.push({
        agentType: 'health',
        level: alertLevel(days),
        title: t('license_expiring_title', lang, lic.name),
        message: t('license_expiring_msg', lang, lic.name, org, days, fmtDate(lic.expiresAt, lang)),
      });
    }
  }
  return alerts;
}

// ----------------------------------------------------------------
// TEKSHIRUV 4: Kontragent (sherik) kuzatuvi
// ----------------------------------------------------------------
// HALOLLIK: soliq.uz/court.gov.uz ochiq API bermaydi. Kuzatuv faolligini
// bildiramiz, yolg'on "tekshirildi, toza" xulosasini BERMAYMIZ -- matnda
// "hozircha aniqlanmadi" deb ehtiyotkor ifodalangan.
function checkPartnerRisks(profile, lang) {
  const alerts = [];
  for (const partner of profile.watchPartners || []) {
    alerts.push({
      agentType: 'health',
      level: 'info',
      title: t('partner_watch_title', lang, partner),
      message: t('partner_watch_msg', lang, partner),
    });
  }
  return alerts;
}

// ----------------------------------------------------------------
// ASOSIY
// ----------------------------------------------------------------
async function runHealthAgent(userId) {
  try {
    const sub = await ProSubscription.findOne({ userId, status: 'active' });
    if (!sub || !sub.isActive()) return { ok: false, error: 'PRO_INACTIVE' };
    if (!sub.agents?.health) return { ok: false, error: 'AGENT_DISABLED' };

    const profile = await WatchProfile.findOne({ userId });
    if (!profile) return { ok: false, error: 'PROFILE_MISSING' };

    const user = await User.findById(userId).lean();
    const lang = user?.lang || 'uz';

    const allAlerts = [
      ...checkTaxDeadlines(profile, lang),
      ...checkEmployeeRisks(profile, lang),
      ...checkLicenses(profile, lang),
      ...checkPartnerRisks(profile, lang),
    ];

    if (allAlerts.length > 0) {
      const withTime = allAlerts.map((a) => ({ ...a, createdAt: new Date(), isRead: false }));
      const existing = (profile.alertHistory || []).map((a) =>
        typeof a.toObject === 'function' ? a.toObject() : a
      );
      profile.alertHistory = [...withTime, ...existing].slice(0, 50);
    }
    profile.lastHealthRunAt = new Date();
    await profile.save();

    await sendNotifications(sub, profile, allAlerts, t('agent_health_name', lang), lang, user);

    return { ok: true, alertsFound: allAlerts.length, alerts: allAlerts, ranAt: new Date().toISOString() };
  } catch (e) {
    console.error('[healthAgent] Xato:', e.message);
    return { ok: false, error: e.message };
  }
}

// Testlar uchun sof funksiyalarni ham eksport qilamiz (DB talab qilmaydi)
module.exports = { runHealthAgent, _checkTaxDeadlines: checkTaxDeadlines, _checkEmployeeRisks: checkEmployeeRisks, _checkLicenses: checkLicenses, _checkPartnerRisks: checkPartnerRisks };
