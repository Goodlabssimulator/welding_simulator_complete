import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LoginForm from '../components/Auth/LoginForm';
import RegisterForm from '../components/Auth/RegisterForm';

export default function LoginPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showRegister, setShowRegister] = useState(false);

  // Redirect once authenticated
  useEffect(() => {
    if (!user) return;
    if (user.role === 'trainer' || user.role === 'admin') {
      navigate('/trainer', { replace: true });
    } else {
      navigate('/student', { replace: true });
    }
  }, [user, navigate]);

  return (
    <div className="login-page">
      <div className="login-hero">
        <div className="hero-content">
          <h1>Intelligent Welding Training Simulator</h1>
          <p className="hero-subtitle">
            Master welding skills through AI-powered virtual practice.
            Real-time feedback, competency assessment, and personalized coaching
            for TVET Mechanical Engineering Technician trainees.
          </p>
          <div className="hero-features">
            <div className="hero-feature">🔥 Virtual Welding Workspace</div>
            <div className="hero-feature">📊 Real-Time Monitoring</div>
            <div className="hero-feature">🧠 AI-Powered Assessment</div>
            <div className="hero-feature">📋 Competency Tracking</div>
            <div className="hero-feature">💬 Personalized Feedback</div>
            <div className="hero-feature">📈 Learning Analytics</div>
          </div>
        </div>
      </div>
      <div className="login-form-area">
        {showRegister ? (
          <RegisterForm onSwitch={() => setShowRegister(false)} />
        ) : (
          <LoginForm onSwitch={() => setShowRegister(true)} />
        )}
      </div>
    </div>
  );
}
