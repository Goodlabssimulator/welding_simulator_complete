const SEVERITY_MAP = {
  low: 'minor',
  medium: 'moderate',
  high: 'severe',
};

/**
 * Defect Predictor Service
 * 
 * Rule-based welding defect prediction engine. Analyses session parameters
 * and telemetry to predict likely defects with probability scores and
 * severity ratings.
 */

class DefectPredictor {
  constructor() {
    // Defect definitions: type, category, common causes, visual description
    this.defectLibrary = {
      porosity: {
        type: 'porosity',
        category: 'surface',
        causes: ['Contaminated base metal', 'Insufficient shielding gas', 'Excessive current', 'Arc length too long'],
        description: 'Small gas pockets trapped in the weld metal, appearing as small holes on the weld surface or internally.',
      },
      undercut: {
        type: 'undercut',
        category: 'surface',
        causes: ['Excessive current', 'Travel speed too fast', 'Incorrect electrode angle', 'Excessive weave'],
        description: 'A groove melted into the base metal adjacent to the weld toe and left unfilled by weld metal.',
      },
      lack_of_fusion: {
        type: 'lack_of_fusion',
        category: 'internal',
        causes: ['Travel speed too fast', 'Insufficient current', 'Incorrect electrode angle', 'Improper joint preparation'],
        description: 'Failure of the weld metal to fuse with the base metal or adjacent weld beads.',
      },
      lack_of_penetration: {
        type: 'lack_of_penetration',
        category: 'internal',
        causes: ['Travel speed too fast', 'Current too low', 'Incorrect joint preparation', 'Root gap too narrow'],
        description: 'Incomplete penetration of the weld metal through the joint thickness.',
      },
      burn_through: {
        type: 'burn_through',
        category: 'internal',
        causes: ['Excessive current', 'Travel speed too slow', 'Root gap too wide', 'Excessive heat input'],
        description: 'Excessive melt-through on the root side of the weld, creating a hole.',
      },
      slag_inclusion: {
        type: 'slag_inclusion',
        category: 'internal',
        causes: ['Insufficient cleaning between passes', 'Travel speed too slow', 'Current too low', 'Incorrect electrode manipulation'],
        description: 'Non-metallic solid material entrapped in the weld metal or between weld and base metal.',
      },
      cracking: {
        type: 'cracking',
        category: 'internal',
        causes: ['Excessive restraint', 'High carbon content', 'Rapid cooling', 'Hydrogen embrittlement'],
        description: 'Fracture in the weld metal or heat-affected zone, can be hot or cold cracking.',
      },
      spatter: {
        type: 'spatter',
        category: 'surface',
        causes: ['Excessive current', 'Arc length too long', 'Incorrect polarity', 'Contaminated surface'],
        description: 'Small droplets of weld metal expelled from the arc during welding, adhering to surrounding surfaces.',
      },
      overlap: {
        type: 'overlap',
        category: 'surface',
        causes: ['Travel speed too slow', 'Current too low', 'Excessive weave', 'Incorrect electrode angle'],
        description: 'Weld metal that flows over and covers the base metal without fusing to it.',
      },
      distortion: {
        type: 'distortion',
        category: 'geometric',
        causes: ['Excessive heat input', 'Improper sequence', 'Insufficient tack welds', 'Unbalanced welds'],
        description: 'Unwanted change in shape or dimension of the welded assembly due to thermal stresses.',
      },
    };
  }

  /**
   * Predict defects based on session parameters and telemetry.
   * @param {Object} session - welding session row
   * @param {Array} telemetry - telemetry snapshots
   * @param {Object} assessment - assessment result
   * @returns {Array} predicted defects with probability and severity
   */
  predict(session, telemetry, assessment) {
    const predictions = [];
    const params = this._extractAverages(telemetry);

    // Run each prediction rule
    predictions.push(this._predictPorosity(params, session));
    predictions.push(this._predictUndercut(params, session));
    predictions.push(this._predictLackOfFusion(params, session));
    predictions.push(this._predictLackOfPenetration(params, session, assessment));
    predictions.push(this._predictBurnThrough(params, session));
    predictions.push(this._predictSlagInclusion(params, session));
    predictions.push(this._predictCracking(params, session));
    predictions.push(this._predictSpatter(params, session));
    predictions.push(this._predictOverlap(params, session));
    predictions.push(this._predictDistortion(params, session));

    // Filter out zero-probability and sort
    return predictions
      .filter((p) => p.probability > 0.05)
      .sort((a, b) => b.probability - a.probability);
  }

