/**
 * AI Tutor Service
 * 
 * Generates personalized learning recommendations, practice exercises,
 * and tracks competency development progress for welding trainees.
 */

const { query } = require('../utils/database');

class AITutorService {

  /**
   * Get comprehensive recommendations for a student.
   * @param {string} userId - Student user ID
   * @returns {Object} recommendations with current status, next steps, focus areas
   */
  async getRecommendations(userId) {
    // Fetch recent assessment data
    const recentAssessments = await query(
      `SELECT a.*, ws.process_type, ws.position_code, ws.joint_type, ws.completed_at
       FROM assessments a
       JOIN welding_sessions ws ON a.session_id = ws.id
       WHERE ws.user_id = $1 AND ws.status = 'completed'
       ORDER BY ws.completed_at DESC LIMIT 5`,
      [userId]
    );

    // Fetch competency status
    const competencies = await query(
      `SELECT cf.code, cf.name, cf.category,
              cr.level, cr.score, cr.assessed_at
       FROM competency_records cr
       JOIN competency_framework cf ON cr.competency_id = cf.id
       WHERE cr.user_id = $1
       ORDER BY cr.assessed_at DESC`,
      [userId]
    );

    // Get latest competency levels (most recent per code)
    const latestCompetencies = {};
    for (const row of competencies.rows) {
      if (!latestCompetencies[row.code]) {
        latestCompetencies[row.code] = row;
      }
    }

    // Build recommendations
    const recommendations = {
      currentLevel: this._assessCurrentLevel(recentAssessments.rows),
      focusAreas: this._identifyFocusAreas(recentAssessments.rows, latestCompetencies),
      nextSteps: this._suggestNextSteps(recentAssessments.rows, latestCompetencies),
      learningPath: this._buildLearningPath(recentAssessments.rows, latestCompetencies),
      tips: this._getContextualTips(recentAssessments.rows),
    };

    return recommendations;
  }

  /**
   * Generate practice exercise recommendations.
   * @param {string} userId - Student user ID
   * @param {string} focusArea - Optional specific focus area
   * @returns {Object} practice plan
   */
  async generatePractice(userId, focusArea) {
    const recent = await query(
      `SELECT a.*, ws.process_type, ws.position_code
       FROM assessments a
       JOIN welding_sessions ws ON a.session_id = ws.id
       WHERE ws.user_id = $1 AND ws.status = 'completed'
       ORDER BY ws.completed_at DESC LIMIT 3`,
      [userId]
    );

    const weakestAreas = this._getWeakestAreas(recent.rows);
    const targetArea = focusArea || (weakestAreas.length > 0 ? weakestAreas[0].area : 'speedAccuracy');

    const practicePlan = this._createPracticePlan(targetArea, recent.rows);

    return {
      focusArea: targetArea,
      practicePlan,
      estimatedTimeToImprove: this._estimateImprovementTime(targetArea, recent.rows),
      milestones: this._generateMilestones(targetArea, recent.rows),
    };
  }

  /**
   * Get progress tracking data over time.
   * @param {string} userId - Student user ID
   * @returns {Object} progress data
   */
  async getProgressTracking(userId) {
    const weeklyProgress = await query(
      `SELECT 
        DATE_TRUNC('week', ws.completed_at) as week,
        AVG(a.overall_score) as avg_score,
        COUNT(*) as sessions_count,
        AVG(a.speed_accuracy_score) as avg_speed_accuracy,
        AVG(a.bead_quality_score) as avg_bead_quality,
        AVG(a.fusion_quality_score) as avg_fusion_quality,
        AVG(a.penetration_score) as avg_penetration,
        AVG(a.alignment_score) as avg_alignment,
        AVG(a.consistency_score) as avg_consistency,
        AVG(a.process_control_score) as avg_process_control
       FROM welding_sessions ws
       JOIN assessments a ON ws.id = a.session_id
       WHERE ws.user_id = $1 AND ws.status = 'completed'
       GROUP BY DATE_TRUNC('week', ws.completed_at)
       ORDER BY week`,
      [userId]
    );

    const competencyProgress = await query(
      `SELECT 
        cf.code, cf.name, cf.category,
        cr.level, cr.score, cr.assessed_at
       FROM competency_records cr
       JOIN competency_framework cf ON cr.competency_id = cf.id
       WHERE cr.user_id = $1
       ORDER BY cf.code, cr.assessed_at`,
      [userId]
    );

    return {
      weeklyProgress: weeklyProgress.rows,
      competencyProgress: competencyProgress.rows,
      totalSessions: weeklyProgress.rows.reduce((sum, r) => sum + parseInt(r.sessions_count), 0),
      overallTrend: this._calculateTrend(weeklyProgress.rows),
    };
  }

