import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import axios from "axios";
import "../App.css";

export default function Menupage() {
  const [menuname, setMenuname] = useState("");
  const [price, setPrice] = useState("");

  const [menuList, setMenuList] = useState([]);

  const [isEditing, setIsEditing] = useState(false);
  const [id, setId] = useState(null);
  const [image, setImage] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);

  const fileInputRef = useRef(null);
  const nameInputRef = useRef(null);

  const API_URL = "https://order-system-v1.onrender.com/api";

  // ฟังก์ชันดึงเมนู
  const getMenuList = async () => {
    // `${API_URL}/getmenu`
    // "http://localhost:3001/api/getmenu"
    try {
      const res = await axios.post(`${API_URL}/getmenu`);
      if (res.data.success) {
        setMenuList(res.data.menu);
      }
    } catch (error) {
      console.error("Error fetching menu:", error);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถเชื่อมต่อ Server เพื่อดึงรายการเมนูได้",
      });
    }
  };

  const handleUpload = async () => {
    const formData = new FormData();
    formData.append("image", image); // image = file ที่เลือกจาก input
    // ("http://localhost:3001/upload");
    const res = await axios.post(`${API_URL}/upload`, formData);
    return res.data.image;
  };

  // ฟังก์เพิ่มเมนู
  const handleAddMenu = async () => {
    try {
      if (!image) return alert("กรุณาเลือกรูป");

      const fileName = await handleUpload();

      if (!menuname || !price || !image) {
        return Swal.fire({
          icon: "warning",
          title: "กรอกข้อมูลให้ครบ",
        });
      }
      const formData = new FormData();
      formData.append("menuname", menuname);
      formData.append("price", price);
      if (image instanceof File) {
        formData.append("image", fileName);
      }

      // `${API_URL}/addmenu`
      // "http://localhost:3001/api/addmenu"
      await axios.post(`${API_URL}/addmenu`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      Swal.fire({
        icon: "success",
        title: "เพิ่มเมนูสำเร็จ!",
        timer: 1000,
        showConfirmButton: false,
      }).then(() => {
        getMenuList();
        resetForm();
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถเพิ่มเมนูได้",
      });
    }
  };

  // ปุ่มการอัพเดต
  const handleEdit = (menu) => {
    setId(menu.id);
    setMenuname(menu.ordername);
    setPrice(menu.price);
    setImage(menu.image);
    setIsEditing(true);

    setTimeout(() => {
      if (nameInputRef.current) {
        nameInputRef.current.focus();
        nameInputRef.current.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }, 0);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setMenuname("");
    setPrice("");
    setImage("");
  };

  // ฟังก์ชันการแก้ไข
  const handleUpdate = async () => {
    Swal.fire({
      title: "คุณต้องการแก้ไขเมนูนี้ใช่ไหม?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "ใช่",
      cancelButtonText: "ไม่",
    }).then(async (result) => {
      if (result.isConfirmed) {
        // `${API_URL}/updatemenu`
        // "http://localhost:3001/api/updatemenu"
        try {
          let fileName = image; // default = ไฟล์เดิม (string)

          // ถ้าเลือกไฟล์ใหม่ → upload + remove.bg
          if (image instanceof File) {
            fileName = await handleUpload();
          }

          const formData = new FormData();
          formData.append("id", id);
          formData.append("menuname", menuname);
          formData.append("price", price);
          formData.append("image", fileName); // ส่งชื่อไฟล์

          await axios.patch(`${API_URL}/updatemenu`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          Swal.fire({
            icon: "success",
            title: "แก้ไขเมนูสำเร็จ!",
            timer: 1000,
            showConfirmButton: false,
          }).then(() => {
            getMenuList();
            resetForm();
          });
        } catch (error) {
          Swal.fire({
            icon: "error",
            title: "เกิดข้อผิดพลาด",
            text: "ไม่สามารถแก้ไขเมนูได้",
          });
        }
      }
    });
  };

  // ฟังก์การลบ
  const handleDelete = (id) => {
    Swal.fire({
      title: "คุณต้องการลบเมนูนี้หรือไม่?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ใช่",
      cancelButtonText: "ไม่",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          // `${API_URL}/deletemenu/${id}`
          // `http://localhost:3001/api/deletemenu/${id}`
          await axios.delete(`${API_URL}/deletemenu/${id}`);
          setMenuList(menuList.filter((menu) => menu.id !== id));
          Swal.fire({
            icon: "success",
            title: "ลบเรียบร้อย",
            timer: 1000,
            showConfirmButton: false,
          });
        } catch (error) {
          Swal.fire({
            icon: "error",
            title: "เกิดข้อผิดพลาด",
            text: "ไม่สามารถเชื่อมต่อ Server ได้",
          });
        }
      }
    });
  };

  // การรีเชตค่า
  const resetForm = () => {
    setMenuname("");
    setPrice("");
    setId(null);
    setIsEditing(false);
    setImage("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const clearForm = () => {
    setMenuname("");
    setPrice("");
    setImage("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // การดึงข้อมูล
  useEffect(() => {
    getMenuList();
  }, []);

  return (
        <div className="container">
      <div
        className="card shadow-lg mt-0 m-2"
        style={{
          borderRadius: "20px",
        }}
      >
        <nav
          aria-label="breadcrumb"
          style={{ fontSize: "18px", fontFamily: "'Kanit', sans-serif" }}
        >
          <ol className="breadcrumb bg-light p-3 rounded shadow-sm">
            <li className="breadcrumb-item">
              <Link to="/">หน้าแรก</Link>
            </li>
            <li className="breadcrumb-item active" aria-current="page">
              จัดการเมนู
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
          จัดการเมนู
        </h1>
          <div
            className="card-body"
            style={{ fontFamily: "'Kanit', sans-serif" }}
          >
            {/* ฟอร์มเพิ่ม/แก้ไขเมนู */}
            <div
              className="card p-4 mb-4 shadow"
              style={{
                borderRadius: "20px",
                background: "linear-gradient(135deg, #ffffff 0%, #f7f7f7 100%)",
              }}
            >
              <h4 className="mb-3 fw-bold" style={{ color: "#333" }}>
                {isEditing ? "แก้ไขเมนู" : "เพิ่มเมนูใหม่"}
              </h4>

              <div className="row g-3">
                {/* ชื่อเมนู */}
                <div className="col-md-5">
                  <label className="form-label">ชื่อเมนู</label>
                  <input
                    ref={nameInputRef}
                    style={{ fontSize: "18px" }}
                    type="text"
                    className="form-control"
                    placeholder="เช่น กะเพราไก่ไข่ดาว"
                    value={menuname}
                    onChange={(e) => setMenuname(e.target.value)}
                    autoFocus
                  />
                </div>

                {/* ราคา */}
                <div className="col-md-2">
                  <label className="form-label">ราคา (บาท)</label>
                  <input
                    style={{ fontSize: "18px" }}
                    type="number"
                    className="form-control"
                    placeholder="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    min="0"
                  />
                </div>

                {/* อัปโหลดรูป */}
                <div className="col-md-5">
                  <label className="form-label">รูปเมนู</label>
                  <div className="d-flex align-items-center gap-2">
                    {isEditing && typeof image === "string" ? (
                      <>
                        <input
                          type="file"
                          className="form-control"
                          ref={fileInputRef}
                          onChange={(e) => setImage(e.target.files[0])}
                        />

                        <button
                          onClick={() => setShowImageModal(true)}
                          className="btn btn-outline-primary"
                          style={{ whiteSpace: "nowrap" }}
                        >
                          ดูรูปเดิม
                        </button>
                      </>
                    ) : (
                      <input
                        type="file"
                        className="form-control"
                        ref={fileInputRef}
                        onChange={(e) => setImage(e.target.files[0])}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Modal รูปภาพ */}
              {showImageModal && (
                <div
                  style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    background: "rgba(0,0,0,0.75)",
                    backdropFilter: "blur(3px)",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    zIndex: 2000,
                  }}
                  onClick={() => setShowImageModal(false)}
                >
                  {/* `${API_URL}/uploads/${image}` */}
                  {/* `http://localhost:3001/uploads/${image}` */}
                  <img
                    src={
                      image instanceof File
                        ? URL.createObjectURL(image)
                        : `${API_URL}/uploads/${image}`
                    }
                    alt="old"
                    style={{
                      maxHeight: "80%",
                      maxWidth: "80%",
                      borderRadius: "15px",
                      boxShadow: "0 8px 25px rgba(0,0,0,0.4)",
                    }}
                  />
                </div>
              )}

              {/* ปุ่ม Action */}
              <div className="row mt-4">
                <div className="col-md-6 d-flex gap-3">
                  {isEditing ? (
                    <>
                      <button
                        className="btn btn-warning w-50"
                        onClick={handleUpdate}
                      >
                        อัปเดตเมนู
                      </button>
                      <button
                        className="btn btn-secondary w-50"
                        onClick={handleCancelEdit}
                      >
                        ยกเลิก
                      </button>
                    </>
                  ) : (
                    <button
                      className="btn btn-success w-100"
                      onClick={handleAddMenu}
                    >
                      บันทึกเมนู
                    </button>
                  )}
                </div>

                <div className="col-md-6">
                  <button className="btn btn-danger w-100" onClick={clearForm}>
                    ล้างข้อมูล
                  </button>
                </div>
              </div>
            </div>

            <div
              className="card shadow-sm mb-3"
              style={{
                borderRadius: "16px",
                background: "rgba(255, 255, 255, 0.6)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255, 255, 255, 0.3)",
              }}
            >
              <div
                className="d-flex align-items-center gap-3 px-3 py-3"
                style={{
                  borderLeft: "6px solid #0d6efd",
                  borderRadius: "12px",
                  // background: "linear-gradient(135deg, #f8f9fa, #ffffff)",
                  background: "linear-gradient(135deg, #ffffff 0%, #f7f7f7)",
                  boxShadow: "0 4px 10px rgba(0,0,0,0.10)",
                }}
              >
                {/* วงกลมไอคอนสวยๆ */}
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #dbeafe, #bfdbfe)",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    fontSize: "22px",
                  }}
                >
                  📋
                </div>

                <h4 className="fw-bold m-0" style={{ fontSize: "24px" }}>
                  รายการเมนูทั้งหมด
                </h4>
              </div>
            </div>

            {/* เมนูทั้งหมด */}

            <div
              className="row g-4"
              style={{
                maxHeight: "500px",
                overflowY: "auto",
                paddingRight: "10px",
                marginTop: "5px",
              }}
            >
              {menuList.length > 0 ? (
                menuList.map((menu) => (
                  <div className="col-md-4" key={menu.id}>
                    <div
                      className="card shadow-lg"
                      style={{ borderRadius: "20px", overflow: "hidden" }}
                    >
                      {/* `${API_URL}/uploads/${menu.image}` */}
                      {/* `http://localhost:3001/uploads/${menu.image}` */}
                      <img
                        src={`${API_URL}/uploads/${menu.image}`}
                        alt={menu.ordername}
                        className="card-img-top"
                        style={{
                          width: "100%",
                          height: "200px",
                          objectFit: "contain",
                          background: "#fafafa",
                          boxShadow: "0 4px 10px rgba(0,0,0,0.10)",
                        }}
                      />
                      <div className="card-body">
                        <h5 className="card-title fw-bold">{menu.ordername}</h5>

                        <p
                          className="text-primary fw-bold"
                          style={{ fontSize: "18px" }}
                        >
                          ราคา {menu.price} บาท
                        </p>

                        <p className="text-muted" style={{ fontSize: "12px" }}>
                          {menu.update_at
                            ? new Date(menu.update_at).toLocaleString("th-TH")
                            : ""}
                        </p>

                        <div className="d-flex gap-2">
                          <button
                            className="btn btn-primary flex-fill"
                            onClick={() => handleEdit(menu)}
                          >
                            แก้ไข
                          </button>

                          <button
                            className="btn btn-danger flex-fill"
                            onClick={() => handleDelete(menu.id)}
                          >
                            ลบ
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center mt-5">
                  <h4>ยังไม่มีรายการเมนู</h4>
                </div>
              )}
            </div>
          </div>
      </div>
    </div>
  );
}
