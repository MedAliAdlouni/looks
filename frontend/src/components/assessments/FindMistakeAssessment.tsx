import { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import type { FindMistakeResponse } from '../../types/api';
import { AssessmentGenerationConfig, type AssessmentGenerationConfigData } from './AssessmentGenerationConfig';
import { AssessmentDashboard } from './AssessmentDashboard';
import { 
  listQuestionSets,
  loadQuestionSet,
  saveQuestionSet,
  type PersistedFindMistakeState 
} from '../../utils/assessmentPersistence';

interface FindMistakeAssessmentProps {
  courseId: string;
}

export default function FindMistakeAssessment({ courseId }: FindMistakeAssessmentProps) {
  const [showDashboard, setShowDashboard] = useState(true);
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [items, setItems] = useState<FindMistakeResponse[]>([]);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>(['']);
  const [submittedItems, setSubmittedItems] = useState<Set<number>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [generationConfig, setGenerationConfig] = useState<AssessmentGenerationConfigData | null>(null);

  const currentItem = items[currentItemIndex];
  const studentAnswer = answers[currentItemIndex] || '';
  const isSubmitted = submittedItems.has(currentItemIndex);

  // Load question set when selected
  const handleSelectSet = (setId: string) => {
    const persisted = loadQuestionSet(courseId, 'find-mistake', setId);
    if (persisted) {
      const state = persisted as PersistedFindMistakeState;
      setItems(state.items);
      setCurrentItemIndex(state.currentIndex || 0);
      setAnswers(state.answers || ['']);
      setSubmittedItems(state.submittedItems || new Set());
      setGenerationConfig(state.generationConfig);
      setSelectedSetId(setId);
      setShowDashboard(false);
    }
  };

  // Save state whenever it changes
  useEffect(() => {
    if (items.length > 0 && selectedSetId) {
      const state: PersistedFindMistakeState = {
        items,
        currentIndex: currentItemIndex,
        answers,
        submittedItems,
        generationConfig,
      };
      saveQuestionSet(courseId, 'find-mistake', selectedSetId, state);
    }
  }, [courseId, selectedSetId, items, currentItemIndex, answers, submittedItems, generationConfig]);

  const handleGenerateClick = () => {
    setShowConfigPanel(true);
  };

  const handleGenerate = async (config: AssessmentGenerationConfigData) => {
    setGenerating(true);
    setError('');
    try {
      const response = await apiClient.generateFindMistake(courseId, {
        num_questions: config.numQuestions,
        document_ids: config.selectedDocuments.length > 0 ? config.selectedDocuments : undefined,
        difficulty: config.difficulty,
      });
      
      // Generate title from config
      const title = `Find the Mistake - ${config.numQuestions} items${config.difficulty ? ` (${config.difficulty})` : ''}`;
      const newSetId = `find-mistake-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Create new set
      const state: PersistedFindMistakeState = {
        items: response.items,
        currentIndex: 0,
        answers: new Array(response.items.length).fill(''),
        submittedItems: new Set(),
        generationConfig: config,
      };
      
      saveQuestionSet(courseId, 'find-mistake', newSetId, state, title);
      
      setItems(response.items);
      setCurrentItemIndex(0);
      setAnswers(new Array(response.items.length).fill(''));
      setSubmittedItems(new Set());
      setGenerationConfig(config);
      setSelectedSetId(newSetId);
      setShowDashboard(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate find_mistake assessment');
    } finally {
      setGenerating(false);
    }
  };

  const handleBackToDashboard = () => {
    setShowDashboard(true);
    setSelectedSetId(null);
  };

  const handleSubmit = () => {
    if (!studentAnswer.trim()) return;
    setSubmittedItems(prev => new Set(prev).add(currentItemIndex));
    
    // Auto-advance to next item after a short delay if available
    if (currentItemIndex < items.length - 1) {
      setTimeout(() => {
        handleNext();
      }, 2000);
    }
  };

  const handleAnswerChange = (value: string) => {
    const newAnswers = [...answers];
    newAnswers[currentItemIndex] = value;
    setAnswers(newAnswers);
  };

  const handlePrevious = () => {
    if (currentItemIndex > 0) {
      setCurrentItemIndex(prev => prev - 1);
    }
  };

  const handleNext = () => {
    if (currentItemIndex < items.length - 1) {
      const nextIndex = currentItemIndex + 1;
      setCurrentItemIndex(nextIndex);
      // Initialize answer if needed
      if (!answers[nextIndex]) {
        const newAnswers = [...answers];
        newAnswers[nextIndex] = '';
        setAnswers(newAnswers);
      }
    }
  };

  // Show dashboard first
  if (showDashboard) {
    return (
      <div style={styles.container}>
        <AssessmentGenerationConfig
          courseId={courseId}
          isOpen={showConfigPanel}
          onClose={() => setShowConfigPanel(false)}
          onConfirm={handleGenerate}
        />
        <AssessmentDashboard
          courseId={courseId}
          mode="find-mistake"
          onCreateNew={() => setShowConfigPanel(true)}
          onSelectSet={handleSelectSet}
        />
      </div>
    );
  }

  // Show items view
  return (
    <div style={styles.container}>
      <AssessmentGenerationConfig
        courseId={courseId}
        isOpen={showConfigPanel}
        onClose={() => setShowConfigPanel(false)}
        onConfirm={handleGenerate}
      />

      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <button
            onClick={handleBackToDashboard}
            style={styles.backButton}
            aria-label="Back to dashboard"
          >
            ← Back to Dashboard
          </button>
          <h3 style={styles.title}>Find the Mistake</h3>
        </div>
        <div style={styles.headerActions}>
          <button
            onClick={handleGenerateClick}
            disabled={generating}
            style={{
              ...styles.generateButton,
              ...(generating ? styles.buttonDisabled : {}),
            }}
          >
            {generating ? (
              <>
                <span style={styles.spinner}></span>
                Generating...
              </>
            ) : (
              'Generate More'
            )}
          </button>
        </div>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {items.length === 0 && !generating && (
        <div style={styles.empty}>
          <div style={styles.emptyIcon}>🔍</div>
          <h4 style={styles.emptyTitle}>No items yet</h4>
          <p style={styles.emptyText}>
            Click "Generate" to create find-the-mistake assessments based on your course materials.
          </p>
        </div>
      )}

      {currentItem && (
        <div style={styles.content}>
          {/* Navigation controls - show when multiple items */}
          {items.length > 1 && (
            <div style={styles.navigation}>
              <button
                onClick={handlePrevious}
                disabled={currentItemIndex === 0}
                style={{
                  ...styles.navButton,
                  ...(currentItemIndex === 0 ? styles.buttonDisabled : {}),
                }}
              >
                ← Previous
              </button>
              <span style={styles.progressIndicator}>
                Item {currentItemIndex + 1} of {items.length}
              </span>
              <button
                onClick={handleNext}
                disabled={currentItemIndex >= items.length - 1}
                style={{
                  ...styles.navButton,
                  ...(currentItemIndex >= items.length - 1 ? styles.buttonDisabled : {}),
                }}
              >
                Next →
              </button>
            </div>
          )}

          <div style={styles.itemCard}>
            <div style={styles.itemHeader}>
              <span style={styles.itemNumber}>
                Item {currentItemIndex + 1} of {items.length}
              </span>
            </div>

            <div style={styles.prompt}>{currentItem.prompt}</div>

            <div style={styles.incorrectSolutionBox}>
              <strong style={styles.incorrectSolutionTitle}>⚠️ Incorrect Solution:</strong>
              <div style={styles.incorrectSolutionText}>{currentItem.incorrect_solution}</div>
            </div>

            {!isSubmitted && (
              <div style={styles.answerCard}>
                <label style={styles.answerLabel}>Your Answer</label>
                <textarea
                  value={studentAnswer}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                  placeholder="Identify the mistake and explain why it's wrong. Provide the corrected version."
                  style={styles.textarea}
                  rows={8}
                />
                <button
                  onClick={handleSubmit}
                  disabled={!studentAnswer.trim()}
                  style={{
                    ...styles.submitButton,
                    ...(!studentAnswer.trim() ? styles.buttonDisabled : {}),
                  }}
                >
                  Submit Answer
                </button>
              </div>
            )}

            {isSubmitted && (
              <div style={styles.feedbackCard}>
                <div style={styles.feedbackSection}>
                  <h4 style={styles.feedbackTitle}>✓ Expected Correction</h4>
                  <div style={styles.correctionText}>{currentItem.expected_correction}</div>
                </div>

                <div style={styles.feedbackSection}>
                  <h4 style={styles.feedbackTitle}>📚 Explanation</h4>
                  <div style={styles.explanationText}>{currentItem.explanation}</div>
                </div>

                {currentItem.sources.length > 0 && (
                  <div style={styles.sources}>
                    <strong style={styles.sourcesTitle}>📚 Source References:</strong>
                    <div style={styles.sourcesList}>
                      {currentItem.sources.map((ref, idx) => (
                        <span key={idx} style={styles.sourceTag}>
                          {ref.document_name} - Page {ref.page}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  backButton: {
    padding: '0.625rem 1rem',
    background: 'rgba(107, 114, 128, 0.1)',
    color: '#374151',
    border: '1px solid rgba(107, 114, 128, 0.2)',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '600',
    transition: 'all 0.2s',
  },
  headerActions: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'center',
  },
  navigation: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
    padding: '1rem',
    background: 'rgba(102, 126, 234, 0.05)',
    borderRadius: '0.75rem',
    border: '1px solid rgba(102, 126, 234, 0.2)',
  },
  navButton: {
    padding: '0.625rem 1.25rem',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '600',
    transition: 'all 0.2s',
  },
  progressIndicator: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#6b7280',
  },
  title: {
    margin: 0,
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#111827',
  },
  generateButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.875rem 1.75rem',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '0.75rem',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '600',
    transition: 'all 0.2s',
    boxShadow: '0 4px 6px -1px rgba(102, 126, 234, 0.3)',
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  spinner: {
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderTopColor: 'white',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  error: {
    background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
    color: '#dc2626',
    padding: '1rem',
    borderRadius: '0.75rem',
    border: '1px solid #fca5a5',
    fontSize: '0.875rem',
    fontWeight: '500',
  },
  empty: {
    textAlign: 'center',
    padding: '4rem 2rem',
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    borderRadius: '1rem',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  },
  emptyIcon: {
    fontSize: '4rem',
    marginBottom: '1rem',
  },
  emptyTitle: {
    margin: '0 0 0.5rem 0',
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#111827',
  },
  emptyText: {
    margin: 0,
    color: '#6b7280',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  itemCard: {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    padding: '2rem',
    borderRadius: '1rem',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
  },
  itemHeader: {
    marginBottom: '1.5rem',
  },
  itemNumber: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  prompt: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '1.5rem',
    lineHeight: '1.6',
  },
  incorrectSolutionBox: {
    padding: '1.5rem',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '2px solid #ef4444',
    borderRadius: '0.75rem',
    marginBottom: '1.5rem',
  },
  incorrectSolutionTitle: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#dc2626',
    marginBottom: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  incorrectSolutionText: {
    fontSize: '1rem',
    color: '#374151',
    lineHeight: '1.6',
    whiteSpace: 'pre-wrap',
  },
  answerCard: {
    marginTop: '1.5rem',
  },
  answerLabel: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  textarea: {
    width: '100%',
    padding: '1rem',
    border: '2px solid #e5e7eb',
    borderRadius: '0.75rem',
    fontSize: '1rem',
    fontFamily: 'inherit',
    lineHeight: '1.6',
    resize: 'vertical',
    transition: 'all 0.2s',
    background: '#f9fafb',
    marginBottom: '1rem',
  },
  submitButton: {
    padding: '0.75rem 1.5rem',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '0.75rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '600',
    transition: 'all 0.2s',
    boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3)',
  },
  feedbackCard: {
    marginTop: '1.5rem',
    paddingTop: '1.5rem',
    borderTop: '2px solid #e5e7eb',
  },
  feedbackSection: {
    marginBottom: '1.5rem',
  },
  feedbackTitle: {
    margin: '0 0 1rem 0',
    fontSize: '1.125rem',
    fontWeight: '700',
    color: '#111827',
  },
  correctionText: {
    padding: '1rem',
    background: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid #10b981',
    borderRadius: '0.75rem',
    color: '#374151',
    lineHeight: '1.6',
    whiteSpace: 'pre-wrap',
  },
  explanationText: {
    padding: '1rem',
    background: 'rgba(102, 126, 234, 0.05)',
    border: '1px solid rgba(102, 126, 234, 0.2)',
    borderRadius: '0.75rem',
    color: '#374151',
    lineHeight: '1.6',
    whiteSpace: 'pre-wrap',
  },
  sources: {
    marginTop: '1.5rem',
    paddingTop: '1.5rem',
    borderTop: '1px solid #e5e7eb',
  },
  sourcesTitle: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    display: 'block',
    marginBottom: '0.75rem',
  },
  sourcesList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
  },
  sourceTag: {
    display: 'inline-block',
    padding: '0.375rem 0.75rem',
    background: 'rgba(102, 126, 234, 0.1)',
    color: '#667eea',
    borderRadius: '0.5rem',
    fontSize: '0.75rem',
    fontWeight: '500',
  },
};

