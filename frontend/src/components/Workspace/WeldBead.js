import React from 'react';
import { getBeadVisuals } from '../../utils/weldingPhysics';

/**
 * Displays bead profile information based on current parameters
 */
export default function WeldBead({ parameters, speed }) {
  const visuals = getBeadVisuals(parameters, speed);

  return (
    <div className="weld-bead-info">
      <h4 className="panel-title">🧵 Bead Profile</h4>
      <div className="bead-preview">
        <div
          className="bead-sample"
          style={{
            width: `${visuals.width * 4}px`,
            height: `${visuals.width * 2}px`,
            background: visuals.color,
            borderRadius: '50%',
            boxShadow: `0 2px 8px ${visuals.highlight}`,
          }}
        />
      </div>
      <div className="bead-stats">
        <div className="bead-stat">
          <span className="stat-label">Width</span>
          <span className="stat-value">{visuals.width.toFixed(1)}px</span>
        </div>
        <div className="bead-stat">
          <span className="stat-label">Height</span>
          <span className="stat-value">{visuals.height.toFixed(1)}px</span>
        </div>
        <div className="bead-stat">
          <span className="stat-label">Penetration</span>
          <span className="stat-value">{visuals.penetration.toFixed(1)}mm</span>
        </div>
        <div className="bead-stat">
          <span className="stat-label">Quality</span>
          <span className={`quality-badge ${visuals.qualityLevel}`}>
            {visuals.qualityLevel}
          </span>
        </div>
      </div>
    </div>
  );
}
