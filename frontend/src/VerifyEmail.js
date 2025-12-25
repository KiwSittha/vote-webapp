import { useParams } from "react-router-dom";
import { useEffect } from "react";

function VerifyEmail() {
  const { token } = useParams();

  useEffect(() => {
    fetch(`http://localhost:8000/verify-email/${token}`)
      .then(() => alert("ยืนยันอีเมลสำเร็จ"))
      .catch(() => alert("ยืนยันไม่สำเร็จ"));
  }, [token]);

  return <div className="text-center mt-10">กำลังยืนยันอีเมล...</div>;
}

export default VerifyEmail;
