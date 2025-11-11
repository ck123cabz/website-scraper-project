import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PatternArrayInput } from '../PatternArrayInput';

describe('PatternArrayInput', () => {
  it('should render existing patterns as tags', () => {
    render(
      <PatternArrayInput
        label="Test Patterns"
        value={['googlesyndication', 'adsense']}
        onChange={() => {}}
      />
    );

    expect(screen.getByText('googlesyndication')).toBeInTheDocument();
    expect(screen.getByText('adsense')).toBeInTheDocument();
  });

  it('should add pattern when pressing Enter', async () => {
    const onChange = jest.fn();
    render(
      <PatternArrayInput
        label="Test Patterns"
        value={['adsense']}
        onChange={onChange}
      />
    );

    const addButton = screen.getByText('+ Add');
    await userEvent.click(addButton);

    const input = screen.getByPlaceholderText('Add pattern...');
    await userEvent.type(input, 'doubleclick');
    await userEvent.keyboard('{Enter}');

    expect(onChange).toHaveBeenCalledWith(['adsense', 'doubleclick']);
  });

  it('should trim pattern but preserve case', async () => {
    const onChange = jest.fn();
    render(
      <PatternArrayInput
        label="Test Patterns"
        value={[]}
        onChange={onChange}
      />
    );

    const addButton = screen.getByText('+ Add');
    await userEvent.click(addButton);

    const input = screen.getByPlaceholderText('Add pattern...');
    await userEvent.type(input, '  CaseSensitive  ');
    await userEvent.keyboard('{Enter}');

    expect(onChange).toHaveBeenCalledWith(['CaseSensitive']);
  });
});
