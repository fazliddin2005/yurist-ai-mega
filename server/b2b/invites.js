// b2b/invites.js
// Xodimni workspace'ga taklif qilish tizimi. Owner/admin email/telefon
// kiritadi, tizim noyob taklif havolasi yaratadi. Odam shu havola orqali
// ro'yxatdan o'tsa (agar yangi bo'lsa) yoki kirsa (agar mavjud bo'lsa),
// avtomatik workspace'ga qo'shiladi.
//
// XABARNOMA: agar real SMS/email xizmati ulangan bo'lsa (.env'da
// ESKIZ_EMAIL/ESKIZ_PASSWORD yoki SENDGRID_API_KEY), taklif havolasi
// avtomatik yuboriladi. Ulanmagan bo'lsa (demo rejim), owner havolani
// nusxalab, o'zi xodimga yuborishi mumkin (Telegram, WhatsApp va h.k.
// orqali) -- createInvite natijasidagi `notification.sent` shuni bildiradi.
const { v4: uuidv4 } = require('uuid');
const Invite = require('../models/Invite');
const notifier = require('../notifier');

const EXPIRY_DAYS = 7;
const isEmailIdentifier = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

async function createInvite(workspaceId, invitedBy, identifier, role, opts = {}) {
  const now = new Date();
  const invite = await Invite.create({
    token: uuidv4().replace(/-/g, ''), // havolada ishlatiladigan noyob token
    organizationId: workspaceId,
    invitedBy,
    identifier: identifier.trim(),
    role: role || 'member',
    status: 'pending',
    expiresAt: new Date(now.getTime() + EXPIRY_DAYS * 24 * 60 * 60 * 1000),
  });

  // Taklif havolasini avtomatik yuborishga urinib ko'ramiz -- muvaffaqiyatsiz
  // bo'lsa ham (yoki demo rejimda bo'lsa ham) taklifning o'zi yaratilgan
  // holda qoladi, faqat "sent" bayrog'i false bo'ladi.
  let notification = { sent: false, demo: true };
  const appUrl = (process.env.APP_URL || '').replace(/\/$/, '');
  if (appUrl) {
    const link = `${appUrl}/b2b/invite/${invite.token}`;
    const orgName = opts.workspaceName || 'Yurist AI';
    const text = `${orgName} jamoasiga taklif qilindingiz. Qo'shilish uchun havolani oching: ${link}`;
    try {
      notification = isEmailIdentifier(invite.identifier)
        ? await notifier.sendGenericEmail(invite.identifier, `${orgName} jamoasiga taklif`, text)
        : await notifier.sendGenericSMS(invite.identifier, text);
    } catch (e) {
      console.error('[invites] xabarnoma yuborishda xato:', e.message);
    }
  }

  const obj = invite.toJSON();
  return { ...obj, notification };
}

async function findInviteByToken(token) {
  const invite = await Invite.findOne({ token });
  if (!invite) return null;
  const obj = invite.toJSON();
  if (obj.status !== 'pending') return { ...obj, expired: true };
  if (new Date(obj.expiresAt) < new Date()) return { ...obj, expired: true };
  return obj;
}

async function listInvites(workspaceId) {
  return Invite.find({
    organizationId: workspaceId,
    status: 'pending',
    expiresAt: { $gte: new Date() },
  });
}

async function markAccepted(inviteId) {
  return Invite.findByIdAndUpdate(inviteId, { status: 'accepted', acceptedAt: new Date() }, { new: true });
}

async function revokeInvite(workspaceId, inviteId) {
  const result = await Invite.deleteOne({ _id: inviteId, organizationId: workspaceId });
  return result.deletedCount;
}

module.exports = { createInvite, findInviteByToken, listInvites, markAccepted, revokeInvite };
