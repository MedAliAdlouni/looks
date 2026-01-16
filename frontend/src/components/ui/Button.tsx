/**
 * Reusable Button Component
 * Easily customizable through props
 */

import React from 'react';
import { buttonVariant, mergeStyles } from '../../utils/styles';
import { theme } from '../../theme';
import type { CSSProperties } from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  as?: 'button' | 'span';
}

const sizeStyles: Record<'sm' | 'md' | 'lg', CSSProperties> = {
  sm: {
    padding: `${theme.spacing.xs} ${theme.spacing.md}`,
    fontSize: theme.typography.fontSize.sm,
  },
  md: {
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
    fontSize: theme.typography.fontSize.base,
  },
  lg: {
    padding: `${theme.spacing.md} ${theme.spacing.xl}`,
    fontSize: theme.typography.fontSize.lg,
  },
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  children,
  disabled,
  as = 'button',
  style,
  ...props
}) => {
  const baseStyle = buttonVariant(variant);
  const sizeStyle = sizeStyles[size];

  const buttonStyle: CSSProperties = mergeStyles(
    baseStyle,
    sizeStyle,
    {
      width: fullWidth ? '100%' : 'auto',
      opacity: (disabled || isLoading) ? 0.7 : 1,
      cursor: (disabled || isLoading) ? 'not-allowed' : 'pointer',
    },
    style
  );

  const Component = as === 'span' ? 'span' : 'button';
  const buttonProps = as === 'button' 
    ? { disabled: disabled || isLoading, ...props }
    : { ...props };

  return (
    <Component
      style={buttonStyle}
      {...buttonProps}
    >
      {isLoading && <Spinner />}
      {!isLoading && leftIcon && <span style={{ display: 'flex' }}>{leftIcon}</span>}
      {children}
      {!isLoading && rightIcon && <span style={{ display: 'flex' }}>{rightIcon}</span>}
    </Component>
  );
};

const Spinner: React.FC = () => (
  <span
    style={{
      width: '16px',
      height: '16px',
      border: '2px solid rgba(255, 255, 255, 0.3)',
      borderTopColor: 'white',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
      display: 'inline-block',
    }}
  />
);

