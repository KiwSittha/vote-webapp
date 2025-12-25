console.log("🔥 SERVER FILE THIS ONE 🔥");

require("dotenv").config({ quiet: true });
const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");

const app = express();
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
app.post("/users", async (req, res) => {
  try {
    const { email, faculty, loginPassword, votePin } = req.body;

    if (!email.endsWith(UNIVERSITY_DOMAIN)) {
      return res.status(403).json({ message: "ต้องใช้อีเมลของมหาวิทยาลัยเท่านั้น" });
    }

    const existingUser = await db.collection("users").findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "อีเมลนี้ถูกใช้สมัครแล้ว" });
    }

    const loginRegex = /^(?=.*[a-z])(?=.*[A-Z]).{8,}$/;
    if (!loginRegex.test(loginPassword)) {
      return res.status(400).json({
        message: "รหัสล็อกอินต้อง ≥ 8 ตัว และมีพิมพ์เล็ก + พิมพ์ใหญ่"
      });
    }

    const votePinRegex = /^\d{6}$/;
    if (!votePinRegex.test(votePin)) {
      return res.status(400).json({
        message: "รหัสยืนยันโหวตต้องเป็นตัวเลข 6 หลัก"
      });
    }

    const result = await db.collection("users").insertOne({
      email,
      faculty,
      loginPassword,
      votePin,
      hasVoted: false,
      votedCandidate: null,
    });

    res.status(201).json({
      message: "สมัครผู้ใช้สำเร็จ",
      id: result.insertedId
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
      .sort({ candidateId: 1 }) // เรียง 1,2,3
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
