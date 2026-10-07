import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useWeldingSession from '../hooks/useWeldingSession';
import WeldingCanvas from '../components/Workspace/WeldingCanvas';
import TorchController from '../components/Workspace/TorchController';
import WeldBead from '../components/Workspace/WeldBead';
import ParameterPanel from '../components/Workspace/ParameterPanel';
import { DEFAULT_PARAMS } from '../utils/constants';

export default function WeldingPage() {
  const navigate = useNavigate();
  const [parameters, setParameters] = useState({ ...DEFAULT_PARAMS });
  const [jointType, setJointType] = useState('butt');
  const [torchInfo, setTorchInfo] = useState({ x: 0, y: 0, speed: 0, deviation: 0, isTracking: false });

  const {
    sessionId,
    isActive,
    loading,
    error: sessionError,
    startSession,
    stopSession,
    sendTelemetry,
  } = useWeldingSession();

  const handleStart = useCallback(async () => {
    const id = await startSession(jointType, parameters);
    if (id) {
      // Session started successfully
    }
  }, [jointType, parameters, startSession]);

  const handleStop = useCallback(async () => {
    const results = await stopSession();
    if (results) {
      navigate(`/results/${results.sessionId || sessionId}`);
    }
  }, [stopSession, navigate, sessionId]);

  const handleTelemetry = useCallback((data) => {
    sendTelemetry(data);
  }, [sendTelemetry]);

  const handlePositionChange = useCallback((info) => {
    setTorchInfo(info);
  }, []);

  return (
    <div className="welding-page">
      <div className="welding-toolbar">
        <h2>Virtual Welding Workspace</h2>
        <div className="toolbar-controls">
          <select
            value={jointType}
            onChange={e => setJointType(e.target.value)}
            className="joint-select"
          >
            <option value="butt">Butt Joint</option>
            <option value="lap">Lap Joint</option>
            <option value="tee">Tee Joint</option>
            <option value="corner">Corner Joint</option>
          </select>
          {sessionError && <span className="session-error">{sessionError}</span>}
        </div>
      </div>

      <div className="welding-layout">
        <div className="welding-main">
          <WeldingCanvas
            isActive={isActive}
            parameters={parameters}
            jointType={jointType}
            onTelemetry={handleTelemetry}
            onPositionChange={handlePositionChange}
          />
        </div>

        <div className="welding-sidebar">
          <TorchController
            parameters={parameters}
            onChange={setParameters}
            onStart={handleStart}
            onStop={handleStop}
            isActive={isActive}
          />
          <WeldBead parameters={parameters} speed={torchInfo.speed} />
          <ParameterPanel
            parameters={parameters}
            speed={torchInfo.speed}
            deviation={torchInfo.deviation}
          />
        </div>
      </div>

      {isActive && (
        <div className="welding-status-bar">
          <span className="status-indicator active">● LIVE</span>
          <span>Session: {sessionId}</span>
          <span>Speed: {torchInfo.speed.toFixed(0)} px/s</span>
          <span>Deviation: {torchInfo.deviation.toFixed(1)} px</span>
          <span>V: {parameters.voltage.toFixed(0)}V</span>
          <span>A: {parameters.current.toFixed(0)}A</span>
        </div>
      )}
    </div>
  );
}
