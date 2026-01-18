import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import Select from "react-select";
import axios from "axios";
import "../App.css";
import { API_URL } from "../config/api"
import { QRCodeCanvas } from "qrcode.react";
import generatePayload from "promptpay-qr";
import AddIcon from "../assets/images/plus.png";
import editIcon from "../assets/images/edit.png";

export default function Orderpage() {
  const [tablenum, setTablenum] = useState("");
  const [takeawayInput, setTakeawayInput] = useState(""); // State สำหรับรหัสออเดอร์กลับบ้านที่ไม่ซ้ำกัน
  const [filterTableNum, setFilterTableNum] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [orders, setOrders] = useState([]);
  const [menuOptions, setMenuOptions] = useState([]);
  const [menuList, setMenuList] = useState([]);
  const [cart, setCart] = useState([]); // State สำหรับตะกร้าสินค้า
  const [filterListOrder, setFilterListOrder] = useState(null);
  const [listorder, setListorder] = useState(null);
  const [id, setId] = useState(null);
  const [cartIndexToEdit, setCartIndexToEdit] = useState(null); // State สำหรับเก็บ Index รายการในตะกร้าที่จะแก้ไข
  const [qty, setQty] = useState(1);
  const [isEditing, setIsEditing] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [isTakeaway, setIsTakeaway] = useState(false);

  const navigate = useNavigate();
  const ROLE = localStorage.getItem("role");
  const guestTablenum = localStorage.getItem("guest_tablenum");

  const isDemo = localStorage.getItem("guest_tablenum") === "DEMO";


  const calculatePrice = (menuName, qty) => {
    const menu = menuList.find((m) => m.ordername === menuName);
    if (!menu) throw new Error("Menu not found");

    const price = menu.price;
    return {
      price,
      total_price: price * qty,
    };
  };

  const filteredOrders = orders.filter((order) => {
    let matches = true;
    if (filterTableNum.trim()) {
      const tableNumString = String(order.tablenum);
      if (!tableNumString.includes(filterTableNum.trim())) {
        matches = false;
      }
    }
    if (!matches) return false;
    if (filterListOrder) {
      const filterValue =
        typeof filterListOrder === "string"
          ? filterListOrder.trim()
          : filterListOrder.value
            ? String(filterListOrder.value).trim()
            : "";

      if (filterValue) {
        const lowerCaseFilter = filterValue.toLowerCase();
        const lowerCaseOrder = order.listorder.toLowerCase();
        if (!lowerCaseOrder.includes(lowerCaseFilter)) {
          matches = false;
        }
      }
    }
    if (!matches) return false;
    if (order.update_at) {
      const orderDate = order.update_at.substring(0, 10);

      // กรอง 'จากวันที่' (Start Date)
      if (startDate) {
        // ถ้ามีการกำหนดค่า startDate
        if (orderDate < startDate) {
          matches = false;
        }
      }

      if (endDate) {
        if (matches && orderDate > endDate) {
          matches = false;
        }
      }
    }
    return matches;
  });

  const fetchMenuData = async () => {
    try {
      const res = await axios.post(`${API_URL}/getmenu`);
      if (res.data.success) {
        setMenuList(res.data.menu);
        const options = res.data.menu.map((item) => ({
          value: item.ordername,
          label: item.ordername,
        }));
        setMenuOptions(options);
      }
    } catch (error) {
      console.error("Error fetching menu data:", error);
    }
  };

  // ดึงข้อมูลออเดอร์
  const getListorder = async () => {
    try {
      const res = await axios.post(`${API_URL}/getorder`);
      if (res.data.success) {
        setOrders(res.data.orders);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    }
  };

  const handleTakeawayToggle = async (e) => {
    const isChecked = e.target.checked;
    setIsTakeaway(isChecked);
    if (isChecked) {
      setTablenum("");
      try {
        const res = await axios.get(`${API_URL}/takeaway`);
        setTakeawayInput(res.data.code); // เช่น T005
      } catch (err) {
        console.error("Error fetch takeaway number:", err);
      }
    } else {
      setTablenum("");
      setTakeawayInput("");
    }
  };

  //ฟังก์ชันยกเลิกการแก้ไขและล้างฟอร์ม
  const handleCancelEdit = () => {
    setId(null);
    setListorder(null);
    setQty(1);
    setIsEditing(false);
    setCartIndexToEdit(null);
    // รีเซ็ตสถานะ Takeaway
    setIsTakeaway(false);
    setTakeawayInput("");

    // การจัดการเลขโต๊ะ: ถ้าเป็น Guest ให้รีเซ็ตกลับไปเป็นค่าเดิม
    if (isGuest && guestTablenum) {
      setTablenum(guestTablenum);
    } else {
      setTablenum("");
    }
  };

  //  ฟังก์ชันเพิ่มลงตะกร้า (Add to Cart)
  const handleAddToCart = () => {
    if (isDemo) {
      Swal.fire("โหมดตัวอย่าง", "ไม่สามารถแก้ไขข้อมูลได้", "warning");
      return;
    }
    //  ตรวจสอบว่าต้องมี tablenum หรือเป็น Takeaway
    if (!listorder || !qty) {
      return Swal.fire({
        icon: "warning",
        title: "กรอกข้อมูลให้ครบ",
        text: "โปรดระบุรายการอาหาร จำนวน และระบุ 'โต๊ะที่' หรือเลือก 'สั่งกลับบ้าน'",
      });
    }

    // Check if tablenum/takeawayInput is filled
    if (!isTakeaway && !tablenum) {
      return Swal.fire({
        icon: "warning",
        title: "กรอกข้อมูลให้ครบ",
        text: "โปรดระบุ 'โต๊ะที่'",
      });
    } else if (isTakeaway && !takeawayInput) {
      // กรณีนี้ไม่ควรเกิดขึ้นถ้าใช้รหัสอัตโนมัติ แต่เพิ่มไว้เป็น Fallback
      return Swal.fire({
        icon: "warning",
        title: "กรอกข้อมูลให้ครบ",
        text: "โปรดระบุ 'รหัสออเดอร์กลับบ้าน'",
      });
    }

    //Logic: ถ้าเป็น Takeaway ให้ใช้ "TAKEAWAY" เป็น tablenum
    const finalTablenum = isTakeaway ? takeawayInput.toUpperCase() : tablenum;

    const selectedMenuItem = menuList.find(
      (item) => item.ordername === listorder.value,
    );

    if (!selectedMenuItem) {
      return Swal.fire({
        icon: "error",
        title: "ไม่พบข้อมูลเมนู",
        text: "ไม่สามารถคำนวณราคาได้",
      });
    }

    const price = selectedMenuItem.price;
    const totalPrice = price * qty;

    const newItem = {
      tablenum: finalTablenum, // ใช้ค่าที่กำหนดแล้ว
      listorder: listorder.value,
      qty: parseInt(qty),
      price: price,
      total_price: totalPrice,
    };
    setCart([...cart, newItem]);
    setListorder(null);
    setQty(1);

    Swal.fire({
      icon: "info",
      title: "เพิ่มในตะกร้าแล้ว",
      text: `${newItem.listorder} (${newItem.qty} รายการ)`,
      timer: 800,
      showConfirmButton: false,
    });
  };

  //ฟังก์ชันยืนยันการสั่งซื้อทั้งหมด
  const handleConfirmOrder = async () => {
    if (isDemo) {
      Swal.fire("โหมดตัวอย่าง", "ไม่สามารถแก้ไขข้อมูลได้", "warning");
      return;
    }
    if (cart.length === 0) return;

    //การจัดการ Guest Session: ไม่ควรเซ็ต/เคลียร์ guest_tablenum ถ้าเป็น Takeaway
    if (isGuest && tablenum) {
      localStorage.setItem("guest_tablenum", tablenum);
    }

    try {
      // วนลูปส่งรายการในตะกร้าไป Backend ทีละรายการ
      for (const item of cart) {
        await axios.post(`${API_URL}/order`, item);
      }

      Swal.fire({
        icon: "success",
        title: "ส่งรายการสั่งซื้อทั้งหมดสำเร็จ!",
        timer: 1200,
        showConfirmButton: false,
      }).then(() => {
        setCart([]); // ล้างตะกร้าเมื่อสั่งซื้อสำเร็จ
        getListorder(); // รีเฟรชรายการออเดอร์ในตารางด้านล่าง

        // Logic นำทางและล้างฟอร์ม:
        if (isGuest && !isTakeaway) {
          navigate("/resultpage"); // Guest (ที่นั่งโต๊ะ) ไปหน้าดูสถานะ
        } else {
          // Admin/User หรือ Guest ที่เป็น TAKEAWAY ล้างฟอร์ม
          setTablenum("");
          setIsTakeaway(false);
          setTakeawayInput("");
        }
        setListorder(null);
        setQty(1);
      });
    } catch (error) {
      console.error("Error confirming order:", error);
      Swal.fire("ผิดพลาด!", "มีข้อผิดพลาดในการยืนยันการสั่งซื้อ", "error");
    }
  };

  //ฟังก์ชันดึงข้อมูลไปแก้ไข (ใช้สำหรับทั้ง orders และ cart)
  const handleEdit = (item, index = null) => {
    if (isDemo) {
      Swal.fire("โหมดตัวอย่าง", "ไม่สามารถแก้ไขข้อมูลได้", "warning");
      return;
    }
    const isTakeawayOrder =
      typeof item.tablenum === "string" && item.tablenum.startsWith("T");
    setId(item.id || null); // id จะมีค่าเฉพาะถ้ามาจากตาราง orders
    setTablenum(isTakeawayOrder ? "" : item.tablenum);
    setTakeawayInput(isTakeawayOrder ? item.tablenum : "");

    //ตั้งค่า isTakeaway ตามค่า tablenum
    setIsTakeaway(isTakeawayOrder);

    const selectedOption = menuOptions.find(
      (option) => option.value === item.listorder,
    );
    setListorder(selectedOption);
    setQty(item.qty);
    setIsEditing(true);
    setCartIndexToEdit(index);
  };

  //  ฟังก์ชันอัปเดตรายการในตะกร้า
  const handleUpdateCartItem = () => {
    if (isDemo) {
      Swal.fire("โหมดตัวอย่าง", "ไม่สามารถแก้ไขข้อมูลได้", "warning");
      return;
    }
    if (!listorder || !qty || cartIndexToEdit === null) {
      return Swal.fire({
        icon: "warning",
        title: "ข้อมูลไม่สมบูรณ์",
      });
    }

    if (isTakeaway && !takeawayInput) {
      return Swal.fire({
        icon: "warning",
        title: "โปรดระบุรหัสกลับบ้าน",
      });
    }

    try {
      const { price, total_price } = calculatePrice(
        listorder.value,
        parseInt(qty),
      );

      const updatedItem = {
        tablenum: isTakeaway ? takeawayInput.toUpperCase() : tablenum,
        listorder: listorder.value,
        qty: parseInt(qty),
        price,
        total_price,
      };

      setCart((prev) =>
        prev.map((item, idx) => (idx === cartIndexToEdit ? updatedItem : item)),
      );

      handleCancelEdit();

      Swal.fire({
        icon: "success",
        title: "อัปเดตรายการแล้ว",
        timer: 800,
        showConfirmButton: false,
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: err.message,
      });
    }
  };

  const handleUpdateOrder = async () => {
    if (isDemo) {
      Swal.fire("โหมดตัวอย่าง", "ไม่สามารถแก้ไขข้อมูลได้", "warning");
      return;
    }
    // การแก้ไขรายการใน DB จะยังคงใช้ tablenum ที่ถูกดึงมาตอนแรก
    if (cartIndexToEdit !== null || !id) return;
    if (isTakeaway && !takeawayInput) {
      return Swal.fire({
        icon: "warning",
        title: "ข้อมูลไม่สมบูรณ์",
        text: "โปรดระบุ 'รหัสออเดอร์กลับบ้าน'",
      });
    }
    Swal.fire({
      title: "คุณต้องการแก้ไขออเดอร์ใช่ไหม?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "ใช่",
      cancelButtonText: "ไม่",
    }).then(async (result) => {
      if (result.isConfirmed) return;
      try {
        const { price, total_price } = calculatePrice(
          listorder.value,
          parseInt(qty),
        );

        const finalTablenum = isTakeaway
          ? takeawayInput.toUpperCase()
          : tablenum;
        const response = await axios.patch(`${API_URL}/updateOrder`, {
          id, // id นี้คือ id ของรายการใน Database (orders)
          tablenum: finalTablenum,
          listorder: listorder.value,
          qty: parseInt(qty),
          price,
          total_price,
        });

        if (response.data.success) {
          Swal.fire({
            icon: "success",
            title: "แก้ไขออเดอร์ สำเร็จ!",
            timer: 1000,
            showConfirmButton: false,
          }).then(() => getListorder());

          handleCancelEdit();
        }
      } catch (error) {
        console.error("Error in handleUpdate:", error);
        Swal.fire({
          icon: "error",
          title: "เกิดข้อผิดพลาด",
          text: "ไม่สามารถเชื่อมต่อ Server หรือคำนวณราคาได้",
        });
      }
    });
  };

  // ลบออเดอร์
  const handleDelete = (id) => {
    if (isDemo) {
      Swal.fire("โหมดตัวอย่าง", "ไม่สามารถแก้ไขข้อมูลได้", "warning");
      return;
    }
    Swal.fire({
      title: "คุณต้องการลบออเดอร์นี้หรือไม่?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ใช่",
      cancelButtonText: "ไม่",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axios.delete(`${API_URL}/deleteOrder/${id}`);
          setOrders(orders.filter((o) => o.id !== id));
          Swal.fire({
            icon: "success",
            title: "ลบเรียบร้อย",
            timer: 1000,
            showConfirmButton: false,
          });
          window.location.reload();
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

  const handleDone = async (id) => {
    if (isDemo) {
      Swal.fire("โหมดตัวอย่าง", "ไม่สามารถแก้ไขข้อมูลได้", "warning");
      return;
    }
    Swal.fire({
      title: "รายการนี้ทำเสร็จแล้วใช่หรือไม่?",
      text: "สถานะจะเปลี่ยนเป็น 'Done' (พร้อมชำระเงิน)",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "ใช่, เสร็จสิ้น",
      cancelButtonText: "ยกเลิก",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const response = await axios.patch(`${API_URL}/doneOrder`, {
            id,
          });
          if (response.data.success) {
            Swal.fire({
              icon: "success",
              title: "อัปเดตเป็นเสร็จสิ้น (Done)!",
              timer: 1000,
              showConfirmButton: false,
            }).then(() => getListorder());
          } else {
            Swal.fire({
              icon: "error",
              title: "ไม่สามารถอัปเดตสถานะ",
              text: response.data.message || "เกิดข้อผิดพลาดในการอัปเดต",
            });
          }
        } catch (error) {
          console.error(error);
          Swal.fire({
            icon: "error",
            title: "เกิดข้อผิดพลาด",
            text: "ไม่สามารถเชื่อมต่อ Server ได้",
          });
        }
      }
    });
  };

  const thaiToReadable = (text) => {
    return text
      .replace(/ชำระ/g, "cham-ra")
      .replace(/เงิน/g, "ngern")
      .replace(/จำนวน/g, "jam-nuan")
      .replace(/บาท/g, "baht")
      .replace(/โต๊ะ/g, "toh")
      .replace(/ออเดอร์/g, "order")
      .replace(/รับ/g, "rab")
      .replace(/แล้ว/g, "laew")
      .replace(/ครับ/g, "krub");
  };

  const speakThai = (text) => {
    // โหลดเสียงให้ครบก่อน
    const loadVoices = () => {
      return new Promise((resolve) => {
        let voices = speechSynthesis.getVoices();
        if (voices.length) {
          resolve(voices);
          return;
        }

        speechSynthesis.onvoiceschanged = () => {
          resolve(speechSynthesis.getVoices());
        };
      });
    };

    loadVoices().then((voices) => {
      // หาวอยซ์ภาษาไทย
      const thaiVoice = voices.find((v) => v.lang === "th-TH");

      const utter = new SpeechSynthesisUtterance(text);

      // ถ้ามีเสียงไทย ให้ใช้เลย
      if (thaiVoice) {
        // มีเสียงไทย → เยี่ยม ใช้เลย
        utter.voice = thaiVoice;
        utter.lang = "th-TH";
      } else {
        // ไม่มีเสียงไทย → แปลงเป็นเสียงอ่านแทน
        utter.text = thaiToReadable(text);
        utter.lang = "en-US";
      }

      // utter.rate = 0.75; // ⬅️ พูดช้าลง (แนะนำ 0.65–0.8)
      // utter.pitch = 1; // โทนเสียงผู้หญิงแบบมาตรฐาน
      utter.volume = 1;

      speechSynthesis.speak(utter);
    });
  };

  const handlePaymentAndComplete = async (tablenum, tableSummary) => {
    Swal.fire({
      title: `รับชำระเงินโต๊ะ/ออเดอร์ ${tablenum} ใช่หรือไม่?`,
      text: "รายการทั้งหมดของชุดนี้จะถูกบันทึกเป็นยอดขาย",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "ใช่, รับชำระเงิน",
      cancelButtonText: "ยกเลิก",
    }).then(async (result) => {
      if (result.isConfirmed) {
        speakThai(`ชำระเงิน ${tableSummary.totalAmount} บาท`);
        try {
          const response = await axios.patch(`${API_URL}/completeTableOrders`, {
            tablenum: tablenum,
          });
          if (response.data.success) {
            Swal.fire({
              icon: "success",
              title: `โต๊ะ/ออเดอร์ ${tablenum} ชำระเงินเสร็จสิ้น!`,
              timer: 1500,
              showConfirmButton: false,
            }).then(() => getListorder()); // Refresh list
          } else {
            Swal.fire({
              icon: "error",
              title: "ไม่สามารถอัปเดตสถานะ",
              text: response.data.message || "เกิดข้อผิดพลาดในการอัปเดต",
            });
          }
        } catch (error) {
          console.error("Error completing table order:", error);
          Swal.fire({
            icon: "error",
            title: "เกิดข้อผิดพลาด",
            text: "ไม่สามารถเชื่อมต่อ Server ได้",
          });
        }
      }
    });
  };

  const MySwal = withReactContent(Swal);

  const openQRModal = (tableSummary) => {
    const payload = generatePayload("", {  //ใส่หมายเลขพร้อมเพย์
      amount: tableSummary.totalAmount,
    });

    MySwal.fire({
      title: `ชำระเงินโต๊ะ/ออเดอร์ ${tableSummary.tablenum}`,
      html: (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <p>สแกน QR พร้อมเพย์เพื่อชำระเงิน</p>
          <QRCodeCanvas value={payload} size={250} />
          <button
            className="btn btn-success mt-3"
            onClick={() =>
              handlePaymentAndComplete(tableSummary.tablenum, tableSummary)
            }
          >
            ชำระเรียบร้อย
          </button>
        </div>
      ),
      showConfirmButton: false,
    });
  };

  const handleClearFilters = () => {
    setFilterTableNum("");
    setFilterListOrder(null);
    setStartDate("");
    setEndDate("");
  };

  const handleClearContent = () => {
    // ถ้าเป็น Takeaway ให้ล้างแค่รายการ
    setListorder(null);
    setTablenum("");
  };

  const handleClearContentGuest = () => {
    setListorder(null);
    setTakeawayInput("");
  };

  useEffect(() => {
    getListorder();
    fetchMenuData();
    if (!ROLE && guestTablenum) {
      setIsGuest(true);
      // 📝 ถ้าเป็น Guest ให้ตั้งค่า tablenum อัตโนมัติจาก localStorage
      setTablenum(guestTablenum);
    } else {
      setIsGuest(false);
    }
  }, []);

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    // Priority 1: Completed status moves to the bottom
    if (a.status === "completed" && b.status !== "completed") return 1;
    if (a.status !== "completed" && b.status === "completed") return -1;

    // Priority 2: Group by tablenum (A > Z / 1 > 9)
    return String(a.tablenum).localeCompare(String(b.tablenum));
  });

  // 2. คำนวณตารางที่ต้องชำระเงิน (ใช้สำหรับ Alert box ด้านบน)
  // Alert box จะแสดงโต๊ะที่มีสถานะไม่เป็น 'completed'
  const incompleteOrders = orders.filter(
    (order) => order.status !== "completed",
  );

  const tablesToPayMap = incompleteOrders.reduce((acc, order) => {
    const tableKey = order.tablenum;
    if (!acc[tableKey]) {
      acc[tableKey] = {
        tablenum: tableKey,
        totalAmount: 0,
        items: [],
      };
    }
    const totalPrice = parseFloat(order.total_price) || 0;
    const pricePerUnit = parseFloat(order.price) || 0;

    acc[tableKey].totalAmount += totalPrice;
    acc[tableKey].items.push({
      listorder: order.listorder,
      qty: order.qty,
      price: pricePerUnit,
    });
    return acc;
  }, {});

  const tablesToPay = Object.values(tablesToPayMap);

  useEffect(() => {
    const isDemo = localStorage.getItem("guest_tablenum") === "DEMO";
    if (!isDemo) return;

    // ดัน history 1 ครั้ง
    window.history.pushState(null, "", window.location.href);

    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [navigate]);

  return (
    <>
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
                {isGuest ? "สั่งอาหาร" : "จัดการออเดอร์"}
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
            {isGuest ? "สั่งอาหาร" : "จัดการออเดอร์"}
          </h1>

          {/* ส่วนแสดงตะกร้าสินค้า (Cart Display) */}
          <div className="card-body">
            <div
              className="mt-4 p-3 border rounded shadow-lg bg-light"
              style={{
                borderColor: "#4b3f72",
                fontFamily: "'Kanit', sans-serif",
              }}
            >
              <h3 className="text-primary mb-3">
                รายการอาหาร
                {isTakeaway ? (
                  <span className="text-info">
                    ออเดอร์กลับบ้าน: {takeawayInput}
                  </span>
                ) : (
                  `โต๊ะที่ ${tablenum}`
                )}
                ({cart.length} รายการ)
              </h3>
              {cart.length > 0 ? (
                <>
                  {cart.map((item, index) => (
                    <div
                      key={index}
                      className="d-flex justify-content-between align-items-center border-bottom py-2 text-dark"
                      style={{ fontFamily: "'Kanit', sans-serif" }}
                    >
                      <span
                        className="fw-bold me-3 "
                        style={{ fontSize: "24px" }}
                      >
                        {item.listorder} ({item.qty}x)
                      </span>
                      <div
                        className="d-flex align-items-center gap-2"
                        style={{ fontSize: "24px" }}
                      >
                        <span className="me-3">
                          ฿{item.total_price.toFixed(2)}
                        </span>

                        {/*ปุ่มแก้ไขในตะกร้า */}
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => handleEdit(item, index)} // ส่ง item และ index ไป
                        >
                          <i
                            className="fas fa-edit"
                            style={{ fontSize: "30px" }}
                          ></i>
                        </button>
                        {/* ปุ่มลบในตะกร้า */}
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() =>
                            setCart(cart.filter((_, i) => i !== index))
                          }
                        >
                          <i
                            className="fas fa-trash-alt"
                            style={{ fontSize: "30px" }}
                          ></i>
                        </button>
                      </div>
                    </div>
                  ))}

                  <h4 className="mt-3 pt-2 border-top fw-bold text-success">
                    รวมทั้งหมด: ฿
                    {cart
                      .reduce((sum, item) => sum + item.total_price, 0)
                      .toFixed(2)}
                  </h4>

                  <button
                    className="btn btn-warning w-100 mt-3"
                    onClick={handleConfirmOrder}
                    style={{ fontSize: "20px" }}
                    disabled={isEditing} // ปิดปุ่มยืนยันเมื่อกำลังแก้ไขรายการอยู่
                  >
                    ยืนยันการสั่งอาหารทั้งหมด
                  </button>
                </>
              ) : (
                // แสดงข้อความนี้เมื่อตะกร้าว่าง
                <div className="text-center p-3 text-muted">
                  <p className="mb-0">ไม่มีรายการอาหาร</p>
                  <small>
                    โปรดเลือกรายการอาหารและกด "เพิ่มรายการสั่งอาหาร"
                  </small>
                </div>
              )}
            </div>
          </div>

          {/* 🟢 ส่วนที่เพิ่ม: ออเดอร์ที่รอลูกค้าชำระเงิน */}
          {(ROLE === "admin" || ROLE === "user") && tablesToPay.length > 0 && (
            <div className="alert alert-warning shadow-sm mt-3 p-3">
              <h4 className="alert-heading">
                <i className="fas fa-money-bill-wave me-2"></i>{" "}
                ออเดอร์ที่รอลูกค้าชำระเงิน
              </h4>
              <p>
                มีโต๊ะ/ออเดอร์ที่ยังไม่ชำระเงินทั้งหมด:{" "}
                <strong>{tablesToPay.length}</strong> รายการ
              </p>
              <hr />
              <div className="d-flex flex-wrap gap-3 justify-content-start">
                {tablesToPay.map((tableSummary) => (
                  <div
                    key={tableSummary.tablenum}
                    className="card shadow-sm"
                    // เน้นด้วย Border ซ้ายสีส้ม
                    style={{ width: "18rem", borderLeft: "5px solid #ffc107" }}
                  >
                    <div className="card-body p-3">
                      <h5 className="card-title mb-1">
                        {tableSummary.tablenum.startsWith("T") ? (
                          <>
                            <i className="fas fa-shopping-bag me-1 text-info"></i>
                            ออเดอร์กลับบ้าน: {tableSummary.tablenum}
                          </>
                        ) : (
                          <>
                            <i className="fas fa-utensils me-1 text-info"></i>
                            โต๊ะที่ {tableSummary.tablenum}
                          </>
                        )}
                      </h5>
                      {/* แสดงยอดรวม */}
                      <p className="card-text fw-bold text-success display-6 mb-2 mt-2 border-bottom pb-1">
                        ฿{tableSummary.totalAmount.toFixed(2)}
                      </p>

                      <h6 className="card-subtitle mb-2 text-muted">
                        รายการ ({tableSummary.items.length} ชิ้น):
                      </h6>

                      {/* แสดงรายการอาหาร */}
                      <ul
                        className="list-group list-group-flush mb-3 overflow-auto"
                        style={{ maxHeight: "150px" }}
                      >
                        {tableSummary.items.map((item, itemIndex) => (
                          <li
                            key={itemIndex}
                            className="list-group-item p-1 d-flex justify-content-between"
                            style={{ fontSize: "14px", border: "none" }}
                          >
                            <span>{item.listorder}</span>
                            <span className="fw-bold text-end">
                              {item.qty} x ฿{item.price.toFixed(2)}
                            </span>
                          </li>
                        ))}
                      </ul>

                      <button
                        className="btn btn-primary w-100"
                        onClick={() =>
                          handlePaymentAndComplete(
                            tableSummary.tablenum,
                            tableSummary,
                          )
                        }
                      >
                        <i className="fas fa-money-bill-wave me-1"></i>
                        รับชำระเงิน
                      </button>
                      <button
                        className="btn btn-outline-info w-100 mt-2"
                        onClick={() => openQRModal(tableSummary)}
                      >
                        <i className="fas fa-qrcode me-1"></i>
                        ชำระด้วย QR พร้อมเพย์
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/*  ส่วน body ของ card  */}
          <div
            className="card-body mt-4"
            style={{ fontFamily: "'Kanit', sans-serif" }}
          >
            <div
              className="card p-4 mb-4 shadow"
              style={{
                borderRadius: "20px",
                background: "linear-gradient(135deg, #ffffff 0%, #f7f7f7 100%)",
              }}
            >
              <div
                className={`card-header d-flex justify-content-between align-items-center px-4 py-3
              ${isEditing ? "bg-warning" : "bg-secondary"} text-white`}
                style={{
                  borderRadius: "10px",
                  fontFamily: "'Kanit', sans-serif",
                }}
              >
                {/* ซ้าย : หัวข้อ */}
                <div className="d-flex align-items-center gap-2">
                  <img
                    src={isEditing ? editIcon : AddIcon}
                    alt="icon"
                    style={{ height: "22px", width: "22px" }}
                  />

                  <h3 className="m-0 fw-bold">
                    {isEditing ? "แก้ไขรายการอาหาร" : "สั่งอาหาร"}
                  </h3>

                  {/* Badge สถานะ */}
                  {isEditing && (
                    <span
                      className={`badge ms-2 ${
                        cartIndexToEdit !== null ? "bg-dark" : "bg-danger"
                      }`}
                      style={{ fontSize: "14px" }}
                    >
                      {cartIndexToEdit !== null ? "ในตะกร้า" : "ในออเดอร์"}
                    </span>
                  )}
                </div>

                {/* ขวา : Switch Takeaway */}
                {!isEditing && !isGuest && (
                  <div className="d-flex align-items-center gap-2">
                    <span className="fw-semibold">Takeaway</span>
                    <div className="form-check form-switch m-0">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="takeawaySwitch"
                        checked={isTakeaway}
                        onChange={handleTakeawayToggle}
                        style={{ width: "3em", height: "1.5em" }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* ฟอร์มเพิ่ม/แก้ไข */}
              <div className="order-section my-2">
                {/* === ส่วนกรอกข้อมูลออเดอร์ === */}
                <div className="row g-4 align-items-end">
                  {/* โต๊ะ / รหัสกลับบ้าน */}
                  <div className="col-md-3">
                    <label className="form-label">
                      {isTakeaway ? "รหัสออเดอร์กลับบ้าน" : "โต๊ะที่"}
                    </label>
                    <input
                      type="text"
                      className="form-control form-control-lg"
                      placeholder={isTakeaway ? "เช่น T001" : "โต๊ะที่"}
                      value={isTakeaway ? takeawayInput : tablenum}
                      onChange={(e) =>
                        isTakeaway
                          ? setTakeawayInput(e.target.value.toUpperCase())
                          : setTablenum(e.target.value.toUpperCase())
                      }
                      disabled={
                        (isGuest && !isTakeaway) || (isTakeaway && !isEditing)
                      }
                    />
                  </div>

                  {/* จำนวน */}
                  <div className="col-md-2">
                    <label className="form-label">จำนวน</label>
                    <input
                      type="number"
                      className="form-control form-control-lg"
                      value={qty}
                      min="1"
                      onChange={(e) => setQty(e.target.value)}
                    />
                  </div>

                  {/* ปุ่มหลัก */}
                  <div className="col-md-5 d-flex gap-3">
                    {isEditing ? (
                      <>
                        <button
                          className="btn btn-warning btn-lg flex-fill"
                          onClick={
                            cartIndexToEdit !== null
                              ? handleUpdateCartItem
                              : handleUpdateOrder
                          }
                        >
                          แก้ไขรายการ
                        </button>

                        <button
                          className="btn btn-outline-secondary btn-lg flex-fill"
                          onClick={handleCancelEdit}
                        >
                          ยกเลิก
                        </button>
                      </>
                    ) : (
                      <button
                        className="btn btn-success btn-lg flex-fill"
                        onClick={handleAddToCart}
                      >
                        <img
                          src={AddIcon}
                          alt="เพิ่ม"
                          style={{
                            height: "22px",
                            width: "22px",
                            marginRight: "8px",
                            marginBottom: "3px",
                          }}
                        />
                        เพิ่มรายการสั่งอาหาร
                      </button>
                    )}
                  </div>

                  {/* ปุ่มลบ */}
                  <div className="col-md-2">
                    <button
                      className="btn btn-danger btn-lg w-100"
                      onClick={
                        ROLE === "admin" || ROLE === "user"
                          ? handleClearContent
                          : handleClearContentGuest
                      }
                    >
                      ล้างข้อมูล
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div
              className="d-flex align-items-center gap-3 px-3 py-3"
              style={{
                borderTop: "6px solid #0d6efd",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #ffffff 0%, #f7f7f7)",
                // background: "linear-gradient(135deg, #f8f9fa, #ffffff)",
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
            <div
              className="card-body"
              style={{
                borderRadius: "20px",
                boxShadow: "0 4px 10px rgba(0,0,0,0.10)",
              }}
            >
              {/* === ส่วนเมนูอาหาร === */}
              <div
                className="row g-3"
                style={{
                  maxHeight: "500px",
                  overflowY: "auto",
                  paddingRight: "10px",
                  marginTop: "10px",
                }}
              >
                {menuList.map((item) => {
                  const isActive = listorder?.value === item.ordername;

                  return (
                    <div
                      key={item.id}
                      className="col-12 col-md-6 col-lg-4"
                      onClick={() =>
                        setListorder({
                          value: item.ordername,
                          label: item.ordername,
                          price: item.price,
                          image: item.image,
                        })
                      }
                      style={{ cursor: "pointer" }}
                    >
                      <div
                        className={`menu-card h-100 shadow-sm menu-card ${
                          isActive ? "menu-card-active" : ""
                        }`}
                        style={{
                          borderRadius: "18px",
                          overflow: "hidden",
                          transition: "all 0.25s ease",
                        }}
                      >
                        {/* รูปอาหาร */}
                        <div
                          style={{
                            height: "200px",
                            background: "#f8f9fa",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <img
                            src={item.image}
                            alt={item.ordername}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "contain", 
                            }}
                          />
                        </div>

                        {/* ข้อมูล */}
                        <div className="card-body text-center">
                          <h6 className="fw-bold mb-1">{item.ordername}</h6>
                          <p className="text-muted mb-0">{item.price} บาท</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {(ROLE === "admin" || ROLE === "user") && (
              <div
                className="card-body"
                style={{ fontFamily: "'Kanit', sans-serif" }}
              >
                <div
                  className="card p-4 mb-4 shadow"
                  style={{
                    borderRadius: "20px",
                    background:
                      "linear-gradient(135deg, #ffffff 0%, #f7f7f7 100%)",
                  }}
                >
                  {/* ตารางแสดงออเดอร์ */}

                  <div className="table-container">
                    <table
                      className="table table-bordered table-striped mb-0"
                      style={{ fontSize: "18px", borderRadius: "20px" }}
                    >
                      <thead
                        className="table-dark"
                        style={{
                          position: "sticky",
                          zIndex: "1000",
                          top: "0",
                        }}
                      >
                        {/* 1. แถวชื่อคอลัมน์หลัก */}
                        <tr>
                          <th>โต๊ะ/รหัสออเดอร์</th>
                          <th>อาหาร</th>
                          <th>จำนวน</th>
                          <th>ราคา/หน่วย</th>
                          <th>ราคารวม</th>
                          <th>วันที่/เวลา</th>
                          <th>จัดการ</th>
                        </tr>

                        <tr className="bg-light">
                          {/* 1. Filter: โต๊ะที่ (ใช้ 1 คอลัมน์) */}
                          <th className="p-1" style={{ width: "100px" }}>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              placeholder="ค้นหาโต๊ะ/รหัส"
                              value={filterTableNum}
                              onChange={(e) =>
                                setFilterTableNum(e.target.value)
                              }
                              style={{
                                fontSize: "16px",
                                height: "38px",
                                fontWeight: "400",
                              }}
                            />
                          </th>

                          {/* 2. Filter: อาหาร (ใช้ 1 คอลัมน์) */}
                          <th className="p-1 text-dark">
                            <Select
                              options={menuOptions}
                              value={filterListOrder}
                              isClearable={true}
                              onChange={(selectedOption) =>
                                setFilterListOrder(selectedOption)
                              }
                              placeholder="ค้นหาอาหาร"
                              styles={{
                                control: (base) => ({
                                  ...base,
                                  fontSize: "16px",
                                  width: "100%",
                                  fontWeight: "400",
                                }),
                                menu: (base) => ({
                                  ...base,
                                  zIndex: 2000,
                                  fontWeight: "400",
                                }),
                                menuList: (base) => ({
                                  ...base,
                                  maxHeight: "300px",
                                  fontSize: "16px",
                                  overflowY: "auto",
                                }),
                              }}
                            />
                          </th>

                          {/* 3. คอลัมน์ว่าง (จำนวน, ราคา/หน่วย, ราคารวม) - ใช้ colSpan="3" */}
                          <th className="p-1" colSpan="3">
                            {/* ไม่มี Input filter ในคอลัมน์เหล่านี้ */}
                            <span
                              className="text-muted"
                              style={{ fontSize: "16px" }}
                            >
                              แสดง {filteredOrders?.length || 0} รายการ
                            </span>
                          </th>

                          {/* 4. Filter: วันที่/เวลา (ใช้ 1 คอลัมน์) */}
                          <th className="p-1">
                            <div className="row g-1 align-items-center">
                              <div className="col-5">
                                <input
                                  type="date"
                                  className="form-control form-control-sm"
                                  value={startDate}
                                  onChange={(e) => setStartDate(e.target.value)}
                                  style={{ fontSize: "16px", height: "38px" }}
                                  title="จากวันที่"
                                />
                              </div>
                              <div className="col-2 text-center">
                                <label className="m-0">ถึง</label>
                              </div>
                              <div className="col-5">
                                <input
                                  type="date"
                                  className="form-control form-control-sm"
                                  value={endDate}
                                  onChange={(e) => setEndDate(e.target.value)}
                                  style={{ fontSize: "16px", height: "38px" }}
                                  title="ถึงวันที่"
                                />
                              </div>
                            </div>
                          </th>

                          {/* 5. Filter: จัดการ (ใช้ 1 คอลัมน์) */}
                          <th className="p-1">
                            <div
                              className="d-flex align-items-center justify-content-center"
                              style={{ height: "100%" }} // ทำให้ปุ่มอยู่ตรงกลางแนวตั้ง
                            >
                              <button
                                className="btn btn-sm btn-danger w-100"
                                onClick={handleClearFilters}
                                style={{
                                  fontSize: "16px",
                                  padding: "4px 8px",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                ล้างตัวกรอง
                              </button>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedOrders && sortedOrders.length > 0 ? (
                          sortedOrders.map((order) => {
                            // Status class
                            const tableStatusClass =
                              order.status === "completed"
                                ? "table-success"
                                : order.status === "done"
                                  ? "table-warning" // Highlight 'done' status
                                  : "";

                            const isDoneOrCompleted =
                              order.status === "done" ||
                              order.status === "completed";

                            return (
                              <tr key={order.id} className={tableStatusClass}>
                                <td>
                                  <span
                                    className={
                                      order.tablenum.startsWith("T") ||
                                      order.tablenum.includes("-")
                                        ? "fw-bold text-primary"
                                        : ""
                                    }
                                  >
                                    {order.tablenum}
                                  </span>
                                </td>
                                <td>{order.listorder}</td>
                                <td>{order.qty}</td>
                                <td>{order.price || "N/A"}</td>
                                <td>{order.total_price || 0}</td>
                                <td>
                                  {order.update_at
                                    ? new Date(order.update_at).toLocaleString(
                                        "th-TH",
                                        {
                                          year: "numeric",
                                          month: "2-digit",
                                          day: "2-digit",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                          second: "2-digit",
                                        },
                                      )
                                    : ""}
                                </td>
                                <td>
                                  {order.status !== "completed" ? (
                                    <div className="d-flex gap-2">
                                      {/* ปุ่มเสร็จสิ้น (เปลี่ยนสถานะเป็น 'done') */}
                                      {order.status !== "done" && (
                                        <button
                                          className="btn btn-warning flex-fill"
                                          onClick={() => handleDone(order.id)} // Call handleDone
                                          disabled={isEditing} // ควรปิดเมื่อกำลังแก้ไข
                                        >
                                          เสร็จสิ้น
                                        </button>
                                      )}

                                      {/* ปุ่มแก้ไข */}
                                      <button
                                        className="btn btn-primary flex-fill"
                                        onClick={() => handleEdit(order)}
                                        disabled={isDoneOrCompleted} // Disable if 'done' or 'completed'
                                      >
                                        แก้ไข
                                      </button>

                                      <button
                                        className="btn btn-danger flex-fill"
                                        onClick={() => handleDelete(order.id)}
                                        disabled={isDoneOrCompleted} // Disable if 'done' or 'completed'
                                      >
                                        ลบ
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-success fw-bold d-flex justify-content-center align-items-center">
                                      เสร็จสิ้นแล้ว
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            {/* ปรับ colSpan เป็น 7 ตามจำนวนคอลัมน์รวม */}
                            <td colSpan="7" className="text-center">
                              {orders.length > 0
                                ? "ไม่พบออเดอร์ที่ตรงตามเงื่อนไข"
                                : "ไม่มีออเดอร์"}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
