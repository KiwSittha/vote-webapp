// // import React, { useEffect, useState } from "react";
// // import Sidebar from "./components/sidebar";
// // import Layout from "./components/Layout";
// // import { Bar } from "react-chartjs-2";
// // import {
// //   Chart as ChartJS,
// //   CategoryScale,
// //   LinearScale,
// //   BarElement,
// //   Tooltip,
// // } from "chart.js";

// // ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

// // function Dashboard() {
// //   const [candidates, setCandidates] = useState([]);

// //   useEffect(() => {
// //     fetch("http://localhost:8000/candidates")
// //       .then(res => res.json())
// //       .then(data => setCandidates(data));
// //   }, []);

// //   const sorted = [...candidates].sort((a, b) => b.votes - a.votes);

// //   const chartData = {
// //     labels: sorted.map(c => c.votes),
// //     datasets: [
// //       {
// //         data: sorted.map(c => c.votes),
// //         backgroundColor: "#27AE60",
// //         borderRadius: 10,
// //         barThickness: 60,
// //       },
// //     ],
// //   };

// //   const chartOptions = {
// //     responsive: true,
// //     maintainAspectRatio: false,
// //     animation: {
// //       duration: 800,
// //     },
// //     plugins: {
// //       legend: {
// //         display: false,
// //       },
// //       title: {
// //         display: true,
// //         text: "ผลการโหวต",
// //         font: { size: 16 },
// //       },
// //     },
// //     scales: {
// //       y: {
// //         beginAtZero: true,
// //         ticks: { stepSize: 1 },
// //         grid: { color: "#eee" },
// //       },
// //       x: {
// //         grid: { display: false },
// //       },
// //     },
// //   };

// //   return (
// //         <Layout>

// //     <div className="flex min-h-screen bg-slate-100">
      
      

// //       {/* Content */}
// //       <main className="flex-1 p-8">
// //         <h1 className="text-2xl font-semibold text-center mb-6">
// //           ผลคะแนนการเลือกตั้ง
// //         </h1>

// //         {/* Chart */}
// //         <div className="bg-slate-50 rounded-xl p-5 h-[350px] max-w-3xl mx-auto">
// //           <Bar data={chartData} options={chartOptions} />
// //         </div>

// //         {/* Ranking */}
// //         <div className="flex justify-center gap-6 mt-8 flex-wrap">
// //           {sorted.map((c, index) => (
// //             <div
// //               key={c._id}
// //               className="bg-white w-56 rounded-xl shadow"
// //             >
// //               <div className="bg-emerald-600 text-white text-center py-2 rounded-t-xl font-medium">
// //                 อันดับ {index + 1}
// //               </div>

// //               <div className="flex items-center gap-3 p-4">
// //                 <img
// //                   src="https://cdn-icons-png.flaticon.com/512/2922/2922510.png"
// //                   className="w-10 h-10"
// //                 />
// //                 <div>
// //                   <div className="font-semibold">{c.name}</div>
// //                   <div className="text-sm text-gray-500">
// //                     เบอร์ {c.candidateId}
// //                   </div>
// //                   <div className="text-green-600 font-bold">
// //                     {c.votes} คะแนน
// //                   </div>
// //                 </div>
// //               </div>
// //             </div>
// //           ))}
// //         </div>
// //       </main> 
// //     </div>
// //       </Layout>
// //   );
// // }

// // export default Dashboard;



// import React, { useEffect, useState } from "react";
// import Layout from "./components/Layout";
// import { Bar } from "react-chartjs-2";
// import { io } from "socket.io-client";
// import {
//   Chart as ChartJS,
//   CategoryScale,
//   LinearScale,
//   BarElement,
//   Tooltip,
// } from "chart.js";

// ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

// // เชื่อมต่อ Socket.io
// const socket = io("http://localhost:8000");

// function Dashboard() {
//   const [candidates, setCandidates] = useState([]);

//   useEffect(() => {
//     // โหลดข้อมูลตอนแรก
//     const fetchCandidates = async () => {
//       try {
//         const res = await fetch("http://localhost:8000/candidates");
//         const data = await res.json();
//         setCandidates(data);
//       } catch (err) {
//         console.error(err);
//       }
//     };

//     fetchCandidates();

//     // ฟัง event voteUpdated จาก server
//     socket.on("voteUpdated", (updatedCandidates) => {
//       setCandidates(updatedCandidates);
//     });

//     // cleanup
//     return () => socket.off("voteUpdated");
//   }, []);

//   // เรียงคะแนน
//   const sorted = [...candidates].sort((a, b) => b.votes - a.votes);

//   // ข้อมูลกราฟ
//   const chartData = {
//     labels: sorted.map(c => c.name), // ใช้ชื่อผู้สมัครบนแกน X
//     datasets: [
//       {
//         label: "คะแนนโหวต",
//         data: sorted.map(c => c.votes),
//         backgroundColor: "#27AE60",
//         borderRadius: 10,
//         barThickness: 60,
//       },
//     ],
//   };

