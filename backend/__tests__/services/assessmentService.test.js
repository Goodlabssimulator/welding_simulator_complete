const { AssessmentService } = require('../../src/services/assessmentService');

describe('AssessmentService', () => {
  let service;
  beforeEach(() => {
    service = new AssessmentService();
  });

  describe('assess()', () => {
    test('returns all 7 sub-scores with valid grades', () => {
      const session = {
        process_type: 'SMAW',
        position_code: '1G',
        joint_type_id: 1,
      };
      const telemetry = [
        { speed: 4, voltage: 24, current: 120, wire_speed: 6, travel_angle: 15, work_angle: 45, contact_tip_distance: 12 },
        { speed: 4.2, voltage: 24.1, current: 121, wire_speed: 6.1, travel_angle: 15.2, work_angle: 45.1, contact_tip_distance: 12.1 },
        { speed: 3.9, voltage: 23.9, current: 119, wire_speed: 5.9, travel_angle: 14.8, work_angle: 44.9, contact_tip_distance: 11.9 },
        { speed: 4.1, voltage: 24.05, current: 120.5, wire_speed: 6.05, travel_angle: 15.1, work_angle: 45.05, contact_tip_distance: 12.05 },
      ];

      const result = service.assess(session, telemetry);

      expect(result).toHaveProperty('overallScore');
      expect(result).toHaveProperty('grade');
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      expect(['distinction', 'credit', 'pass', 'fail']).toContain(result.grade);

      // Sub-scores must be finite numbers in [0, 100]
      const subScores = [
        result.speedAccuracyScore,
        result.beadQualityScore,
        result.fusionQualityScore,
        result.penetrationScore,
        result.alignmentScore,
        result.consistencyScore,
        result.processControlScore,
      ];
      subScores.forEach((s) => {
        expect(Number.isFinite(s)).toBe(true);
        expect(s).toBeGreaterThanOrEqual(0);
        expect(s).toBeLessThanOrEqual(100);
      });
    });

    test('handles empty telemetry without crashing', () => {
      const session = { process_type: 'SMAW', position_code: '1G' };
      const result = service.assess(session, []);
      expect(Number.isFinite(result.overallScore)).toBe(true);
      expect(Number.isFinite(result.speedAccuracyScore)).toBe(true);
    });

    test('never produces NaN even with malformed telemetry', () => {
      const session = { process_type: 'SMAW' };
      const telemetry = [
        { speed: 'not-a-number', voltage: undefined, current: null },
        { speed: NaN, voltage: NaN },
        {},
      ];
      const result = service.assess(session, telemetry);
      const allScores = [
        result.overallScore,
        result.speedAccuracyScore,
        result.beadQualityScore,
        result.fusionQualityScore,
        result.penetrationScore,
        result.alignmentScore,
        result.consistencyScore,
        result.processControlScore,
      ];
      allScores.forEach((s) => {
        expect(Number.isFinite(s)).toBe(true);
      });
    });
  });

  describe('evaluate()', () => {
    test('returns the fields expected by the welding route', () => {
      const telemetry = [
        { speed: 4, voltage: 24, current: 120 },
        { speed: 4.1, voltage: 24.1, current: 120.5 },
      ];
      const session = { process_type: 'SMAW', position_code: '1G' };

      const result = service.evaluate(telemetry, session);

      expect(result).toHaveProperty('overallScore');
      expect(result).toHaveProperty('grade');
      expect(result).toHaveProperty('speedAccuracy');
      expect(result).toHaveProperty('beadQuality');
      expect(result).toHaveProperty('fusionQuality');
      expect(result).toHaveProperty('penetration');
      expect(result).toHaveProperty('alignment');
      expect(result).toHaveProperty('consistency');
      expect(result).toHaveProperty('processControl');
      expect(result).toHaveProperty('avgSpeed');
      expect(result).toHaveProperty('speedVariance');
    });

    test('overall score is a number, not a string', () => {
      const session = { process_type: 'SMAW' };
      const result = service.evaluate([{ speed: 4, voltage: 24, current: 120 }], session);
      expect(typeof result.overallScore).toBe('number');
    });
  });

  describe('grade assignment', () => {
    test('distinction >= 80', () => {
      expect(service._assignGrade(85)).toBe('distinction');
      expect(service._assignGrade(80)).toBe('distinction');
    });
    test('credit 65-79', () => {
      expect(service._assignGrade(70)).toBe('credit');
      expect(service._assignGrade(65)).toBe('credit');
    });
    test('pass 50-64', () => {
      expect(service._assignGrade(55)).toBe('pass');
      expect(service._assignGrade(50)).toBe('pass');
    });
    test('fail < 50', () => {
      expect(service._assignGrade(40)).toBe('fail');
      expect(service._assignGrade(0)).toBe('fail');
    });
  });
});
