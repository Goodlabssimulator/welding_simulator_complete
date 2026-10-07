/**
 * Assessment Routes
 * 
 * Retrieve assessment results, defect predictions, feedback, and competency records.
 */

const express = require('express');
const { query } = require('../utils/database');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * GET /api/assessment/:sessionId
 * Get full assessment for a session
 */
router.get('/:sessionId', async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    
    const result = await query(
      'SELECT * FROM assessments WHERE session_id = $1',
      [sessionId]
    );
    
    if (result.rows.length === 0) {
      throw new AppError('Assessment not found', 404, 'NOT_FOUND');
    }
    
    res.json({ assessment: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/assessment/:sessionId/defects
 * Get defect predictions for a session
 */
router.get('/:sessionId/defects', async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    
    const result = await query(
      'SELECT * FROM defect_predictions WHERE session_id = $1 ORDER BY probability DESC',
      [sessionId]
    );
    
    res.json({ defects: result.rows });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/assessment/:sessionId/feedback
 * Get personalized feedback for a session
 */
router.get('/:sessionId/feedback', async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    
    const result = await query(
      `SELECT ai_feedback_summary, strengths, weaknesses, improvements, practice_recommendations
       FROM assessments WHERE session_id = $1`,
      [sessionId]
    );
    
    if (result.rows.length === 0) {
      throw new AppError('Feedback not found', 404, 'NOT_FOUND');
    }
    
    const row = result.rows[0];
    res.json({
      feedback: {
        summary: row.ai_feedback_summary,
        strengths: typeof row.strengths === 'string' ? JSON.parse(row.strengths) : row.strengths,
        weaknesses: typeof row.weaknesses === 'string' ? JSON.parse(row.weaknesses) : row.weaknesses,
        improvements: typeof row.improvements === 'string' ? JSON.parse(row.improvements) : row.improvements,
        practiceRecommendations: typeof row.practice_recommendations === 'string' ? JSON.parse(row.practice_recommendations) : row.practice_recommendations,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/assessment/:sessionId/competency
 * Get competency assessment for a session
 */
router.get('/:sessionId/competency', async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    
    const result = await query(
      `SELECT cr.*, cf.code, cf.name, cf.category, cf.weight
       FROM competency_records cr
       JOIN competency_framework cf ON cr.competency_id = cf.id
       WHERE cr.session_id = $1
       ORDER BY cf.category, cf.code`,
      [sessionId]
    );
    
    res.json({ competencies: result.rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
