import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '../api/client';
import type { Course, Document } from '../types/api';

interface CourseNavigationSidebarProps {
  currentCourseId?: string;
  currentDocumentId?: string;
  onCourseSelect?: (courseId: string) => void;
  onDocumentSelect?: (document: Document, courseId: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  width?: number;
  onWidthChange?: (width: number) => void;
}

interface CourseWithDocuments extends Course {
  documents?: Document[];
  expanded?: boolean;
  loading?: boolean;
}

export default function CourseNavigationSidebar({
  currentCourseId,
  currentDocumentId,
  onCourseSelect,
  onDocumentSelect,
  isCollapsed = false,
  onToggleCollapse,
  width = 280,
  onWidthChange,
}: CourseNavigationSidebarProps) {
  const [courses, setCourses] = useState<CourseWithDocuments[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Handle sidebar resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !onWidthChange) return;

      // Calculate new width based on mouse position from the left edge
      const newWidth = e.clientX;
      // Constrain sidebar width between 200px and 600px
      const constrainedWidth = Math.max(200, Math.min(600, newWidth));
      onWidthChange(constrainedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      window.document.body.style.cursor = '';
      window.document.body.style.userSelect = '';
    };

    if (isResizing) {
      window.document.body.style.cursor = 'col-resize';
      window.document.body.style.userSelect = 'none';
      
      window.document.addEventListener('mousemove', handleMouseMove);
      window.document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        window.document.removeEventListener('mousemove', handleMouseMove);
        window.document.removeEventListener('mouseup', handleMouseUp);
        window.document.body.style.cursor = '';
        window.document.body.style.userSelect = '';
      };
    }
  }, [isResizing, onWidthChange]);

  // Load all courses
  const loadCourses = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const coursesData = await apiClient.getCourses();
      // Initialize with expanded state (expand current course if specified)
      const coursesWithState: CourseWithDocuments[] = coursesData.map(course => ({
        ...course,
        documents: [],
        expanded: course.id === currentCourseId,
        loading: false,
      }));
      setCourses(coursesWithState);

      // Load documents for the current course if specified
      if (currentCourseId) {
        await loadDocumentsForCourse(currentCourseId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  }, [currentCourseId]);

  // Load documents for a specific course
  const loadDocumentsForCourse = useCallback(async (courseId: string) => {
    setCourses(prev =>
      prev.map(course => {
        if (course.id === courseId) {
          return { ...course, loading: true };
        }
        return course;
      })
    );

    try {
      const documents = await apiClient.getDocuments(courseId);
      setCourses(prev =>
        prev.map(course => {
          if (course.id === courseId) {
            return { ...course, documents, loading: false };
          }
          return course;
        })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
      setCourses(prev =>
        prev.map(course => {
          if (course.id === courseId) {
            return { ...course, loading: false };
          }
          return course;
        })
      );
    }
  }, []);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  // Toggle course expansion
  const toggleCourse = useCallback(
    async (courseId: string) => {
      setCourses(prev =>
        prev.map(course => {
          if (course.id === courseId) {
            const newExpanded = !course.expanded;
            // Load documents if expanding and not already loaded
            if (newExpanded && (!course.documents || course.documents.length === 0)) {
              loadDocumentsForCourse(courseId);
            }
            return { ...course, expanded: newExpanded };
          }
          return course;
        })
      );
    },
    [loadDocumentsForCourse]
  );

  // Handle document click
  const handleDocumentClick = useCallback(
    (document: Document, courseId: string) => {
      if (onDocumentSelect) {
        onDocumentSelect(document, courseId);
      }
    },
    [onDocumentSelect]
  );

  // Handle course click
  const handleCourseClick = useCallback(
    (courseId: string) => {
      if (onCourseSelect) {
        onCourseSelect(courseId);
      }
      toggleCourse(courseId);
    },
    [onCourseSelect, toggleCourse]
  );

  if (isCollapsed) {
    return (
      <div style={styles.collapsedContainer}>
        <button onClick={onToggleCollapse} style={styles.expandButton} title="Expand navigation">
          ▶
        </button>
      </div>
    );
  }

  return (
    <div ref={sidebarRef} style={{ ...styles.container, width: `${width}px` }}>
      {/* Resize Handle */}
      {!isCollapsed && onWidthChange && (
        <div
          style={{
            ...styles.resizeHandle,
            ...(isResizing ? styles.resizeHandleActive : {}),
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsResizing(true);
          }}
          onMouseEnter={() => {
            if (!isResizing && sidebarRef.current) {
              sidebarRef.current.style.borderRightColor = '#667eea';
            }
          }}
          onMouseLeave={() => {
            if (!isResizing && sidebarRef.current) {
              sidebarRef.current.style.borderRightColor = 'rgba(0, 0, 0, 0.1)';
            }
          }}
        />
      )}
      <div style={styles.header}>
        <h3 style={styles.title}>Courses</h3>
        {onToggleCollapse && (
          <button onClick={onToggleCollapse} style={styles.collapseButton} title="Collapse navigation">
            ◀
          </button>
        )}
      </div>

      <div style={styles.content}>
        {loading && courses.length === 0 ? (
          <div style={styles.loading}>Loading courses...</div>
        ) : error ? (
          <div style={styles.error}>{error}</div>
        ) : courses.length === 0 ? (
          <div style={styles.empty}>No courses available</div>
        ) : (
          <div style={styles.coursesList}>
            {courses.map(course => {
              const isSelected = course.id === currentCourseId;
              const isExpanded = course.expanded || false;

              return (
                <div key={course.id} style={styles.courseItem}>
                  <div
                    style={{
                      ...styles.courseHeader,
                      ...(isSelected ? styles.courseHeaderSelected : {}),
                    }}
                    onClick={() => handleCourseClick(course.id)}
                  >
                    <button
                      style={styles.expandButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCourse(course.id);
                      }}
                      title={isExpanded ? 'Collapse' : 'Expand'}
                    >
                      {isExpanded ? '▼' : '▶'}
                    </button>
                    <span style={styles.courseName}>{course.name}</span>
                    <span style={styles.documentCount}>
                      {course.document_count > 0 ? `(${course.document_count})` : ''}
                    </span>
                  </div>

                  {isExpanded && (
                    <div style={styles.documentsList}>
                      {course.loading ? (
                        <div style={styles.loadingDocuments}>Loading documents...</div>
                      ) : course.documents && course.documents.length > 0 ? (
                        course.documents.map(document => {
                          const isDocumentSelected = document.id === currentDocumentId;
                          const isCompleted = document.processing_status === 'completed';

                          return (
                            <div
                              key={document.id}
                              style={{
                                ...styles.documentItem,
                                ...(isDocumentSelected ? styles.documentItemSelected : {}),
                                ...(!isCompleted ? styles.documentItemDisabled : {}),
                              }}
                              onClick={() => {
                                if (isCompleted) {
                                  handleDocumentClick(document, course.id);
                                }
                              }}
                              title={
                                !isCompleted
                                  ? 'Document is still processing'
                                  : `Click to load ${document.filename}`
                              }
                            >
                              <span style={styles.documentIcon}>📄</span>
                              <span style={styles.documentName}>{document.filename}</span>
                              {!isCompleted && (
                                <span style={styles.processingBadge}>⏳</span>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div style={styles.emptyDocuments}>No documents in this course</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    height: '100%',
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    borderRight: '1px solid rgba(0, 0, 0, 0.1)',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '2px 0 4px -1px rgba(0, 0, 0, 0.1)',
    flexShrink: 0,
  },
  resizeHandle: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '4px',
    backgroundColor: 'transparent',
    cursor: 'ew-resize',
    zIndex: 10,
    transition: 'background-color 0.2s',
  },
  resizeHandleActive: {
    backgroundColor: '#667eea',
    width: '4px',
  },
  collapsedContainer: {
    width: '40px',
    height: '100%',
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    borderRight: '1px solid rgba(0, 0, 0, 0.1)',
    display: 'flex',
    alignItems: 'flex-start',
    paddingTop: '1rem',
    boxShadow: '2px 0 4px -1px rgba(0, 0, 0, 0.1)',
    flexShrink: 0,
  },
  header: {
    padding: '1rem',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
  },
  title: {
    margin: 0,
    fontSize: '1rem',
    fontWeight: '700',
    color: '#111827',
  },
  collapseButton: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.875rem',
    color: '#6b7280',
    padding: '0.25rem 0.5rem',
    borderRadius: '0.375rem',
    transition: 'all 0.2s',
  },
  expandButton: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.75rem',
    color: '#6b7280',
    padding: '0.25rem',
    borderRadius: '0.375rem',
    transition: 'all 0.2s',
    minWidth: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '0.5rem',
  },
  loading: {
    padding: '2rem 1rem',
    textAlign: 'center',
    color: '#6b7280',
    fontSize: '0.875rem',
  },
  error: {
    padding: '1rem',
    background: '#fee2e2',
    color: '#dc2626',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    margin: '0.5rem',
  },
  empty: {
    padding: '2rem 1rem',
    textAlign: 'center',
    color: '#6b7280',
    fontSize: '0.875rem',
  },
  coursesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  courseItem: {
    display: 'flex',
    flexDirection: 'column',
  },
  courseHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
    backgroundColor: 'transparent',
  },
  courseHeaderSelected: {
    background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%)',
    borderLeft: '3px solid #667eea',
  },
  courseName: {
    flex: 1,
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#111827',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  documentCount: {
    fontSize: '0.75rem',
    color: '#6b7280',
    fontWeight: '500',
  },
  documentsList: {
    marginLeft: '1.5rem',
    marginTop: '0.25rem',
    paddingLeft: '0.5rem',
    borderLeft: '2px solid #e5e7eb',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.125rem',
  },
  loadingDocuments: {
    padding: '0.75rem',
    fontSize: '0.75rem',
    color: '#6b7280',
    fontStyle: 'italic',
  },
  emptyDocuments: {
    padding: '0.75rem',
    fontSize: '0.75rem',
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  documentItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.625rem',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
    backgroundColor: 'transparent',
  },
  documentItemSelected: {
    background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%)',
    borderLeft: '2px solid #667eea',
    fontWeight: '600',
  },
  documentItemDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  documentIcon: {
    fontSize: '0.875rem',
    flexShrink: 0,
  },
  documentName: {
    flex: 1,
    fontSize: '0.8125rem',
    color: '#374151',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  processingBadge: {
    fontSize: '0.75rem',
    flexShrink: 0,
  },
};

