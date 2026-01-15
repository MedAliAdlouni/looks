import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import type { Course } from '../types/api';

// Add spinner animation
const spinnerStyle = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = spinnerStyle;
  document.head.appendChild(style);
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [courseName, setCourseName] = useState('');
  const [courseDescription, setCourseDescription] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getCourses();
      setCourses(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');

    try {
      await apiClient.createCourse({
        name: courseName,
        description: courseDescription,
      });
      setCourseName('');
      setCourseDescription('');
      setShowCreateForm(false);
      await loadCourses();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create course');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm('Are you sure you want to delete this course?')) return;

    try {
      await apiClient.deleteCourse(courseId);
      await loadCourses();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete course');
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logo}>📚</div>
          <h1 style={styles.headerTitle}>Curriculum AI Tutor</h1>
        </div>
        <div style={styles.headerRight}>
          <div style={styles.userInfo}>
            <div style={styles.userAvatar}>
              {(user?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
            </div>
            <span style={styles.userName}>{user?.full_name || user?.email}</span>
          </div>
          <button onClick={logout} style={styles.logoutButton}>
            Logout
          </button>
        </div>
      </header>

      <main style={styles.main}>
        <div style={styles.topBar}>
          <div>
            <h2 style={styles.sectionTitle}>My Courses</h2>
            <p style={styles.sectionSubtitle}>Manage and access your learning materials</p>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            style={styles.createButton}
          >
            {showCreateForm ? (
              <>✕ Cancel</>
            ) : (
              <>+ Create Course</>
            )}
          </button>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        {showCreateForm && (
          <div style={styles.createForm} className="animate-fade-in">
            <h3 style={styles.createFormTitle}>Create New Course</h3>
            <form onSubmit={handleCreateCourse}>
              <div style={styles.field}>
                <label style={styles.label}>Course Name</label>
                <input
                  type="text"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  required
                  style={styles.input}
                  placeholder="e.g., Mathematics 101"
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Description</label>
                <textarea
                  value={courseDescription}
                  onChange={(e) => setCourseDescription(e.target.value)}
                  style={styles.textarea}
                  placeholder="Course description..."
                  rows={3}
                />
              </div>
              <button 
                type="submit" 
                disabled={creating} 
                style={{
                  ...styles.submitButton,
                  ...(creating ? styles.buttonLoading : {}),
                }}
              >
                {creating ? (
                  <>
                    <span style={styles.spinner}></span>
                    Creating...
                  </>
                ) : (
                  'Create Course'
                )}
              </button>
            </form>
          </div>
        )}

        {loading ? (
          <div style={styles.loading}>
            <div style={styles.loadingSpinner}></div>
            <p>Loading courses...</p>
          </div>
        ) : courses.length === 0 ? (
          <div style={styles.empty}>
            <div style={styles.emptyIcon}>📖</div>
            <h3 style={styles.emptyTitle}>No courses yet</h3>
            <p style={styles.emptyText}>Create your first course to get started!</p>
            <button
              onClick={() => setShowCreateForm(true)}
              style={styles.emptyButton}
            >
              Create Your First Course
            </button>
          </div>
        ) : (
          <div style={styles.coursesGrid}>
            {courses.map((course, index) => (
              <div 
                key={course.id} 
                style={{
                  ...styles.courseCard,
                  animationDelay: `${index * 0.1}s`,
                }}
                className="animate-fade-in"
              >
                <div style={styles.courseCardHeader}>
                  <div style={styles.courseIcon}>📘</div>
                  <h3 style={styles.courseName}>{course.name}</h3>
                </div>
                <p style={styles.courseDescription}>
                  {course.description || 'No description provided'}
                </p>
                <div style={styles.courseActions}>
                  <div style={styles.courseMeta}>
                    <span style={styles.metaIcon}>📄</span>
                    <span>{course.document_count} {course.document_count === 1 ? 'document' : 'documents'}</span>
                  </div>
                  <div style={styles.courseButtons}>
                    <button
                      onClick={() => navigate(`/course/${course.id}`)}
                      style={styles.viewButton}
                    >
                      View & Chat
                    </button>
                    <button
                      onClick={() => navigate(`/course/${course.id}?tab=assessments`)}
                      style={styles.assessmentButton}
                    >
                      📝 Assessments
                    </button>
                    <button
                      onClick={() => handleDeleteCourse(course.id)}
                      style={styles.deleteButton}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    backgroundAttachment: 'fixed',
  },
  header: {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    padding: '1.25rem 2rem',
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
  },
  logo: {
    fontSize: '2rem',
  },
  headerTitle: {
    margin: 0,
    fontSize: '1.5rem',
    fontWeight: '700',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  userAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '600',
    fontSize: '1rem',
  },
  userName: {
    color: '#374151',
    fontWeight: '500',
  },
  logoutButton: {
    padding: '0.625rem 1.25rem',
    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '0.75rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '600',
    transition: 'all 0.2s',
    boxShadow: '0 2px 4px rgba(239, 68, 68, 0.3)',
  },
  main: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '2rem',
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '2rem',
    gap: '1rem',
  },
  sectionTitle: {
    margin: '0 0 0.25rem 0',
    fontSize: '2rem',
    fontWeight: '700',
    color: 'white',
  },
  sectionSubtitle: {
    margin: 0,
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: '0.875rem',
  },
  createButton: {
    padding: '0.875rem 1.75rem',
    background: 'rgba(255, 255, 255, 0.95)',
    color: '#667eea',
    border: 'none',
    borderRadius: '0.75rem',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '600',
    transition: 'all 0.2s',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    whiteSpace: 'nowrap',
  },
  createForm: {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    padding: '2rem',
    borderRadius: '1rem',
    marginBottom: '2rem',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
  },
  createFormTitle: {
    margin: '0 0 1.5rem 0',
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#111827',
  },
  field: {
    marginBottom: '1.25rem',
  },
  label: {
    display: 'block',
    marginBottom: '0.5rem',
    fontWeight: '600',
    color: '#374151',
    fontSize: '0.875rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  input: {
    width: '100%',
    padding: '0.875rem 1rem',
    border: '2px solid #e5e7eb',
    borderRadius: '0.75rem',
    fontSize: '1rem',
    transition: 'all 0.2s',
    background: '#ffffff',
  },
  textarea: {
    width: '100%',
    padding: '0.875rem 1rem',
    border: '2px solid #e5e7eb',
    borderRadius: '0.75rem',
    fontSize: '1rem',
    fontFamily: 'inherit',
    resize: 'vertical',
    transition: 'all 0.2s',
    background: '#ffffff',
  },
  submitButton: {
    padding: '0.875rem 1.75rem',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '0.75rem',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '600',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3)',
  },
  buttonLoading: {
    opacity: 0.7,
    cursor: 'not-allowed',
  },
  spinner: {
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderTopColor: 'white',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  error: {
    background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
    color: '#dc2626',
    padding: '1rem',
    borderRadius: '0.75rem',
    marginBottom: '1.5rem',
    border: '1px solid #fca5a5',
    fontSize: '0.875rem',
    fontWeight: '500',
  },
  loading: {
    textAlign: 'center',
    padding: '4rem 2rem',
    color: 'white',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
  },
  loadingSpinner: {
    width: '48px',
    height: '48px',
    border: '4px solid rgba(255, 255, 255, 0.3)',
    borderTopColor: 'white',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  empty: {
    textAlign: 'center',
    padding: '4rem 2rem',
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    borderRadius: '1rem',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  },
  emptyIcon: {
    fontSize: '4rem',
    marginBottom: '1rem',
  },
  emptyTitle: {
    margin: '0 0 0.5rem 0',
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#111827',
  },
  emptyText: {
    margin: '0 0 1.5rem 0',
    color: '#6b7280',
  },
  emptyButton: {
    padding: '0.875rem 1.75rem',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '0.75rem',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '600',
    boxShadow: '0 4px 6px -1px rgba(102, 126, 234, 0.3)',
  },
  coursesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '1.5rem',
  },
  courseCard: {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    padding: '1.75rem',
    borderRadius: '1rem',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    transition: 'all 0.3s',
    cursor: 'pointer',
  },
  courseCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '0.75rem',
  },
  courseIcon: {
    fontSize: '1.5rem',
  },
  courseName: {
    margin: 0,
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  courseDescription: {
    margin: '0 0 1.25rem 0',
    color: '#6b7280',
    flex: 1,
    lineHeight: '1.6',
    fontSize: '0.9375rem',
  },
  courseActions: {
    marginTop: 'auto',
    paddingTop: '1.25rem',
    borderTop: '1px solid #e5e7eb',
  },
  courseMeta: {
    marginBottom: '1rem',
    color: '#6b7280',
    fontSize: '0.875rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  metaIcon: {
    fontSize: '1rem',
  },
  courseButtons: {
    display: 'flex',
    gap: '0.75rem',
    flexWrap: 'wrap',
  },
  viewButton: {
    padding: '0.625rem 1.25rem',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '0.75rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '600',
    flex: 1,
    transition: 'all 0.2s',
    boxShadow: '0 2px 4px rgba(102, 126, 234, 0.3)',
    minWidth: '120px',
  },
  assessmentButton: {
    padding: '0.625rem 1.25rem',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '0.75rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '600',
    flex: 1,
    transition: 'all 0.2s',
    boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)',
    minWidth: '120px',
  },
  deleteButton: {
    padding: '0.625rem 1.25rem',
    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '0.75rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '600',
    transition: 'all 0.2s',
    boxShadow: '0 2px 4px rgba(239, 68, 68, 0.3)',
    minWidth: '80px',
  },
};


