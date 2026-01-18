/**
 * Reusable Alert Component
 */

import React from 'react';
import { theme } from '../../theme';
import { mergeStyles } from '../../utils/styles';
import type { CSSProperties } from 'react';

export interface AlertProps {
  children: React.ReactNode;
  variant?: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  onClose?: () => void;
  style?: CSSProperties;
}

export const Alert: React.FC<AlertProps> = ({
  children,
  variant = 'info',
  title,
  onClose,
  style,
}) => {
  const variantStyles: Record<string, CSSProperties> = {
    success: {
      background: theme.colors.success.light,
      color: theme.colors.success.dark,
      border: `1px solid ${theme.colors.success.DEFAULT}`,
    },
    error: {
      background: theme.colors.error.light,
      color: theme.colors.error.dark,
      border: `1px solid ${theme.colors.error.DEFAULT}`,
    },
    warning: {
      background: theme.colors.warning.light,
      color: theme.colors.warning.dark,
      border: `1px solid ${theme.colors.warning.DEFAULT}`,
    },
    info: {
      background: theme.colors.info.light,
      color: theme.colors.info.dark,
      border: `1px solid ${theme.colors.info.DEFAULT}`,
    },
  };

  const alertStyle: CSSProperties = mergeStyles(
    {
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      position: 'relative',
    },
    variantStyles[variant],
    style
  );

  const titleStyle: CSSProperties = {
    fontWeight: theme.typography.fontWeight.bold,
    marginBottom: title ? theme.spacing.xs : 0,
  };

  return (
    <div style={alertStyle}>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: theme.spacing.sm,
            right: theme.spacing.sm,
            background: 'transparent',
            border: 'none',
            color: 'inherit',
            cursor: 'pointer',
            fontSize: theme.typography.fontSize.lg,
            lineHeight: 1,
            opacity: 0.7,
          }}
        >
          ×
        </button>
      )}
      {title && <div style={titleStyle}>{title}</div>}
      <div>{children}</div>
    </div>
  );
};

