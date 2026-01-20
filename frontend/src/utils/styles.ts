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
 * Create a card style - minimal, elegant
 */
export const cardStyle = (): CSSProperties => ({
  background: theme.colors.background.primary,
  borderRadius: getRadius('lg'),
  boxShadow: getShadow('sm'),
  border: `1px solid ${theme.colors.gray[200]}`,
});

/**
 * Create a button style variant - minimal, elegant
 */
export const buttonVariant = (
  variant: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'ghost'
): CSSProperties => {
  const base: CSSProperties = {
    padding: `${getSpacing('sm')} ${getSpacing('lg')}`,
    borderRadius: getRadius('md'),
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    cursor: 'pointer',
    border: '1px solid transparent',
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
        background: theme.colors.primary.DEFAULT,
        color: theme.colors.text.inverse,
        borderColor: theme.colors.primary.DEFAULT,
        boxShadow: 'none',
      };
    case 'success':
      return {
        ...base,
        background: theme.colors.success.DEFAULT,
        color: theme.colors.text.inverse,
        borderColor: theme.colors.success.DEFAULT,
        boxShadow: 'none',
      };
    case 'error':
      return {
        ...base,
        background: theme.colors.error.DEFAULT,
        color: theme.colors.text.inverse,
        borderColor: theme.colors.error.DEFAULT,
        boxShadow: 'none',
      };
    case 'secondary':
      return {
        ...base,
        background: theme.colors.background.secondary,
        color: theme.colors.text.primary,
        borderColor: theme.colors.gray[300],
        boxShadow: 'none',
      };
    case 'ghost':
      return {
        ...base,
        background: 'transparent',
        color: theme.colors.text.secondary,
        borderColor: 'transparent',
      };
    default:
      return base;
  }
};

/**
 * Create input style - minimal, clean
 * Ensures consistent left padding so placeholder text aligns with user-typed text
 */
export const inputStyle = (): CSSProperties => ({
  paddingTop: getSpacing('sm'),
  paddingBottom: getSpacing('sm'),
  paddingLeft: '0.75rem', // Consistent left padding for premium aesthetic
  paddingRight: getSpacing('md'),
  border: `1px solid ${theme.colors.gray[300]}`,
  borderRadius: getRadius('md'),
  fontSize: theme.typography.fontSize.base,
  transition: `all ${theme.transitions.default}`,
  background: theme.colors.background.primary,
  color: theme.colors.text.primary,
  fontFamily: theme.typography.fontFamily.sans,
});

/**
 * Create focus style - subtle, accessible
 */
export const focusStyle = (): CSSProperties => ({
  outline: 'none',
  borderColor: theme.colors.accent.DEFAULT,
  boxShadow: `0 0 0 3px rgba(2, 132, 199, 0.1)`,
});

/**
 * Merge styles helper
 */
export const mergeStyles = (
  ...styles: (CSSProperties | undefined | null | false)[]
): CSSProperties => {
  return Object.assign({}, ...styles.filter(Boolean));
};

