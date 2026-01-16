/**
 * Reusable Loading Spinner Component
 */

import React from 'react';
import { theme } from '../../theme';
import type { CSSProperties } from 'react';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  fullScreen?: boolean;
  text?: string;
}

const sizeMap = {
  sm: '24px',
  md: '48px',
  lg: '72px',
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = theme.colors.text.inverse,
  fullScreen = false,
  text,
}) => {
  const spinnerStyle: CSSProperties = {
    width: sizeMap[size],
    height: sizeMap[size],
    border: `4px solid ${color}33`,
    borderTopColor: color,
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  };

  const containerStyle: CSSProperties = fullScreen
    ? {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        gap: theme.spacing.md,
      }
    : {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: theme.spacing.sm,
      };

  const textStyle: CSSProperties = {
    color: fullScreen ? theme.colors.text.inverse : theme.colors.text.secondary,
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
  };

  return (
    <div style={containerStyle}>
      <div style={spinnerStyle} />
      {text && <div style={textStyle}>{text}</div>}
    </div>
  );
};

