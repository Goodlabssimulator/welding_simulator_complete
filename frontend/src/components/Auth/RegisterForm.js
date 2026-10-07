import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { USER_ROLES } from '../../utils/constants';

export default function RegisterForm({ onSwitch }) {
  const { register, loading, error } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(USER_ROLES.STUDENT);

  const handleSubmit = async (e) => {
    e.preventDefault();

    await register({
      firstName,
      lastName,
      email,
      password,
      role,
    });
  };

  return (
    <div className="auth-card">
      <h2>Create Account</h2>
      <p className="auth-subtitle">
        Join the Intelligent Welding Training Platform
      </p>

      {error && <div className="auth-error">{error}</div>}

      <form onSubmit={handleSubmit} className="auth-form">

        <div className="form-group">
          <label>First Name</label>
          <input
            type="text"
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            placeholder="John"
            required
          />
        </div>

        <div className="form-group">
          <label>Last Name</label>
          <input
            type="text"
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            placeholder="Doe"
            required
          />
        </div>

        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
          />
        </div>

        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Minimum 6 characters"
            required
            minLength={6}
          />
        </div>

        <div className="form-group">
          <label>Role</label>
          <select
            value={role}
            onChange={e => setRole(e.target.value)}
          >
            <option value={USER_ROLES.STUDENT}>Trainee</option>
            <option value={USER_ROLES.TRAINER}>Trainer</option>
          </select>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
        >
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>

      </form>

      <p className="auth-switch">
        Already have an account?{' '}
        <button className="btn-link" onClick={onSwitch}>
          Sign In
        </button>
      </p>
    </div>
  );
}
