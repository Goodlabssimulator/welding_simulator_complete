import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function UserMenu() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  if (!user) return null;

  const initials = `${(user.firstName || '?')[0] || ''}${(user.lastName || '?')[0] || ''}`.toUpperCase();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="user-menu">
      <div className="user-menu-avatar" title={user.email}>{initials}</div>
      <div className="user-menu-info">
        <div className="user-menu-name">
          {user.firstName} {user.lastName}
        </div>
        <div className="user-menu-role">{user.role}</div>
      </div>
      <button className="user-menu-logout" onClick={handleLogout}>
        Log out
      </button>
    </div>
  );
}
