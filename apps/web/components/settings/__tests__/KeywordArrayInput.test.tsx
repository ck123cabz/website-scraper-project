import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KeywordArrayInput } from '../KeywordArrayInput';

describe('KeywordArrayInput', () => {
  it('should render existing keywords as tags', () => {
    render(
      <KeywordArrayInput
        label="Test Keywords"
        value={['pricing', 'buy', 'demo']}
        onChange={() => {}}
      />
    );

    expect(screen.getByText('pricing')).toBeInTheDocument();
    expect(screen.getByText('buy')).toBeInTheDocument();
    expect(screen.getByText('demo')).toBeInTheDocument();
  });

  it('should add keyword when clicking Add button', async () => {
    const onChange = jest.fn();
    render(
      <KeywordArrayInput
        label="Test Keywords"
        value={['pricing']}
        onChange={onChange}
      />
    );

    const addButton = screen.getByText('+ Add');
    await userEvent.click(addButton);

    const input = screen.getByPlaceholderText('Add keyword...');
    await userEvent.type(input, 'newkeyword');
    await userEvent.keyboard('{Enter}');

    expect(onChange).toHaveBeenCalledWith(['pricing', 'newkeyword']);
  });

  it('should remove keyword when clicking X', async () => {
    const onChange = jest.fn();
    render(
      <KeywordArrayInput
        label="Test Keywords"
        value={['pricing', 'buy']}
        onChange={onChange}
      />
    );

    const removeButtons = screen.getAllByText('×');
    await userEvent.click(removeButtons[0]);

    expect(onChange).toHaveBeenCalledWith(['buy']);
  });

  it('should transform keyword to lowercase and trim', async () => {
    const onChange = jest.fn();
    render(
      <KeywordArrayInput
        label="Test Keywords"
        value={[]}
        onChange={onChange}
      />
    );

    const addButton = screen.getByText('+ Add');
    await userEvent.click(addButton);

    const input = screen.getByPlaceholderText('Add keyword...');
    await userEvent.type(input, '  UPPERCASE  ');
    await userEvent.keyboard('{Enter}');

    expect(onChange).toHaveBeenCalledWith(['uppercase']);
  });

  it('should not add duplicate keywords', async () => {
    const onChange = jest.fn();
    render(
      <KeywordArrayInput
        label="Test Keywords"
        value={['pricing']}
        onChange={onChange}
      />
    );

    const addButton = screen.getByText('+ Add');
    await userEvent.click(addButton);

    const input = screen.getByPlaceholderText('Add keyword...');
    await userEvent.type(input, 'pricing');
    await userEvent.keyboard('{Enter}');

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText('Keyword already exists')).toBeInTheDocument();
  });
});
