import "./LoadingOverlay.css";

export default function LoadingOverlay() {
  return (
    <div className="loading-overlay">
      <div className="spinner"></div>
      <p>กำลังอัปโหลดรูป...</p>
    </div>
  );
}
