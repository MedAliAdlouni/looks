/**
 * Document Sidebar Component - Left sidebar listing all documents
 */

import React from 'react';
import { theme } from '../../theme';
import type { Document } from '../../types/api';
import type { CSSProperties } from 'react';

export interface DocumentSidebarProps {
  documents: Document[];
  selectedDocumentId?: string;
  onDocumentClick: (document: Document) => void;
  uploading?: boolean;
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

export const DocumentSidebar: React.FC<DocumentSidebarProps> = ({
  documents,
  selectedDocumentId,
  onDocumentClick,
  uploading = false,
}) => {
  const sidebarStyle: CSSProperties = {
    width: '280px',
    minWidth: '280px',
    height: '100%',
    background: theme.colors.background.overlay,
    backdropFilter: 'blur(10px)',
    borderRight: `1px solid ${theme.colors.gray[200]}`,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    flexShrink: 0,
    minHeight: 0,
  };

  const headerStyle: CSSProperties = {
    padding: theme.spacing.lg,
    borderBottom: `1px solid ${theme.colors.gray[200]}`,
  };

  const titleStyle: CSSProperties = {
    margin: 0,
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  };

  const countStyle: CSSProperties = {
    marginTop: theme.spacing.xs,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.tertiary,
  };

  const listStyle: CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    padding: theme.spacing.sm,
    minHeight: 0,
  };

  const documentItemStyle = (isSelected: boolean, isCompleted: boolean): CSSProperties => ({
    padding: theme.spacing.md,
    marginBottom: theme.spacing.xs,
    borderRadius: theme.borderRadius.lg,
    cursor: isCompleted ? 'pointer' : 'not-allowed',
    background: isSelected
      ? theme.colors.primary[100]
      : isCompleted
      ? theme.colors.background.primary
      : theme.colors.gray[100],
    border: isSelected ? `2px solid ${theme.colors.primary.DEFAULT}` : `1px solid ${theme.colors.gray[200]}`,
    transition: `all ${theme.transitions.default}`,
    opacity: isCompleted ? 1 : 0.6,
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
  });

  const iconStyle: CSSProperties = {
    fontSize: '1.5rem',
    flexShrink: 0,
  };

  const infoStyle: CSSProperties = {
    flex: 1,
    minWidth: 0,
  };

  const nameStyle: CSSProperties = {
    margin: 0,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const statusStyle: CSSProperties = {
    marginTop: theme.spacing.xs,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
  };

  const emptyStyle: CSSProperties = {
    padding: theme.spacing.xl,
    textAlign: 'center',
    color: theme.colors.text.tertiary,
  };

  const emptyTextStyle: CSSProperties = {
    marginTop: theme.spacing.sm,
    fontSize: theme.typography.fontSize.sm,
  };

  return (
    <div style={sidebarStyle}>
      <div style={headerStyle}>
        <h2 style={titleStyle}>Documents</h2>
        <div style={countStyle}>
          {documents.length} {documents.length === 1 ? 'document' : 'documents'}
          {uploading && ' • Uploading...'}
        </div>
      </div>
      <div style={listStyle}>
        {documents.length === 0 ? (
          <div style={emptyStyle}>
            <div style={{ fontSize: '2rem', marginBottom: theme.spacing.sm }}>📄</div>
            <div style={emptyTextStyle}>No documents yet</div>
          </div>
        ) : (
          documents.map((doc) => {
            const isSelected = doc.id === selectedDocumentId;
            const isCompleted = doc.processing_status === 'completed';

            return (
              <div
                key={doc.id}
                style={documentItemStyle(isSelected, isCompleted)}
                onClick={() => isCompleted && onDocumentClick(doc)}
                onMouseEnter={(e) => {
                  if (isCompleted) {
                    e.currentTarget.style.background = isSelected
                      ? theme.colors.primary[200]
                      : theme.colors.gray[50];
                  }
                }}
                onMouseLeave={(e) => {
                  if (isCompleted) {
                    e.currentTarget.style.background = isSelected
                      ? theme.colors.primary[100]
                      : theme.colors.background.primary;
                  }
                }}
              >
                <div style={iconStyle}>{getFileIcon(doc.file_type)}</div>
                <div style={infoStyle}>
                  <div style={nameStyle} title={doc.filename}>
                    {doc.filename}
                  </div>
                  <div style={statusStyle}>
                    {isCompleted ? '✓ Ready' : '⏳ Processing'}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

