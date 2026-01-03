import React, { useEffect, useState } from "react";
import Layout from "./components/Layout";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Title,
} from "chart.js";

// Register ChartJS Components
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend, Title);

// ตั้งค่า Default Font ให้ Chart
ChartJS.defaults.font.family = "'Kanit', sans-serif";
ChartJS.defaults.color = "#64748b";

function Dashboard() {
  const [candidates, setCandidates] = useState([]);
  const [voteSummary, setVoteSummary] = useState(null);
  const [page, setPage] = useState(0);

  // Fetch logic
  useEffect(() => {
    fetch("http://localhost:8000/candidates")
      .then((res) => res.json())
      .then((data) => setCandidates(data))
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    fetch("http://localhost:8000/stats/vote-summary")
      .then((res) => res.json())
      .then((data) => setVoteSummary(data))
      .catch((err) => console.error(err));
  }, []);

  
  // Sort & Prepare Data
  const sorted = [...candidates].sort((a, b) => b.votes - a.votes);
  
  // ==========================================
  // 📊 Config: Bar Chart (ผลคะแนน)
  // ==========================================
  const candidateChartData = {
    labels: sorted.map((c) => `เบอร์ ${c.candidateId}`),
    datasets: [{
        label: "คะแนนเสียง",
        data: sorted.map((c) => c.votes),
        backgroundColor: [
          "#10B981", // Emerald
          "#3B82F6", // Blue
          "#F59E0B", // Amber
          "#8B5CF6", // Violet
          "#EC4899", // Pink
        ],
        borderRadius: 8,
        borderSkipped: false,
        maxBarThickness: 60,
    }],
  };

  const candidateChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { 
        legend: { display: false },
        tooltip: {
            backgroundColor: 'rgba(30, 41, 59, 0.9)',
            padding: 12,
            cornerRadius: 8,
            titleFont: { size: 14 },
            bodyFont: { size: 14 },
            displayColors: false,
        }
    },
    scales: { 
        y: { 
            beginAtZero: true, 
            grid: { color: "#f1f5f9", borderDash: [5, 5] },
            border: { display: false }
        }, 
        x: { 
            grid: { display: false },
            border: { display: false }
        } 
    },
    animation: { duration: 2000, easing: 'easeOutQuart' }
  };

  // ==========================================
  // 🍩 Config: Doughnut Chart (สถิติ)
  // ==========================================
  const voteSummaryData = voteSummary && {
    labels: ["ใช้สิทธิ์แล้ว", "ยังไม่ใช้สิทธิ์"],
    datasets: [{
        data: [voteSummary.voted, voteSummary.notVoted],
        backgroundColor: ["#10B981", "#E2E8F0"], 
        hoverBackgroundColor: ["#059669", "#CBD5E1"],
        borderWidth: 5,
        borderColor: "#ffffff",
        hoverOffset: 10,
        borderRadius: 20, // ทำให้เส้นโค้งมน
        cutout: '75%', // รูกลาง
    }],
  };

  const voteSummaryOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { 
        legend: { display: false }, // ซ่อน Legend เดิมของ Chart.js เราจะสร้างเอง
        tooltip: {
            enabled: true,
            backgroundColor: 'rgba(30, 41, 59, 0.9)',
            callbacks: {
                label: function(context) {
                    let label = context.label || '';
                    if (label) { label += ': '; }
                    let value = context.parsed;
                    let total = context.chart._metasets[context.datasetIndex].total;
                    let percentage = ((value / total) * 100).toFixed(1) + '%';
                    return label + value.toLocaleString() + ' คน (' + percentage + ')';
                }
            }
        }
    },
    animation: { animateScale: true, animateRotate: true }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto pb-20 px-4 md:px-0 animate-fade-in-up">
        
        {/* Header Section */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Dashboard ภาพรวม</h1>
                <p className="text-slate-500 mt-1 text-sm md:text-base">ติดตามผลการเลือกตั้งแบบ Real-time</p>
            </div>
            <div className="text-xs text-slate-400 bg-white px-3 py-1 rounded-full shadow-sm border border-slate-100 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                อัปเดตล่าสุด: {new Date().toLocaleTimeString('th-TH')}
            </div>
        </div>

        {/* 1. Stat Cards */}
        {voteSummary ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
                <StatCard 
                    title="ผู้สมัครทั้งหมด" 
                    value={candidates.length} 
                    unit="คน"
                    icon="👔"
                    color="bg-blue-500"
                    gradient="from-blue-500 to-blue-600"
                />
                <StatCard 
                    title="ผู้มาใช้สิทธิ์แล้ว" 
                    value={voteSummary.voted.toLocaleString()} 
                    unit="คน"
                    icon="✅"
                    color="bg-emerald-500"
                    gradient="from-emerald-500 to-green-500"
                    subtext={`จากทั้งหมด ${voteSummary.totalVerified.toLocaleString()}`}
                />
                <StatCard 
                    title="เปอร์เซ็นต์การโหวต" 
                    value={((voteSummary.voted / voteSummary.totalVerified) * 100).toFixed(1)} 
                    unit="%"
                    icon="📈"
                    color="bg-purple-500"
                    gradient="from-purple-500 to-violet-600"
                />
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-pulse">
                {[1,2,3].map(i => <div key={i} className="h-32 bg-slate-200 rounded-2xl"></div>)}
            </div>
        )}

        {/* 2. Charts Section (Main Area) */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-6 md:p-8 mb-10 overflow-hidden relative">
            
            {/* Tab Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
                <h2 className="text-lg md:text-xl font-bold text-slate-700 flex items-center gap-2">
                    {page === 0 ? "📊 ผลคะแนนล่าสุด" : "🍩 สัดส่วนผู้ใช้สิทธิ์"}
                </h2>
                
                <div className="flex bg-slate-100 p-1.5 rounded-xl self-stretch sm:self-auto">
                    <button 
                        onClick={() => setPage(0)}
                        className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${page === 0 ? "bg-white text-emerald-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                    >
                        ผลคะแนน
                    </button>
                    <button 
                        onClick={() => setPage(1)}
                        className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${page === 1 ? "bg-white text-emerald-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                    >
                        สถิติ
                    </button>
                </div>
            </div>

            {/* Chart Container */}
            <div className="min-h-[350px] md:h-[400px] w-full relative">
                {page === 0 ? (
                    // === Bar Chart ===
                    <Bar data={candidateChartData} options={candidateChartOptions} />
                ) : (
                    voteSummary && (
                        // === Doughnut Chart Layout (ปรับใหม่) ===
                        <div className="flex flex-col md:flex-row items-center justify-center gap-8 h-full">
                             
                             {/* Chart วงกลม */}
                             <div className="relative w-64 h-64 md:w-80 md:h-80">
                                <Doughnut data={voteSummaryData} options={voteSummaryOptions} />
                                {/* Text ตรงกลาง */}
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[55%] text-center pointer-events-none">
                                    <div className="text-4xl md:text-5xl font-black text-emerald-600 tracking-tight">
                                        {((voteSummary.voted / voteSummary.totalVerified) * 100).toFixed(0)}%
                                    </div>
                                    <div className="text-xs md:text-sm text-slate-400 font-medium mt-1">Voter Turnout</div>
                                </div>
                             </div>

                             {/* Legend (คำอธิบายด้านข้าง) */}
                             <div className="flex flex-col gap-4 w-full md:w-auto min-w-[200px]">
                                <StatItem 
                                    label="ใช้สิทธิ์แล้ว" 
                                    count={voteSummary.voted} 
                                    total={voteSummary.totalVerified} 
                                    color="bg-emerald-500" 
                                />
                                <StatItem 
                                    label="ยังไม่ใช้สิทธิ์" 
                                    count={voteSummary.notVoted} 
                                    total={voteSummary.totalVerified} 
                                    color="bg-slate-200" 
                                    textColor="text-slate-500"
                                />
                             </div>
                        </div>
                    )
                )}
            </div>
        </div>

        {/* 3. Top Candidates Ranking */}
        <div className="flex items-center gap-2 mb-6">
            <span className="text-2xl">🏆</span>
            <h3 className="text-xl font-bold text-slate-800">อันดับคะแนนสูงสุด</h3>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {sorted.map((c, i) => (
                <div 
                    key={c._id || i} 
                    className={`
                        relative bg-white p-5 rounded-2xl border transition-all duration-300 group
                        ${i === 0 ? "border-yellow-200 shadow-yellow-100 shadow-lg scale-105 z-10" : "border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-1"}
                    `}
                >
                    {i === 0 && (
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-3xl drop-shadow-sm animate-bounce">👑</div>
                    )}

                    <div className="flex items-center gap-4">
                        <div className={`
                            w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-md flex-shrink-0
                            ${i === 0 ? "bg-gradient-to-br from-yellow-400 to-yellow-600" : 
                              i === 1 ? "bg-gradient-to-br from-slate-300 to-slate-500" : 
                              i === 2 ? "bg-gradient-to-br from-orange-400 to-orange-600" : 
                              "bg-slate-100 text-slate-500"}
                        `}>
                            {i + 1}
                        </div>
                        <div className="min-w-0">
                            <div className="font-bold text-slate-800 text-base truncate">{c.name}</div>
                            <div className="text-xs text-slate-500">เบอร์ <span className="font-semibold text-emerald-600 text-sm">{c.candidateId}</span></div>
                        </div>
                    </div>
                    
                    <div className="mt-4 flex items-end justify-between border-t border-slate-50 pt-3">
                         <span className="text-xs text-slate-400">คะแนนเสียง</span>
                         <span className={`text-2xl font-black ${i === 0 ? "text-yellow-600" : "text-emerald-600"}`}>
                            {c.votes.toLocaleString()}
                         </span>
                    </div>
                </div>
            ))}
        </div>

      </div>
    </Layout>
  );
}

