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
      background: theme.gradients.success,
      color: theme.colors.text.inverse,
      border: `1px solid ${theme.colors.success.dark}`,
    },
    error: {
      background: theme.gradients.error,
      color: theme.colors.text.inverse,
      border: `1px solid ${theme.colors.error.dark}`,
    },
    warning: {
      background: theme.gradients.warning,
      color: theme.colors.text.inverse,
      border: `1px solid ${theme.colors.warning.dark}`,
    },
    info: {
      background: `linear-gradient(135deg, ${theme.colors.info.light} 0%, ${theme.colors.info.DEFAULT} 100%)`,
      color: theme.colors.text.primary,
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