  _extractAverages(telemetry) {
    if (!telemetry || telemetry.length === 0) {
      return { avgSpeed: 5, avgVoltage: 22, avgCurrent: 120, avgWireSpeed: 5, speedDev: 1, voltageDev: 1, currentDev: 5 };
    }

    const sum = (key) => {
      const vals = telemetry.map((t) => t[key]).filter((v) => v != null);
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    };

    const dev = (key) => {
      const vals = telemetry.map((t) => t[key]).filter((v) => v != null);
      if (vals.length < 2) return 0;
      const m = vals.reduce((a, b) => a + b, 0) / vals.length;
      return Math.sqrt(vals.reduce((s, v) => s + (v - m) ** 2, 0) / vals.length);
    };

    return {
      avgSpeed: sum('speed'),
      avgVoltage: sum('voltage'),
      avgCurrent: sum('current'),
      avgWireSpeed: sum('wire_speed'),
      speedDev: dev('speed'),
      voltageDev: dev('voltage'),
      currentDev: dev('current'),
    };
  }

  _makePrediction(type, probability, severity, causes) {
    const lib = this.defectLibrary[type];
    return {
      defectType: type,
      defectCategory: lib.category,
      probability: Math.round(probability * 100) / 100,
      severity,
      description: lib.description,
      causes: causes || lib.causes,
      recommendation: this._getRecommendation(type),
    };
  }

  _getRecommendation(type) {
    const recs = {
      porosity: 'Clean base metal thoroughly, verify shielding gas flow rate (15-25 L/min), and reduce arc length.',
      undercut: 'Reduce welding current, slow travel speed, and maintain proper electrode angle (5-15° drag).',
      lack_of_fusion: 'Increase current, reduce travel speed, and ensure proper electrode angle for sidewall fusion.',
      lack_of_penetration: 'Increase current, slow travel speed, and ensure adequate root gap (1.5-2.5mm).',
      burn_through: 'Reduce current, increase travel speed, and use a smaller root gap or backing bar.',
      slag_inclusion: 'Clean thoroughly between passes, increase current, and use proper interpass temperature.',
      cracking: 'Use preheat, low-hydrogen electrodes, proper joint design, and control cooling rate.',
      spatter: 'Reduce current, shorten arc length, verify polarity, and clean surface contaminants.',
      overlap: 'Increase current, maintain consistent travel speed, and reduce weave width.',
      distortion: 'Use proper weld sequence, clamp fixtures, and balance welds on opposite sides.',
    };
    return recs[type] || 'Review welding parameters and technique.';
  }

  // ---- Individual prediction rules ----

  _predictPorosity(p, session) {
    let prob = 0.05; // base

    // High current with GMAW increases porosity risk
    if (p.avgCurrent > 180) prob += 0.2;
    else if (p.avgCurrent > 150) prob += 0.1;

    // Arc too long (high voltage)
    if (p.avgVoltage > 28) prob += 0.15;
    else if (p.avgVoltage > 25) prob += 0.05;

    // Speed too fast → gas来不及 escape
    if (p.avgSpeed > 8) prob += 0.15;

    // GTAW less prone
    if (session.process_type === 'GTAW') prob *= 0.5;

    return this._makePrediction('porosity', Math.min(prob, 0.95), prob > 0.4 ? 'high' : prob > 0.2 ? 'medium' : 'low');
  }

  _predictUndercut(p, session) {
    let prob = 0.03;

    // Excessive current
    if (p.avgCurrent > 170) prob += 0.25;
    else if (p.avgCurrent > 140) prob += 0.1;

    // Fast travel
    if (p.avgSpeed > 7) prob += 0.2;

    // High voltage
    if (p.avgVoltage > 26) prob += 0.1;

    // Vertical / overhead positions more susceptible
    if (['3G', '4G', '3F', '4F'].includes(session.position_code)) prob += 0.1;

    return this._makePrediction('undercut', Math.min(prob, 0.95), prob > 0.4 ? 'high' : prob > 0.2 ? 'medium' : 'low');
  }

  _predictLackOfFusion(p, session) {
    let prob = 0.04;

    // Fast travel → insufficient heat
    if (p.avgSpeed > 7) prob += 0.25;
    else if (p.avgSpeed > 5) prob += 0.1;

    // Low current
    if (p.avgCurrent < 90) prob += 0.2;
    else if (p.avgCurrent < 100) prob += 0.1;

    // Low voltage
    if (p.avgVoltage < 18) prob += 0.1;

    return this._makePrediction('lack_of_fusion', Math.min(prob, 0.95), prob > 0.4 ? 'high' : prob > 0.2 ? 'medium' : 'low');
  }

  _predictLackOfPenetration(p, session, assessment) {
    let prob = 0.04;

    // Fast travel
    if (p.avgSpeed > 7) prob += 0.3;
    else if (p.avgSpeed > 5) prob += 0.15;

    // Low current
    if (p.avgCurrent < 90) prob += 0.25;
    else if (p.avgCurrent < 100) prob += 0.1;

    // Use assessment penetration score as corroborating evidence
    if (assessment && assessment.penetrationScore < 40) prob += 0.15;

    return this._makePrediction('lack_of_penetration', Math.min(prob, 0.95), prob > 0.4 ? 'high' : prob > 0.2 ? 'medium' : 'low');
  }

