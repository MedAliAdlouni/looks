/**
 * Reusable Page Layout Component
 */

import React from 'react';
import { theme } from '../../theme';
import type { CSSProperties } from 'react';

export interface PageLayoutProps {
  children: React.ReactNode;
  maxWidth?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
}

const paddingMap: Record<string, string> = {
  none: '0',
  sm: theme.spacing.md,
  md: theme.spacing.xl,
  lg: theme.spacing['2xl'],
  xl: theme.spacing['3xl'],
};

export const PageLayout: React.FC<PageLayoutProps> = ({
  children,
  maxWidth = '1400px',
  padding = 'md',
}) => {
  const containerStyle: CSSProperties = {
    minHeight: '100vh',
    background: theme.gradients.background,
    backgroundAttachment: 'fixed',
    display: 'flex',
    flexDirection: 'column',
  };

  const contentStyle: CSSProperties = {
    flex: 1,
    maxWidth,
    margin: '0 auto',
    width: '100%',
    padding: paddingMap[padding],
  };

  return (
    <div style={containerStyle}>
      <div style={contentStyle}>{children}</div>
    </div>
  );
};

