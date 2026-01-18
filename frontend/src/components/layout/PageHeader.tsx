/**
 * Reusable Page Header Component
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { theme } from '../../theme';
import type { CSSProperties } from 'react';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  backUrl?: string;
  rightActions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  showBackButton = false,
  backUrl,
  rightActions,
}) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const headerStyle: CSSProperties = {
    background: theme.colors.background.overlay,
    backdropFilter: 'blur(10px)',
    padding: `${theme.spacing.lg} ${theme.spacing.xl}`,
    boxShadow: theme.shadows.md,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
  };

  const leftSectionStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.md,
    flex: 1,
  };

  const titleSectionStyle: CSSProperties = {
    flex: 1,
  };

  const titleStyle: CSSProperties = {
    margin: `0 0 ${subtitle ? theme.spacing.xs : 0} 0`,
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  };

  const subtitleStyle: CSSProperties = {
    margin: 0,
    color: theme.colors.text.tertiary,
    fontSize: theme.typography.fontSize.sm,
  };

  const rightSectionStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.md,
  };

  const userInfoStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
  };

  const avatarStyle: CSSProperties = {
    width: '40px',
    height: '40px',
    borderRadius: theme.borderRadius.full,
    background: theme.colors.primary.DEFAULT,
    color: theme.colors.text.inverse,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: theme.typography.fontWeight.semibold,
    fontSize: theme.typography.fontSize.base,
  };

  const userNameStyle: CSSProperties = {
    color: theme.colors.text.secondary,
    fontWeight: theme.typography.fontWeight.medium,
  };

  return (
    <header style={headerStyle}>
      <div style={leftSectionStyle}>
        {showBackButton && (
          <Button
            variant="ghost"
            onClick={() => (backUrl ? navigate(backUrl) : navigate(-1))}
          >
            ← Back
          </Button>
        )}
        <div style={titleSectionStyle}>
          <h1 style={titleStyle}>{title}</h1>
          {subtitle && <p style={subtitleStyle}>{subtitle}</p>}
        </div>
      </div>
      <div style={rightSectionStyle}>
        {rightActions}
        <div style={userInfoStyle}>
          <div style={avatarStyle}>
            {(user?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
          </div>
          <span style={userNameStyle}>{user?.full_name || user?.email}</span>
        </div>
        <Button variant="error" size="sm" onClick={logout}>
          Logout
        </Button>
      </div>
    </header>
  );
};

