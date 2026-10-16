const { FeedbackGenerator } = require('../../src/services/feedbackGenerator');

describe('FeedbackGenerator', () => {
  let generator;
  beforeEach(() => {
    generator = new FeedbackGenerator();
  });

  const mockAssessment = {
    overallScore: 65,
    grade: 'credit',
    speedAccuracyScore: 80,
    beadQualityScore: 70,
    fusionQualityScore: 65,
    penetrationScore: 60,
    alignmentScore: 55,
    consistencyScore: 50,
    processControlScore: 75,
  };

  const mockDefects = [
    {
      type: 'porosity',
      defectType: 'porosity',
      category: 'surface',
      defectCategory: 'surface',
      severity: 'moderate',
      probability: 0.35,
      description: 'Gas pockets',
      cause: 'Contamination',
      correctiveAction: 'Clean surface',
      recommendation: 'Clean surface',
    },
  ];

  const mockSession = {
    process_type: 'SMAW',
    position_code: '1G',
    joint_type: 'butt',
  };

  describe('generate()', () => {
    test('returns all expected fields', () => {
      const result = generator.generate(mockAssessment, mockDefects, null, mockSession);

      expect(result).toHaveProperty('aiFeedbackSummary');
      expect(result).toHaveProperty('strengths');
      expect(result).toHaveProperty('weaknesses');
      expect(result).toHaveProperty('improvements');
      expect(result).toHaveProperty('practiceRecommendations');

      expect(typeof result.aiFeedbackSummary).toBe('string');
      expect(Array.isArray(result.strengths)).toBe(true);
      expect(Array.isArray(result.weaknesses)).toBe(true);
      expect(Array.isArray(result.improvements)).toBe(true);
      expect(Array.isArray(result.practiceRecommendations)).toBe(true);
    });

    test('does not crash with empty defects and no competency results', () => {
      const result = generator.generate(mockAssessment, [], null, mockSession);
      expect(result.aiFeedbackSummary).toBeTruthy();
      expect(result.strengths.length).toBeGreaterThan(0);
    });

    test('does not crash with defects missing defectType', () => {
      const badDefects = [{ probability: 0.4, severity: 'high' }];
      expect(() => generator.generate(mockAssessment, badDefects, null, mockSession)).not.toThrow();
    });

    test('handles distinction grade without issues', () => {
      const excellent = { ...mockAssessment, overallScore: 90, grade: 'distinction' };
      const result = generator.generate(excellent, [], null, mockSession);
      expect(result.aiFeedbackSummary).toContain('Outstanding');
    });

    test('handles fail grade without issues', () => {
      const failed = { ...mockAssessment, overallScore: 30, grade: 'fail' };
      const result = generator.generate(failed, mockDefects, null, mockSession);
      expect(result.aiFeedbackSummary).toContain('Below Standard');
    });
  });
});
