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

// ✅ ensure TTL index (10 นาที)
async function ensureTTLIndex() {
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
      console.log("✅ TTL index already correct");
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

  console.log("⏳ TTL index created (10 minutes)");
}

async function connectDB() {
  try {
    await client.connect();
    db = client.db("vote");
    console.log("✅ MongoDB connected");
    await ensureTTLIndex();
  } catch (err) {
    console.error("❌ MongoDB error:", err.message);
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
// Test
// =======================
app.get("/", (req, res) => {
  res.send("Server ทำงานแล้ว!");
});

// =======================
// Register (✅ ปรับแก้ HTML Email ตรงนี้)
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
      { expiresIn: "10m" }
    );

    const verifyLink = `${process.env.FRONTEND_URL}/verify-email/${verifyToken}`;

    // ✨ HTML Email สวยๆ พร้อมปุ่มกด
    const emailHtml = `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; padding: 40px 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          
          <div style="background-color: #10B981; padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: 1px;">KU Vote System</h1>
          </div>

          <div style="padding: 40px 30px; text-align: center;">
            <h2 style="color: #1f2937; margin-top: 0; font-size: 22px;">ยืนยันการลงทะเบียน</h2>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
              สวัสดีครับ/ค่ะ, <br/>
              ขอบคุณที่สมัครสมาชิกเพื่อใช้สิทธิ์เลือกตั้งประธานนิสิต มก.<br/>
              กรุณากดปุ่มด้านล่างเพื่อยืนยันอีเมลของคุณ
            </p>

            <a href="${verifyLink}" style="
              display: inline-block;
              background-color: #10B981;
              color: #ffffff;
              padding: 16px 32px;
              font-size: 16px;
              font-weight: bold;
              text-decoration: none;
              border-radius: 50px;
              box-shadow: 0 4px 6px rgba(16, 185, 129, 0.4);
              transition: background-color 0.3s ease;
            ">
              ✅ ยืนยันอีเมลทันที
            </a>

            <p style="color: #ef4444; font-size: 14px; margin-top: 30px;">
              ⚠️ ลิงก์นี้มีอายุการใช้งาน 10 นาทีเท่านั้น
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
            
            <p style="color: #9ca3af; font-size: 12px;">
              หากคุณไม่ได้เป็นผู้ทำรายการนี้ กรุณาเพิกเฉยต่ออีเมลฉบับนี้
            </p>
          </div>
          
          <div style="background-color: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
            &copy; 2026 Kasetsart University Vote System
          </div>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"KUVote System" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "ยืนยันอีเมลของคุณ - KUVote", // หัวข้อเมล
      html: emailHtml,
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

    const result = await db.collection("users").updateOne(
      { _id: new ObjectId(decoded.userId), isVerified: false },
      { $set: { isVerified: true } }
    );

    if (result.matchedCount === 0) {
      // ตกแต่งหน้ายืนยันไม่สำเร็จ
      return res.status(400).send(`
        <div style="font-family: sans-serif; text-align: center; padding-top: 50px;">
           <h1 style="color: #EF4444;">❌ ไม่สำเร็จ</h1>
           <p>บัญชีถูกยืนยันไปแล้ว หรือ ลิงก์หมดอายุ</p>
        </div>
      `);
    }

    // ตกแต่งหน้ายืนยันสำเร็จ
    res.send(`
      <div style="font-family: sans-serif; text-align: center; padding-top: 50px;">
         <h1 style="color: #10B981;">🎉 ยืนยันอีเมลสำเร็จ!</h1>
         <p>คุณสามารถปิดหน้านี้และกลับไปเข้าสู่ระบบได้เลยครับ</p>
      </div>
    `);
  } catch {
    res.status(400).send(`
        <div style="font-family: sans-serif; text-align: center; padding-top: 50px;">
           <h1 style="color: #EF4444;">❌ ลิงก์ไม่ถูกต้อง หรือหมดอายุ</h1>
        </div>
      `);
  }
});

// =======================
// Login
// =======================
app.post("/login", async (req, res) => {
  try {
    let { email, loginPassword } = req.body;
    console.log("📥 LOGIN REQUEST:", email);

    email = email?.trim().toLowerCase();
    const user = await db.collection("users").findOne({ email });

    console.log("👤 USER FOUND:", user);

    if (!user) {
      return res.status(404).json({ message: "ไม่พบอีเมลนี้ในระบบ" });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        message: "กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(
      loginPassword,
      user.loginPassword
    );

    if (!isPasswordCorrect) {
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
// Candidate Counter
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
// Add Candidate
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

    res.status(201).json({ message: "เพิ่มผู้สมัครสำเร็จ", candidateId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =======================
// Get Candidates
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
// Vote
// =======================
app.post("/vote", async (req, res) => {
  try {
    const { email, votePin, candidateId } = req.body;

    const user = await db.collection("users").findOne({ email });
    if (!user) return res.status(404).json({ message: "ไม่พบผู้ใช้" });
    if (user.hasVoted)
      return res.status(403).json({ message: "คุณใช้สิทธิ์ไปแล้ว" });

    const isPinCorrect = await bcrypt.compare(votePin, user.votePin);
    if (!isPinCorrect)
      return res.status(401).json({ message: "รหัสโหวตไม่ถูกต้อง" });

    const candidate = await db
      .collection("candidates")
      .findOne({ candidateId });

    if (!candidate)
      return res.status(404).json({ message: "ไม่พบผู้สมัคร" });

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
// Vote summary for graph
// =======================
app.get("/stats/vote-summary", async (req, res) => {
  try {
    const result = await db
      .collection("users")
      .aggregate([
        { $match: { isVerified: true } },
        {
          $group: {
            _id: "$hasVoted",
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();

    let voted = 0;
    let notVoted = 0;

    result.forEach((item) => {
      if (item._id === true) voted = item.count;
      if (item._id === false) notVoted = item.count;
    });

    res.json({
      voted,
      notVoted,
      totalVerified: voted + notVoted,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =======================
app.listen(process.env.PORT, () => {
  console.log("🚀 Server running on port", process.env.PORT);
});