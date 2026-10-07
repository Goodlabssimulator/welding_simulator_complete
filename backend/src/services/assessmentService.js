/**
 * Assessment Service
 * 
 * Scoring engine for welding sessions. Calculates sub-scores and overall score,
 * assigns grades, and generates structured assessment records.
 */

class AssessmentService {
  constructor() {
    // Weight for each sub-score in the overall calculation
    this.weights = {
      speedAccuracy: 0.15,
      beadQuality: 0.20,
      fusionQuality: 0.20,
      penetration: 0.15,
      alignment: 0.10,
      consistency: 0.10,
      processControl: 0.10,
    };
  }

  /**
   * Assess a completed welding session.
   * @param {Object} session - The welding_sessions row
   * @param {Array} telemetry - Array of telemetry snapshots
   * @returns {Object} assessment result with scores, grade, strengths, weaknesses
   */
  assess(session, telemetry) {
    const params = this._extractParameters(telemetry);

    const speedAccuracy = this._scoreSpeedAccuracy(params.speed, session);
    const beadQuality = this._scoreBeadQuality(params, session);
    const fusionQuality = this._scoreFusionQuality(params, session);
    const penetration = this._scorePenetration(params, session);
    const alignment = this._scoreAlignment(params, session);
    const consistency = this._scoreConsistency(params);
    const processControl = this._scoreProcessControl(params, session);

    const overall = this._weightedOverall({
      speedAccuracy, beadQuality, fusionQuality, penetration, alignment, consistency, processControl,
    });

    const grade = this._assignGrade(overall);
    const { strengths, weaknesses } = this._identifyStrengthsWeaknesses({
      speedAccuracy, beadQuality, fusionQuality, penetration, alignment, consistency, processControl,
    });

    return {
      overallScore: Math.round(overall * 10) / 10,
      speedAccuracyScore: Math.round(speedAccuracy * 10) / 10,
      beadQualityScore: Math.round(beadQuality * 10) / 10,
      fusionQualityScore: Math.round(fusionQuality * 10) / 10,
      penetrationScore: Math.round(penetration * 10) / 10,
      alignmentScore: Math.round(alignment * 10) / 10,
      consistencyScore: Math.round(consistency * 10) / 10,
      processControlScore: Math.round(processControl * 10) / 10,
      grade,
      strengths,
      weaknesses,
    };
  }

  // ---- Private helpers ----

  _extractParameters(telemetry) {
    if (!telemetry || telemetry.length === 0) {
      return { speed: [], voltage: [], current: [], wireSpeed: [], travelAngle: [], workAngle: [], contactTipDistance: [] };
    }

    const arrays = { speed: [], voltage: [], current: [], wireSpeed: [], travelAngle: [], workAngle: [], contactTipDistance: [] };

    for (const t of telemetry) {
      if (t.speed != null) arrays.speed.push(t.speed);
      if (t.voltage != null) arrays.voltage.push(t.voltage);
      if (t.current != null) arrays.current.push(t.current);
      if (t.wire_speed != null) arrays.wireSpeed.push(t.wire_speed);
      if (t.travel_angle != null) arrays.travelAngle.push(t.travel_angle);
      if (t.work_angle != null) arrays.workAngle.push(t.work_angle);
      if (t.contact_tip_distance != null) arrays.contactTipDistance.push(t.contact_tip_distance);
    }

    return arrays;
  }

  _mean(arr) {
    return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  }

  _stdDev(arr) {
    if (arr.length < 2) return 0;
    const m = this._mean(arr);
    return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
  }

  _clamp(val, min = 0, max = 100) {
    return Math.max(min, Math.min(max, val));
  }

