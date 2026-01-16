/**
 * Reusable Tabs Component
 */

import React from 'react';
import { theme } from '../../theme';
import { mergeStyles } from '../../utils/styles';
import type { CSSProperties } from 'react';

export interface Tab {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  badge?: number | string;
}

export interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  variant?: 'default' | 'pills';
  fullWidth?: boolean;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
  fullWidth = false,
}) => {
  const containerStyle: CSSProperties = {
    display: 'flex',
    gap: theme.spacing.md,
    background: theme.colors.background.overlay,
    backdropFilter: 'blur(10px)',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.xl,
    boxShadow: theme.shadows.md,
  };

  const tabBaseStyle: CSSProperties = {
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
    background: 'transparent',
    border: 'none',
    borderRadius: theme.borderRadius.lg,
    cursor: 'pointer',
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.tertiary,
    fontWeight: theme.typography.fontWeight.medium,
    transition: `all ${theme.transitions.default}`,
    flex: fullWidth ? 1 : 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  };

  const activeTabStyle: CSSProperties = {
    background: theme.gradients.primary,
    color: theme.colors.text.inverse,
    fontWeight: theme.typography.fontWeight.semibold,
    boxShadow: theme.shadows.primary,
  };

  return (
    <div style={containerStyle}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            style={mergeStyles(
              tabBaseStyle,
              isActive && activeTabStyle
            )}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.icon && <span>{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                style={{
                  background: isActive
                    ? 'rgba(255, 255, 255, 0.3)'
                    : theme.colors.gray[200],
                  color: isActive ? theme.colors.text.inverse : theme.colors.text.secondary,
                  padding: `0 ${theme.spacing.xs}`,
                  borderRadius: theme.borderRadius.full,
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.semibold,
                }}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

