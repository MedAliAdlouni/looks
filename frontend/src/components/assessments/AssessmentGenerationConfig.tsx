/**
 * Assessment Generation Configuration Panel
 * Shared component for configuring question generation parameters
 */

import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import type { Document } from '../../types/api';
import type { CSSProperties } from 'react';

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export interface AssessmentGenerationConfigData {
  numQuestions: number;
  selectedDocuments: string[];
  difficulty: DifficultyLevel;
}

export interface AssessmentGenerationConfigProps {
  courseId: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (config: AssessmentGenerationConfigData) => void;
}

export const AssessmentGenerationConfig: React.FC<AssessmentGenerationConfigProps> = ({
  courseId,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [numQuestions, setNumQuestions] = useState(1);
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('medium');

  // Load documents when panel opens
  useEffect(() => {
    if (isOpen && courseId) {
      loadDocuments();
    } else {
      // Reset when closed
      setNumQuestions(1);
      setSelectedDocuments(new Set());
      setDifficulty('medium');
    }
  }, [isOpen, courseId]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const docs = await apiClient.getDocuments(courseId);
      // Filter for processed documents only
      const processedDocs = docs.filter(doc => doc.processing_status === 'completed');
      setDocuments(processedDocs);
      
      // Auto-select all processed documents
      if (processedDocs.length > 0) {
        setSelectedDocuments(new Set(processedDocs.map(doc => doc.id)));
      }
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentToggle = (documentId: string) => {
    setSelectedDocuments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(documentId)) {
        newSet.delete(documentId);
      } else {
        newSet.add(documentId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedDocuments.size === documents.length) {
      setSelectedDocuments(new Set());
    } else {
      setSelectedDocuments(new Set(documents.map(doc => doc.id)));
    }
  };

  const handleConfirm = () => {
    if (selectedDocuments.size === 0) {
      alert('Please select at least one document');
      return;
    }
    onConfirm({
      numQuestions,
      selectedDocuments: Array.from(selectedDocuments),
      difficulty,
    });
    onClose();
  };

  if (!isOpen) return null;

  const processedDocuments = documents.filter(doc => doc.processing_status === 'completed');
  const allSelected = processedDocuments.length > 0 && selectedDocuments.size === processedDocuments.length;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={styles.title}>Configure Question Generation</h3>
          <button onClick={onClose} style={styles.closeButton}>
            ×
          </button>
        </div>

        <div style={styles.content}>
          {/* Number of Questions */}
          <div style={styles.section}>
            <label style={styles.label}>
              Number of Questions
            </label>
            <input
              type="number"
              min={1}
              max={50}
              value={numQuestions}
              onChange={(e) => {
                const value = parseInt(e.target.value, 10);
                if (!isNaN(value) && value >= 1 && value <= 50) {
                  setNumQuestions(value);
                }
              }}
              style={styles.numberInput}
            />
            <p style={styles.hint}>Range: 1-50 questions</p>
          </div>

          {/* Source Documents */}
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <label style={styles.label}>Source Documents</label>
              {processedDocuments.length > 0 && (
                <button
                  onClick={handleSelectAll}
                  style={styles.selectAllButton}
                >
                  {allSelected ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>
            {loading ? (
              <p style={styles.loadingText}>Loading documents...</p>
            ) : processedDocuments.length === 0 ? (
              <p style={styles.emptyText}>No processed documents available</p>
            ) : (
              <div style={styles.documentsList}>
                {processedDocuments.map((doc) => {
                  const isSelected = selectedDocuments.has(doc.id);
                  return (
                    <label
                      key={doc.id}
                      style={{
                        ...styles.documentItem,
                        ...(isSelected ? styles.documentItemHover : {}),
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleDocumentToggle(doc.id)}
                        style={styles.checkbox}
                      />
                      <span style={styles.documentName}>{doc.filename}</span>
                      <span style={styles.documentInfo}>
                        ({doc.num_pages} pages)
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Difficulty Level */}
          <div style={styles.section}>
            <label style={styles.label}>Difficulty Level</label>
            <div style={styles.difficultyButtons}>
              <button
                onClick={() => setDifficulty('easy')}
                style={{
                  ...styles.difficultyButton,
                  ...(difficulty === 'easy' ? styles.difficultyButtonActive : {}),
                }}
              >
                Easy
              </button>
              <button
                onClick={() => setDifficulty('medium')}
                style={{
                  ...styles.difficultyButton,
                  ...(difficulty === 'medium' ? styles.difficultyButtonActive : {}),
                }}
              >
                Medium
              </button>
              <button
                onClick={() => setDifficulty('hard')}
                style={{
                  ...styles.difficultyButton,
                  ...(difficulty === 'hard' ? styles.difficultyButtonActive : {}),
                }}
              >
                Hard
              </button>
            </div>
          </div>
        </div>

        <div style={styles.footer}>
          <button onClick={onClose} style={styles.cancelButton}>
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedDocuments.size === 0}
            style={{
              ...styles.confirmButton,
              ...(selectedDocuments.size === 0 ? styles.buttonDisabled : {}),
            }}
          >
            Generate Questions
          </button>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  panel: {
    backgroundColor: 'white',
    borderRadius: '1rem',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    width: '90%',
    maxWidth: '600px',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.5rem',
    borderBottom: '1px solid #e5e7eb',
  },
  title: {
    margin: 0,
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '1.5rem',
    color: '#6b7280',
    cursor: 'pointer',
    padding: 0,
    width: '2rem',
    height: '2rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '0.375rem',
    transition: 'all 0.2s',
  },
  closeButtonHover: {
    backgroundColor: '#f3f4f6',
  },
  content: {
    padding: '1.5rem',
    overflowY: 'auto',
    flex: 1,
  },
  section: {
    marginBottom: '2rem',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.75rem',
  },
  label: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '0.75rem',
  },
  numberInput: {
    width: '100%',
    padding: '0.75rem',
    border: '2px solid #e5e7eb',
    borderRadius: '0.5rem',
    fontSize: '1rem',
    transition: 'all 0.2s',
  },
  hint: {
    margin: '0.5rem 0 0 0',
    fontSize: '0.75rem',
    color: '#6b7280',
  },
  selectAllButton: {
    padding: '0.375rem 0.75rem',
    background: 'rgba(102, 126, 234, 0.1)',
    color: '#667eea',
    border: '1px solid rgba(102, 126, 234, 0.3)',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontWeight: '600',
    transition: 'all 0.2s',
  },
  loadingText: {
    color: '#6b7280',
    fontSize: '0.875rem',
    fontStyle: 'italic',
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: '0.875rem',
  },
  documentsList: {
    maxHeight: '200px',
    overflowY: 'auto',
    border: '1px solid #e5e7eb',
    borderRadius: '0.5rem',
    padding: '0.5rem',
  },
  documentItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem',
    cursor: 'pointer',
    borderRadius: '0.375rem',
    transition: 'background-color 0.2s',
  },
  documentItemHover: {
    backgroundColor: 'rgba(102, 126, 234, 0.05)',
  },
  checkbox: {
    width: '1.25rem',
    height: '1.25rem',
    cursor: 'pointer',
    accentColor: '#667eea',
  },
  documentName: {
    flex: 1,
    fontSize: '0.875rem',
    color: '#374151',
    fontWeight: '500',
  },
  documentInfo: {
    fontSize: '0.75rem',
    color: '#6b7280',
  },
  difficultyButtons: {
    display: 'flex',
    gap: '0.75rem',
  },
  difficultyButton: {
    flex: 1,
    padding: '0.75rem 1rem',
    background: 'rgba(107, 114, 128, 0.1)',
    color: '#6b7280',
    border: '2px solid rgba(107, 114, 128, 0.2)',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '600',
    transition: 'all 0.2s',
  },
  difficultyButtonActive: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: '2px solid #667eea',
    boxShadow: '0 4px 6px -1px rgba(102, 126, 234, 0.3)',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem',
    padding: '1.5rem',
    borderTop: '1px solid #e5e7eb',
  },
  cancelButton: {
    padding: '0.75rem 1.5rem',
    background: 'white',
    color: '#374151',
    border: '2px solid #e5e7eb',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '600',
    transition: 'all 0.2s',
  },
  confirmButton: {
    padding: '0.75rem 1.5rem',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '600',
    transition: 'all 0.2s',
    boxShadow: '0 4px 6px -1px rgba(102, 126, 234, 0.3)',
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
};

