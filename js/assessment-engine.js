/**
 * AssessmentEngine - Intelligent assessment, defect prediction, feedback, and competency evaluation
 */

class AssessmentEngine {
  constructor() {
    // Scoring weights
    this.weights = {
      speedAccuracy: 0.2,
      beadQuality: 0.2,
      fusionQuality: 0.15,
      penetrationQuality: 0.15,
      jointAlignment: 0.1,
      weldConsistency: 0.1,
      processControl: 0.1,
    };

    // Competency thresholds
    this.competencyThresholds = {
      competent: 70,
      developing: 40,
    };

    // Defect definitions
    this.defectDefinitions = {
      lack_of_penetration: {
        name: 'Lack of Penetration',
        description: 'The weld metal does not extend through the full thickness of the joint, leaving an unfused root.',
        cause: 'Excessive travel speed, insufficient current, or incorrect electrode angle.',
        fix: 'Reduce travel speed by 15–25%, increase welding current by 5–10A, and maintain proper electrode angle (70–80°).',
      },
      excessive_reinforcement: {
        name: 'Excessive Reinforcement',
        description: 'The weld bead is too high/thick above the base metal surface.',
        cause: 'Travel speed too slow, excessive current, or incorrect electrode manipulation.',
        fix: 'Increase travel speed by 15–20%, reduce current by 5–10A, and maintain consistent travel speed.',
      },
      burn_through: {
        name: 'Burn-Through',
        description: 'The weld metal melts completely through the base metal, creating a hole.',
        cause: 'Excessive current, slow travel speed, or workpiece gap too large.',
        fix: 'Reduce current by 10–15A, increase travel speed, and reduce workpiece gap to recommended dimensions.',
      },
      porosity: {
        name: 'Porosity',
        description: 'Small gas pockets trapped in the weld metal, appearing as small holes or pits.',
        cause: 'Irregular travel speed, arc length variation, or contaminated surface.',
        fix: 'Maintain consistent travel speed, keep arc length steady (2–3mm), and ensure clean workpiece surfaces.',
      },
      lack_of_fusion: {
        name: 'Lack of Fusion',
        description: 'The weld metal fails to fuse properly with the base metal or previous weld pass.',
        cause: 'Excessive deviation from weld path, incorrect torch angle, or insufficient heat input.',
        fix: 'Maintain torch alignment along the joint, keep correct electrode angle, and ensure adequate heat input.',
      },
      cracking: {
        name: 'Cracking',
        description: 'Fractures that form in the weld metal or heat-affected zone during or after welding.',
        cause: 'Incorrect machine settings, rapid cooling, or incompatible electrode/base metal combination.',
        fix: 'Use correct preheat settings, verify electrode compatibility, reduce cooling rate, and check machine settings.',
      },
      undercut: {
        name: 'Undercut',
        description: 'A groove melted into the base metal adjacent to the weld toe and left unfilled.',
        cause: 'Excessive current, fast travel speed at the edges, or incorrect electrode angle.',
        fix: 'Reduce current, slow travel speed at weld toes, and maintain proper electrode angle (70–80°).',
      },
      overlap: {
        name: 'Overlap',
        description: 'The weld metal flows over and covers the base metal without proper fusion.',
        cause: 'Slow travel speed, incorrect electrode angle, or excessive weld metal deposition.',
        fix: 'Increase travel speed, adjust electrode angle, and reduce the number of weld passes.',
      },
    };
  }

