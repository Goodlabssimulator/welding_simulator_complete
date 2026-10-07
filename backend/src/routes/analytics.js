/**
 * Analytics Routes
 * 
 * Provides student and trainer analytics endpoints.
 */

const express = require('express');
const { query } = require('../utils/database');
const { authorize } = require('../middleware/authMiddleware');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * GET /api/analytics/student/:id/summary
 * Student analytics summary
 */
router.get('/student/:id/summary', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.role === 'trainer' ? id : req.user.id;
    
    const result = await query(
      `SELECT 
        COUNT(*) as total_attempts,
        AVG(a.overall_score) as avg_score,
        MAX(a.overall_score) as best_score,
        COUNT(CASE WHEN a.grade = 'distinction' THEN 1 END) as distinctions,
        COUNT(CASE WHEN a.grade = 'credit' THEN 1 END) as credits,
        COUNT(CASE WHEN a.grade = 'pass' THEN 1 END) as passes,
        COUNT(CASE WHEN a.grade = 'fail' THEN 1 END) as fails
       FROM welding_sessions ws
       JOIN assessments a ON ws.id = a.session_id
       WHERE ws.user_id = $1 AND ws.status = 'completed'`,
      [userId]
    );
    
    const skillResult = await query(
      `SELECT 
        AVG(a.speed_accuracy_score) as speed_accuracy,
        AVG(a.bead_quality_score) as bead_quality,
        AVG(a.fusion_quality_score) as fusion_quality,
        AVG(a.penetration_score) as penetration,
        AVG(a.alignment_score) as alignment,
        AVG(a.consistency_score) as consistency,
        AVG(a.process_control_score) as process_control
       FROM assessments a
       JOIN welding_sessions ws ON a.session_id = ws.id
       WHERE ws.user_id = $1`,
      [userId]
    );
    
    res.json({
      summary: result.rows[0],
      skillBreakdown: skillResult.rows[0],
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/analytics/student/:id/trends
 * Performance trends over time
 */
router.get('/student/:id/trends', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.role === 'trainer' ? id : req.user.id;
    const days = parseInt(req.query.days) || 30;
    
    const result = await query(
      `SELECT 
        DATE(ws.completed_at) as date,
        AVG(a.overall_score) as avg_score,
        COUNT(*) as attempts
       FROM welding_sessions ws
       JOIN assessments a ON ws.id = a.session_id
       WHERE ws.user_id = $1 AND ws.completed_at > NOW() - INTERVAL '1 day' * $2
       GROUP BY DATE(ws.completed_at)
       ORDER BY date`,
      [userId, days]
    );
    
    res.json({ trends: result.rows });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/analytics/student/:id/competencies
 * Competency progress
 */
router.get('/student/:id/competencies', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.role === 'trainer' ? id : req.user.id;
    
    const result = await query(
      `SELECT 
        cf.code, cf.name, cf.category,
        cr.level, cr.score, cr.assessed_at
       FROM competency_records cr
       JOIN competency_framework cf ON cr.competency_id = cf.id
       WHERE cr.user_id = $1
       ORDER BY cf.category, cf.code, cr.assessed_at DESC`,
      [userId]
    );
    
    // Get latest competency levels
    const latestCompetencies = {};
    for (const row of result.rows) {
      if (!latestCompetencies[row.code]) {
        latestCompetencies[row.code] = row;
      }
    }
    
    res.json({
      competencies: Object.values(latestCompetencies),
      history: result.rows,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/analytics/trainer/class-summary
 * Trainer: class performance overview
 */
router.get('/trainer/class-summary', authorize('trainer', 'admin'), async (req, res, next) => {
  try {
    const cohort = req.query.cohort;
    
    let cohortFilter = '';
    const params = [];
    
    if (cohort) {
      cohortFilter = 'AND u.cohort = $1';
      params.push(cohort);
    }
    
    const result = await query(
      `SELECT 
        COUNT(DISTINCT u.id) as total_students,
        COUNT(DISTINCT ws.user_id) as active_students,
        AVG(a.overall_score) as avg_score,
        COUNT(CASE WHEN a.grade = 'distinction' THEN 1 END) as distinction_count,
        COUNT(CASE WHEN a.grade = 'credit' THEN 1 END) as credit_count,
        COUNT(CASE WHEN a.grade = 'pass' THEN 1 END) as pass_count,
        COUNT(CASE WHEN a.grade = 'fail' THEN 1 END) as fail_count
       FROM users u
       LEFT JOIN welding_sessions ws ON u.id = ws.user_id AND ws.status = 'completed'
       LEFT JOIN assessments a ON ws.id = a.session_id
       WHERE u.role = 'student' ${cohortFilter}`,
      params
    );
    
    // Common mistakes
    const mistakesResult = await query(
      `SELECT 
        dp.defect_type,
        dp.defect_category,
        COUNT(*) as occurrence_count,
        AVG(dp.probability) as avg_probability
       FROM defect_predictions dp
       JOIN welding_sessions ws ON dp.session_id = ws.id
       JOIN users u ON ws.user_id = u.id
       WHERE u.role = 'student' ${cohortFilter}
       GROUP BY dp.defect_type, dp.defect_category
       ORDER BY occurrence_count DESC
       LIMIT 10`,
      params
    );
    
    res.json({
      classSummary: result.rows[0],
      commonDefects: mistakesResult.rows,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/analytics/trainer/student/:id/progress
 * Trainer: individual student progress
 */
router.get('/trainer/student/:id/progress', authorize('trainer', 'admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const [sessions, competencyResult, latestAssessment] = await Promise.all([
      query(
        `SELECT ws.*, a.overall_score, a.grade
         FROM welding_sessions ws
         LEFT JOIN assessments a ON ws.id = a.session_id
         WHERE ws.user_id = $1
         ORDER BY ws.started_at DESC
         LIMIT 20`,
        [id]
      ),
      query(
        `SELECT cf.code, cf.name, cf.category, cr.level, cr.score, cr.assessed_at
         FROM competency_records cr
         JOIN competency_framework cf ON cr.competency_id = cf.id
         WHERE cr.user_id = $1
         ORDER BY cf.category, cr.assessed_at DESC`,
        [id]
      ),
      query(
        `SELECT a.* FROM assessments a
         JOIN welding_sessions ws ON a.session_id = ws.id
         WHERE ws.user_id = $1
         ORDER BY a.assessed_at DESC LIMIT 1`,
        [id]
      ),
    ]);
    
    res.json({
      sessions: sessions.rows,
      competencies: competencyResult.rows,
      latestAssessment: latestAssessment.rows[0] || null,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/analytics/trainer/competency-report
 * Trainer: competency achievement report
 */
router.get('/trainer/competency-report', authorize('trainer', 'admin'), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT * FROM v_competency_rates ORDER BY category, code`
    );
    
    res.json({ competencyReport: result.rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
