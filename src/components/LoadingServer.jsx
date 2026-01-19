import "./LoadingOverlay.css";

export default function LoadingServer() {
  return (
    <div className="loading-overlay">
      <div className="spinner"></div>
      <p style={{ marginTop: "12px", fontSize: "16px" }}>
        กำลังเชื่อมต่อระบบ...
      </p>
      <small style={{ opacity: 0.8 }}>
        ครั้งแรกอาจใช้เวลา 10-30 วินาที 
      </small>
    </div>
  );
}