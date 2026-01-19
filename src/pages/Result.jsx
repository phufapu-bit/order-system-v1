import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import axios from "axios";
import "../App.css";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { API_URL } from "../config/api";

export default function Resultpage() {
  const [salesData, setSalesData] = useState([]);
  const [filteredSalesData, setFilteredSalesData] = useState([]);
  const [guestOrders, setGuestOrders] = useState([]);
  const [todayOrders, setTodayOrders] = useState(0);
  const [totalSales, setTotalSales] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [todaySalesAmount, setTodaySalesAmount] = useState(0);
  const [chartType, setChartType] = useState("line");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const isAdminOrUser = localStorage.getItem("role");
  const guestTablenum = localStorage.getItem("guest_tablenum");

  // ฟังก์ชันจัดรูปแบบวันที่สำหรับแกน X และ Tooltip (เหมือนเดิม)
  const dateFormatter = (tickItem) => {
    const date = new Date(tickItem);
    if (isNaN(date.getTime())) return tickItem;
    // รูปแบบ วัน/เดือน (เช่น 15/10)
    // 2-digit
    return date.toLocaleDateString("th-TH", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const filterSalesData = (data, start, end) => {
    if (!start || !end) {
      return data; // ถ้าไม่มีการระบุช่วงวันที่ ให้แสดงทั้งหมด
    }

    const startTime = new Date(start).setHours(0, 0, 0, 0);
    // เพิ่ม 1 วันใน endDate เพื่อให้รวมวันที่สิ้นสุด
    const endObj = new Date(end);
    endObj.setDate(endObj.getDate() + 1);
    const endTime = endObj.setHours(0, 0, 0, 0);

    return data.filter((item) => {
      // item.update_at คือวันที่ในรูปแบบ 'YYYY-MM-DD' จาก backend
      const itemDate = new Date(item.update_at).setHours(0, 0, 0, 0);
      if (isNaN(itemDate)) return false;

      // เปรียบเทียบวันที่
      return itemDate >= startTime && itemDate < endTime;
    });
  };

  const fetchSalesSummary = async () => {
    try {
      const res = await axios.post(`${API_URL}/getSalesSummary`);
      if (res.data.success) {
        setTotalSales(res.data.totalSales || 0);
        setTodayOrders(res.data.todayOrders || 0);
        setTodaySalesAmount(res.data.todaySalesAmount || 0);
      }
    } catch (error) {
      console.error("Error fetching sales summary:", error);
    }
  };

  const fetchPendingCount = async () => {
    try {
      const res = await axios.post(`${API_URL}/getPendingOrderCount`);
      if (res.data.success) {
        setPendingCount(res.data.pendingCount || 0);
      }
    } catch (error) {
      console.error("Error fetching pending count:", error);
    }
  };

  const fetchSalesData = async () => {
    try {
      const res = await axios.post(`${API_URL}/getDailySales`);
      if (res.data.success) {
        setSalesData(res.data.salesData);
        setFilteredSalesData(
          filterSalesData(res.data.salesData, startDate, endDate),
        );
      }
    } catch (error) {
      console.error("Error fetching sales data:", error);
      setSalesData([]);
      setFilteredSalesData([]);
    }
  };

  const fetchGuestOrder = async (tablenum) => {
    try {
      const res = await axios.get(
        `${API_URL}/guestOrders?tablenum=${tablenum}`,
      );
      if (res.data.success) {
        setGuestOrders(res.data.data || res.data.orders || []);
      }
    } catch (error) {
      console.error("Error fetching guest orders:", error);
      localStorage.removeItem("guest_tablenum");
    }
  };

  //  2. ปรับฟังก์ชันสำหรับดาวน์โหลด Excel เพื่อใช้การกรองวันที่
  const exportToExcel = () => {
    let dataToExport = filteredSalesData;

    if (dataToExport.length === 0 && (startDate || endDate)) {
      alert("ไม่พบข้อมูลยอดขายในช่วงวันที่ที่เลือก หรือข้อมูลไม่สมบูรณ์");
      return;
    }

    if (dataToExport.length === 0 && salesData.length > 0) {
      dataToExport = salesData;
    } else if (dataToExport.length === 0 && salesData.length === 0) {
      alert("ไม่พบข้อมูลยอดขายใดๆ ที่จะส่งออก");
      return;
    }

    const dataForExport = dataToExport.map((item) => ({
      วันที่: new Date(item.update_at).toLocaleDateString("th-TH"),
      "ยอดขาย (บาท)": item.sales,
    }));

    const ws = XLSX.utils.json_to_sheet(dataForExport);
    const wb = { Sheets: { ยอดขายรายวัน: ws }, SheetNames: ["ยอดขายรายวัน"] };
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const data = new Blob([excelBuffer], { type: "application/octet-stream" });

    // ตั้งชื่อไฟล์ตามช่วงวันที่หากมีการกรอง
    let filename = `ยอดขายรายวัน_${new Date().toLocaleDateString(
      "th-TH",
    )}.xlsx`;
    if (startDate && endDate) {
      filename = `ยอดขาย_${startDate}_ถึง_${endDate}.xlsx`;
    }

    saveAs(data, filename);
  };

  useEffect(() => {
    if (isAdminOrUser) {
      fetchSalesSummary();
      fetchPendingCount();
      fetchSalesData();

      const interval = setInterval(() => {
        fetchSalesSummary();
        fetchPendingCount();
        fetchSalesData();
      }, 10000);
      return () => clearInterval(interval);
    } else if (guestTablenum) {
      fetchGuestOrder(guestTablenum);

      const interval = setInterval(() => {
        fetchGuestOrder(guestTablenum);
      }, 5000);
      return () => clearInterval(interval);
    }
    return () => {};
  }, [isAdminOrUser, guestTablenum]);

  useEffect(() => {
    if (isAdminOrUser && salesData.length > 0) {
      setFilteredSalesData(filterSalesData(salesData, startDate, endDate));
    } else if (isAdminOrUser && salesData.length === 0) {
      setFilteredSalesData([]);
    }
  }, [startDate, endDate, salesData, isAdminOrUser]);

  const renderChart = () => {
    const dataForChart = filteredSalesData;

    // ถ้าไม่มีข้อมูลจากการกรองหรือข้อมูลทั้งหมด ให้แสดงข้อความ
    if (dataForChart.length === 0) {
      return (
        <div className="text-center p-5">
          <p className="h4 text-muted">
            {!startDate || !endDate
              ? "กรุณาเลือกช่วงวันที่เพื่อแสดงข้อมูล"
              : "ไม่พบข้อมูลยอดขายในช่วงวันที่ที่เลือก"}
          </p>
          <small className="text-muted">โปรดตรวจสอบการตั้งค่าวันที่</small>
        </div>
      );
    }
    const isDateMode = salesData[0] && salesData[0].update_at;

    const xAxisProps = {
      dataKey: isDateMode ? "update_at" : "day",
      tickFormatter: isDateMode ? dateFormatter : undefined,
      tick: { fill: "#555", fontSize: 16, fontWeight: 500 },
      axisLine: { stroke: "#ccc" },
      interval: "preserveStartEnd",
    };

    const tooltipProps = {
      labelFormatter: isDateMode ? dateFormatter : undefined,
      contentStyle: {
        backgroundColor: "#fff",
        borderRadius: "8px",
        borderColor: "#ccc",
        fontFamily: "sans-serif",
        letterSpacing: "0.5px",
      },
      itemStyle: { color: "#1f3b6f", fontWeight: 500 },
      labelStyle: { fontWeight: "bold", fontSize: "20px" },
    };

    switch (chartType) {
      case "line":
        return (
          <LineChart
            data={dataForChart}
            margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
          >
            <CartesianGrid stroke="#e0e0e0" strokeDasharray="4 4" />
            <XAxis {...xAxisProps} />
            <YAxis
              tick={{ fill: "#555", fontSize: 16, fontWeight: 500 }}
              axisLine={{ stroke: "#ccc" }}
            />
            <Tooltip {...tooltipProps} />
            <Legend
              verticalAlign="top"
              height={30}
              wrapperStyle={{
                fontSize: "16px",
                color: "#1f3b6f",
                fontWeight: 600,
              }}
            />
            <Line
              type="monotone"
              dataKey="sales"
              stroke="url(#colorLine)"
              strokeWidth={5}
              dot={{ r: 6, fill: "#1f3b6f", stroke: "#fff", strokeWidth: 1 }}
              activeDot={{ r: 8 }}
            />
            <defs>
              <linearGradient id="colorLine" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#1f3b6f" />
                <stop offset="100%" stopColor="#f0c987" />
              </linearGradient>
            </defs>
          </LineChart>
        );
      case "bar":
        return (
          <BarChart
            data={dataForChart}
            margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
          >
            <CartesianGrid stroke="#e0e0e0" strokeDasharray="4 4" />
            <XAxis {...xAxisProps} />
            <YAxis
              tick={{ fill: "#555", fontSize: 18, fontWeight: 500 }}
              axisLine={{ stroke: "#ccc" }}
            />
            <Tooltip {...tooltipProps} />
            <Legend
              verticalAlign="top"
              height={30}
              wrapperStyle={{
                fontSize: "16px",
                color: "#1f3b6f",
                fontWeight: 600,
              }}
            />
            <Bar dataKey="sales" fill="#1f3b6f" />
          </BarChart>
        );
      case "area":
        return (
          <AreaChart
            data={dataForChart}
            margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
          >
            <CartesianGrid stroke="#e0e0e0" strokeDasharray="4 4" />
            <XAxis {...xAxisProps} />
            <YAxis
              tick={{ fill: "#555", fontSize: 18, fontWeight: 500 }}
              axisLine={{ stroke: "#ccc" }}
            />
            <Tooltip {...tooltipProps} />
            <Legend
              verticalAlign="top"
              height={30}
              wrapperStyle={{
                fontSize: "16px",
                color: "#1f3b6f",
                fontWeight: 600,
              }}
            />
            <Area
              type="monotone"
              dataKey="sales"
              stroke="#1f3b6f"
              fill="url(#colorArea)"
            />
            <defs>
              <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1f3b6f" stopOpacity={0.6} />
                <stop offset="100%" stopColor="#f0c987" stopOpacity={0.2} />
              </linearGradient>
            </defs>
          </AreaChart>
        );
      default:
        return null;
    }
  };

  // function แปลงสถานะจากอังกฤษเป็นไทย
  const getThaiStatus = (status) => {
    switch (status?.toLowerCase()) {
      case "pending":
        return "กำลังทำอาหาร";
      case "done":
        return "เสร็จสิ้น";
      default:
        return status;
    }
  };

  // ** Logic การแสดงผลหลัก **
  if (!isAdminOrUser && guestTablenum) {
    // (Guest Status Logic: เหมือนเดิม)
    return (
      <div
        className="container-fluid py-4"
        style={{ fontFamily: "'Kanit', sans-serif" }}
      >
        <h1
          className="header-title text-center mb-5"
          style={{
            background: "linear-gradient(90deg, #2e5d4f, #a8d5ba)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            fontWeight: 700,
          }}
        >
          สถานะออเดอร์โต๊ะที่ {guestTablenum}
        </h1>

        {guestOrders.length > 0 ? (
          guestOrders.map((order) => (
            <div
              key={order.id}
              className="card p-3 mb-3 shadow-sm"
              style={{
                borderRadius: "12px",
                borderLeft:
                  order.status?.toLowerCase() === "pending"
                    ? "5px solid #ff7f27"
                    : "5px solid #2e5d4f",
              }}
            >
              <div className="d-flex justify-content-between align-items-center">
                <h4 style={{ margin: 0 }}>
                  {order.listorder} ({order.qty}x)
                </h4>
                <span
                  style={{
                    fontSize: "1.2rem",
                    fontWeight: 700,
                    color:
                      order.status?.toLowerCase() === "pending"
                        ? "#ff7f27"
                        : "#2e5d4f",
                  }}
                >
                  {getThaiStatus(order.status)}
                </span>
              </div>
              <p className="text-muted mb-0">
                ราคารวม: ฿{Number(order.total_price).toFixed(2)}
              </p>
              <p className="text-muted mb-0" style={{ fontSize: "0.8rem" }}>
                อัปเดตล่าสุด :
                {new Date(order.update_at).toLocaleString("th-TH", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </p>
            </div>
          ))
        ) : (
          <div className="text-center p-5">
            <p className="h4 text-muted">ไม่พบออเดอร์ที่กำลังดำเนินการ</p>
            <p className="text-muted">โปรดรอสักครู่ หรือทำการสั่งซื้อใหม่</p>
            <button
              className="btn mt-3"
              style={{ backgroundColor: "#ff7f27", color: "white" }}
              onClick={() => (window.location.href = "/Orderpage")}
            >
              สั่งอาหารใหม่
            </button>
          </div>
        )}
      </div>
    );
  }

  // 2. ถ้าเป็น Admin/User ให้แสดง Admin Dashboard
  return (
    <div className="container-fluid py-4">
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
        สรุปยอดรวม (Admin Dashboard)
      </h1>

      <div className="row mb-4">
        <div className="col-md-3 mb-3">
          <div
            className="card p-4 shadow-sm text-center"
            style={{
              borderRadius: "15px",
              background: "linear-gradient(135deg, #FFF0E6, #ffffff)",
              borderLeft: "5px solid #ff7f27",
            }}
          >
            <h3
              style={{
                color: "#ff7f27",
                fontWeight: 700,
                fontFamily: "'Kanit', sans-serif",
                letterSpacing: "0.5px",
              }}
            >
              ออเดอร์วันนี้
            </h3>
            <p
              style={{
                fontSize: "2.5rem",
                fontWeight: 700,
                color: "#ff7f27",
                margin: 0,
              }}
            >
              {todayOrders}
            </p>
          </div>
        </div>

        <div className="col-md-3 mb-3">
          <div
            className="card p-4 shadow-sm text-center"
            style={{
              borderRadius: "15px",
              background: "linear-gradient(135deg, #ECF9E3, #ffffff)",
              borderLeft: "5px solid #2e5d4f",
            }}
          >
            <h3
              style={{
                color: "#2e5d4f",
                fontWeight: 700,
                fontFamily: "'Kanit', sans-serif",
                letterSpacing: "0.5px",
              }}
            >
              ยอดขายวันนี้
            </h3>
            <p
              style={{
                fontSize: "2.5rem",
                fontWeight: 700,
                color: "#2e5d4f",
                margin: 0,
              }}
            >
              ฿
              {Number(todaySalesAmount).toLocaleString("th-TH", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
        </div>

        <div className="col-md-3 mb-3">
          <div
            className="card p-4 shadow-sm text-center"
            style={{
              borderRadius: "15px",
              background: "linear-gradient(135deg, #EBE6FF, #ffffff)",
              borderLeft: "5px solid #4b3f72",
            }}
          >
            <h3
              style={{
                color: "#4b3f72",
                fontWeight: 700,
                fontFamily: "'Kanit', sans-serif",
                letterSpacing: "0.5px",
              }}
            >
              ยอดขายรวมทั้งหมด
            </h3>
            <p
              style={{
                fontSize: "2.5rem",
                fontWeight: 700,
                color: "#4b3f72",
                margin: 0,
              }}
            >
              ฿
              {Number(totalSales).toLocaleString("th-TH", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
        </div>

        <div className="col-md-3 mb-3">
          <div
            className="card p-4 shadow-sm text-center"
            style={{
              borderRadius: "15px",
              background: "linear-gradient(135deg, #E6F7FF, #ffffff)",
              borderLeft: "5px solid #3b8ca7",
            }}
          >
            <h3
              style={{
                color: "#3b8ca7",
                fontWeight: 700,
                fontFamily: "'Kanit', sans-serif",
                letterSpacing: "0.5px",
              }}
            >
              กำลังทำอาหาร
            </h3>
            <p
              style={{
                fontSize: "2.5rem",
                fontWeight: 700,
                color: "#3b8ca7",
                margin: 0,
              }}
            >
              {pendingCount}
            </p>
          </div>
        </div>
      </div>

      {/* 3. ส่วนการกรองวันที่และ Chart selector ที่แก้ไข */}
      <div className="row mb-3 align-items-end">
        {/* ตัวเลือกวันที่ */}
        <div className="col-md-6 d-flex align-items-center mb-2 mb-md-0 text-dark">
          <label
            style={{
              marginRight: "10px",
              fontWeight: 600,
              fontFamily: "'Kanit', sans-serif",
              fontSize: "1rem",
            }}
          >
            วันที่เริ่มต้น:
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{
              width: "140px",
              height: "40px",
              borderRadius: "10px",
              padding: "0 10px",
              marginRight: "5px",
            }}
          />
          <span
            style={{
              margin: "0 5px",
              fontWeight: 500,
              fontFamily: "'Kanit', sans-serif",
            }}
          >
            ถึง
          </span>
          <label
            style={{
              marginRight: "10px",
              fontWeight: 600,
              fontFamily: "'Kanit', sans-serif",
              fontSize: "1rem",
            }}
          >
            วันที่สิ้นสุด:
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{
              width: "140px",
              height: "40px",
              borderRadius: "10px",
              padding: "0 10px",
            }}
          />
        </div>

        {/* ตัวเลือกกราฟและปุ่ม Excel */}
        <div className="col-md-6 d-flex justify-content-end align-items-center">
          <label
            style={{
              marginRight: "10px",
              fontWeight: 600,
              color: "black",
              fontFamily: "'Kanit', sans-serif",
              fontSize: "1.2rem",
              letterSpacing: "0.5px",
            }}
          >
            เลือกชนิดกราฟ:
          </label>
          <select
            value={chartType}
            style={{
              width: "110px",
              height: "40px",
              borderRadius: "10px",
              fontFamily: "'Kanit', sans-serif",
              letterSpacing: "0.5px",
              marginRight: "20px",
            }}
            onChange={(e) => setChartType(e.target.value)}
          >
            <option value="line">Line Chart</option>
            <option value="bar">Bar Chart</option>
            <option value="area">Area Chart</option>
          </select>

          <button
            className="btn btn-success"
            onClick={exportToExcel}
            style={{
              color: "white",
              fontWeight: 600,
              borderRadius: "10px",
              // padding: "8px 15px",
              fontSize: "18px",
              fontFamily: "'Kanit', sans-serif",
            }}
          >
            ดาวน์โหลด Excel
          </button>
        </div>
      </div>

      {/* Sales Chart (เหมือนเดิม) */}
      <div
        className="card p-4 shadow-sm"
        style={{ borderRadius: "16px", backgroundColor: "#fdfcfb" }}
      >
        <h5
          className="text-center mb-4"
          style={{
            fontSize: "2rem",
            fontWeight: 700,
            background: "linear-gradient(90deg, #2e5d4f, #a8d5ba)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            fontFamily: "'Kanit', sans-serif",
            letterSpacing: "0.5px",
          }}
        >
          ยอดขายรายวัน
        </h5>
        <ResponsiveContainer width="100%" height={350}>
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
