/**
 * Import Document Landing Section
 * Clean, centered landing page for importing course documents
 */

import React, { useRef, useState } from 'react';
import { theme } from '../../theme';
import type { CSSProperties } from 'react';
import { PasteTextModal } from './PasteTextModal';

export interface ImportDocumentLandingProps {
  onFileUpload: (file: File) => void;
  onPasteText?: (title: string, text: string) => Promise<void>;
  uploading?: boolean;
  appName?: string;
}

interface FeatureIcon {
  name: string;
  icon: string;
  color: string;
}

const FEATURES: FeatureIcon[] = [
  { name: 'Quiz', icon: '❓', color: '#f3e8ff' }, // light purple
  { name: 'Open-ended', icon: '📝', color: '#e0e7ff' }, // light blue-purple
  { name: 'Find the mistake', icon: '🔍', color: '#d1fae5' }, // light green
  { name: 'Case-based', icon: '📦', color: '#fed7aa' }, // light orange
];

const SUPPORTED_FORMATS = ['PDF', 'Word', 'PPT', 'TXT'];

export const ImportDocumentLanding: React.FC<ImportDocumentLandingProps> = ({
  onFileUpload,
  onPasteText,
  uploading = false,
  appName = 'Looks',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [isPasting, setIsPasting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Check if we're actually leaving the dropzone
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0 && !uploading) {
      onFileUpload(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && !uploading) {
      onFileUpload(file);
      e.target.value = '';
    }
  };

  const handleDropzoneClick = () => {
    if (!uploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleDropzoneClick();
    }
  };

  const handlePasteText = () => {
    setIsPasteModalOpen(true);
  };

  const handlePasteSubmit = async (title: string, text: string) => {
    if (!onPasteText) return;
    setIsPasting(true);
    try {
      await onPasteText(title, text);
    } finally {
      setIsPasting(false);
    }
  };

  // Container styles
  const containerStyle: CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
    overflow: 'hidden',
    fontFamily: theme.typography.fontFamily.sans,
  };

  const contentStyle: CSSProperties = {
    maxWidth: '1000px',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: theme.spacing.lg,
    padding: `${theme.spacing.xl} ${theme.spacing.md} ${theme.spacing.md}`,
  };

  // Header styles
  const headerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: theme.spacing.sm,
    textAlign: 'center',
  };

  const titleStyle: CSSProperties = {
    fontSize: `clamp(${theme.typography.fontSize['2xl']}, 4vw, ${theme.typography.fontSize['4xl']})`,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    margin: 0,
    lineHeight: theme.typography.lineHeight.tight,
  };

  const subtitleStyle: CSSProperties = {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.secondary,
    margin: 0,
    lineHeight: theme.typography.lineHeight.normal,
  };

  // Feature icons row
  const featuresRowStyle: CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  };

  const featureItemStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: theme.spacing.xs,
    cursor: 'default',
  };

  const featureIconBoxStyle = (color: string): CSSProperties => ({
    width: '56px',
    height: '56px',
    borderRadius: theme.borderRadius.lg,
    backgroundColor: color,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
  });

  const featureLabelStyle: CSSProperties = {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    fontWeight: theme.typography.fontWeight.medium,
  };

  // Dropzone styles
  const getDropzoneStyle = (): CSSProperties => {
    let borderColor: string = theme.colors.gray[300];
    let backgroundColor: string = theme.colors.background.secondary;

    if (isDragging) {
      borderColor = theme.colors.primary[400];
      backgroundColor = theme.colors.primary[50];
    } else if (isHovering && !uploading) {
      borderColor = theme.colors.gray[400];
      backgroundColor = theme.colors.gray[50];
    }

    return {
      width: '100%',
      maxWidth: '600px',
      minHeight: '220px',
      borderRadius: theme.borderRadius.xl,
      border: `2px dashed ${borderColor}`,
      backgroundColor,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      padding: theme.spacing.xl,
      cursor: uploading ? 'not-allowed' : 'pointer',
      transition: `all ${theme.transitions.default}`,
      position: 'relative',
    };
  };

  const uploadIconContainerStyle: CSSProperties = {
    width: '56px',
    height: '56px',
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primary[100],
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px',
    color: theme.colors.primary[600],
  };

  const dropzoneTitleStyle: CSSProperties = {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    margin: 0,
  };

  const dropzoneSubtitleStyle: CSSProperties = {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    margin: 0,
  };

  const formatChipsContainerStyle: CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    justifyContent: 'center',
    marginTop: theme.spacing.sm,
  };

  const formatChipStyle: CSSProperties = {
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.gray[100],
    color: theme.colors.text.secondary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
  };

  // Paste text button
  const pasteButtonStyle: CSSProperties = {
    width: '100%',
    maxWidth: '600px',
    padding: `${theme.spacing.md} ${theme.spacing.lg}`,
    borderRadius: theme.borderRadius.lg,
    border: `1px solid ${theme.colors.gray[300]}`,
    backgroundColor: theme.colors.background.primary,
    color: theme.colors.text.primary,
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    cursor: 'pointer',
    transition: `all ${theme.transitions.default}`,
    fontFamily: theme.typography.fontFamily.sans,
  };

  return (
    <div style={containerStyle}>
      <div style={contentStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <h1 style={titleStyle}>
            Import your course, {appName} takes care of the rest
          </h1>
          <p style={subtitleStyle}>
            Transforms your documents into effective revision tools
          </p>
        </div>

        {/* Feature Icons Row */}
        <div style={featuresRowStyle}>
          {FEATURES.map((feature) => (
            <div key={feature.name} style={featureItemStyle}>
              <div style={featureIconBoxStyle(feature.color)}>{feature.icon}</div>
              <span style={featureLabelStyle}>{feature.name}</span>
            </div>
          ))}
        </div>

        {/* Upload Dropzone */}
        <div
          style={getDropzoneStyle()}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleDropzoneClick}
          onKeyDown={handleKeyDown}
          onMouseEnter={() => !uploading && setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          role="button"
          tabIndex={0}
          aria-label="Upload document"
          aria-disabled={uploading}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.doc,.pptx,.ppt,.txt,.rtf,.csv,.xlsx,.xls,.mp3,.wav,.mp4,.webm,.png,.jpg,.jpeg,.svg"
            onChange={handleFileSelect}
            disabled={uploading}
            style={{ display: 'none' }}
            aria-label="File input"
          />
          <div style={uploadIconContainerStyle}>
            {uploading ? '⏳' : '📤'}
          </div>
          <h2 style={dropzoneTitleStyle}>
            {uploading ? 'Uploading...' : 'Import a document'}
          </h2>
          <p style={dropzoneSubtitleStyle}>
            Drag your file here or click to browse
          </p>
          <div style={formatChipsContainerStyle}>
            {SUPPORTED_FORMATS.map((format) => (
              <span key={format} style={formatChipStyle}>
                {format}
              </span>
            ))}
          </div>
        </div>

        {/* Paste Text Button */}
        <button
          type="button"
          onClick={handlePasteText}
          style={pasteButtonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = theme.colors.gray[400];
            e.currentTarget.style.backgroundColor = theme.colors.gray[50];
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = theme.colors.gray[300];
            e.currentTarget.style.backgroundColor = theme.colors.background.primary;
          }}
        >
          <span>📋</span>
          <span>Paste text</span>
        </button>
      </div>

      {/* Paste Text Modal */}
      {onPasteText && (
        <PasteTextModal
          isOpen={isPasteModalOpen}
          onClose={() => setIsPasteModalOpen(false)}
          onSubmit={handlePasteSubmit}
          isSubmitting={isPasting}
        />
      )}
    </div>
  );
};

