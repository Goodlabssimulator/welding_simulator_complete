/**
 * WeldingEngine - Core simulation engine
 * Handles physics, bead generation, parameter management, and real-time tracking
 */

class WeldingEngine {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;
    
    // Default welding parameters
    this.params = {
      weldingSpeed: 150,       // mm/min
      electrodeType: 'E6013',  // Electrode designation
      weldingCurrent: 90,      // Amps
      voltage: 22,             // Volts
      workpieceGap: 2,         // mm
      workpieceThickness: 6,   // mm
      weldingPosition: 'flat', // flat, horizontal, vertical, overhead
      jointType: 'butt',       // butt, lap, tee, corner
    };

    // Reference/optimal values per joint/position combination
    this.optimalParams = this._computeOptimalParams();

    // State
    this.isWelding = false;
    this.isComplete = false;
    this.torchPos = { x: 0, y: 0 };
    this.weldPath = [];
    this.beadPoints = [];
    this.sparkParticles = [];
    this.heatPoints = [];
    this.startTime = null;
    this.elapsedTime = 0;
    this.completionPercent = 0;

    // Performance tracking
    this.tracking = {
      travelSpeedSamples: [],
      deviationSamples: [],
      positionAccuracy: [],
      consistencyScore: 0,
      averageSpeed: 0,
      maxDeviation: 0,
      avgDeviation: 0,
      pauseCount: 0,
      lastMoveTime: 0,
      totalDistance: 0,
      pathLength: 0,
    };

    // Workpiece geometry
    this.workpieces = [];
    this.jointLine = [];
    this._setupWorkpieces();

    // Callbacks
    this.onUpdate = options.onUpdate || null;
    this.onComplete = options.onComplete || null;
    this.onDefectDetected = options.onDefectDetected || null;

    // Animation
    this._animFrame = null;
    this._lastFrameTime = 0;

