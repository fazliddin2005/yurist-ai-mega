'use strict';
// server/middleware/security.js
// ============================================================================
// XAVFSIZLIK MIDDLEWARE TO'PLAMI
// Layer 4 (Auth/RLS), Layer 8 (Security), Layer 9 (Rate limiting) uchun
// qo'shimcha himoya qatlamlari.
// ============================================================================

const rateLimit = require('express-rate-limit');

// ---------------------------------------------------------------------------
// 1. GLOBAL API RATE LIMITER
//    Auth limiter (auth.js) va route-level limiterlardan TASHQARI,
//    umumiy API uchun so'nggi himoya qatlami.
// ---------------------------------------------------------------------------
const globalApiLimiter = rateLimit({
  windowMs: 60 * 1000,         // 1 daqiqa
  max: 120,                     // jami 120 so'rov/daqiqa (autentifikatsiyasiz)

  skip: (req) => {
    // Health check va config endpointlari -- limit qo'yilmaydi
    return req.path === '/health' || req.path === '/auth/config';
  },
  message: { error: "Juda ko'p so'rov. Bir daqiqadan keyin qayta urinib ko'ring." },
  standardHeaders: true,
  legacyHeaders: false,
});

// ---------------------------------------------------------------------------
// 2. SHUBHALI SO'ROV ANIQLOVCHI
//    SQL injection, XSS, path traversal kabi hujumlarni aniqlaydi.
//    Aniqlanganda so'rov bloklandi va SecurityIncident modeli log yozadi.
// ---------------------------------------------------------------------------
const SUSPICIOUS_PATTERNS = [
  // SQL injection
  /(\bUNION\b.*\bSELECT\b|\bDROP\b.*\bTABLE\b|\bINSERT\b.*\bINTO\b)/i,
  // NoSQL injection -- MongoDB operator injection
  // $where: ixtiyoriy JS kodi; $regex: ReDoS; $expr: aggregate pipeline injection
  /["']?\$(?:where|regex|expr|function|accumulator|reduce)["']?\s*:/i,
  // Bulk MongoDB operators in request body
  /["']?\$(?:ne|in|nin|gt|gte|lt|lte|all|elemMatch|size)["']?\s*:/i,
  // Path traversal (URL encoded va oddiy)
  /(?:\.\.\/|%2e%2e%2f|%252e%252e%252f)/i,
  // XSS
  /<script[\s>]/i,
  // Prototype pollution
  /__proto__|constructor\s*\[|prototype\s*\[/i,
];

function suspiciousRequestDetector(req, res, next) {
  // MUHIM: body kontent (shartnoma matni, hujjat) tekshirilmaydi --
  // yuristlar "DROP TABLE" yoki SQL atamalarini o'z hujjatlarida yozishi mumkin.
  // Faqat strukturali inputlar (query string, params, body keys) tekshiriladi.
  const structuralCheck = JSON.stringify({
    query: req.query,
    params: req.params,
    // body keys only (not values) - injection keys like {"$where": ...}
    bodyKeys: req.body && typeof req.body === 'object' ? Object.keys(req.body) : [],
  });

  // NoSQL va prototype injection uchun body VALUES ham tekshiramiz
  // lekin faqat string bo'lmagan (struktural) qismlar
  const bodyStr = req.body && typeof req.body === 'object'
    ? JSON.stringify(req.body)
    : '';

  for (const pattern of SUSPICIOUS_PATTERNS) {
    const toCheck = pattern.source.includes('proto') || pattern.source.includes('\$')
      ? bodyStr   // NoSQL/prototype -- full body
      : structuralCheck;  // SQL/path -- faqat struktural

    if (pattern.test(toCheck)) {
      // Asinxron log -- so'rovni bloklamaydi, faqat yozadi
      (async () => {
        try {
          const SecurityIncident = require('../models/SecurityIncident');
          await SecurityIncident.create({
            type: 'suspicious_request',
            severity: 'medium',
            ip: req.ip,
            userId: req.user?.id || null,
            path: req.path,
            method: req.method,
            pattern: pattern.toString(),
            snippet: toCheck.slice(0, 500),
            detectedAt: new Date(),
          });
        } catch (_) { /* log xatosi asosiy so'rovni buzmasligi kerak */ }
      })();

      return res.status(400).json({ error: "So'rov rad etildi." });
    }
  }
  next();
}

// ---------------------------------------------------------------------------
// 3. RESPONSE SIZE LIMITER
//    Juda katta javoblar (> 10MB) yuborilishini oldini oladi.
// ---------------------------------------------------------------------------
function responseSizeLimiter(req, res, next) {
  const originalJson = res.json.bind(res);
  res.json = function (data) {
    const str = JSON.stringify(data);
    if (str.length > 10 * 1024 * 1024) { // 10MB
      console.warn(`[security] Katta javob bloklandi: ${req.path} (${str.length} bytes)`);
      return originalJson({ error: 'Javob hajmi juda katta.' });
    }
    return originalJson(data);
  };
  next();
}

// ---------------------------------------------------------------------------
// 4. OWNERSHIP CHECKER FACTORY
//    Route handler ichida tez foydalanish uchun yordamchi funksiya.
//    Misol: ownershipCheck(doc.userId, req.user.id, res, 'Hujjat')
// ---------------------------------------------------------------------------
function ownershipCheck(resourceUserId, requestUserId, res, resourceName = 'Resurs') {
  if (String(resourceUserId) !== String(requestUserId)) {
    res.status(403).json({ error: `${resourceName} ga ruxsat yo'q.` });
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// 5. MONGODB OBJECTID VALIDATOR
//    params.id noto'g'ri formatda bo'lsa (injection yoki xato), Mongoose
//    500 xato qaytaradi. Bu middleware 400 bilan tezda javob beradi.
// ---------------------------------------------------------------------------
const mongoose = require('mongoose');

function validateObjectId(paramName = 'id') {
  return (req, res, next) => {
    const id = req.params[paramName];
    if (id && !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Noto'g'ri ID formati" });
    }
    next();
  };
}

// ---------------------------------------------------------------------------
// 6. SECURITY HEADERS EXTRA
//    Helmet dan tashqari qo'shimcha xavfsizlik sarlavhalari.
// ---------------------------------------------------------------------------
function extraSecurityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
}

module.exports = {
  globalApiLimiter,
  suspiciousRequestDetector,
  responseSizeLimiter,
  ownershipCheck,
  validateObjectId,
  extraSecurityHeaders,
};