// Component ย่อย: Stat Card ด้านบน
function StatCard({ title, value, unit, icon, color, gradient, subtext }) {
    return (
        <div className="bg-white p-6 rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-50 flex items-center justify-between hover:scale-[1.02] transition-transform duration-300 group overflow-hidden relative">
            <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 ${color}`}></div>
            <div className="relative z-10">
                <p className="text-slate-500 text-sm font-medium mb-1">{title}</p>
                <div className="flex items-baseline gap-2">
                    <h3 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">{value}</h3>
                    <span className="text-sm text-slate-400 font-medium">{unit}</span>
                </div>
                {subtext && <p className="text-xs text-slate-400 mt-2 bg-slate-50 px-2 py-1 rounded-md inline-block">{subtext}</p>}
            </div>
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-3xl text-white shadow-lg shadow-blue-500/20 group-hover:rotate-12 transition-transform duration-300`}>
                {icon}
            </div>
        </div>
    );
}

// Component ย่อย: Legend สำหรับ Doughnut Chart
function StatItem({ label, count, total, color, textColor = "text-slate-700" }) {
    const percent = ((count / total) * 100).toFixed(1);
    return (
        <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
            <div className={`w-3 h-10 rounded-full ${color}`}></div>
            <div className="flex-1">
                <p className="text-xs text-slate-400 font-medium">{label}</p>
                <p className={`text-lg font-bold ${textColor}`}>{count.toLocaleString()} คน</p>
            </div>
            <div className="text-right">
                <span className="text-sm font-bold text-slate-600">{percent}%</span>
            </div>
        </div>
    );
}

export default Dashboard;