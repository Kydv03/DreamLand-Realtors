// ============================================
//  server.js — DreamLand Realtors Backend
//  MongoDB + Groq AI + .env for safe keys
// ============================================

require("dotenv").config(); // ← loads .env file first

const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const Groq = require("groq-sdk");

const app = express();

// ── Keys now come from .env file ──
const PORT = process.env.PORT;
const MONGO_URL = process.env.MONGO_URL;
const GROQ_KEY = process.env.GROQ_KEY;

// ── Start Groq AI ──
const groq = new Groq({ apiKey: GROQ_KEY });

// ── Middleware ──
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// ── MongoDB Schema & Model ──
const leadSchema = new mongoose.Schema({
  name: String,
  phone: String,
  email: String,
  interest: String,
  message: String,
  date: { type: Date, default: Date.now },
});
const Lead = mongoose.model("Lead", leadSchema);

// ── Connect to MongoDB ──
mongoose
  .connect(MONGO_URL)
  .then(() => console.log("✅ Connected to MongoDB!"))
  .catch((err) => console.log("❌ MongoDB error:", err));

// ── Company context for AI ──
const COMPANY_CONTEXT = `
You are a helpful real estate assistant for DreamLand Realtors,
a trusted real estate company in Gurugram, Haryana, India.

COMPANY INFO:
- Name: DreamLand Realtors
- Location: Sector 14, Gurugram, Haryana - 122001
- Phone: +91 98765 43210
- Email: info@dreamlandrealtors.in
- Experience: 14+ years, 500+ properties sold

AVAILABLE PROPERTIES:
1. Premium Residential Plot
   - Location: Sector 95, Gurugram
   - Size: 200 sq yd
   - Price: Starting Rs 45 Lakhs
   - Features: 7/12 clear title, EMI available

2. Luxury Independent Villa
   - Location: Sohna Road, Gurugram
   - Size: 350 sq yd, 4 BHK
   - Price: Starting Rs 1.8 Crore
   - Features: EMI available, Hot deal

3. Modern 3 BHK Apartment
   - Location: DLF Phase 2, Gurugram
   - Size: 1450 sq ft, 3 BHK
   - Price: Starting Rs 92 Lakhs
   - Features: Bank loan ready, New launch

KEY FEATURES:
- All properties have clear title guarantee with 7/12 extract
- Flexible EMI options available
- All plots are physically demarcated
- Transparent dealings, no hidden charges

INSTRUCTIONS:
- Only answer questions related to real estate and DreamLand Realtors
- Always be polite and helpful
- Keep answers short and clear — max 3-4 lines
- If someone wants to visit, ask them to fill the contact form on the website
- Reply in the same language the user writes in (Hindi or English)
- Do not answer unrelated topics
`;

// ══════════════════════════════════════════
//  ROUTES
// ══════════════════════════════════════════

// Route 1 — Serve homepage
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Route 2 — Save enquiry
app.post("/enquiry", async (req, res) => {
  try {
    const newLead = new Lead({
      name: req.body.name,
      phone: req.body.phone,
      email: req.body.email,
      interest: req.body.interest,
      message: req.body.message,
    });
    await newLead.save();
    console.log("✅ New lead saved:", newLead.name);
    res.json({ success: true });
  } catch (error) {
    console.log("❌ Error saving lead:", error.message);
    res.json({ success: false });
  }
});

// Route 3 — Get all leads
app.get("/leads", async (req, res) => {
  try {
    const leads = await Lead.find();
    res.json(leads);
  } catch (error) {
    console.log("Leads error:", error.message);
    res.json({ error: "Could not fetch leads" });
  }
});

// Route 4 — AI Chatbot
app.post("/chat", async (req, res) => {
  try {
    const userMessage = req.body.message;
    console.log("User asked:", userMessage);

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: COMPANY_CONTEXT },
        { role: "user", content: userMessage },
      ],
      max_tokens: 300,
    });

    const reply = response.choices[0].message.content;
    console.log("AI replied:", reply);
    res.json({ success: true, reply: reply });
  } catch (error) {
    console.log("❌ AI error:", error.message);
    res.json({
      success: false,
      reply: "Sorry, I could not process your question. Please try again.",
    });
  }
});

// Route 5 — Delete a lead
app.delete("/leads/:id", async (req, res) => {
  try {
    await Lead.findByIdAndDelete(req.params.id);
    console.log("✅ Lead deleted:", req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.log("❌ Delete error:", error.message);
    res.json({ success: false });
  }
});
// ── Start server ──
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
