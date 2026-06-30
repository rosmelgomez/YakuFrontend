"use client";

import { useState, useEffect, useRef } from 'react';

type CountdownTimerProps = {
  recolectorActivo: boolean;
  onRefresh: () => void;
  refreshSeconds?: number;
};

export default function CountdownTimer({
  recolectorActivo,
  onRefresh,
  refreshSeconds = 60
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState(refreshSeconds);
  const timeLeftRef = useRef(refreshSeconds);

  useEffect(() => {
    if (!recolectorActivo) {
      setTimeLeft(refreshSeconds);
      timeLeftRef.current = refreshSeconds;
      return;
    }

    const interval = setInterval(() => {
      if (timeLeftRef.current <= 1) {
        timeLeftRef.current = refreshSeconds;
        setTimeLeft(refreshSeconds);
        onRefresh();
      } else {
        timeLeftRef.current -= 1;
        setTimeLeft(timeLeftRef.current);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [recolectorActivo, onRefresh, refreshSeconds]);

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return <>{recolectorActivo ? formatTime(timeLeft) : 'Pausado'}</>;
}
