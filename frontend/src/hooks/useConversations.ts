/**
 * Conversation Management Hook
 * Manages conversations per course with persistence
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';
import type { Conversation, Message } from '../types/api';
import type { ChatMessage } from '../components/course/ChatTab';

const STORAGE_KEY_PREFIX = 'chat_conversations_';

interface ConversationState {
  conversations: Conversation[];
  currentConversationId: string | null;
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
}

export function useConversations(courseId: string | undefined) {
  const [state, setState] = useState<ConversationState>({
    conversations: [],
    currentConversationId: null,
    messages: [],
    loading: false,
    error: null,
  });

  // Load conversations from localStorage on mount
  const loadFromStorage = useCallback(() => {
    if (!courseId) return null;
    try {
      const key = `${STORAGE_KEY_PREFIX}${courseId}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load conversations from storage:', e);
    }
    return null;
  }, [courseId]);

  // Save conversations to localStorage
  const saveToStorage = useCallback((conversations: Conversation[], currentId: string | null) => {
    if (!courseId) return;
    try {
      const key = `${STORAGE_KEY_PREFIX}${courseId}`;
      localStorage.setItem(key, JSON.stringify({ conversations, currentConversationId: currentId }));
    } catch (e) {
      console.error('Failed to save conversations to storage:', e);
    }
  }, [courseId]);

  // Load conversations from API
  const loadConversations = useCallback(async () => {
    if (!courseId) return;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const conversations = await apiClient.getConversations(courseId);
      setState((prev) => ({ ...prev, conversations, loading: false }));
      
      // Merge with stored conversations and update storage
      const stored = loadFromStorage();
      if (stored?.conversations) {
        // Merge API conversations with stored ones (API is source of truth for IDs)
        const merged = conversations;
        saveToStorage(merged, stored.currentConversationId);
      } else {
        saveToStorage(conversations, null);
      }
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to load conversations',
        loading: false,
      }));
    }
  }, [courseId, loadFromStorage, saveToStorage]);

  // Load messages for a conversation
  const loadMessages = useCallback(async (conversationId: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const apiMessages = await apiClient.getConversationMessages(conversationId);
      
      // Convert API messages to ChatMessage format
      const chatMessages: ChatMessage[] = apiMessages.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        sources: msg.sources?.map((src) => ({
          document_name: src.document_name,
          page: src.page,
        })),
      }));

      setState((prev) => {
        const updated = {
          ...prev,
          messages: chatMessages,
          currentConversationId: conversationId,
          loading: false,
        };
        // Update storage with current conversations
        saveToStorage(prev.conversations, conversationId);
        return updated;
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to load messages',
        loading: false,
      }));
    }
  }, [saveToStorage]);

  // Switch to a conversation
  const switchConversation = useCallback(async (conversationId: string | null) => {
    if (!conversationId) {
      // New conversation - clear messages
      setState((prev) => {
        saveToStorage(prev.conversations, null);
        return {
          ...prev,
          currentConversationId: null,
          messages: [],
        };
      });
      return;
    }

    await loadMessages(conversationId);
  }, [loadMessages, saveToStorage]);

  // Create a new conversation (called when first message is sent)
  const createNewConversation = useCallback((conversationId: string, title: string) => {
    const newConversation: Conversation = {
      id: conversationId,
      course_id: courseId!,
      title: title || 'New chat',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setState((prev) => {
      const updated = {
        ...prev,
        conversations: [newConversation, ...prev.conversations],
        currentConversationId: conversationId,
      };
      saveToStorage(updated.conversations, conversationId);
      return updated;
    });
  }, [courseId, saveToStorage]);

  // Update conversation title (when first message is sent)
  const updateConversationTitle = useCallback((conversationId: string, title: string) => {
    setState((prev) => {
      const updated = {
        ...prev,
        conversations: prev.conversations.map((conv) =>
          conv.id === conversationId ? { ...conv, title } : conv
        ),
      };
      saveToStorage(updated.conversations, prev.currentConversationId);
      return updated;
    });
  }, [saveToStorage]);

  // Add a message to current conversation
  const addMessage = useCallback((message: ChatMessage) => {
    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, message],
    }));
  }, []);

  // Update the last assistant message (for streaming)
  const updateLastAssistantMessage = useCallback((updater: (content: string) => string) => {
    setState((prev) => {
      const messages = [...prev.messages];
      const lastIndex = messages.length - 1;
      if (lastIndex >= 0 && messages[lastIndex]?.role === 'assistant') {
        messages[lastIndex] = {
          ...messages[lastIndex],
          content: updater(messages[lastIndex].content || ''),
        };
      }
      return { ...prev, messages };
    });
  }, []);

  // Update the last assistant message with complete data (for finalizing streaming)
  const updateLastAssistantMessageComplete = useCallback((updates: Partial<ChatMessage>) => {
    setState((prev) => {
      const messages = [...prev.messages];
      const lastIndex = messages.length - 1;
      if (lastIndex >= 0 && messages[lastIndex]?.role === 'assistant') {
        messages[lastIndex] = {
          ...messages[lastIndex],
          ...updates,
        };
      }
      return { ...prev, messages };
    });
  }, []);

  // Initialize: Load conversations and restore current conversation from storage
  useEffect(() => {
    if (!courseId) return;

    // Load from storage first for instant UI
    const stored = loadFromStorage();
    if (stored) {
      setState((prev) => ({
        ...prev,
        conversations: stored.conversations || [],
        currentConversationId: stored.currentConversationId || null,
      }));

      // If there's a current conversation, load its messages
      if (stored.currentConversationId) {
        loadMessages(stored.currentConversationId).catch(console.error);
      }
    }

    // Then sync with API
    loadConversations();
  }, [courseId, loadFromStorage, loadConversations, loadMessages]);

  return {
    conversations: state.conversations,
    currentConversationId: state.currentConversationId,
    messages: state.messages,
    loading: state.loading,
    error: state.error,
    switchConversation,
    createNewConversation,
    updateConversationTitle,
    addMessage,
    updateLastAssistantMessage,
    updateLastAssistantMessageComplete,
    refreshConversations: loadConversations,
  };
}

