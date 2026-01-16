import { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import type { Document as DocumentType, Course } from '../../types/api';

interface DocumentViewerProps {
  document: DocumentType;
  courseId: string;
  course: Course;
  onClose: () => void;
  variant?: 'embedded' | 'fullscreen';
}

export default function DocumentViewer({ document, courseId, course, onClose, variant = 'fullscreen' }: DocumentViewerProps) {
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const loadDownloadUrl = async () => {
      try {
        const url = apiClient.getDocumentFileUrl(document.id);
        setDownloadUrl(url);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load document');
        setLoading(false);
      }
    };

    loadDownloadUrl();
  }, [document.id]);

  const handleDownload = async () => {
    if (!downloadUrl) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(downloadUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to download file');
      }
      
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = objectUrl;
      link.download = document.filename;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download file');
    }
  };

  const getFileTypeName = (fileType: string): string => {
    const typeMap: Record<string, string> = {
      'docx': 'Word Document',
      'doc': 'Word Document',
      'pptx': 'PowerPoint Presentation',
      'ppt': 'PowerPoint Presentation',
      'txt': 'Text File',
      'rtf': 'Rich Text Format',
      'csv': 'CSV Spreadsheet',
      'xlsx': 'Excel Spreadsheet',
      'xls': 'Excel Spreadsheet',
    };
    return typeMap[fileType] || 'Document';
  };

  // Embedded mode: just return the core viewer
  if (variant === 'embedded') {
    return (
      <div style={embeddedStyles.container}>
        {loading ? (
          <div style={embeddedStyles.loading}>
            <p>Loading document...</p>
          </div>
        ) : error ? (
          <div style={embeddedStyles.error}>
            <p><strong>Error:</strong></p>
            <p>{error}</p>
          </div>
        ) : (
          <div style={embeddedStyles.documentContainer}>
            <div style={embeddedStyles.documentInfo}>
              <div style={embeddedStyles.documentIcon}>
                {document.file_type === 'docx' || document.file_type === 'doc' ? '📝' :
                 document.file_type === 'pptx' || document.file_type === 'ppt' ? '📊' :
                 document.file_type === 'txt' || document.file_type === 'rtf' ? '📃' :
                 document.file_type === 'csv' || document.file_type === 'xlsx' || document.file_type === 'xls' ? '📈' : '📄'}
              </div>
              <h3 style={embeddedStyles.documentTitle}>{document.filename}</h3>
              <p style={embeddedStyles.documentType}>{getFileTypeName(document.file_type)}</p>
              <div style={embeddedStyles.documentMeta}>
                <span>📑 {document.num_pages} {document.num_pages === 1 ? 'page' : 'pages'}</span>
                <span>💾 {(document.file_size / 1024).toFixed(2)} KB</span>
              </div>
              <button onClick={handleDownload} style={embeddedStyles.downloadButton}>
                📥 Download File
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Fullscreen mode: return the full UI
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <button onClick={onClose} style={styles.backButton}>
            ← Back
          </button>
          <h2 style={styles.title}>{document.filename}</h2>
        </div>
        <div style={styles.headerRight}>
          <span style={styles.fileInfo}>
            {getFileTypeName(document.file_type)} • {(document.file_size / 1024).toFixed(2)} KB
          </span>
        </div>
      </div>

      <div style={styles.content}>
        {loading ? (
          <div style={styles.loading}>
            <p>Loading document...</p>
          </div>
        ) : error ? (
          <div style={styles.error}>
            <p><strong>Error:</strong></p>
            <p>{error}</p>
            <button onClick={onClose} style={styles.closeButton}>
              Close
            </button>
          </div>
        ) : (
          <div style={styles.documentContainer}>
            <div style={styles.documentInfo}>
              <div style={styles.documentIcon}>
                {document.file_type === 'docx' || document.file_type === 'doc' ? '📝' :
                 document.file_type === 'pptx' || document.file_type === 'ppt' ? '📊' :
                 document.file_type === 'txt' || document.file_type === 'rtf' ? '📃' :
                 document.file_type === 'csv' || document.file_type === 'xlsx' || document.file_type === 'xls' ? '📈' : '📄'}
              </div>
              <h3 style={styles.documentTitle}>{document.filename}</h3>
              <p style={styles.documentType}>{getFileTypeName(document.file_type)}</p>
              <div style={styles.documentMeta}>
                <span>📑 {document.num_pages} {document.num_pages === 1 ? 'page' : 'pages'}</span>
                <span>💾 {(document.file_size / 1024).toFixed(2)} KB</span>
              </div>
              <p style={styles.documentDescription}>
                This file has been processed and indexed for the AI tutor. 
                You can download it to view it in your preferred application.
              </p>
              <button onClick={handleDownload} style={styles.downloadButton}>
                📥 Download File
              </button>
              <p style={styles.note}>
                <strong>Note:</strong> Text-based files (DOCX, PPTX, TXT, RTF, CSV, XLSX) are processed 
                for RAG and can be used in the chat. Media files (MP3, WAV, MP4, WEBM) are stored 
                but not processed for text extraction.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 1000,
  },
  header: {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    padding: '1rem 1.5rem',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    flex: 1,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  title: {
    margin: 0,
    fontSize: '1.25rem',
    color: '#111827',
    fontWeight: '700',
  },
  fileInfo: {
    color: '#6b7280',
    fontSize: '0.875rem',
    fontWeight: '500',
  },
  backButton: {
    padding: '0.625rem 1.25rem',
    background: 'rgba(107, 114, 128, 0.1)',
    color: '#374151',
    border: 'none',
    borderRadius: '0.75rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '600',
    transition: 'all 0.2s',
  },
  content: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '2rem',
    overflow: 'auto',
  },
  loading: {
    textAlign: 'center',
    padding: '3rem 2rem',
    color: 'white',
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    borderRadius: '1rem',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  },
  error: {
    background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
    color: '#dc2626',
    padding: '1.25rem',
    borderRadius: '0.75rem',
    margin: '1rem',
    border: '1px solid #fca5a5',
    fontSize: '0.875rem',
    fontWeight: '500',
    textAlign: 'center',
  },
  closeButton: {
    padding: '0.75rem 1.5rem',
    background: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginTop: '1rem',
  },
  documentContainer: {
    width: '100%',
    maxWidth: '800px',
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    borderRadius: '1rem',
    padding: '3rem',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    textAlign: 'center',
  },
  documentInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
  },
  documentIcon: {
    fontSize: '5rem',
    marginBottom: '1rem',
  },
  documentTitle: {
    margin: '0 0 0.5rem 0',
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#111827',
  },
  documentType: {
    margin: '0 0 1rem 0',
    color: '#6b7280',
    fontSize: '1rem',
    fontWeight: '500',
  },
  documentMeta: {
    display: 'flex',
    gap: '1.5rem',
    marginBottom: '1.5rem',
    color: '#6b7280',
    fontSize: '0.875rem',
  },
  documentDescription: {
    margin: '0 0 1.5rem 0',
    color: '#374151',
    fontSize: '1rem',
    lineHeight: '1.6',
    maxWidth: '600px',
  },
  downloadButton: {
    padding: '0.875rem 2rem',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '0.75rem',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '600',
    transition: 'all 0.2s',
    boxShadow: '0 4px 6px -1px rgba(102, 126, 234, 0.3)',
  },
  note: {
    margin: '2rem 0 0 0',
    padding: '1rem',
    background: 'rgba(102, 126, 234, 0.1)',
    borderRadius: '0.5rem',
    color: '#374151',
    fontSize: '0.875rem',
    lineHeight: '1.6',
    textAlign: 'left',
    maxWidth: '600px',
  },
};

// Embedded mode styles
const embeddedStyles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
    overflow: 'auto',
    background: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '2rem',
  },
  documentContainer: {
    width: '100%',
    maxWidth: '800px',
    textAlign: 'center',
  },
  documentInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
  },
  documentIcon: {
    fontSize: '4rem',
    marginBottom: '0.5rem',
  },
  documentTitle: {
    margin: '0 0 0.5rem 0',
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#111827',
  },
  documentType: {
    margin: '0 0 1rem 0',
    color: '#6b7280',
    fontSize: '0.875rem',
    fontWeight: '500',
  },
  documentMeta: {
    display: 'flex',
    gap: '1.5rem',
    marginBottom: '1.5rem',
    color: '#6b7280',
    fontSize: '0.875rem',
  },
  downloadButton: {
    padding: '0.75rem 1.5rem',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '0.75rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '600',
    transition: 'all 0.2s',
    boxShadow: '0 4px 6px -1px rgba(102, 126, 234, 0.3)',
  },
  loading: {
    textAlign: 'center',
    padding: '3rem 2rem',
    color: '#6b7280',
  },
  error: {
    background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
    color: '#dc2626',
    padding: '1.25rem',
    borderRadius: '0.75rem',
    margin: '1rem',
    border: '1px solid #fca5a5',
    fontSize: '0.875rem',
    fontWeight: '500',
    textAlign: 'center',
  },
};

