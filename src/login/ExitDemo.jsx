// ExitDemo.jsx
import { useEffect } from "react";

export default function ExitDemo() {
  useEffect(() => {
    localStorage.clear();
    window.location.href = "/login";
  }, []);

  return null;
};
