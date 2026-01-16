/**
 * Style utility functions
 * Use these to apply theme values consistently
 */

import { theme } from '../theme';
import type { CSSProperties } from 'react';

export type StyleFunction = (...args: any[]) => CSSProperties;

/**
 * Get a color from the theme
 */
export const getColor = (path: string): string => {
  const parts = path.split('.');
  let value: any = theme.colors;
  for (const part of parts) {
    value = value[part];
    if (value === undefined) return path; // Fallback to path if not found
  }
  return value;
};

/**
 * Get spacing value
 */
export const getSpacing = (size: keyof typeof theme.spacing): string => {
  return theme.spacing[size];
};

/**
 * Get border radius
 */
export const getRadius = (size: keyof typeof theme.borderRadius): string => {
  return theme.borderRadius[size];
};

/**
 * Get shadow
 */
export const getShadow = (size: keyof typeof theme.shadows): string => {
  return theme.shadows[size];
};

/**
 * Create a glass morphism effect
 */
export const glassEffect = (opacity: number = 0.95): CSSProperties => ({
  background: `rgba(255, 255, 255, ${opacity})`,
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
});

/**
 * Create a card style
 */
export const cardStyle = (): CSSProperties => ({
  background: theme.colors.background.overlay,
  backdropFilter: 'blur(10px)',
  borderRadius: getRadius('xl'),
  boxShadow: getShadow('xl'),
  border: '1px solid rgba(255, 255, 255, 0.2)',
});

/**
 * Create a button style variant
 */
export const buttonVariant = (
  variant: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'ghost'
): CSSProperties => {
  const base: CSSProperties = {
    padding: `${getSpacing('sm')} ${getSpacing('lg')}`,
    borderRadius: getRadius('lg'),
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    cursor: 'pointer',
    border: 'none',
    transition: `all ${theme.transitions.default}`,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: getSpacing('sm'),
  };

  switch (variant) {
    case 'primary':
      return {
        ...base,
        background: theme.gradients.primary,
        color: theme.colors.text.inverse,
        boxShadow: getShadow('primary'),
      };
    case 'success':
      return {
        ...base,
        background: theme.gradients.success,
        color: theme.colors.text.inverse,
        boxShadow: getShadow('success'),
      };
    case 'error':
      return {
        ...base,
        background: theme.gradients.error,
        color: theme.colors.text.inverse,
        boxShadow: getShadow('error'),
      };
    case 'secondary':
      return {
        ...base,
        background: theme.colors.background.overlay,
        color: theme.colors.primary.DEFAULT,
        boxShadow: getShadow('md'),
      };
    case 'ghost':
      return {
        ...base,
        background: 'transparent',
        color: theme.colors.text.secondary,
      };
    default:
      return base;
  }
};

/**
 * Create input style
 */
export const inputStyle = (): CSSProperties => ({
  padding: `${getSpacing('sm')} ${getSpacing('md')}`,
  border: `2px solid ${theme.colors.gray[200]}`,
  borderRadius: getRadius('lg'),
  fontSize: theme.typography.fontSize.base,
  transition: `all ${theme.transitions.default}`,
  background: theme.colors.background.primary,
  color: theme.colors.text.primary,
  fontFamily: theme.typography.fontFamily.sans,
});

/**
 * Create focus style
 */
export const focusStyle = (): CSSProperties => ({
  outline: 'none',
  borderColor: theme.colors.primary.DEFAULT,
  boxShadow: `0 0 0 3px ${theme.colors.primary[100]}`,
});

/**
 * Merge styles helper
 */
export const mergeStyles = (
  ...styles: (CSSProperties | undefined | null | false)[]
): CSSProperties => {
  return Object.assign({}, ...styles.filter(Boolean));
};

