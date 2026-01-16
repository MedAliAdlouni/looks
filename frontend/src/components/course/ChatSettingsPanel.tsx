/**
 * Chat Settings Panel - Reusable settings component for document chat
 * Extracted from PDFViewer for use across all document viewers
 */

import React from 'react';
import type { CSSProperties } from 'react';

export interface ChatSettingsPanelProps {
  responseMode: 'strict' | 'hybrid';
  verbosity: 'concise' | 'normal' | 'detailed';
  streaming?: boolean;
  onResponseModeChange: (mode: 'strict' | 'hybrid') => void;
  onVerbosityChange: (verbosity: 'concise' | 'normal' | 'detailed') => void;
  onStreamingChange?: (streaming: boolean) => void;
  documentType?: string; // e.g., "document", "presentation", "image"
}

export const ChatSettingsPanel: React.FC<ChatSettingsPanelProps> = ({
  responseMode,
  verbosity,
  streaming = false,
  onResponseModeChange,
  onVerbosityChange,
  onStreamingChange,
  documentType = 'document',
}) => {
  return (
    <div style={styles.settingsContent}>
      <p style={styles.sidebarSubtitle}>Ask questions about this {documentType}</p>
      
      {/* Mode Toggle */}
      <div style={styles.modeToggle}>
        <button
          onClick={() => onResponseModeChange('strict')}
          style={{
            ...styles.modeButton,
            ...(responseMode === 'strict' ? styles.modeButtonActive : {}),
          }}
          title="Answers strictly from course material only"
        >
          📚 Course Material Only
        </button>
        <button
          onClick={() => onResponseModeChange('hybrid')}
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
            onClick={() => onVerbosityChange('concise')}
            style={{
              ...styles.verbosityButton,
              ...(verbosity === 'concise' ? styles.verbosityButtonActive : {}),
            }}
            title="Brief, essential information only"
          >
            Concise
          </button>
          <button
            onClick={() => onVerbosityChange('normal')}
            style={{
              ...styles.verbosityButton,
              ...(verbosity === 'normal' ? styles.verbosityButtonActive : {}),
            }}
            title="Balanced response with adequate detail"
          >
            Normal
          </button>
          <button
            onClick={() => onVerbosityChange('detailed')}
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
      
      {/* Streaming Toggle */}
      {onStreamingChange && (
        <div style={styles.streamingToggle}>
          <label style={styles.streamingLabel}>
            <input
              type="checkbox"
              checked={streaming}
              onChange={(e) => onStreamingChange(e.target.checked)}
              style={styles.streamingCheckbox}
            />
            <span style={styles.streamingText}>
              ⚡ Streaming Response
            </span>
          </label>
          <p style={styles.streamingHint}>
            Enable to see responses appear in real-time (ChatGPT-style)
          </p>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, CSSProperties> = {
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
  streamingToggle: {
    marginTop: '1rem',
    paddingTop: '1rem',
    borderTop: '1px solid #e5e7eb',
  },
  streamingLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    cursor: 'pointer',
    fontSize: '0.8125rem',
    fontWeight: '600',
    color: '#374151',
  },
  streamingCheckbox: {
    width: '1rem',
    height: '1rem',
    cursor: 'pointer',
    accentColor: '#667eea',
  },
  streamingText: {
    userSelect: 'none',
  },
  streamingHint: {
    margin: '0.5rem 0 0 1.5rem',
    fontSize: '0.75rem',
    color: '#6b7280',
    fontStyle: 'italic',
  },
};

