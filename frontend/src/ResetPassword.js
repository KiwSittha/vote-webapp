import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

export default function ResetPassword() {
  const { id, token } = useParams(); // รับค่าจาก URL
  const navigate = useNavigate();
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      return Swal.fire("ข้อผิดพลาด", "รหัสผ่านใหม่ไม่ตรงกัน", "error");
    }

    setLoading(true);
    try {
      const res = await fetch(`https://vote-webapp.onrender.com/reset-password/${id}/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: password }),
      });

      const data = await res.json();

      if (res.ok) {
        await Swal.fire({
          icon: 'success',
          title: 'สำเร็จ!',
          text: 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว กรุณาเข้าสู่ระบบใหม่',
          confirmButtonColor: '#10b981'
        });
        navigate("/login");
      } else {
        Swal.fire('ผิดพลาด', data.message || 'ลิงก์หมดอายุหรือใช้งานไม่ได้', 'error');
      }
    } catch (error) {
      Swal.fire('Error', 'ไม่สามารถเชื่อมต่อ Server ได้', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-100 p-4 font-sans">
      <div className="bg-white w-full max-w-md p-8 rounded-3xl shadow-xl border border-slate-200">
        
        <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-slate-800">ตั้งรหัสผ่านใหม่</h1>
            <p className="text-slate-500 text-sm mt-2">กรุณากรอกรหัสผ่านใหม่ของคุณ</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="text-sm font-semibold text-slate-700">รหัสผ่านใหม่</label>
                <input
                    type="password"
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 mt-1"
                    placeholder="อย่างน้อย 6 ตัวอักษร"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
            </div>
            
            <div>
                <label className="text-sm font-semibold text-slate-700">ยืนยันรหัสผ่านใหม่</label>
                <input
                    type="password"
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 mt-1"
                    placeholder="กรอกให้ตรงกัน"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                />
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg mt-4 transition-all"
            >
                {loading ? "กำลังบันทึก..." : "ยืนยันการเปลี่ยนรหัส"}
            </button>
        </form>
      </div>
    </div>
  );
}