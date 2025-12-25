import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    faculty: "",
    loginPassword: "",
    votePin: "",
  });

  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("http://localhost:8000/register/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "สมัครไม่สำเร็จ");
        return;
      }

      alert("สมัครสมาชิกสำเร็จ");
      navigate("/login");
    } catch (err) {
      setError("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-lg shadow-md w-full max-w-md"
      >
        <h2 className="text-2xl font-bold text-center mb-6">
          สมัครเข้าใช้งาน
        </h2>

        {error && (
          <div className="text-red-500 text-sm mb-3 text-center">
            {error}
          </div>
        )}

        {/* Email */}
        <input
          name="email"
          type="email"
          placeholder="อีเมลมหาวิทยาลัย (@ku.th)"
          value={form.email}
          onChange={handleChange}
          className="w-full border px-3 py-2 mb-3 rounded"
          required
        />

        {/* Faculty */}
        <select
          name="faculty"
          value={form.faculty}
          onChange={handleChange}
          className="w-full border px-3 py-2 mb-3 rounded bg-white"
          required
        >
          <option value="">เลือกคณะ</option>
          <option value="เศรษฐศาสตร์">คณะเศรษฐศาสตร์</option>
          <option value="พาณิชยนาวีนานาชาติ">
            คณะพาณิชยนาวีนานาชาติ
          </option>
          <option value="วิทยาการจัดการ">คณะวิทยาการจัดการ</option>
          <option value="วิทยาศาสตร์">คณะวิทยาศาสตร์</option>
          <option value="วิศวกรรมศาสตร์">คณะวิศวกรรมศาสตร์</option>
        </select>

        {/* Password */}
        <input
          name="loginPassword"
          type="password"
          placeholder="รหัสผ่าน (มี A-Z และ a-z)"
          value={form.loginPassword}
          onChange={handleChange}
          className="w-full border px-3 py-2 mb-3 rounded"
          required
        />

        {/* Vote PIN */}
        <input
          name="votePin"
          type="text"
          placeholder="รหัสโหวต 6 หลัก"
          value={form.votePin}
          onChange={handleChange}
          className="w-full border px-3 py-2 mb-4 rounded"
          required
        />

        <button
          type="submit"
          className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition"
        >
          สมัครสมาชิก
        </button>

        <p className="text-center text-sm mt-4">
          มีบัญชีอยู่แล้ว?{" "}
          <span
            onClick={() => navigate("/login")}
            className="text-green-600 cursor-pointer hover:underline"
          >
            เข้าสู่ระบบ
          </span>
        </p>
      </form>
    </div>
  );
}

export default Register;
