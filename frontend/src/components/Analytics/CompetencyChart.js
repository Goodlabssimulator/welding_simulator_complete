import React, { useRef, useEffect } from 'react';

const LEVEL_COLORS = {
  competent: '#10b981',
  developing: '#f59e0b',
  not_yet_competent: '#ef4444',
};

export default function CompetencyChart({ competencies }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!competencies || competencies.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const barHeight = 24;
    const gap = 8;
    const padding = { left: 120, right: 50, top: 10, bottom: 10 };
    const chartW = width - padding.left - padding.right;

    competencies.forEach((c, i) => {
      const y = padding.top + i * (barHeight + gap);
      const color = LEVEL_COLORS[c.level] || '#64748b';

      // Label
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(c.code, padding.left - 10, y + barHeight * 0.7);

      // Background bar
      ctx.fillStyle = '#2a2a3e';
      ctx.beginPath();
      ctx.roundRect(padding.left, y, chartW, barHeight, 4);
      ctx.fill();

      // Value bar
      const barW = (c.score / 100) * chartW;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(padding.left, y, barW, barHeight, 4);
      ctx.fill();

      // Score text
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${c.score}`, padding.left + barW + 6, y + barHeight * 0.7);
    });
  }, [competencies]);

  const totalH = competencies ? competencies.length * 32 + 20 : 220;

  return (
    <canvas
      ref={canvasRef}
      className="competency-chart-canvas"
      style={{ width: '100%', height: totalH }}
    />
  );
}