    // Bind
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onTouchMove = this._onTouchMove.bind(this);
    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
    this._onTouchStart = this._onTouchStart.bind(this);
    this._onTouchEnd = this._onTouchEnd.bind(this);
  }

  // ---- Parameter Management ----
  setParam(key, value) {
    if (this.params.hasOwnProperty(key)) {
      this.params[key] = value;
      this.optimalParams = this._computeOptimalParams();
    }
  }

  getParam(key) {
    return this.params[key];
  }

  _computeOptimalParams() {
    // Base optimal values depend on joint type, position, thickness, electrode
    const p = this.params;
    const thicknessFactor = p.workpieceThickness / 6;
    const gapFactor = p.workpieceGap / 2;
    
    // Current depends on electrode and thickness
    let optCurrent = 80 + (thicknessFactor * 30);
    if (p.electrodeType === 'E7018') optCurrent += 10;
    if (p.electrodeType === 'E6010') optCurrent -= 10;
    if (p.electrodeType === 'E7024') optCurrent += 20;

    // Voltage correlates with current
    let optVoltage = 20 + (optCurrent - 80) * 0.1;

    // Speed depends on position
    let optSpeed = 150;
    if (p.weldingPosition === 'vertical') optSpeed = 100;
    if (p.weldingPosition === 'overhead') optSpeed = 110;
    if (p.weldingPosition === 'horizontal') optSpeed = 130;

    // Gap affects ideal speed (larger gap = slower)
    optSpeed *= (1 / (1 + gapFactor * 0.3));

    return {
      current: optCurrent,
      voltage: optVoltage,
      speed: optSpeed,
      gap: p.workpieceGap,
      thickness: p.workpieceThickness,
    };
  }

  // ---- Workpiece Setup ----
  _setupWorkpieces() {
    const w = this.width;
    const h = this.height;
    const jointType = this.params.jointType;
    const gap = this.params.workpieceGap;
    const thickness = Math.max(20, this.params.workpieceThickness * 6);
    const margin = 60;
    const weldLength = w - margin * 2;

    this.jointLine = [];
    this.workpieces = [];

    const jointY = h / 2;

    if (jointType === 'butt') {
      // Two plates side by side with a gap
      const halfGap = gap * 3;
      this.workpieces = [
        { x: margin, y: jointY - thickness, w: weldLength / 2 - halfGap, h: thickness, color: '#5a6a7a' },
        { x: margin + weldLength / 2 + halfGap, y: jointY - thickness, w: weldLength / 2 - halfGap, h: thickness, color: '#5a6a7a' },
      ];
      for (let i = 0; i <= 100; i++) {
        const t = i / 100;
        this.jointLine.push({
          x: margin + t * weldLength,
          y: jointY - thickness / 2
        });
      }
    } else if (jointType === 'lap') {
      // Overlapping plates
      this.workpieces = [
        { x: margin, y: jointY - thickness - 10, w: weldLength * 0.6, h: thickness, color: '#5a6a7a' },
        { x: margin + weldLength * 0.35, y: jointY - 10, w: weldLength * 0.65, h: thickness, color: '#6a7a8a' },
      ];
      for (let i = 0; i <= 100; i++) {
        const t = i / 100;
        this.jointLine.push({
          x: margin + weldLength * 0.35 + t * weldLength * 0.25,
          y: jointY - 10
        });
      }
    } else if (jointType === 'tee') {
      // T-joint: one horizontal, one vertical
      this.workpieces = [
        { x: margin, y: jointY, w: weldLength, h: thickness, color: '#5a6a7a' },
        { x: margin + weldLength * 0.35, y: jointY - thickness * 2.5, w: thickness, h: thickness * 2.5, color: '#6a7a8a' },
      ];
      for (let i = 0; i <= 100; i++) {
        const t = i / 100;
        this.jointLine.push({
          x: margin + weldLength * 0.35 + thickness / 2,
          y: jointY - t * thickness * 2.5
        });
      }
    } else if (jointType === 'corner') {
      // Corner joint: two plates at right angle
      this.workpieces = [
        { x: margin, y: jointY, w: weldLength, h: thickness, color: '#5a6a7a' },
        { x: margin + weldLength - thickness, y: jointY - thickness * 3, w: thickness, h: thickness * 3, color: '#6a7a8a' },
      ];
      for (let i = 0; i <= 100; i++) {
        const t = i / 100;
        this.jointLine.push({
          x: margin + weldLength - thickness + t * thickness,
          y: jointY - thickness * t
        });
      }
    }

    this.tracking.pathLength = this._computePathLength();
  }

  _computePathLength() {
    let len = 0;
    for (let i = 1; i < this.jointLine.length; i++) {
      const dx = this.jointLine[i].x - this.jointLine[i-1].x;
      const dy = this.jointLine[i].y - this.jointLine[i-1].y;
      len += Math.sqrt(dx*dx + dy*dy);
    }
    return len;
  }

  _getClosestPointOnPath(x, y) {
    let minDist = Infinity;
    let closestIdx = 0;
    for (let i = 0; i < this.jointLine.length; i++) {
      const dx = x - this.jointLine[i].x;
      const dy = y - this.jointLine[i].y;
      const d = Math.sqrt(dx*dx + dy*dy);
      if (d < minDist) {
        minDist = d;
        closestIdx = i;
      }
    }
    return { index: closestIdx, distance: minDist, point: this.jointLine[closestIdx] };
  }

  // ---- Events ----
  start() {
    this.canvas.addEventListener('mousemove', this._onMouseMove);
    this.canvas.addEventListener('mousedown', this._onMouseDown);
    this.canvas.addEventListener('mouseup', this._onMouseUp);
    this.canvas.addEventListener('touchmove', this._onTouchMove, { passive: false });
    this.canvas.addEventListener('touchstart', this._onTouchStart, { passive: false });
    this.canvas.addEventListener('touchend', this._onTouchEnd);
    this._lastFrameTime = performance.now();
    this._animate();
  }

  stop() {
    cancelAnimationFrame(this._animFrame);
    this.canvas.removeEventListener('mousemove', this._onMouseMove);
    this.canvas.removeEventListener('mousedown', this._onMouseDown);
    this.canvas.removeEventListener('mouseup', this._onMouseUp);
    this.canvas.removeEventListener('touchmove', this._onTouchMove);
    this.canvas.removeEventListener('touchstart', this._onTouchStart);
    this.canvas.removeEventListener('touchend', this._onTouchEnd);
  }

  _getCanvasCoords(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  _onMouseMove(e) {
    const pos = this._getCanvasCoords(e);
    this.torchPos = pos;
    if (this.isWelding) this._trackWelding(pos);
  }

  _onTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const pos = this._getCanvasCoords(touch);
    this.torchPos = pos;
    if (this.isWelding) this._trackWelding(pos);
  }

  _onMouseDown(e) {
    if (!this.isComplete) {
      this._startWelding();
    }
  }

  _onTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    this.torchPos = this._getCanvasCoords(touch);
    if (!this.isComplete) {
      this._startWelding();
    }
  }

  _onMouseUp() {
    if (this.isWelding) this._pauseWelding();
  }

  _onTouchEnd() {
    if (this.isWelding) this._pauseWelding();
  }

  _startWelding() {
    if (this.isComplete) return;
    this.isWelding = true;
    if (!this.startTime) this.startTime = Date.now();
    this.tracking.lastMoveTime = Date.now();
  }

  _pauseWelding() {
    this.isWelding = false;
    this.tracking.pauseCount++;
  }

  // ---- Tracking ----
  _trackWelding(pos) {
    const now = Date.now();
    const dt = (now - this.tracking.lastMoveTime) / 1000; // seconds
    this.tracking.lastMoveTime = now;

    // Compute distance since last point
    if (this.beadPoints.length > 0) {
      const last = this.beadPoints[this.beadPoints.length - 1];
      const dx = pos.x - last.x;
      const dy = pos.y - last.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      this.tracking.totalDistance += dist;

      // Speed in px/s → convert to mm/min (approx 1px ≈ 0.5mm)
      if (dt > 0) {
        const speedPxS = dist / dt;
        const speedMmMin = speedPxS * 0.5 * 60;
        this.tracking.travelSpeedSamples.push(speedMmMin);
        if (this.tracking.travelSpeedSamples.length > 200) {
          this.tracking.travelSpeedSamples.shift();
        }
      }
    }

    // Deviation from ideal path
    const closest = this._getClosestPointOnPath(pos.x, pos.y);
    this.tracking.deviationSamples.push(closest.distance);
    this.tracking.positionAccuracy.push(closest.distance < 15 ? 1 : 0);
    if (closest.distance > this.tracking.maxDeviation) {
      this.tracking.maxDeviation = closest.distance;
    }

    // Add bead point
    this.beadPoints.push({
      x: pos.x,
      y: pos.y,
      time: now,
      deviation: closest.distance,
      speed: this.tracking.travelSpeedSamples.length > 0 
        ? this.tracking.travelSpeedSamples[this.tracking.travelSpeedSamples.length - 1] 
        : 0,
      closestPathIndex: closest.index,
    });

    // Sparks
    this._generateSparks(pos.x, pos.y, 5);

    // Heat
    this.heatPoints.push({ x: pos.x, y: pos.y, intensity: 1.0, time: now });

    // Completion
    this._updateCompletion();

    // Check for real-time defects
    this._checkRealTimeDefects();

    if (this.completionPercent >= 100) {
      this._completeWeld();
    }
  }

  _updateCompletion() {
    if (this.jointLine.length === 0) return;
    
    // Find the highest index on the path that has been covered
    let maxIdx = 0;
    for (const bp of this.beadPoints) {
      if (bp.closestPathIndex > maxIdx) maxIdx = bp.closestPathIndex;
    }
    this.completionPercent = Math.min(100, (maxIdx / (this.jointLine.length - 1)) * 100);
  }

  _checkRealTimeDefects() {
    const samples = this.tracking.travelSpeedSamples;
    if (samples.length < 10) return;
    
    const recentAvg = samples.slice(-10).reduce((a, b) => a + b, 0) / 10;
    const optSpeed = this.optimalParams.speed;
    const recentDeviation = this.tracking.deviationSamples.slice(-10);
    const avgDev = recentDeviation.reduce((a, b) => a + b, 0) / recentDeviation.length;

    // Check for excessive speed
    if (recentAvg > optSpeed * 1.8 && this.onDefectDetected) {
      this.onDefectDetected({
        type: 'lack_of_penetration',
        severity: 'warning',
        message: 'Travel speed too high — risk of lack of penetration'
      });
    }

    // Check for too slow
    if (recentAvg < optSpeed * 0.4 && recentAvg > 0 && this.onDefectDetected) {
      this.onDefectDetected({
        type: 'excessive_reinforcement',
        severity: 'warning',
        message: 'Travel speed too low — risk of excessive reinforcement'
      });
    }

    // Check for large deviation
    if (avgDev > 30 && this.onDefectDetected) {
      this.onDefectDetected({
        type: 'lack_of_fusion',
        severity: 'warning',
        message: 'Torch偏离 weld path — risk of lack of fusion'
      });
    }
  }

  _completeWeld() {
    this.isWelding = false;
    this.isComplete = true;
    this.elapsedTime = (Date.now() - this.startTime) / 1000;
    
    // Compute final tracking metrics
    this.tracking.averageSpeed = this.tracking.travelSpeedSamples.length > 0
      ? this.tracking.travelSpeedSamples.reduce((a, b) => a + b, 0) / this.tracking.travelSpeedSamples.length
      : 0;
    this.tracking.avgDeviation = this.tracking.deviationSamples.length > 0
      ? this.tracking.deviationSamples.reduce((a, b) => a + b, 0) / this.tracking.deviationSamples.length
      : 0;
    this.tracking.consistencyScore = this._computeConsistency();

    if (this.onComplete) {
      this.onComplete(this.getResults());
    }
  }

  _computeConsistency() {
    const speeds = this.tracking.travelSpeedSamples;
    if (speeds.length < 5) return 50;
    const mean = speeds.reduce((a, b) => a + b, 0) / speeds.length;
    const variance = speeds.reduce((sum, v) => sum + (v - mean) ** 2, 0) / speeds.length;
    const stdDev = Math.sqrt(variance);
    const cv = mean > 0 ? (stdDev / mean) : 1; // coefficient of variation
    // Lower CV = higher consistency (100 = perfect, 0 = terrible)
    return Math.max(0, Math.min(100, 100 - cv * 100));
  }

  // ---- Spark Particles ----
  _generateSparks(x, y, count) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 200;
      this.sparkParticles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 100,
        life: 0.3 + Math.random() * 0.5,
        maxLife: 0.3 + Math.random() * 0.5,
        size: 1 + Math.random() * 3,
        color: Math.random() > 0.5 ? '#ffaa00' : '#ff6600',
      });
    }
  }

  _updateParticles(dt) {
    for (let i = this.sparkParticles.length - 1; i >= 0; i--) {
      const p = this.sparkParticles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 400 * dt; // gravity
      p.life -= dt;
      if (p.life <= 0) {
        this.sparkParticles.splice(i, 1);
      }
    }
  }

  // ---- Rendering ----
  _animate() {
    const now = performance.now();
    const dt = Math.min((now - this._lastFrameTime) / 1000, 0.05);
    this._lastFrameTime = now;

    this._updateParticles(dt);

    // Decay heat points
    const currentTime = Date.now();
    this.heatPoints = this.heatPoints.filter(h => (currentTime - h.time) < 3000);
    for (const h of this.heatPoints) {
      h.intensity = Math.max(0, 1 - (currentTime - h.time) / 3000);
    }

    this._render();

    if (this.isWelding) {
      this.elapsedTime = (Date.now() - this.startTime) / 1000;
    }

    if (this.onUpdate) {
      this.onUpdate(this.getLiveMetrics());
    }

    this._animFrame = requestAnimationFrame(() => this._animate());
  }

  _render() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Background
    ctx.fillStyle = '#1a1e2e';
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // Workpieces
    for (const wp of this.workpieces) {
      ctx.fillStyle = wp.color;
      ctx.fillRect(wp.x, wp.y, wp.w, wp.h);
      // Surface texture
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 0.5;
      for (let y = wp.y; y < wp.y + wp.h; y += 4) {
        ctx.beginPath(); ctx.moveTo(wp.x, y); ctx.lineTo(wp.x + wp.w, y); ctx.stroke();
      }
      // Edge highlight
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      ctx.strokeRect(wp.x, wp.y, wp.w, wp.h);
    }

    // Heat glow
    for (const hp of this.heatPoints) {
      const grad = ctx.createRadialGradient(hp.x, hp.y, 0, hp.x, hp.y, 30);
      grad.addColorStop(0, `rgba(255, 100, 0, ${hp.intensity * 0.4})`);
      grad.addColorStop(1, 'rgba(255, 100, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(hp.x - 30, hp.y - 30, 60, 60);
    }

    // Ideal weld path (dashed guide line)
    if (this.jointLine.length > 1) {
      ctx.setLineDash([4, 6]);
      ctx.strokeStyle = 'rgba(0, 230, 118, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(this.jointLine[0].x, this.jointLine[0].y);
      for (let i = 1; i < this.jointLine.length; i++) {
        ctx.lineTo(this.jointLine[i].x, this.jointLine[i].y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Weld bead
    if (this.beadPoints.length > 1) {
      // Bead shadow
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      // Draw bead segments with quality-based coloring
      for (let i = 1; i < this.beadPoints.length; i++) {
        const bp = this.beadPoints[i];
        const prev = this.beadPoints[i - 1];
        
        // Bead width based on speed (slower = wider)
        const speedRatio = bp.speed / (this.optimalParams.speed || 150);
        let beadWidth = 8;
        if (speedRatio < 0.5) beadWidth = 14;
        else if (speedRatio < 0.8) beadWidth = 11;
        else if (speedRatio > 1.5) beadWidth = 5;
        else if (speedRatio > 1.2) beadWidth = 6;

        // Color based on deviation
        let color;
        if (bp.deviation < 8) color = '#c0c0c0';      // Good - silver
        else if (bp.deviation < 15) color = '#a0a0a0';  // OK
        else if (bp.deviation < 25) color = '#806040';   // Warning - brownish
        else color = '#604020';                          // Bad - dark brown

        ctx.strokeStyle = color;
        ctx.lineWidth = beadWidth;
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(bp.x, bp.y);
        ctx.stroke();

        // Bead highlight (top reflection)
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = beadWidth * 0.3;
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y - beadWidth * 0.15);
        ctx.lineTo(bp.x, bp.y - beadWidth * 0.15);
        ctx.stroke();
      }
    }

    // Spark particles
    for (const p of this.sparkParticles) {
      const alpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    // Torch (crosshair style)
    if (!this.isComplete) {
      const tx = this.torchPos.x;
      const ty = this.torchPos.y;
      
      // Torch glow
      if (this.isWelding) {
        const glow = ctx.createRadialGradient(tx, ty, 0, tx, ty, 25);
        glow.addColorStop(0, 'rgba(255, 200, 50, 0.6)');
        glow.addColorStop(0.5, 'rgba(255, 100, 0, 0.2)');
        glow.addColorStop(1, 'rgba(255, 50, 0, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(tx - 25, ty - 25, 50, 50);
      }

      // Crosshair
      ctx.strokeStyle = this.isWelding ? '#ffaa00' : 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 1.5;
      const cs = 12;
      ctx.beginPath(); ctx.moveTo(tx - cs, ty); ctx.lineTo(tx - 4, ty); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(tx + 4, ty); ctx.lineTo(tx + cs, ty); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(tx, ty - cs); ctx.lineTo(tx, ty - 4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(tx, ty + 4); ctx.lineTo(tx, ty + cs); ctx.stroke();
      
      // Center dot
      ctx.fillStyle = this.isWelding ? '#ffcc00' : '#ffffff';
      ctx.beginPath();
      ctx.arc(tx, ty, 2, 0, Math.PI * 2);
      ctx.fill();

      // Outer ring
      ctx.strokeStyle = this.isWelding ? 'rgba(255, 170, 0, 0.5)' : 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(tx, ty, 16, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Completion indicator on canvas
    if (this.completionPercent > 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(w - 170, 10, 160, 30);
      ctx.fillStyle = '#fff';
      ctx.font = '12px Inter, sans-serif';
      ctx.fillText('Completion: ' + this.completionPercent.toFixed(1) + '%', w - 165, 30);
      
      // Progress bar
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fillRect(w - 165, 34, 150, 4);
      ctx.fillStyle = this.completionPercent >= 100 ? '#00e676' : '#1a73e8';
      ctx.fillRect(w - 165, 34, 150 * (this.completionPercent / 100), 4);
    }
  }

  // ---- Results ----
  getLiveMetrics() {
    const samples = this.tracking.travelSpeedSamples;
    const recentSamples = samples.slice(-20);
    const currentSpeed = recentSamples.length > 0
      ? recentSamples.reduce((a, b) => a + b, 0) / recentSamples.length
      : 0;
    
    const recentDev = this.tracking.deviationSamples.slice(-20);
    const currentDeviation = recentDev.length > 0
      ? recentDev.reduce((a, b) => a + b, 0) / recentDev.length
      : 0;

    return {
      isWelding: this.isWelding,
      isComplete: this.isComplete,
      completionPercent: this.completionPercent,
      elapsedTime: this.elapsedTime,
      currentSpeed,
      optimalSpeed: this.optimalParams.speed,
      currentDeviation,
      averageDeviation: this.tracking.avgDeviation || currentDeviation,
      maxDeviation: this.tracking.maxDeviation,
      consistency: this.tracking.consistencyScore || 0,
      totalDistance: this.tracking.totalDistance,
      pauseCount: this.tracking.pauseCount,
      parameters: { ...this.params },
    };
  }

  getResults() {
    return {
      completionPercent: this.completionPercent,
      elapsedTime: this.elapsedTime,
      averageSpeed: this.tracking.averageSpeed,
      optimalSpeed: this.optimalParams.speed,
      avgDeviation: this.tracking.avgDeviation,
      maxDeviation: this.tracking.maxDeviation,
      consistency: this.tracking.consistencyScore,
      totalDistance: this.tracking.totalDistance,
      pauseCount: this.tracking.pauseCount,
      beadPoints: [...this.beadPoints],
      parameters: { ...this.params },
      optimalParams: { ...this.optimalParams },
      speedSamples: [...this.tracking.travelSpeedSamples],
      deviationSamples: [...this.tracking.deviationSamples],
      positionAccuracy: [...this.tracking.positionAccuracy],
    };
  }

  // ---- Reset ----
  reset() {
    this.isWelding = false;
    this.isComplete = false;
    this.torchPos = { x: 0, y: 0 };
    this.weldPath = [];
    this.beadPoints = [];
    this.sparkParticles = [];
    this.heatPoints = [];
    this.startTime = null;
    this.elapsedTime = 0;
    this.completionPercent = 0;
    this.tracking = {
      travelSpeedSamples: [],
      deviationSamples: [],
      positionAccuracy: [],
      consistencyScore: 0,
      averageSpeed: 0,
      maxDeviation: 0,
      avgDeviation: 0,
      pauseCount: 0,
      lastMoveTime: 0,
      totalDistance: 0,
      pathLength: 0,
    };
    this._setupWorkpieces();
  }
}
