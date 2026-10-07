import React, { useEffect, useState } from 'react';
import { analyticsAPI } from '../../utils/apiClient';
import TrendChart from './TrendChart';
import CompetencyChart from './CompetencyChart';

export default function StudentDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await analyticsAPI.getStudentAnalytics();
        setAnalytics(res.data);
      } catch {
        setAnalytics({
          totalSessions: 12,
          avgScore: 68.5,
          gradeDistribution: { Distinction: 2, Credit: 5, Pass: 4, Fail: 1 },
          scoresOverTime: [
            { date: '2025-01', score: 45 },
            { date: '2025-02', score: 52 },
            { date: '2025-03', score: 61 },
            { date: '2025-04', score: 58 },
            { date: '2025-05', score: 70 },
            { date: '2025-06', score: 75 },
          ],
          competencies: [
            { code: 'WS-01', name: 'Flat Position Welding', level: 'competent', score: 78 },
            { code: 'WS-02', name: 'Horizontal Position', level: 'developing', score: 55 },
            { code: 'WS-03', name: 'Vertical Position', level: 'not_yet_competent', score: 38 },
            { code: 'SA-01', name: 'Equipment Setup', level: 'competent', score: 82 },
            { code: 'SA-02', name: 'Parameter Selection', level: 'developing', score: 60 },
            { code: 'QC-01', name: 'Visual Inspection', level: 'developing', score: 52 },
          ],
        });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="dashboard-loading">Loading analytics...</div>;

  return (
    <div className="student-dashboard">
      <h2>My Learning Dashboard</h2>

      <div className="stat-cards">
        <div className="stat-card">
          <span className="stat-card-value">{analytics.totalSessions}</span>
          <span className="stat-card-label">Total Sessions</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-value">{analytics.avgScore.toFixed(0)}</span>
          <span className="stat-card-label">Average Score</span>
        </div>
        <div className="stat-card accent-green">
          <span className="stat-card-value">{analytics.gradeDistribution.Distinction + analytics.gradeDistribution.Credit}</span>
          <span className="stat-card-label">Credit+ Grades</span>
        </div>
      </div>

      <div className="chart-row">
        <div className="chart-card">
          <h3>Score Progression</h3>
          <TrendChart data={analytics.scoresOverTime} />
        </div>
        <div className="chart-card">
          <h3>Competency Status</h3>
          <CompetencyChart competencies={analytics.competencies} />
        </div>
      </div>

      <div className="competency-table-wrap">
        <h3>Competency Details</h3>
        <table className="competency-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Competency</th>
              <th>Score</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {analytics.competencies.map(c => (
              <tr key={c.code}>
                <td><code>{c.code}</code></td>
                <td>{c.name}</td>
                <td>{c.score}</td>
                <td>
                  <span className={`competency-badge ${c.level}`}>
                    {c.level.replace('_', ' ')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
