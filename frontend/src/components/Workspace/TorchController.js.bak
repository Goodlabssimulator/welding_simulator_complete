import React from 'react';
import { PARAM_RANGES } from '../../utils/constants';

export default function TorchController({ parameters, onChange, onStart, onStop, isActive }) {
  const handleChange = (key, value) => {
    onChange({ ...parameters, [key]: parseFloat(value) });
  };

  return (
    <div className="torch-controller">
      <h3 className="panel-title">🔥 Torch Control</h3>

      <div className="control-group">
        <label>Voltage (V)</label>
        <input
          type="range"
          min={PARAM_RANGES.voltage.min}
          max={PARAM_RANGES.voltage.max}
          step={PARAM_RANGES.voltage.step}
          value={parameters.voltage}
          onChange={e => handleChange('voltage', e.target.value)}
          className="slider voltage-slider"
        />
        <span className="slider-value">{parameters.voltage.toFixed(0)}V</span>
      </div>

      <div className="control-group">
        <label>Current (A)</label>
        <input
          type="range"
          min={PARAM_RANGES.current.min}
          max={PARAM_RANGES.current.max}
          step={PARAM_RANGES.current.step}
          value={parameters.current}
          onChange={e => handleChange('current', e.target.value)}
          className="slider current-slider"
        />
        <span className="slider-value">{parameters.current.toFixed(0)}A</span>
      </div>

      <div className="control-group">
        <label>Wire Speed (m/min)</label>
        <input
          type="range"
          min={PARAM_RANGES.wireSpeed.min}
          max={PARAM_RANGES.wireSpeed.max}
          step={PARAM_RANGES.wireSpeed.step}
          value={parameters.wireSpeed}
          onChange={e => handleChange('wireSpeed', e.target.value)}
          className="slider wire-slider"
        />
        <span className="slider-value">{parameters.wireSpeed.toFixed(1)}</span>
      </div>

      <div className="control-group">
        <label>Torch Angle (°)</label>
        <input
          type="range"
          min={PARAM_RANGES.torchAngle.min}
          max={PARAM_RANGES.torchAngle.max}
          step={PARAM_RANGES.torchAngle.step}
          value={parameters.torchAngle}
          onChange={e => handleChange('torchAngle', e.target.value)}
          className="slider angle-slider"
        />
        <span className="slider-value">{parameters.torchAngle.toFixed(0)}°</span>
      </div>

      <div className="control-group">
        <label>Travel Angle (°)</label>
        <input
          type="range"
          min={PARAM_RANGES.travelAngle.min}
          max={PARAM_RANGES.travelAngle.max}
          step={PARAM_RANGES.travelAngle.step}
          value={parameters.travelAngle}
          onChange={e => handleChange('travelAngle', e.target.value)}
          className="slider angle-slider"
        />
        <span className="slider-value">{parameters.travelAngle.toFixed(0)}°</span>
      </div>

      <div className="torch-buttons">
        {!isActive ? (
          <button className="btn btn-primary btn-lg" onClick={onStart}>
            ⚡ Start Welding
          </button>
        ) : (
          <button className="btn btn-danger btn-lg" onClick={onStop}>
            ⏹ Stop Welding
          </button>
        )}
      </div>
    </div>
  );
}
