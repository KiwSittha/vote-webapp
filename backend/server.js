console.log("🔥 SERVER STARTED: KUVote System (API Mode with Audit Log) 🔥");
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

// ✅ ฟังก์ชันช่วยบันทึก Log (Audit Log Helper)
async function saveLog(action, email, req, details = {}) {
  try {
    if (!db) return; // ถ้า DB ยังไม่ต่อ ก็ข้ามไป

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || "Unknown";
    const userAgent = req.headers['user-agent'] || "Unknown";

    await db.collection("audit_logs").insertOne({
      action: action,       // ชื่อเหตุการณ์ เช่น LOGIN, VOTE
      email: email,         // ใครทำ
      ip: ip,               // ไอพีอะไร
      userAgent: userAgent, // ใช้อุปกรณ์อะไร
      details: details,     // รายละเอียดเพิ่มเติม
      timestamp: new Date() // เวลาที่เกิดเหตุ
    });

    console.log(`📝 [LOG SAVED] ${action}: ${email}`);
  } catch (err) {
    console.error("❌ Failed to save log:", err.message);
    // ไม่ throw error เพื่อไม่ให้กระทบการทำงานหลัก
  }
}

async function ensureTTLIndex() {
  try {
    const collection = db.collection("users");
    const indexes = await collection.indexes();

    const ttlIndex = indexes.find(
      (i) =>
        i.name === "createdAt_1" &&
        i.partialFilterExpression?.isVerified === false
    );

    if (ttlIndex) {
      if (ttlIndex.expireAfterSeconds !== 600) {
        await collection.dropIndex("createdAt_1");
        console.log("🗑 Dropped old TTL index");
      } else {
        console.log("✅ TTL index status: OK");
        return;
      }
    }

    await collection.createIndex(
      { createdAt: 1 },
      {
        expireAfterSeconds: 600,
        partialFilterExpression: { isVerified: false },
      }
    );
    console.log("⏳ TTL index created (10 minutes expire)");
  } catch (error) {
    console.error("⚠️ TTL Index Error:", error.message);
  }
}

async function connectDB() {
  try {
    await client.connect();
    db = client.db("vote");
    console.log("✅ MongoDB Connected Successfully");
    await ensureTTLIndex();
  } catch (err) {
    console.error("❌ MongoDB Connection FAILED:", err.message);
    process.exit(1); 
  }
}
connectDB();

