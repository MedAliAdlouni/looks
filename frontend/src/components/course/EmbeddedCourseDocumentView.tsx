/**
 * Embedded Course Document View - Wrapper component for embedded document viewing
 * Manages the layout: viewer on left, chat sidebar on right (auto-opens when document is selected)
 */

import React, { useState, useEffect } from 'react';
import type { Document, Course } from '../../types/api';
import {
  PDFViewer,
  MediaViewer,
  ImageViewer,
  DocxViewer,
  PptxViewer,
  DocumentViewer,
} from '../viewers';
import { DocumentChatSidebar } from './DocumentChatSidebar';
import { theme } from '../../theme';
import type { CSSProperties } from 'react';

export interface EmbeddedCourseDocumentViewProps {
  document: Document;
  courseId: string;
  course: Course;
  documents?: Document[]; // For PDFViewer navigation
  onClose: () => void;
}

export const EmbeddedCourseDocumentView: React.FC<EmbeddedCourseDocumentViewProps> = ({
  document,
  courseId,
  course,
  documents = [],
  onClose,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(true); // Auto-open by default
  const [sidebarWidth, setSidebarWidth] = useState(400);

  // Determine which viewer to use based on file type
  const getViewerComponent = () => {
    if (['mp3', 'wav', 'mp4', 'webm'].includes(document.file_type)) {
      return MediaViewer;
    } else if (['png', 'jpg', 'jpeg', 'svg'].includes(document.file_type)) {
      return ImageViewer;
    } else if (['docx', 'doc'].includes(document.file_type)) {
      return DocxViewer;
    } else if (['pptx', 'ppt'].includes(document.file_type)) {
      return PptxViewer;
    } else if (document.file_type === 'pdf') {
      return PDFViewer;
    } else {
      return DocumentViewer;
    }
  };

  const ViewerComponent = getViewerComponent();
  const documentType = 
    document.file_type === 'pdf' ? 'document' :
    ['docx', 'doc'].includes(document.file_type) ? 'document' :
    ['pptx', 'ppt'].includes(document.file_type) ? 'presentation' :
    ['png', 'jpg', 'jpeg', 'svg'].includes(document.file_type) ? 'image' :
    ['mp3', 'wav', 'mp4', 'webm'].includes(document.file_type) ? 'media' :
    'document';

  // Handle source click for PDF viewer navigation
  const handleSourceClick = (source: { document_id: string; document_name: string; page: number; chunk_text: string }) => {
    // This will be handled by the PDFViewer internally when in embedded mode
    // For now, we'll pass it through if needed
    console.log('Source clicked:', source);
  };

  const containerStyle: CSSProperties = {
    display: 'flex',
    height: '100%',
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
  };

  const viewerContainerStyle: CSSProperties = {
    flex: 1,
    minWidth: 0,
    height: '100%',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    transition: 'width 0.3s ease',
    width: sidebarOpen 
      ? `calc(100% - ${sidebarWidth}px)` 
      : '100%',
  };

  const showChatButtonStyle: CSSProperties = {
    position: 'absolute',
    right: '1rem',
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 100,
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

  return (
    <div style={containerStyle}>
      {/* Viewer Area */}
      <div style={viewerContainerStyle}>
        <ViewerComponent
          document={document}
          courseId={courseId}
          course={course}
          onClose={onClose}
          variant="embedded"
          {...(document.file_type === 'pdf' ? { documents } : {})}
        />
        
        {/* Show Chat Button - appears when sidebar is hidden */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            style={showChatButtonStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #059669 0%, #047857 100%)';
              e.currentTarget.style.transform = 'translateY(-50%) scale(1.05)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
              e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)';
            }}
            title="Show chat sidebar"
          >
            💬 Show Chat
          </button>
        )}
      </div>

      {/* Chat Sidebar */}
      <DocumentChatSidebar
        courseId={courseId}
        documentId={document.id}
        documentType={documentType}
        onSourceClick={handleSourceClick}
        width={sidebarWidth}
        onWidthChange={setSidebarWidth}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />
    </div>
  );
};

