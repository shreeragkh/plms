const mongoose = require("mongoose");

// documents — extracted text from uploaded PDFs for RAG
const documentSchema = new mongoose.Schema({
  courseId:        { type: mongoose.Schema.Types.ObjectId, ref: "courses",   required: true },
  materialId:      { type: mongoose.Schema.Types.ObjectId, ref: "materials", required: true },
  uploadedBy:      { type: mongoose.Schema.Types.ObjectId, ref: "users",     required: true },
  documentText:    { type: String, required: true, trim: true },
  processedStatus: { type: String, enum: ["pending", "processed", "failed"], default: "pending" },
});

documentSchema.index({ courseId: 1 });
documentSchema.index({ materialId: 1 });

// embeddingsMeta — vector chunk tracking for FAISS/Pinecone
const embeddingsMetaSchema = new mongoose.Schema({
  documentId: { type: mongoose.Schema.Types.ObjectId, ref: "documents", required: true },
  chunkIndex: { type: Number, required: true },
  vectorId:   { type: String, required: true, trim: true },
  chunkText:  { type: String, required: true, trim: true },
});

embeddingsMetaSchema.index({ documentId: 1, chunkIndex: 1 });

// aiInteractions — logs every AI call
const aiInteractionSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: "users",   required: true },
  courseId:  { type: mongoose.Schema.Types.ObjectId, ref: "courses", required: true },
  query:     { type: String, required: true, trim: true },
  response:  { type: String, required: true, trim: true },
  type:      { type: String, enum: ["chat", "quiz_generation", "feedback"], required: true },
  createdAt: { type: Date, default: Date.now },
});

aiInteractionSchema.index({ userId: 1, type: 1 });
aiInteractionSchema.index({ courseId: 1 });

const Document       = mongoose.model("documents",       documentSchema);
const EmbeddingsMeta = mongoose.model("embeddingsMeta",  embeddingsMetaSchema);
const AiInteraction  = mongoose.model("aiInteractions",  aiInteractionSchema);

module.exports = { Document, EmbeddingsMeta, AiInteraction };
