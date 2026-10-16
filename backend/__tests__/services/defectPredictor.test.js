const { DefectPredictor } = require('../../src/services/defectPredictor');

describe('DefectPredictor', () => {
  let predictor;
  beforeEach(() => {
    predictor = new DefectPredictor();
  });

  describe('predict()', () => {
    test('returns array of defect objects', () => {
      const session = { process_type: 'SMAW', position_code: '1G' };
      const telemetry = [{ speed: 4, voltage: 24, current: 120 }];
      const result = predictor.predict(session, telemetry, null);
      expect(Array.isArray(result)).toBe(true);
      result.forEach((d) => {
        expect(d).toHaveProperty('defectType');
        expect(d).toHaveProperty('defectCategory');
        expect(d).toHaveProperty('severity');
        expect(d).toHaveProperty('probability');
      });
    });

    test('severity is one of low/medium/high (pre-adapter)', () => {
      const session = { process_type: 'SMAW' };
      const telemetry = [{ speed: 4, voltage: 24, current: 120 }];
      const result = predictor.predict(session, telemetry, null);
      result.forEach((d) => {
        expect(['low', 'medium', 'high']).toContain(d.severity);
      });
    });
  });

  describe('predictFromTelemetry() — the DB adapter', () => {
    test('returns defects with DB-compatible severity', () => {
      const session = { process_type: 'SMAW', position_code: '1G' };
      const telemetry = [
        { speed: 10, voltage: 30, current: 200 },  // triggers high-speed defects
        { speed: 10, voltage: 30, current: 200 },
      ];
      const result = predictor.predictFromTelemetry(telemetry, session);
      expect(Array.isArray(result)).toBe(true);
      result.forEach((d) => {
        expect(['minor', 'moderate', 'severe', 'critical']).toContain(d.severity);
        expect(d).toHaveProperty('type');
        expect(d).toHaveProperty('category');
        expect(d).toHaveProperty('probability');
        expect(d).toHaveProperty('description');
        expect(d).toHaveProperty('cause');
        expect(d).toHaveProperty('correctiveAction');
      });
    });

    test('does not produce undefined severity', () => {
      const session = { process_type: 'GMAW' };
      const telemetry = [{ speed: 5, voltage: 22, current: 150 }];
      const result = predictor.predictFromTelemetry(telemetry, session);
      result.forEach((d) => {
        expect(d.severity).toBeDefined();
        expect(typeof d.severity).toBe('string');
      });
    });
  });
});