  // ---- Private helpers ----

  _assessCurrentLevel(assessments) {
    if (assessments.length === 0) {
      return { level: 'beginner', description: 'No completed sessions yet. Start with basic flat position welds.' };
    }

    const avgScore = assessments.reduce((s, a) => s + a.overall_score, 0) / assessments.length;
    const latestScore = assessments[0].overall_score;

    if (latestScore >= 80 && avgScore >= 70) {
      return { level: 'advanced', description: 'Strong and consistent performance. Ready for complex joints and positions.' };
    } else if (latestScore >= 65 && avgScore >= 55) {
      return { level: 'intermediate', description: 'Solid fundamentals with room for improvement. Focus on consistency and technique refinement.' };
    } else if (latestScore >= 50) {
      return { level: 'developing', description: 'Basic competency achieved but technique needs significant work. Practice fundamental exercises.' };
    } else {
      return { level: 'beginner', description: 'Fundamental skills need development. Start with basic exercises and build muscle memory.' };
    }
  }

  _identifyFocusAreas(assessments, competencies) {
    const areas = [];

    if (assessments.length === 0) return [{ area: 'fundamentals', priority: 'high', reason: 'No sessions completed yet' }];

    const latest = assessments[0];
    const scoreMap = {
      speedAccuracy: latest.speed_accuracy_score,
      beadQuality: latest.bead_quality_score,
      fusionQuality: latest.fusion_quality_score,
      penetration: latest.penetration_score,
      alignment: latest.alignment_score,
      consistency: latest.consistency_score,
      processControl: latest.process_control_score,
    };

    // Sort by score ascending to identify weakest areas
    const sorted = Object.entries(scoreMap).sort(([, a], [, b]) => a - b);

    for (const [area, score] of sorted) {
      if (score < 50) {
        areas.push({ area, priority: 'high', reason: `Score ${score}/100 — below passing threshold` });
      } else if (score < 65) {
        areas.push({ area, priority: 'medium', reason: `Score ${score}/100 — needs improvement for credit level` });
      }
    }

    // Add competency-based focus areas
    const notYetCompetent = Object.values(competencies).filter((c) => c.level === 'not_yet_competent');
    for (const comp of notYetCompetent.slice(0, 2)) {
      areas.push({
        area: `competency_${comp.code}`,
        priority: 'high',
        reason: `${comp.name || comp.code} competency not yet achieved`,
      });
    }

    if (areas.length === 0) {
      areas.push({ area: 'advanced_techniques', priority: 'low', reason: 'All areas at acceptable levels — challenge yourself further' });
    }

    return areas;
  }

  _suggestNextSteps(assessments, competencies) {
    const steps = [];

    if (assessments.length === 0) {
      steps.push('Complete your first welding session in flat (1G) position with a simple butt joint.');
      steps.push('Focus on maintaining a steady travel speed and consistent arc length.');
      return steps;
    }

    const latest = assessments[0];

    // Position progression
    const position = latest.position_code;
    if (['1G', '1F'].includes(position) && latest.overall_score >= 65) {
      steps.push('Try horizontal position (2G/2F) welding — you have a solid foundation in flat position.');
    } else if (['2G', '2F'].includes(position) && latest.overall_score >= 70) {
      steps.push('Progress to vertical position (3G/3F) — adjust technique for gravity effects on the weld pool.');
    } else if (['3G', '3F'].includes(position) && latest.overall_score >= 70) {
      steps.push('Attempt overhead position (4G/4F) — the most challenging position. Keep the arc short and travel speed controlled.');
    }

    // Skill-specific suggestions
    if (latest.penetration_score < 60) {
      steps.push('Practice root pass penetration control — increase current slightly or reduce travel speed.');
    }
    if (latest.consistency_score < 60) {
      steps.push('Work on parameter consistency — try the stability drill where you monitor gauges while welding.');
    }

    // Competency progression
    const developing = Object.values(competencies).filter((c) => c.level === 'developing');
    if (developing.length > 0) {
      steps.push(`Focus on developing ${developing.length} competency area(s) from 'Developing' to 'Competent' level.`);
    }

    if (steps.length === 0) {
      steps.push('Continue practicing to maintain your skills. Try different joint types or material thicknesses for variety.');
    }

    return steps;
  }

