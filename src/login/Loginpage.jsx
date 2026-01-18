import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Swal from "sweetalert2";
import axios from "axios";
import { API_URL } from "../config/api";
import LoadingOverlay from "../components/LoadingOverlay";

export default function Login() {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !password) {
      return Swal.fire({
        icon: "warning",
        title: "กรอกข้อมูลให้ครบ",
      });
    }

    setLoading(true);

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
        });
        if (result.isConfirmed) {
          localStorage.setItem("isLoggedIn", "true");
          localStorage.setItem("name", name);
          localStorage.setItem("role", response.data.role);
          localStorage.removeItem("guest_tablenum");

          window.dispatchEvent(new Event("storage"));

          await Swal.fire({
            icon: "success",
            title: "Login สำเร็จ!",
            timer: 1500,
            showConfirmButton: false,
          });
          navigate("/"); // นำทางไปหน้าหลัก (Dashboard/Resultpage)
        }
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
    }finally{
      setLoading(false);
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
          เข้าสู่ระบบ
        </h2>

        <div className="card-body p-0">
          <div
            className="login-container"
            style={{
              fontFamily: "'Kanit', sans-serif",
              letterSpacing: "0.5px",
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
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit(e);
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
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSubmit(e);
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
          </div>
        </div>

        {/* ปุ่ม Submit */}
        <>
          {loading && <LoadingOverlay />}
          <button
            className="btn btn-success mt-4 w-100"
            onClick={handleSubmit}
            style={{
              fontFamily: "'Kanit', sans-serif",
              letterSpacing: "0.5px",
              fontSize: "20px",
            }}
          >
            เข้าสู่ระบบ
          </button>
        </>
      </div>
    </div>
  );
}