  // ---- Full Assessment ----
  assess(results) {
    const p = results.parameters;
    const op = results.optimalParams;
    const speeds = results.speedSamples;
    const deviations = results.deviationSamples;
    const accuracy = results.positionAccuracy;

    // 1. Speed Accuracy (0-100)
    const speedAccuracy = this._scoreSpeedAccuracy(results.averageSpeed, op.speed, speeds);

    // 2. Bead Quality (0-100)
    const beadQuality = this._scoreBeadQuality(results);

    // 3. Fusion Quality (0-100)
    const fusionQuality = this._scoreFusionQuality(results);

    // 4. Penetration Quality (0-100)
    const penetrationQuality = this._scorePenetration(results, op);

    // 5. Joint Alignment (0-100)
    const jointAlignment = this._scoreAlignment(results);

    // 6. Weld Consistency (0-100)
    const weldConsistency = results.consistency;

    // 7. Process Control (0-100)
    const processControl = this._scoreProcessControl(results, op);

    // Weighted overall score
    const overallScore = Math.round(
      speedAccuracy * this.weights.speedAccuracy +
      beadQuality * this.weights.beadQuality +
      fusionQuality * this.weights.fusionQuality +
      penetrationQuality * this.weights.penetrationQuality +
      jointAlignment * this.weights.jointAlignment +
      weldConsistency * this.weights.weldConsistency +
      processControl * this.weights.processControl
    );

    // Grade
    const grade = this._getGrade(overallScore);

    // Defects
    const defects = this._predictDefects(results, op);

    // Feedback
    const feedback = this._generateFeedback({
      speedAccuracy,
      beadQuality,
      fusionQuality,
      penetrationQuality,
      jointAlignment,
      weldConsistency,
      processControl,
      overallScore,
    }, results, op, defects);

    // Competencies
    const competencies = this._assessCompetencies({
      speedAccuracy,
      beadQuality,
      fusionQuality,
      penetrationQuality,
      jointAlignment,
      weldConsistency,
      processControl,
    }, p, results);

    return {
      overallScore,
      grade,
      subscores: {
        speedAccuracy,
        beadQuality,
        fusionQuality,
        penetrationQuality,
        jointAlignment,
        weldConsistency,
        processControl,
      },
      defects,
      feedback,
      competencies,
    };
  }

  // ---- Scoring Functions ----
  _scoreSpeedAccuracy(avgSpeed, optSpeed, samples) {
    if (avgSpeed === 0 || optSpeed === 0) return 30;
    const ratio = avgSpeed / optSpeed;
    // Perfect at ratio=1, degrades as ratio deviates
    if (ratio >= 0.8 && ratio <= 1.2) return 90 + Math.round(10 * (1 - Math.abs(ratio - 1) / 0.2));
    if (ratio >= 0.6 && ratio < 0.8) return 60 + Math.round(30 * (ratio - 0.6) / 0.2);
    if (ratio > 1.2 && ratio <= 1.5) return 60 + Math.round(30 * (1 - (ratio - 1.2) / 0.3));
    if (ratio >= 0.4 && ratio < 0.6) return 30 + Math.round(30 * (ratio - 0.4) / 0.2);
    if (ratio > 1.5 && ratio <= 2.0) return 30 + Math.round(30 * (1 - (ratio - 1.5) / 0.5));
    return Math.max(5, Math.round(30 * (1 - Math.abs(ratio - 1))));
  }

  _scoreBeadQuality(results) {
    // Based on deviation consistency and bead width variation
    const devs = results.deviationSamples;
    if (devs.length === 0) return 40;
    
    const avgDev = devs.reduce((a, b) => a + b, 0) / devs.length;
    
    // Bead width consistency inferred from speed variation
    const speeds = results.speedSamples;
    if (speeds.length < 3) return 50;
    const mean = speeds.reduce((a, b) => a + b, 0) / speeds.length;
    const variance = speeds.reduce((s, v) => s + (v - mean) ** 2, 0) / speeds.length;
    const cv = mean > 0 ? Math.sqrt(variance) / mean : 1;
    const widthConsistency = Math.max(0, Math.min(100, 100 - cv * 80));

    const alignmentScore = avgDev < 5 ? 100 : avgDev < 10 ? 85 : avgDev < 15 ? 65 : avgDev < 25 ? 45 : avgDev < 40 ? 25 : 10;
    
    return Math.round(alignmentScore * 0.6 + widthConsistency * 0.4);
  }

