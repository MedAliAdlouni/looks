/**
 * Upload Dropzone Component - Simple drag and drop file upload area
 */

import React, { useRef, useState } from 'react';
import { theme } from '../../theme';
import type { CSSProperties } from 'react';

export interface UploadDropzoneProps {
  onFileUpload: (file: File) => void;
  uploading?: boolean;
  acceptedTypes?: string;
}

export const UploadDropzone: React.FC<UploadDropzoneProps> = ({
  onFileUpload,
  uploading = false,
  acceptedTypes = '.pdf,.docx,.doc,.pptx,.ppt,.txt,.rtf,.csv,.xlsx,.xls,.mp3,.wav,.mp4,.webm,.png,.jpg,.jpeg,.svg',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
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
    if (files.length > 0) {
      onFileUpload(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
      e.target.value = '';
    }
  };

  const containerStyle: CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xs,
    position: 'relative',
    cursor: 'pointer',
  };

  const contentStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: theme.spacing.xs,
    color: theme.colors.text.tertiary,
    transition: `color ${theme.transitions.default}`,
  };

  const iconStyle: CSSProperties = {
    fontSize: '2rem',
    opacity: 0.6,
  };

  const textStyle: CSSProperties = {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.tertiary,
    textAlign: 'center',
    margin: 0,
  };

  const inputStyle: CSSProperties = {
    display: 'none',
  };

  return (
    <div
      style={containerStyle}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !uploading && fileInputRef.current?.click()}
      onMouseEnter={(e) => {
        const content = e.currentTarget.querySelector('[data-upload-content]') as HTMLElement;
        if (content) {
          content.style.color = theme.colors.text.secondary;
        }
      }}
      onMouseLeave={(e) => {
        const content = e.currentTarget.querySelector('[data-upload-content]') as HTMLElement;
        if (content) {
          content.style.color = theme.colors.text.tertiary;
        }
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes}
        onChange={handleFileSelect}
        disabled={uploading}
        style={inputStyle}
      />
      <div style={contentStyle} data-upload-content>
        <div style={iconStyle}>📤</div>
        <p style={textStyle}>
          {uploading ? 'Uploading...' : 'Drop your files here to add them to the course material.'}
        </p>
      </div>
    </div>
  );
};

