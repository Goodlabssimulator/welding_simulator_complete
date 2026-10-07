/**
 * Welding Session Routes
 * 
 * Handles creating, updating, and retrieving welding sessions.
 * Manages telemetry data storage and session completion.
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { query, transaction } = require('../utils/database');
const { authorize } = require('../middleware/authMiddleware');
const { AppError } = require('../middleware/errorHandler');
const { AssessmentService } = require('../services/assessmentService');
const { DefectPredictor } = require('../services/defectPredictor');
const { FeedbackGenerator } = require('../services/feedbackGenerator');
const { CompetencyEvaluator } = require('../services/competencyEvaluator');

const router = express.Router();

/**
 * GET /api/welding/config
 * Get available welding configuration options
 */
router.get('/config', async (req, res, next) => {
  try {
    const [jointTypes, electrodes, positions] = await Promise.all([
      query('SELECT * FROM joint_types ORDER BY difficulty_level'),
      query('SELECT * FROM electrode_types ORDER BY code'),
      query('SELECT * FROM welding_positions ORDER BY difficulty'),
    ]);
    
    res.json({
      jointTypes: jointTypes.rows,
      electrodes: electrodes.rows,
      positions: positions.rows,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/welding/session/start
 * Start a new welding session
 */
router.post('/session/start', async (req, res, next) => {
  try {
    const sessionId = uuidv4();
    const userId = req.user.id;
    const {
      jointTypeId, electrodeId, positionId,
      weldingSpeed, weldingCurrent, voltage,
      workpieceGap, workpieceThickness
    } = req.body;
    
    // Validate required parameters
    if (!jointTypeId || !electrodeId || !positionId) {
      throw new AppError('Joint type, electrode, and position are required', 400, 'VALIDATION_ERROR');
    }
    
    const result = await query(
      `INSERT INTO welding_sessions 
       (id, user_id, joint_type_id, electrode_id, position_id, welding_speed, 
        welding_current, voltage, workpiece_gap, workpiece_thickness, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'in_progress')
       RETURNING *`,
      [sessionId, userId, jointTypeId, electrodeId, positionId,
       weldingSpeed, weldingCurrent, voltage, workpieceGap, workpieceThickness]
    );
    
    res.status(201).json({
      session: result.rows[0],
      message: 'Welding session started',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/welding/session/:id/telemetry
 * Store telemetry data for a welding session
 */
router.put('/session/:id/telemetry', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { readings } = req.body;
    
    if (!readings || !Array.isArray(readings)) {
      throw new AppError('Telemetry readings array is required', 400, 'VALIDATION_ERROR');
    }
    
    // Batch insert telemetry data
    const values = [];
    const placeholders = [];
    let paramIndex = 1;
    
    for (const r of readings) {
      placeholders.push(
        `($${paramIndex}, $${paramIndex+1}, $${paramIndex+2}, $${paramIndex+3}, 
         $${paramIndex+4}, $${paramIndex+5}, $${paramIndex+6}, $${paramIndex+7}, $${paramIndex+8})`
      );
      values.push(id, r.timestamp_ms, r.torch_x, r.torch_y, r.speed, r.path_deviation, r.current_reading, r.heat_input, r.arc_length);
      paramIndex += 9;
    }
    
    if (placeholders.length > 0) {
      await query(
        `INSERT INTO welding_telemetry 
         (session_id, timestamp_ms, torch_x, torch_y, speed, path_deviation, current_reading, heat_input, arc_length)
         VALUES ${placeholders.join(', ')}`,
        values
      );
    }
    
    // Update completion percentage
    if (readings.length > 0) {
      const lastReading = readings[readings.length - 1];
      await query(
        'UPDATE welding_sessions SET completion_pct = $1, updated_at = NOW() WHERE id = $2',
        [Math.min(lastReading.completion_pct || 0, 100), id]
      );
    }
    
    res.json({ message: 'Telemetry recorded', count: readings.length });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/welding/session/:id/complete
 * Complete a welding session and trigger assessment
 */
router.post('/session/:id/complete', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { durationSeconds } = req.body;
    
    // Get session data
    const sessionResult = await query(
      'SELECT * FROM welding_sessions WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    
    if (sessionResult.rows.length === 0) {
      throw new AppError('Session not found', 404, 'NOT_FOUND');
    }
    
    // Get telemetry data
    const telemetryResult = await query(
      'SELECT * FROM welding_telemetry WHERE session_id = $1 ORDER BY timestamp_ms',
      [id]
    );
    
    const telemetryData = telemetryResult.rows;
    
    // Update session as completed
    await query(
      `UPDATE welding_sessions 
       SET status = 'completed', completed_at = NOW(), duration_seconds = $1, 
           completion_pct = 100, updated_at = NOW()
       WHERE id = $2`,
      [durationSeconds, id]
    );
    
    // Run assessment pipeline
    const assessmentService = new AssessmentService();
    const assessment = assessmentService.evaluate(telemetryData, sessionResult.rows[0]);
    
    const defectPredictor = new DefectPredictor();
    const defects = defectPredictor.predict(telemetryData, sessionResult.rows[0]);
    
    const feedbackGenerator = new FeedbackGenerator();
    const feedback = feedbackGenerator.generate(assessment, defects, sessionResult.rows[0]);
    
    const competencyEvaluator = new CompetencyEvaluator();
    const competencies = competencyEvaluator.evaluate(assessment, defects, sessionResult.rows[0]);
    
    // Store assessment
    const assessmentResult = await query(
      `INSERT INTO assessments 
       (session_id, user_id, overall_score, grade,
        speed_accuracy_score, bead_quality_score, fusion_quality_score,
        penetration_score, alignment_score, consistency_score, process_control_score,
        avg_speed, avg_deviation, max_deviation, speed_variance,
        completion_time_seconds, ai_feedback_summary, strengths, weaknesses, improvements, practice_recommendations)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
       RETURNING id`,
      [id, userId, assessment.overallScore, assessment.grade,
       assessment.speedAccuracy, assessment.beadQuality, assessment.fusionQuality,
       assessment.penetration, assessment.alignment, assessment.consistency, assessment.processControl,
       assessment.avgSpeed, assessment.avgDeviation, assessment.maxDeviation, assessment.speedVariance,
       durationSeconds, feedback.summary, JSON.stringify(feedback.strengths),
       JSON.stringify(feedback.weaknesses), JSON.stringify(feedback.improvements),
       JSON.stringify(feedback.practiceRecommendations)]
    );
    
    // Store defects
    for (const defect of defects) {
      await query(
        `INSERT INTO defect_predictions 
         (assessment_id, session_id, defect_type, defect_category, severity, probability,
          description, probable_cause, corrective_action)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [assessmentResult.rows[0].id, id, defect.type, defect.category, defect.severity,
         defect.probability, defect.description, defect.cause, defect.correctiveAction]
      );
    }
    
    // Store competency records
    for (const comp of competencies) {
      await query(
        `INSERT INTO competency_records (user_id, competency_id, session_id, level, score, evidence)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, comp.frameworkId, id, comp.level, comp.score, JSON.stringify(comp.evidence)]
      );
    }
    
    res.json({
      assessment: {
        overallScore: assessment.overallScore,
        grade: assessment.grade,
        subScores: {
          speedAccuracy: assessment.speedAccuracy,
          beadQuality: assessment.beadQuality,
          fusionQuality: assessment.fusionQuality,
          penetration: assessment.penetration,
          alignment: assessment.alignment,
          consistency: assessment.consistency,
          processControl: assessment.processControl,
        },
      },
      defects,
      feedback,
      competencies,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/welding/session/:id
 * Get session details
 */
router.get('/session/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT ws.*, jt.name as joint_name, et.name as electrode_name, wp.name as position_name
       FROM welding_sessions ws
       LEFT JOIN joint_types jt ON ws.joint_type_id = jt.id
       LEFT JOIN electrode_types et ON ws.electrode_id = et.id
       LEFT JOIN welding_positions wp ON ws.position_id = wp.id
       WHERE ws.id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      throw new AppError('Session not found', 404, 'NOT_FOUND');
    }
    
    res.json({ session: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/welding/sessions
 * Get user's welding sessions (with pagination)
 */
router.get('/sessions', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    
    const [sessions, countResult] = await Promise.all([
      query(
        `SELECT ws.*, jt.name as joint_name, a.overall_score, a.grade
         FROM welding_sessions ws
         LEFT JOIN joint_types jt ON ws.joint_type_id = jt.id
         LEFT JOIN assessments a ON ws.id = a.session_id
         WHERE ws.user_id = $1
         ORDER BY ws.started_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      ),
      query('SELECT COUNT(*) FROM welding_sessions WHERE user_id = $1', [userId]),
    ]);
    
    const total = parseInt(countResult.rows[0].count);
    
    res.json({
      sessions: sessions.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
