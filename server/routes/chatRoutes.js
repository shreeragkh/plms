const express = require("express");
const router = express.Router();
const { createSession, getMySessions, getMessages, sendMessage, saveAiMessage, deleteSession } = require("../controllers/chatController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router.post("/sessions",                              createSession);
router.get("/sessions/my",                            getMySessions);
router.get("/sessions/:sessionId/messages",           getMessages);
router.post("/sessions/:sessionId/messages",          sendMessage);
router.post("/sessions/:sessionId/ai-message",        saveAiMessage);
router.delete("/sessions/:sessionId",                 deleteSession);

module.exports = router;
