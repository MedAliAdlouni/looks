/**
 * Reusable Card Component
 */

import React from 'react';
import { cardStyle, mergeStyles } from '../../utils/styles';
import { theme } from '../../theme';
import type { CSSProperties } from 'react';

export interface CardProps {
  children: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  hover?: boolean;
  onClick?: () => void;
  style?: CSSProperties;
  className?: string;
}

const paddingMap: Record<string, string> = {
  none: '0',
  sm: theme.spacing.md,
  md: theme.spacing.lg,
  lg: theme.spacing.xl,
  xl: theme.spacing['2xl'],
};

export const Card: React.FC<CardProps> = ({
  children,
  padding = 'md',
  hover = false,
  onClick,
  style,
  className,
}) => {
  const cardBaseStyle = cardStyle();

  const cardStyleFinal: CSSProperties = mergeStyles(
    cardBaseStyle,
    {
      padding: paddingMap[padding],
      cursor: onClick ? 'pointer' : 'default',
      transition: `all ${theme.transitions.default}`,
    },
    style
  );

  return (
    <div
      style={cardStyleFinal}
      className={className}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (hover) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = theme.shadows.xl;
        }
      }}
      onMouseLeave={(e) => {
        if (hover) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = theme.shadows.lg;
        }
      }}
    >
      {children}
    </div>
  );
};

