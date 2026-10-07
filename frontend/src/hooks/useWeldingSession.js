import { useState, useCallback, useRef, useEffect } from 'react';
import { weldingAPI } from '../utils/apiClient';
import { WS_BASE } from '../utils/constants';

const DEFAULT_PARAMETERS = {
  weldType: 'SMAW',
  jointTypeCode: 'butt',
  positionCode: '1G',
  electrodeCode: 'E6013',
  material: 'mild_steel',
  current: 120,
  voltage: 24,
  weldingSpeed: 4,
  workpieceGap: 2,
  workpieceThickness: 6,
  electrodeAngle: 15,
  workAngle: 0,
  wireFeedSpeed: 6,
  gasFlow: 18,
};

/**
 * Custom hook for managing a welding session lifecycle.
 *
 * - Fetches /welding/config on mount so we can map human codes → DB IDs.
 * - startSession({ jointTypeCode, electrodeCode, positionCode, ... }) creates
 *   a session via POST /welding/session/start.
 * - completeSession() submits buffered telemetry (if any) then
 *   POST /welding/session/:id/complete and returns the assessment payload.
 */
export default function useWeldingSession() {
  const [sessionId, setSessionId] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [parameters, setParameters] = useState({ ...DEFAULT_PARAMETERS });
  const [telemetry, setTelemetry] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(null);
  const [config, setConfig] = useState(null);   // { jointTypes, electrodes, positions }

  const wsRef = useRef(null);
  const telemetryBufferRef = useRef([]);
  const startTimeRef = useRef(null);
  const timerRef = useRef(null);

  // ------------------------------------------------------------
  // Load config (joints, electrodes, positions) on mount
  // ------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    async function loadConfig() {
      try {
        const res = await weldingAPI.getConfig();
        if (!cancelled) setConfig(res.data);
      } catch (err) {
        console.warn('Could not load welding config:', err.message);
      }
    }
    loadConfig();
    return () => { cancelled = true; };
  }, []);

  // ------------------------------------------------------------
  // Lookup helpers
  // ------------------------------------------------------------
  const resolveIds = useCallback((params) => {
    if (!config) {
      throw new Error('Welding config not loaded yet');
    }

    // Match joint type by name (case-insensitive partial)
    const jointKey = (params.jointTypeCode || 'butt').toLowerCase();
    const joint = config.jointTypes.find((j) =>
      j.name.toLowerCase().includes(jointKey === 'tee' ? 't-' : jointKey)
    );
    if (!joint) throw new Error(`Unknown joint type: ${params.jointTypeCode}`);

    // Match electrode by code
    const electrode = config.electrodes.find((e) =>
      e.code === (params.electrodeCode || 'E6013')
    );
    if (!electrode) throw new Error(`Unknown electrode: ${params.electrodeCode}`);

    // Match position by code
    const position = config.positions.find((p) =>
      p.code === (params.positionCode || '1G')
    );
    if (!position) throw new Error(`Unknown position: ${params.positionCode}`);

    return {
      jointTypeId: joint.id,
      electrodeId: electrode.id,
      positionId: position.id,
    };
  }, [config]);

  // ------------------------------------------------------------
  // WebSocket connection
  // ------------------------------------------------------------
  const connectWebSocket = useCallback((userId) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_BASE);

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'auth', userId }));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'welding:alert') {
          setAlerts((prev) => [message, ...prev].slice(0, 10));
        }
      } catch (err) {
        console.error('WebSocket message error:', err);
      }
    };

    ws.onclose = () => { wsRef.current = null; };
    ws.onerror = (err) => { console.error('WebSocket error:', err); };

    wsRef.current = ws;
  }, []);

  // ------------------------------------------------------------
  // Start session
  // ------------------------------------------------------------
  const startSession = useCallback(async (userId, overrideParams = {}) => {
    try {
      setError(null);

      const merged = { ...parameters, ...overrideParams };
      const ids = resolveIds(merged);

      const payload = {
        ...ids,
        weldingSpeed: merged.weldingSpeed,
        weldingCurrent: merged.current,
        voltage: merged.voltage,
        workpieceGap: merged.workpieceGap,
        workpieceThickness: merged.workpieceThickness,
      };

      const res = await weldingAPI.startSession(payload);
      const newSessionId = res.data.session.id;

      setSessionId(newSessionId);
      setIsActive(true);
      setTelemetry([]);
      setAlerts([]);
      setDuration(0);
      startTimeRef.current = Date.now();
      telemetryBufferRef.current = [];

      if (userId) connectWebSocket(userId);

      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);

      return newSessionId;
    } catch (err) {
      setError(err.message || 'Failed to start session');
      throw err;
    }
  }, [parameters, resolveIds, connectWebSocket]);

  // ------------------------------------------------------------
  // Telemetry
  // ------------------------------------------------------------
  const addTelemetry = useCallback((reading) => {
    if (!isActive) return;

    const elapsedMs = startTimeRef.current
      ? Date.now() - startTimeRef.current
      : 0;

    // Map to the shape the backend `PUT /telemetry` route expects
    const normalized = {
      timestamp_ms: reading.timestamp_ms ?? elapsedMs,
      torch_x: reading.x ?? reading.torch_x ?? 0,
      torch_y: reading.y ?? reading.torch_y ?? 0,
      speed: reading.speed ?? 0,
      path_deviation: reading.deviation ?? reading.path_deviation ?? 0,
      current_reading: reading.current ?? parameters.current,
      heat_input: ((parameters.current * parameters.voltage) / 1000).toFixed(2),
      arc_length: reading.arc_length ?? 2,
      completion_pct: reading.completion_pct ?? 0,
    };

    telemetryBufferRef.current.push(normalized);
    setTelemetry((prev) => [...prev, normalized]);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'welding:telemetry',
        data: { sessionId, readings: [normalized] },
      }));
    }
  }, [isActive, sessionId, parameters]);

  // ------------------------------------------------------------
  // Complete session
  // ------------------------------------------------------------
  const completeSession = useCallback(async () => {
    try {
      if (timerRef.current) clearInterval(timerRef.current);
      setIsActive(false);

      const durationSeconds = startTimeRef.current
        ? Math.floor((Date.now() - startTimeRef.current) / 1000)
        : 0;

      // Send any buffered telemetry first
      if (telemetryBufferRef.current.length > 0 && sessionId) {
        await weldingAPI.submitTelemetry(sessionId, {
          readings: telemetryBufferRef.current,
        });
      }

      if (!sessionId) throw new Error('No active session');

      const res = await weldingAPI.completeSession(sessionId, { durationSeconds });

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'welding:stop', sessionId }));
      }

      // Return both the assessment payload AND the session id
      return { sessionId, ...res.data };
    } catch (err) {
      setError(err.message || 'Failed to complete session');
      throw err;
    }
  }, [sessionId]);

  // ------------------------------------------------------------
  // Misc helpers
  // ------------------------------------------------------------
  const updateParameter = useCallback((key, value) => {
    setParameters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetSession = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsActive(false);
    setSessionId(null);
    setTelemetry([]);
    setAlerts([]);
    setDuration(0);
    setError(null);
    telemetryBufferRef.current = [];
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  return {
    // State
    sessionId,
    isActive,
    parameters,
    telemetry,
    alerts,
    duration,
    error,
    config,

    // Actions
    startSession,
    completeSession,
    addTelemetry,
    updateParameter,
    resetSession,
    setParameters,

    // Aliases for convenience
    sendTelemetry: addTelemetry,
    stopSession: completeSession,
  };
}
