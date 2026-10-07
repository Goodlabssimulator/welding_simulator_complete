import React from 'react';
import { useNavigate } from 'react-router-dom';
import StudentDashboard from '../components/Analytics/StudentDashboard';

export default function StudentPage() {
  const navigate = useNavigate();

  return (
    <div className="student-page">
      <div className="page-header">
        <h2>Student Portal</h2>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => navigate('/welding')}>
            🔥 Start Welding
          </button>
        </div>
      </div>
      <StudentDashboard />
    </div>
  );
}
