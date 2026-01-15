import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import type { Document as DocumentType, Course } from '../types/api';

interface MediaViewerProps {
  document: DocumentType;
  courseId: string;
  course: Course;
  onClose: () => void;
}

export default function MediaViewer({ document, courseId, course, onClose }: MediaViewerProps) {
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const loadMedia = async () => {
      try {
        const url = apiClient.getDocumentFileUrl(document.id);
        const token = localStorage.getItem('token');
        
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (!response.ok) {
          throw new Error('Failed to load media file');
        }
        
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        setMediaUrl(objectUrl);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load media file');
        setLoading(false);
      }
    };

    loadMedia();

    return () => {
      if (mediaUrl) {
        URL.revokeObjectURL(mediaUrl);
      }
    };
  }, [document.id]);

  const isAudio = document.file_type === 'mp3' || document.file_type === 'wav';
  const isVideo = document.file_type === 'mp4' || document.file_type === 'webm';

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
            {isAudio ? '🎵 Audio' : '🎬 Video'} • {(document.file_size / 1024 / 1024).toFixed(2)} MB
          </span>
        </div>
      </div>

      <div style={styles.content}>
        {loading ? (
          <div style={styles.loading}>
            <p>Loading {isAudio ? 'audio' : 'video'}...</p>
          </div>
        ) : error ? (
          <div style={styles.error}>
            <p><strong>Error:</strong></p>
            <p>{error}</p>
            <button onClick={onClose} style={styles.closeButton}>
              Close
            </button>
          </div>
        ) : mediaUrl ? (
          <div style={styles.mediaContainer}>
            {isAudio ? (
              <audio
                controls
                autoPlay
                style={styles.audio}
                src={mediaUrl}
              >
                Your browser does not support the audio element.
              </audio>
            ) : (
              <video
                controls
                autoPlay
                style={styles.video}
                src={mediaUrl}
              >
                Your browser does not support the video element.
              </video>
            )}
            <div style={styles.mediaInfo}>
              <h3 style={styles.mediaTitle}>{document.filename}</h3>
              <p style={styles.mediaMeta}>
                Course: {course.name} • Size: {(document.file_size / 1024 / 1024).toFixed(2)} MB
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
  mediaContainer: {
    width: '100%',
    maxWidth: '1200px',
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    borderRadius: '1rem',
    padding: '2rem',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  audio: {
    width: '100%',
    height: '60px',
    borderRadius: '0.5rem',
  },
  video: {
    width: '100%',
    maxHeight: '70vh',
    borderRadius: '0.5rem',
    background: '#000',
  },
  mediaInfo: {
    textAlign: 'center',
  },
  mediaTitle: {
    margin: '0 0 0.5rem 0',
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#111827',
  },
  mediaMeta: {
    margin: 0,
    color: '#6b7280',
    fontSize: '0.875rem',
  },
};

