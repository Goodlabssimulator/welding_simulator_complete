import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import StudentPage from './pages/StudentPage';
import TrainerPage from './pages/TrainerPage';
import WeldingPage from './pages/WeldingPage';
import ResultsPage from './pages/ResultsPage';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Toast from './components/Common/Toast';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#e2e8f0' }}>
        Loading…
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function RootRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#e2e8f0' }}>
        Loading…
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'trainer' || user.role === 'admin') {
    return <Navigate to="/trainer" replace />;
  }
  return <Navigate to="/student" replace />;
}

function App() {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  return (
    <AuthProvider>
      <div className="app-container">
        <Routes>
          <Route path="/login" element={<LoginPage addToast={addToast} />} />

          <Route
            path="/student"
            element={
              <ProtectedRoute roles={['student']}>
                <StudentPage addToast={addToast} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/trainer"
            element={
              <ProtectedRoute roles={['trainer', 'admin']}>
                <TrainerPage addToast={addToast} />
              </ProtectedRoute>
            }
          />

          {/* Start a NEW welding session — no sessionId required */}
          <Route
            path="/welding"
            element={
              <ProtectedRoute roles={['student']}>
                <WeldingPage addToast={addToast} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/results/:sessionId"
            element={
              <ProtectedRoute roles={['student', 'trainer', 'admin']}>
                <ResultsPage addToast={addToast} />
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toast toasts={toasts} />
      </div>
    </AuthProvider>
  );
}

export default App;
