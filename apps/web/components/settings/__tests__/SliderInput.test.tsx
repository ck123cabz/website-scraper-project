import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SliderInput } from '../SliderInput';

describe('SliderInput', () => {
  it('should render with initial value', () => {
    render(
      <SliderInput
        label="Test Slider"
        value={0.5}
        min={0}
        max={1}
        step={0.1}
        onChange={() => {}}
      />
    );

    expect(screen.getByText('Test Slider')).toBeInTheDocument();
    expect(screen.getByText('0.5')).toBeInTheDocument();
  });

  it('should call onChange when slider moves', async () => {
    const onChange = jest.fn();
    render(
      <SliderInput
        label="Test Slider"
        value={0.5}
        min={0}
        max={1}
        step={0.1}
        onChange={onChange}
      />
    );

    const slider = screen.getByRole('slider') as HTMLInputElement;
    fireEvent.change(slider, { target: { value: '0.7' } });

    expect(onChange).toHaveBeenCalled();
  });

  it('should display help text when provided', () => {
    render(
      <SliderInput
        label="Test Slider"
        value={0.5}
        min={0}
        max={1}
        step={0.1}
        onChange={() => {}}
        helpText="This is help text"
      />
    );

    expect(screen.getByText('This is help text')).toBeInTheDocument();
  });
});
