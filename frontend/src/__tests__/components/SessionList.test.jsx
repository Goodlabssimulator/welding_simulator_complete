import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SessionList from '../../components/Analytics/SessionList';

function renderWithRouter(ui) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

const mockSessions = [
  {
    id: 'aaaaaaaa-1111-4111-8111-111111111111',
    started_at: '2025-01-01T10:00:00Z',
    completed_at: '2025-01-01T10:01:00Z',
    duration_seconds: 60,
    joint_name: 'Butt Joint',
    position_code: '1G',
    overall_score: '72.50',
    grade: 'credit',
  },
  {
    id: 'bbbbbbbb-2222-4222-8222-222222222222',
    started_at: '2025-01-02T10:00:00Z',
    completed_at: '2025-01-02T10:01:00Z',
    duration_seconds: 45,
    joint_name: 'Tee Joint',
    position_code: '2G',
    overall_score: '88.00',
    grade: 'distinction',
  },
];

describe('SessionList', () => {
  test('shows empty message when no sessions', () => {
    renderWithRouter(<SessionList sessions={[]} />);
    expect(screen.getByText(/no sessions to show/i)).toBeDefined();
  });

  test('renders all session rows', () => {
    renderWithRouter(<SessionList sessions={mockSessions} />);
    // Every session's joint name appears
    expect(screen.getByText('Butt Joint')).toBeDefined();
    expect(screen.getByText('Tee Joint')).toBeDefined();
  });

  test('renders numeric scores correctly', () => {
    renderWithRouter(<SessionList sessions={mockSessions} />);
    expect(screen.getByText('72.5')).toBeDefined();
    expect(screen.getByText('88.0')).toBeDefined();
  });

  test('renders grade badges', () => {
    renderWithRouter(<SessionList sessions={mockSessions} />);
    expect(screen.getByText(/credit/i)).toBeDefined();
    expect(screen.getByText(/distinction/i)).toBeDefined();
  });

  test('does not crash with malformed session data', () => {
    const bad = [
      { id: 'x', /* everything else missing */ },
      { id: 'y', overall_score: null, grade: null },
    ];
    expect(() =>
      renderWithRouter(<SessionList sessions={bad} />)
    ).not.toThrow();
  });
});
