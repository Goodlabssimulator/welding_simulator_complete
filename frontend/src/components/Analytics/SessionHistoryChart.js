import React, { useRef, useEffect } from 'react';

const GRADE_COLORS = {
  distinction: '#10b981',
  credit: '#3b82f6',
  pass: '#f59e0b',
  fail: '#ef4444',
};

export default function SessionHistoryChart({ sessions }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!sessions || sessions.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const padding = { top: 20, right: 20, bottom: 60, left: 45 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Y-axis grid (0, 25, 50, 75, 100)
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#64748b';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      ctx.fillText(`${100 - i * 25}`, padding.left - 6, y + 3);
    }

    // Bars
    const n = sessions.length;
    const gap = n > 30 ? 2 : 6;
    const barW = Math.max(4, (chartW - (n - 1) * gap) / n);

    sessions.forEach((s, i) => {
      const x = padding.left + i * (barW + gap);
      const score = Math.max(0, Math.min(100, Number(s.overall_score) || 0));
      const barH = (score / 100) * chartH;
      const y = padding.top + chartH - barH;

      const color = GRADE_COLORS[s.grade] || '#3b82f6';

      // Bar
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect?.(x, y, barW, barH, [3, 3, 0, 0]);
      if (!ctx.roundRect) {
        // Fallback for older browsers
        ctx.rect(x, y, barW, barH);
      }
      ctx.fill();

      // Score label on top of bar (only if bar is wide enough)
      if (barW > 14) {
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '9px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(score.toFixed(0), x + barW / 2, y - 4);
      }
    });

    // X-axis labels (session numbers, or first/last dates)
    if (sessions.length > 0) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'center';

      const showCount = Math.min(6, sessions.length);
      const step = Math.max(1, Math.floor(sessions.length / showCount));
      for (let i = 0; i < sessions.length; i += step) {
        const x = padding.left + i * (barW + gap) + barW / 2;
        const label = `#${i + 1}`;
        ctx.fillText(label, x, height - padding.bottom + 16);
      }
    }

    // Title on x-axis
    ctx.fillStyle = '#64748b';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Session order (oldest → newest)', width / 2, height - 8);

  }, [sessions]);

  if (!sessions || sessions.length === 0) {
    return <p className="chart-empty">No sessions yet.</p>;
  }

  return (
    <canvas
      ref={canvasRef}
      className="session-history-canvas"
      style={{ width: '100%', height: 260 }}
    />
  );
}
