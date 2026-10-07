import React, { useRef, useEffect } from 'react';

export default function Gauge({ value, min = 0, max = 100, label, unit = '', size = 120, colorClass = '' }) {
  const canvasRef = useRef(null);
  const clampedValue = Math.min(Math.max(value, min), max);
  const percentage = (clampedValue - min) / (max - min);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2 - 10;
    const startAngle = Math.PI * 0.75;
    const endAngle = Math.PI * 2.25;
  const totalArc = endAngle - startAngle;
    const valueAngle = startAngle + totalArc * percentage;

    // Background arc
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#2a2a3e';
    ctx.lineCap = 'round';
    ctx.stroke();

    // Determine color
    let arcColor = '#f59e0b'; // amber default
    if (percentage >= 0.8) arcColor = '#10b981'; // green
    else if (percentage >= 0.65) arcColor = '#f59e0b'; // amber
    else if (percentage >= 0.5) arcColor = '#3b82f6'; // blue
    else arcColor = '#ef4444'; // red

    if (colorClass === 'speed') arcColor = '#06b6d4';
    if (colorClass === 'voltage') arcColor = '#f59e0b';
    if (colorClass === 'current') arcColor = '#3b82f6';

    // Value arc
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, valueAngle);
    ctx.lineWidth = 8;
    ctx.strokeStyle = arcColor;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Center text
    ctx.fillStyle = '#e2e8f0';
    ctx.font = `bold ${size * 0.2}px 'Inter', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${clampedValue.toFixed(0)}${unit}`, cx, cy - 4);

    // Label
    if (label) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = `${size * 0.1}px 'Inter', sans-serif`;
      ctx.fillText(label, cx, cy + size * 0.18);
    }
  }, [clampedValue, min, max, label, unit, size, colorClass, percentage]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
      className="gauge-canvas"
    />
  );
}
