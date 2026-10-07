import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useAssessment from '../hooks/useAssessment';
import ScoreCard from '../components/Assessment/ScoreCard';
import SubScores from '../components/Assessment/SubScores';
import FeedbackPanel from '../components/Feedback/FeedbackPanel';

export default function ResultsPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { results, competencies, loading, error, fetchResults, fetchCompetencies } = useAssessment();

  useEffect(() => {
    if (sessionId) {
      fetchResults(sessionId);
      fetchCompetencies(sessionId);
    }
  }, [sessionId]);

  if (loading) return <div className="results-loading">Loading assessment results...</div>;
  if (error) return <div className="results-error">Error: {error}</div>;

  return (
    <div className="results-page">
      <div className="results-header">
        <h2>Session Results</h2>
        <div className="results-actions">
          <button className="btn btn-primary" onClick={() => navigate('/welding')}>
            🔥 New Session
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/student')}>
            📊 My Dashboard
          </button>
        </div>
      </div>

      <div className="results-layout">
        <div className="results-main">
          <ScoreCard results={results} />
          <SubScores results={results} />
        </div>
        <div className="results-sidebar">
          <FeedbackPanel results={results} />
          {competencies && (
            <div className="competency-results">
              <h3>Competency Assessment</h3>
              <div className="competency-list">
                {(competencies.competencies || []).map((c, i) => (
                  <div key={i} className={`competency-item ${c.level}`}>
                    <code>{c.code}</code>
                    <span>{c.name}</span>
                    <span className="competency-score">{c.score}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