  _scoreFusionQuality(results) {
    // Based on deviation and parameter match
    const devs = results.deviationSamples;
    if (devs.length === 0) return 40;
    const avgDev = devs.reduce((a, b) => a + b, 0) / devs.length;
    const devScore = avgDev < 8 ? 95 : avgDev < 15 ? 75 : avgDev < 25 ? 55 : avgDev < 40 ? 35 : 15;
    
    // Parameter match affects fusion
    const p = results.parameters;
    const op = results.optimalParams;
    const currentRatio = p.weldingCurrent / op.current;
    const currentScore = currentRatio >= 0.9 && currentRatio <= 1.1 ? 90 : 
                         currentRatio >= 0.8 && currentRatio <= 1.2 ? 70 : 40;

    return Math.round(devScore * 0.7 + currentScore * 0.3);
  }

  _scorePenetration(results, optimalParams) {
    // Penetration depends on current, speed, and electrode
    const p = results.parameters;
    const op = optimalParams;
    
    const currentRatio = p.weldingCurrent / op.current;
    const speedRatio = results.averageSpeed / op.speed;

    // Good penetration: adequate current + moderate speed
    let penScore = 60;
    if (currentRatio >= 0.9 && currentRatio <= 1.1) penScore += 25;
    else if (currentRatio >= 0.8 && currentRatio <= 1.2) penScore += 15;
    else penScore -= 10;

    if (speedRatio >= 0.8 && speedRatio <= 1.2) penScore += 15;
    else if (speedRatio > 1.5) penScore -= 20; // Too fast = lack of penetration
    else if (speedRatio < 0.5) penScore -= 5;   // Too slow can cause burn-through on thin metal

    // Electrode factor
    if (p.electrodeType === 'E6010' || p.electrodeType === 'E7018') penScore += 5;
    
    return Math.max(5, Math.min(100, Math.round(penScore)));
  }

  _scoreAlignment(results) {
    const devs = results.deviationSamples;
    if (devs.length === 0) return 40;
    const avgDev = devs.reduce((a, b) => a + b, 0) / devs.length;
    const maxDev = results.maxDeviation;
    
    const avgScore = avgDev < 5 ? 100 : avgDev < 10 ? 85 : avgDev < 20 ? 65 : avgDev < 35 ? 40 : 15;
    const maxPenalty = maxDev > 50 ? 15 : maxDev > 35 ? 8 : maxDev > 20 ? 3 : 0;
    
    return Math.max(5, avgScore - maxPenalty);
  }

  _scoreProcessControl(results, optimalParams) {
    const p = results.parameters;
    const op = optimalParams;
    
    // How well did they set up parameters?
    const currentDiff = Math.abs(p.weldingCurrent - op.current);
    const voltageDiff = Math.abs(p.voltage - op.voltage);
    const speedDiff = Math.abs(results.averageSpeed - op.speed);

    let score = 70;
    
    // Current within 10% = good
    const currentRatio = currentDiff / op.current;
    if (currentRatio < 0.1) score += 15;
    else if (currentRatio < 0.2) score += 5;
    else score -= 10;

    // Voltage within 10%
    const voltageRatio = voltageDiff / op.voltage;
    if (voltageRatio < 0.1) score += 10;
    else if (voltageRatio < 0.2) score += 3;
    else score -= 8;

    // Pause count (fewer pauses = better control)
    if (results.pauseCount <= 2) score += 5;
    else if (results.pauseCount > 5) score -= 5;

    return Math.max(5, Math.min(100, Math.round(score)));
  }

  // ---- Grade ----
  _getGrade(score) {
    if (score >= 85) return { label: 'Distinction', class: 'distinction', color: '#00e676' };
    if (score >= 70) return { label: 'Credit', class: 'credit', color: '#00b0ff' };
    if (score >= 50) return { label: 'Pass', class: 'pass', color: '#ffc400' };
    return { label: 'Fail', class: 'fail', color: '#ff1744' };
  }

