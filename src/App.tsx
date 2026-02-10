import React, { useState, useEffect } from "react";
import "./App.css";

const App: React.FC = () => {
  const targetDate = new Date("2026-06-12T00:00:00");
  const [dDay, setDDay] = useState<string>("");

  useEffect(() => {
    const calculateDDay = () => {
      const now = new Date();
      const diff = targetDate.getTime() - now.getTime();
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

      if (days === 0) setDDay("D-Day");
      else if (days > 0) setDDay(`D-${days}`);
      else setDDay(`D+${Math.abs(days)}`);
    };

    calculateDDay();
    const timer = setInterval(calculateDDay, 1000 * 60 * 60); // 1시간마다 갱신
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="widget-container">
      <h1 className="dday-text">{dDay}</h1>
    </div>
  );
};

export default App;
