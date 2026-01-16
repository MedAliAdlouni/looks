/**
 * Message Bubble Component for Chat
 */

import React from 'react';
import { theme } from '../../theme';
import type { CSSProperties } from 'react';

export interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{
    document_name?: string;
    page: number;
  }>;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ role, content, sources }) => {
  const isUser = role === 'user';

  const messageStyle: CSSProperties = {
    padding: `${theme.spacing.md} ${theme.spacing.lg}`,
    borderRadius: theme.borderRadius.xl,
    maxWidth: '80%',
    boxShadow: theme.shadows.md,
    ...(isUser
      ? {
          background: theme.gradients.primary,
          color: theme.colors.text.inverse,
          alignSelf: 'flex-end',
        }
      : {
          background: theme.colors.background.primary,
          color: theme.colors.text.primary,
          alignSelf: 'flex-start',
          border: `1px solid ${theme.colors.gray[200]}`,
        }),
  };

  const headerStyle: CSSProperties = {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    marginBottom: theme.spacing.sm,
    opacity: 0.8,
  };

  const contentStyle: CSSProperties = {
    marginBottom: sources && sources.length > 0 ? theme.spacing.sm : 0,
    whiteSpace: 'pre-wrap' as const,
    lineHeight: theme.typography.lineHeight.relaxed,
  };

  const sourcesStyle: CSSProperties = {
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    fontSize: theme.typography.fontSize.sm,
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.sm,
    borderTop: `1px solid ${isUser ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)'}`,
  };

  const sourcesTitleStyle: CSSProperties = {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    opacity: 0.8,
  };

  const sourcesListStyle: CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  };

  const sourceTagStyle: CSSProperties = {
    display: 'inline-block',
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
    ...(isUser
      ? {
          background: 'rgba(255,255,255,0.2)',
          color: theme.colors.text.inverse,
        }
      : {
          background: 'rgba(102, 126, 234, 0.1)',
          color: theme.colors.primary.DEFAULT,
        }),
  };

  return (
    <div style={messageStyle} className="animate-fade-in">
      <div style={headerStyle}>{isUser ? '👤 You' : '🤖 Assistant'}</div>
      <div style={contentStyle}>{content}</div>
      {sources && sources.length > 0 && (
        <div style={sourcesStyle}>
          <strong style={sourcesTitleStyle}>📚 Sources:</strong>
          <div style={sourcesListStyle}>
            {sources.map((src, idx) => (
              <span key={idx} style={sourceTagStyle}>
                {src.document_name || 'Unknown Document'} - Page {src.page}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

