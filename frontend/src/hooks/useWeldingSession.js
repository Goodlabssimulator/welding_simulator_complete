import { useState, useCallback, useRef, useEffect } from 'react';
import { weldingAPI } from '../utils/apiClient';
import { WS_BASE, TELEMETRY_SAMPLE_RATE } from '../utils/constants';

/**
 * Custom hook for managing a welding session lifecycle
 * Handles: session start/stop, WebSocket telemetry, parameter tracking
 */
export default function useWeldingSession() {
  const [sessionId, setSessionId] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [parameters, setParameters] = useState({
    weldType: 'SMAW',
    jointType: 'butt',
    position: '1G',
    material: 'mild_steel',
    current: 120,
    voltage: 24,
    speed: 4,
    electrodeAngle: 15,
    workAngle: 0,
    wireFeedSpeed: 6,
    gasFlow: 18,
  });
  const [telemetry, setTelemetry] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(null);

  const wsRef = useRef(null);
  const telemetryBufferRef = useRef([]);
  const startTimeRef = useRef(null);
  const timerRef = useRef(null);
  const telemetryIntervalRef = useRef(null);

  // Connect WebSocket
  const connectWebSocket = useCallback((userId) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_BASE);
    
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'auth', userId }));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case 'welding:alert':
            setAlerts(prev => [message, ...prev].slice(0, 10));
            break;
          case 'welding:feedback':
            // Real-time feedback handled by the welding page
            break;
          case 'auth_confirmed':
            console.log('WebSocket authenticated');
            break;
        }
      } catch (err) {
        console.error('WebSocket message error:', err);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      wsRef.current = null;
    };

    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
    };

    wsRef.current = ws;
  }, []);

  // Start session
  const startSession = useCallback(async (userId) => {
    try {
      setError(null);
      const res = await weldingAPI.startSession({
        weldType: parameters.weldType,
        jointType: parameters.jointType,
        position: parameters.position,
        material: parameters.material,
        parameters: {
          current: parameters.current,
          voltage: parameters.voltage,
          speed: parameters.speed,
          electrodeAngle: parameters.electrodeAngle,
          workAngle: parameters.workAngle,
          wireFeedSpeed: parameters.wireFeedSpeed,
          gasFlow: parameters.gasFlow,
        },
      });

      const newSessionId = res.data.session.id;
      setSessionId(newSessionId);
      setIsActive(true);
      setTelemetry([]);
      setAlerts([]);
      setDuration(0);
      startTimeRef.current = Date.now();

      // Connect WebSocket
      connectWebSocket(userId);

      // Start timer
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);

      // Start telemetry buffering
      telemetryBufferRef.current = [];

      return newSessionId;
    } catch (err) {
      setError(err.message || 'Failed to start session');
      throw err;
    }
  }, [parameters, connectWebSocket]);

  // Add telemetry reading
  const addTelemetry = useCallback((reading) => {
    if (!isActive) return;

    const enrichedReading = {
      ...reading,
      timestamp_ms: Date.now() - startTimeRef.current,
      parameters: { ...parameters },
    };

    telemetryBufferRef.current.push(enrichedReading);
    setTelemetry(prev => [...prev, enrichedReading]);

    // Send via WebSocket for real-time analysis
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'welding:telemetry',
        data: {
          sessionId,
          readings: [enrichedReading],
        },
      }));
    }
  }, [isActive, sessionId, parameters]);

  // Pause/resume
  const togglePause = useCallback(() => {
    setIsPaused(prev => !prev);
  }, []);

  // Complete session
  const completeSession = useCallback(async () => {
    try {
      if (timerRef.current) clearInterval(timerRef.current);
      setIsActive(false);
      setIsPaused(false);

      // Send final telemetry batch via HTTP
      if (telemetryBufferRef.current.length > 0 && sessionId) {
        await weldingAPI.submitTelemetry(sessionId, {
          readings: telemetryBufferRef.current,
        });
      }

      // Complete the session
      if (sessionId) {
        const res = await weldingAPI.completeSession(sessionId);
        
        // Notify WebSocket
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'welding:stop',
            sessionId,
          }));
        }

        return res.data;
      }
    } catch (err) {
      setError(err.message || 'Failed to complete session');
      throw err;
    }
  }, [sessionId]);

  // Update a single parameter
  const updateParameter = useCallback((key, value) => {
    setParameters(prev => ({ ...prev, [key]: value }));
  }, []);

  // Reset session
  const resetSession = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsActive(false);
    setIsPaused(false);
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
      if (telemetryIntervalRef.current) clearInterval(telemetryIntervalRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  return {
    sessionId,
    isActive,
    isPaused,
    parameters,
    telemetry,
    alerts,
    duration,
    error,
    startSession,
    completeSession,
    togglePause,
    addTelemetry,
    updateParameter,
    resetSession,
    setParameters,
  };
}
