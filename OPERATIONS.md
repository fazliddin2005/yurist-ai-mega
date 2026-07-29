# Yurist AI — Operations & Recovery Guide

## 1. Uptime Monitoring (UptimeRobot — bepul)

### Sozlash tartibi:
1. [uptimerobot.com](https://uptimerobot.com) ga kiring → bepul account yarating
2. **Add New Monitor** bosing:
   - Monitor Type: `HTTP(s)`
   - Friendly Name: `Yurist AI Production`
   - URL: `https://yurist-ai-mega.vercel.app/api/health`
   - Monitoring Interval: `5 minutes`
3. **Alert Contact** qo'shing (Email va/yoki Telegram)
4. Status page yarating → foydalanuvchilarga ko'rsatish mumkin

### Health endpoint:
```
GET /api/health          → { ok: true, time: "..." }
GET /api/health/keys     → { openai: true, nia: true, mongodb: true }
```

---

## 2. MongoDB Atlas Backup

### M0 (Free tier) — MANUAL backup:
```bash
# Har hafta qo'lda export qiling:
mongodump --uri="mongodb+srv://..." --out=backup/$(date +%Y-%m-%d)

# Muhim collectionlar:
# users, documents, cases, chats, organizations, apikeys
```

### M10+ ($57/oy) — AVTOMATIK:
- Atlas dashboard → Backup → Enable Continuous Backup
- Point-in-time recovery (oxirgi 72 soat)
- Snapshot kuniga 1 marta avtomatik

---

## 3. Vercel Rollback

Agar yangi deploy xato bo'lsa:
1. Vercel Dashboard → Deployments
2. Ishlagan oxirgi deploymentni toping
3. 3 nuqta `...` → **Promote to Production**

---

## 4. Environment Variables backup

Vercel da env variablelar yo'qolishi mumkin (account o'chirish, transfer).
Quyidagilarni xavfsiz joyda saqlang (1Password, Bitwarden):

```
MONGODB_URI=
JWT_SECRET=
ADMIN_JWT_SECRET=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
NIA_API_KEY=
GOOGLE_CLIENT_ID=
PAYME_MERCHANT_ID=
CLICK_MERCHANT_ID=
TELEGRAM_BOT_TOKEN=
ADMIN_PASSWORD=
```

---

## 5. Disaster Recovery tartibi

| Holat | Vaqt | Yechim |
|-------|------|--------|
| Vercel down | 1-5 min | Vercel SLA 99.99% — kutish |
| MongoDB down | 5-15 min | Atlas avtomatik replica failover |
| Kod xatosi | 2 min | Vercel rollback (yuqorida) |
| Env variables yo'qoldi | 30 min | Backup dan qayta kiritish |
| Domain muammosi | 1-24 soat | Vercel domain sozlamalari |

---

## 6. GitHub Secrets sozlash (CI/CD uchun)

GitHub repo → Settings → Secrets → Actions:
```
TELEGRAM_BOT_TOKEN = <bot token>
TELEGRAM_CHAT_ID   = <chat id>
```

Bu sozlansa, har push'da va har Vercel deploy'dan keyin Telegram xabar keladi.
