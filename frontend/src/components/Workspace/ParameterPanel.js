import React from 'react';

export default function ParameterPanel({ parameters, speed = 0, deviation = 0 }) {
  const fmt = (v, d = 0) => (typeof v === 'number' ? v.toFixed(d) : '—');

  const alerts = [];
  if (typeof speed === 'number' && speed > 8) {
    alerts.push({ severity: 'warning', message: 'Travel speed high — risk of lack of penetration' });
  }
  if (typeof parameters.current === 'number' && parameters.current > 200) {
    alerts.push({ severity: 'danger', message: 'Current too high — risk of burn-through' });
  }
  if (typeof parameters.current === 'number' && parameters.current < 60) {
    alerts.push({ severity: 'warning', message: 'Current too low — risk of lack of fusion' });
  }
  if (typeof parameters.voltage === 'number' && parameters.voltage > 30) {
    alerts.push({ severity: 'danger', message: 'Voltage too high — unstable arc' });
  }

  return (
    <div className="parameter-panel">
      <h3 className="panel-title">Live Parameters</h3>

      <div className="param-readouts">
        <div className="readout">
          <span className="readout-label">Voltage</span>
          <span className="readout-value">{fmt(parameters.voltage, 1)} V</span>
        </div>
        <div className="readout">
          <span className="readout-label">Current</span>
          <span className="readout-value">{fmt(parameters.current, 0)} A</span>
        </div>
        <div className="readout">
          <span className="readout-label">Travel Speed</span>
          <span className="readout-value">{fmt(parameters.weldingSpeed, 1)} mm/s</span>
        </div>
        <div className="readout">
          <span className="readout-label">Torch Speed</span>
          <span className="readout-value">{fmt(speed, 0)} px/s</span>
        </div>
        <div className="readout">
          <span className="readout-label">Deviation</span>
          <span className="readout-value">{fmt(deviation, 1)} px</span>
        </div>
        <div className="readout">
          <span className="readout-label">Thickness</span>
          <span className="readout-value">{fmt(parameters.workpieceThickness, 1)} mm</span>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="param-alerts">
          {alerts.map((alert, i) => (
            <div key={i} className={`param-alert alert-${alert.severity}`}>
              <span className="alert-text">{alert.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
