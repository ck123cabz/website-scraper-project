import { render, screen } from '@testing-library/react';
import { JobStatusBadge } from '../JobStatusBadge';

describe('JobStatusBadge', () => {
  it('renders completed status as Success', () => {
    render(<JobStatusBadge status="completed" />);
    expect(screen.getByText('Success')).toBeInTheDocument();
  });

  it('renders processing status as Active', () => {
    render(<JobStatusBadge status="processing" />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders failed status correctly', () => {
    render(<JobStatusBadge status="failed" />);
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('renders paused status correctly', () => {
    render(<JobStatusBadge status="paused" />);
    expect(screen.getByText('Paused')).toBeInTheDocument();
  });

  it('renders pending status correctly', () => {
    render(<JobStatusBadge status="pending" />);
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('renders cancelled status correctly', () => {
    render(<JobStatusBadge status="cancelled" />);
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<JobStatusBadge status="completed" className="custom-class" />);
    const badge = container.querySelector('.custom-class');
    expect(badge).toBeInTheDocument();
  });
});
