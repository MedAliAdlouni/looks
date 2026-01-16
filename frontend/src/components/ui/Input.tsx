/**
 * Reusable Input Component
 */

import React from 'react';
import { inputStyle, focusStyle, mergeStyles } from '../../utils/styles';
import { theme } from '../../theme';
import type { CSSProperties } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  as?: 'input' | 'textarea';
  rows?: number;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  fullWidth = true,
  as = 'input',
  rows,
  style,
  className,
  ...props
}) => {
  const inputContainerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.xs,
    width: fullWidth ? '100%' : 'auto',
  };

  const inputWrapperStyle: CSSProperties = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  };

  const inputBaseStyle = mergeStyles(
    inputStyle(),
    {
      width: '100%',
      paddingLeft: leftIcon ? '2.5rem' : undefined,
      paddingRight: rightIcon ? '2.5rem' : undefined,
      ...(error ? { borderColor: theme.colors.error.DEFAULT } : {}),
    },
    style
  );

  const labelStyle: CSSProperties = {
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.secondary,
    fontSize: theme.typography.fontSize.sm,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };

  const errorStyle: CSSProperties = {
    color: theme.colors.error.DEFAULT,
    fontSize: theme.typography.fontSize.sm,
    marginTop: theme.spacing.xs,
  };

  const helperTextStyle: CSSProperties = {
    color: theme.colors.text.tertiary,
    fontSize: theme.typography.fontSize.sm,
    marginTop: theme.spacing.xs,
  };

  return (
    <div style={inputContainerStyle}>
      {label && <label style={labelStyle}>{label}</label>}
      <div style={inputWrapperStyle}>
        {leftIcon && (
          <span
            style={{
              position: 'absolute',
              left: theme.spacing.md,
              color: theme.colors.text.tertiary,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {leftIcon}
          </span>
        )}
        {as === 'textarea' ? (
          <textarea
            style={{ ...inputBaseStyle, resize: 'vertical', fontFamily: 'inherit' }}
            className={className}
            rows={rows}
            onFocus={(e) => {
              Object.assign(e.target.style, focusStyle());
              props.onFocus?.(e as any);
            }}
            onBlur={(e) => {
              e.target.style.borderColor = error
                ? theme.colors.error.DEFAULT
                : theme.colors.gray[200];
              e.target.style.boxShadow = 'none';
              props.onBlur?.(e as any);
            }}
            {...(props as any)}
          />
        ) : (
          <input
            style={inputBaseStyle}
            className={className}
            onFocus={(e) => {
              Object.assign(e.target.style, focusStyle());
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              e.target.style.borderColor = error
                ? theme.colors.error.DEFAULT
                : theme.colors.gray[200];
              e.target.style.boxShadow = 'none';
              props.onBlur?.(e);
            }}
            {...props}
          />
        )}
        {rightIcon && (
          <span
            style={{
              position: 'absolute',
              right: theme.spacing.md,
              color: theme.colors.text.tertiary,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {rightIcon}
          </span>
        )}
      </div>
      {error && <span style={errorStyle}>{error}</span>}
      {!error && helperText && <span style={helperTextStyle}>{helperText}</span>}
    </div>
  );
};

