/**
 * Course Detail Page - Redesigned with new layout
 * 
 * Layout:
 * - Top Action Bar (with Assessment button)
 * - Left Sidebar (Documents list)
 * - Main Content Area (UploadDropzone + Chat when no doc, DocumentViewer when doc selected)
 * - Right Sidebar (Chat when document selected)
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from '../api/client';
import type { Course, Document, ChatResponse } from '../types/api';
import { MCQAssessment, OpenEndedAssessment } from '../components/assessments';
import { DocumentSidebar } from '../components/course/DocumentSidebar';
import { TopActionBar } from '../components/course/TopActionBar';
import { UploadDropzone } from '../components/course/UploadDropzone';
import { CourseChatAssistant } from '../components/course/CourseChatAssistant';
import { EmbeddedCourseDocumentView } from '../components/course/EmbeddedCourseDocumentView';
import { LoadingSpinner, Alert, Card, Tabs } from '../components/ui';
import { theme } from '../theme';
import type { CSSProperties } from 'react';
import type { ChatMessage } from '../components/course/ChatTab';

export default function CourseDetail() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [course, setCourse] = useState<Course | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  // Document selection state
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  // Assessment tab state (for when user clicks Assessment button)
  const [showAssessments, setShowAssessments] = useState(false);
  const [assessmentSubTab, setAssessmentSubTab] = useState<'mcq' | 'open-ended'>('mcq');

  useEffect(() => {
    if (courseId) {
      loadCourse();
      loadDocuments();
    }
  }, [courseId]);

  // Check if URL has assessment tab
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl === 'assessments') {
      setShowAssessments(true);
    }
  }, [searchParams]);

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

  const handleFileUpload = async (file: File) => {
    if (!courseId) return;

    // Check file extension
    const allowedExtensions = [
      '.pdf',
      '.docx',
      '.doc',
      '.pptx',
      '.ppt',
      '.txt',
      '.rtf',
      '.csv',
      '.xlsx',
      '.xls',
      '.mp3',
      '.wav',
      '.mp4',
      '.webm',
      '.png',
      '.jpg',
      '.jpeg',
      '.svg',
    ];
    const fileExt = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!allowedExtensions.includes(fileExt)) {
      setError(
        'Unsupported file type. Supported: PDF, DOCX/DOC, PPTX/PPT, TXT, RTF, CSV, XLSX/XLS, MP3, WAV, MP4, WEBM, PNG, JPG, JPEG, SVG'
      );
      return;
    }

    setUploading(true);
    setError('');

    try {
      await apiClient.uploadDocument(courseId, file);
      await loadDocuments();
      await loadCourse(); // Refresh course to update document count
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDocumentClick = (document: Document) => {
    if (document.processing_status === 'completed') {
      setSelectedDocument(document);
    }
  };

  const handleCloseDocument = () => {
    setSelectedDocument(null);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !courseId || sending) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setSending(true);
    setError('');

    try {
      const response: ChatResponse = await apiClient.sendMessage(courseId, {
        message: userMessage,
        conversation_id: conversationId,
      });

      setConversationId(response.conversation_id);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: response.content,
          sources: response.sources,
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      setMessages((prev) => prev.slice(0, -1)); // Remove user message on error
    } finally {
      setSending(false);
    }
  };

  // Layout styles
  const containerStyle: CSSProperties = {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  };

  const contentWrapperStyle: CSSProperties = {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
    position: 'relative',
    minHeight: 0,
    background: theme.colors.background.primary,
  };

  const mainContentStyle: CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    minWidth: 0,
    minHeight: 0,
    background: theme.colors.background.primary,
  };

  if (loading) {
    return (
      <div style={containerStyle}>
        <LoadingSpinner fullScreen text="Loading course..." />
      </div>
    );
  }

  if (!course) {
    return (
      <div style={containerStyle}>
        <div style={{ padding: theme.spacing.xl, textAlign: 'center' }}>
          <Alert variant="error">Course not found</Alert>
        </div>
      </div>
    );
  }

  // Show assessments view if requested
  if (showAssessments) {
    return (
      <div style={containerStyle}>
        <TopActionBar
          courseId={courseId!}
          courseName={course.name}
          onBack={() => setShowAssessments(false)}
        />
        <div style={contentWrapperStyle}>
          <DocumentSidebar
            documents={documents}
            selectedDocumentId={selectedDocument?.id}
            onDocumentClick={handleDocumentClick}
            uploading={uploading}
          />
          <div style={mainContentStyle}>
            <Card padding="xl" style={{ height: '100%', overflow: 'auto' }}>
              <div style={{ marginBottom: theme.spacing.lg }}>
                <Tabs
                  tabs={[
                    { id: 'mcq', label: '✓ Multiple Choice' },
                    { id: 'open-ended', label: '✍️ Open-Ended' },
                  ]}
                  activeTab={assessmentSubTab}
                  onTabChange={(tabId) => setAssessmentSubTab(tabId as 'mcq' | 'open-ended')}
                  fullWidth
                />
              </div>
              {courseId && (
                <>
                  {assessmentSubTab === 'mcq' && <MCQAssessment courseId={courseId} />}
                  {assessmentSubTab === 'open-ended' && <OpenEndedAssessment courseId={courseId} />}
                </>
              )}
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Default view: No document selected - show upload dropzone and chat in main area
  return (
    <div style={containerStyle}>
      <TopActionBar
        courseId={courseId!}
        courseName={course.name}
        onBack={() => navigate('/')}
        onAssessmentsClick={() => setShowAssessments(true)}
      />
      <div style={contentWrapperStyle}>
        <DocumentSidebar
          documents={documents}
          selectedDocumentId={selectedDocument?.id}
          onDocumentClick={handleDocumentClick}
          uploading={uploading}
        />
        <div style={mainContentStyle}>
          {error && (
            <div style={{ padding: theme.spacing.md, flexShrink: 0 }}>
              <Alert variant="error" onClose={() => setError('')}>
                {error}
              </Alert>
            </div>
          )}
          {selectedDocument ? (
            // Document is open - show embedded viewer with chat sidebar
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
              <div style={{ flex: '0 0 auto', padding: theme.spacing.xs, borderBottom: `1px solid ${theme.colors.gray[200]}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `0 ${theme.spacing.sm}` }}>
                  <span style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.text.secondary }}>
                    Viewing: {selectedDocument.filename}
                  </span>
                  <button
                    onClick={handleCloseDocument}
                    style={{
                      padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                      background: theme.colors.gray[100],
                      color: theme.colors.text.primary,
                      border: `1px solid ${theme.colors.gray[300]}`,
                      borderRadius: theme.borderRadius.md,
                      cursor: 'pointer',
                      fontSize: theme.typography.fontSize.sm,
                      fontWeight: theme.typography.fontWeight.medium,
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = theme.colors.gray[200];
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = theme.colors.gray[100];
                    }}
                  >
                    ✕ Close Document
                  </button>
                </div>
              </div>
              <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                <EmbeddedCourseDocumentView
                  document={selectedDocument}
                  courseId={courseId!}
                  course={course}
                  documents={documents}
                  onClose={handleCloseDocument}
                />
              </div>
            </div>
          ) : (
            // No document selected - show upload dropzone and chat
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
              <div style={{ flex: '0 0 auto', padding: theme.spacing.xs, borderBottom: `1px solid ${theme.colors.gray[200]}` }}>
                <UploadDropzone onFileUpload={handleFileUpload} uploading={uploading} />
              </div>
              <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <CourseChatAssistant
                  messages={messages}
                  inputMessage={inputMessage}
                  onInputChange={setInputMessage}
                  onSend={handleSendMessage}
                  sending={sending}
                  placeholder="Ask questions about this course..."
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
