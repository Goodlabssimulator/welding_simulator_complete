import React from 'react';
import DefectCard from './DefectCard';

export default function FeedbackPanel({ results }) {
  if (!results) return null;

  const defects = results.defects || results.predictedDefects || [];
  const feedback = results.feedback || results.aiFeedback || '';
  const recommendations = results.recommendations || [];

  return (
    <div className="feedback-panel">
      <h3>📋 AI Feedback & Recommendations</h3>

      {feedback && (
        <div className="feedback-text">
          <p>{feedback}</p>
        </div>
      )}

      {recommendations.length > 0 && (
        <div className="recommendations">
          <h4>💡 Recommendations</h4>
          <ul>
            {recommendations.map((rec, i) => (
              <li key={i}>{rec}</li>
            ))}
          </ul>
        </div>
      )}

      {defects.length > 0 && (
        <div className="defects-section">
          <h4>⚠️ Predicted Defects</h4>
          <div className="defect-cards">
            {defects.map((defect, i) => (
              <DefectCard key={i} defect={defect} />
            ))}
          </div>
        </div>
      )}

      {defects.length === 0 && (
        <div className="no-defects">
          <span className="no-defects-icon">✅</span>
          <p>No significant defects detected. Great work!</p>
        </div>
      )}
    </div>
  );
}
