import React from 'react';

// Safe built-in ranges — independent of constants.js
const RANGES = {
  voltage:     { min: 15, max: 35, step: 0.5 },
  current:     { min: 60, max: 250, step: 5 },
  wireFeedSpeed: { min: 2, max: 15, step: 0.5 },
  electrodeAngle: { min: 5, max: 30, step: 1 },
  workAngle:   { min: 0, max: 45, step: 1 },
  weldingSpeed: { min: 1, max: 10, step: 0.5 },
  workpieceGap: { min: 0, max: 6, step: 0.5 },
  workpieceThickness: { min: 1, max: 20, step: 0.5 },
};

export default function TorchController({ parameters, onChange, onStart, onStop, isActive }) {
  const handleChange = (key, value) => {
    onChange({ ...parameters, [key]: parseFloat(value) });
  };

  const safe = (v, fallback = 0) => (typeof v === 'number' ? v : fallback);

  return (
    <div className="torch-controller">
      <h3 className="panel-title">Torch Control</h3>

      <div className="control-group">
        <label>Voltage (V)</label>
        <input
          type="range"
          min={RANGES.voltage.min}
          max={RANGES.voltage.max}
          step={RANGES.voltage.step}
          value={safe(parameters.voltage, 24)}
          onChange={(e) => handleChange('voltage', e.target.value)}
          className="slider voltage-slider"
          disabled={isActive}
        />
        <span className="slider-value">{safe(parameters.voltage, 24).toFixed(1)}V</span>
      </div>

      <div className="control-group">
        <label>Current (A)</label>
        <input
          type="range"
          min={RANGES.current.min}
          max={RANGES.current.max}
          step={RANGES.current.step}
          value={safe(parameters.current, 120)}
          onChange={(e) => handleChange('current', e.target.value)}
          className="slider current-slider"
          disabled={isActive}
        />
        <span className="slider-value">{safe(parameters.current, 120).toFixed(0)}A</span>
      </div>

      <div className="control-group">
        <label>Travel Speed (mm/s)</label>
        <input
          type="range"
          min={RANGES.weldingSpeed.min}
          max={RANGES.weldingSpeed.max}
          step={RANGES.weldingSpeed.step}
          value={safe(parameters.weldingSpeed, 4)}
          onChange={(e) => handleChange('weldingSpeed', e.target.value)}
          className="slider speed-slider"
          disabled={isActive}
        />
        <span className="slider-value">{safe(parameters.weldingSpeed, 4).toFixed(1)}</span>
      </div>

      <div className="control-group">
        <label>Workpiece Thickness (mm)</label>
        <input
          type="range"
          min={RANGES.workpieceThickness.min}
          max={RANGES.workpieceThickness.max}
          step={RANGES.workpieceThickness.step}
          value={safe(parameters.workpieceThickness, 6)}
          onChange={(e) => handleChange('workpieceThickness', e.target.value)}
          className="slider thickness-slider"
          disabled={isActive}
        />
        <span className="slider-value">{safe(parameters.workpieceThickness, 6).toFixed(1)}</span>
      </div>

      <div className="control-group">
        <label>Workpiece Gap (mm)</label>
        <input
          type="range"
          min={RANGES.workpieceGap.min}
          max={RANGES.workpieceGap.max}
          step={RANGES.workpieceGap.step}
          value={safe(parameters.workpieceGap, 2)}
          onChange={(e) => handleChange('workpieceGap', e.target.value)}
          className="slider gap-slider"
          disabled={isActive}
        />
        <span className="slider-value">{safe(parameters.workpieceGap, 2).toFixed(1)}</span>
      </div>

      <div className="torch-buttons">
        {!isActive ? (
          <button className="btn btn-primary btn-lg" onClick={onStart}>
            Start Welding
          </button>
        ) : (
          <button className="btn btn-danger btn-lg" onClick={onStop}>
            Stop Welding
          </button>
        )}
      </div>
    </div>
  );
}