  _buildLearningPath(assessments, competencies) {
    const stages = [];

    // Stage 1: Fundamentals
    stages.push({
      stage: 1,
      name: 'Fundamentals',
      description: 'Basic flat position welding, parameter setup, and bead control',
      completed: assessments.length > 0 && assessments[0].overall_score >= 50,
    });

    // Stage 2: Intermediate
    stages.push({
      stage: 2,
      name: 'Intermediate',
      description: 'Consistent quality, multiple joint types, horizontal position',
      completed: assessments.some((a) => a.overall_score >= 65),
    });

    // Stage 3: Advanced
    stages.push({
      stage: 3,
      name: 'Advanced',
      description: 'Vertical and overhead positions, multi-pass welds, defect prevention',
      completed: assessments.some((a) => a.overall_score >= 75 && ['3G', '3F', '4G', '4F'].includes(a.position_code)),
    });

    // Stage 4: Expert
    stages.push({
      stage: 4,
      name: 'Expert',
      description: 'Pipe welding, complex joints, consistent distinction-level performance',
      completed: false, // Very high bar
    });

    return stages;
  }

  _getContextualTips(assessments) {
    if (assessments.length === 0) {
      return [
        'Start with a comfortable stance — balance affects weld consistency.',
        'Always do a dry run along the joint before striking the arc.',
        'Watch the weld pool, not the arc — the pool tells you what the weld is doing.',
      ];
    }

    const latest = assessments[0];
    const tips = [];

    if (latest.speed_accuracy_score < 65) {
      tips.push('Count a steady rhythm while welding to maintain consistent travel speed (e.g., "one-two-three" per centimetre).');
    }
    if (latest.bead_quality_score < 65) {
      tips.push('Keep the arc length consistent — roughly equal to the electrode diameter for SMAW, or 6-10mm for GMAW.');
    }
    if (latest.alignment_score < 65) {
      tips.push('Use the edge of the joint as a guide — rest your hand on the plate to steady your movement.');
    }
    if (latest.penetration_score < 65) {
      tips.push('For root passes, listen for the "keyhole" sound — a consistent crackling indicates proper penetration.');
    }
    if (latest.consistency_score < 65) {
      tips.push('Practice on scrap pieces before your assessed weld — warming up your muscle memory improves consistency.');
    }

    if (tips.length === 0) {
      tips.push('Your technique is solid. Now focus on speed and efficiency — reduce preparation time while maintaining quality.');
      tips.push('Try welding with your non-dominant hand to build versatility for awkward positions.');
    }

    return tips;
  }

  _getWeakestAreas(assessments) {
    if (assessments.length === 0) return [{ area: 'speedAccuracy', score: 0 }];

    const latest = assessments[0];
    const scoreMap = {
      speedAccuracy: latest.speed_accuracy_score,
      beadQuality: latest.bead_quality_score,
      fusionQuality: latest.fusion_quality_score,
      penetration: latest.penetration_score,
      alignment: latest.alignment_score,
      consistency: latest.consistency_score,
      processControl: latest.process_control_score,
    };

    return Object.entries(scoreMap)
      .map(([area, score]) => ({ area, score }))
      .sort((a, b) => a.score - b.score);
  }

