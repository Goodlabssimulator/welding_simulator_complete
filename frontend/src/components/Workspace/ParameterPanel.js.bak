import React from 'react';
import Gauge from '../Common/Gauge';
import { getParameterAlerts } from '../../utils/weldingPhysics';

export default function ParameterPanel({ parameters, speed, deviation }) {
  const alerts = getParameterAlerts(parameters, speed);

  return (
    <div className="parameter-panel">
      <h3 className="panel-title">📊 Parameters</h3>

      <div className="gauge-row">
        <Gauge
          value={parameters.voltage}
          min={15}
          max={35}
          label="Voltage"
          unit="V"
          size={100}
          colorClass="voltage"
        />
        <Gauge
          value={parameters.current}
          min={80}
          max={250}
          label="Current"
          unit="A"
          size={100}
          colorClass="current"
        />
        <Gauge
          value={speed}
          min={0}
          max={300}
          label="Speed"
          unit="px/s"
          size={100}
          colorClass="speed"
        />
      </div>

      <div className="param-readouts">
        <div className="readout">
          <span className="readout-label">Wire Speed</span>
          <span className="readout-value">{parameters.wireSpeed.toFixed(1)} m/min</span>
        </div>
        <div className="readout">
          <span className="readout-label">Torch Angle</span>
          <span className="readout-value">{parameters.torchAngle.toFixed(0)}°</span>
        </div>
        <div className="readout">
          <span className="readout-label">Travel Angle</span>
          <span className="readout-value">{parameters.travelAngle.toFixed(0)}°</span>
        </div>
        <div className="readout">
          <span className="readout-label">Deviation</span>
          <span className="readout-value">{deviation.toFixed(1)} px</span>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="param-alerts">
          {alerts.map((alert, i) => (
            <div key={i} className={`param-alert alert-${alert.severity}`}>
              <span className="alert-icon">
                {alert.severity === 'danger' ? '🔴' : alert.severity === 'warning' ? '🟡' : '🔵'}
              </span>
              <span className="alert-text">{alert.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
