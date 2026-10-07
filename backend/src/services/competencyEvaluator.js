/**
 * Competency Evaluator Service
 * 
 * Evaluates welding trainees against a competency-based assessment (CBA) framework.
 * Maps assessment sub-scores to competency standards and assigns levels:
 *   - Competent
 *   - Developing
 *   - Not Yet Competent
 */

class CompetencyEvaluator {
  constructor() {
    // Mapping of competency codes to the sub-scores they primarily depend on
    this.competencyScoreMap = {
      'WS-01': ['processControl', 'speedAccuracy'],       // Set up welding equipment
      'WS-02': ['speedAccuracy', 'alignment'],            // Prepare materials and joints
      'WS-03': ['processControl', 'beadQuality'],         // Select welding parameters
      'WS-04': ['beadQuality', 'fusionQuality', 'consistency'], // Execute weld beads
      'WS-05': ['penetration', 'fusionQuality'],          // Control penetration
      'WS-06': ['alignment', 'consistency'],              // Maintain weld alignment
      'WS-07': ['consistency', 'processControl'],         // Monitor and adjust parameters
      'WS-08': ['speedAccuracy', 'consistency'],          // Control travel speed
      'WS-09': ['beadQuality', 'processControl'],         // Produce acceptable bead appearance
      'WS-10': ['fusionQuality', 'penetration'],          // Ensure weld integrity
      'SA-01': ['processControl', 'consistency'],         // Identify welding hazards
      'SA-02': ['processControl'],                        // Use PPE correctly
      'SA-03': ['processControl', 'consistency'],         // Maintain safe work area
      'QC-01': ['beadQuality', 'alignment'],              // Visual inspection skills
      'QC-02': ['fusionQuality', 'penetration'],          // Identify weld defects
      'QC-03': ['consistency', 'processControl'],         // Quality documentation
    };

    // Thresholds for competency levels
    this.thresholds = {
      competent: 65,
      developing: 45,
      // below developing → not_yet_competent
    };
  }

  /**
   * Evaluate competencies based on assessment scores.
   * @param {Object} assessment - Assessment with sub-scores
   * @param {string} userId - User ID
   * @param {string} sessionId - Session ID
   * @param {Array} frameworkRows - Competency framework rows from DB
   * @returns {Array} competency records ready for insertion
   */
  evaluate(assessment, userId, sessionId, frameworkRows) {
    const results = [];

    for (const row of frameworkRows) {
      const scoreKeys = this.competencyScoreMap[row.code];
      if (!scoreKeys) continue;

      // Calculate competency score as average of related sub-scores
      const relevantScores = scoreKeys.map((key) => {
        const scoreMap = {
          speedAccuracy: assessment.speedAccuracyScore,
          beadQuality: assessment.beadQualityScore,
          fusionQuality: assessment.fusionQualityScore,
          penetration: assessment.penetrationScore,
          alignment: assessment.alignmentScore,
          consistency: assessment.consistencyScore,
          processControl: assessment.processControlScore,
        };
        return scoreMap[key] || 0;
      });

      const competencyScore = relevantScores.reduce((a, b) => a + b, 0) / relevantScores.length;
      const level = this._assignLevel(competencyScore);

      results.push({
        userId,
        sessionId,
        competencyId: row.id,
        code: row.code,
        name: row.name,
        category: row.category,
        level,
        score: Math.round(competencyScore * 10) / 10,
        evidence: this._generateEvidence(scoreKeys, assessment, level),
      });
    }

    return results;
  }

  /**
   * Get a summary of competency achievement.
   * @param {Array} results - Evaluation results
   * @returns {Object} summary with counts and percentages
   */
  getSummary(results) {
    const total = results.length;
    const competent = results.filter((r) => r.level === 'competent').length;
    const developing = results.filter((r) => r.level === 'developing').length;
    const notYet = results.filter((r) => r.level === 'not_yet_competent').length;

    return {
      total,
      competent,
      developing,
      notYetCompetent: notYet,
      competentRate: total ? Math.round((competent / total) * 100) : 0,
      developingRate: total ? Math.round((developing / total) * 100) : 0,
      notYetCompetentRate: total ? Math.round((notYet / total) * 100) : 0,
    };
  }

  // ---- Private helpers ----

  _assignLevel(score) {
    if (score >= this.thresholds.competent) return 'competent';
    if (score >= this.thresholds.developing) return 'developing';
    return 'not_yet_competent';
  }

  _generateEvidence(scoreKeys, assessment, level) {
    const scoreMap = {
      speedAccuracy: assessment.speedAccuracyScore,
      beadQuality: assessment.beadQualityScore,
      fusionQuality: assessment.fusionQualityScore,
      penetration: assessment.penetrationScore,
      alignment: assessment.alignmentScore,
      consistency: assessment.consistencyScore,
      processControl: assessment.processControlScore,
    };

    const scoreLabels = {
      speedAccuracy: 'Speed Accuracy',
      beadQuality: 'Bead Quality',
      fusionQuality: 'Fusion Quality',
      penetration: 'Penetration',
      alignment: 'Alignment',
      consistency: 'Consistency',
      processControl: 'Process Control',
    };

    const parts = scoreKeys.map((key) => `${scoreLabels[key]}: ${scoreMap[key] || 0}/100`);

    if (level === 'competent') {
      return `Competency demonstrated. Related scores: ${parts.join(', ')}.`;
    } else if (level === 'developing') {
      return `Developing competency. Related scores: ${parts.join(', ')}. Further practice recommended.`;
    } else {
      return `Not yet competent. Related scores: ${parts.join(', ')}. Significant improvement needed.`;
    }
  }
}

module.exports = { CompetencyEvaluator };
