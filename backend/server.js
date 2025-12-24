const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Mock data - คะแนนเลือกตั้ง
const votes = [
  { candidate: "วรินธร", votes: 120 },
  { candidate: "สุกัญญา", votes: 95 },
  { candidate: "สิทธา", votes: 110 }
];

// Route แสดงข้อความ / (optional)
app.get("/", (req, res) => {
  res.send("Backend server is running!");
});

// API ส่งคะแนนเลือกตั้ง
app.get("/api/votes", (req, res) => {
  res.json(votes);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
