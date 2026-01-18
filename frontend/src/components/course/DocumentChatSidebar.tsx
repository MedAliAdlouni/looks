/**
 * Document Chat Sidebar - Reusable chat sidebar for document viewers
 * Extracted from PDFViewer for use across all document viewers
 */

import React, { useState, useEffect, useRef } from 'react';
import { apiClient } from '../../api/client';
import type { ChatResponse } from '../../types/api';
import { MarkdownMessage } from '../shared';
import { ChatSettingsPanel } from './ChatSettingsPanel';
import { ConversationList } from './ConversationList';
import { useConversations } from '../../hooks/useConversations';
import { theme } from '../../theme';
import type { CSSProperties } from 'react';

export interface DocumentChatSidebarProps {
  courseId: string;
  documentId?: string; // Make optional to support course-level chat
  documentType?: string; // e.g., "document", "presentation", "image", "course"
  onSourceClick?: (source: { document_id: string; document_name: string; page: number; chunk_text: string }) => void;
  width?: number;
  onWidthChange?: (width: number) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{ document_id: string; document_name: string; page: number; chunk_text?: string }>;
  mode?: 'strict' | 'hybrid';
}

export const DocumentChatSidebar: React.FC<DocumentChatSidebarProps> = ({
  courseId,
  documentId,
  documentType = 'course', // Default to 'course' when no document
  onSourceClick,
  width: initialWidth = 400,
  onWidthChange,
  isOpen,
  onToggle,
}) => {
  // Conversation management
  const {
    conversations,
    currentConversationId,
    messages: conversationMessages,
    switchConversation,
    createNewConversation,
    addMessage,
    updateLastAssistantMessage,
    updateLastAssistantMessageComplete,
    refreshConversations,
  } = useConversations(courseId);

  // Convert conversation messages to ChatMessage format
  const messages: ChatMessage[] = conversationMessages.map((msg) => ({
    role: msg.role,
    content: msg.content,
    sources: msg.sources?.map((src) => ({
      document_id: '', // Will be populated if available from API
      document_name: src.document_name || 'Unknown Document',
      page: src.page,
      chunk_text: undefined,
    })),
  }));

  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(initialWidth);
  const [isResizing, setIsResizing] = useState(false);
  const [responseMode, setResponseMode] = useState<'strict' | 'hybrid'>('hybrid');
  const [verbosity, setVerbosity] = useState<'concise' | 'normal' | 'detailed'>('normal');
  const [streaming, setStreaming] = useState<boolean>(true);
  const [settingsExpanded, setSettingsExpanded] = useState<boolean>(false);
  const [conversationListOpen, setConversationListOpen] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const loadingStatusIntervalRef = useRef<number | null>(null);
  const loadingStatusIndexRef = useRef<number>(0);

  // Sync width with parent if provided
  useEffect(() => {
    if (onWidthChange) {
      onWidthChange(sidebarWidth);
    }
  }, [sidebarWidth, onWidthChange]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Inject CSS keyframes for loading spinner animation
  useEffect(() => {
    const styleId = 'chat-loading-spinner-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }
    return () => {
      // Cleanup on unmount is optional - keeping styles for reuse
    };
  }, []);

  // Cleanup loading interval on unmount
  useEffect(() => {
    return () => {
      if (loadingStatusIntervalRef.current !== null) {
        clearInterval(loadingStatusIntervalRef.current);
      }
    };
  }, []);

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
    
    // Add user message immediately
    const userMsg: ChatMessage = { role: 'user', content: userMessage };
    addMessage(userMsg);
    
    setSending(true);

    // Start progressive loading indicators with sequential, non-cycling logic
    const loadingStatuses = [
      'Searching course documents…',
      'Retrieving relevant information…',
      'Thinking…',
      'Generating response…',
    ];
    const finalStatusIndex = loadingStatuses.length - 1; // Index of "Generating response…"
    
    // Reset status index
    loadingStatusIndexRef.current = 0;
    setLoadingStatus(loadingStatuses[0]);

    const startLoadingStatus = () => {
      loadingStatusIntervalRef.current = window.setInterval(() => {
        // Only advance if not at the final status
        if (loadingStatusIndexRef.current < finalStatusIndex) {
          loadingStatusIndexRef.current += 1;
          setLoadingStatus(loadingStatuses[loadingStatusIndexRef.current]);
        }
        // Once at "Generating response…", stay there until content arrives
      }, 800); // Change status every 800ms
    };

    const stopLoadingStatus = () => {
      if (loadingStatusIntervalRef.current !== null) {
        clearInterval(loadingStatusIntervalRef.current);
        loadingStatusIntervalRef.current = null;
      }
      setLoadingStatus(null);
      loadingStatusIndexRef.current = 0; // Reset for next message
    };

    startLoadingStatus();

    try {
      if (streaming) {
        // Streaming response - create placeholder message
        const placeholderMsg: ChatMessage = { role: 'assistant', content: '', mode: responseMode };
        addMessage(placeholderMsg);

        let fullContent = '';
        let hasReceivedContent = false;

        // Stream chunks and update message in real-time
        const response = await apiClient.sendMessageStream(
          courseId,
          {
            message: userMessage,
            conversation_id: currentConversationId || undefined,
            mode: responseMode,
            verbosity: verbosity,
            stream: true,
          },
          (chunk: string) => {
            if (!hasReceivedContent && chunk.trim()) {
              // First content received - stop loading indicators
              hasReceivedContent = true;
              stopLoadingStatus();
            }
            fullContent += chunk;
            // Update the last assistant message as chunks arrive
            updateLastAssistantMessage(() => fullContent);
          }
        );

        // Ensure loading status is stopped
        stopLoadingStatus();

        // If this is a new conversation, create it
        if (!currentConversationId && response.conversation_id) {
          const title = userMessage.length > 50 ? userMessage.substring(0, 50) : userMessage;
          createNewConversation(response.conversation_id, title);
          await refreshConversations();
        }

        // Final update with sources (mode is already set on placeholder message)
        updateLastAssistantMessageComplete({
          content: fullContent,
          sources: response.sources?.map((src) => ({
            document_id: src.document_id,
            document_name: src.document_name,
            page: src.page,
            chunk_text: src.chunk_text || '',
          })),
        });
      } else {
        // Non-streaming response - create placeholder message for loading indicator
        const placeholderMsg: ChatMessage = { role: 'assistant', content: '', mode: responseMode };
        addMessage(placeholderMsg);

        // Non-streaming response
        const response: ChatResponse = await apiClient.sendMessage(courseId, {
          message: userMessage,
          conversation_id: currentConversationId || undefined,
          mode: responseMode,
          verbosity: verbosity,
          stream: false,
        });

        // Stop loading indicators when response arrives
        stopLoadingStatus();

        // If this is a new conversation, create it
        if (!currentConversationId && response.conversation_id) {
          const title = userMessage.length > 50 ? userMessage.substring(0, 50) : userMessage;
          createNewConversation(response.conversation_id, title);
          await refreshConversations();
        }

        // Update placeholder message with actual response (mode is already set on placeholder)
        updateLastAssistantMessageComplete({
          content: response.content,
          sources: response.sources?.map((src) => ({
            document_id: src.document_id,
            document_name: src.document_name,
            page: src.page,
            chunk_text: src.chunk_text || '',
          })),
        });
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      stopLoadingStatus();
      // Remove user message on error - handled by hook
    } finally {
      setSending(false);
    }
  };

  const handleNewConversation = () => {
    switchConversation(null);
    setInputMessage('');
  };

  const handleSelectConversation = async (conversationId: string | null) => {
    await switchConversation(conversationId);
    setInputMessage('');
  };

  if (!isOpen) {
    return null;
  }

  const sidebarWrapperStyle: CSSProperties = {
    display: 'flex',
    height: '100%',
    position: 'relative',
    flexShrink: 0,
  };

  return (
    <div style={sidebarWrapperStyle}>
      <ConversationList
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        isOpen={conversationListOpen}
        onToggle={() => setConversationListOpen(!conversationListOpen)}
      />
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
        onMouseEnter={() => {
          if (!isResizing && sidebarRef.current) {
            sidebarRef.current.style.borderLeftColor = '#007bff';
          }
        }}
        onMouseLeave={() => {
          if (!isResizing && sidebarRef.current) {
            sidebarRef.current.style.borderLeftColor = '#dee2e6';
          }
        }}
      />
      
      {/* Collapsible Settings Section */}
      {settingsExpanded && (
        <ChatSettingsPanel
          responseMode={responseMode}
          verbosity={verbosity}
          streaming={streaming}
          onResponseModeChange={setResponseMode}
          onVerbosityChange={setVerbosity}
          onStreamingChange={setStreaming}
          documentType={documentType}
        />
      )}
      
      {/* Header with Settings Toggle and Hide Button */}
      <div style={styles.header}>
        <button
          onClick={() => setConversationListOpen(!conversationListOpen)}
          style={{ ...styles.headerButton, flex: '0 0 auto', marginRight: '0.5rem' }}
          title={conversationListOpen ? "Hide conversations" : "Show conversations"}
        >
          💬
        </button>
        <button
          onClick={() => setSettingsExpanded(!settingsExpanded)}
          style={styles.headerButton}
          title={settingsExpanded ? "Hide settings" : "Show settings"}
        >
          {settingsExpanded ? '▼' : '⚙️'} {settingsExpanded ? 'Hide' : 'Chat settings'}
        </button>
        <button
          onClick={onToggle}
          style={styles.hideButton}
          title="Hide chat"
        >
          👁️ Hide
        </button>
      </div>

      {/* Chat Messages */}
      <div style={styles.chatMessages}>
        {messages.length === 0 ? (
          <div style={styles.chatEmpty}>
            <p>Start a conversation about this {documentType}!</p>
            <p style={styles.chatHint}>
              {documentId 
                ? "Ask questions about the content you're viewing."
                : "Ask questions about the course materials."}
              <br />
              <span
                style={{
                  fontSize: theme.typography.fontSize.sm,
                  color: theme.colors.text.tertiary,
                  display: 'block',
                  marginTop: theme.spacing['3xl'],
                }}
              >
                Tip: Click <strong>Chat settings</strong> to adjust response type and length.
                Click the <span role="img" aria-label="conversation emoji">💬</span> emoji to show past conversations or create a new one.
              </span>
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => {
              // Improved parsing for hybrid messages
              const hasCourseMaterialHeader = msg.content.includes('Based on Course Material:');
              const hasAdditionalContextHeader = msg.content.includes('Additional Context:');
              const isHybrid = msg.mode === 'hybrid' && (hasCourseMaterialHeader || hasAdditionalContextHeader);
              let courseMaterialSection = '';
              let additionalContextSection = '';
              
              if (isHybrid && msg.content) {
                // Parse both sections properly
                const courseMaterialMatch = msg.content.match(/Based on Course Material:\s*(.*?)(?=Additional Context:|$)/s);
                const additionalContextMatch = msg.content.match(/Additional Context:\s*(.*?)$/s);
                
                if (courseMaterialMatch) {
                  courseMaterialSection = courseMaterialMatch[1].trim();
                }
                if (additionalContextMatch) {
                  additionalContextSection = additionalContextMatch[1].trim();
                }
              }
              
              // Check if this is the last message and still loading
              const isLastMessage = idx === messages.length - 1;
              const isCurrentlyLoading = isLastMessage && msg.role === 'assistant' && loadingStatus && !msg.content.trim();
              
              return (
                <div
                  key={idx}
                  style={{
                    ...styles.message,
                    ...(msg.role === 'user' ? styles.userMessage : styles.assistantMessage),
                  }}
                >
                  {isCurrentlyLoading ? (
                    // Show loading indicator
                    <div style={styles.loadingIndicator}>
                      <div style={styles.loadingSpinner}></div>
                      <span style={styles.loadingText}>{loadingStatus}</span>
                    </div>
                  ) : isHybrid && (courseMaterialSection || additionalContextSection) ? (
                    <div>
                      {courseMaterialSection && (
                        <div style={styles.courseMaterialSection}>
                          <div style={styles.sectionHeader}>Based on Course Material:</div>
                          <MarkdownMessage content={courseMaterialSection} isUser={false} />
                        </div>
                      )}
                      {additionalContextSection && (
                        <div style={styles.additionalContextSection}>
                          <div style={styles.sectionHeader}>Additional Context:</div>
                          <MarkdownMessage content={additionalContextSection} isUser={false} />
                        </div>
                      )}
                      {/* Sources at the bottom of the entire response */}
                      {msg.sources && msg.sources.length > 0 && (
                        <div style={{
                          ...styles.sources,
                          ...styles.sourcesAssistant,
                        }}>
                          <strong style={{ color: '#374151', fontSize: '0.75rem', display: 'block', marginTop: '0.5rem', marginBottom: '0.25rem' }}>Sources:</strong>
                          <div>
                            {msg.sources.map((src, srcIdx) => (
                              <span
                                key={srcIdx}
                                onClick={() => onSourceClick && src.chunk_text && onSourceClick({
                                  document_id: src.document_id,
                                  document_name: src.document_name,
                                  page: src.page,
                                  chunk_text: src.chunk_text,
                                })}
                                style={{
                                  ...styles.sourceTag,
                                  ...styles.sourceTagAssistant,
                                  cursor: onSourceClick && src.chunk_text ? 'pointer' : 'default',
                                  textDecoration: onSourceClick && src.chunk_text ? 'underline' : 'none',
                                }}
                                title={onSourceClick && src.chunk_text ? `Click to view ${src.document_name || 'document'} on page ${src.page}` : `${src.document_name || 'Unknown Document'} - Page ${src.page}`}
                              >
                                {src.document_name || 'Unknown Document'} - Page {src.page}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <MarkdownMessage content={msg.content} isUser={msg.role === 'user'} />
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
                                onClick={() => onSourceClick && src.chunk_text && onSourceClick({
                                  document_id: src.document_id,
                                  document_name: src.document_name,
                                  page: src.page,
                                  chunk_text: src.chunk_text,
                                })}
                                style={{
                                  ...styles.sourceTag,
                                  ...(msg.role === 'assistant' ? styles.sourceTagAssistant : {}),
                                  cursor: onSourceClick && src.chunk_text ? 'pointer' : 'default',
                                  textDecoration: onSourceClick && src.chunk_text ? 'underline' : 'none',
                                }}
                                title={onSourceClick && src.chunk_text ? `Click to view ${src.document_name || 'document'} on page ${src.page}` : `${src.document_name || 'Unknown Document'} - Page ${src.page}`}
                              >
                                {src.document_name || 'Unknown Document'} - Page {src.page}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </>
        )}
        <div ref={chatEndRef} />
      </div>
      
      {/* Chat Input */}
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
    </div>
  );
};

const styles: Record<string, CSSProperties> = {
  sidebar: {
    position: 'relative',
    background: theme.colors.background.primary,
    borderLeft: `1px solid ${theme.colors.gray[200]}`,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: '100%',
    flexShrink: 0,
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
    backgroundColor: theme.colors.accent.DEFAULT,
    width: '4px',
  },
  header: {
    display: 'flex',
    gap: theme.spacing.sm,
    padding: `${theme.spacing.md} ${theme.spacing.lg}`,
    borderBottom: `1px solid ${theme.colors.gray[200]}`,
    background: theme.colors.background.primary,
    flexShrink: 0,
  },
  headerButton: {
    flex: 1,
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    background: theme.colors.background.secondary,
    color: theme.colors.text.primary,
    border: `1px solid ${theme.colors.gray[300]}`,
    borderRadius: theme.borderRadius.md,
    cursor: 'pointer',
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    transition: `all ${theme.transitions.default}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
  },
  hideButton: {
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    background: theme.colors.background.secondary,
    color: theme.colors.text.secondary,
    border: `1px solid ${theme.colors.gray[300]}`,
    borderRadius: theme.borderRadius.md,
    cursor: 'pointer',
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    transition: `all ${theme.transitions.default}`,
    whiteSpace: 'nowrap',
  },
  chatMessages: {
    flex: 1,
    overflowY: 'auto',
    padding: theme.spacing.sm,
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.xs,
    background: theme.colors.background.primary,
    minHeight: 0,
  },
  chatEmpty: {
    textAlign: 'center',
    padding: `${theme.spacing['3xl']} ${theme.spacing.xl}`,
    color: theme.colors.text.tertiary,
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatHint: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.muted,
    marginTop: theme.spacing.sm,
  },
  message: {
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    borderRadius: theme.borderRadius.md,
    maxWidth: '95%',
    boxShadow: theme.shadows.sm,
    lineHeight: theme.typography.lineHeight.relaxed,
    marginBottom: theme.spacing.xs,
  },
  userMessage: {
    background: theme.colors.primary.DEFAULT,
    color: theme.colors.text.inverse,
    alignSelf: 'flex-end',
    marginLeft: 'auto',
    marginRight: '0',
    boxShadow: theme.shadows.sm,
  },
  assistantMessage: {
    background: theme.colors.background.secondary,
    color: theme.colors.text.primary,
    alignSelf: 'flex-start',
    border: `1px solid ${theme.colors.gray[200]}`,
    boxShadow: theme.shadows.sm,
  },
  courseMaterialSection: {
    marginBottom: theme.spacing.md,
    padding: `${theme.spacing.md} ${theme.spacing.lg}`,
    background: theme.colors.info.light,
    borderRadius: theme.borderRadius.md,
    border: `1px solid ${theme.colors.info.DEFAULT}`,
  },
  additionalContextSection: {
    marginTop: theme.spacing.md,
    padding: `${theme.spacing.md} ${theme.spacing.lg}`,
    background: theme.colors.warning.light,
    borderRadius: theme.borderRadius.md,
    border: `1px solid ${theme.colors.warning.DEFAULT}`,
  },
  sectionHeader: {
    display: 'block',
    marginBottom: theme.spacing.sm,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    letterSpacing: '0.025em',
  },
  loadingIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: `${theme.spacing.sm} 0`,
    color: theme.colors.text.tertiary,
  },
  loadingSpinner: {
    width: '16px',
    height: '16px',
    border: `2px solid ${theme.colors.gray[200]}`,
    borderTopColor: theme.colors.accent.DEFAULT,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    fontSize: theme.typography.fontSize.sm,
    fontStyle: 'italic',
    color: theme.colors.text.tertiary,
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
    background: theme.colors.accent[50],
    color: theme.colors.accent.DEFAULT,
    border: `1px solid ${theme.colors.accent[200]}`,
  },
  chatInput: {
    display: 'flex',
    padding: theme.spacing.md,
    borderTop: `1px solid ${theme.colors.gray[200]}`,
    gap: theme.spacing.sm,
    background: theme.colors.background.primary,
    flexShrink: 0,
  },
  chatInputField: {
    flex: 1,
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    border: `1px solid ${theme.colors.gray[300]}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.typography.fontSize.sm,
    transition: `all ${theme.transitions.default}`,
    background: theme.colors.background.primary,
  },
  sendButton: {
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
    background: theme.colors.success.DEFAULT,
    color: theme.colors.text.inverse,
    border: 'none',
    borderRadius: theme.borderRadius.md,
    cursor: 'pointer',
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    transition: `all ${theme.transitions.default}`,
    whiteSpace: 'nowrap',
  },
};

