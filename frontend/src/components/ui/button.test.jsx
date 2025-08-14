import { render, screen } from '@testing-library/react';
import { Button } from './button';

it('renders button with provided text', () => {
  render(<Button>Click me</Button>);
  expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
});