  _createPracticePlan(focusArea, assessments) {
    const exercises = {
      speedAccuracy: {
        title: 'Travel Speed Mastery',
        drills: [
          { name: 'Pace Calibration', description: 'Run 3 beads at different speeds while watching the speed gauge. Learn to feel the difference.', duration: 15 },
          { name: 'Target Speed Beads', description: 'Set a target speed and run beads trying to stay within ±10% for 100mm.', duration: 20 },
          { name: 'Speed Recovery', description: 'Deliberately speed up/slow down, then recover to target speed. Builds correction reflexes.', duration: 15 },
        ],
      },
      beadQuality: {
        title: 'Bead Quality Improvement',
        drills: [
          { name: 'Arc Length Control', description: 'Practice maintaining a consistent arc length. Too long → spatter; too short → sticking.', duration: 20 },
          { name: 'Stringer Bead Practice', description: 'Run straight stringer beads on flat plate. Focus on even width and height.', duration: 15 },
          { name: 'Weave Pattern Drill', description: 'Practice controlled weave patterns (zigzag, triangular). Keep rhythm consistent.', duration: 20 },
        ],
      },
      fusionQuality: {
        title: 'Fusion Quality Enhancement',
        drills: [
          { name: 'Heat Input Awareness', description: 'Run beads at different current settings. Observe how heat affects fusion depth.', duration: 20 },
          { name: 'Sidewall Dwell', description: 'Practice pausing at each sidewall for 1-2 seconds before crossing. Ensures sidewall fusion.', duration: 15 },
          { name: 'Multi-pass Fusion', description: 'Run overlapping passes and ensure each tie-in fuses properly with the previous bead.', duration: 25 },
        ],
      },
      penetration: {
        title: 'Penetration Control',
        drills: [
          { name: 'Root Gap Setup', description: 'Practice setting consistent root gaps (1.5-2.5mm) and observe how gap affects penetration.', duration: 15 },
          { name: 'Keyhole Observation', description: 'Practice open-root welding while watching for the keyhole — the indicator of proper penetration.', duration: 20 },
          { name: 'Current Adjustment', description: 'Run the same joint at 3 different amperages. Identify which gives proper root reinforcement.', duration: 20 },
        ],
      },
      alignment: {
        title: 'Alignment Improvement',
        drills: [
          { name: 'Angle Reference Practice', description: 'Use a protractor to set your electrode angle, then weld while maintaining that angle.', duration: 15 },
          { name: 'Joint Tracking', description: 'Run beads along a marked line on flat plate. Check bead centerline alignment after each pass.', duration: 20 },
          { name: 'Position Sensitivity', description: 'Weld the same joint in different positions. Adjust angle for gravity effects.', duration: 25 },
        ],
      },
      consistency: {
        title: 'Consistency Building',
        drills: [
          { name: 'Parameter Monitoring', description: 'Run beads while watching real-time parameter displays. Correct drift immediately.', duration: 15 },
          { name: 'Extended Bead Runs', description: 'Run longer beads (200mm+). Maintain consistent technique throughout the full length.', duration: 20 },
          { name: 'Repeatability Test', description: 'Run 5 identical beads on the same setup. Compare bead profiles — aim for uniformity.', duration: 25 },
        ],
      },
      processControl: {
        title: 'Process Control Fundamentals',
        drills: [
          { name: 'Parameter Setup', description: 'Practice selecting correct voltage, current, and wire speed for different joint/material combinations.', duration: 15 },
          { name: 'Mid-weld Adjustment', description: 'Start a weld, then adjust one parameter mid-bead and observe the effect on the weld pool.', duration: 20 },
          { name: 'Troubleshooting Scenarios', description: 'The simulator will inject parameter deviations — identify and correct them in real-time.', duration: 25 },
        ],
      },
    };

    return exercises[focusArea] || exercises.speedAccuracy;
  }

  _estimateImprovementTime(focusArea, assessments) {
    if (assessments.length === 0) return '2-3 weeks of daily practice';

    const latest = assessments[0];
    const scoreMap = {
      speedAccuracy: latest.speed_accuracy_score,
      beadQuality: latest.bead_quality_score,
      fusionQuality: latest.fusion_quality_score,
      penetration: latest.penetration_score,
      alignment: latest.alignment_score,
      consistency: latest.consistency_score,
      processControl: latest.process_control_score,
    };

    const current = scoreMap[focusArea] || 50;
    const gap = 65 - current; // target: credit level

    if (gap <= 0) return 'Already at or above target — focus on maintaining performance';
    if (gap <= 10) return '1-2 weeks with focused practice';
    if (gap <= 20) return '2-4 weeks of regular practice';
    return '4-8 weeks of dedicated practice';
  }

  _generateMilestones(focusArea, assessments) {
    if (assessments.length === 0) {
      return [
        { target: 30, description: 'Basic awareness of correct technique', sessions: 3 },
        { target: 50, description: 'Passing level — functional welds', sessions: 6 },
        { target: 65, description: 'Credit level — consistent quality', sessions: 10 },
      ];
    }

    const latest = assessments[0];
    const scoreMap = {
      speedAccuracy: latest.speed_accuracy_score,
      beadQuality: latest.bead_quality_score,
      fusionQuality: latest.fusion_quality_score,
      penetration: latest.penetration_score,
      alignment: latest.alignment_score,
      consistency: latest.consistency_score,
      processControl: latest.process_control_score,
    };

    const current = scoreMap[focusArea] || 50;
    const milestones = [];

    if (current < 50) {
      milestones.push({ target: 50, description: 'Reach passing level', sessions: 4 });
    }
    if (current < 65) {
      milestones.push({ target: 65, description: 'Achieve credit level', sessions: 6 });
    }
    if (current < 80) {
      milestones.push({ target: 80, description: 'Reach distinction level', sessions: 8 });
    }

    return milestones;
  }

  _calculateTrend(weeklyProgress) {
    if (weeklyProgress.length < 2) return 'insufficient_data';

    const recent = weeklyProgress.slice(-3);
    const scores = recent.map((r) => parseFloat(r.avg_score));

    // Simple trend: compare last to first of recent window
    if (scores[scores.length - 1] > scores[0] + 5) return 'improving';
    if (scores[scores.length - 1] < scores[0] - 5) return 'declining';
    return 'stable';
  }
}

module.exports = { AITutorService };
