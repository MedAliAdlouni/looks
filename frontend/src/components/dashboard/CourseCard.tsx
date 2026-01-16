/**
 * Course Card Component for Dashboard
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { theme } from '../../theme';
import type { Course } from '../../types/api';
import type { CSSProperties } from 'react';

export interface CourseCardProps {
  course: Course;
  onDelete: (courseId: string) => void;
  index?: number;
}

export const CourseCard: React.FC<CourseCardProps> = ({ course, onDelete, index = 0 }) => {
  const navigate = useNavigate();

  const cardStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    animationDelay: `${index * 0.1}s`,
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  };

  const iconStyle: CSSProperties = {
    fontSize: '1.5rem',
  };

  const nameStyle: CSSProperties = {
    margin: 0,
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    flex: 1,
  };

  const descriptionStyle: CSSProperties = {
    margin: `0 0 ${theme.spacing.lg} 0`,
    color: theme.colors.text.tertiary,
    flex: 1,
    lineHeight: theme.typography.lineHeight.relaxed,
    fontSize: theme.typography.fontSize.sm,
  };

  const actionsStyle: CSSProperties = {
    marginTop: 'auto',
    paddingTop: theme.spacing.lg,
    borderTop: `1px solid ${theme.colors.gray[200]}`,
  };

  const metaStyle: CSSProperties = {
    marginBottom: theme.spacing.md,
    color: theme.colors.text.tertiary,
    fontSize: theme.typography.fontSize.sm,
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
  };

  const buttonsStyle: CSSProperties = {
    display: 'flex',
    gap: theme.spacing.sm,
    flexWrap: 'wrap',
  };

  return (
    <Card padding="lg" hover style={cardStyle} className="animate-fade-in">
      <div style={headerStyle}>
        <div style={iconStyle}>📘</div>
        <h3 style={nameStyle}>{course.name}</h3>
      </div>
      <p style={descriptionStyle}>{course.description || 'No description provided'}</p>
      <div style={actionsStyle}>
        <div style={metaStyle}>
          <span>📄</span>
          <span>
            {course.document_count} {course.document_count === 1 ? 'document' : 'documents'}
          </span>
        </div>
        <div style={buttonsStyle}>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate(`/course/${course.id}`)}
            style={{ flex: 1, minWidth: '120px' }}
          >
            View & Chat
          </Button>
          <Button
            variant="success"
            size="sm"
            onClick={() => navigate(`/course/${course.id}?tab=assessments`)}
            style={{ flex: 1, minWidth: '120px' }}
          >
            📝 Assessments
          </Button>
          <Button
            variant="error"
            size="sm"
            onClick={() => onDelete(course.id)}
            style={{ minWidth: '80px' }}
          >
            Delete
          </Button>
        </div>
      </div>
    </Card>
  );
};

