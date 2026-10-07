import React, { useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useAssessment from '../hooks/useAssessment';
import ScoreCard from '../components/Assessment/ScoreCard';
import SubScores from '../components/Assessment/SubScores';
import FeedbackPanel from '../components/Feedback/FeedbackPanel';

/**
 * The backend returns { assessment: {...}, defects, feedback, competencies }.
 * We flatten it into a single object so existing components work unchanged.
 */
function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function flattenAssessment(raw) {
  if (!raw) return null;

  const a = raw.assessment || {};
  const session = raw.session || {};

  return {
    // Top-level fields ScoreCard expects
    sessionId: raw.sessionId || a.session_id || session.id,
    overallScore: num(a.overall_score ?? a.overallScore),
    grade: a.grade,
    duration: num(a.duration_seconds ?? a.completion_time_seconds ?? session.duration_seconds),
    jointType: a.joint_name || session.joint_name || a.joint_type_id,

    // Sub-scores (in snake_case + camelCase for safety)
    speed_accuracy_score: num(a.speed_accuracy_score),
    speedAccuracy: num(a.speed_accuracy_score),
    bead_quality_score: num(a.bead_quality_score),
    beadQuality: num(a.bead_quality_score),
    fusion_quality_score: num(a.fusion_quality_score),
    fusionQuality: num(a.fusion_quality_score),
    penetration_score: num(a.penetration_score),
    penetration: num(a.penetration_score),
    alignment_score: num(a.alignment_score),
    alignment: num(a.alignment_score),
    consistency_score: num(a.consistency_score),
    consistency: num(a.consistency_score),
    process_control_score: num(a.process_control_score),
    processControl: num(a.process_control_score),

    // Feedback
    ai_feedback_summary: a.ai_feedback_summary,
    strengths: a.strengths,
    weaknesses: a.weaknesses,
    improvements: a.improvements,
    practiceRecommendations: a.practice_recommendations,

    // Defects
    defects: raw.defects || [],

    // Raw for anything else
    _raw: raw,
  };
}

export default function ResultsPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { results, competencies, loading, error, fetchResults, fetchCompetencies } = useAssessment();

  useEffect(() => {
    if (sessionId) {
      fetchResults(sessionId);
      fetchCompetencies(sessionId);
    }
  }, [sessionId, fetchResults, fetchCompetencies]);

  const flat = useMemo(() => flattenAssessment(results), [results]);

  if (loading) return <div className="results-loading">Loading assessment results...</div>;
  if (error) return <div className="results-error">Error: {error}</div>;

  return (
    <div className="results-page">
      <div className="results-header">
        <h2>Session Results</h2>
        <div className="results-actions">
          <button className="btn btn-primary" onClick={() => navigate('/welding')}>
            New Session
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/student')}>
            My Dashboard
          </button>
        </div>
      </div>

      <div className="results-layout">
        <div className="results-main">
          <ScoreCard results={flat} />
          <SubScores results={flat} />
        </div>
        <div className="results-sidebar">
          <FeedbackPanel results={flat} />
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
