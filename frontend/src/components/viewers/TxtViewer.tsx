import { useState, useEffect, useRef } from 'react';
import { apiClient } from '../../api/client';
import type { Document as DocumentType, Course, ChatResponse } from '../../types/api';
import { MarkdownMessage } from '../shared';
import { theme } from '../../theme';
import type { CSSProperties } from 'react';

interface TxtViewerProps {
  document: DocumentType;
  courseId: string;
  course: Course;
  onClose: () => void;
  variant?: 'embedded' | 'fullscreen';
}

export default function TxtViewer({ document, courseId, course, onClose, variant = 'fullscreen' }: TxtViewerProps) {
  const [textContent, setTextContent] = useState<string>('');
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
    const loadTxt = async () => {
      try {
        const token = localStorage.getItem('token');
        const url = `/api/documents/${document.id}/view/txt`;
        
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (!response.ok) {
          throw new Error('Failed to load document');
        }
        
        const html = await response.text();
        // Extract text from HTML (it's wrapped in <pre> tag)
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const preElement = doc.querySelector('pre');
        const text = preElement ? preElement.textContent || '' : '';
        setTextContent(text);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load document');
        setLoading(false);
      }
    };

    loadTxt();
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
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || sending) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    
    // Add user message immediately
    const newMessages = [...messages, { role: 'user' as const, content: userMessage }];
    setMessages(newMessages);
    
    setSending(true);
    setError('');

    try {
      const response: ChatResponse = await apiClient.sendMessage(courseId, {
        message: userMessage,
        conversation_id: conversationId || undefined,
        mode: responseMode,
        verbosity,
      });

      // Update conversation ID if this is a new conversation
      if (response.conversation_id && !conversationId) {
        setConversationId(response.conversation_id);
      }

      // Add assistant message
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: response.content,
          sources: response.sources,
          mode: responseMode,
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      // Remove user message on error
      setMessages(messages);
    } finally {
      setSending(false);
    }
  };

  const handleStartResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    window.document.body.style.cursor = 'ew-resize';
    window.document.body.style.userSelect = 'none';
  };

  // Embedded mode: simpler layout without fullscreen controls
  if (variant === 'embedded') {
    const embeddedContainerStyle: CSSProperties = {
      display: 'flex',
      height: '100%',
      width: '100%',
      overflow: 'hidden',
      background: theme.colors.background.primary,
    };

    const embeddedViewerStyle: CSSProperties = {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      minWidth: 0,
    };

    const embeddedContentStyle: CSSProperties = {
      flex: 1,
      overflow: 'auto',
      padding: theme.spacing.lg,
      background: theme.colors.background.primary,
    };

    const embeddedTextStyle: CSSProperties = {
      fontFamily: theme.typography.fontFamily.mono,
      fontSize: theme.typography.fontSize.base,
      lineHeight: theme.typography.lineHeight.relaxed,
      color: theme.colors.text.primary,
      whiteSpace: 'pre-wrap',
      wordWrap: 'break-word',
      background: theme.colors.background.secondary,
      padding: theme.spacing.lg,
      borderRadius: theme.borderRadius.md,
      border: `1px solid ${theme.colors.gray[200]}`,
    };

    return (
      <div style={embeddedContainerStyle}>
        <div style={embeddedViewerStyle} ref={documentContainerRef}>
          {loading ? (
            <div style={{ padding: theme.spacing.xl, textAlign: 'center', color: theme.colors.text.secondary }}>
              Loading document...
            </div>
          ) : error ? (
            <div style={{ padding: theme.spacing.xl, textAlign: 'center', color: theme.colors.error.DEFAULT }}>
              <p>Error: {error}</p>
            </div>
          ) : (
            <div style={embeddedContentStyle}>
              <pre style={embeddedTextStyle}>{textContent}</pre>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Fullscreen mode
  const containerStyle: CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: theme.colors.background.primary,
    display: 'flex',
    flexDirection: 'column',
    zIndex: 1000,
  };

  const headerStyle: CSSProperties = {
    background: theme.colors.background.primary,
    padding: theme.spacing.md,
    borderBottom: `1px solid ${theme.colors.gray[200]}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexShrink: 0,
  };

  const contentStyle: CSSProperties = {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
    minHeight: 0,
  };

  const viewerStyle: CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    minWidth: 0,
    background: theme.colors.background.primary,
  };

  const textContainerStyle: CSSProperties = {
    flex: 1,
    overflow: 'auto',
    padding: theme.spacing.xl,
    background: theme.colors.background.primary,
  };

  const textStyle: CSSProperties = {
    fontFamily: theme.typography.fontFamily.mono,
    fontSize: theme.typography.fontSize.base,
    lineHeight: theme.typography.lineHeight.relaxed,
    color: theme.colors.text.primary,
    whiteSpace: 'pre-wrap',
    wordWrap: 'break-word',
    background: theme.colors.background.secondary,
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.md,
    border: `1px solid ${theme.colors.gray[200]}`,
    maxWidth: '1200px',
    margin: '0 auto',
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.md }}>
          <button
            onClick={onClose}
            style={{
              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
              background: theme.colors.gray[100],
              color: theme.colors.text.primary,
              border: `1px solid ${theme.colors.gray[300]}`,
              borderRadius: theme.borderRadius.md,
              cursor: 'pointer',
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.medium,
            }}
          >
            ← Back
          </button>
          <h2 style={{ margin: 0, fontSize: theme.typography.fontSize.xl, fontWeight: theme.typography.fontWeight.semibold }}>
            {document.filename}
          </h2>
        </div>
      </div>

      <div style={contentStyle}>
        <div style={viewerStyle} ref={documentContainerRef}>
          {loading ? (
            <div style={{ padding: theme.spacing.xl, textAlign: 'center', color: theme.colors.text.secondary }}>
              Loading document...
            </div>
          ) : error ? (
            <div style={{ padding: theme.spacing.xl, textAlign: 'center', color: theme.colors.error.DEFAULT }}>
              <p>Error: {error}</p>
              <button onClick={onClose} style={{ marginTop: theme.spacing.md, padding: `${theme.spacing.sm} ${theme.spacing.md}`, background: theme.colors.error.DEFAULT, color: 'white', border: 'none', borderRadius: theme.borderRadius.md, cursor: 'pointer' }}>
                Close
              </button>
            </div>
          ) : (
            <div style={textContainerStyle}>
              <pre style={textStyle}>{textContent}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

