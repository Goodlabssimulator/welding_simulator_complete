import React from 'react';
import { DEFECT_TYPES } from '../../utils/constants';

const SEVERITY_STYLES = {
  high: { bg: '#7f1d1d', border: '#ef4444', icon: '🔴' },
  medium: { bg: '#713f12', border: '#f59e0b', icon: '🟡' },
  low: { bg: '#1e3a5f', border: '#3b82f6', icon: '🔵' },
};

function getDefectMeta(type) {
  const found = Object.values(DEFECT_TYPES).find(d => d.key === type);
  if (found) return found;
  return { name: type, description: 'Detected defect', causes: [] };
}

export default function DefectCard({ defect }) {
  const severity = defect.severity || 'medium';
  const style = SEVERITY_STYLES[severity] || SEVERITY_STYLES.medium;
  const meta = getDefectMeta(defect.type);

  return (
    <div
      className="defect-card"
      style={{
        background: style.bg,
        borderColor: style.border,
      }}
    >
      <div className="defect-card-header">
        <span className="defect-icon">{style.icon}</span>
        <span className="defect-name">{meta.name || defect.type}</span>
        <span className="defect-severity-badge" style={{ background: style.border }}>
          {severity}
        </span>
      </div>
      <p className="defect-description">
        {defect.description || meta.description}
      </p>
      {(meta.causes || []).length > 0 && (
        <div className="defect-causes">
          <strong>Causes:</strong>
          <ul>
            {meta.causes.map((cause, i) => (
              <li key={i}>{cause}</li>
            ))}
          </ul>
        </div>
      )}
      {defect.correction && (
        <div className="defect-correction">
          <strong>How to fix:</strong> {defect.correction}
        </div>
      )}
    </div>
  );
}
