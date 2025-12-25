import React, { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

function Dashboard() {
  const [candidates, setCandidates] = useState([]);

  useEffect(() => {
    fetch("http://localhost:8000/candidates")
      .then(res => res.json())
      .then(data => setCandidates(data))
      .catch(err => console.error(err));
  }, []);

  // เรียงคะแนน
  const sorted = [...candidates].sort((a, b) => b.votes - a.votes);

  const chartData = {
    labels: sorted.map(c => c.name),
    datasets: [
      {
        label: "คะแนนโหวต",
        data: sorted.map(c => c.votes),
        backgroundColor: "rgba(99, 102, 241, 0.7)",
        borderRadius: 6,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 800,
    },
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: "ผลการโหวต",
        font: { size: 16 },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { stepSize: 1 },
        grid: { color: "#eee" },
      },
      x: {
        grid: { display: false },
      },
    },
  };

  return (
    <div>
      <h1 style={{ textAlign: "center" }}>คะแนนโหวต</h1>

      {/* กราฟ */}
      <div style={{ width: "650px", height: "360px", margin: "0 auto" }}>
        <Bar data={chartData} options={chartOptions} />
      </div>

      <hr />

      {/* การ์ดผู้สมัคร */}
      <div
        style={{
          display: "flex",
          gap: "14px",
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        {sorted.map((c, index) => (
          <div
            key={c._id}
            style={{
              width: "200px",
              height: "140px",
              border: "1px solid #ccc",
              padding: "12px",
              borderRadius: "10px",
              textAlign: "center",
              background: index === 0 ? "#fff7ed" : "#fafafa",
              borderColor: index === 0 ? "#f59e0b" : "#ccc",
            }}
          >
            <h4 style={{ margin: "4px 0" }}>เบอร์ {c.candidateId}</h4>
            <div
              style={{
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                fontWeight: 500,
              }}
            >
              {c.name}
            </div>
            <div style={{ marginTop: "8px", fontWeight: "bold" }}>
              {c.votes} คะแนน
            </div>
            {index === 0 && (
              <div style={{ color: "#f59e0b", fontSize: "12px" }}>🏆 อันดับ 1</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;
