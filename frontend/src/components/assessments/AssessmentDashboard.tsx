/**
 * Assessment Dashboard Component
 * Displays question sets as cards in a responsive grid layout
 */

import React, { useState, useEffect } from 'react';
import { listQuestionSets, deleteQuestionSet, renameQuestionSet, duplicateQuestionSet, type QuestionSetMetadata } from '../../utils/assessmentPersistence';
import type { CSSProperties } from 'react';

export type AssessmentMode = 'mcq' | 'open-ended' | 'find-mistake' | 'case-based';

export interface AssessmentDashboardProps {
  courseId: string;
  mode: AssessmentMode;
  onCreateNew: () => void;
  onSelectSet: (setId: string) => void;
}

export const AssessmentDashboard: React.FC<AssessmentDashboardProps> = ({
  courseId,
  mode,
  onCreateNew,
  onSelectSet,
}) => {
  const [sets, setSets] = useState<QuestionSetMetadata[]>([]);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  useEffect(() => {
    loadSets();
  }, [courseId, mode]);

  const loadSets = () => {
    const questionSets = listQuestionSets(courseId, mode);
    setSets(questionSets);
  };

  const handleDelete = (setId: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
      deleteQuestionSet(courseId, mode, setId);
      loadSets();
      setMenuOpen(null);
    }
  };

  const handleRename = (setId: string, currentTitle: string) => {
    setRenamingId(setId);
    setRenameValue(currentTitle);
    setMenuOpen(null);
  };

  const handleRenameSubmit = (setId: string) => {
    if (renameValue.trim()) {
      renameQuestionSet(courseId, mode, setId, renameValue.trim());
      loadSets();
    }
    setRenamingId(null);
    setRenameValue('');
  };

  const handleDuplicate = (setId: string) => {
    duplicateQuestionSet(courseId, mode, setId);
    loadSets();
    setMenuOpen(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getModeIcon = () => {
    switch (mode) {
      case 'mcq': return '✓';
      case 'open-ended': return '✍️';
      case 'find-mistake': return '🔍';
      case 'case-based': return '📋';
      default: return '✓';
    }
  };

  const getModeLabel = () => {
    switch (mode) {
      case 'mcq': return 'Multiple Choice';
      case 'open-ended': return 'Open-Ended';
      case 'find-mistake': return 'Find the Mistake';
      case 'case-based': return 'Case-Based';
      default: return 'Assessment';
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Question Sets</h2>
        <p style={styles.subtitle}>{getModeLabel()} Assessments</p>
      </div>

      <div style={styles.grid}>
        {/* Create New Card */}
        <div style={styles.createCard} onClick={onCreateNew}>
          <div style={styles.createIcon}>+</div>
          <div style={styles.createLabel}>Create new assessment</div>
        </div>

        {/* Existing Sets */}
        {sets.map((set) => (
          <div 
            key={set.id} 
            style={styles.card}
            onClick={() => {
              if (renamingId !== set.id) {
                onSelectSet(set.id);
              }
            }}
          >
            {/* Kebab Menu */}
            <div style={styles.cardHeader}>
              <span style={styles.cardIcon}>{getModeIcon()}</span>
              <div style={styles.menuContainer}>
                <button
                  style={styles.menuButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(menuOpen === set.id ? null : set.id);
                  }}
                  aria-label="Menu"
                >
                  ⋮
                </button>
                {menuOpen === set.id && (
                  <div style={styles.menuDropdown}>
                    <button
                      style={styles.menuItem}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRename(set.id, set.title);
                      }}
                    >
                      ✏️ Rename
                    </button>
                    <button
                      style={styles.menuItem}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicate(set.id);
                      }}
                    >
                      📋 Duplicate
                    </button>
                    <button
                      style={{ ...styles.menuItem, ...styles.menuItemDanger }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(set.id, set.title);
                      }}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Card Content */}
            {renamingId === set.id ? (
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => handleRenameSubmit(set.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameSubmit(set.id);
                  if (e.key === 'Escape') {
                    setRenamingId(null);
                    setRenameValue('');
                  }
                }}
                autoFocus
                style={styles.renameInput}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <>
                <h3 style={styles.cardTitle}>
                  {set.title}
                </h3>
                <div style={styles.cardMetadata}>
                  <span>{formatDate(set.createdAt)}</span>
                  <span style={styles.metadataSeparator}>·</span>
                  <span>{set.numDocuments} {set.numDocuments === 1 ? 'document' : 'documents'}</span>
                </div>
                <div style={styles.cardFooter}>
                  <span style={styles.questionCount}>
                    {set.numQuestions} {set.numQuestions === 1 ? 'question' : 'questions'}
                  </span>
                  {set.difficulty && (
                    <span style={styles.difficultyBadge}>{set.difficulty}</span>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Close menu when clicking outside */}
      {menuOpen && (
        <div
          style={styles.menuOverlay}
          onClick={() => setMenuOpen(null)}
        />
      )}
    </div>
  );
};

const styles: Record<string, CSSProperties> = {
  container: {
    width: '100%',
  },
  header: {
    marginBottom: '2rem',
  },
  title: {
    margin: '0 0 0.5rem 0',
    fontSize: '1.75rem',
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    margin: 0,
    fontSize: '1rem',
    color: '#6b7280',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '1.5rem',
  },
  createCard: {
    background: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '1rem',
    padding: '3rem 2rem',
    border: '2px dashed #e5e7eb',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1rem',
    transition: 'all 0.2s',
    minHeight: '200px',
  },
  createCardHover: {
    borderColor: '#667eea',
    background: 'rgba(102, 126, 234, 0.05)',
  },
  createIcon: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '2rem',
    fontWeight: '300',
    boxShadow: '0 4px 6px -1px rgba(102, 126, 234, 0.3)',
  },
  createLabel: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#6b7280',
  },
  card: {
    background: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '1rem',
    padding: '1.5rem',
    border: '1px solid #e5e7eb',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    position: 'relative',
    minHeight: '180px',
    display: 'flex',
    flexDirection: 'column',
  },
  cardHover: {
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    borderColor: '#667eea',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1rem',
  },
  cardIcon: {
    fontSize: '1.5rem',
    lineHeight: 1,
  },
  menuContainer: {
    position: 'relative',
  },
  menuButton: {
    background: 'none',
    border: 'none',
    fontSize: '1.5rem',
    color: '#6b7280',
    cursor: 'pointer',
    padding: '0.25rem 0.5rem',
    borderRadius: '0.375rem',
    lineHeight: 1,
    transition: 'background-color 0.2s',
  },
  menuButtonHover: {
    background: '#f3f4f6',
  },
  menuDropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    background: 'white',
    borderRadius: '0.5rem',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    border: '1px solid #e5e7eb',
    minWidth: '150px',
    zIndex: 1000,
    marginTop: '0.25rem',
  },
  menuItem: {
    width: '100%',
    padding: '0.75rem 1rem',
    background: 'none',
    border: 'none',
    textAlign: 'left',
    cursor: 'pointer',
    fontSize: '0.875rem',
    color: '#374151',
    transition: 'background-color 0.2s',
  },
  menuItemHover: {
    background: '#f3f4f6',
  },
  menuItemDanger: {
    color: '#dc2626',
  },
  menuOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  renameInput: {
    width: '100%',
    padding: '0.75rem',
    border: '2px solid #667eea',
    borderRadius: '0.5rem',
    fontSize: '1rem',
    fontWeight: '600',
    outline: 'none',
  },
  cardTitle: {
    margin: '0 0 0.75rem 0',
    fontSize: '1.125rem',
    fontWeight: '600',
    color: '#111827',
    lineHeight: '1.4',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    flex: 1,
  },
  cardMetadata: {
    fontSize: '0.875rem',
    color: '#6b7280',
    marginBottom: '1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  metadataSeparator: {
    color: '#d1d5db',
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: '0.75rem',
    borderTop: '1px solid #f3f4f6',
  },
  questionCount: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#374151',
  },
  difficultyBadge: {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#667eea',
    background: 'rgba(102, 126, 234, 0.1)',
    padding: '0.25rem 0.5rem',
    borderRadius: '0.375rem',
    textTransform: 'capitalize',
  },
};

