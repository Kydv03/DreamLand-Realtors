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
app.use(express.static(path.join(__dirname)));
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
a trusted real estate company in Gurgaon, India.

COMPANY INFO:
- Name: DreamLand Realtors
- Address: 340, Vipul Trade Centre, Sector 48, Gurgaon, Haryana
- Phone: 9996 94 9595
- Email: sameer@dreamlandrealtors.com
- Timings: Mon - Sun, 10:00 AM to 7:00 PM
- Website: www.dreamlandrealtors.com

PROPERTY TYPES WE DEAL IN:
- SCO Plots
- Residential Plots
- Builder Floors
- High Rise Apartments
- Ready to Move properties
- Office Space
- High Street Mall
- Budget Friendly properties

LOCATIONS WE COVER:
- Gurgaon, Delhi, Noida, Dubai

AWARD WINNING PARTNERS:
- DLF, M3M, Godrej, Emaar, Signature Global, Birla, Suncity

KEY FEATURES:
- Transparent dealings, no hidden charges
- Expert guidance end to end
- Wide network of premium properties
- Stress free buying process

INSTRUCTIONS:
- Only answer questions related to real estate and DreamLand Realtors
- Always be polite and helpful
- Keep answers short and clear — max 3 to 4 lines
- If someone wants to visit or enquire, ask them to fill the contact form
- Reply in the same language the user writes in (Hindi or English)
- Do not answer unrelated topics like cricket, movies, politics etc
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
