import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import StudentPage from './pages/StudentPage';
import TrainerPage from './pages/TrainerPage';
import WeldingPage from './pages/WeldingPage';
import ResultsPage from './pages/ResultsPage';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Toast from './components/Common/Toast';

function ProtectedRoute({ children, roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;
  return children;
}

function RootRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (user.role === 'trainer' || user.role === 'admin') return <Navigate to="/trainer" />;
  return <Navigate to="/student" />;
}

function App() {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  return (
    <AuthProvider>
      <div className="app-container">
        <Routes>
          <Route path="/login" element={<LoginPage addToast={addToast} />} />
          <Route path="/student" element={
            <ProtectedRoute roles={['student']}>
              <StudentPage addToast={addToast} />
            </ProtectedRoute>
          } />
          <Route path="/trainer" element={
            <ProtectedRoute roles={['trainer', 'admin']}>
              <TrainerPage addToast={addToast} />
            </ProtectedRoute>
          } />
          <Route path="/weld/:sessionId" element={
            <ProtectedRoute roles={['student']}>
              <WeldingPage addToast={addToast} />
            </ProtectedRoute>
          } />
          <Route path="/results/:sessionId" element={
            <ProtectedRoute roles={['student', 'trainer', 'admin']}>
              <ResultsPage addToast={addToast} />
            </ProtectedRoute>
          } />
          <Route path="/" element={<RootRedirect />} />
        </Routes>
        <Toast toasts={toasts} />
      </div>
    </AuthProvider>
  );
}

export default App;
