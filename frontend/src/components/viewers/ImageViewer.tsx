import { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import type { Document as DocumentType, Course } from '../../types/api';

interface ImageViewerProps {
  document: DocumentType;
  courseId: string;
  course: Course;
  onClose: () => void;
  variant?: 'embedded' | 'fullscreen';
}

export default function ImageViewer({ document, courseId, course, onClose, variant = 'fullscreen' }: ImageViewerProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const loadImage = async () => {
      try {
        const url = apiClient.getDocumentFileUrl(document.id);
        const token = localStorage.getItem('token');
        
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (!response.ok) {
          throw new Error('Failed to load image');
        }
        
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        setImageUrl(objectUrl);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load image');
        setLoading(false);
      }
    };

    loadImage();

    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [document.id]);

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom(prev => Math.max(0.5, Math.min(5, prev + delta)));
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetView = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  // Embedded mode: just return the core viewer
  if (variant === 'embedded') {
    return (
      <div style={embeddedStyles.container}>
        <div style={embeddedStyles.controlsBar}>
          <div style={embeddedStyles.controls}>
            <button 
              onClick={() => setZoom(prev => Math.max(0.5, prev - 0.25))} 
              style={embeddedStyles.controlButton}
              title="Zoom out"
            >
              −
            </button>
            <span style={embeddedStyles.zoomText}>{Math.round(zoom * 100)}%</span>
            <button 
              onClick={() => setZoom(prev => Math.min(5, prev + 0.25))} 
              style={embeddedStyles.controlButton}
              title="Zoom in"
            >
              +
            </button>
            <button 
              onClick={resetView} 
              style={embeddedStyles.resetButton}
              title="Reset view"
            >
              ↺ Reset
            </button>
          </div>
        </div>
        <div 
          style={embeddedStyles.content}
          onWheel={handleWheel}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {loading ? (
            <div style={embeddedStyles.loading}>
              <p>Loading image...</p>
            </div>
          ) : error ? (
            <div style={embeddedStyles.error}>
              <p><strong>Error:</strong></p>
              <p>{error}</p>
            </div>
          ) : imageUrl ? (
            <div
              style={{
                ...embeddedStyles.imageWrapper,
                transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
                transition: zoom === 1 ? 'transform 0.2s' : 'none',
              }}
              onMouseDown={handleMouseDown}
            >
              <img
                src={imageUrl}
                alt={document.filename}
                style={embeddedStyles.image}
                draggable={false}
              />
            </div>
          ) : null}
        </div>
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
          <div style={styles.controls}>
            <button 
              onClick={() => setZoom(prev => Math.max(0.5, prev - 0.25))} 
              style={styles.controlButton}
              title="Zoom out"
            >
              −
            </button>
            <span style={styles.zoomText}>{Math.round(zoom * 100)}%</span>
            <button 
              onClick={() => setZoom(prev => Math.min(5, prev + 0.25))} 
              style={styles.controlButton}
              title="Zoom in"
            >
              +
            </button>
            <button 
              onClick={resetView} 
              style={styles.resetButton}
              title="Reset view"
            >
              ↺ Reset
            </button>
          </div>
          <span style={styles.fileInfo}>
            🖼️ Image • {(document.file_size / 1024).toFixed(2)} KB
          </span>
        </div>
      </div>

      <div 
        style={styles.content}
        onWheel={handleWheel}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {loading ? (
          <div style={styles.loading}>
            <p>Loading image...</p>
          </div>
        ) : error ? (
          <div style={styles.error}>
            <p><strong>Error:</strong></p>
            <p>{error}</p>
            <button onClick={onClose} style={styles.closeButton}>
              Close
            </button>
          </div>
        ) : imageUrl ? (
          <div style={styles.imageContainer}>
            <div
              style={{
                ...styles.imageWrapper,
                transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
                transition: zoom === 1 ? 'transform 0.2s' : 'none',
              }}
              onMouseDown={handleMouseDown}
            >
              <img
                src={imageUrl}
                alt={document.filename}
                style={styles.image}
                draggable={false}
              />
            </div>
            <div style={styles.imageInfo}>
              <h3 style={styles.imageTitle}>{document.filename}</h3>
              <p style={styles.imageMeta}>
                Course: {course.name} • Size: {(document.file_size / 1024).toFixed(2)} KB • 
                Format: {document.file_type.toUpperCase()}
              </p>
              <p style={styles.imageHint}>
                Use Ctrl/Cmd + Scroll to zoom • Click and drag when zoomed in
              </p>
            </div>
          </div>
        ) : null}
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
    flexWrap: 'wrap',
    gap: '1rem',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    flex: 1,
    minWidth: 0,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    flexWrap: 'wrap',
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
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'rgba(102, 126, 234, 0.1)',
    padding: '0.25rem',
    borderRadius: '0.75rem',
  },
  controlButton: {
    padding: '0.5rem 0.875rem',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '600',
    transition: 'all 0.2s',
    minWidth: '40px',
  },
  zoomText: {
    minWidth: '50px',
    textAlign: 'center',
    fontSize: '0.875rem',
    color: '#333',
    fontWeight: '600',
  },
  resetButton: {
    padding: '0.5rem 1rem',
    background: 'rgba(107, 114, 128, 0.1)',
    color: '#374151',
    border: 'none',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '600',
    transition: 'all 0.2s',
    marginLeft: '0.5rem',
  },
  content: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '2rem',
    overflow: 'hidden',
    position: 'relative',
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
  imageContainer: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1.5rem',
    position: 'relative',
  },
  imageWrapper: {
    maxWidth: '100%',
    maxHeight: '70vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    transition: 'transform 0.2s',
  },
  image: {
    maxWidth: '100%',
    maxHeight: '70vh',
    objectFit: 'contain',
    borderRadius: '0.5rem',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
    background: 'white',
    padding: '0.5rem',
  },
  imageInfo: {
    textAlign: 'center',
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    borderRadius: '0.75rem',
    padding: '1rem 2rem',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    maxWidth: '800px',
  },
  imageTitle: {
    margin: '0 0 0.5rem 0',
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#111827',
  },
  imageMeta: {
    margin: '0 0 0.5rem 0',
    color: '#6b7280',
    fontSize: '0.875rem',
  },
  imageHint: {
    margin: 0,
    color: '#9ca3af',
    fontSize: '0.75rem',
    fontStyle: 'italic',
  },
};

// Embedded mode styles
const embeddedStyles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
    overflow: 'hidden',
    background: '#f9fafb',
  },
  controlsBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.5rem 1rem',
    background: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
    flexShrink: 0,
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'rgba(102, 126, 234, 0.1)',
    padding: '0.25rem',
    borderRadius: '0.75rem',
  },
  controlButton: {
    padding: '0.5rem 0.875rem',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '600',
    transition: 'all 0.2s',
    minWidth: '40px',
  },
  zoomText: {
    minWidth: '50px',
    textAlign: 'center',
    fontSize: '0.875rem',
    color: '#333',
    fontWeight: '600',
  },
  resetButton: {
    padding: '0.5rem 1rem',
    background: 'rgba(107, 114, 128, 0.1)',
    color: '#374151',
    border: 'none',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '600',
    transition: 'all 0.2s',
    marginLeft: '0.5rem',
  },
  content: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '1rem',
    overflow: 'hidden',
    position: 'relative',
    minHeight: 0,
  },
  imageWrapper: {
    maxWidth: '100%',
    maxHeight: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
    borderRadius: '0.5rem',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    background: 'white',
    padding: '0.5rem',
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

