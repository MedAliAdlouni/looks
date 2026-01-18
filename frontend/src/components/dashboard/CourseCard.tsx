/**
 * Premium Course Card Component
 * Clean, minimal design with clickable card and kebab menu
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { theme } from '../../theme';
import { KebabMenu } from './KebabMenu';
import type { Course } from '../../types/api';
import type { CSSProperties } from 'react';

export interface CourseCardProps {
  course: Course;
  onEdit: (course: Course) => void;
  onDelete: (courseId: string) => void;
}

/**
 * Generate a pastel color based on a string (course ID)
 * This ensures consistent colors for the same course
 */
const generatePastelColor = (seed: string): string => {
  // Create a simple hash from the seed string
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Generate pastel colors by keeping values in the 180-255 range
  // This ensures light, pastel colors
  const r = 180 + (Math.abs(hash) % 76); // 180-255 range
  const g = 180 + (Math.abs(hash >> 8) % 76); // 180-255 range
  const b = 180 + (Math.abs(hash >> 16) % 76); // 180-255 range

  return `rgb(${r}, ${g}, ${b})`;
};

export const CourseCard: React.FC<CourseCardProps> = ({
  course,
  onEdit,
  onDelete,
}) => {
  const navigate = useNavigate();

  // Generate a consistent pastel color for this course
  const pastelColor = generatePastelColor(course.id);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const cardStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    cursor: 'pointer',
    borderRadius: theme.borderRadius.xl,
    border: `1px solid ${theme.colors.gray[200]}`,
    boxShadow: theme.shadows.sm,
    transition: `all ${theme.transitions.default}`,
    height: '100%',
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  };

  const iconStyle: CSSProperties = {
    fontSize: '1.5rem',
    flexShrink: 0,
  };

  const titleSectionStyle: CSSProperties = {
    flex: 1,
    minWidth: 0,
  };

  const nameStyle: CSSProperties = {
    margin: `0 0 ${theme.spacing.xs} 0`,
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    lineHeight: theme.typography.lineHeight.tight,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  };

  const descriptionStyle: CSSProperties = {
    margin: `0 0 ${theme.spacing.md} 0`,
    color: theme.colors.text.secondary,
    fontSize: theme.typography.fontSize.sm,
    lineHeight: theme.typography.lineHeight.relaxed,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
    flex: 1,
  };

  const metadataStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.md,
    flexWrap: 'wrap',
    marginTop: 'auto',
    paddingTop: theme.spacing.md,
    borderTop: `1px solid ${theme.colors.gray[100]}`,
  };

  const badgeStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: theme.spacing.xs,
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    background: theme.colors.gray[100],
    borderRadius: theme.borderRadius.md,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.secondary,
    fontWeight: theme.typography.fontWeight.medium,
  };

  const dateStyle: CSSProperties = {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on the kebab menu
    if ((e.target as HTMLElement).closest('[aria-label="Course options"]')) {
      return;
    }
    navigate(`/course/${course.id}`);
  };

  const handleEdit = () => {
    onEdit(course);
  };

  const handleDelete = () => {
    onDelete(course.id);
  };

  return (
    <div
      style={{
        ...cardStyle,
        background: pastelColor,
        padding: theme.spacing.lg,
      }}
      onClick={handleCardClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = theme.shadows.md;
        e.currentTarget.style.borderColor = theme.colors.gray[300];
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = theme.shadows.sm;
        e.currentTarget.style.borderColor = theme.colors.gray[200];
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div style={headerStyle}>
        <div style={iconStyle}>📚</div>
        <div style={titleSectionStyle}>
          <h3 style={nameStyle}>{course.name}</h3>
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <KebabMenu onEdit={handleEdit} onDelete={handleDelete} />
        </div>
      </div>
      <p style={descriptionStyle}>
        {course.description || 'No description provided'}
      </p>
      <div style={metadataStyle}>
        <div style={badgeStyle}>
          <span>📄</span>
          <span>
            {course.document_count} {course.document_count === 1 ? 'document' : 'documents'}
          </span>
        </div>
        <div style={dateStyle}>
          Created {formatDate(course.created_at)}
        </div>
      </div>
    </div>
  );
};

