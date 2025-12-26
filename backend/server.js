console.log("🔥 SERVER FILE THIS ONE 🔥");
require("dotenv").config();

const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const cors = require("cors");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors());
app.use(express.json());

// =======================
// MongoDB
// =======================
const client = new MongoClient(process.env.MONGO_URI);
let db;

async function connectDB() {
  try {
    await client.connect();
    db = client.db("vote");
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
  }
}
connectDB();

// =======================
// Mail
// =======================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// =======================
// Test route
// =======================
app.get("/", (req, res) => {
  res.send("Server ทำงานแล้ว!");
});

// =======================
// Register
// =======================
app.post("/register/users", async (req, res) => {
  try {
    const { email, faculty, loginPassword, votePin } = req.body;

    // เช็คอีเมลซ้ำ
    const existingUser = await db.collection("users").findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "อีเมลนี้ถูกใช้งานแล้ว" });
    }

    const hashedPassword = await bcrypt.hash(loginPassword, 10);
    const hashedPin = await bcrypt.hash(votePin, 10);

    const result = await db.collection("users").insertOne({
      email,
      faculty,
      loginPassword: hashedPassword,
      votePin: hashedPin,
      isVerified: false,
      hasVoted: false,
      createdAt: new Date(),
    });

    // token ยืนยันอีเมล
    const verifyToken = jwt.sign(
      { userId: result.insertedId },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    const verifyLink = `${process.env.FRONTEND_URL}/verify-email/${verifyToken}`;

    await transporter.sendMail({
      from: `"KUVote" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "ยืนยันอีเมลของคุณ",
      html: `
        <h2>ยืนยันอีเมล</h2>
        <p>กรุณากดลิงก์ด้านล่างเพื่อยืนยันอีเมล</p>
        <a href="${verifyLink}">ยืนยันอีเมล</a>
      `,
    });

    res.status(201).json({
      message: "สมัครสำเร็จ กรุณายืนยันอีเมล",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =======================
// Verify Email
// =======================
app.get("/verify-email/:token", async (req, res) => {
  try {
    const decoded = jwt.verify(req.params.token, process.env.JWT_SECRET);

    await db.collection("users").updateOne(
      { _id: new ObjectId(decoded.userId) },
      { $set: { isVerified: true } }
    );

    res.send("ยืนยันอีเมลสำเร็จแล้ว 🎉");
  } catch {
    res.status(400).send("ลิงก์ไม่ถูกต้องหรือหมดอายุ");
  }
});

// =======================
// Login
// =======================
app.post("/login", async (req, res) => {
  try {
    let { email} = req.body;

    console.log("📥 LOGIN REQUEST:", email);

    // 🔧 แก้ตรงนี้ (สำคัญ)
    email = email?.trim().toLowerCase();

    const user = await db.collection("users").findOne({ email });

    console.log("👤 USER FOUND:", user);

    if (!user) {
      return res.status(404).json({
        message: "ไม่พบอีเมลนี้ในระบบ"
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        message: "กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ"
      });
    }

    const isPasswordCorrect = await bcrypt.compare(
      loginPassword,
      user.loginPassword
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: "รหัสผ่านไม่ถูกต้อง"
      });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user: {
        email: user.email,
        faculty: user.faculty,
        hasVoted: user.hasVoted
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// =======================
// Candidate ID counter
// =======================
async function getNextCandidateId() {
  const result = await db.collection("counters").findOneAndUpdate(
    { _id: "candidateId" },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" }
  );
  return result.value.seq;
}

// =======================
// Add candidate
// =======================
app.post("/candidate", async (req, res) => {
  try {
    const { name, faculty, position, policies } = req.body;

    const candidateId = await getNextCandidateId();

    await db.collection("candidates").insertOne({
      candidateId,
      name,
      faculty,
      position,
      policies: policies || [],
      votes: 0,
      createdAt: new Date(),
    });

    res.status(201).json({
      message: "เพิ่มผู้สมัครสำเร็จ",
      candidateId,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =======================
// Get candidates
// =======================
app.get("/candidates", async (req, res) => {
  try {
    const candidates = await db
      .collection("candidates")
      .find({})
      .sort({ votes: -1 })
      .toArray();

    res.json(candidates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =======================
// Vote (FIXED PIN)
// =======================
app.post("/vote", async (req, res) => {
  try {
    const { email, votePin, candidateId } = req.body;

    const user = await db.collection("users").findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "ไม่พบผู้ใช้" });
    }

    if (user.hasVoted) {
      return res.status(403).json({ message: "คุณใช้สิทธิ์ไปแล้ว" });
    }

    const isPinCorrect = await bcrypt.compare(votePin, user.votePin);
    if (!isPinCorrect) {
      return res.status(401).json({ message: "รหัสยืนยันโหวตไม่ถูกต้อง" });
    }

    const candidate = await db
      .collection("candidates")
      .findOne({ candidateId });

    if (!candidate) {
      return res.status(404).json({ message: "ไม่พบผู้สมัคร" });
    }

    await db.collection("users").updateOne(
      { email },
      { $set: { hasVoted: true, votedCandidate: candidateId } }
    );

    await db.collection("candidates").updateOne(
      { candidateId },
      { $inc: { votes: 1 } }
    );

    res.json({ message: "โหวตสำเร็จ" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =======================
app.listen(process.env.PORT, () => {
  console.log("🚀 Server running on port", process.env.PORT);
});
