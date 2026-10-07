import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyticsAPI } from '../../utils/apiClient';
import TrendChart from './TrendChart';

const num = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};
const int = (v, fallback = 0) => Math.round(num(v, fallback));

function normalize(res) {
  const data = res?.data || {};
  const summary = data.classSummary || {};
  const defects = data.commonDefects || [];
  const topStudents = data.topStudents || [];
  const trends = data.cohortTrend || [];

  return {
    totalStudents: int(summary.total_students),
    activeStudents: int(summary.active_students),
    avgScoreAll: num(summary.avg_score),
    gradeDistribution: {
      Distinction: int(summary.distinction_count),
      Credit: int(summary.credit_count),
      Pass: int(summary.pass_count),
      Fail: int(summary.fail_count),
    },
    topStudents: topStudents.map((s) => ({
      userId: s.user_id,
      name: s.name,
      avgScore: num(s.avg_score),
      sessions: int(s.total_sessions),
      bestScore: num(s.best_score),
    })),
    cohortProgress: trends.map((t) => ({
      date: (t.week || '').slice(5), // MM-DD from YYYY-MM-DD
      score: num(t.avg_score),
      attempts: int(t.attempts),
    })),
    commonDefects: defects.map((d) => ({
      defectType: d.defect_type,
      category: d.defect_category,
      count: int(d.occurrence_count),
      avgProbability: num(d.avg_probability),
    })),
  };
}

export default function TrainerDashboard() {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await analyticsAPI.getTrainerClassSummary();
      setAnalytics(normalize(res));
    } catch (err) {
      console.error('Failed to load trainer analytics:', err);
      setError(err?.error || err?.message || 'Failed to load cohort data');
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <div className="dashboard-loading">Loading cohort data…</div>;

  if (error) {
    return (
      <div className="dashboard-error">
        <p>Could not load cohort: {error}</p>
        <button className="btn btn-primary" onClick={load}>Retry</button>
      </div>
    );
  }

  if (!analytics || analytics.totalStudents === 0) {
    return (
      <div className="trainer-dashboard">
        <h2>Trainer Dashboard</h2>
        <div className="empty-state">
          <p>No students or sessions yet.</p>
        </div>
      </div>
    );
  }

  const maxGrade = Math.max(1, ...Object.values(analytics.gradeDistribution));

  return (
    <div className="trainer-dashboard">
      <h2>Trainer Dashboard</h2>

      <div className="stat-cards">
        <div className="stat-card">
          <span className="stat-card-value">{analytics.totalStudents}</span>
          <span className="stat-card-label">Total Students</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-value">{analytics.activeStudents}</span>
          <span className="stat-card-label">Active Students</span>
        </div>
        <div className="stat-card accent-amber">
          <span className="stat-card-value">{analytics.avgScoreAll.toFixed(0)}</span>
          <span className="stat-card-label">Cohort Avg Score</span>
        </div>
      </div>

      <div className="chart-row">
        <div className="chart-card wide">
          <h3>Cohort Progression (Last 8 Weeks)</h3>
          {analytics.cohortProgress.length > 0 ? (
            <TrendChart data={analytics.cohortProgress} />
          ) : (
            <p className="chart-empty">No completed sessions in the last 8 weeks.</p>
          )}
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-section">
          <h3>🏆 Top Students</h3>
          {analytics.topStudents.length > 0 ? (
            <table className="rank-table">
              <thead>
                <tr><th>#</th><th>Name</th><th>Avg</th><th>Best</th><th>Sessions</th></tr>
              </thead>
              <tbody>
                {analytics.topStudents.map((s, i) => (
                  <tr
                    key={i}
                    className="trainer-row-clickable"
                    onClick={() => navigate(`/trainer/student/${s.userId}`)}
                    title="Click to view this student's progress"
                  >
                    <td>{i + 1}</td>
                    <td>{s.name}</td>
                    <td>{s.avgScore.toFixed(0)}</td>
                    <td>{s.bestScore.toFixed(0)}</td>
                    <td>{s.sessions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="chart-empty">No student data yet.</p>
          )}
        </div>

        <div className="dashboard-section">
          <h3>⚠️ Common Defects</h3>
          {analytics.commonDefects.length > 0 ? (
            <div className="weak-area-list">
              {analytics.commonDefects.slice(0, 5).map((d, i) => (
                <div key={i} className="weak-area-item">
                  <span className="weak-area-name">
                    {d.defectType.replace(/_/g, ' ')}
                  </span>
                  <span className="weak-area-score">{d.count}×</span>
                  <div
                    className="weak-area-bar"
                    style={{ width: `${Math.min(100, d.avgProbability * 100)}%` }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="chart-empty">No defects recorded yet.</p>
          )}
        </div>

        <div className="dashboard-section">
          <h3>📊 Grade Distribution</h3>
          <div className="grade-dist-bars">
            {Object.entries(analytics.gradeDistribution).map(([grade, count]) => (
              <div key={grade} className="grade-dist-row">
                <span className="grade-dist-label">{grade}</span>
                <div
                  className="grade-dist-bar"
                  style={{
                    '--count': count,
                    '--max': maxGrade,
                    width: `${(count / maxGrade) * 100}%`,
                    height: 12,
                    background: '#3b82f6',
                    borderRadius: 6,
                  }}
                />
                <span className="grade-dist-count">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
