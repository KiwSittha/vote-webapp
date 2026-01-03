console.log("🔥 SERVER STARTED: KUVote System (API Mode) 🔥");
require("dotenv").config();

const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
// const nodemailer = require("nodemailer"); // ❌ ไม่ใช้แล้ว (Comment ออกหรือลบได้เลย)

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
// ✅ Mail Function (Brevo API) - ทางแก้ปัญหา Timeout
// =======================
async function sendEmailViaBrevo(toEmail, subject, htmlContent) {
  // เช็คว่ามี API Key หรือยัง
  if (!process.env.BREVO_API_KEY) {
      throw new Error("❌ ไม่พบ BREVO_API_KEY ใน Environment Variables");
  }

  // ส่ง request ไปที่ Brevo API โดยตรง (ไม่ผ่าน SMTP Port)
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "accept": "application/json",
      "api-key": process.env.BREVO_API_KEY, // ต้องตั้งค่าใน Render
      "content-type": "application/json"
    },
    body: JSON.stringify({
      sender: { 
        name: "KUVote System", 
        email: process.env.EMAIL_USER || "no-reply@kuvote.com" // ใช้อีเมลที่ยืนยันกับ Brevo
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

// ✅ Health Check Route (สำหรับ Render)
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

    // 1. ตรวจสอบ User ซ้ำ
    const existingUser = await db.collection("users").findOne({ email });
    if (existingUser) {
        if (!existingUser.isVerified) {
             return res.status(409).json({ message: "อีเมลนี้ลงทะเบียนแล้ว แต่ยังไม่ยืนยันตัวตน (กรุณารอ 10 นาทีหรือตรวจสอบอีเมล)" });
        }
        return res.status(409).json({ message: "อีเมลนี้ถูกใช้งานแล้ว" });
    }

    // 2. Hash Password
    const hashedPassword = await bcrypt.hash(loginPassword, 10);
    const hashedPin = await bcrypt.hash(votePin, 10);

    // 3. Insert DB
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

    // 4. Generate Link
    const verifyToken = jwt.sign(
      { userId: insertedId },
      process.env.JWT_SECRET,
      { expiresIn: "10m" }
    );
    
    // จัดการ URL ให้สวยงาม (เอา Slash ท้ายออก)
    const frontendUrl = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.replace(/\/$/, "") : "http://localhost:3000";
    const verifyLink = `${frontendUrl}/verify-email/${verifyToken}`;

    // 5. Prepare HTML
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

    // 6. 🔥 ส่งอีเมลด้วย API (แก้ปัญหา Timeout)
    console.log("⏳ [MAIL] Sending email via Brevo API...");
    await sendEmailViaBrevo(email, "ยืนยันอีเมลของคุณ - KUVote", emailHtml);

    res.status(201).json({ message: "สมัครสำเร็จ กรุณาตรวจสอบอีเมลเพื่อยืนยันตัวตน" });

  } catch (err) {
    console.error("❌ [REGISTER ERROR]:", err.message);

    // 🔥 Rollback System
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
    if (!isPasswordCorrect) return res.status(401).json({ message: "รหัสผ่านไม่ถูกต้อง" });

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
    if (!isPinCorrect) return res.status(401).json({ message: "รหัสโหวตไม่ถูกต้อง" });

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

// =======================
// Start Server
// =======================
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
