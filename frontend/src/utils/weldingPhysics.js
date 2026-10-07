/**
 * Welding Physics Simulation Engine
 * 
 * Simulates the physics of welding bead deposition, heat distribution,
 * and visual effects based on user input parameters.
 */

/**
 * Calculate bead geometry based on welding parameters
 * @param {Object} params - Current welding parameters
 * @returns {Object} Bead dimensions
 */
export function calculateBeadGeometry(params) {
  const { current, voltage, speed, weldType } = params;

  // Heat input (kJ/mm)
  const heatInput = (current * voltage) / (speed * 1000);

  // Bead width (mm) - increases with heat input
  let beadWidth = 2.5 + (heatInput * 3.2);
  
  // Bead height/reinforcement (mm) - affected by speed
  let beadHeight = 1.0 + (3.0 / speed);
  
  // Penetration depth (mm) - increases with current, decreases with speed
  let penetration = (current / 80) * (1.0 / speed) * 2.5;

  // Type-specific adjustments
  if (weldType === 'GTAW') {
    beadWidth *= 0.75;
    beadHeight *= 0.8;
    penetration *= 0.85;
  } else if (weldType === 'GMAW') {
    beadWidth *= 1.1;
    penetration *= 1.15;
  } else if (weldType === 'FCAW') {
    beadWidth *= 1.2;
    beadHeight *= 1.1;
    penetration *= 1.2;
  }

  // Clamp values to realistic ranges
  beadWidth = Math.max(1.5, Math.min(12, beadWidth));
  beadHeight = Math.max(0.5, Math.min(6, beadHeight));
  penetration = Math.max(0.5, Math.min(8, penetration));

  return {
    beadWidth,
    beadHeight,
    penetration,
    heatInput: Math.round(heatInput * 100) / 100,
  };
}

/**
 * Calculate quality metrics from current parameters and path data
 * @param {Object} params - Welding parameters
 * @param {Object} pathData - Path tracking data
 * @returns {Object} Quality metrics (0-1 scale)
 */
export function calculateQualityMetrics(params, pathData) {
  const { current, voltage, speed, electrodeAngle, workAngle } = params;
  const { deviation = 0, speedVariance = 0, angleVariance = 0 } = pathData;

  // Optimal ranges per parameter
  const optimalSpeed = 4.0;
  const optimalAngle = 15;
  const maxDeviation = 5;

  // Speed quality: bell curve around optimal speed
  const speedDiff = Math.abs(speed - optimalSpeed);
  const speedQuality = Math.max(0, 1 - (speedDiff / 4) ** 1.5);

  // Current/voltage balance quality
  const idealHeat = current * voltage;
  const heatRatio = idealHeat / (160 * 22); // normalized to typical good weld
  const heatQuality = Math.max(0, 1 - Math.abs(heatRatio - 1) * 0.8);

  // Path accuracy quality
  const pathQuality = Math.max(0, 1 - (deviation / maxDeviation));

  // Speed consistency quality
  const consistencyQuality = Math.max(0, 1 - (speedVariance / 3));

  // Angle quality
  const angleDiff = Math.abs(electrodeAngle - optimalAngle);
  const angleQuality = Math.max(0, 1 - (angleDiff / 20));

  // Overall bead appearance (composite)
  const appearanceQuality = (
    speedQuality * 0.3 +
    heatQuality * 0.25 +
    pathQuality * 0.25 +
    consistencyQuality * 0.1 +
    angleQuality * 0.1
  );

  return {
    beadAppearance: Math.round(appearanceQuality * 100) / 100,
    penetration: Math.round(Math.min(1, (calculateBeadGeometry(params).penetration / 5)) * 100) / 100,
    pathAccuracy: Math.round(pathQuality * 100) / 100,
    speedConsistency: Math.round(consistencyQuality * 100) / 100,
    angleConsistency: Math.round(angleQuality * 100) / 100,
    heatManagement: Math.round(heatQuality * 100) / 100,
    overallQuality: Math.round((
      appearanceQuality * 0.25 +
      Math.min(1, calculateBeadGeometry(params).penetration / 5) * 0.2 +
      pathQuality * 0.2 +
      consistencyQuality * 0.15 +
      angleQuality * 0.1 +
      heatQuality * 0.1
    ) * 100) / 100,
  };
}

