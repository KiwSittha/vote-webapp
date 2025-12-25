import { Link } from "react-router-dom";
import Layout from "./components/Layout";

export default function Home() {
  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-green-800 via-green-600 to-green-300 flex items-center justify-center">

        <main className="w-full max-w-6xl px-6 text-white">

          {/* Title */}
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-wide">
              ระบบเลือกตั้งประธานนิสิต
            </h1>
            <h2 className="text-2xl md:text-3xl mt-3 font-semibold text-green-100">
              มหาวิทยาลัยเกษตรศาสตร์
            </h2>
          </div>

          {/* Status Card */}
          <div className="flex justify-center">
            <div className="bg-white/90 backdrop-blur-lg text-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-xl text-center">

              <div className="flex justify-center items-center gap-3 mb-3">
                <span className="text-xl">📅</span>
                <span>วันเลือกตั้ง</span>
                <strong className="text-gray-900">1 เมษายน 2569</strong>
              </div>

              <div className="flex justify-center items-center gap-3 mb-6">
                <span className="text-xl">⏰</span>
                <span>สถานะ</span>
                <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 font-semibold text-sm">
                  กำลังเปิดลงคะแนน
                </span>
              </div>

              <Link
                to="/vote"
                className="inline-flex items-center justify-center bg-green-600 text-white px-10 py-3 rounded-full font-semibold
                           hover:bg-green-700 hover:scale-105 transition shadow-lg"
              >
                🗳️ VOTE NOW
              </Link>

              <div className="mt-5 text-sm text-gray-600">
                ⏳ เหลือเวลาอีก <strong>01 วัน 05 ชั่วโมง 32 นาที</strong>
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="flex justify-center mt-5">
            <div className="bg-yellow-100/90 text-yellow-800 px-6 py-2 rounded-full text-sm shadow">
              ⚠️ วันนี้เป็นวันสุดท้ายของการเลือกตั้ง
            </div>
          </div>

          {/* Quick Menu */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            <QuickCard title="ลงคะแนน" icon="🗳️" link="/vote" />
            <QuickCard title="ผู้สมัคร" icon="👥" link="/candidates" />
            <QuickCard title="คะแนน" icon="📊" link="/Dashboard" />
          </div>

        </main>
      </div>
    </Layout>
  );
}

function QuickCard({ title, icon, link }) {
  return (
    <Link
      to={link}
      className="group bg-white/95 backdrop-blur rounded-2xl shadow-xl p-8
                 flex flex-col items-center text-gray-800
                 hover:-translate-y-2 hover:shadow-2xl transition-all"
    >
      <div className="text-6xl mb-4 group-hover:scale-110 transition">
        {icon}
      </div>
      <div className="text-lg font-semibold">{title}</div>
      <div className="mt-2 text-sm text-gray-500 group-hover:text-green-600">
        ดูรายละเอียด →
      </div>
    </Link>
  );
}
