import "./LoadingOverlay.css";

export default function LoadingOverlay() {
  return (
    <div className="loading-overlay">
      <div className="spinner"></div>
      <p>รอสักครู่...</p>
    </div>
  );
}
