import { render, screen } from '@testing-library/react';
import Home from '../pages/index';
import '@testing-library/jest-dom';

describe('Home', () => {
  it('renders a heading', () => {
    render(<Home />);

    const heading = screen.getByTestId('home-inscription', {
      name: /Hive Auth/i,
    });

    expect(heading).toBeInTheDocument();
  })
});