  // ---- Defect Prediction ----
  _predictDefects(results, optimalParams) {
    const defects = [];
    const p = results.parameters;
    const op = optimalParams;
    const speedRatio = results.averageSpeed / (op.speed || 1);
    const currentRatio = p.weldingCurrent / (op.current || 1);
    const avgDev = results.avgDeviation;

    // Lack of Penetration
    if (speedRatio > 1.4 || currentRatio < 0.8) {
      const severity = speedRatio > 1.8 || currentRatio < 0.7 ? 'high' : 'moderate';
      defects.push({
        ...this.defectDefinitions.lack_of_penetration,
        key: 'lack_of_penetration',
        severity,
        confidence: Math.min(95, Math.round(Math.abs(speedRatio - 1) * 40 + Math.abs(1 - currentRatio) * 30)),
      });
    }

    // Excessive Reinforcement
    if (speedRatio < 0.5 || (speedRatio < 0.7 && currentRatio > 1.1)) {
      defects.push({
        ...this.defectDefinitions.excessive_reinforcement,
        key: 'excessive_reinforcement',
        severity: speedRatio < 0.35 ? 'high' : 'moderate',
        confidence: Math.min(90, Math.round((1 - speedRatio) * 50)),
      });
    }

    // Burn-Through
    if (p.workpieceGap > 4 && (speedRatio < 0.7 || currentRatio > 1.2)) {
      defects.push({
        ...this.defectDefinitions.burn_through,
        key: 'burn_through',
        severity: p.workpieceGap > 6 ? 'high' : 'moderate',
        confidence: Math.round(Math.min(85, (p.workpieceGap - 3) * 15)),
      });
    }

    // Porosity
    if (results.consistency < 50 || results.pauseCount > 5) {
      const speedCV = results.speedSamples.length > 5
        ? (() => {
            const mean = results.speedSamples.reduce((a, b) => a + b, 0) / results.speedSamples.length;
            const variance = results.speedSamples.reduce((s, v) => s + (v - mean) ** 2, 0) / results.speedSamples.length;
            return Math.sqrt(variance) / (mean || 1);
          })()
        : 0.5;
      if (speedCV > 0.4) {
        defects.push({
          ...this.defectDefinitions.porosity,
          key: 'porosity',
          severity: speedCV > 0.7 ? 'high' : 'moderate',
          confidence: Math.round(Math.min(80, speedCV * 60)),
        });
      }
    }

    // Lack of Fusion
    if (avgDev > 20) {
      defects.push({
        ...this.defectDefinitions.lack_of_fusion,
        key: 'lack_of_fusion',
        severity: avgDev > 35 ? 'high' : 'moderate',
        confidence: Math.round(Math.min(85, avgDev * 1.5)),
      });
    }

    // Cracking
    if (currentRatio > 1.3 || currentRatio < 0.6 || 
        (p.electrodeType === 'E6013' && p.workpieceThickness > 10)) {
      defects.push({
        ...this.defectDefinitions.cracking,
        key: 'cracking',
        severity: currentRatio > 1.5 || currentRatio < 0.5 ? 'high' : 'moderate',
        confidence: Math.round(Math.min(75, Math.abs(currentRatio - 1) * 50)),
      });
    }

    // Undercut
    if (speedRatio > 1.3 && currentRatio > 1.1) {
      defects.push({
        ...this.defectDefinitions.undercut,
        key: 'undercut',
        severity: 'moderate',
        confidence: Math.round(Math.min(70, (speedRatio - 1) * 40)),
      });
    }

    // Overlap
    if (speedRatio < 0.5 && currentRatio < 0.9) {
      defects.push({
        ...this.defectDefinitions.overlap,
        key: 'overlap',
        severity: 'moderate',
        confidence: Math.round(Math.min(65, (1 - speedRatio) * 50)),
      });
    }

    return defects;
  }

