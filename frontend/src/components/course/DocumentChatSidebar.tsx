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
  const [responseMode, setResponseMode] = useState<'strict' | 'hybrid'>('strict');
  const [verbosity, setVerbosity] = useState<'concise' | 'normal' | 'detailed'>('normal');
  const [streaming, setStreaming] = useState<boolean>(false);
  const [settingsExpanded, setSettingsExpanded] = useState<boolean>(false);
  const [conversationListOpen, setConversationListOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Sync width with parent if provided
  useEffect(() => {
    if (onWidthChange) {
      onWidthChange(sidebarWidth);
    }
  }, [sidebarWidth, onWidthChange]);

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
    
    // Add user message immediately
    const userMsg: ChatMessage = { role: 'user', content: userMessage };
    addMessage(userMsg);
    
    setSending(true);

    try {
      if (streaming) {
        // Streaming response - create placeholder message
        const placeholderMsg: ChatMessage = { role: 'assistant', content: '', mode: responseMode };
        addMessage(placeholderMsg);

        let fullContent = '';

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
            fullContent += chunk;
            // Update the last assistant message as chunks arrive
            updateLastAssistantMessage(() => fullContent);
          }
        );

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
        // Non-streaming response
        const response: ChatResponse = await apiClient.sendMessage(courseId, {
          message: userMessage,
          conversation_id: currentConversationId || undefined,
          mode: responseMode,
          verbosity: verbosity,
          stream: false,
        });

        // If this is a new conversation, create it
        if (!currentConversationId && response.conversation_id) {
          const title = userMessage.length > 50 ? userMessage.substring(0, 50) : userMessage;
          createNewConversation(response.conversation_id, title);
          await refreshConversations();
        }

        const assistantMsg: ChatMessage = {
          role: 'assistant',
          content: response.content,
          sources: response.sources,
          mode: response.mode || responseMode,
        };
        addMessage(assistantMsg);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
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
                  fontSize: '0.95em',
                  color: '#6c757d',
                  display: 'block',
                  marginTop: '3em', // Increased padding before the tip
                }}
              >
                Tip: Click <strong>Chat settings</strong> to adjust response type and length.
                Click the <span role="img" aria-label="conversation emoji">💬</span> emoji to show past conversations or create a new one.
              </span>
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
              </div>
            );
          })
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
  header: {
    display: 'flex',
    gap: '0.5rem',
    padding: '0.75rem 1rem',
    borderBottom: '1px solid #e5e7eb',
    background: 'white',
    flexShrink: 0,
  },
  headerButton: {
    flex: 1,
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
    justifyContent: 'center',
    gap: '0.375rem',
  },
  hideButton: {
    padding: '0.5rem 0.75rem',
    background: 'rgba(107, 114, 128, 0.1)',
    color: '#374151',
    border: '1px solid rgba(107, 114, 128, 0.2)',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontSize: '0.8125rem',
    fontWeight: '600',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
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

