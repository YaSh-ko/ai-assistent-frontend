import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { StateView, StateViewObject } from './state-view';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, animate: _a, initial: _i, transition: _t, style, className, ...props }: any) => (
      <div style={style} className={className} {...props}>{children}</div>
    ),
    button: ({ children, animate: _a, initial: _i, transition: _t, ...props }: any) => (
      <button {...props}>{children}</button>
    ),
  },
}));

vi.mock('../../markdown-text', () => ({
  MarkdownText: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock('./tool-call-table', () => ({
  ToolCallTable: () => <div data-testid="tool-call-table" />,
}));

describe('StateViewObject', () => {
  it('renders key name', () => {
    render(<StateViewObject keyName="myKey" value="myValue" />);
    expect(screen.getByText('My Key')).toBeInTheDocument();
  });

  it('shows ellipsis button when collapsed', () => {
    render(<StateViewObject keyName="key" value="someValue" />);
    expect(screen.getByText('{...}')).toBeInTheDocument();
  });

  it('expands and shows value on toggle button click', () => {
    render(<StateViewObject keyName="key" value="hello world" />);
    const toggleBtn = screen.getAllByRole('button', { name: 'Expand value' })[0];
    fireEvent.click(toggleBtn);
    expect(screen.getByText('hello world')).toBeInTheDocument();
  });

  it('expands via ellipsis button click', () => {
    render(<StateViewObject keyName="key" value="visible value" />);
    fireEvent.click(screen.getByText('{...}'));
    expect(screen.getByText('visible value')).toBeInTheDocument();
  });

  it('respects expanded prop=true from parent', () => {
    render(<StateViewObject keyName="key" value="preset value" expanded={true} />);
    expect(screen.getByText('preset value')).toBeInTheDocument();
  });

  it('renders null value as "null"', () => {
    render(<StateViewObject keyName="key" value={null} expanded={true} />);
    expect(screen.getByText('null')).toBeInTheDocument();
  });

  it('renders boolean value', () => {
    render(<StateViewObject keyName="flag" value={true} expanded={true} />);
    expect(screen.getByText('true')).toBeInTheDocument();
  });

  it('renders number value', () => {
    render(<StateViewObject keyName="count" value={42} expanded={true} />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders empty object as "{}"', () => {
    render(<StateViewObject keyName="obj" value={{}} expanded={true} />);
    expect(screen.getByText('{}')).toBeInTheDocument();
  });

  it('renders array with non-message items', () => {
    render(<StateViewObject keyName="arr" value={['a', 'b']} expanded={true} />);
    expect(screen.getByText('[')).toBeInTheDocument();
    expect(screen.getByText('a')).toBeInTheDocument();
  });
});

describe('StateView', () => {
  const mockHandleShowSidePanel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows "No state found" when values is falsy', () => {
    render(
      <StateView
        values={null as any}
        description={undefined}
        handleShowSidePanel={mockHandleShowSidePanel}
        view="state"
      />
    );
    expect(screen.getByText('No state found')).toBeInTheDocument();
  });

  it('renders description when view="description"', () => {
    render(
      <StateView
        values={{ key: 'val' }}
        description="Test description"
        handleShowSidePanel={mockHandleShowSidePanel}
        view="description"
      />
    );
    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('renders "No description provided" when description is undefined', () => {
    render(
      <StateView
        values={{ key: 'val' }}
        description={undefined}
        handleShowSidePanel={mockHandleShowSidePanel}
        view="description"
      />
    );
    expect(screen.getByText('No description provided')).toBeInTheDocument();
  });

  it('renders state keys in state view', () => {
    render(
      <StateView
        values={{ name: 'Alice', count: 5 }}
        description={undefined}
        handleShowSidePanel={mockHandleShowSidePanel}
        view="state"
      />
    );
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Count')).toBeInTheDocument();
  });

  it('calls handleShowSidePanel(false, false) on close button click', () => {
    render(
      <StateView
        values={{ key: 'val' }}
        description={undefined}
        handleShowSidePanel={mockHandleShowSidePanel}
        view="state"
      />
    );
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[buttons.length - 1]);
    expect(mockHandleShowSidePanel).toHaveBeenCalledWith(false, false);
  });

  it('expand/collapse button toggles expanded state in state view', () => {
    render(
      <StateView
        values={{ key: 'val' }}
        description={undefined}
        handleShowSidePanel={mockHandleShowSidePanel}
        view="state"
      />
    );
    const buttons = screen.getAllByRole('button');
    const expandBtn = buttons[buttons.length - 2];
    fireEvent.click(expandBtn);
    fireEvent.click(expandBtn);
    expect(mockHandleShowSidePanel).not.toHaveBeenCalled();
  });

  it('does not render expand button in description view', () => {
    render(
      <StateView
        values={{ key: 'val' }}
        description="desc"
        handleShowSidePanel={mockHandleShowSidePanel}
        view="description"
      />
    );
    // Only close button present in description view
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(1);
  });
});
