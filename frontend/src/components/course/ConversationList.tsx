/**
 * Conversation List Component - ChatGPT-like sidebar for switching conversations
 */

import React, { useState } from 'react';
import type { Conversation } from '../../types/api';
import { theme } from '../../theme';
import type { CSSProperties } from 'react';

export interface ConversationListProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onSelectConversation: (conversationId: string | null) => void;
  onNewConversation: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  isOpen,
  onToggle,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter conversations by search query
  const filteredConversations = conversations.filter((conv) =>
    (conv.title || 'New chat').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const containerStyle: CSSProperties = {
    position: 'relative',
    width: isOpen ? '280px' : '0',
    background: theme.colors.background.primary,
    borderRight: isOpen ? `1px solid ${theme.colors.gray[200]}` : 'none',
    display: 'flex',
    flexDirection: 'column',
    transition: 'width 0.3s ease',
    overflow: 'hidden',
    flexShrink: 0,
    boxShadow: isOpen ? '2px 0 8px rgba(0, 0, 0, 0.1)' : 'none',
  };

  const headerStyle: CSSProperties = {
    padding: theme.spacing.md,
    borderBottom: `1px solid ${theme.colors.gray[200]}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
    background: theme.colors.background.primary,
  };

  const newChatButtonStyle: CSSProperties = {
    width: '100%',
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: theme.borderRadius.md,
    cursor: 'pointer',
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    transition: 'all 0.2s',
    boxShadow: '0 2px 4px rgba(102, 126, 234, 0.3)',
  };

  const searchInputStyle: CSSProperties = {
    width: '100%',
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    marginBottom: theme.spacing.md,
    border: `1px solid ${theme.colors.gray[300]}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.typography.fontSize.sm,
    background: theme.colors.background.primary,
    color: theme.colors.text.primary,
  };

  const conversationsListStyle: CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: `0 ${theme.spacing.sm}`,
    paddingBottom: theme.spacing.md,
  };

  const conversationItemStyle = (isActive: boolean): CSSProperties => ({
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
    cursor: 'pointer',
    background: isActive
      ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%)'
      : 'transparent',
    border: isActive ? `1px solid rgba(102, 126, 234, 0.3)` : `1px solid transparent`,
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
  });

  const conversationTitleStyle: CSSProperties = {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: isOpen ? theme.typography.fontWeight.medium : theme.typography.fontWeight.normal,
    color: theme.colors.text.primary,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1,
  };

  const emptyStateStyle: CSSProperties = {
    padding: theme.spacing.xl,
    textAlign: 'center',
    color: theme.colors.text.tertiary,
    fontSize: theme.typography.fontSize.sm,
  };

  const toggleButtonStyle: CSSProperties = {
    position: 'absolute',
    right: '-32px',
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 1001,
    padding: theme.spacing.sm,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderTopRightRadius: theme.borderRadius.md,
    borderBottomRightRadius: theme.borderRadius.md,
    cursor: 'pointer',
    fontSize: theme.typography.fontSize.lg,
    boxShadow: '2px 0 4px rgba(0, 0, 0, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '48px',
  };

  if (!isOpen) {
    return (
      <div style={{ position: 'relative', width: '0', flexShrink: 0 }}>
        <button
          onClick={onToggle}
          style={toggleButtonStyle}
          title="Show conversations"
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
          }}
        >
          ☰
        </button>
      </div>
    );
  }

  return (
    <>
      <div style={containerStyle}>
        <div style={headerStyle}>
          <h3 style={{ margin: 0, fontSize: theme.typography.fontSize.lg, fontWeight: theme.typography.fontWeight.bold }}>
            Conversations
          </h3>
          <button
            onClick={onToggle}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: theme.typography.fontSize.lg,
              color: theme.colors.text.secondary,
              padding: theme.spacing.xs,
              borderRadius: theme.borderRadius.sm,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = theme.colors.gray[100];
              e.currentTarget.style.color = theme.colors.text.primary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = theme.colors.text.secondary;
            }}
            title="Hide conversations"
          >
            ✕
          </button>
        </div>

        <div style={{ padding: theme.spacing.md, paddingTop: 0, flexShrink: 0 }}>
          <button
            onClick={onNewConversation}
            style={newChatButtonStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.02)';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(102, 126, 234, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(102, 126, 234, 0.3)';
            }}
          >
            ➕ New Chat
          </button>

          {conversations.length > 0 && (
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={searchInputStyle}
            />
          )}
        </div>

        <div style={conversationsListStyle}>
          {filteredConversations.length === 0 ? (
            <div style={emptyStateStyle}>
              {searchQuery ? (
                <>No conversations found</>
              ) : (
                <>
                  <div style={{ fontSize: '2rem', marginBottom: theme.spacing.sm }}>💬</div>
                  <div>No conversations yet</div>
                  <div style={{ fontSize: theme.typography.fontSize.xs, marginTop: theme.spacing.xs }}>
                    Start a new chat to begin
                  </div>
                </>
              )}
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isActive = conv.id === currentConversationId;
              return (
                <div
                  key={conv.id}
                  onClick={() => onSelectConversation(conv.id)}
                  style={conversationItemStyle(isActive)}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = theme.colors.gray[50];
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <span style={{ fontSize: '1.2rem' }}>💬</span>
                  <span style={conversationTitleStyle}>{conv.title || 'New chat'}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
};

