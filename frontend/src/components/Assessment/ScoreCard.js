import React from 'react';
import GradeDisplay from './GradeDisplay';
import { GRADES } from '../../utils/constants';

function getGrade(score) {
  if (score >= GRADES.DISTINCTION.min) return { ...GRADES.DISTINCTION, key: 'Distinction' };
  if (score >= GRADES.CREDIT.min) return { ...GRADES.CREDIT, key: 'Credit' };
  if (score >= GRADES.PASS.min) return { ...GRADES.PASS, key: 'Pass' };
  return { ...GRADES.FAIL, key: 'Fail' };
}

export default function ScoreCard({ results }) {
  if (!results) return null;

  const overall = results.overallScore ?? results.score ?? 0;
  const grade = getGrade(overall);

  return (
    <div className="score-card">
      <div className="score-header">
        <h2>Assessment Results</h2>
      </div>
      <div className="score-body">
        <div className="overall-score">
          <div className="score-ring" style={{ '--score-pct': `${overall}%` }}>
            <span className="score-number">{overall.toFixed(0)}</span>
            <span className="score-max">/100</span>
          </div>
        </div>
        <GradeDisplay grade={grade.key} color={grade.color} />
        <div className="score-meta">
          <span>Session: {results.sessionId || '—'}</span>
          <span>Joint: {results.jointType || '—'}</span>
          <span>Duration: {results.duration ? `${(results.duration / 60).toFixed(1)} min` : '—'}</span>
        </div>
      </div>
    </div>
  );
}
