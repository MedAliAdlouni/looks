/**
 * Course Card Skeleton Loader
 * Loading placeholder for course cards
 */

import React from 'react';
import { Card } from '../ui/Card';
import { theme } from '../../theme';
import type { CSSProperties } from 'react';

export const CourseCardSkeleton: React.FC = () => {
  const skeletonStyle: CSSProperties = {
    background: theme.colors.gray[200],
    borderRadius: theme.borderRadius.md,
    animation: 'pulse 1.5s ease-in-out infinite',
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  };

  const iconSkeletonStyle: CSSProperties = {
    ...skeletonStyle,
    width: '32px',
    height: '32px',
  };

  const titleSkeletonStyle: CSSProperties = {
    ...skeletonStyle,
    height: '24px',
    flex: 1,
  };

  const descriptionSkeletonStyle: CSSProperties = {
    ...skeletonStyle,
    height: '16px',
    marginBottom: theme.spacing.xs,
  };

  const metaSkeletonStyle: CSSProperties = {
    ...skeletonStyle,
    height: '20px',
    width: '120px',
    marginTop: theme.spacing.md,
  };

  return (
    <Card padding="lg">
      <div style={headerStyle}>
        <div style={iconSkeletonStyle} />
        <div style={titleSkeletonStyle} />
        <div style={{ width: '32px', height: '32px' }} />
      </div>
      <div style={descriptionSkeletonStyle} />
      <div style={{ ...descriptionSkeletonStyle, width: '80%' }} />
      <div style={metaSkeletonStyle} />
    </Card>
  );
};

