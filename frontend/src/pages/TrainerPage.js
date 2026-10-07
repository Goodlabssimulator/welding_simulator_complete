import React from 'react';
import TrainerDashboard from '../components/Analytics/TrainerDashboard';

export default function TrainerPage() {
  return (
    <div className="trainer-page">
      <div className="page-header">
        <h2>Trainer Portal</h2>
      </div>
      <TrainerDashboard />
    </div>
  );
}
