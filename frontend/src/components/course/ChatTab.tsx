/**
 * Chat Tab Component
 */

import React, { useRef, useEffect } from 'react';
import { MessageBubble } from './MessageBubble';
import { Button, Input } from '../ui';
import { theme } from '../../theme';
import type { CSSProperties } from 'react';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{
    document_name?: string;
    page: number;
  }>;
}

export interface ChatTabProps {
  messages: ChatMessage[];
  inputMessage: string;
  onInputChange: (value: string) => void;
  onSend: (e: React.FormEvent) => void;
  sending: boolean;
}

export const ChatTab: React.FC<ChatTabProps> = ({
  messages,
  inputMessage,
  onInputChange,
  onSend,
  sending,
}) => {
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    height: 'calc(100vh - 300px)',
    minHeight: '600px',
  };

  const messagesStyle: CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: theme.spacing.lg,
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.md,
    background: `linear-gradient(to bottom, ${theme.colors.gray[50]}, ${theme.colors.background.primary})`,
  };

  const emptyStyle: CSSProperties = {
    textAlign: 'center',
    padding: theme.spacing['4xl'],
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  };

  const emptyIconStyle: CSSProperties = {
    fontSize: '4rem',
    marginBottom: theme.spacing.md,
  };

  const emptyTitleStyle: CSSProperties = {
    margin: `0 0 ${theme.spacing.sm} 0`,
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  };

  const hintStyle: CSSProperties = {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.tertiary,
    marginTop: theme.spacing.sm,
  };

  const inputContainerStyle: CSSProperties = {
    display: 'flex',
    padding: theme.spacing.lg,
    borderTop: `1px solid ${theme.colors.gray[200]}`,
    gap: theme.spacing.sm,
    background: theme.colors.background.primary,
  };

  return (
    <div style={containerStyle}>
      <div style={messagesStyle}>
        {messages.length === 0 ? (
          <div style={emptyStyle}>
            <div style={emptyIconStyle}>💬</div>
            <h4 style={emptyTitleStyle}>Start a conversation</h4>
            <p style={hintStyle}>Ask questions about the documents you've uploaded.</p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <MessageBubble
              key={idx}
              role={msg.role}
              content={msg.content}
              sources={msg.sources}
            />
          ))
        )}
        <div ref={chatEndRef} />
      </div>
      <form onSubmit={onSend} style={inputContainerStyle}>
        <Input
          type="text"
          value={inputMessage}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder="Ask a question about this course..."
          disabled={sending}
          style={{ flex: 1 }}
        />
        <Button
          type="submit"
          variant="success"
          disabled={sending || !inputMessage.trim()}
          isLoading={sending}
        >
          Send →
        </Button>
      </form>
    </div>
  );
};

