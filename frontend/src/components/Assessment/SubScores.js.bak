import React from 'react';

const SUB_SCORE_LABELS = {
  travelSpeed: { label: 'Travel Speed', icon: '🚀' },
  arcLength: { label: 'Arc Length Control', icon: '⚡' },
  beadUniformity: { label: 'Bead Uniformity', icon: '📏' },
  pathAccuracy: { label: 'Path Accuracy', icon: '🎯' },
  startStop: { label: 'Start/Stop Quality', icon: '🔄' },
  workAngle: { label: 'Work Angle', icon: '📐' },
  overallAppearance: { label: 'Overall Appearance', icon: '✨' },
};

function getBarColor(score) {
  if (score >= 80) return '#10b981';
  if (score >= 65) return '#f59e0b';
  if (score >= 50) return '#3b82f6';
  return '#ef4444';
}

export default function SubScores({ results }) {
  if (!results) return null;

  const subScores = results.subScores || results.subscores || {};

  return (
    <div className="sub-scores">
      <h3>Performance Breakdown</h3>
      <div className="sub-score-list">
        {Object.entries(subScores).map(([key, value]) => {
          const meta = SUB_SCORE_LABELS[key] || { label: key, icon: '📊' };
          const score = typeof value === 'number' ? value : 0;
          return (
            <div key={key} className="sub-score-item">
              <div className="sub-score-header">
                <span className="sub-score-icon">{meta.icon}</span>
                <span className="sub-score-label">{meta.label}</span>
                <span className="sub-score-value">{score.toFixed(0)}/100</span>
              </div>
              <div className="sub-score-bar-track">
                <div
                  className="sub-score-bar-fill"
                  style={{
                    width: `${score}%`,
                    background: getBarColor(score),
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
