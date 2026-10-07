import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { analyticsAPI } from '../utils/apiClient';
import { useAuth } from '../hooks/useAuth';
import SessionHistoryChart from '../components/Analytics/SessionHistoryChart';
import SessionList from '../components/Analytics/SessionList';
import CompetencyChart from '../components/Analytics/CompetencyChart';
import UserMenu from '../components/Common/UserMenu';

const num = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};
const int = (v, fallback = 0) => Math.round(num(v, fallback));

function normalize(raw) {
  const sessions = (raw.sessions || []).map((s) => ({
    id: s.id,
    started_at: s.started_at,
    completed_at: s.completed_at,
    duration_seconds: int(s.duration_seconds),
    joint_name: s.joint_name,
    position_code: s.position_code,
    overall_score: num(s.overall_score),
    grade: s.grade,
  }));

  // Latest competency per code (from the flat list)
  const latestByCode = new Map();
  for (const c of raw.competencies || []) {
    latestByCode.set(c.code, c); // last one wins (ordered ASC by assessed_at)
  }
  const competencies = Array.from(latestByCode.values()).map((c) => ({
    code: c.code,
    name: c.name,
    category: c.category,
    level: c.level,
    score: num(c.score),
  }));

  return {
    sessions,
    competencies,
    summary: {
      totalSessions: int(raw.summary?.total_sessions),
      avgScore: num(raw.summary?.avg_score),
      bestScore: num(raw.summary?.best_score),
      worstScore: num(raw.summary?.worst_score),
    },
  };
}

export default function StudentProgressPage() {
  const { studentId: routeStudentId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  // If a trainer clicked a student, use the route param.
  // If a student, use their own id.
  const studentId = routeStudentId || user?.id;
  const isTrainerView = !!routeStudentId && routeStudentId !== user?.id;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await analyticsAPI.getStudentProgress(studentId);
      setData(normalize(res.data || {}));
    } catch (err) {
      console.error('Failed to load progress:', err);
      setError(err?.error || err?.message || 'Failed to load progress');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <div className="dashboard-loading">Loading progress…</div>;
  if (error) return <div className="dashboard-error">{error}</div>;
  if (!data) return null;

  const backLink = isTrainerView ? '/trainer' : '/student';
  const title = isTrainerView ? 'Student Progress' : 'My Progress';

  return (
    <div className="progress-page">
      <div className="page-header">
        <div>
          <Link to={backLink} className="back-link">← Back</Link>
          <h2>{title}</h2>
        </div>
        <UserMenu />
      </div>

      <div className="stat-cards">
        <div className="stat-card">
          <span className="stat-card-value">{data.summary.totalSessions}</span>
          <span className="stat-card-label">Sessions Completed</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-value">{data.summary.avgScore.toFixed(0)}</span>
          <span className="stat-card-label">Average Score</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-value">{data.summary.bestScore.toFixed(0)}</span>
          <span className="stat-card-label">Best Score</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-value">{data.summary.worstScore.toFixed(0)}</span>
          <span className="stat-card-label">First Session</span>
        </div>
      </div>

      <div className="chart-card wide">
        <h3>Progression (all sessions, oldest → newest)</h3>
        <SessionHistoryChart sessions={data.sessions} />
      </div>

      {data.competencies.length > 0 && (
        <div className="chart-card">
          <h3>Current Competency Status</h3>
          <CompetencyChart competencies={data.competencies} />
        </div>
      )}

      <div className="chart-card wide">
        <h3>All Sessions ({data.sessions.length})</h3>
        <p className="chart-hint">Click any row to see the full assessment for that session.</p>
        <SessionList sessions={data.sessions} />
      </div>
    </div>
  );
}
