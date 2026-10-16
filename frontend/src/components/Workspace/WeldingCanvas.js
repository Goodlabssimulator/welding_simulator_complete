import React, { useRef, useEffect, useState, useCallback } from 'react';
import useTelemetry from '../../hooks/useTelemetry';
import {
  generateJointLine,
  getBeadVisuals,
  generateSparks,
  calculateDeviation,
} from '../../utils/weldingPhysics';

/**
 * Map our current UI parameter names to the names weldingPhysics expects.
 */
function toPhysicsParams(p = {}) {
  return {
    current: p.current ?? 120,
    voltage: p.voltage ?? 24,
    speed: p.weldingSpeed ?? p.speed ?? 4,
    weldType: p.weldType ?? 'SMAW',
    wireSpeed: p.wireFeedSpeed ?? p.wireSpeed ?? 6,
  };
}

export default function WeldingCanvas({
  isActive,
  parameters,
  jointType,
  onTelemetry,
  onPositionChange,
}) {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const jointLineRef = useRef([]);
  const beadPathRef = useRef([]);
  const sparksRef = useRef([]);
  const [canvasSize, setCanvasSize] = useState({ width: 900, height: 500 });

  const {
    torchPosition: position,
    currentSpeed: speed,
    pathDeviation: deviation,
    isTracking,
    handlers,
  } = useTelemetry(canvasRef, jointLineRef.current);

  // Safe defaults in case position/speed are briefly undefined
  const safePosition = position || { x: 0, y: 0 };
  const safeSpeed = typeof speed === 'number' && Number.isFinite(speed) ? speed : 0;
  const safeDeviation =
    typeof deviation === 'number' && Number.isFinite(deviation) ? deviation : 0;

  // ---- Initialize joint line & reset canvas when joint type changes ----
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    setCanvasSize({ width: rect.width, height: rect.height });
    jointLineRef.current = generateJointLine(
      jointType || 'butt',
      rect.width,
      rect.height
    );
    beadPathRef.current = [];
    sparksRef.current = [];
  }, [jointType]);

  // ---- Notify parent on position/speed/telemetry changes ----
  useEffect(() => {
    if (onPositionChange) {
      onPositionChange({
        x: safePosition.x,
        y: safePosition.y,
        speed: safeSpeed,
        deviation: safeDeviation,
        isTracking,
      });
    }
    if (onTelemetry && isTracking) {
      const dev = calculateDeviation(safePosition, jointLineRef.current);
      onTelemetry({
        x: safePosition.x,
        y: safePosition.y,
        speed: safeSpeed,
        deviation: dev,
        timestamp: Date.now(),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safePosition.x, safePosition.y, safeSpeed, safeDeviation, isTracking]);

  // ---- Generate sparks while actively welding ----
  useEffect(() => {
    if (!isActive || !isTracking) return;
    const interval = setInterval(() => {
      const newSparks = generateSparks(safePosition, parameters);
      sparksRef.current = [...sparksRef.current.slice(-30), ...newSparks];
    }, 50);
    return () => clearInterval(interval);
  }, [isActive, isTracking, safePosition.x, safePosition.y, parameters]);

  // ---- Draw loop ----
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { width, height } = canvasSize;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // ---- Background: metal plate ----
    ctx.fillStyle = '#3a3a4a';
    ctx.fillRect(0, 0, width, height);

    // Plate texture grid
    ctx.strokeStyle = '#454560';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < width; i += 20) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, height);
      ctx.stroke();
    }
    for (let i = 0; i < height; i += 20) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(width, i);
      ctx.stroke();
    }

    // ---- Joint line ----
    const joint = jointLineRef.current;
    if (joint && joint.length > 1) {
      ctx.beginPath();
      ctx.moveTo(joint[0].x, joint[0].y);
      for (let i = 1; i < joint.length; i++) {
        ctx.lineTo(joint[i].x, joint[i].y);
      }
      ctx.strokeStyle = '#1a1a2e';
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.strokeStyle = '#555570';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // =====================================================
    // BEAD: accumulate only while welding; draw always
    // =====================================================

    // [smooth-bead] Accumulate new bead points when actively welding.
    // Interpolate between the last point and the current position so we
    // get a continuous trail even with fast mouse movement.
    if (isActive && isTracking) {
      const path = beadPathRef.current;
      const last = path[path.length - 1];
      const cur = { x: safePosition.x, y: safePosition.y };
      const params = {
        speed: safeSpeed,
        voltage: parameters.voltage ?? 24,
        current: parameters.current ?? 120,
        wireSpeed: parameters.wireFeedSpeed ?? 6,
      };

      if (!last) {
        path.push({ ...cur, ...params });
      } else {
        const dx = cur.x - last.x;
        const dy = cur.y - last.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 0.5) {
          // Insert intermediate points if the jump is large (> 3px)
          const step = 3;
          const steps = dist > step ? Math.ceil(dist / step) : 1;
          for (let s = 1; s <= steps; s++) {
            const t = s / steps;
            path.push({
              x: last.x + dx * t,
              y: last.y + dy * t,
              ...params,
            });
          }
        }
      }

      // Cap memory — don't let it grow unbounded
      if (path.length > 2000) {
        path.splice(0, path.length - 2000);
      }
    }

    // 2) Draw the entire accumulated bead path (independent of tracking state)
    const path = beadPathRef.current;
    if (path.length > 1) {
      for (let i = 1; i < path.length; i++) {
        const prev = path[i - 1];
        const curr = path[i];

        const visuals = getBeadVisuals(
          {
            current: curr.current || 120,
            voltage: curr.voltage || 24,
            speed: curr.speed || 4,
            weldType: parameters.weldType || 'SMAW',
          },
          0
        );

        const widthPx =
          Number.isFinite(visuals.width) && visuals.width > 0
            ? visuals.width
            : 8;
        const colorStr = visuals.color || 'rgb(200, 120, 50)';
        const highlightStr = visuals.highlight || 'rgba(255,220,180,0.5)';

        // Bead body
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(curr.x, curr.y);
        ctx.strokeStyle = colorStr;
        ctx.lineWidth = widthPx;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();

        // Highlight (top reflection)
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y - widthPx * 0.2);
        ctx.lineTo(curr.x, curr.y - widthPx * 0.2);
        ctx.strokeStyle = highlightStr;
        ctx.lineWidth = widthPx * 0.3;
        ctx.stroke();

        // Shadow (bottom)
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y + widthPx * 0.15);
        ctx.lineTo(curr.x, curr.y + widthPx * 0.15);
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = widthPx * 0.2;
        ctx.stroke();
      }
    }

    // ---- Sparks ----
    const now = Date.now();
    sparksRef.current = sparksRef.current.filter((s) => now - s.born < s.life);
    sparksRef.current.forEach((spark) => {
      const age = (now - spark.born) / spark.life;
      const alpha = Math.max(0, 1 - age);
      const size = spark.size * (1 - age * 0.5);
      ctx.beginPath();
      ctx.arc(
        spark.x + spark.vx * age * spark.life * 0.05,
        spark.y + spark.vy * age * spark.life * 0.05 + age * age * 50,
        size,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = `rgba(${spark.r},${spark.g},${spark.b},${alpha})`;
      ctx.fill();
    });

    // ---- Torch indicator ----
    if (isTracking) {
      const gradient = ctx.createRadialGradient(
        safePosition.x,
        safePosition.y,
        0,
        safePosition.x,
        safePosition.y,
        isActive ? 35 : 15
      );
      if (isActive) {
        gradient.addColorStop(0, 'rgba(255, 200, 50, 0.8)');
        gradient.addColorStop(0.3, 'rgba(255, 150, 30, 0.4)');
        gradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
      } else {
        gradient.addColorStop(0, 'rgba(100, 150, 255, 0.5)');
        gradient.addColorStop(1, 'rgba(100, 150, 255, 0)');
      }
      ctx.beginPath();
      ctx.arc(safePosition.x, safePosition.y, isActive ? 35 : 15, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Crosshair
      ctx.strokeStyle = isActive ? '#ffcc00' : '#6496ff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(safePosition.x - 12, safePosition.y);
      ctx.lineTo(safePosition.x + 12, safePosition.y);
      ctx.moveTo(safePosition.x, safePosition.y - 12);
      ctx.lineTo(safePosition.x, safePosition.y + 12);
      ctx.stroke();

      // Nozzle circle
      ctx.beginPath();
      ctx.arc(safePosition.x, safePosition.y, 6, 0, Math.PI * 2);
      ctx.strokeStyle = isActive ? '#ffaa00' : '#4488ff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // ---- HUD: deviation + speed ----
    if (isActive && isTracking && joint && joint.length > 0) {
      const dev = calculateDeviation(safePosition, joint);
      const devColor = dev < 5 ? '#10b981' : dev < 15 ? '#f59e0b' : '#ef4444';
      ctx.fillStyle = devColor;
      ctx.font = '12px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`Dev: ${dev.toFixed(1)}px`, 10, height - 10);

      ctx.fillStyle = '#06b6d4';
      ctx.textAlign = 'right';
      ctx.fillText(`Speed: ${safeSpeed.toFixed(1)} mm/s`, width - 10, height - 10);
    }

    animFrameRef.current = requestAnimationFrame(draw);
  }, [
    canvasSize,
    isActive,
    isTracking,
    safePosition.x,
    safePosition.y,
    safeSpeed,
    parameters,
  ]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(draw);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [draw]);

  return (
    <div className="welding-canvas-wrapper">
      <canvas
        ref={canvasRef}
        className="welding-canvas"
        width={canvasSize.width}
        height={canvasSize.height}
        {...handlers}
      />
    </div>
  );
}
