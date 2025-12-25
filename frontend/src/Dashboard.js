import React, { useEffect, useState } from "react";

function Dashboard() {
  const [candidates, setCandidates] = useState([]); // สร้างตัวแปรเก็บข้อมูล

  // ฟังก์ชันดึงข้อมูลเมื่อเปิดหน้าเว็บ
  useEffect(() => {
    fetch('http://localhost:8000/candidates') // ใส่ URL ของ Backend คุณ (เช็ค Port ให้ถูกนะ)
      .then(res => res.json())
      .then(data => {
        setCandidates(data); // เอาข้อมูลที่ได้ใส่ตัวแปร
        console.log(data);   // สั่งปริ้นดูใน Console ว่าได้อะไรมาบ้าง
      })
      .catch(err => console.error("Error fetching:", err));
  }, []);

  return (
    <div>
      <h1>คะแนนโหวต</h1>
      <div className="candidate-list">
        {[...candidates]
          .sort((a, b) => b.votes - a.votes)
          .map((c) => (
            <div key={c._id} style={{ border: '1px solid #ccc', margin: '10px', padding: '10px' }}>
              <h3>เบอร์: {c.candidateId}</h3>
              <p>ชื่อ: {c.name}</p>
              <p>คะแนน: {c.votes}</p>
            </div>
        ))}


      </div>
    </div>
  );
}

export default Dashboard;
