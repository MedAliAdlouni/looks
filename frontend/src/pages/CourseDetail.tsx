import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import type { Course, Document, ChatResponse } from '../types/api';
import PDFViewer from '../components/PDFViewer';
import MediaViewer from '../components/MediaViewer';
import ImageViewer from '../components/ImageViewer';
import DocxViewer from '../components/DocxViewer';
import PptxViewer from '../components/PptxViewer';
import DocumentViewer from '../components/DocumentViewer';
import CourseNavigationSidebar from '../components/CourseNavigationSidebar';
import MCQAssessment from '../components/MCQAssessment';
import OpenEndedAssessment from '../components/OpenEndedAssessment';

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

export default function CourseDetail() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, logout } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  
  // Initialize activeTab from URL parameter or default to 'documents'
  const initialTab = (searchParams.get('tab') as 'documents' | 'chat' | 'assessments') || 'documents';
  const [activeTab, setActiveTab] = useState<'documents' | 'chat' | 'assessments'>(initialTab);
  const [assessmentSubTab, setAssessmentSubTab] = useState<'mcq' | 'open-ended'>('mcq');
  
  // Chat state
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; sources?: any[] }>>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [viewingDocument, setViewingDocument] = useState<Document | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [navSidebarWidth, setNavSidebarWidth] = useState(280);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (courseId) {
      loadCourse();
      loadDocuments();
    }
  }, [courseId]);

  // Update activeTab when URL parameter changes
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') as 'documents' | 'chat' | 'assessments' | null;
    if (tabFromUrl && ['documents', 'chat', 'assessments'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadCourse = async () => {
    if (!courseId) return;
    try {
      const data = await apiClient.getCourse(courseId);
      setCourse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load course');
    }
  };

  const loadDocuments = async () => {
    if (!courseId) return;
    try {
      const data = await apiClient.getDocuments(courseId);
      setDocuments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !courseId) return;

    // Check file extension
    const allowedExtensions = ['.pdf', '.docx', '.doc', '.pptx', '.ppt', '.txt', '.rtf', '.csv', '.xlsx', '.xls', '.mp3', '.wav', '.mp4', '.webm', '.png', '.jpg', '.jpeg', '.svg'];
    const fileExt = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!allowedExtensions.includes(fileExt)) {
      setError('Unsupported file type. Supported: PDF, DOCX/DOC, PPTX/PPT, TXT, RTF, CSV, XLSX/XLS, MP3, WAV, MP4, WEBM, PNG, JPG, JPEG, SVG');
      return;
    }

    setUploading(true);
    setError('');

    try {
      await apiClient.uploadDocument(courseId, file);
      await loadDocuments();
      await loadCourse(); // Refresh course to update document count
      e.target.value = ''; // Reset file input
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !courseId || sending) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setSending(true);
    setError('');

    try {
      const response: ChatResponse = await apiClient.sendMessage(courseId, {
        message: userMessage,
        conversation_id: conversationId,
      });

      setConversationId(response.conversation_id);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: response.content,
          sources: response.sources,
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      setMessages(prev => prev.slice(0, -1)); // Remove user message on error
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading course...</div>
      </div>
    );
  }

  if (!course) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>Course not found</div>
        <button onClick={() => navigate('/')} style={styles.backButton}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  // Handle document selection from sidebar
  const handleDocumentSelect = (document: Document, documentCourseId: string) => {
    if (document.processing_status === 'completed') {
      setSelectedDocumentId(document.id);
      // If clicking a document from a different course, navigate to that course
      // The sidebar will update to show the new course as selected
      if (documentCourseId !== courseId) {
        navigate(`/course/${documentCourseId}`);
      } else {
        // Same course, open the document directly
        setViewingDocument(document);
      }
    }
  };

  // Handle course selection from sidebar
  const handleCourseSelect = (selectedCourseId: string) => {
    if (selectedCourseId !== courseId) {
      navigate(`/course/${selectedCourseId}`);
    }
  };

  // If viewing a document, show appropriate viewer
  if (viewingDocument) {
    // For media files, show media player
    if (viewingDocument.file_type === 'mp3' || viewingDocument.file_type === 'wav' || 
        viewingDocument.file_type === 'mp4' || viewingDocument.file_type === 'webm') {
      return (
        <MediaViewer
          document={viewingDocument}
          courseId={courseId!}
          course={course}
          onClose={() => {
            setViewingDocument(null);
            setSelectedDocumentId(undefined);
          }}
        />
      );
    }
    // For image files, show image viewer
    if (viewingDocument.file_type === 'png' || viewingDocument.file_type === 'jpg' || 
        viewingDocument.file_type === 'jpeg' || viewingDocument.file_type === 'svg') {
      return (
        <ImageViewer
          document={viewingDocument}
          courseId={courseId!}
          course={course}
          onClose={() => {
            setViewingDocument(null);
            setSelectedDocumentId(undefined);
          }}
        />
      );
    }
    // For DOCX files, show DOCX viewer
    if (viewingDocument.file_type === 'docx' || viewingDocument.file_type === 'doc') {
      return (
        <DocxViewer
          document={viewingDocument}
          courseId={courseId!}
          course={course}
          onClose={() => {
            setViewingDocument(null);
            setSelectedDocumentId(undefined);
          }}
        />
      );
    }
    // For PPTX/PPT files, show presentation viewer
    if (viewingDocument.file_type === 'pptx' || viewingDocument.file_type === 'ppt') {
      return (
        <PptxViewer
          document={viewingDocument}
          courseId={courseId!}
          course={course}
          onClose={() => {
            setViewingDocument(null);
            setSelectedDocumentId(undefined);
          }}
        />
      );
    }
    // For PDF, show PDF viewer
    if (viewingDocument.file_type === 'pdf') {
      return (
        <PDFViewer
          document={viewingDocument}
          courseId={courseId!}
          course={course}
          onClose={() => {
            setViewingDocument(null);
            setSelectedDocumentId(undefined);
          }}
          documents={documents}
        />
      );
    }
    // For other text-based files, show download link or text viewer
    return (
      <DocumentViewer
        document={viewingDocument}
        courseId={courseId!}
        course={course}
        onClose={() => {
          setViewingDocument(null);
          setSelectedDocumentId(undefined);
        }}
      />
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <button onClick={() => navigate('/')} style={styles.backButton}>
            ← Back
          </button>
          <div style={styles.courseHeader}>
            <h1 style={styles.headerTitle}>{course.name}</h1>
            <p style={styles.courseSubtitle}>{course.description || 'No description'}</p>
          </div>
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

      <div style={styles.contentWrapper}>
        <CourseNavigationSidebar
          currentCourseId={courseId}
          currentDocumentId={selectedDocumentId}
          onCourseSelect={handleCourseSelect}
          onDocumentSelect={handleDocumentSelect}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          width={navSidebarWidth}
          onWidthChange={setNavSidebarWidth}
        />

        <main style={styles.main}>
        <div style={styles.tabs}>
          <button
            onClick={() => setActiveTab('documents')}
            style={{
              ...styles.tab,
              ...(activeTab === 'documents' ? styles.tabActive : {}),
            }}
          >
            📄 Documents ({documents.length})
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            style={{
              ...styles.tab,
              ...(activeTab === 'chat' ? styles.tabActive : {}),
            }}
          >
            💬 Chat
          </button>
          <button
            onClick={() => setActiveTab('assessments')}
            style={{
              ...styles.tab,
              ...(activeTab === 'assessments' ? styles.tabActive : {}),
            }}
          >
            📝 Assessments
          </button>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        {activeTab === 'documents' && (
          <div style={styles.documentsSection}>
            <div style={styles.uploadSection}>
              <h3 style={styles.uploadTitle}>Upload Document</h3>
              <p style={styles.uploadSubtitle}>Add files to your course (PDF, DOCX, PPTX, TXT, RTF, CSV, XLSX, MP3, WAV, MP4, WEBM, PNG, JPG, JPEG, SVG)</p>
              <input
                type="file"
                accept=".pdf,.docx,.doc,.pptx,.ppt,.txt,.rtf,.csv,.xlsx,.xls,.mp3,.wav,.mp4,.webm,.png,.jpg,.jpeg,.svg"
                onChange={handleFileUpload}
                disabled={uploading}
                style={styles.fileInput}
                id="file-upload"
              />
              <label htmlFor="file-upload" style={styles.uploadButton}>
                {uploading ? (
                  <>
                    <span style={styles.spinner}></span>
                    Uploading...
                  </>
                ) : (
                  <>
                    📤 Choose File
                  </>
                )}
              </label>
            </div>

            <h3 style={styles.sectionTitle}>Documents ({documents.length})</h3>
            {documents.length === 0 ? (
              <div style={styles.empty}>
                <div style={styles.emptyIcon}>📄</div>
                <h4 style={styles.emptyTitle}>No documents yet</h4>
                <p style={styles.emptyText}>Upload a file to get started!</p>
              </div>
            ) : (
              <div style={styles.documentsList}>
                {documents.map((doc, index) => (
                  <div 
                    key={doc.id} 
                    style={{
                      ...styles.documentCard,
                      animationDelay: `${index * 0.1}s`,
                    }}
                    className={doc.processing_status === 'completed' ? 'document-card-hover animate-fade-in' : 'animate-fade-in'}
                    onClick={() => {
                      if (doc.processing_status === 'completed') {
                        setSelectedDocumentId(doc.id);
                        setViewingDocument(doc);
                      }
                    }}
                  >
                    <div style={styles.documentIcon}>{getFileIcon(doc.file_type)}</div>
                    <div style={styles.documentInfo}>
                      <h4 style={styles.documentName}>{doc.filename}</h4>
                      <div style={styles.documentMeta}>
                        {doc.file_type !== 'mp3' && doc.file_type !== 'wav' && doc.file_type !== 'mp4' && 
                         doc.file_type !== 'webm' && doc.file_type !== 'png' && doc.file_type !== 'jpg' && 
                         doc.file_type !== 'jpeg' && doc.file_type !== 'svg' && (
                          <span>📑 {doc.num_pages} {doc.num_pages === 1 ? 'page' : 'pages'}</span>
                        )}
                        <span>💾 {(doc.file_size / 1024).toFixed(2)} KB</span>
                        <span style={{
                          ...styles.statusBadge,
                          ...(doc.processing_status === 'completed' 
                            ? styles.statusCompleted 
                            : styles.statusProcessing)
                        }}>
                          {doc.processing_status === 'completed' ? '✓ Ready' : '⏳ Processing'}
                        </span>
                      </div>
                      {doc.processing_status === 'completed' && (
                        <button 
                          style={styles.viewButton}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDocumentId(doc.id);
                            setViewingDocument(doc);
                          }}
                        >
                          {getViewButtonText(doc.file_type)} →
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'chat' && (
          <div style={styles.chatSection}>
            <div style={styles.chatMessages}>
              {messages.length === 0 ? (
                <div style={styles.chatEmpty}>
                  <div style={styles.chatEmptyIcon}>💬</div>
                  <h4 style={styles.chatEmptyTitle}>Start a conversation</h4>
                  <p style={styles.chatHint}>
                    Ask questions about the documents you've uploaded.
                  </p>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div
                    key={idx}
                    style={{
                      ...styles.message,
                      ...(msg.role === 'user' ? styles.userMessage : styles.assistantMessage),
                    }}
                    className="animate-fade-in"
                  >
                    <div style={styles.messageHeader}>
                      {msg.role === 'user' ? '👤 You' : '🤖 Assistant'}
                    </div>
                    <div style={styles.messageContent}>{msg.content}</div>
                    {msg.sources && msg.sources.length > 0 && (
                      <div style={{
                        ...styles.sources,
                        borderTop: msg.role === 'user' ? '1px solid rgba(255,255,255,0.3)' : '1px solid rgba(0,0,0,0.1)',
                      }}>
                        <strong style={styles.sourcesTitle}>📚 Sources:</strong>
                        <div style={styles.sourcesList}>
                          {msg.sources.map((src, srcIdx) => (
                            <span
                              key={srcIdx}
                              style={{
                                ...styles.sourceTag,
                                background: msg.role === 'user' ? 'rgba(255,255,255,0.2)' : 'rgba(102, 126, 234, 0.1)',
                                color: msg.role === 'user' ? 'white' : '#667eea',
                              }}
                            >
                              {src.document_name || 'Unknown Document'} - Page {src.page}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={handleSendMessage} style={styles.chatInput}>
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask a question about this course..."
                disabled={sending}
                style={styles.chatInputField}
              />
              <button
                type="submit"
                disabled={sending || !inputMessage.trim()}
                style={{
                  ...styles.sendButton,
                  ...(sending || !inputMessage.trim() ? { opacity: 0.6, cursor: 'not-allowed' } : {}),
                }}
              >
                {sending ? (
                  <>
                    <span style={styles.spinner}></span>
                    Sending...
                  </>
                ) : (
                  'Send →'
                )}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'assessments' && (
          <div style={styles.assessmentsSection}>
            <div style={styles.assessmentTabs}>
              <button
                onClick={() => setAssessmentSubTab('mcq')}
                style={{
                  ...styles.assessmentTab,
                  ...(assessmentSubTab === 'mcq' ? styles.assessmentTabActive : {}),
                }}
              >
                ✓ Multiple Choice
              </button>
              <button
                onClick={() => setAssessmentSubTab('open-ended')}
                style={{
                  ...styles.assessmentTab,
                  ...(assessmentSubTab === 'open-ended' ? styles.assessmentTabActive : {}),
                }}
              >
                ✍️ Open-Ended
              </button>
            </div>

            {assessmentSubTab === 'mcq' && courseId && (
              <MCQAssessment courseId={courseId} />
            )}

            {assessmentSubTab === 'open-ended' && courseId && (
              <OpenEndedAssessment courseId={courseId} />
            )}
          </div>
        )}
        </main>
      </div>
    </div>
  );
}

// Helper function to get file icon
const getFileIcon = (fileType: string): string => {
  const iconMap: Record<string, string> = {
    'pdf': '📄',
    'docx': '📝',
    'doc': '📝',
    'pptx': '📊',
    'ppt': '📊',
    'txt': '📃',
    'rtf': '📃',
    'csv': '📈',
    'xlsx': '📊',
    'xls': '📊',
    'mp3': '🎵',
    'wav': '🎵',
    'mp4': '🎬',
    'webm': '🎬',
    'png': '🖼️',
    'jpg': '🖼️',
    'jpeg': '🖼️',
    'svg': '🖼️',
  };
  return iconMap[fileType] || '📄';
};

// Helper function to get view button text
const getViewButtonText = (fileType: string): string => {
  if (fileType === 'mp3' || fileType === 'wav') return 'Play Audio';
  if (fileType === 'mp4' || fileType === 'webm') return 'Play Video';
  if (fileType === 'png' || fileType === 'jpg' || fileType === 'jpeg' || fileType === 'svg') return 'View Image';
  if (fileType === 'pdf') return 'Open PDF';
  return 'Open File';
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    backgroundAttachment: 'fixed',
    display: 'flex',
    flexDirection: 'column',
  },
  contentWrapper: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
    position: 'relative',
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
    flex: 1,
  },
  courseHeader: {
    flex: 1,
  },
  headerTitle: {
    margin: '0 0 0.25rem 0',
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#111827',
  },
  courseSubtitle: {
    margin: 0,
    color: '#6b7280',
    fontSize: '0.875rem',
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
  main: {
    flex: 1,
    padding: '2rem',
    transition: 'margin-left 0.3s ease',
    overflowY: 'auto',
    minWidth: 0, // Allow flex item to shrink
  },
  tabs: {
    display: 'flex',
    gap: '0.75rem',
    marginBottom: '2rem',
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    padding: '0.5rem',
    borderRadius: '1rem',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  },
  tab: {
    padding: '0.875rem 1.5rem',
    background: 'transparent',
    border: 'none',
    borderRadius: '0.75rem',
    cursor: 'pointer',
    fontSize: '1rem',
    color: '#6b7280',
    fontWeight: '500',
    transition: 'all 0.2s',
    flex: 1,
  },
  tabActive: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    fontWeight: '600',
    boxShadow: '0 2px 4px rgba(102, 126, 234, 0.3)',
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
  },
  documentsSection: {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    padding: '2rem',
    borderRadius: '1rem',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
  },
  uploadSection: {
    marginBottom: '2rem',
    paddingBottom: '2rem',
    borderBottom: '1px solid #e5e7eb',
  },
  uploadTitle: {
    margin: '0 0 0.25rem 0',
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#111827',
  },
  uploadSubtitle: {
    margin: '0 0 1.5rem 0',
    color: '#6b7280',
    fontSize: '0.875rem',
  },
  fileInput: {
    display: 'none',
  },
  uploadButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.875rem 1.75rem',
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
  spinner: {
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderTopColor: 'white',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  sectionTitle: {
    margin: '0 0 1.5rem 0',
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#111827',
  },
  empty: {
    textAlign: 'center',
    padding: '4rem 2rem',
  },
  emptyIcon: {
    fontSize: '4rem',
    marginBottom: '1rem',
  },
  emptyTitle: {
    margin: '0 0 0.5rem 0',
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#111827',
  },
  emptyText: {
    margin: 0,
    color: '#6b7280',
  },
  documentsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  documentCard: {
    padding: '1.5rem',
    background: 'rgba(255, 255, 255, 0.8)',
    borderRadius: '0.75rem',
    border: '2px solid #e5e7eb',
    cursor: 'pointer',
    transition: 'all 0.3s',
    display: 'flex',
    gap: '1rem',
    alignItems: 'flex-start',
  },
  documentIcon: {
    fontSize: '2rem',
    flexShrink: 0,
  },
  documentInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    flex: 1,
  },
  documentName: {
    margin: 0,
    color: '#111827',
    fontSize: '1.125rem',
    fontWeight: '600',
  },
  documentMeta: {
    margin: 0,
    color: '#6b7280',
    fontSize: '0.875rem',
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  statusBadge: {
    padding: '0.25rem 0.75rem',
    borderRadius: '0.5rem',
    fontSize: '0.75rem',
    fontWeight: '600',
  },
  statusCompleted: {
    background: 'rgba(16, 185, 129, 0.1)',
    color: '#059669',
  },
  statusProcessing: {
    background: 'rgba(245, 158, 11, 0.1)',
    color: '#d97706',
  },
  viewButton: {
    marginTop: '0.5rem',
    padding: '0.625rem 1.25rem',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '0.75rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '600',
    transition: 'all 0.2s',
    alignSelf: 'flex-start',
    boxShadow: '0 2px 4px rgba(102, 126, 234, 0.3)',
  },
  chatSection: {
    display: 'flex',
    flexDirection: 'column',
    height: 'calc(100vh - 300px)',
    minHeight: '600px',
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    borderRadius: '1rem',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
    border: '1px solid rgba(255, 255, 255, 0.2)',
  },
  chatMessages: {
    flex: 1,
    overflowY: 'auto',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    background: 'linear-gradient(to bottom, #f9fafb, #ffffff)',
  },
  chatEmpty: {
    textAlign: 'center',
    padding: '4rem 2rem',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatEmptyIcon: {
    fontSize: '4rem',
    marginBottom: '1rem',
  },
  chatEmptyTitle: {
    margin: '0 0 0.5rem 0',
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#111827',
  },
  chatHint: {
    fontSize: '0.875rem',
    color: '#6b7280',
    marginTop: '0.5rem',
  },
  message: {
    padding: '1rem 1.25rem',
    borderRadius: '1rem',
    maxWidth: '80%',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  },
  messageHeader: {
    fontSize: '0.75rem',
    fontWeight: '600',
    marginBottom: '0.5rem',
    opacity: 0.8,
  },
  userMessage: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    alignSelf: 'flex-end',
  },
  assistantMessage: {
    background: 'white',
    color: '#111827',
    alignSelf: 'flex-start',
    border: '1px solid #e5e7eb',
  },
  messageContent: {
    marginBottom: '0.5rem',
    whiteSpace: 'pre-wrap',
    lineHeight: '1.6',
  },
  sources: {
    marginTop: '0.75rem',
    paddingTop: '0.75rem',
    fontSize: '0.875rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  sourcesTitle: {
    fontSize: '0.75rem',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    opacity: 0.8,
  },
  sourcesList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
  },
  sourceTag: {
    display: 'inline-block',
    padding: '0.375rem 0.75rem',
    borderRadius: '0.5rem',
    fontSize: '0.75rem',
    fontWeight: '500',
  },
  chatInput: {
    display: 'flex',
    padding: '1.25rem',
    borderTop: '1px solid #e5e7eb',
    gap: '0.75rem',
    background: 'white',
  },
  chatInputField: {
    flex: 1,
    padding: '0.875rem 1rem',
    border: '2px solid #e5e7eb',
    borderRadius: '0.75rem',
    fontSize: '1rem',
    transition: 'all 0.2s',
    background: '#f9fafb',
  },
  sendButton: {
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
  assessmentsSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  assessmentTabs: {
    display: 'flex',
    gap: '0.75rem',
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    padding: '0.5rem',
    borderRadius: '1rem',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  },
  assessmentTab: {
    flex: 1,
    padding: '0.875rem 1.5rem',
    background: 'transparent',
    border: 'none',
    borderRadius: '0.75rem',
    cursor: 'pointer',
    fontSize: '1rem',
    color: '#6b7280',
    fontWeight: '500',
    transition: 'all 0.2s',
  },
  assessmentTabActive: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    fontWeight: '600',
    boxShadow: '0 2px 4px rgba(102, 126, 234, 0.3)',
  },
};

