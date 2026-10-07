import { useState, useCallback } from 'react';
import { assessmentAPI } from '../utils/apiClient';

/**
 * Custom hook for fetching and managing assessment results
 */
export default function useAssessment() {
  const [results, setResults] = useState(null);
  const [competencies, setCompetencies] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchResults = useCallback(async (sessionId) => {
    try {
      setLoading(true);
      setError(null);
      const res = await assessmentAPI.getResults(sessionId);
      setResults(res.data);
      return res.data;
    } catch (err) {
      setError(err.message || 'Failed to fetch assessment results');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCompetencies = useCallback(async (sessionId) => {
    try {
      setLoading(true);
      setError(null);
      const res = await assessmentAPI.getCompetencies(sessionId);
      setCompetencies(res.data);
      return res.data;
    } catch (err) {
      setError(err.message || 'Failed to fetch competencies');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await assessmentAPI.getHistory();
      return res.data;
    } catch (err) {
      setError(err.message || 'Failed to fetch assessment history');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    results,
    competencies,
    loading,
    error,
    fetchResults,
    fetchCompetencies,
    fetchHistory,
  };
}
