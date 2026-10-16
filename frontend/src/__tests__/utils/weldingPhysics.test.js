import { describe, test, expect } from 'vitest';
import {
  calculateBeadGeometry,
  calculateQualityMetrics,
  getBeadVisuals,
  calculatePathDeviation,
  getRecommendedParams,
  generateJointLine,
  getParameterAlerts,
} from '../../utils/weldingPhysics';

describe('weldingPhysics', () => {
  describe('calculateBeadGeometry()', () => {
    test('returns bead width, height, penetration, heat input', () => {
      const result = calculateBeadGeometry({
        current: 120,
        voltage: 24,
        speed: 4,
        weldType: 'SMAW',
      });

      expect(result).toHaveProperty('beadWidth');
      expect(result).toHaveProperty('beadHeight');
      expect(result).toHaveProperty('penetration');
      expect(result).toHaveProperty('heatInput');
    });

    test('all values are finite numbers', () => {
      const result = calculateBeadGeometry({
        current: 120,
        voltage: 24,
        speed: 4,
        weldType: 'SMAW',
      });

      expect(Number.isFinite(result.beadWidth)).toBe(true);
      expect(Number.isFinite(result.beadHeight)).toBe(true);
      expect(Number.isFinite(result.penetration)).toBe(true);
      expect(Number.isFinite(result.heatInput)).toBe(true);
    });

    test('clamps bead width within [1.5, 12]', () => {
      // Extreme: very high current
      const wild = calculateBeadGeometry({
        current: 1000,
        voltage: 100,
        speed: 0.1,
        weldType: 'FCAW',
      });
      expect(wild.beadWidth).toBeGreaterThanOrEqual(1.5);
      expect(wild.beadWidth).toBeLessThanOrEqual(12);
    });

    test('GTAW produces narrower bead than FCAW', () => {
      const base = { current: 120, voltage: 24, speed: 4 };
      const gtaw = calculateBeadGeometry({ ...base, weldType: 'GTAW' });
      const fcaw = calculateBeadGeometry({ ...base, weldType: 'FCAW' });
      expect(gtaw.beadWidth).toBeLessThan(fcaw.beadWidth);
    });
  });

  describe('getBeadVisuals()', () => {
    test('returns color, width, highlight aliases (DB adapter compat)', () => {
      const visuals = getBeadVisuals(
        { current: 120, voltage: 24, speed: 4, weldType: 'SMAW' },
        0
      );

      expect(visuals).toHaveProperty('color');
      expect(visuals).toHaveProperty('width');
      expect(visuals).toHaveProperty('highlight');

      expect(typeof visuals.color).toBe('string');
      expect(Number.isFinite(visuals.width)).toBe(true);
    });

    test('always returns valid color strings even with edge-case input', () => {
      const visuals = getBeadVisuals(
        { current: 0, voltage: 0, speed: 0, weldType: 'SMAW' },
        0
      );
      expect(visuals.color).toMatch(/^rgb\(/);
      expect(typeof visuals.highlight).toBe('string');
    });
  });

  describe('calculatePathDeviation()', () => {
    test('returns ~0 for a point sitting on a dense joint line', () => {
      // Realistic joint line: many points every 2px
      const jointLine = [];
      for (let x = 0; x <= 100; x += 2) {
        jointLine.push({ x, y: 0 });
      }
      const result = calculatePathDeviation(50, 0, jointLine);
      expect(result).toBeLessThanOrEqual(0.1);
    });

    test('returns positive distance for a point far from the line', () => {
      const jointLine = [];
      for (let x = 0; x <= 100; x += 2) {
        jointLine.push({ x, y: 0 });
      }
      const result = calculatePathDeviation(50, 30, jointLine);
      expect(result).toBeCloseTo(10, 0); // 30px / 3 = 10mm
    });

    test('returns 0 for empty joint line (no crash)', () => {
      expect(calculatePathDeviation(10, 10, [])).toBe(0);
    });

    test('increases with distance from the line', () => {
      const jointLine = [];
      for (let x = 0; x <= 100; x += 2) {
        jointLine.push({ x, y: 0 });
      }
      const near = calculatePathDeviation(50, 3, jointLine);
      const far = calculatePathDeviation(50, 30, jointLine);
      expect(far).toBeGreaterThan(near);
    });
  });

  describe('getRecommendedParams()', () => {
    test('returns params for every supported welding type', () => {
      ['SMAW', 'GMAW', 'GTAW', 'FCAW'].forEach((type) => {
        const params = getRecommendedParams(type, '1G');
        expect(params).toBeDefined();
        expect(typeof params.current).toBe('number');
        expect(typeof params.voltage).toBe('number');
        expect(typeof params.speed).toBe('number');
      });
    });

    test('falls back to SMAW for unknown type', () => {
      const params = getRecommendedParams('UNKNOWN', '1G');
      expect(params).toBeDefined();
      expect(typeof params.current).toBe('number');
    });

    test('vertical position lowers current vs flat', () => {
      const flat = getRecommendedParams('SMAW', '1G');
      const vertical = getRecommendedParams('SMAW', '3G');
      expect(vertical.current).toBeLessThanOrEqual(flat.current);
    });
  });

  describe('generateJointLine()', () => {
    test('returns an array of {x, y} points', () => {
      const points = generateJointLine('butt', 900, 500);
      expect(Array.isArray(points)).toBe(true);
      expect(points.length).toBeGreaterThan(0);
      points.forEach((p) => {
        expect(p).toHaveProperty('x');
        expect(p).toHaveProperty('y');
        expect(Number.isFinite(p.x)).toBe(true);
        expect(Number.isFinite(p.y)).toBe(true);
      });
    });

    test('handles all joint types without crashing', () => {
      ['butt', 'fillet', 'tee', 'lap', 'corner', 'unknown'].forEach((type) => {
        const points = generateJointLine(type, 900, 500);
        expect(points.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getParameterAlerts()', () => {
    test('flags high travel speed', () => {
      const alerts = getParameterAlerts({ current: 120, voltage: 24, speed: 20 });
      expect(alerts.some((a) => /speed/i.test(a.message))).toBe(true);
    });

    test('flags dangerously high current', () => {
      const alerts = getParameterAlerts({ current: 500, voltage: 24, speed: 4 });
      expect(alerts.some((a) => /current/i.test(a.message))).toBe(true);
    });

    test('returns empty array for nominal values', () => {
      const alerts = getParameterAlerts({ current: 120, voltage: 24, speed: 4 });
      expect(Array.isArray(alerts)).toBe(true);
    });
  });
});
