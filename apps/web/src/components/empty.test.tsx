import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from './empty';

describe('empty components', () => {
  it('renders slots and merges custom classes', () => {
    render(
      <Empty className="custom-empty">
        <EmptyHeader className="custom-header">
          <EmptyMedia className="custom-media" variant="icon">
            <span>icon</span>
          </EmptyMedia>
          <EmptyTitle className="custom-title">No data</EmptyTitle>
          <EmptyDescription className="custom-description">
            Nothing here yet
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="custom-content">Actions</EmptyContent>
      </Empty>
    );

    expect(screen.getByText('icon').closest('[data-slot="empty-icon"]')).toHaveAttribute(
      'data-variant',
      'icon'
    );
    expect(screen.getByText('icon').closest('[data-slot="empty-icon"]')).toHaveClass(
      'custom-media'
    );
    expect(screen.getByText('No data').closest('[data-slot="empty-title"]')).toHaveClass(
      'custom-title'
    );
    expect(
      screen.getByText('Nothing here yet').closest('[data-slot="empty-description"]')
    ).toHaveClass('custom-description');
    expect(screen.getByText('Actions').closest('[data-slot="empty-content"]')).toHaveClass(
      'custom-content'
    );
    expect(screen.getByText('No data').closest('[data-slot="empty-header"]')).toHaveClass(
      'custom-header'
    );
    expect(screen.getByText('Actions').closest('[data-slot="empty"]')).toHaveClass(
      'custom-empty'
    );
  });

  it('uses default media variant when none is provided', () => {
    render(<EmptyMedia>plain</EmptyMedia>);

    expect(screen.getByText('plain').closest('[data-slot="empty-icon"]')).toHaveAttribute(
      'data-variant',
      'default'
    );
  });
});