/**
 * Generate visual properties for the weld bead rendering
 * @param {Object} params - Current welding parameters
 * @param {number} time - Elapsed time for animation
 * @returns {Object} Visual properties
 */
export function getBeadVisuals(params, time = 0) {
  const geometry = calculateBeadGeometry(params);
  const { speed, current } = params;

  // Bead color based on temperature (recently welded = hot)
  // Cooling gradient from bright orange → dark brown → gray
  const coolingFactor = Math.min(1, time / 5); // 5 seconds to cool
  
  let r, g, b;
  if (coolingFactor < 0.3) {
    // Hot: bright orange/yellow
    const t = coolingFactor / 0.3;
    r = Math.round(255 - t * 55);
    g = Math.round(180 - t * 80);
    b = Math.round(50 - t * 30);
  } else if (coolingFactor < 0.7) {
    // Cooling: orange → brown
    const t = (coolingFactor - 0.3) / 0.4;
    r = Math.round(200 - t * 60);
    g = Math.round(100 - t * 40);
    b = Math.round(20 + t * 15);
  } else {
    // Cooled: dark brown → gray
    const t = (coolingFactor - 0.7) / 0.3;
    r = Math.round(140 - t * 40);
    g = Math.round(60 - t * 10);
    b = Math.round(35 + t * 20);
  }

  // Arc glow intensity
  const arcIntensity = (current / 200) * 0.8 + 0.2;

  // Spatter probability (increases with high current or unstable arc)
  const spatterChance = current > 180 ? 0.3 : current > 150 ? 0.1 : 0.03;

  // Spark count for visual effects
  const sparkCount = Math.floor(arcIntensity * 5 + Math.random() * 3);

  return {
    beadColor: `rgb(${r},${g},${b})`,
    beadWidth: geometry.beadWidth * 3, // Scale for canvas pixels
    beadHeight: geometry.beadHeight * 2,
    arcIntensity,
    arcColor: `rgba(100, 181, 246, ${arcIntensity})`,
    arcGlowSize: 15 + arcIntensity * 20,
    spatterChance,
    sparkCount,
    sparks: generateSparks(sparkCount, arcIntensity),
  };
}

/**
 * Generate spark particle positions
 */
export function generateSparks(count, intensity) {
  const sparks = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 5 + Math.random() * 25 * intensity;
    sparks.push({
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance - Math.random() * 15, // slight upward bias
      life: 0.2 + Math.random() * 0.4,
      size: 1 + Math.random() * 2,
      brightness: 0.6 + Math.random() * 0.4,
    });
  }
  return sparks;
}

/**
 * Calculate real-time path deviation from ideal joint line
 * @param {number} currentX - Current torch X position
 * @param {number} currentY - Current torch Y position
 * @param {Array} jointLine - Array of {x, y} points defining ideal path
 * @returns {number} Deviation in mm
 */
export function calculatePathDeviation(currentX, currentY, jointLine) {
  if (!jointLine || jointLine.length === 0) return 0;

  let minDist = Infinity;
  for (const point of jointLine) {
    const dx = currentX - point.x;
    const dy = currentY - point.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < minDist) minDist = dist;
  }

  // Convert pixels to mm (approximate scale: 3px = 1mm)
  return Math.round((minDist / 3) * 100) / 100;
}
export function calculateDeviation(currentX, currentY, jointLine) {
  return calculatePathDeviation(currentX, currentY, jointLine);
}


/**
 * Get ideal welding parameters for a given weld type and position
 * @param {string} weldType - Type of welding
 * @param {string} position - Welding position
 * @returns {Object} Recommended parameters
 */
