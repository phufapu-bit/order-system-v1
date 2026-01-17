import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Swal from "sweetalert2";
import axios from "axios";
import Select from "react-select";

export default function Login() {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const navigate = useNavigate();

  const API_URL = "https://order-system-v1.onrender.com/api";

  const roleOptions = [
    { value: "user", label: "พนักงาน" },
    { value: "admin", label: "ผู้ดูแลระบบ" },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !password) {
      return Swal.fire({
        icon: "warning",
        title: "กรอกข้อมูลให้ครบ",
      });
    }
    // `${API_URL}/login`
    // "http://localhost:3001/api/login"
    try {
      const response = await axios.post(`${API_URL}/login`, {
        name,
        password,
      });

      if (response.data.success) {
        Swal.fire({
          title: "คุณต้องการเข้าสู่ระบบใช่ไหม?",
          icon: "question",
          showCancelButton: true,
          confirmButtonText: "ใช่",
          cancelButtonText: "ไม่",
        }).then((result) => {
          if (result.isConfirmed) {
            localStorage.setItem("isLoggedIn", "true");
            localStorage.setItem("name", name);
            // Save the user's role in localStorage for later use
            localStorage.setItem("role", response.data.role);
            // **สำคัญ: ลบ guest_tablenum ออกเพื่อให้ถือเป็น Admin/User**
            localStorage.removeItem("guest_tablenum");
            window.dispatchEvent(new Event("storage"));

            Swal.fire({
              icon: "success",
              title: "Login สำเร็จ!",
              timer: 1500,
              showConfirmButton: false,
            }).then(() => navigate("/")); // นำทางไปหน้าหลัก (Dashboard/Resultpage)
          }
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "Login ล้มเหลว",
          text: response.data.message,
        });
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถเชื่อมต่อ Server ได้",
      });
    }
  };

  // **ฟังก์ชันใหม่สำหรับ Guest Login ที่รวมการถามหมายเลขโต๊ะ**
  const handleGuestLogin = () => {
    // 1. ถามหมายเลขโต๊ะจากผู้ใช้
    Swal.fire({
      title: "กรอกหมายเลขโต๊ะ",
      input: "text",
      inputLabel: "โปรดใส่หมายเลขโต๊ะของคุณ (เช่น 1, 15)",
      inputPlaceholder: "หมายเลขโต๊ะ",
      showCancelButton: true,
      confirmButtonText: "เข้าสู่ระบบ",
      cancelButtonText: "ยกเลิก",
      inputValidator: (value) => {
        const num = parseInt(value);
        if (!value || isNaN(num) || num <= 0) {
          return "โปรดใส่หมายเลขโต๊ะที่ถูกต้อง";
        }
      },
    }).then((tableResult) => {
      if (tableResult.isConfirmed) {
        const guestTableNum = tableResult.value;
        const guestName = `GUEST_T${guestTableNum}`; // ชื่อผู้ใช้ GUEST_T1

        // 2. ยืนยันการเข้าสู่ระบบ
        Swal.fire({
          title: `เข้าสู่ระบบโต๊ะที่ ${guestTableNum} ใช่ไหม?`,
          icon: "question",
          showCancelButton: true,
          confirmButtonText: "ใช่, เข้าสู่ระบบ",
          cancelButtonText: "ไม่",
        }).then((loginResult) => {
          if (loginResult.isConfirmed) {
            // 3. บันทึกข้อมูลที่สำคัญสำหรับ Guest
            localStorage.setItem("isLoggedIn", "true");
            localStorage.setItem("name", guestName);
            // บันทึกหมายเลขโต๊ะ: IMPORTANT for Resultpage.jsx logic
            localStorage.setItem("guest_tablenum", guestTableNum);

            // ลบ role ออกเพื่อให้ Resultpage.jsx รู้ว่าเป็น Guest
            localStorage.removeItem("role");

            window.dispatchEvent(new Event("storage"));

            Swal.fire({
              icon: "info",
              title: `ยินดีต้อนรับสู่โต๊ะที่ ${guestTableNum}!`,
              text: "กรุณาสั่งอาหารและเครื่องดื่ม",
              timer: 1500,
              showConfirmButton: false,
            }).then(() => navigate("/Orderpage")); // นำ Guest ไปหน้าสั่งอาหาร
          }
        });
      }
    });
  };
  // **สิ้นสุดฟังก์ชัน Guest Login ที่ปรับปรุง**

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!name || !password || !role) {
      return Swal.fire({
        icon: "warning",
        title: "กรอกข้อมูลให้ครบ",
      });
    }

    // `${API_URL}/register`
    // "http://localhost:3001/api/register"
    try {
      const response = await axios.post(`${API_URL}/register`, {
        name,
        password,
        role: role.value,
      });

      if (response.data.success) {
        Swal.fire({
          icon: "success",
          title: "ลงทะเบียนสำเร็จ!",
          text: "ตอนนี้คุณสามารถเข้าสู่ระบบได้แล้ว",
          timer: 2000,
          showConfirmButton: false,
        }).then(() => {
          setName("");
          setPassword("");
          setRole(null);
          setIsRegistering(false);
        });
      } else {
        // กรณี success: false แต่ไม่ได้มาจาก try-catch
        Swal.fire({
          icon: "error",
          title: "ลงทะเบียนล้มเหลว",
          text: response.data.message, // แสดงข้อความ error จาก backend
        });
      }
    } catch (error) {
      // ตรวจสอบ error จาก Axios
      const errorMessage =
        error.response?.data?.message || "ไม่สามารถเชื่อมต่อ Server ได้";
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: errorMessage, // แสดงข้อความ error จาก backend
      });
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center vh-100 overflow-hidden">
      <div
        className="card shadow-lg p-4 w-100"
        style={{
          backgroundColor: "#F9F6EE",
          maxWidth: "350px",
          textAlign: "center",
          borderRadius: "15px",
        }}
      >
        <h2
          className="mb-4 text-primary"
          style={{ fontFamily: "'Kanit', sans-serif", letterSpacing: "0.5px" }}
        >
          {isRegistering ? "ลงทะเบียน" : "เข้าสู่ระบบ"}
        </h2>

        <div className="card-body p-0">
          <div
            className="login-container"
            style={{
              fontFamily: "'Kanit', sans-serif",
              letterSpacing: "0.5px",
              // display: "none",
            }}
          >
            {/* Username */}
            <input
              type="text"
              className="form-control mb-3"
              value={name}
              onChange={(e) => setName(e.target.value.toUpperCase())}
              placeholder="กรุณาใส่ชื่อผู้ใช้งาน"
              autoFocus
              // disabled
              onKeyDown={(e) => {
                if (e.key === "Enter")
                  isRegistering ? handleRegister(e) : handleSubmit(e);
              }}
            />

            {/* Password */}
            <div className="mb-3" style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="กรุณาใส่รหัสผู้ใช้งาน"
                // disabled
                onKeyDown={(e) => {
                  if (e.key === "Enter")
                    isRegistering ? handleRegister(e) : handleSubmit(e);
                }}
              />
              {password && (
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  <i
                    className={
                      showPassword
                        ? "bi bi-eye-slash text-secondary"
                        : "bi bi-eye text-secondary"
                    }
                  ></i>
                </button>
              )}
            </div>

            {/* Role selection dropdown (only for registration) */}
            {isRegistering && (
              <Select
                options={roleOptions}
                value={role}
                onChange={setRole}
                placeholder="เลือกบทบาท"
                className="mb-3"
                styles={{ control: (base) => ({ ...base, fontSize: "16px" }) }}
              />
            )}
          </div>
        </div>

        {/* ปุ่ม Submit */}
        <button
          className={`btn ${
            isRegistering ? "btn-primary" : "btn-success"
          } mt-4 w-100`}
          onClick={isRegistering ? handleRegister : handleSubmit}
          style={{
            fontFamily: "'Kanit', sans-serif",
            letterSpacing: "0.5px",
            fontSize: "20px",
            // display: "none",
          }}
            // disabled
        >
          {isRegistering ? "ลงทะเบียน" : "เข้าสู่ระบบ"}
        </button>

        {/* ปุ่ม Guest Login (เฉพาะโหมด Login เท่านั้น) */}
        {!isRegistering && (
          <button
            className="btn btn-warning mt-2 w-100"
            onClick={handleGuestLogin}
            style={{
              fontFamily: "'Kanit', sans-serif",
              letterSpacing: "0.5px",
              fontSize: "20px",
            }}
          >
            ทดลองใช้งาน
          </button>
        )}

        {/* ปุ่มสลับโหมด */}
        <div className="mt-3">
          <button
            className="btn btn-link text-decoration-none"
            onClick={() => {
              setIsRegistering(!isRegistering);
              setName("");
              setPassword("");
              setRole(null);
            }}
            disabled={true} // disable การลงทะเบียนเพื่อให้มีเฉพาะ Admin ทำเท่านั้น
            style={{ fontFamily: "'Kanit', sans-serif"}}
          >
            {isRegistering
              ? "มีบัญชีอยู่แล้ว? เข้าสู่ระบบ"
              : "ไม่มีบัญชี? ลงทะเบียน"}
          </button>
        </div>
      </div>
    </div>
  );
}
