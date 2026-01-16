/**
 * Course Chat Assistant Component - ChatGPT-style chat interface
 */

import React, { useRef, useEffect } from 'react';
import { MessageBubble } from './MessageBubble';
import type { ChatMessage } from './ChatTab';
import { Input, Button } from '../ui';
import { theme } from '../../theme';
import type { CSSProperties } from 'react';

export interface CourseChatAssistantProps {
  messages: ChatMessage[];
  inputMessage: string;
  onInputChange: (value: string) => void;
  onSend: (e: React.FormEvent) => void;
  sending: boolean;
  placeholder?: string;
}

export const CourseChatAssistant: React.FC<CourseChatAssistantProps> = ({
  messages,
  inputMessage,
  onInputChange,
  onSend,
  sending,
  placeholder = 'Ask a question about this course...',
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: theme.colors.background.primary,
    overflow: 'hidden',
  };

  const messagesStyle: CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    padding: theme.spacing.lg,
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.md,
    background: `linear-gradient(to bottom, ${theme.colors.gray[50]}, ${theme.colors.background.primary})`,
    minHeight: 0,
  };

  const emptyStyle: CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
    textAlign: 'center',
  };

  const emptyIconStyle: CSSProperties = {
    fontSize: '4rem',
    marginBottom: theme.spacing.md,
    opacity: 0.5,
  };

  const emptyTitleStyle: CSSProperties = {
    margin: `0 0 ${theme.spacing.sm} 0`,
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  };

  const emptyTextStyle: CSSProperties = {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.tertiary,
  };

  const inputContainerStyle: CSSProperties = {
    padding: theme.spacing.lg,
    borderTop: `1px solid ${theme.colors.gray[200]}`,
    background: theme.colors.background.primary,
    display: 'flex',
    gap: theme.spacing.sm,
    alignItems: 'flex-end',
    flexShrink: 0,
  };

  return (
    <div style={containerStyle}>
      <div ref={messagesContainerRef} style={messagesStyle}>
        {messages.length === 0 ? (
          <div style={emptyStyle}>
            <div style={emptyIconStyle}>💬</div>
            <h4 style={emptyTitleStyle}>Start a conversation</h4>
            <p style={emptyTextStyle}>
              Ask questions about the course materials or documents you've uploaded.
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => (
              <MessageBubble
                key={idx}
                role={msg.role}
                content={msg.content}
                sources={msg.sources}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
      <form onSubmit={onSend} style={inputContainerStyle}>
        <Input
          type="text"
          value={inputMessage}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder={placeholder}
          disabled={sending}
          style={{ flex: 1 }}
        />
        <Button
          type="submit"
          variant="success"
          disabled={sending || !inputMessage.trim()}
          isLoading={sending}
        >
          Send
        </Button>
      </form>
    </div>
  );
};

