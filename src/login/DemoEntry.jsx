import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

export default function DemoEntry() {
  const navigate = useNavigate();

  useEffect(() => {
    // login แบบ bypass
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("name", "GUEST_DEMO");
    localStorage.setItem("guest_tablenum", "DEMO");
    localStorage.removeItem("role");

    window.dispatchEvent(new Event("storage"));

    Swal.fire({
      icon: "info",
      title: "โหมดตัวอย่าง (Demo)",
      text: "สำหรับแสดงการใช้งานแก่ลูกค้า",
      timer: 1200,
      showConfirmButton: false,
    }).then(() => navigate("/Orderpage"));
  }, [navigate]);

  return null; // component นี้ไม่ต้องแสดง UI
}
