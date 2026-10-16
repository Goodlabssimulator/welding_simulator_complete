import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ScoreCard from '../../components/Assessment/ScoreCard';

function renderWithRouter(ui) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('ScoreCard', () => {
  test('renders nothing for null results', () => {
    const { container } = renderWithRouter(<ScoreCard results={null} />);
    expect(container.firstChild).toBeNull();
  });

  test('renders overall score', () => {
    renderWithRouter(<ScoreCard results={{ overallScore: 65 }} />);
    expect(screen.getByText('65')).toBeDefined();
  });

  test('renders Distinction grade for score >= 85', () => {
    renderWithRouter(<ScoreCard results={{ overallScore: 90 }} />);
    expect(screen.getByText(/distinction/i)).toBeDefined();
  });

  test('renders Fail grade for score < 50', () => {
    renderWithRouter(<ScoreCard results={{ overallScore: 30 }} />);
    expect(screen.getByText(/fail/i)).toBeDefined();
  });

  test('handles string score by coercing to number', () => {
    renderWithRouter(<ScoreCard results={{ overallScore: '50.00' }} />);
    // Should render "50" without crashing
    expect(screen.getByText('50')).toBeDefined();
  });

  test('handles NaN score gracefully (falls back to 0)', () => {
    renderWithRouter(<ScoreCard results={{ overallScore: 'not-a-number' }} />);
    expect(screen.getByText('0')).toBeDefined();
  });
});
