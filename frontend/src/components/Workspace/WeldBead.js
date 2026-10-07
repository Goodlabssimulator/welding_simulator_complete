import React from 'react';

/**
 * Live bead preview. Derives geometry from current parameters.
 * Does NOT depend on weldingPhysics.getBeadVisuals to avoid shape drift.
 */
export default function WeldBead({ parameters = {}, speed = 0 }) {
  const current = typeof parameters.current === 'number' ? parameters.current : 120;
  const voltage = typeof parameters.voltage === 'number' ? parameters.voltage : 24;
  const weldingSpeed = typeof parameters.weldingSpeed === 'number' ? parameters.weldingSpeed : 4;

  // Simple derived geometry
  const heatInput = (current * voltage) / (weldingSpeed * 1000 || 1);
  const width = Math.max(2, Math.min(14, 3 + heatInput * 3));
  const height = Math.max(0.5, Math.min(6, 1 + 3 / (weldingSpeed || 1)));
  const penetration = Math.max(0.5, Math.min(8, (current / 80) * (1 / (weldingSpeed || 1)) * 2.5));

  let qualityLevel = 'good';
  if (weldingSpeed > 8 || current < 80) qualityLevel = 'poor';
  else if (weldingSpeed > 6 || current < 100) qualityLevel = 'fair';

  return (
    <div className="weld-bead-info">
      <h4 className="panel-title">Bead Preview</h4>

      <div className="bead-preview">
        <div
          className="bead-sample"
          style={{
            width: `${width * 4}px`,
            height: `${width * 2}px`,
            background: '#b87333',
            borderRadius: '50%',
            boxShadow: '0 2px 8px rgba(255,150,50,0.4)',
          }}
        />
      </div>

      <div className="bead-stats">
        <div className="bead-stat">
          <span className="stat-label">Width</span>
          <span className="stat-value">{width.toFixed(1)} mm</span>
        </div>
        <div className="bead-stat">
          <span className="stat-label">Height</span>
          <span className="stat-value">{height.toFixed(1)} mm</span>
        </div>
        <div className="bead-stat">
          <span className="stat-label">Penetration</span>
          <span className="stat-value">{penetration.toFixed(1)} mm</span>
        </div>
        <div className="bead-stat">
          <span className="stat-label">Quality</span>
          <span className={`quality-badge ${qualityLevel}`}>{qualityLevel}</span>
        </div>
      </div>
    </div>
  );
}
