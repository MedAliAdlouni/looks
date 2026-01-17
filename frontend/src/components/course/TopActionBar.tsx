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
    background: theme.colors.background.overlay,
    backdropFilter: 'blur(10px)',
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
    padding: '0.75rem 1.25rem',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '0.75rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '600',
    transition: 'all 0.2s',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  };

  const assessmentsButtonStyle: CSSProperties = {
    ...actionButtonStyle,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
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
          <button
            onClick={onChatClick}
            style={actionButtonStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #059669 0%, #047857 100%)';
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)';
            }}
            title="Open chat to ask questions about course materials"
          >
            💬 Chat About Course
          </button>
        )}
        <button
          onClick={handleAssessmentsClick}
          style={assessmentsButtonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)';
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
          }}
        >
          📝 Assessments
        </button>
      </div>
    </div>
  );
};

