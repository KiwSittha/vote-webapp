import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async () => {
  setError("");

  try {
    const res = await fetch("http://localhost:8000/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        loginPassword: password,
      }),
    });

    const data = await res.json();

    // ❌ ไม่พบผู้ใช้ในฐานข้อมูล
    if (res.status === 404) {
      setError("ไม่พบอีเมลนี้ในระบบ");
      return;
    }

    // ❌ ยังไม่ยืนยันอีเมล
    if (res.status === 403) {
      setError("กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ");
      return;
    }

    // ❌ รหัสผ่านผิด
    if (res.status === 401) {
      setError("รหัสผ่านไม่ถูกต้อง");
      return;
    }

    if (!res.ok) {
      setError("เข้าสู่ระบบไม่สำเร็จ");
      return;
    }

    // ✅ เก็บ token
    localStorage.setItem("token", data.token);

    // ✅ เก็บ user
    localStorage.setItem("user", JSON.stringify(data.user));

    // ✅ ไปหน้า Home
    navigate("/");

  } catch (err) {
    setError("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้");
  }
};



  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="h-14 bg-white flex items-center px-8 shadow">
        <span className="text-xl font-bold text-green-600">KU</span>
        <span className="text-xl font-bold text-gray-700">Vote</span>
      </header>

      {/* Hero */}
      <div className="flex-1 bg-gradient-to-b from-green-700 to-green-300 flex flex-col items-center justify-center text-white px-4">
        <h1 className="text-3xl font-bold text-center">
          ระบบเลือกตั้งประธานนิสิต
        </h1>

        <div className="bg-white text-gray-800 rounded-xl shadow-lg p-6 mt-8 w-full max-w-sm">
          <h3 className="text-lg font-semibold text-center mb-4">
            เข้าสู่ระบบ
          </h3>

          {error && (
            <p className="text-red-600 text-sm text-center mb-3">
              {error}
            </p>
          )}

          <input
            type="email"
            placeholder="อีเมล @ku.th"
            className="w-full border rounded px-3 py-2 mb-3"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="รหัสผ่าน"
            className="w-full border rounded px-3 py-2 mb-4"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            onClick={handleLogin}
            className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
          >
            เข้าสู่ระบบ
          </button>

          <p className="text-sm text-center mt-4">
            ยังไม่มีบัญชี?
            <Link to="/register" className="text-green-600 ml-1">
              สมัครใช้งาน
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}