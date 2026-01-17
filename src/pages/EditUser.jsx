import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import axios from "axios";
import Select from "react-select";
import "../App.css";

export default function EditUserpage() {
  const [editName, setEditName] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [editRole, setEditRole] = useState(null);
  const [users, setUsers] = useState([]);
  const [showPassword, setShowPassword] = useState(false);

  const API_URL = "https://order-system-v1.onrender.com/api";

  const roleOptions = [
    { value: "user", label: "พนักงาน" },
    { value: "admin", label: "ผู้ดูแลระบบ" },
  ];

  //ฟังก์ดึงชื่อผู้ใช้งาน
  const getuser = async () => {
    try {
      // `${API_URL}/getuser`
      // "http://localhost:3001/api/getuser"
      const res = await axios.post(`${API_URL}/getuser`);
      if (res.data.success && Array.isArray(res.data.users)) {
        setUsers(res.data.users);
      } else {
        console.warn("Backend response success but no user array:", res.data);
        setUsers([]);
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถเชื่อมต่อ Server หรือดึงรายการผู้ใช้ได้",
      });
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    // ตรวจสอบข้อมูลให้ครบถ้วน
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
          timer: 2000,
          showConfirmButton: false,
        }).then(() => {
          // ล้างฟอร์มและปิด Modal
          closeAddModal();
          setName("");
          setPassword("");
          setRole(null);
          getuser(); // โหลดข้อมูลผู้ใช้ใหม่
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "ลงทะเบียนล้มเหลว",
          text: response.data.message,
        });
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "ไม่สามารถเชื่อมต่อ Server ได้";
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: errorMessage,
      });
    }
  };

  useEffect(() => {
    getuser();
  }, []);

  // --- ฟังก์ชันสำหรับจัดการการเพิ่ม Modal (Bootstrap JS) ---
  const closeAddModal = () => {
    const modalElement = document.getElementById("addUserModal");
    const modalInstance = window.bootstrap.Modal.getInstance(modalElement);
    if (modalInstance) {
      modalInstance.hide();
    }
    // ไม่ต้อง setAdduser(null) เพราะตอนนี้ใช้ state name, password, role ควบคุมฟอร์ม
    // แต่ควรล้างค่าฟอร์มด้วย setName(""), setPassword(""), setRole(null) หลังการลงทะเบียน
  };

  // --- ฟังก์ชันสำหรับจัดการการแก้ไข Modal ---
  const closeEditModal = () => {
    //ซ่อน Modal ผ่าน Bootstrap JS
    const modalElement = document.getElementById("editUserModal");
    const modalInstance = window.bootstrap.Modal.getInstance(modalElement);
    if (modalInstance) {
      modalInstance.hide();
    }
    //ล้าง State เพื่อปิด Modal Logic
    setEditingUser(null);
  };

  //เปิด Modal และกำหนดค่าเริ่มต้น
  const handleEdit = (user) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditPassword("");
    const currentRole = roleOptions.find((opt) => opt.value === user.role);
    setEditRole(currentRole || null);

    //แสดง Modal ผ่าน Bootstrap JS
    setTimeout(() => {
      const modalElement = document.getElementById("editUserModal");
      let modalInstance = window.bootstrap.Modal.getInstance(modalElement);
      if (!modalInstance) {
        modalInstance = new window.bootstrap.Modal(modalElement);
      }
      modalInstance.show();
    }, 100);
  };

  const handleAdd = () => {
    // ล้างค่าฟอร์มก่อนเปิด
    setName("");
    setPassword("");
    setRole(null);

    // แสดง Modal ผ่าน Bootstrap JS
    setTimeout(() => {
      const modalElement = document.getElementById("addUserModal");
      let modalInstance = window.bootstrap.Modal.getInstance(modalElement);
      if (!modalInstance) {
        modalInstance = new window.bootstrap.Modal(modalElement);
      }
      modalInstance.show();
    }, 100);
  };

  //ส่งข้อมูลการแก้ไขไปยัง Backend
  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingUser) return;

    if (!editName && !editPassword && !editRole) {
      return Swal.fire({
        icon: "warning",
        title: "กรอกข้อมูลอย่างน้อยหนึ่งช่อง",
        text: "กรุณากรอกชื่อผู้ใช้, รหัสผ่าน หรือบทบาทใหม่",
      });
    }
    const oldName = editingUser.name;
    try {
      // `${API_URL}/updateProfileByAdmin/${oldName}`
      // `http://localhost:3001/api/updateProfileByAdmin/${oldName}`
      const response = await axios.patch(
        `${API_URL}/updateProfileByAdmin/${oldName}`,
        {
          newName: editName,
          newPassword: editPassword,
          newRole: editRole ? editRole.value : undefined,
        }
      );

      if (response.data.success) {
        Swal.fire("แก้ไขสำเร็จ!", response.data.message, "success");
        closeEditModal(); // ปิด Modal
        getuser(); // โหลดข้อมูลผู้ใช้ใหม่
      } else {
        Swal.fire("ล้มเหลว!", response.data.message, "error");
      }
    } catch (error) {
      Swal.fire(
        "ผิดพลาด!",
        error.response?.data?.message || "ไม่สามารถเชื่อมต่อ Server ได้",
        "error"
      );
    }
  };

  // --- ฟังก์ชันสำหรับการลบผู้ใช้ ---
  const handleDelete = async (id, name) => {
    Swal.fire({
      title: `ต้องการลบผู้ใช้ ${name} ใช่หรือไม่?`,
      text: "คุณจะไม่สามารถกู้คืนได้!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "ใช่, ลบเลย!",
      cancelButtonText: "ยกเลิก",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          // `${API_URL}/deleteuser/${id}`
          // `http://localhost:3001/api/deleteuser/${id}`
          const res = await axios.delete(`${API_URL}/deleteuser/${id}`);
          if (res.data.success) {
            Swal.fire("ลบสำเร็จ!", res.data.message, "success");
            getuser();
          } else {
            Swal.fire("ล้มเหลว!", res.data.message, "error");
          }
        } catch (error) {
          Swal.fire("ผิดพลาด!", "ไม่สามารถเชื่อมต่อ Server ได้", "error");
        }
      }
    });
  };

  return (
    <div className="container-fluid">
      {/* ส่วน Breadcrumb และ Header */}
      <nav
        aria-label="breadcrumb"
        style={{ fontSize: "18px", fontFamily: "'Kanit', sans-serif" }}
      >
        <ol className="breadcrumb bg-light p-3 rounded shadow-sm">
          <li className="breadcrumb-item">
            <Link to="/">หน้าแรก</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            จัดการผู้ใช้
          </li>
        </ol>
      </nav>

      <h1
        className="header-title"
        style={{
          background: "linear-gradient(90deg, #2e5d4f, #a8d5ba)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          fontFamily: "'Kanit', sans-serif",
          letterSpacing: "0.5px",
        }}
      >
        จัดการผู้ใช้
      </h1>

      {/* ส่วนตารางแสดงข้อมูล */}
      <div className="card shadow">
        <div
          className="card-body"
          style={{ fontFamily: "'Kanit', sans-serif" }}
        >
          <button
            className="btn btn-success w-100 my-2"
            onClick={handleAdd} // แก้ไขเป็น handleAdd
            style={{ fontSize: "20px" }}
          >
            เพิ่มผู้ใช้งาน
          </button>
          <div className="table-container">
            <table className="table table-bordered table-striped">
              <thead className="table" style={{ fontSize: "20px" }}>
                <tr>
                  <th>ชื่อ</th>
                  <th>บทบาท</th>
                  <th>การจัดการ</th>
                </tr>
              </thead>
              <tbody>
                {users.length > 0 ? (
                  users.map((val) => (
                    <tr key={val.id}>
                      {/* <td>{val.id}</td> */}
                      <td>{val.name}</td>
                      <td>
                        {val.role === "admin" ? "ผู้ดูแลระบบ" : "พนักงาน"}
                      </td>
                      <td>
                        <div className="d-flex gap-2">
                          <button
                            className="btn btn-primary flex-fill"
                            onClick={() => handleEdit(val)}
                          >
                            แก้ไข
                          </button>
                          <button
                            className="btn btn-danger flex-fill"
                            onClick={() => handleDelete(val.id, val.name)}
                          >
                            ลบ
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="text-center">
                      ไม่มีข้อมูล
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL สำหรับแก้ไขผู้ใช้  */}
      <div
        className="modal"
        id="editUserModal"
        tabIndex="-1"
        aria-labelledby="editUserModalLabel"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header bg-primary text-white">
              <h5
                className="modal-title"
                id="editUserModalLabel"
                style={{ fontWeight: "600" }}
              >
                แก้ไขผู้ใช้: {editingUser ? editingUser.name : ""}
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white" // <--- เพิ่ม btn-close-white เพื่อให้ไอคอนปิดเห็นชัดบนพื้นหลังสีเข้ม
                data-bs-dismiss="modal"
                aria-label="Close"
                onClick={closeEditModal}
              ></button>
            </div>
            <form onSubmit={handleUpdate}>
              <div
                className="modal-body"
                style={{ fontFamily: "'Kanit', sans-serif" }}
              >
                <div className="mb-3">
                  <label className="form-label text-dark fw-bold">
                    ชื่อผู้ใช้ใหม่
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value.toUpperCase())}
                    placeholder="เว้นว่างไว้ถ้าไม่ต้องการเปลี่ยน"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label text-dark fw-bold">
                    รหัสผ่านใหม่
                  </label>
                  <input
                    type="password"
                    className="form-control"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="เว้นว่างไว้ถ้าไม่ต้องการเปลี่ยน"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label text-dark fw-bold">
                    บทบาทใหม่
                  </label>
                  <Select
                    options={roleOptions}
                    value={editRole}
                    onChange={setEditRole}
                    placeholder="เลือกบทบาท"
                    styles={{
                      control: (base) => ({
                        ...base,
                        fontSize: "16px",
                        color: "#333",
                      }),
                      singleValue: (base) => ({
                        ...base,
                        color: "#333",
                        fontWeight: "500",
                        fontSize: "18px",
                      }),
                      placeholder: (base) => ({
                        ...base,
                        color: "#666",
                        fontSize: "16px",
                      }),
                      option: (base, state) => ({
                        ...base,
                        color: "#333",
                        fontSize: "16px",
                        backgroundColor: state.isSelected
                          ? "#e0e0e0"
                          : state.isFocused
                          ? "#f0f0f0"
                          : null,
                      }),

                      menu: (base) => ({ ...base, zIndex: 2000 }),
                    }}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary" // <--- เปลี่ยนเป็น Outline เพื่อให้เป็นปุ่มรอง
                  data-bs-dismiss="modal"
                  onClick={closeEditModal}
                >
                  ยกเลิก
                </button>
                <button type="submit" className="btn btn-success">
                  บันทึกการแก้ไข
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* MODAL สำหรับเพิ่มผู้ใช้ (แก้ไข Input และผูก Function แล้ว) */}
      <div
        className="modal"
        id="addUserModal"
        tabIndex="-1"
        aria-labelledby="addUserModalLabel"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header bg-success text-white">
              <h5
                className="modal-title"
                id="addUserModalLabel"
                style={{ fontWeight: "600" }}
              >
                เพิ่มผู้ใช้ใหม่
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                data-bs-dismiss="modal"
                aria-label="Close"
                onClick={closeAddModal}
              ></button>
            </div>
            {/* ผูกกับ handleRegister สำหรับการเพิ่ม */}
            <form onSubmit={handleRegister}>
              <div
                className="modal-body"
                style={{ fontFamily: "'Kanit', sans-serif" }}
              >
                {/* 1. ชื่อผู้ใช้ */}
                <div className="mb-3">
                  <label className="form-label text-dark fw-bold">
                    ชื่อผู้ใช้
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={name}
                    onChange={(e) => setName(e.target.value.toUpperCase())}
                    placeholder="กรอกชื่อผู้ใช้"
                    required
                  />
                </div>
                {/* 2. รหัสผ่าน (เพิ่มเข้ามา) */}
                <div className="mb-3">
                  <label className="form-label text-dark fw-bold">
                    รหัสผ่าน
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showPassword ? "text" : "password"}
                      className="form-control"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="กรอกรหัสผ่าน"
                      required
                      style={{ paddingRight: "40px" }}
                    />
                    {password && (
                      <button
                        className=" btn-outline-secondary"
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
                          zIndex: 10,
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
                {/* 3. บทบาท */}
                <div className="mb-3">
                  <label className="form-label text-dark fw-bold">บทบาท</label>
                  <Select
                    options={roleOptions}
                    //  แก้ไข: ใช้ role และ setRole
                    value={role}
                    onChange={setRole}
                    placeholder="เลือกบทบาท"
                    styles={{
                      control: (base) => ({
                        ...base,
                        fontSize: "16px",
                        color: "#333",
                      }),
                      singleValue: (base) => ({
                        ...base,
                        color: "#333",
                        fontWeight: "500",
                        fontSize: "16px",
                      }),
                      placeholder: (base) => ({
                        ...base,
                        color: "#666",
                        fontSize: "16px",
                      }),
                      option: (base, state) => ({
                        ...base,
                        color: "#333",
                        fontSize: "16px",
                        backgroundColor: state.isSelected
                          ? "#e0e0e0"
                          : state.isFocused
                          ? "#f0f0f0"
                          : null,
                      }),
                      menu: (base) => ({ ...base, zIndex: 2000 }),
                    }}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  data-bs-dismiss="modal"
                  onClick={closeAddModal}
                >
                  ยกเลิก
                </button>
                <button type="submit" className="btn btn-success">
                  ตกลง
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
