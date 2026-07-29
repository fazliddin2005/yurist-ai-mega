'use strict';
// routes/matter.js -- Harvey AI darajasi: Matter Management
// Har bir "ish" (case) uchun bog'langan barcha ma'lumotlar:
// chatlar, hujjatlar, tarix, faoliyat jurnali
const express = require('express');
const { requireAuth } = require('./auth');
const { validateObjectId } = require('../middleware/security');
const { Chat, Document, Case } = require('../models');
const router = express.Router();

// GET /api/matter/:caseId -- ish bo'yicha barcha ma'lumotlar
router.get('/:caseId', requireAuth, validateObjectId('caseId'), async (req, res) => {
  try {
    const { caseId } = req.params;

    const [caseDoc, chats, documents] = await Promise.all([
      Case.findOne({ _id: caseId, userId: req.user.id }),
      Chat.find({ caseId, userId: req.user.id }).sort('-updatedAt').select('title updatedAt messages scope').limit(20),
      Document.find({ caseId, userId: req.user.id }).sort('-createdAt').select('name status createdAt templateKey').limit(20),
    ]);

    if (!caseDoc) return res.status(404).json({ error: 'Ish topilmadi' });

    res.json({
      case: caseDoc,
      chats,
      documents,
      stats: {
        totalChats: chats.length,
        totalDocuments: documents.length,
      },
    });
  } catch (e) {
    console.error('[matter/get]', e.message);
    res.status(500).json({ error: "Ma'lumotlarni olishda xato" });
  }
});

// POST /api/matter/:caseId/link-chat -- chatni ishga bog'lash
router.post('/:caseId/link-chat', requireAuth, validateObjectId('caseId'), async (req, res) => {
  try {
    const { caseId } = req.params;
    const { chatId } = req.body;
    if (!chatId) return res.status(400).json({ error: 'chatId talab qilinadi' });

    const [caseDoc, chat] = await Promise.all([
      Case.findOne({ _id: caseId, userId: req.user.id }),
      Chat.findOne({ _id: chatId, userId: req.user.id }),
    ]);

    if (!caseDoc) return res.status(404).json({ error: 'Ish topilmadi' });
    if (!chat) return res.status(404).json({ error: 'Chat topilmadi' });

    chat.caseId = caseId;
    await chat.save();

    res.json({ ok: true, message: "Chat ishga bog'landi" });
  } catch (e) {
    res.status(500).json({ error: "Bog'lashda xato" });
  }
});

// POST /api/matter/:caseId/link-doc -- hujjatni ishga bog'lash
router.post('/:caseId/link-doc', requireAuth, validateObjectId('caseId'), async (req, res) => {
  try {
    const { caseId } = req.params;
    const { docId } = req.body;
    if (!docId) return res.status(400).json({ error: 'docId talab qilinadi' });

    const [caseDoc, doc] = await Promise.all([
      Case.findOne({ _id: caseId, userId: req.user.id }),
      Document.findOne({ _id: docId, userId: req.user.id }),
    ]);

    if (!caseDoc) return res.status(404).json({ error: 'Ish topilmadi' });
    if (!doc) return res.status(404).json({ error: 'Hujjat topilmadi' });

    doc.caseId = caseId;
    await doc.save();

    res.json({ ok: true, message: "Hujjat ishga bog'landi" });
  } catch (e) {
    res.status(500).json({ error: "Bog'lashda xato" });
  }
});

module.exports = router;