  /**
   * Score speed accuracy – compares average speed against ideal range for
   * the joint type and welding process. Ideal ranges are simplified heuristics.
   */
  _scoreSpeedAccuracy(speedArr, session) {
    if (speedArr.length === 0) return 50;

    // Ideal speed mm/s by process (SMAW slower, GMAW faster)
    const idealSpeedByProcess = {
      SMAW: { min: 2, max: 5 },
      GMAW: { min: 4, max: 8 },
      GTAW: { min: 2, max: 4 },
      FCAW: { min: 3, max: 7 },
    };

    const process = session.process_type || 'SMAW';
    const range = idealSpeedByProcess[process] || idealSpeedByProcess.SMAW;
    const avg = this._mean(speedArr);

    if (avg >= range.min && avg <= range.max) {
      return 90 + Math.min(10, (1 - Math.abs(avg - (range.min + range.max) / 2) / ((range.max - range.min) / 2)) * 10);
    }

    const dist = avg < range.min ? range.min - avg : avg - range.max;
    const penalty = dist * 15; // 15 points per mm/s outside range
    return this._clamp(90 - penalty);
  }

  /**
   * Bead quality – evaluates voltage and current consistency and their
   * proximity to ideal values for the material / electrode.
   */
  _scoreBeadQuality(params, session) {
    const { voltage, current, wireSpeed } = params;
    if (voltage.length === 0 && current.length === 0) return 50;

    let score = 80;

    // Voltage stability (lower std dev = better)
    if (voltage.length > 1) {
      const vDev = this._stdDev(voltage);
      score -= Math.min(30, vDev * 10); // 10 pts per 1V std dev
    }

    // Current stability
    if (current.length > 1) {
      const cDev = this._stdDev(current);
      score -= Math.min(20, cDev * 2); // 2 pts per 1A std dev
    }

    // Wire speed consistency for GMAW/FCAW
    if (['GMAW', 'FCAW'].includes(session.process_type) && wireSpeed.length > 1) {
      const wsDev = this._stdDev(wireSpeed);
      score -= Math.min(15, wsDev * 5);
    }

    return this._clamp(score);
  }

  /**
   * Fusion quality – based on whether voltage/current are in a range that
   * produces adequate fusion for the joint type.
   */
  _scoreFusionQuality(params, session) {
    const { voltage, current } = params;
    if (voltage.length === 0) return 50;

    const avgV = this._mean(voltage);
    const avgI = this._mean(current);

    // Simplified ideal voltage by process
    const idealVoltage = { SMAW: [20, 28], GMAW: [18, 24], GTAW: [10, 16], FCAW: [22, 30] };
    const idealCurrent = { SMAW: [80, 140], GMAW: [100, 200], GTAW: [80, 150], FCAW: [120, 220] };

    const vRange = idealVoltage[session.process_type] || idealVoltage.SMAW;
    const iRange = idealCurrent[session.process_type] || idealCurrent.SMAW;

    let score = 75;

    // Voltage in range bonus
    if (avgV >= vRange[0] && avgV <= vRange[1]) score += 15;
    else score -= Math.min(25, Math.abs(avgV - (vRange[0] + vRange[1]) / 2) * 3);

    // Current in range bonus
    if (avgI >= iRange[0] && avgI <= iRange[1]) score += 10;
    else score -= Math.min(20, Math.abs(avgI - (iRange[0] + iRange[1]) / 2) * 0.5);

    return this._clamp(score);
  }

  /**
   * Penetration – correlates speed and current.  Slower + higher current → deeper.
   */
  _scorePenetration(params, session) {
    const { speed, current } = params;
    if (speed.length === 0) return 50;

    const avgSpeed = this._mean(speed);
    const avgCurrent = current.length ? this._mean(current) : 120;

    // Ideal: moderate speed + adequate current
    let score = 70;

    // Speed too high → lack of penetration
    if (avgSpeed > 8) score -= 25;
    else if (avgSpeed > 6) score -= 10;

    // Speed too low → excessive penetration / burn-through
    if (avgSpeed < 1.5) score -= 20;

    // Current adequacy
    if (avgCurrent > 90) score += 10;
    else score -= 10;

    return this._clamp(score);
  }

  /**
   * Alignment – evaluates work angle and travel angle consistency.
   */
  _scoreAlignment(params, session) {
    const { travelAngle, workAngle } = params;
    if (travelAngle.length === 0 && workAngle.length === 0) return 50;

    let score = 85;

    // Travel angle ideal: 5-15 degrees from vertical for flat position
    if (travelAngle.length > 0) {
      const avgTA = this._mean(travelAngle);
      if (avgTA < 5 || avgTA > 25) score -= 15;
      const taDev = this._stdDev(travelAngle);
      score -= Math.min(20, taDev * 3);
    }

    // Work angle ideal depends on joint type, simplified to 45° ±10 for T-joints
    if (workAngle.length > 0) {
      const avgWA = this._mean(workAngle);
      if (Math.abs(avgWA - 45) > 15) score -= 10;
      const waDev = this._stdDev(workAngle);
      score -= Math.min(15, waDev * 2);
    }

    return this._clamp(score);
  }

