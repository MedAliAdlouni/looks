import { useState, useEffect, useRef } from 'react';
import { apiClient } from '../api/client';
import type { Document as DocumentType, Course, ChatResponse } from '../types/api';
import MarkdownMessage from './MarkdownMessage';

interface DocxViewerProps {
  document: DocumentType;
  courseId: string;
  course: Course;
  onClose: () => void;
}

export default function DocxViewer({ document, courseId, course, onClose }: DocxViewerProps) {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  
  // Chat state
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; sources?: any[]; mode?: 'strict' | 'hybrid' }>>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  const [responseMode, setResponseMode] = useState<'strict' | 'hybrid'>('strict');
  const [verbosity, setVerbosity] = useState<'concise' | 'normal' | 'detailed'>('normal');
  const [settingsExpanded, setSettingsExpanded] = useState<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const documentContainerRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadDocx = async () => {
      try {
        const token = localStorage.getItem('token');
        const url = `/api/documents/${document.id}/view/docx`;
        
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (!response.ok) {
          throw new Error('Failed to load document');
        }
        
        const html = await response.text();
        setHtmlContent(html);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load document');
        setLoading(false);
      }
    };

    loadDocx();
  }, [document.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle sidebar resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      const constrainedWidth = Math.max(300, Math.min(800, newWidth));
      setSidebarWidth(constrainedWidth);
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
  }, [isResizing]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || sending) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setSending(true);
    setError('');

    try {
      const response: ChatResponse = await apiClient.sendMessage(courseId, {
        message: userMessage,
        conversation_id: conversationId,
        mode: responseMode,
        verbosity: verbosity,
      });

      setConversationId(response.conversation_id);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: response.content,
          sources: response.sources,
          mode: response.mode || responseMode,
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <button onClick={onClose} style={styles.backButton}>
            ← Back
          </button>
          <h2 style={styles.title}>{document.filename}</h2>
        </div>
        <div style={styles.headerCenter}>
          <button
            onClick={() => setSettingsExpanded(!settingsExpanded)}
            style={styles.headerCenterButton}
            title={settingsExpanded ? "Hide settings" : "Show settings"}
          >
            {settingsExpanded ? '▼' : '⚙️'} {settingsExpanded ? 'Hide' : 'Settings'}
          </button>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={styles.chatToggle}
            title={sidebarOpen ? "Hide chat" : "Show chat"}
          >
            {sidebarOpen ? '👁️ Hide Chat' : '💬 Show Chat'}
          </button>
        </div>
        <div style={styles.headerRight}>
          <span style={styles.fileInfo}>
            📝 Word Document • {(document.file_size / 1024).toFixed(2)} KB
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
          <>
            <div 
              ref={documentContainerRef}
              style={{ 
                ...styles.documentContainer,
                width: sidebarOpen 
                  ? `calc(100% - ${sidebarWidth}px)` 
                  : '100%',
              }}
            >
              <iframe
                srcDoc={htmlContent}
                style={styles.iframe}
                title={document.filename}
              />
            </div>

            {/* Chat Sidebar */}
            {sidebarOpen && (
              <div ref={sidebarRef} style={{ ...styles.sidebar, width: `${sidebarWidth}px` }}>
                {/* Resize Handle */}
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
                />
                {/* Collapsible Settings Section */}
                {settingsExpanded && (
                  <div style={styles.settingsContent}>
                    <p style={styles.sidebarSubtitle}>Ask questions about this document</p>
                    
                    {/* Mode Toggle */}
                    <div style={styles.modeToggle}>
                      <button
                        onClick={() => setResponseMode('strict')}
                        style={{
                          ...styles.modeButton,
                          ...(responseMode === 'strict' ? styles.modeButtonActive : {}),
                        }}
                        title="Answers strictly from course material only"
                      >
                        📚 Course Material Only
                      </button>
                      <button
                        onClick={() => setResponseMode('hybrid')}
                        style={{
                          ...styles.modeButton,
                          ...(responseMode === 'hybrid' ? styles.modeButtonActive : {}),
                        }}
                        title="Answers from course material plus additional general knowledge"
                      >
                        🌐 Hybrid (Course + General)
                      </button>
                    </div>
                    
                    {/* Verbosity Selector */}
                    <div style={styles.verbositySelector}>
                      <label style={styles.verbosityLabel}>Response Length:</label>
                      <div style={styles.verbosityButtons}>
                        <button
                          onClick={() => setVerbosity('concise')}
                          style={{
                            ...styles.verbosityButton,
                            ...(verbosity === 'concise' ? styles.verbosityButtonActive : {}),
                          }}
                          title="Brief, essential information only"
                        >
                          Concise
                        </button>
                        <button
                          onClick={() => setVerbosity('normal')}
                          style={{
                            ...styles.verbosityButton,
                            ...(verbosity === 'normal' ? styles.verbosityButtonActive : {}),
                          }}
                          title="Balanced response with adequate detail"
                        >
                          Normal
                        </button>
                        <button
                          onClick={() => setVerbosity('detailed')}
                          style={{
                            ...styles.verbosityButton,
                            ...(verbosity === 'detailed' ? styles.verbosityButtonActive : {}),
                          }}
                          title="Comprehensive and thorough explanation"
                        >
                          Detailed
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                <div style={styles.chatMessages}>
                  {messages.length === 0 ? (
                    <div style={styles.chatEmpty}>
                      <p>Start a conversation about this document!</p>
                      <p style={styles.chatHint}>
                        Ask questions about the content you're reading.
                      </p>
                    </div>
                  ) : (
                    messages.map((msg, idx) => {
                      const hasCourseMaterialHeader = msg.content.includes('Based on Course Material:');
                      const hasAdditionalContextHeader = msg.content.includes('Additional Context:');
                      const isHybrid = msg.mode === 'hybrid' && (hasCourseMaterialHeader || hasAdditionalContextHeader);
                      let courseMaterialSection = '';
                      let additionalContextSection = '';
                      
                      if (isHybrid) {
                        if (hasAdditionalContextHeader) {
                          const parts = msg.content.split('Additional Context:');
                          const coursePart = parts[0];
                          courseMaterialSection = coursePart.replace('Based on Course Material:', '').trim();
                          additionalContextSection = parts[1]?.trim() || '';
                        } else if (hasCourseMaterialHeader) {
                          courseMaterialSection = msg.content.replace('Based on Course Material:', '').trim();
                        }
                      }
                      
                      return (
                        <div
                          key={idx}
                          style={{
                            ...styles.message,
                            ...(msg.role === 'user' ? styles.userMessage : styles.assistantMessage),
                          }}
                        >
                          {isHybrid && (courseMaterialSection || additionalContextSection) ? (
                            <div>
                              {courseMaterialSection && (
                                <div style={styles.courseMaterialSection}>
                                  <strong style={styles.sectionHeader}>📚 Based on Course Material:</strong>
                                  <MarkdownMessage content={courseMaterialSection} isUser={false} />
                                </div>
                              )}
                              {additionalContextSection && (
                                <div style={styles.additionalContextSection}>
                                  <strong style={styles.sectionHeader}>🌐 Additional Context:</strong>
                                  <MarkdownMessage content={additionalContextSection} isUser={false} />
                                </div>
                              )}
                            </div>
                          ) : (
                            <MarkdownMessage content={msg.content} isUser={msg.role === 'user'} />
                          )}
                          {msg.sources && msg.sources.length > 0 && (
                            <div style={{
                              ...styles.sources,
                              ...(msg.role === 'assistant' ? styles.sourcesAssistant : {}),
                            }}>
                              <strong style={msg.role === 'assistant' ? { color: '#374151' } : { color: 'white' }}>Sources:</strong>
                              <div>
                                {msg.sources.map((src, srcIdx) => (
                                  <span
                                    key={srcIdx}
                                    style={{
                                      ...styles.sourceTag,
                                      ...(msg.role === 'assistant' ? styles.sourceTagAssistant : {}),
                                    }}
                                    title={`${src.document_name || 'Unknown Document'} - Page ${src.page}`}
                                  >
                                    {src.document_name || 'Unknown Document'} - Page {src.page}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                  <div ref={chatEndRef} />
                </div>
                <form onSubmit={handleSendMessage} style={styles.chatInput}>
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Ask a question..."
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
                    {sending ? '...' : 'Send'}
                  </button>
                </form>
              </div>
            )}
          </>
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
    padding: '2rem',
    overflow: 'hidden',
    gap: '0',
  },
  headerCenter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    flexWrap: 'wrap',
  },
  headerCenterButton: {
    padding: '0.5rem 0.75rem',
    background: 'rgba(102, 126, 234, 0.1)',
    color: '#667eea',
    border: '1px solid rgba(102, 126, 234, 0.2)',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontSize: '0.8125rem',
    fontWeight: '600',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
  },
  chatToggle: {
    padding: '0.625rem 1.25rem',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '0.75rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '600',
    transition: 'all 0.2s',
    boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)',
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
    height: '100%',
    background: 'white',
    borderRadius: '0.5rem',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
    overflow: 'hidden',
    transition: 'width 0.3s ease',
  },
  iframe: {
    width: '100%',
    height: '100%',
    border: 'none',
  },
  sidebar: {
    position: 'relative',
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    borderLeft: '1px solid rgba(0, 0, 0, 0.1)',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: '100%',
    flexShrink: 0,
    boxShadow: '-4px 0 6px -1px rgba(0, 0, 0, 0.1)',
  },
  resizeHandle: {
    position: 'absolute',
    left: 0,
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
  settingsContent: {
    padding: '0.75rem 1rem',
    borderBottom: '1px solid #e5e7eb',
    background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
  },
  sidebarSubtitle: {
    margin: 0,
    color: '#6b7280',
    fontSize: '0.875rem',
  },
  modeToggle: {
    display: 'flex',
    gap: '0.5rem',
    marginTop: '1rem',
    flexDirection: 'column',
  },
  modeButton: {
    padding: '0.625rem 1rem',
    background: 'rgba(102, 126, 234, 0.1)',
    color: '#667eea',
    border: '2px solid rgba(102, 126, 234, 0.3)',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontSize: '0.8125rem',
    fontWeight: '600',
    transition: 'all 0.2s',
    textAlign: 'left',
    width: '100%',
  },
  modeButtonActive: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: '2px solid #667eea',
    boxShadow: '0 2px 4px rgba(102, 126, 234, 0.3)',
  },
  verbositySelector: {
    marginTop: '1rem',
    paddingTop: '1rem',
    borderTop: '1px solid #e5e7eb',
  },
  verbosityLabel: {
    display: 'block',
    fontSize: '0.8125rem',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '0.5rem',
  },
  verbosityButtons: {
    display: 'flex',
    gap: '0.375rem',
    flexWrap: 'wrap',
  },
  verbosityButton: {
    flex: 1,
    minWidth: '70px',
    padding: '0.5rem 0.75rem',
    background: 'rgba(107, 114, 128, 0.1)',
    color: '#6b7280',
    border: '1px solid rgba(107, 114, 128, 0.2)',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontWeight: '500',
    transition: 'all 0.2s',
    textAlign: 'center',
  },
  verbosityButtonActive: {
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white',
    border: '1px solid #10b981',
    boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)',
  },
  courseMaterialSection: {
    marginBottom: '0.75rem',
    padding: '0.5rem 0.75rem',
    background: 'rgba(102, 126, 234, 0.05)',
    borderRadius: '0.5rem',
    border: '1px solid rgba(102, 126, 234, 0.15)',
  },
  additionalContextSection: {
    marginTop: '0.75rem',
    padding: '0.5rem 0.75rem',
    background: 'rgba(16, 185, 129, 0.05)',
    borderRadius: '0.5rem',
    border: '1px solid rgba(16, 185, 129, 0.15)',
  },
  sectionHeader: {
    display: 'block',
    marginBottom: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#374151',
  },
  chatMessages: {
    flex: 1,
    overflowY: 'auto',
    padding: '0.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.375rem',
    background: '#ffffff',
    minHeight: 0,
  },
  chatEmpty: {
    textAlign: 'center',
    padding: '3rem 2rem',
    color: '#6b7280',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatHint: {
    fontSize: '0.875rem',
    color: '#9ca3af',
    marginTop: '0.5rem',
  },
  message: {
    padding: '0.375rem 0.625rem',
    borderRadius: '0.5rem',
    maxWidth: '95%',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    lineHeight: '1.6',
    marginBottom: '0.375rem',
  },
  userMessage: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    alignSelf: 'flex-end',
    marginLeft: 'auto',
    marginRight: '0',
    boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
  },
  assistantMessage: {
    background: '#ffffff',
    color: '#111827',
    alignSelf: 'flex-start',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
  },
  sources: {
    marginTop: '0.375rem',
    paddingTop: '0.375rem',
    fontSize: '0.75rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    borderTop: '1px solid rgba(255,255,255,0.3)',
  },
  sourcesAssistant: {
    borderTop: '1px solid #e5e7eb',
  },
  sourceTag: {
    display: 'inline-block',
    padding: '0.2rem 0.4rem',
    borderRadius: '4px',
    marginRight: '0.375rem',
    marginTop: '0.2rem',
    background: 'rgba(255,255,255,0.2)',
    color: 'white',
    fontSize: '0.75rem',
  },
  sourceTagAssistant: {
    background: 'rgba(102, 126, 234, 0.1)',
    color: '#667eea',
    border: '1px solid rgba(102, 126, 234, 0.2)',
  },
  chatInput: {
    display: 'flex',
    padding: '0.75rem',
    borderTop: '1px solid #e5e7eb',
    gap: '0.5rem',
    background: 'white',
    flexShrink: 0,
  },
  chatInputField: {
    flex: 1,
    padding: '0.625rem 0.875rem',
    border: '2px solid #e5e7eb',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    transition: 'all 0.2s',
    background: '#f9fafb',
  },
  sendButton: {
    padding: '0.625rem 1.25rem',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '600',
    transition: 'all 0.2s',
    boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3)',
    whiteSpace: 'nowrap',
  },
};

