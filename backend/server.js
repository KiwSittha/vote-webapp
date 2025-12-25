console.log("🔥 SERVER FILE THIS ONE 🔥");
require("dotenv").config({ quiet: true });
const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const cors = require('cors');
const app = express();
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});


app.use(cors());
app.use(express.json());

const client = new MongoClient(process.env.MONGO_URI);
let db;

const UNIVERSITY_DOMAIN = "@ku.th";

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

app.get("/", (req, res) => {
  res.send("Server ทำงานแล้ว!");
});


// =======================
// สมัครผู้ใช้
// =======================
app.post("/register/users", async (req, res) => {
  try {
    const { email, faculty, loginPassword, votePin } = req.body;

    // ✅ เช็คอีเมลซ้ำ
    const existingUser = await db.collection("users").findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        message: "อีเมลนี้ถูกใช้งานแล้ว"
      });
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
// Login
// =======================
app.post("/login", async (req, res) => {
  try {
    const { email, loginPassword } = req.body;

    // 1️⃣ เช็คว่ามีผู้ใช้ไหม
    const user = await db.collection("users").findOne({ email });
    if (!user) {
      return res.status(404).json({
        message: "ไม่พบอีเมลนี้ในระบบ"
      });
    }

    // 2️⃣ เช็คยืนยันอีเมล
    if (!user.isVerified) {
      return res.status(403).json({
        message: "กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ"
      });
    }

    // 3️⃣ เช็ครหัสผ่าน
    const isPasswordCorrect = await bcrypt.compare(
      loginPassword,
      user.loginPassword
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: "รหัสผ่านไม่ถูกต้อง"
      });
    }

    // 4️⃣ สร้าง JWT
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // 5️⃣ ส่งผลลัพธ์
    res.json({
      message: "เข้าสู่ระบบสำเร็จ",
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




async function getNextCandidateId() {
  const result = await db.collection("counters").findOneAndUpdate(
    { _id: "candidateId" },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" }
  );

  // 🔥 รองรับทุกโครงสร้าง
  if (result.value && result.value.seq !== undefined) {
    return result.value.seq;
  }

  if (result.seq !== undefined) {
    return result.seq;
  }

  throw new Error("ไม่สามารถสร้าง candidateId ได้");
}

//ยืนยันอีเมล
app.get("/verify-email/:token", async (req, res) => {
  try {
    const { token } = req.params;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    await db.collection("users").updateOne(
      { _id: new ObjectId(decoded.userId) },
      { $set: { isVerified: true } }
    );

    res.send("ยืนยันอีเมลสำเร็จแล้ว 🎉");
  } catch {
    res.status(400).send("ลิงก์ไม่ถูกต้องหรือหมดอายุ");
  }
});



app.post("/candidate", async (req, res) => {
  try {
    const { name, faculty, position, policies } = req.body;

    const candidateId = await getNextCandidateId(); // ⭐ ID 1,2,3,...

    const result = await db.collection("candidates").insertOne({
      candidateId, // ⭐ ใช้เลขลำดับ
      name,
      faculty,
      position,
      policies: policies || [],
      createdAt: new Date(),
      updatedAt: new Date(),
      votes: 0
    });

    res.status(201).json({
      message: "เพิ่มผู้สมัครสำเร็จ",
      candidateId
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =======================
// ดูรายชื่อผู้สมัคร
// =======================
app.get("/candidates", async (req, res) => {
  try {
    const candidates = await db
      .collection("candidates")
      .find({})
      .sort({ votes: -1 }) // 👈 เรียงตามคะแนน
      .toArray();
    
    res.json(candidates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});




// =======================
// โหวต
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

    if (user.votePin !== votePin) {
      return res.status(401).json({ message: "รหัสยืนยันโหวตไม่ถูกต้อง" });
    }

    // 🔥 หา candidate จาก collection ที่ถูก
    const candidate = await db.collection("candidates").findOne({ candidateId });
    if (!candidate) {
      return res.status(404).json({ message: "ไม่พบผู้สมัคร" });
    }

    // อัปเดต user
    await db.collection("users").updateOne(
      { email },
      {
        $set: {
          hasVoted: true,
          votedCandidate: candidateId
        }
      }
    );

    // เพิ่มคะแนน
    await db.collection("candidates").updateOne(
      { candidateId },
      { $inc: { votes: 1 } }
    );

    res.json({ message: "โหวตสำเร็จ" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



app.listen(process.env.PORT, () => {
  console.log("Server running on port", process.env.PORT);
});
