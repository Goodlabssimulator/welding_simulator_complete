const { CompetencyEvaluator } = require('../../src/services/competencyEvaluator');

describe('CompetencyEvaluator', () => {
  let evaluator;
  beforeEach(() => {
    evaluator = new CompetencyEvaluator();
  });

  describe('evaluateFromSession()', () => {
    const mockAssessment = {
      overallScore: 65,
      grade: 'credit',
      speedAccuracy: 80,
      beadQuality: 70,
      fusionQuality: 65,
      penetration: 60,
      alignment: 55,
      consistency: 50,
      processControl: 75,
    };
    const mockSession = { id: 'session-uuid' };
    const mockFramework = [
      { id: 1, code: 'JP-01', name: 'Joint Preparation', category: 'preparation' },
      { id: 2, code: 'WP-01', name: 'Parameter Selection', category: 'preparation' },
      { id: 3, code: 'TC-01', name: 'Torch Control', category: 'execution' },
      { id: 4, code: 'TS-01', name: 'Travel Speed Control', category: 'execution' },
      { id: 5, code: 'DI-01', name: 'Defect Identification', category: 'evaluation' },
      { id: 6, code: 'WQ-01', name: 'Weld Quality Evaluation', category: 'evaluation' },
      { id: 7, code: 'SA-01', name: 'Safety Awareness', category: 'safety' },
    ];

    test('returns records for every framework code that has a mapping', () => {
      const results = evaluator.evaluateFromSession(mockAssessment, mockSession, mockFramework);
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(mockFramework.length);
      results.forEach((r) => {
        expect(r).toHaveProperty('frameworkId');
        expect(r).toHaveProperty('code');
        expect(r).toHaveProperty('name');
        expect(r).toHaveProperty('level');
        expect(r).toHaveProperty('score');
        expect(r).toHaveProperty('evidence');
      });
    });

    test('score is always finite and within [0, 100]', () => {
      const results = evaluator.evaluateFromSession(mockAssessment, mockSession, mockFramework);
      results.forEach((r) => {
        expect(Number.isFinite(r.score)).toBe(true);
        expect(r.score).toBeGreaterThanOrEqual(0);
        expect(r.score).toBeLessThanOrEqual(100);
      });
    });

    test('level is one of competent/developing/not_yet_competent', () => {
      const results = evaluator.evaluateFromSession(mockAssessment, mockSession, mockFramework);
      results.forEach((r) => {
        expect(['competent', 'developing', 'not_yet_competent']).toContain(r.level);
      });
    });

    test('handles missing scores gracefully (NaN-safe)', () => {
      const brokenAssessment = {
        overallScore: NaN,
        speedAccuracy: undefined,
        beadQuality: null,
        fusionQuality: NaN,
        penetration: undefined,
        alignment: undefined,
        consistency: undefined,
        processControl: undefined,
      };
      const results = evaluator.evaluateFromSession(brokenAssessment, mockSession, mockFramework);
      results.forEach((r) => {
        expect(Number.isFinite(r.score)).toBe(true);
      });
    });

    test('maps framework codes to the correct assessment sub-scores', () => {
      const results = evaluator.evaluateFromSession(mockAssessment, mockSession, mockFramework);
      const byCode = Object.fromEntries(results.map((r) => [r.code, r]));

      // TS-01 maps to speedAccuracy + consistency = (80 + 50) / 2 = 65
      expect(byCode['TS-01'].score).toBeCloseTo(65, 0);

      // WP-01 maps to processControl only = 75
      expect(byCode['WP-01'].score).toBeCloseTo(75, 0);
    });
  });

  describe('_assignLevel()', () => {
    test('competent >= 65', () => {
      expect(evaluator._assignLevel(70)).toBe('competent');
      expect(evaluator._assignLevel(65)).toBe('competent');
    });
    test('developing 45-64', () => {
      expect(evaluator._assignLevel(50)).toBe('developing');
      expect(evaluator._assignLevel(45)).toBe('developing');
    });
    test('not_yet_competent < 45', () => {
      expect(evaluator._assignLevel(40)).toBe('not_yet_competent');
      expect(evaluator._assignLevel(0)).toBe('not_yet_competent');
    });
  });
});
