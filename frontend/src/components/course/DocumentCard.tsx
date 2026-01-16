/**
 * Document Card Component
 */

import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { theme } from '../../theme';
import type { Document } from '../../types/api';
import type { CSSProperties } from 'react';

export interface DocumentCardProps {
  document: Document;
  onClick: () => void;
  index?: number;
}

const getFileIcon = (fileType: string): string => {
  const iconMap: Record<string, string> = {
    pdf: '📄',
    docx: '📝',
    doc: '📝',
    pptx: '📊',
    ppt: '📊',
    txt: '📃',
    rtf: '📃',
    csv: '📈',
    xlsx: '📊',
    xls: '📊',
    mp3: '🎵',
    wav: '🎵',
    mp4: '🎬',
    webm: '🎬',
    png: '🖼️',
    jpg: '🖼️',
    jpeg: '🖼️',
    svg: '🖼️',
  };
  return iconMap[fileType] || '📄';
};

const getViewButtonText = (fileType: string): string => {
  if (fileType === 'mp3' || fileType === 'wav') return 'Play Audio';
  if (fileType === 'mp4' || fileType === 'webm') return 'Play Video';
  if (fileType === 'png' || fileType === 'jpg' || fileType === 'jpeg' || fileType === 'svg')
    return 'View Image';
  if (fileType === 'pdf') return 'Open PDF';
  return 'Open File';
};

export const DocumentCard: React.FC<DocumentCardProps> = ({ document, onClick, index = 0 }) => {
  const isCompleted = document.processing_status === 'completed';
  const isMediaOrImage =
    ['mp3', 'wav', 'mp4', 'webm', 'png', 'jpg', 'jpeg', 'svg'].includes(document.file_type);

  const cardStyle: CSSProperties = {
    display: 'flex',
    gap: theme.spacing.md,
    alignItems: 'flex-start',
    animationDelay: `${index * 0.1}s`,
  };

  const iconStyle: CSSProperties = {
    fontSize: '2rem',
    flexShrink: 0,
  };

  const infoStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.sm,
    flex: 1,
  };

  const nameStyle: CSSProperties = {
    margin: 0,
    color: theme.colors.text.primary,
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
  };

  const metaStyle: CSSProperties = {
    margin: 0,
    color: theme.colors.text.tertiary,
    fontSize: theme.typography.fontSize.sm,
    display: 'flex',
    gap: theme.spacing.md,
    flexWrap: 'wrap',
    alignItems: 'center',
  };

  const statusBadgeStyle: CSSProperties = {
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    ...(isCompleted
      ? {
          background: 'rgba(16, 185, 129, 0.1)',
          color: theme.colors.success.dark,
        }
      : {
          background: 'rgba(245, 158, 11, 0.1)',
          color: theme.colors.warning.dark,
        }),
  };

  return (
    <Card
      padding="lg"
      hover={isCompleted}
      onClick={isCompleted ? onClick : undefined}
      style={cardStyle}
      className={isCompleted ? 'document-card-hover animate-fade-in' : 'animate-fade-in'}
    >
      <div style={iconStyle}>{getFileIcon(document.file_type)}</div>
      <div style={infoStyle}>
        <h4 style={nameStyle}>{document.filename}</h4>
        <div style={metaStyle}>
          {!isMediaOrImage && (
            <span>
              📑 {document.num_pages} {document.num_pages === 1 ? 'page' : 'pages'}
            </span>
          )}
          <span>💾 {(document.file_size / 1024).toFixed(2)} KB</span>
          <span style={statusBadgeStyle}>
            {isCompleted ? '✓ Ready' : '⏳ Processing'}
          </span>
        </div>
        {isCompleted && (
          <Button
            variant="primary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            style={{ marginTop: theme.spacing.sm, alignSelf: 'flex-start' }}
          >
            {getViewButtonText(document.file_type)} →
          </Button>
        )}
      </div>
    </Card>
  );
};