  // ---- Feedback Generation ----
  _generateFeedback(scores, results, optimalParams, defects) {
    const strengths = [];
    const weaknesses = [];
    const improvements = [];
    const recommendations = [];

    // Speed feedback
    const speedRatio = results.averageSpeed / (optimalParams.speed || 1);
    if (scores.speedAccuracy >= 80) {
      strengths.push('You maintained an excellent travel speed close to the optimal range.');
    } else if (scores.speedAccuracy >= 60) {
      strengths.push('Your travel speed was reasonably close to the recommended range.');
      if (speedRatio > 1.15) {
        improvements.push(`Reduce your travel speed by approximately ${Math.round((speedRatio - 1) * 100)}% to improve weld penetration and fusion.`);
      } else if (speedRatio < 0.85) {
        improvements.push(`Increase your travel speed by approximately ${Math.round((1 - speedRatio) * 100)}% to prevent excessive reinforcement and potential burn-through.`);
      }
    } else {
      weaknesses.push(`Your travel speed was ${speedRatio > 1 ? 'too fast' : 'too slow'}, significantly affecting weld quality.`);
      if (speedRatio > 1.5) {
        recommendations.push('Practice maintaining a slower, steady pace. Try counting rhythmically to maintain consistent speed.');
      } else {
        recommendations.push('Practice moving more quickly along the joint. Set a metronome to help pace your travel speed.');
      }
    }

    // Alignment feedback
    if (scores.jointAlignment >= 80) {
      strengths.push('You maintained excellent alignment along the weld joint throughout the exercise.');
    } else if (scores.jointAlignment >= 55) {
      improvements.push('Focus on keeping the electrode centered on the joint line. Practice tracking the joint visually before starting the arc.');
    } else {
      weaknesses.push('Your torch frequently deviated from the weld path, which will result in lack of fusion and irregular beads.');
      recommendations.push('Practice slow, deliberate movements along the joint path. Use the guide line as a visual reference and try to stay within the green zone.');
    }

    // Consistency feedback
    if (scores.weldConsistency >= 75) {
      strengths.push('You demonstrated good consistency in your welding technique throughout the pass.');
    } else if (scores.weldConsistency >= 50) {
      improvements.push('Your travel speed varied noticeably. Work on maintaining a steady, even pace from start to finish.');
    } else {
      weaknesses.push('Inconsistent travel speed resulted in uneven bead formation and variable weld quality.');
      recommendations.push('Practice the "steady hand" exercise: weld along a straight line focusing solely on maintaining a constant speed, ignoring deviation for now.');
    }

    // Parameter feedback
    const currentDiff = Math.abs(results.parameters.weldingCurrent - optimalParams.current);
    if (currentDiff <= 5) {
      strengths.push('Your welding current setting was well-matched to the workpiece and joint type.');
    } else if (currentDiff <= 15) {
      improvements.push(`Your welding current was ${results.parameters.weldingCurrent > optimalParams.current ? 'too high' : 'too low'}. The optimal setting for this configuration is approximately ${Math.round(optimalParams.current)}A.`);
    } else {
      weaknesses.push('Incorrect current settings significantly impacted weld quality and may have introduced defects.');
      recommendations.push(`Review welding parameter selection. For ${results.parameters.jointType} joints on ${results.parameters.workpieceThickness}mm plate, a current of ${Math.round(optimalParams.current)}A is recommended.`);
    }

    // Fusion feedback
    if (scores.fusionQuality < 50) {
      weaknesses.push('Fusion quality was poor, likely due to torch deviation and/or insufficient heat input.');
      recommendations.push('Ensure proper electrode angle (70–80° from vertical) and maintain closer alignment with the joint center.');
    }

    // Penetration feedback
    if (scores.penetrationQuality < 50) {
      if (speedRatio > 1.3) {
        weaknesses.push('Insufficient penetration due to excessive travel speed — the weld metal did not fully penetrate the joint root.');
        recommendations.push('Slow down significantly and ensure the arc is directed at the joint root. Practice running a bead at 20% reduced speed.');
      } else if (currentRatio < 0.8) {
        weaknesses.push('Insufficient penetration likely caused by low welding current — inadequate heat input.');
        recommendations.push(`Increase current to at least ${Math.round(optimalParams.current)}A. Remember: thicker materials require higher current for proper root penetration.`);
      }
    }

    // Defect-specific feedback
    if (defects.length > 0) {
      for (const d of defects) {
        recommendations.push(`⚠ ${d.name}: ${d.fix}`);
      }
    }

    // Summary
    const summary = this._generateSummary(scores, speedRatio, results, optimalParams);

    return {
      summary,
      strengths,
      weaknesses,
      improvements,
      recommendations,
    };
  }

