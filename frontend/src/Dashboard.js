import React, { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import "chart.js/auto";

function Dashboard() {
  const [votes, setVotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVotes = async () => {
      try {
        const res = await fetch("http://localhost:3001/api/votes");
        if (!res.ok) throw new Error("Network response was not ok");
        const data = await res.json();
        setVotes(data);
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchVotes();
  }, []);

  if (loading) return <p>Loading...</p>;

  // จัดอันดับ
  const sortedVotes = [...votes].sort((a, b) => b.votes - a.votes);

  const chartData = {
    labels: votes.map(v => v.candidate),
    datasets: [
      {
        label: "คะแนน",
        data: votes.map(v => v.votes),
        backgroundColor: votes.map((v, i) => `rgba(0, ${128 + i * 40}, 0, 0.7)`),
      },
    ],
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>ผลคะแนนการเลือกตั้ง</h1>

      {/* Bar chart */}
      <div style={{ maxWidth: "600px", margin: "auto" }}>
        <Bar data={chartData} />
      </div>

      {/* อันดับ */}
      <div style={{ display: "flex", justifyContent: "space-around", marginTop: "20px" }}>
        {sortedVotes.map((v, index) => (
          <div
            key={v.candidate}
            style={{
              border: "1px solid #ccc",
              padding: "10px",
              width: "150px",
              textAlign: "center",
            }}
          >
            <h3>อันดับ {index + 1}</h3>
            <p>{v.candidate}</p>
            <p>{v.votes} คะแนน</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;
