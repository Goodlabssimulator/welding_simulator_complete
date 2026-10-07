import React from 'react';
import { useNavigate } from 'react-router-dom';

const GRADE_LABELS = {
  distinction: 'Distinction',
  credit: 'Credit',
  pass: 'Pass',
  fail: 'Fail',
};

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return '—';
  const s = Number(seconds);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}m ${rem}s`;
}

export default function SessionList({ sessions, showStudent = false, onSelect }) {
  const navigate = useNavigate();

  if (!sessions || sessions.length === 0) {
    return <p className="session-list-empty">No sessions to show.</p>;
  }

  const handleClick = (session) => {
    if (onSelect) {
      onSelect(session);
    } else {
      navigate(`/results/${session.id}`);
    }
  };

  return (
    <div className="session-list-wrap">
      <table className="session-list-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Date</th>
            <th>Joint</th>
            <th>Position</th>
            <th>Duration</th>
            <th>Score</th>
            <th>Grade</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((s, i) => {
            const score = Number(s.overall_score);
            const grade = (s.grade || '').toLowerCase();
            return (
              <tr
                key={s.id}
                className="session-row"
                onClick={() => handleClick(s)}
                title="Click to view full results"
              >
                <td>{i + 1}</td>
                <td>{formatDate(s.completed_at || s.started_at)}</td>
                <td>{s.joint_name || '—'}</td>
                <td>{s.position_code || '—'}</td>
                <td>{formatDuration(s.duration_seconds)}</td>
                <td>
                  {Number.isFinite(score) ? score.toFixed(1) : '—'}
                </td>
                <td>
                  <span className={`grade-badge grade-${grade}`}>
                    {GRADE_LABELS[grade] || '—'}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