export function getRecommendedParams(weldType, position = '1G') {
  const baseParams = {
    SMAW: { current: 120, voltage: 24, speed: 4, electrodeAngle: 15, workAngle: 0 },
    GMAW: { current: 160, voltage: 22, speed: 5, wireFeedSpeed: 6, gasFlow: 18, electrodeAngle: 15, workAngle: 0 },
    GTAW: { current: 100, voltage: 14, speed: 2.5, gasFlow: 12, electrodeAngle: 15, workAngle: 0 },
    FCAW: { current: 180, voltage: 25, speed: 4.5, wireFeedSpeed: 8, electrodeAngle: 15, workAngle: 0 },
  };

  const params = { ...baseParams[weldType] } || { ...baseParams.SMAW };

  // Position adjustments
  const positionMultipliers = {
    '1G': { current: 1.0, speed: 1.0 },
    '2G': { current: 0.9, speed: 0.85 },
    '3G': { current: 0.85, speed: 0.75 },
    '3G_down': { current: 0.95, speed: 1.1 },
    '4G': { current: 0.8, speed: 0.7 },
  };

  const mult = positionMultipliers[position] || positionMultipliers['1G'];
  params.current = Math.round(params.current * mult.current);
  params.speed = Math.round(params.speed * mult.speed * 10) / 10;

  return params;
}

/**
 * Generate a joint line path on the canvas
 * @param {string} jointType - Type of joint
 * @param {number} canvasWidth - Canvas width in pixels
 * @param {number} canvasHeight - Canvas height in pixels
 * @returns {Array} Array of {x, y} points for the ideal weld path
 */
export function generateJointLine(jointType, canvasWidth, canvasHeight) {
  const points = [];
  const centerY = canvasHeight / 2;
  const startX = 50;
  const endX = canvasWidth - 50;
  const step = 2;

  switch (jointType) {
    case 'butt':
      // Straight line across the center
      for (let x = startX; x <= endX; x += step) {
        points.push({ x, y: centerY });
      }
      break;

    case 'fillet':
      // L-shaped joint
      const cornerX = canvasWidth * 0.5;
      for (let x = startX; x <= cornerX; x += step) {
        points.push({ x, y: centerY });
      }
      for (let y = centerY; y <= canvasHeight - 50; y += step) {
        points.push({ x: cornerX, y });
      }
      break;

    case 'tee':
      // T-joint: horizontal then vertical
      for (let x = startX; x <= endX; x += step) {
        points.push({ x, y: centerY });
      }
      break;

    case 'lap':
      // Offset joint line
      for (let x = startX; x <= endX; x += step) {
        const offset = Math.sin((x / canvasWidth) * Math.PI) * 10;
        points.push({ x, y: centerY + offset });
      }
      break;

    default:
      for (let x = startX; x <= endX; x += step) {
        points.push({ x, y: centerY });
      }
  }

  return points;
}

/**
 * Check if current parameters are within acceptable ranges for real-time alerts
 * @param {Object} params - Current welding parameters
 * @returns {Array} Array of alert objects
 */
export function checkParameterAlerts(params) {
  const alerts = [];
  const { current, voltage, speed, electrodeAngle } = params;

  if (speed > 8) {
    alerts.push({ type: 'warning', param: 'speed', message: 'Travel speed too high — risk of lack of penetration' });
  }
  if (speed < 2) {
    alerts.push({ type: 'warning', param: 'speed', message: 'Travel speed too low — risk of excessive reinforcement' });
  }
  if (current > 200) {
    alerts.push({ type: 'danger', param: 'current', message: 'Current too high — risk of burn-through and spatter' });
  }
  if (current < 60) {
    alerts.push({ type: 'warning', param: 'current', message: 'Current too low — risk of lack of fusion' });
  }
  if (voltage > 30) {
    alerts.push({ type: 'danger', param: 'voltage', message: 'Voltage too high — unstable arc' });
  }
  if (electrodeAngle > 25) {
    alerts.push({ type: 'warning', param: 'angle', message: 'Electrode angle too steep — reduced penetration' });
  }

  return alerts;
}

export function getParameterAlerts(params) {
  return checkParameterAlerts(params);
}