//   const chartOptions = {
//     responsive: true,
//     maintainAspectRatio: false,
//     animation: { duration: 800 },
//     plugins: {
//       legend: { display: false },
//       title: {
//         display: true,
//         text: "ผลการโหวต",
//         font: { size: 16 },
//       },
//     },
//     scales: {
//       y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: "#eee" } },
//       x: { grid: { display: false } },
//     },
//   };

//   return (
//     <Layout>
//       <div className="flex min-h-screen bg-slate-100">
//         <main className="flex-1 p-8">
//           <h1 className="text-2xl font-semibold text-center mb-6">
//             ผลคะแนนการเลือกตั้ง
//           </h1>

//           {/* Chart */}
//           <div className="bg-slate-50 rounded-xl p-5 h-[350px] max-w-3xl mx-auto">
//             <Bar data={chartData} options={chartOptions} />
//           </div>

//           {/* Ranking */}
//           <div className="flex justify-center gap-6 mt-8 flex-wrap">
//             {sorted.map((c, index) => (
//               <div key={c._id} className="bg-white w-56 rounded-xl shadow">
//                 <div className="bg-emerald-600 text-white text-center py-2 rounded-t-xl font-medium">
//                   อันดับ {index + 1}
//                 </div>

//                 <div className="flex items-center gap-3 p-4">
//                   <img
//                     src="https://cdn-icons-png.flaticon.com/512/2922/2922510.png"
//                     className="w-10 h-10"
//                     alt="avatar"
//                   />
//                   <div>
//                     <div className="font-semibold">{c.name}</div>
//                     <div className="text-sm text-gray-500">
//                       เบอร์ {c.candidateId}
//                     </div>
//                     <div className="text-green-600 font-bold">
//                       {c.votes} คะแนน
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             ))}
//           </div>
//         </main>
//       </div>
//     </Layout>
//   );
// }

// export default Dashboard;

// dashboard.js
import React, { useEffect, useState } from "react";
import Layout from "./components/Layout";
import { Bar } from "react-chartjs-2";
import { io } from "socket.io-client"; // Import Socket Client
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

// เชื่อมต่อ Socket ไปยัง Port ของ Backend (8000)
// ใส่ไว้ข้างนอกเพื่อป้องกันการเชื่อมต่อซ้ำเมื่อ Re-render
const socket = io("http://localhost:8000");

function Dashboard() {
  const [candidates, setCandidates] = useState([]);

  useEffect(() => {
    // 1. โหลดข้อมูลเริ่มต้นผ่าน API ปกติ
    const fetchData = async () => {
      try {
        const res = await fetch("http://localhost:8000/candidates");
        const data = await res.json();
        setCandidates(data);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();

    // 2. ตั้งค่า Socket Listener เพื่อรับข้อมูล Real-time
    socket.on("voteUpdated", (updatedData) => {
      console.log("⚡ Received real-time update:", updatedData);
      setCandidates(updatedData);
    });

    // 3. Cleanup function เมื่อออกจากหน้านี้
    return () => {
      socket.off("voteUpdated");
    };
  }, []);

  // เรียงลำดับตามคะแนน
  const sorted = [...candidates].sort((a, b) => b.votes - a.votes);

  const chartData = {
    labels: sorted.map(c => c.name),
    datasets: [
      {
        label: "คะแนนเสียง",
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
      duration: 800, // อนิเมชั่นตอนกราฟขยับ
    },
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: "ผลการโหวตแบบ Real-time",
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
        <main className="flex-1 p-8">
          <h1 className="text-2xl font-semibold text-center mb-6">
            ผลคะแนนการเลือกตั้ง 📊
          </h1>

          {/* Chart */}
          <div className="bg-slate-50 rounded-xl p-5 h-[350px] max-w-3xl mx-auto shadow-sm">
            <Bar data={chartData} options={chartOptions} />
          </div>

          {/* Ranking */}
          <div className="flex justify-center gap-6 mt-8 flex-wrap">
            {sorted.map((c, index) => (
              <div
                key={c._id || c.candidateId}
                className="bg-white w-56 rounded-xl shadow hover:shadow-lg transition-all duration-300"
              >
                <div className="bg-emerald-600 text-white text-center py-2 rounded-t-xl font-medium">
                  อันดับ {index + 1}
                </div>

                <div className="flex items-center gap-3 p-4">
                  <img
                    src="https://cdn-icons-png.flaticon.com/512/2922/2922510.png"
                    className="w-10 h-10"
                    alt="candidate-icon"
                  />
                  <div>
                    <div className="font-semibold truncate w-32">{c.name}</div>
                    <div className="text-sm text-gray-500">
                      เบอร์ {c.candidateId}
                    </div>
                    <div className="text-green-600 font-bold text-lg">
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