  _generateSummary(scores, speedRatio, results, op) {
    const avgSpeed = results.averageSpeed;
    const optSpeed = op.speed;
    const avgDev = results.avgDeviation;
    const alignment = scores.jointAlignment >= 80 ? 'good weld path alignment' : 'inconsistent weld path alignment';
    const speedDesc = speedRatio > 1.15 ? 'travelled too quickly' : speedRatio < 0.85 ? 'travelled too slowly' : 'maintained appropriate travel speed';
    const penetrationDesc = speedRatio > 1.3 ? ', reducing penetration depth' : speedRatio < 0.6 ? ', causing excessive weld metal deposition' : '';
    
    let speedAdvice = '';
    if (speedRatio > 1.15) {
      speedAdvice = `Reduce travel speed by approximately ${Math.round((speedRatio - 1) * 100)}% to improve fusion.`;
    } else if (speedRatio < 0.85) {
      speedAdvice = `Increase travel speed by approximately ${Math.round((1 - speedRatio) * 100)}% to achieve proper bead dimensions.`;
    }

    return `You maintained ${alignment} but ${speedDesc}${penetrationDesc}. ${speedAdvice} Your average speed was ${Math.round(avgSpeed)} mm/min versus the optimal ${Math.round(optSpeed)} mm/min.`.trim();
  }

  // ---- Competency Assessment ----
  _assessCompetencies(scores, params, results) {
    return [
      {
        competency: 'Joint Preparation',
        description: 'Ability to select appropriate joint type and set up workpieces correctly.',
        score: this._scoreJointPrep(params),
      },
      {
        competency: 'Welding Parameter Selection',
        description: 'Ability to select correct current, voltage, electrode, and speed settings.',
        score: scores.processControl,
      },
      {
        competency: 'Torch Control',
        description: 'Ability to maintain proper torch position, angle, and arc length.',
        score: Math.round(scores.jointAlignment * 0.7 + scores.fusionQuality * 0.3),
      },
      {
        competency: 'Travel Speed Control',
        description: 'Ability to maintain consistent and appropriate travel speed.',
        score: scores.speedAccuracy,
      },
      {
        competency: 'Defect Identification',
        description: 'Awareness of potential welding defects and their causes.',
        score: this._scoreDefectAwareness(params, results),
      },
      {
        competency: 'Weld Quality Evaluation',
        description: 'Ability to produce welds meeting visual and dimensional quality standards.',
        score: Math.round(scores.beadQuality * 0.5 + scores.penetrationQuality * 0.3 + scores.fusionQuality * 0.2),
      },
      {
        competency: 'Safety Awareness',
        description: 'Knowledge and application of welding safety procedures and PPE requirements.',
        score: this._scoreSafety(params, results),
      },
    ].map(c => {
      const level = c.score >= this.competencyThresholds.competent ? 'Competent' :
                    c.score >= this.competencyThresholds.developing ? 'Developing' : 'Not Yet Competent';
      return { ...c, level };
    });
  }

  _scoreJointPrep(params) {
    let score = 60;
    if (params.jointType === 'butt' && params.workpieceGap >= 1 && params.workpieceGap <= 3) score += 20;
    else if (params.jointType === 'butt' && params.workpieceGap > 3) score -= 10;
    if (params.workpieceThickness >= 3 && params.workpieceThickness <= 12) score += 15;
    return Math.max(10, Math.min(100, score));
  }

  _scoreDefectAwareness(params, results) {
    // If parameters are well-matched, the learner shows awareness
    const op = results.optimalParams;
    const currentDiff = Math.abs(params.weldingCurrent - op.current) / op.current;
    const gapOk = params.workpieceGap <= 4;
    const score = 50 + (currentDiff < 0.1 ? 25 : currentDiff < 0.2 ? 15 : 0) + (gapOk ? 15 : 0) + (results.pauseCount <= 3 ? 10 : 0);
    return Math.max(10, Math.min(100, score));
  }

  _scoreSafety(params, results) {
    let score = 65;
    // Fewer pauses = steadier, safer operation
    if (results.pauseCount <= 2) score += 15;
    else if (results.pauseCount <= 5) score += 5;
    else score -= 5;
    // Reasonable current (not extreme)
    if (params.weldingCurrent >= 60 && params.weldingCurrent <= 150) score += 10;
    else score -= 10;
    // Completion of the weld
    if (results.completionPercent >= 95) score += 10;
    return Math.max(10, Math.min(100, score));
  }
}
