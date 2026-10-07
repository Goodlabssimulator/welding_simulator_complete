import React from 'react';

// Keys match the assessment columns returned by the backend
const SUB_SCORE_LABELS = {
  speed_accuracy_score:    { label: 'Speed Accuracy',     icon: '🚀' },
  bead_quality_score:      { label: 'Bead Quality',       icon: '✨' },
  fusion_quality_score:    { label: 'Fusion Quality',     icon: '🔥' },
  penetration_score:       { label: 'Penetration',        icon: '⬇️' },
  alignment_score:         { label: 'Alignment',          icon: '🎯' },
  consistency_score:       { label: 'Consistency',        icon: '📏' },
  process_control_score:   { label: 'Process Control',    icon: '⚙️' },
};

function safeNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function getBarColor(score) {
  if (score >= 80) return '#10b981';
  if (score >= 65) return '#f59e0b';
  if (score >= 50) return '#3b82f6';
  return '#ef4444';
}

export default function SubScores({ results }) {
  if (!results) return null;

  // Build the sub-scores object from the flattened shape.
  // Support both `_score` and camelCase variants for safety.
  const subScores = {};
  for (const [key, meta] of Object.entries(SUB_SCORE_LABELS)) {
    const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    const value =
      results[key] ??
      results[camel] ??
      results?.[`${camel}_score`];

    if (value !== undefined && value !== null) {
      subScores[key] = { value: safeNum(value), meta };
    }
  }

  const entries = Object.entries(subScores);

  if (entries.length === 0) {
    return (
      <div className="sub-scores">
        <h3>Performance Breakdown</h3>
        <p className="sub-scores-empty">No sub-score data available for this session.</p>
      </div>
    );
  }

  return (
    <div className="sub-scores">
      <h3>Performance Breakdown</h3>
      <div className="sub-score-list">
        {entries.map(([key, { value, meta }]) => {
          const score = safeNum(value);
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