// =======================
// Mail Function (Brevo API)
// =======================
async function sendEmailViaBrevo(toEmail, subject, htmlContent) {
  if (!process.env.BREVO_API_KEY) {
      throw new Error("❌ ไม่พบ BREVO_API_KEY ใน Environment Variables");
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "accept": "application/json",
      "api-key": process.env.BREVO_API_KEY,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      sender: { 
        name: "KUVote System", 
        email: process.env.EMAIL_USER || "no-reply@kuvote.com"
      },
      to: [{ email: toEmail }],
      subject: subject,
      htmlContent: htmlContent
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Brevo API Error: ${errorText}`);
  }
   
  console.log("✅ [API SUCCESS] Email sent via Brevo API");
}

// =======================
// Routes
// =======================

app.get("/", (req, res) => {
  res.send("🚀 KUVote API Server is Running (API Mode)!");
});

app.get("/healthz", (req, res) => {
    res.status(200).send("OK");
});

// =======================
// 1. Register Users
// =======================
app.post("/register/users", async (req, res) => {
  let insertedId = null; 

  try {
    const { email, faculty, loginPassword, votePin } = req.body;
    console.log(`📥 [REGISTER] Request for: ${email}`);

    const existingUser = await db.collection("users").findOne({ email });
    if (existingUser) {
        if (!existingUser.isVerified) {
             return res.status(409).json({ message: "อีเมลนี้ลงทะเบียนแล้ว แต่ยังไม่ยืนยันตัวตน" });
        }
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

    insertedId = result.insertedId;
    console.log(`✅ [DB] Inserted User ID: ${insertedId}`);

    // ✅ Log: บันทึกการสมัครสมาชิกใหม่
    saveLog("REGISTER_NEW", email, req, { faculty: faculty });

    const verifyToken = jwt.sign(
      { userId: insertedId },
      process.env.JWT_SECRET,
      { expiresIn: "10m" }
    );
    
    const frontendUrl = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.replace(/\/$/, "") : "http://localhost:3000";
    const verifyLink = `${frontendUrl}/verify-email/${verifyToken}`;

    const emailHtml = `
      <div style="font-family: sans-serif; background-color: #f4f4f5; padding: 40px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <div style="background-color: #10B981; padding: 20px; text-align: center; color: white;">
            <h1>KU Vote System</h1>
          </div>
          <div style="padding: 30px; text-align: center;">
            <h2>ยืนยันการลงทะเบียน</h2>
            <p>กรุณากดปุ่มด้านล่างเพื่อยืนยันอีเมลของคุณ (ลิงก์หมดอายุใน 10 นาที)</p>
            <a href="${verifyLink}" style="display: inline-block; background-color: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0;">ยืนยันอีเมลทันที</a>
            <p style="font-size: 12px; color: #666; margin-top: 20px;">หากปุ่มไม่ทำงาน: ${verifyLink}</p>
          </div>
        </div>
      </div>
    `;

    console.log("⏳ [MAIL] Sending email via Brevo API...");
    await sendEmailViaBrevo(email, "ยืนยันอีเมลของคุณ - KUVote", emailHtml);

    res.status(201).json({ message: "สมัครสำเร็จ กรุณาตรวจสอบอีเมลเพื่อยืนยันตัวตน" });

  } catch (err) {
    console.error("❌ [REGISTER ERROR]:", err.message);

    if (insertedId) {
        console.log("🧹 [ROLLBACK] Deleting user due to failure...");
        await db.collection("users").deleteOne({ _id: insertedId });
        console.log("   -> User deleted.");
    }

    res.status(500).json({ 
        error: "เกิดข้อผิดพลาดในการสมัครสมาชิก (ระบบส่งอีเมลขัดข้อง)",
        details: err.message 
    });
  }
});

// =======================
// 2. Verify Email
// =======================
app.get("/verify-email/:token", async (req, res) => {
  try {
    const decoded = jwt.verify(req.params.token, process.env.JWT_SECRET);

    const result = await db.collection("users").updateOne(
      { _id: new ObjectId(decoded.userId), isVerified: false },
      { $set: { isVerified: true } }
    );

    if (result.matchedCount === 0) {
      return res.status(400).send("<h1>❌ ไม่สำเร็จ</h1><p>บัญชีถูกยืนยันไปแล้ว หรือลิงก์หมดอายุ</p>");
    }

    // ✅ Log: บันทึกการยืนยันอีเมลสำเร็จ (หา User เพื่อเอา email มา log)
    const user = await db.collection("users").findOne({ _id: new ObjectId(decoded.userId) });
    if(user) saveLog("EMAIL_VERIFIED", user.email, req);

    res.send("<h1>🎉 ยืนยันสำเร็จ!</h1><p>กลับไปหน้า Login ได้เลย</p>");
  } catch (err) {
    res.status(400).send("<h1>❌ ลิงก์ไม่ถูกต้อง หรือหมดอายุ</h1>");
  }
});

// =======================
// 3. Login
// =======================
app.post("/login", async (req, res) => {
  try {
    let { email, loginPassword } = req.body;
    email = email?.trim().toLowerCase();

    const user = await db.collection("users").findOne({ email });

    if (!user) return res.status(404).json({ message: "ไม่พบอีเมลนี้ในระบบ" });

    if (!user.isVerified) {
      return res.status(403).json({ message: "กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ" });
    }

    const isPasswordCorrect = await bcrypt.compare(loginPassword, user.loginPassword);
    
    if (!isPasswordCorrect) {
        // ✅ Log: บันทึกความพยายามเข้าระบบผิดพลาด (ระวัง Brute Force)
        saveLog("LOGIN_FAILED", email, req, { reason: "Wrong Password" });
        return res.status(401).json({ message: "รหัสผ่านไม่ถูกต้อง" });
    }

    // ✅ Log: บันทึกการเข้าสู่ระบบสำเร็จ
    saveLog("LOGIN_SUCCESS", email, req, { faculty: user.faculty });

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
// 4. Candidates & Voting
// =======================
async function getNextCandidateId() {
  const result = await db.collection("counters").findOneAndUpdate(
    { _id: "candidateId" },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" }
  );
  return result.value.seq;
}

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

app.post("/vote", async (req, res) => {
  try {
    const { email, votePin, candidateId } = req.body;
    
    const user = await db.collection("users").findOne({ email });
    if (!user) return res.status(404).json({ message: "ไม่พบผู้ใช้" });
    if (user.hasVoted) return res.status(403).json({ message: "คุณใช้สิทธิ์ไปแล้ว" });

    const isPinCorrect = await bcrypt.compare(votePin, user.votePin);
    if (!isPinCorrect) {
        // ✅ Log: บันทึกการใส่ PIN ผิด (อาจจะเป็นคนอื่นพยายามใช้สิทธิ์)
        saveLog("VOTE_FAILED_PIN", email, req, { candidateId });
        return res.status(401).json({ message: "รหัสโหวตไม่ถูกต้อง" });
    }

    const candidate = await db.collection("candidates").findOne({ candidateId });
    if (!candidate) return res.status(404).json({ message: "ไม่พบผู้สมัคร" });

    await db.collection("users").updateOne(
      { email },
      { $set: { hasVoted: true, votedCandidate: candidateId } }
    );
    await db.collection("candidates").updateOne(
      { candidateId },
      { $inc: { votes: 1 } }
    );

    // ✅ Log: บันทึกการโหวตสำเร็จ (หลักฐานสำคัญ)
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

    let voted = 0;
    let notVoted = 0;
    result.forEach((item) => {
      if (item._id === true) voted = item.count;
      if (item._id === false) notVoted = item.count;
    });

    res.json({ voted, notVoted, totalVerified: voted + notVoted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Route พิเศษสำหรับ Admin: ดู Log 100 รายการล่าสุด
app.get("/admin/logs", async (req, res) => {
    try {
        const logs = await db.collection("audit_logs")
            .find({})
            .sort({ timestamp: -1 })
            .limit(100)
            .toArray();
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =======================
// Start Server
// =======================
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
