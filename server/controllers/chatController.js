const ChatSession = require("../models/ChatSession");
const Message = require("../models/Message");

// @POST /api/v1/chat/sessions — Start a new chat session
const createSession = async (req, res) => {
  try {
    const { courseId } = req.body;

    const session = await ChatSession.create({
      userId:  req.user._id,
      courseId: courseId || null,
      role:    req.user.role,
    });

    res.status(201).json({ success: true, session });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @GET /api/v1/chat/sessions/my — User: all their chat sessions
const getMySessions = async (req, res) => {
  try {
    const sessions = await ChatSession.find({ userId: req.user._id })
      .populate("courseId", "title")
      .sort({ lastMessageAt: -1 });

    res.json({ success: true, count: sessions.length, sessions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @GET /api/v1/chat/sessions/:sessionId/messages — Get message history
const getMessages = async (req, res) => {
  try {
    const session = await ChatSession.findById(req.params.sessionId);
    if (!session) return res.status(404).json({ success: false, message: "Session not found" });

    // Only the session owner or admin can read messages
    if (session.userId.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const messages = await Message.find({ chatSessionId: req.params.sessionId })
      .populate("senderId", "name role")
      .sort({ createdAt: 1 }); // oldest first for chat display

    res.json({ success: true, count: messages.length, messages });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @POST /api/v1/chat/sessions/:sessionId/messages — Send a message
const sendMessage = async (req, res) => {
  try {
    const { message, messageType } = req.body;

    const session = await ChatSession.findById(req.params.sessionId);
    if (!session) return res.status(404).json({ success: false, message: "Session not found" });

    if (session.userId.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const newMessage = await Message.create({
      chatSessionId: req.params.sessionId,
      senderId:      req.user._id,
      senderRole:    req.user.role,
      message,
      messageType:   messageType || "text",
    });

    // Update session's lastMessageAt
    session.lastMessageAt = new Date();
    await session.save();

    await newMessage.populate("senderId", "name role");
    res.status(201).json({ success: true, message: newMessage });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @POST /api/v1/chat/sessions/:sessionId/ai-message — AI sends a reply
// (Your AI teammate calls this after generating a response)
const saveAiMessage = async (req, res) => {
  try {
    const { response } = req.body;

    const session = await ChatSession.findById(req.params.sessionId);
    if (!session) return res.status(404).json({ success: false, message: "Session not found" });

    const aiMessage = await Message.create({
      chatSessionId: req.params.sessionId,
      senderId:      req.user._id, // AI response triggered on behalf of user
      senderRole:    "ai",
      message:       response,
      messageType:   "ai_response",
    });

    session.lastMessageAt = new Date();
    await session.save();

    res.status(201).json({ success: true, message: aiMessage });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @DELETE /api/v1/chat/sessions/:sessionId — Delete a session + its messages
const deleteSession = async (req, res) => {
  try {
    const session = await ChatSession.findById(req.params.sessionId);
    if (!session) return res.status(404).json({ success: false, message: "Session not found" });

    if (session.userId.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    await Message.deleteMany({ chatSessionId: req.params.sessionId });
    await ChatSession.findByIdAndDelete(req.params.sessionId);

    res.json({ success: true, message: "Chat session deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  createSession, getMySessions,
  getMessages, sendMessage, saveAiMessage,
  deleteSession,
};
