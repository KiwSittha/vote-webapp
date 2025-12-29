import React, { useState } from "react";
import Layout from "./components/Layout";
import "./Candidates.css";

function Candidates() {
  const candidates = [
    { id: 1, name: "สมชาย ใจดี", faculty: "วิศวกรรมศาสตร์", major: "คอมพิวเตอร์", year: 3 },
    { id: 2, name: "สมหญิง เก่งมาก", faculty: "วิทยาศาสตร์", major: "คณิตศาสตร์", year: 2 },
    { id: 3, name: "ธันวา ตั้งใจ", faculty: "บริหารธุรกิจ", major: "การตลาด", year: 4 },
    { id: 4, name: "นภา สดใส", faculty: "ศึกษาศาสตร์", major: "ภาษาอังกฤษ", year: 1 },
    { id: 5, name: "ปกรณ์ มั่นคง", faculty: "นิติศาสตร์", major: "กฎหมาย", year: 3 },
    { id: 6, name: "ศิริพร ใจเย็น", faculty: "เกษตรศาสตร์", major: "พืชศาสตร์", year: 2 },
  ];

  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  return (
    <Layout>
      <div className="min-h-screen bg-white">
        <div className="page">
          <h2 className="title">รายชื่อผู้สมัคร</h2>

          <div className="grid">
            {candidates.map((c) => (
              <div key={c.id} className="card">
                <div className="number">{c.id}</div>

                <img
                  src="https://cdn-icons-png.flaticon.com/512/2922/2922561.png"
                  alt="candidate"
                  className="avatar"
                />

                <input className="input" value={c.name} disabled />
                <input className="input" value={c.faculty} disabled />

                <div className="row">
                  <input className="input" value={c.major} disabled />
                  <input className="input" value={`ปี ${c.year}`} disabled />
                </div>

                <div className="actions">
                  <button className="policy-btn">นโยบาย</button>
                  <button
                    className="vote-btn"
                    onClick={() => {
                      setSelectedCandidate(c);
                      setShowConfirm(true);
                    }}
                  >
                    ลงคะแนน
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ===== Modal ===== */}
        {showConfirm && (
          <div className="overlay">
            <div className="modal">
              <h3>ยืนยันการลงคะแนน</h3>
              <p>
                คุณกำลังจะลงคะแนนให้<br />
                <strong>{selectedCandidate?.name}</strong>
              </p>
              <p className="warning">เมื่อยืนยันแล้วไม่สามารถแก้ไขได้</p>

              <div className="modal-actions">
                <button className="back-btn" onClick={() => setShowConfirm(false)}>
                  ย้อนกลับ
                </button>
                <button
                  className="confirm-btn"
                  onClick={() => {
                    alert("ลงคะแนนสำเร็จ");
                    setShowConfirm(false);
                  }}
                >
                  ยืนยัน
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default Candidates;