  _predictBurnThrough(p, session) {
    let prob = 0.03;

    // Slow travel + high current
    if (p.avgSpeed < 2 && p.avgCurrent > 160) prob += 0.35;
    else if (p.avgSpeed < 3 && p.avgCurrent > 140) prob += 0.2;

    // High current alone
    if (p.avgCurrent > 180) prob += 0.15;

    // Wide root gap (from session params)
    if (session.root_gap && session.root_gap > 3) prob += 0.15;

    return this._makePrediction('burn_through', Math.min(prob, 0.95), prob > 0.4 ? 'high' : prob > 0.2 ? 'medium' : 'low');
  }

  _predictSlagInclusion(p, session) {
    let prob = 0.03;

    // SMAW and FCAW more prone
    if (['SMAW', 'FCAW'].includes(session.process_type)) prob += 0.1;

    // Low current → slag won't float out
    if (p.avgCurrent < 95) prob += 0.2;

    // Slow travel → slag may roll ahead of arc
    if (p.avgSpeed < 2.5) prob += 0.1;

    return this._makePrediction('slag_inclusion', Math.min(prob, 0.95), prob > 0.4 ? 'high' : prob > 0.2 ? 'medium' : 'low');
  }

  _predictCracking(p, session) {
    let prob = 0.02;

    // High heat input + rapid cooling risk
    const heatInput = (p.avgVoltage * p.avgCurrent * 60) / (p.avgSpeed * 1000 || 1); // kJ/mm

    if (heatInput > 3) prob += 0.15;
    if (heatInput < 0.5) prob += 0.1; // too cold also risky for some steels

    // SMAW without low-hydrogen electrodes
    if (session.process_type === 'SMAW') prob += 0.08;

    // High carbon materials (if tracked)
    if (session.material_type === 'high_carbon_steel') prob += 0.15;

    return this._makePrediction('cracking', Math.min(prob, 0.95), prob > 0.4 ? 'high' : prob > 0.2 ? 'medium' : 'low');
  }

  _predictSpatter(p, session) {
    let prob = 0.05;

    // Excessive current
    if (p.avgCurrent > 170) prob += 0.2;

    // Long arc (high voltage)
    if (p.avgVoltage > 28) prob += 0.15;
    else if (p.avgVoltage > 25) prob += 0.05;

    // GMAW short-circuit transfer has more spatter
    if (session.process_type === 'GMAW' && p.avgVoltage < 20) prob += 0.15;

    // FCAW inherently more spatter
    if (session.process_type === 'FCAW') prob += 0.1;

    return this._makePrediction('spatter', Math.min(prob, 0.95), prob > 0.4 ? 'high' : prob > 0.2 ? 'medium' : 'low');
  }

  _predictOverlap(p, session) {
    let prob = 0.03;

    // Slow travel speed
    if (p.avgSpeed < 2) prob += 0.25;
    else if (p.avgSpeed < 3) prob += 0.1;

    // Low current (weld pools but doesn't fuse)
    if (p.avgCurrent < 85) prob += 0.15;

    return this._makePrediction('overlap', Math.min(prob, 0.95), prob > 0.4 ? 'high' : prob > 0.2 ? 'medium' : 'low');
  }

  _predictDistortion(p, session) {
    let prob = 0.04;

    // High heat input
    const heatInput = (p.avgVoltage * p.avgCurrent * 60) / (p.avgSpeed * 1000 || 1);

    if (heatInput > 2.5) prob += 0.2;
    if (heatInput > 4) prob += 0.15;

    // Thin materials distort more
    if (session.material_thickness && session.material_thickness < 6) prob += 0.15;

    return this._makePrediction('distortion', Math.min(prob, 0.95), prob > 0.4 ? 'high' : prob > 0.2 ? 'medium' : 'low');
  }

  /**
   * Adapter for welding.js — accepts (telemetry, session) and returns
   * defect objects with DB-compatible fields.
   */
  predictFromTelemetry(telemetry, session) {
    const raw = this.predict(session, telemetry, null);
    return raw.map((d) => ({
      type: d.defectType,
      defectType: d.defectType,
      category: d.defectCategory,
      defectCategory: d.defectCategory,
      severity: SEVERITY_MAP[d.severity] || 'minor',
      originalSeverity: d.severity,
      probability: d.probability,
      description: d.description,
      cause: (d.causes && d.causes[0]) || 'Multiple factors',
      correctiveAction: d.recommendation,
    }));
  }
}

module.exports = { DefectPredictor };
