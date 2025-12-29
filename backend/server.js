console.log("🔥 SERVER FILE THIS ONE 🔥");
require("dotenv").config();

const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const cors = require("cors");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");

// 🔥 Socket.io
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

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
        <a href="${verifyLink}">ยืนยันอีเมล</a>
      `,
    });

    res.status(201).json({ message: "สมัครสำเร็จ กรุณายืนยันอีเมล" });
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
    let { email, loginPassword } = req.body;
    email = email.trim().toLowerCase();

    const user = await db.collection("users").findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "ไม่พบอีเมลนี้ในระบบ" });
    }

    if (!user.isVerified) {
      return res.status(403).json({ message: "กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ" });
    }

    const ok = await bcrypt.compare(loginPassword, user.loginPassword);
    if (!ok) {
      return res.status(401).json({ message: "รหัสผ่านไม่ถูกต้อง" });
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
        hasVoted: user.hasVoted,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =======================
// Candidate ID
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

    res.status(201).json({ message: "เพิ่มผู้สมัครสำเร็จ" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =======================
// Get candidates
// =======================
app.get("/candidates", async (req, res) => {
  const candidates = await db
    .collection("candidates")
    .find({})
    .sort({ votes: -1 })
    .toArray();

  res.json(candidates);
});

// =======================
// Vote (REAL-TIME 🔥)
// =======================
app.post("/vote", async (req, res) => {
  try {
    const { email, votePin, candidateId } = req.body;

    const user = await db.collection("users").findOne({ email });
    if (!user) return res.status(404).json({ message: "ไม่พบผู้ใช้" });
    if (user.hasVoted) return res.status(403).json({ message: "คุณใช้สิทธิ์ไปแล้ว" });

    const ok = await bcrypt.compare(votePin, user.votePin);
    if (!ok) return res.status(401).json({ message: "รหัสโหวตไม่ถูกต้อง" });

    await db.collection("users").updateOne(
      { email },
      { $set: { hasVoted: true, votedCandidate: candidateId } }
    );

    await db.collection("candidates").updateOne(
      { candidateId },
      { $inc: { votes: 1 } }
    );

    // 🔥 ส่งข้อมูลใหม่แบบ Real-time
    const updatedCandidates = await db
      .collection("candidates")
      .find({})
      .sort({ votes: -1 })
      .toArray();

    io.emit("voteUpdated", updatedCandidates);

    res.json({ message: "โหวตสำเร็จ" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/admin/delete-user/:id", async (req, res) => {
  try {
    const user = await db.collection("users").findOne({
      _id: new ObjectId(req.params.id),
    });

    if (!user) {
      return res.status(404).json({ message: "ไม่พบผู้ใช้" });
    }

    // ถ้าเคยโหวต → ลดคะแนน
    if (user.hasVoted && user.votedCandidate) {
      await db.collection("candidates").updateOne(
        { candidateId: user.votedCandidate },
        { $inc: { votes: -1 } }
      );
    }

    // ลบ user
    await db.collection("users").deleteOne({ _id: user._id });

    // ส่งคะแนนใหม่ให้ Dashboard
    const updatedCandidates = await db
      .collection("candidates")
      .find({})
      .sort({ votes: -1 })
      .toArray();

    io.emit("voteUpdated", updatedCandidates);

    res.json({ message: "ลบผู้โหวตและอัปเดตคะแนนเรียบร้อย" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// =======================
const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log("🚀 Server + Socket running on port", PORT);
});
