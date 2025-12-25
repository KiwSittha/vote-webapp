import React, { useEffect, useState } from "react";
import Sidebar from "./components/sidebar";
import Layout from "./components/Layout";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

function Dashboard() {
  const [candidates, setCandidates] = useState([]);

  useEffect(() => {
    fetch("http://localhost:8000/candidates")
      .then(res => res.json())
      .then(data => setCandidates(data));
  }, []);

  const sorted = [...candidates].sort((a, b) => b.votes - a.votes);

  const chartData = {
    labels: sorted.map(c => c.votes),
    datasets: [
      {
        data: sorted.map(c => c.votes),
        backgroundColor: "#27AE60",
        borderRadius: 10,
        barThickness: 60,
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
        <Layout>

    <div className="flex min-h-screen bg-slate-100">
      
      

      {/* Content */}
      <main className="flex-1 p-8">
        <h1 className="text-2xl font-semibold text-center mb-6">
          ผลคะแนนการเลือกตั้ง
        </h1>

        {/* Chart */}
        <div className="bg-slate-50 rounded-xl p-5 h-[350px] max-w-3xl mx-auto">
          <Bar data={chartData} options={chartOptions} />
        </div>

        {/* Ranking */}
        <div className="flex justify-center gap-6 mt-8 flex-wrap">
          {sorted.map((c, index) => (
            <div
              key={c._id}
              className="bg-white w-56 rounded-xl shadow"
            >
              <div className="bg-emerald-600 text-white text-center py-2 rounded-t-xl font-medium">
                อันดับ {index + 1}
              </div>

              <div className="flex items-center gap-3 p-4">
                <img
                  src="https://cdn-icons-png.flaticon.com/512/2922/2922510.png"
                  className="w-10 h-10"
                />
                <div>
                  <div className="font-semibold">{c.name}</div>
                  <div className="text-sm text-gray-500">
                    เบอร์ {c.candidateId}
                  </div>
                  <div className="text-green-600 font-bold">
                    {c.votes} คะแนน
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main> 
    </div>
      </Layout>
  );
}

export default Dashboard;
