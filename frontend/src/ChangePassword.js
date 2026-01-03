import { useState } from "react";
import Swal from "sweetalert2";
import Layout from "../components/Layout";

export default function ChangePassword() {
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // เช็คว่ารหัสใหม่ตรงกันไหม
    if (formData.newPassword !== formData.confirmPassword) {
      return Swal.fire("ข้อผิดพลาด", "รหัสผ่านใหม่ไม่ตรงกัน", "error");
    }
    
    // เช็คความยาวรหัส
    if (formData.newPassword.length < 6) {
        return Swal.fire("ข้อผิดพลาด", "รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร", "error");
    }

    try {
      const token = localStorage.getItem("token");
      
      // เรียก API เปลี่ยนรหัส
      const response = await fetch("https://vote-webapp.onrender.com/user/change-password", { // ⚠️ อย่าลืมเช็ค URL
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        Swal.fire({
          icon: 'success',
          title: 'สำเร็จ!',
          text: 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว',
          confirmButtonColor: '#10b981'
        });
        // ล้างฟอร์ม
        setFormData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'ไม่สำเร็จ',
          text: data.message || 'เกิดข้อผิดพลาด',
          confirmButtonColor: '#ef4444'
        });
      }

    } catch (error) {
      Swal.fire("Error", "เชื่อมต่อ Server ไม่ได้", "error");
    }
  };

  return (
    <Layout>
      <div className="max-w-md mx-auto mt-10 p-8 bg-white rounded-3xl shadow-xl border border-slate-100">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">🔐 เปลี่ยนรหัสผ่าน</h2>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* รหัสปัจจุบัน */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">รหัสผ่านปัจจุบัน</label>
            <input
              type="password"
              name="currentPassword"
              value={formData.currentPassword}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
              required
            />
          </div>

          {/* รหัสใหม่ */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">รหัสผ่านใหม่</label>
            <input
              type="password"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
              placeholder="อย่างน้อย 6 ตัวอักษร"
              required
            />
          </div>

          {/* ยืนยันรหัสใหม่ */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">ยืนยันรหัสผ่านใหม่</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 transition-all active:scale-95"
          >
            ยืนยันการเปลี่ยนรหัส
          </button>
        </form>
      </div>
    </Layout>
  );
}