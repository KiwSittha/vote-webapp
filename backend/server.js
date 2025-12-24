const express = require("express"); // เรียกใช้ express
const cors = require("cors");       // เรียกใช้ cors
const app = express();
const PORT = 3001;

app.use(cors()); // เปิดให้ frontend เรียก server ได้

// Mock data - คะแนนเลือกตั้ง
const votes = [
  { candidate: "วรินธร", votes: 120 },
  { candidate: "สุกัญญา", votes: 95 },
  { candidate: "สิทธา", votes: 110 }
];

// API ส่งคะแนนเลือกตั้ง
app.get("/api/votes", (req, res) => {
  res.json(votes); // ส่ง JSON กลับไป frontend
});

// เริ่ม server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
