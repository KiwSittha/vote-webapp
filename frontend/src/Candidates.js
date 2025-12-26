import React from "react";
import Layout from "./components/Layout";  
import './Candidates.css';

function Candidates() {
  const candidates = [
  {
    id: 1,
    name: "สมชาย ใจดี",
    faculty: "วิศวกรรมศาสตร์",
    major: "คอมพิวเตอร์",
    year: 3,
  },
  {
    id: 2,
    name: "สมหญิง เก่งมาก",
    faculty: "วิทยาศาสตร์",
    major: "คณิตศาสตร์",
    year: 2,
  },
  {
    id: 3,
    name: "ธันวา ตั้งใจ",
    faculty: "บริหารธุรกิจ",
    major: "การตลาด",
    year: 4,
  },
  {
    id: 4,
    name: "นภา สดใส",
    faculty: "ศึกษาศาสตร์",
    major: "ภาษาอังกฤษ",
    year: 1,
  },
  {
    id: 5,
    name: "ปกรณ์ มั่นคง",
    faculty: "นิติศาสตร์",
    major: "กฎหมาย",
    year: 3,
  },
  {
    id: 6,
    name: "ศิริพร ใจเย็น",
    faculty: "เกษตรศาสตร์",
    major: "พืชศาสตร์",
    year: 2,
  },
];


  return (
    <Layout>
    
      <div className="min-h-screen bg-white">


        <div style={styles.page}>
          <h2 style={styles.title} className="text-white text-center text-3xl font-bold">
            รายชื่อผู้สมัคร
          </h2>

          <div className="grid">
            {candidates.map((c) => (
             <div key={c.id} className="card">

                {/* หมายเลข */}
                <div style={styles.number}>{c.id}</div>

                {/* รูป */}
                <img
                  src="https://cdn-icons-png.flaticon.com/512/2922/2922561.png"
                  alt="candidate"
                  style={styles.image}
                />

                {/* ข้อมูล */}
                <input style={styles.input} value={c.name} disabled />

                <input style={styles.input} value={c.faculty} disabled />


                <div style={styles.row}>
  <input style={styles.input} value={c.major} disabled />
  <input style={styles.input} value={`ปี ${c.year}`} disabled />
</div>


                {/* ปุ่ม */}
                <div style={styles.actions}>
                  <button style={styles.policy}>นโยบาย</button>
                  <button style={styles.vote}>ลงคะแนน</button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </Layout>
  );
}

export default Candidates;

/* =======================
   CSS INLINE STYLE
   ======================= */
const styles = {
  page: {
    padding: "40px",
    minHeight: "100vh"
  },
  title: {
    marginBottom: "30px"
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "30px",
    maxWidth: "1200px",
    margin: "0 auto"
  },
  card: {
    background: "#ffffff",
    borderRadius: "18px",
    padding: "20px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
    position: "relative"
  },
  number: {
    position: "absolute",
    top: "-15px",
    left: "-15px",
    width: "45px",
    height: "45px",
    background: "#16a34a",
    color: "white",
    fontWeight: "bold",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  image: {
    width: "80px",
    display: "block",
    margin: "0 auto 10px"
  },
  input: {
    width: "100%",
    padding: "6px",
    marginTop: "6px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    textAlign: "center"
  },
  row: {
    display: "flex",
    gap: "10px",
    marginTop: "6px"
  },
  actions: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: "12px"
  },
  policy: {
    background: "#22c55e",
    color: "white",
    border: "none",
    padding: "6px 12px",
    borderRadius: "6px",
    cursor: "pointer"
  },
  vote: {
    background: "#15803d",
    color: "white",
    border: "none",
    padding: "6px 12px",
    borderRadius: "6px",
    cursor: "pointer"
  }
};
