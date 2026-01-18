/**
 * Top Action Bar Component - Course-level actions
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { theme } from '../../theme';
import type { CSSProperties } from 'react';

export interface TopActionBarProps {
  courseId: string;
  courseName: string;
  onBack?: () => void;
  onAssessmentsClick?: () => void;
  onChatClick?: () => void;
  chatSidebarOpen?: boolean;
}

export const TopActionBar: React.FC<TopActionBarProps> = ({
  courseId,
  courseName,
  onBack,
  onAssessmentsClick,
  onChatClick,
  chatSidebarOpen = false,
}) => {
  const navigate = useNavigate();

  const handleAssessmentsClick = () => {
    if (onAssessmentsClick) {
      onAssessmentsClick();
    } else {
      navigate(`/course/${courseId}?tab=assessments`);
    }
  };

  const barStyle: CSSProperties = {
    height: '64px',
    background: theme.colors.background.primary,
    borderBottom: `1px solid ${theme.colors.gray[200]}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `0 ${theme.spacing.xl}`,
    boxShadow: theme.shadows.sm,
  };

  const leftSectionStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.md,
  };

  const titleStyle: CSSProperties = {
    margin: 0,
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  };

  const rightSectionStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
  };

  const actionButtonStyle: CSSProperties = {
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
    background: theme.colors.success.DEFAULT,
    color: theme.colors.text.inverse,
    border: 'none',
    borderRadius: theme.borderRadius.md,
    cursor: 'pointer',
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    transition: `all ${theme.transitions.default}`,
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
  };

  const assessmentsButtonStyle: CSSProperties = {
    ...actionButtonStyle,
    background: theme.colors.primary.DEFAULT,
  };

  return (
    <div style={barStyle}>
      <div style={leftSectionStyle}>
        {onBack && (
          <Button variant="ghost" size="sm" onClick={onBack}>
            ← Back
          </Button>
        )}
        <h1 style={titleStyle}>{courseName}</h1>
      </div>
      <div style={rightSectionStyle}>
        {onChatClick && !chatSidebarOpen && (
          <Button
            variant="success"
            size="sm"
            onClick={onChatClick}
            title="Open chat to ask questions about course materials"
          >
            💬 Chat About Course
          </Button>
        )}
        <Button
          variant="primary"
          size="sm"
          onClick={handleAssessmentsClick}
        >
          📝 Assessments
        </Button>
      </div>
    </div>
  );
};

