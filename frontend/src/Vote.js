import React, { useEffect, useState } from "react";

function Vote() {
  const [candidates, setCandidates] = useState([]);

  useEffect(() => {
    // โหลดข้อมูลผู้สมัครจาก server
    fetch("http://localhost:8000/candidates")
      .then(res => res.json())
      .then(data => setCandidates(data))
      .catch(err => console.error(err));
  }, []);

  const handleVote = async (candidateId) => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user) {
        alert("กรุณาเข้าสู่ระบบก่อนโหวต");
        return;
      }

      const votePin = prompt("กรุณากรอกรหัสโหวต");
      if (!votePin) return;

      const res = await fetch("http://localhost:8000/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          votePin,
          candidateId
        })
      });

      const data = await res.json();

      if (!res.ok) {
        alert("โหวตไม่สำเร็จ: " + data.message);
        return;
      }

      // ❌ ไม่ต้อง setCandidates เองแล้ว
      // Server จะส่งข้อมูลใหม่ผ่าน Socket.io ไปให้ Dashboard

      alert("โหวตสำเร็จ!");
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาด");
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-center mb-6">
        เลือกผู้สมัคร
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {candidates.map(c => (
          <div key={c._id} className="bg-white rounded-xl shadow p-5">
            <div className="text-xl font-semibold">{c.name}</div>
            <div className="text-sm text-gray-500">
              เบอร์ {c.candidateId} — {c.position}
            </div>

            <div className="mt-2">
              <div className="font-medium">นโยบาย:</div>
              <ul className="list-disc ml-5">
                {c.policies?.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>

            <button
              onClick={() => handleVote(c.candidateId)}
              className="mt-3 w-full py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              โหวต
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Vote;