  /**
   * Consistency – overall variation across all parameters.
   */
  _scoreConsistency(params) {
    const devs = [];
    for (const key of Object.keys(params)) {
      if (params[key].length > 1) {
        const mean = this._mean(params[key]);
        if (mean > 0) {
          devs.push(this._stdDev(params[key]) / mean); // coefficient of variation
        }
      }
    }

    if (devs.length === 0) return 50;

    const avgCV = this._mean(devs);
    // Lower CV → more consistent → higher score
    // CV of 0.05 (5% variation) ≈ 95, CV of 0.5 ≈ 20
    const score = 100 - avgCV * 200;
    return this._clamp(score);
  }

  /**
   * Process control – composite of how well the trainee stayed within
   * recommended parameter boundaries throughout.
   */
  _scoreProcessControl(params, session) {
    const { voltage, current, speed, contactTipDistance } = params;

    let score = 80;
    let checks = 0;

    // Voltage within ±3V of target
    if (voltage.length > 0) {
      const avg = this._mean(voltage);
      const dev = this._stdDev(voltage);
      if (dev <= 2) score += 5;
      else score -= Math.min(15, (dev - 2) * 5);
      checks++;
    }

    // Current within ±10A of target
    if (current.length > 0) {
      const dev = this._stdDev(current);
      if (dev <= 8) score += 5;
      else score -= Math.min(15, (dev - 8) * 1.5);
      checks++;
    }

    // Speed variation < 20%
    if (speed.length > 0) {
      const avg = this._mean(speed);
      if (avg > 0) {
        const cv = this._stdDev(speed) / avg;
        if (cv <= 0.2) score += 5;
        else score -= Math.min(10, (cv - 0.2) * 50);
      }
      checks++;
    }

    // Contact tip distance (ideally 10-15mm for GMAW)
    if (contactTipDistance.length > 0 && ['GMAW', 'FCAW'].includes(session.process_type)) {
      const avgCTD = this._mean(contactTipDistance);
      if (avgCTD >= 10 && avgCTD <= 15) score += 5;
      else score -= Math.min(10, Math.abs(avgCTD - 12.5) * 2);
      checks++;
    }

    if (checks === 0) return 50;
    return this._clamp(score);
  }

  _weightedOverall(scores) {
    let overall = 0;
    for (const [key, weight] of Object.entries(this.weights)) {
      overall += (scores[key] || 0) * weight;
    }
    return overall;
  }

  _assignGrade(overall) {
    if (overall >= 80) return 'distinction';
    if (overall >= 65) return 'credit';
    if (overall >= 50) return 'pass';
    return 'fail';
  }

  _identifyStrengthsWeaknesses(scores) {
    const entries = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const strengths = entries.filter(([, v]) => v >= 70).map(([k]) => k);
    const weaknesses = entries.filter(([, v]) => v < 50).map(([k]) => k);
    return { strengths, weaknesses };
  }

  /**
   * Adapter for welding.js — accepts (telemetry, session) and returns
   * fields the route expects.
   */
  evaluate(telemetry, session) {
    const result = this.assess(session, telemetry);
    const params = this._extractParameters(telemetry);
    return {
      overallScore: result.overallScore,
      grade: result.grade,
      speedAccuracy: result.speedAccuracyScore,
      beadQuality: result.beadQualityScore,
      fusionQuality: result.fusionQualityScore,
      penetration: result.penetrationScore,
      alignment: result.alignmentScore,
      consistency: result.consistencyScore,
      processControl: result.processControlScore,
      avgSpeed: this._mean(params.speed),
      avgDeviation: 0,
      maxDeviation: 0,
      speedVariance: this._stdDev(params.speed),
      strengths: result.strengths,
      weaknesses: result.weaknesses,
    };
  }
}

module.exports = { AssessmentService };
