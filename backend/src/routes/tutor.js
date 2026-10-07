/**
 * AI Tutor Routes
 * 
 * Provides personalized learning recommendations and practice suggestions.
 */

const express = require('express');
const { query } = require('../utils/database');
const { AITutorService } = require('../services/tutorService');
const { authorize } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * GET /api/tutor/:studentId/recommendations
 * Get AI tutor recommendations for a student
 */
router.get('/:studentId/recommendations', async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const userId = req.user.role === 'trainer' ? studentId : req.user.id;
    
    const tutorService = new AITutorService();
    const recommendations = await tutorService.getRecommendations(userId);
    
    res.json({ recommendations });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/tutor/:studentId/practice
 * Generate practice exercise recommendations
 */
router.post('/:studentId/practice', async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const userId = req.user.role === 'trainer' ? studentId : req.user.id;
    const { focusArea } = req.body;
    
    const tutorService = new AITutorService();
    const practice = await tutorService.generatePractice(userId, focusArea);
    
    res.json({ practice });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/tutor/:studentId/progress
 * Get competency development progress over time
 */
router.get('/:studentId/progress', async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const userId = req.user.role === 'trainer' ? studentId : req.user.id;
    
    const tutorService = new AITutorService();
    const progress = await tutorService.getProgressTracking(userId);
    
    res.json({ progress });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
