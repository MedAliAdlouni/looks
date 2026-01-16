/**
 * Documents Tab Component
 */

import React from 'react';
import { DocumentCard } from './DocumentCard';
import { Card, Button } from '../ui';
import { theme } from '../../theme';
import type { Document } from '../../types/api';
import type { CSSProperties } from 'react';

export interface DocumentsTabProps {
  documents: Document[];
  uploading: boolean;
  onFileUpload: (file: File) => void;
  onDocumentClick: (document: Document) => void;
}

export const DocumentsTab: React.FC<DocumentsTabProps> = ({
  documents,
  uploading,
  onFileUpload,
  onDocumentClick,
}) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
      e.target.value = ''; // Reset input
    }
  };

  const sectionStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.xl,
  };

  const uploadSectionStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
    borderBottom: `1px solid ${theme.colors.gray[200]}`,
  };

  const titleStyle: CSSProperties = {
    margin: 0,
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  };

  const subtitleStyle: CSSProperties = {
    margin: 0,
    color: theme.colors.text.tertiary,
    fontSize: theme.typography.fontSize.sm,
  };

  const fileInputStyle: CSSProperties = {
    display: 'none',
  };

  const uploadButtonStyle: CSSProperties = {
    alignSelf: 'flex-start',
  };

  const emptyStyle: CSSProperties = {
    textAlign: 'center',
    padding: theme.spacing['4xl'],
  };

  const emptyIconStyle: CSSProperties = {
    fontSize: '4rem',
    marginBottom: theme.spacing.md,
  };

  const emptyTitleStyle: CSSProperties = {
    margin: `0 0 ${theme.spacing.sm} 0`,
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  };

  const emptyTextStyle: CSSProperties = {
    margin: 0,
    color: theme.colors.text.tertiary,
  };

  const documentsListStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.md,
  };

  return (
    <Card padding="xl" style={sectionStyle}>
      <div style={uploadSectionStyle}>
        <h3 style={titleStyle}>Upload Document</h3>
        <p style={subtitleStyle}>
          Add files to your course (PDF, DOCX, PPTX, TXT, RTF, CSV, XLSX, MP3, WAV, MP4, WEBM,
          PNG, JPG, JPEG, SVG)
        </p>
        <input
          type="file"
          accept=".pdf,.docx,.doc,.pptx,.ppt,.txt,.rtf,.csv,.xlsx,.xls,.mp3,.wav,.mp4,.webm,.png,.jpg,.jpeg,.svg"
          onChange={handleFileChange}
          disabled={uploading}
          style={fileInputStyle}
          id="file-upload"
        />
        <label htmlFor="file-upload" style={uploadButtonStyle}>
          <Button variant="primary" isLoading={uploading} as="span">
            📤 Choose File
          </Button>
        </label>
      </div>

      <div>
        <h3 style={titleStyle}>Documents ({documents.length})</h3>
        {documents.length === 0 ? (
          <div style={emptyStyle}>
            <div style={emptyIconStyle}>📄</div>
            <h4 style={emptyTitleStyle}>No documents yet</h4>
            <p style={emptyTextStyle}>Upload a file to get started!</p>
          </div>
        ) : (
          <div style={documentsListStyle}>
            {documents.map((doc, index) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onClick={() => onDocumentClick(doc)}
                index={index}
              />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};

