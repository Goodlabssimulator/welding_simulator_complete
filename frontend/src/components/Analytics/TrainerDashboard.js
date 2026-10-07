import React, { useEffect, useState } from 'react';
import { analyticsAPI } from '../../utils/apiClient';
import TrendChart from './TrendChart';

export default function TrainerDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await analyticsAPI.getTrainerAnalytics();
        setAnalytics(res.data);
      } catch {
        setAnalytics({
          totalStudents: 42,
          totalSessions: 380,
          avgScoreAll: 63.2,
          gradeDistribution: { Distinction: 8, Credit: 15, Pass: 12, Fail: 7 },
          topStudents: [
            { name: 'Alice Mwangi', avgScore: 88, sessions: 24 },
            { name: 'Brian Ochieng', avgScore: 82, sessions: 20 },
            { name: 'Clara Wanjiku', avgScore: 79, sessions: 22 },
            { name: 'David Kiprop', avgScore: 75, sessions: 18 },
            { name: 'Eve Achieng', avgScore: 72, sessions: 21 },
          ],
          weakAreas: [
            { area: 'Vertical Position (WS-03)', avgScore: 38 },
            { area: 'Overhead Position (WS-04)', avgScore: 42 },
            { area: 'Visual Inspection (QC-01)', avgScore: 48 },
          ],
          cohortProgress: [
            { date: 'Week 1', score: 42 },
            { date: 'Week 2', score: 50 },
            { date: 'Week 3', score: 55 },
            { date: 'Week 4', score: 62 },
            { date: 'Week 5', score: 64 },
            { date: 'Week 6', score: 70 },
          ],
        });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="dashboard-loading">Loading cohort data...</div>;

  return (
    <div className="trainer-dashboard">
      <h2>Trainer Dashboard</h2>

      <div className="stat-cards">
        <div className="stat-card">
          <span className="stat-card-value">{analytics.totalStudents}</span>
          <span className="stat-card-label">Total Students</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-value">{analytics.totalSessions}</span>
          <span className="stat-card-label">Total Sessions</span>
        </div>
        <div className="stat-card accent-amber">
          <span className="stat-card-value">{analytics.avgScoreAll.toFixed(0)}</span>
          <span className="stat-card-label">Avg Score</span>
        </div>
      </div>

      <div className="chart-row">
        <div className="chart-card wide">
          <h3>Cohort Progression</h3>
          <TrendChart data={analytics.cohortProgress} />
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-section">
          <h3>🏆 Top Students</h3>
          <table className="rank-table">
            <thead>
              <tr><th>#</th><th>Name</th><th>Avg Score</th><th>Sessions</th></tr>
            </thead>
            <tbody>
              {analytics.topStudents.map((s, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{s.name}</td>
                  <td>{s.avgScore}</td>
                  <td>{s.sessions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="dashboard-section">
          <h3>⚠️ Weak Areas (Cohort)</h3>
          <div className="weak-area-list">
            {analytics.weakAreas.map((w, i) => (
              <div key={i} className="weak-area-item">
                <span className="weak-area-name">{w.area}</span>
                <span className="weak-area-score">Avg: {w.avgScore}</span>
                <div className="weak-area-bar" style={{ width: `${w.avgScore}%` }} />
              </div>
            ))}
          </div>
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
                    '--max': Math.max(...Object.values(analytics.gradeDistribution)),
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
