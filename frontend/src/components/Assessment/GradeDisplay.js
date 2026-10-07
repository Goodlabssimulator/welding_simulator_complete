import React from 'react';

const GRADE_STYLES = {
  Distinction: { bg: '#065f46', color: '#6ee7b7', icon: '🏆' },
  Credit: { bg: '#713f12', color: '#fcd34d', icon: '⭐' },
  Pass: { bg: '#1e3a5f', color: '#93c5fd', icon: '✓' },
  Fail: { bg: '#7f1d1d', color: '#fca5a5', icon: '✕' },
};

export default function GradeDisplay({ grade, color }) {
  const style = GRADE_STYLES[grade] || GRADE_STYLES.Fail;

  return (
    <div
      className="grade-display"
      style={{
        background: style.bg,
        color: style.color,
        borderColor: style.color,
      }}
    >
      <span className="grade-icon">{style.icon}</span>
      <span className="grade-text">{grade.toUpperCase()}</span>
    </div>
  );
}
