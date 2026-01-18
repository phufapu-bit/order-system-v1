import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import "./Navbar.css";
import Logo from "../assets/images/checkout (1).png";

export default function Navbar({ toggleSidebar }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const navigate = useNavigate();

  const checkLogin = () => {
    const loginState = localStorage.getItem("isLoggedIn") === "true";
    setIsLoggedIn(loginState);
    setUsername(localStorage.getItem("name") || "");
  };

  useEffect(() => {
    checkLogin();
    window.addEventListener("storage", checkLogin);
    return () => window.removeEventListener("storage", checkLogin);
  }, []);

  const handleLogout = () => {
    const isDemo = localStorage.getItem("guest_tablenum") === "DEMO";

    if (isDemo) {
      Swal.fire({
        icon: "info",
        title: "โหมดตัวอย่าง",
        text: "โหมด Demo ไม่สามารถออกจากระบบได้",
        confirmButtonText: "ตกลง",
      });
      return;
    }
    Swal.fire({
      title: "คุณต้องการออกจากระบบ?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ใช่",
      cancelButtonText: "ไม่",
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("name");
        localStorage.removeItem("role");
        setIsLoggedIn(false);
        setUsername("");
        Swal.fire({
          icon: "success",
          title: "ออกจากระบบเรียบร้อย!",
          timer: 1500,
          showConfirmButton: false,
        }).then(() => navigate("/login"));
      }
    });
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-custom px-3">
      {/* ซ้าย */}
      <div className="d-flex align-items-center">
        <button className="btn btn-light me-2" onClick={toggleSidebar}>
          ☰
        </button>
        <Link to="/" className="navbar-brand d-flex align-items-center">
          <img
            src={Logo}
            alt="Logo"
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              objectFit: "cover",
              boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
              marginLeft: "8px",
              backgroundColor: "white",
            }}
          />
        </Link>
      </div>

      {/* ขวา */}
      <div className="ms-auto d-flex align-items-center gap-2">
        {isLoggedIn ? (
          <>
            <span
              className="text-white fw-bold"
              style={{
                fontFamily: "'Kanit', sans-serif",
                letterSpacing: "0.5px",
                fontSize: "20px",
              }}
            >
              {username}
            </span>
            <button
              className="btn btn-danger"
              onClick={handleLogout}
              style={{
                fontFamily: "'Kanit', sans-serif",
                letterSpacing: "0.5px",
                fontSize: "20px",
              }}
            >
              ออกจากระบบ
            </button>
          </>
        ) : (
          <Link
            to="/login"
            className="btn btn-success"
            style={{
              fontFamily: "'Kanit', sans-serif",
              letterSpacing: "0.5px",
              fontSize: "20px",
            }}
          >
            เข้าสู่ระบบ
          </Link>
        )}
      </div>
    </nav>
  );
}
