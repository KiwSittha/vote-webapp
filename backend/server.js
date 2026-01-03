console.log("🔥 SERVER STARTED: KUVote System (Final Secure Mode) 🔥");
require("dotenv").config();

const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();

// ตั้งค่า CORS
app.use(cors({
    origin: "*", 
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
}));

app.use(express.json());

// =======================
// MongoDB Connection
// =======================
const client = new MongoClient(process.env.MONGO_URI);
let db;

// ✅ Helper: บันทึก Log
async function saveLog(action, email, req, details = {}) {
  try {
    if (!db) return;

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || "Unknown";
    const userAgent = req.headers['user-agent'] || "Unknown";

    await db.collection("audit_logs").insertOne({
      action,
      email,
      ip,
      userAgent,
      details,
      timestamp: new Date()
    });

    console.log(`📝 [LOG] ${action}: ${email}`);
  } catch (err) {
    console.error("❌ Save log failed:", err.message);
  }
}

// ✅ Helper: ส่งอีเมล (Brevo API)
async function sendEmailViaBrevo(toEmail, subject, htmlContent) {
  if (!process.env.BREVO_API_KEY) throw new Error("❌ Missing BREVO_API_KEY");

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "accept": "application/json",
      "api-key": process.env.BREVO_API_KEY,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      sender: { name: "KUVote System", email: process.env.EMAIL_USER || "no-reply@kuvote.com" },
      to: [{ email: toEmail }],
      subject: subject,
      htmlContent: htmlContent
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Brevo Error: ${errorText}`);
  }
  console.log("✅ [MAIL] Sent to:", toEmail);
}

// 🔐 Middleware: ตรวจสอบ Token (Security Check)
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: "Access Denied: No Token" });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: "Invalid Token" });
    req.user = user; // แนบข้อมูล user (มี userId, email) ไปใช้ต่อ
    next();
  });
}

// Setup DB & TTL Index
async function connectDB() {
  try {
    await client.connect();
    db = client.db("vote");
    console.log("✅ MongoDB Connected");

    // TTL Index (ลบ User ที่ไม่ยืนยันภายใน 10 นาที)
    const collection = db.collection("users");
    await collection.createIndex(
      { createdAt: 1 },
      { expireAfterSeconds: 600, partialFilterExpression: { isVerified: false } }
    );
    console.log("⏳ TTL Index Verified");
  } catch (err) {
    console.error("❌ MongoDB Error:", err.message);
    process.exit(1); 
  }
}
connectDB();

// =======================
// Routes
// =======================

app.get("/", (req, res) => res.send("🚀 KUVote API is Running!"));
app.get("/healthz", (req, res) => res.status(200).send("OK"));

// 1. Register
app.post("/register/users", async (req, res) => {
  let insertedId = null; 
  try {
    const { email, faculty, loginPassword, votePin } = req.body;

    const existingUser = await db.collection("users").findOne({ email });
    if (existingUser) {
        if (!existingUser.isVerified) return res.status(409).json({ message: "รอการยืนยันอีเมล (หรือรอ 10 นาที)" });
        return res.status(409).json({ message: "อีเมลนี้ถูกใช้งานแล้ว" });
    }

    const hashedPassword = await bcrypt.hash(loginPassword, 10);
    const hashedPin = await bcrypt.hash(votePin, 10);

    const result = await db.collection("users").insertOne({
      email, faculty, loginPassword: hashedPassword, votePin: hashedPin,
      isVerified: false, hasVoted: false, createdAt: new Date(),
    });
    insertedId = result.insertedId;

    saveLog("REGISTER_NEW", email, req, { faculty });

    const verifyToken = jwt.sign({ userId: insertedId }, process.env.JWT_SECRET, { expiresIn: "10m" });
    const frontendUrl = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.replace(/\/$/, "") : "http://localhost:3000";
    
    await sendEmailViaBrevo(email, "ยืนยันอีเมล - KUVote", `
      <h2>ยืนยันการลงทะเบียน</h2>
      <p>กดปุ่มเพื่อยืนยัน (หมดอายุใน 10 นาที):</p>
      <a href="${frontendUrl}/verify-email/${verifyToken}">ยืนยันอีเมล</a>
    `);

    res.status(201).json({ message: "สมัครสำเร็จ โปรดเช็คอีเมล" });
  } catch (err) {
    if (insertedId) await db.collection("users").deleteOne({ _id: insertedId });
    res.status(500).json({ error: "สมัครไม่สำเร็จ", details: err.message });
  }
});

// 2. Verify Email
app.get("/verify-email/:token", async (req, res) => {
  try {
    const decoded = jwt.verify(req.params.token, process.env.JWT_SECRET);
    const result = await db.collection("users").updateOne(
      { _id: new ObjectId(decoded.userId), isVerified: false },
      { $set: { isVerified: true } }
    );

    if (result.matchedCount === 0) return res.status(400).send("<h1>ไม่สำเร็จ (ยืนยันไปแล้วหรือหมดอายุ)</h1>");

    const user = await db.collection("users").findOne({ _id: new ObjectId(decoded.userId) });
    if(user) saveLog("EMAIL_VERIFIED", user.email, req);

    res.send("<h1>🎉 ยืนยันสำเร็จ!</h1><p>ปิดหน้านี้แล้ว Login ได้เลย</p>");
  } catch (err) {
    res.status(400).send("<h1>ลิงก์ไม่ถูกต้อง หรือหมดอายุ</h1>");
  }
});

// 3. Login
app.post("/login", async (req, res) => {
  try {
    let { email, loginPassword } = req.body;
    email = email?.trim().toLowerCase();

    const user = await db.collection("users").findOne({ email });
    if (!user) return res.status(404).json({ message: "ไม่พบอีเมลนี้" });
    if (!user.isVerified) return res.status(403).json({ message: "กรุณายืนยันอีเมลก่อน" });

    const isMatch = await bcrypt.compare(loginPassword, user.loginPassword);
    if (!isMatch) {
        saveLog("LOGIN_FAILED", email, req, { reason: "Wrong Password" });
        return res.status(401).json({ message: "รหัสผ่านไม่ถูกต้อง" });
    }

    saveLog("LOGIN_SUCCESS", email, req, { faculty: user.faculty });

    const token = jwt.sign({ userId: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: "1d" });
    res.json({ token, user: { email: user.email, faculty: user.faculty, hasVoted: user.hasVoted } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Change Password
app.put("/user/change-password", async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { currentPassword, newPassword } = req.body;

    const user = await db.collection("users").findOne({ _id: new ObjectId(decoded.userId) });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(currentPassword, user.loginPassword);
    if (!isMatch) {
      saveLog("CHANGE_PASS_FAILED", user.email, req);
      return res.status(400).json({ message: "รหัสผ่านปัจจุบันไม่ถูกต้อง" });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await db.collection("users").updateOne({ _id: new ObjectId(decoded.userId) }, { $set: { loginPassword: hashedNewPassword } });

    saveLog("CHANGE_PASS_SUCCESS", user.email, req);
    res.json({ message: "เปลี่ยนรหัสผ่านสำเร็จ" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Forgot Password (Updated Validation)
app.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    // ตรวจสอบรูปแบบอีเมล
    if (!email || !email.trim().toLowerCase().endsWith("@ku.th")) {
        return res.status(400).json({ message: "กรุณาใช้อีเมลมหาวิทยาลัย (@ku.th) เท่านั้น" });
    }

    const user = await db.collection("users").findOne({ email: email.trim().toLowerCase() });

    // ❌ ถ้าไม่เจอ แจ้ง Error เลย
    if (!user) {
      saveLog("FORGOT_PASS_FAILED", email, req, { reason: "Not Found" });
      return res.status(404).json({ message: "ไม่พบอีเมลนี้ในระบบ กรุณาตรวจสอบความถูกต้อง" });
    }

    const secret = process.env.JWT_SECRET + user.loginPassword;
    const token = jwt.sign({ userId: user._id, email: user.email }, secret, { expiresIn: "15m" });
    
    const frontendUrl = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.replace(/\/$/, "") : "http://localhost:3000";
    const resetLink = `${frontendUrl}/reset-password/${user._id}/${token}`;

    await sendEmailViaBrevo(user.email, "รีเซ็ตรหัสผ่าน - KUVote", `
        <h2>ตั้งรหัสผ่านใหม่</h2>
        <a href="${resetLink}">กดตรงนี้เพื่อตั้งรหัสใหม่</a>
    `);
    
    saveLog("FORGOT_PASS_REQ", user.email, req);
    res.json({ message: "ส่งลิงก์รีเซ็ตรหัสผ่านเรียบร้อยแล้ว" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Reset Password
app.post("/reset-password/:id/:token", async (req, res) => {
  const { id, token } = req.params;
  const { newPassword } = req.body;

  try {
    const user = await db.collection("users").findOne({ _id: new ObjectId(id) });
    if (!user) return res.status(404).json({ message: "User not found" });

    const secret = process.env.JWT_SECRET + user.loginPassword;
    try { jwt.verify(token, secret); } catch (err) { return res.status(400).json({ message: "ลิงก์หมดอายุ" }); }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.collection("users").updateOne({ _id: new ObjectId(id) }, { $set: { loginPassword: hashedPassword } });

    saveLog("RESET_PASS_SUCCESS", user.email, req);
    res.json({ message: "เปลี่ยนรหัสผ่านสำเร็จ" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =======================
// Candidate & Voting
// =======================

async function getNextCandidateId() {
  const result = await db.collection("counters").findOneAndUpdate(
    { _id: "candidateId" }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: "after" }
  );
  return result.value.seq;
}

app.post("/candidate", async (req, res) => {
  try {
    const { name, faculty, position, policies } = req.body;
    const candidateId = await getNextCandidateId();
    await db.collection("candidates").insertOne({
      candidateId, name, faculty, position, policies: policies || [], votes: 0, createdAt: new Date()
    });
    res.status(201).json({ message: "เพิ่มผู้สมัครสำเร็จ", candidateId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/candidates", async (req, res) => {
  try {
    const candidates = await db.collection("candidates").find({}).sort({ votes: -1 }).toArray();
    res.json(candidates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔥 VOTE ROUTE (Secure Mode) 🛡️
// ใช้ authenticateToken เพื่อดึง email จาก Token แทน req.body
app.post("/vote", authenticateToken, async (req, res) => {
  try {
    // ✅ ดึงอีเมลจาก Token ที่ยืนยันตัวตนแล้ว (ปลอดภัยกว่ารับจาก body)
    const email = req.user.email;
    const { votePin, candidateId } = req.body;
    
    const user = await db.collection("users").findOne({ email });
    if (!user) return res.status(404).json({ message: "ไม่พบข้อมูลผู้ใช้" });
    if (user.hasVoted) return res.status(403).json({ message: "คุณใช้สิทธิ์ไปแล้ว" });

    const isPinCorrect = await bcrypt.compare(votePin, user.votePin);
    if (!isPinCorrect) {
        saveLog("VOTE_FAILED_PIN", email, req, { candidateId });
        return res.status(401).json({ message: "รหัสโหวต (PIN) ไม่ถูกต้อง" });
    }

    const candidate = await db.collection("candidates").findOne({ candidateId });
    if (!candidate) return res.status(404).json({ message: "ไม่พบผู้สมัคร" });

    // Update DB
    await db.collection("users").updateOne({ email }, { $set: { hasVoted: true, votedCandidate: candidateId } });
    await db.collection("candidates").updateOne({ candidateId }, { $inc: { votes: 1 } });

    saveLog("VOTE_SUBMIT", email, req, { candidateId });
    res.json({ message: "โหวตสำเร็จ" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/stats/vote-summary", async (req, res) => {
  try {
    const result = await db.collection("users").aggregate([
      { $match: { isVerified: true } },
      { $group: { _id: "$hasVoted", count: { $sum: 1 } } },
    ]).toArray();

    let voted = 0, notVoted = 0;
    result.forEach((item) => {
      if (item._id === true) voted = item.count;
      if (item._id === false) notVoted = item.count;
    });

    res.json({ voted, notVoted, totalVerified: voted + notVoted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/admin/logs", async (req, res) => {
    try {
        const logs = await db.collection("audit_logs").find({}).sort({ timestamp: -1 }).limit(100).toArray();
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));