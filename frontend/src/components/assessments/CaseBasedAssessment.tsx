import { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import type { CaseBasedResponse, CaseBasedQuestion, CaseBasedMCQ, CaseBasedOpenEnded } from '../../types/api';
import { AssessmentGenerationConfig, type AssessmentGenerationConfigData } from './AssessmentGenerationConfig';
import { AssessmentDashboard } from './AssessmentDashboard';
import { 
  loadQuestionSet,
  saveQuestionSet,
  type PersistedCaseBasedState 
} from '../../utils/assessmentPersistence';

interface CaseBasedAssessmentProps {
  courseId: string;
}

export default function CaseBasedAssessment({ courseId }: CaseBasedAssessmentProps) {
  const [showDashboard, setShowDashboard] = useState(true);
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [cases, setCases] = useState<CaseBasedResponse[]>([]);
  const [currentCaseIndex, setCurrentCaseIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  
  // Answers for each case's questions: [caseIndex][questionIndex]
  const [mcqAnswers, setMcqAnswers] = useState<Array<Array<number | null>>>([]);
  const [openEndedAnswers, setOpenEndedAnswers] = useState<Array<Array<string>>>([]);
  
  // Submitted state for each case's questions
  const [submittedQuestions, setSubmittedQuestions] = useState<Array<Set<number>>>([]);
  
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [generationConfig, setGenerationConfig] = useState<AssessmentGenerationConfigData | null>(null);

  const currentCase = cases[currentCaseIndex];
  const currentQuestion = currentCase?.questions[currentQuestionIndex];
  const isSubmitted = currentCase && submittedQuestions[currentCaseIndex]?.has(currentQuestionIndex);

  // Load question set when selected
  const handleSelectSet = (setId: string) => {
    const persisted = loadQuestionSet(courseId, 'case-based', setId);
    if (persisted) {
      const state = persisted as PersistedCaseBasedState;
      setCases(state.cases);
      setCurrentCaseIndex(state.currentCaseIndex || 0);
      setCurrentQuestionIndex(state.currentQuestionIndex || 0);
      setMcqAnswers(state.mcqAnswers || []);
      setOpenEndedAnswers(state.openEndedAnswers || []);
      // submittedQuestions is deserialized to Array<Set<number>> by loadQuestionSet
      // Handle both cases: if loadQuestionSet converted it already, or if it's still Array<number[]>
      const deserializedSubmittedQuestions = (state.submittedQuestions || []).map((item: any) => {
        if (item instanceof Set) {
          return item;
        } else if (Array.isArray(item)) {
          return new Set(item as number[]);
        }
        return new Set();
      });
      setSubmittedQuestions(deserializedSubmittedQuestions);
      setGenerationConfig(state.generationConfig);
      setSelectedSetId(setId);
      setShowDashboard(false);
    }
  };

  // Save state whenever it changes
  useEffect(() => {
    if (cases.length > 0 && selectedSetId) {
      const state: PersistedCaseBasedState = {
        cases,
        currentCaseIndex,
        currentQuestionIndex,
        mcqAnswers,
        openEndedAnswers,
        submittedQuestions: submittedQuestions.map((set: Set<number>) => Array.from(set)),
        generationConfig,
      };
      saveQuestionSet(courseId, 'case-based', selectedSetId, state);
    }
  }, [courseId, selectedSetId, cases, currentCaseIndex, currentQuestionIndex, mcqAnswers, openEndedAnswers, submittedQuestions, generationConfig]);

  const handleGenerateClick = () => {
    setShowConfigPanel(true);
  };

  const handleGenerate = async (config: AssessmentGenerationConfigData) => {
    setGenerating(true);
    setError('');
    try {
      const response = await apiClient.generateCaseBased(courseId, {
        num_questions: config.numQuestions,
        document_ids: config.selectedDocuments.length > 0 ? config.selectedDocuments : undefined,
        difficulty: config.difficulty,
      });
      
      setCases(response.cases);
      setCurrentCaseIndex(0);
      setCurrentQuestionIndex(0);
      
      // Initialize answer arrays for all cases
      const newMcqAnswers: Array<Array<number | null>> = [];
      const newOpenEndedAnswers: Array<Array<string>> = [];
      const newSubmittedQuestions: Array<Set<number>> = [];
      
      response.cases.forEach((caseItem) => {
        const caseMcqAnswers: Array<number | null> = [];
        const caseOpenEndedAnswers: Array<string> = [];
        caseItem.questions.forEach((q) => {
          if (q.kind === 'mcq') {
            caseMcqAnswers.push(null);
          } else {
            caseOpenEndedAnswers.push('');
          }
        });
        newMcqAnswers.push(caseMcqAnswers);
        newOpenEndedAnswers.push(caseOpenEndedAnswers);
        newSubmittedQuestions.push(new Set());
      });
      
      // Generate title from config
      const title = `Case-Based Assessment - ${config.numQuestions} cases${config.difficulty ? ` (${config.difficulty})` : ''}`;
      const newSetId = `case-based-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Create new set - convert Sets to arrays for persistence
      const state: PersistedCaseBasedState = {
        cases: response.cases,
        currentCaseIndex: 0,
        currentQuestionIndex: 0,
        mcqAnswers: newMcqAnswers,
        openEndedAnswers: newOpenEndedAnswers,
        submittedQuestions: newSubmittedQuestions.map(set => Array.from(set)),
        generationConfig: config,
      };
      
      saveQuestionSet(courseId, 'case-based', newSetId, state, title);
      
      setMcqAnswers(newMcqAnswers);
      setOpenEndedAnswers(newOpenEndedAnswers);
      setSubmittedQuestions(newSubmittedQuestions);
      setGenerationConfig(config);
      setSelectedSetId(newSetId);
      setShowDashboard(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate case-based assessment');
    } finally {
      setGenerating(false);
    }
  };

  const handleBackToDashboard = () => {
    setShowDashboard(true);
    setSelectedSetId(null);
  };

  const handleMCQSelect = (optionIndex: number) => {
    if (isSubmitted || !currentCase) return;
    const newMcqAnswers = [...mcqAnswers];
    if (!newMcqAnswers[currentCaseIndex]) {
      newMcqAnswers[currentCaseIndex] = [];
    }
    newMcqAnswers[currentCaseIndex][currentQuestionIndex] = optionIndex;
    setMcqAnswers(newMcqAnswers);
  };

  const handleOpenEndedChange = (value: string) => {
    if (!currentCase) return;
    const newOpenEndedAnswers = [...openEndedAnswers];
    if (!newOpenEndedAnswers[currentCaseIndex]) {
      newOpenEndedAnswers[currentCaseIndex] = [];
    }
    newOpenEndedAnswers[currentCaseIndex][currentQuestionIndex] = value;
    setOpenEndedAnswers(newOpenEndedAnswers);
  };

  const handleSubmit = () => {
    if (!currentCase) return;
    
    const newSubmittedQuestions = [...submittedQuestions];
    if (!newSubmittedQuestions[currentCaseIndex]) {
      newSubmittedQuestions[currentCaseIndex] = new Set();
    }
    newSubmittedQuestions[currentCaseIndex] = new Set(newSubmittedQuestions[currentCaseIndex]).add(currentQuestionIndex);
    setSubmittedQuestions(newSubmittedQuestions);
    
    // Auto-advance to next question if available
    if (currentQuestionIndex < currentCase.questions.length - 1) {
      setTimeout(() => {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      }, 2000);
    } else if (currentCaseIndex < cases.length - 1) {
      // Move to next case
      setTimeout(() => {
        setCurrentCaseIndex(currentCaseIndex + 1);
        setCurrentQuestionIndex(0);
      }, 2000);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    } else if (currentCaseIndex > 0) {
      const prevCase = cases[currentCaseIndex - 1];
      setCurrentCaseIndex(currentCaseIndex - 1);
      setCurrentQuestionIndex(prevCase.questions.length - 1);
    }
  };

  const handleNextQuestion = () => {
    if (!currentCase) return;
    if (currentQuestionIndex < currentCase.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else if (currentCaseIndex < cases.length - 1) {
      setCurrentCaseIndex(currentCaseIndex + 1);
      setCurrentQuestionIndex(0);
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
          mode="case-based"
          onCreateNew={() => setShowConfigPanel(true)}
          onSelectSet={handleSelectSet}
        />
      </div>
    );
  }

  // Show cases view
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
          <h3 style={styles.title}>Case-Based Assessment</h3>
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

      {cases.length === 0 && !generating && (
        <div style={styles.empty}>
          <div style={styles.emptyIcon}>📋</div>
          <h4 style={styles.emptyTitle}>No cases yet</h4>
          <p style={styles.emptyText}>
            Click "Generate" to create case-based assessments based on your course materials.
          </p>
        </div>
      )}

      {currentCase && currentQuestion && (
        <div style={styles.content}>
          {/* Case Info Card */}
          <div style={styles.caseCard}>
            <div style={styles.caseHeader}>
              <span style={styles.caseLabel}>
                Case {currentCaseIndex + 1} of {cases.length}
              </span>
            </div>
            <h2 style={styles.caseTitle}>{currentCase.case_title}</h2>
            <div style={styles.caseDescription}>{currentCase.case_description}</div>
          </div>

          {/* Question Navigation */}
          {(currentCase.questions.length > 1 || cases.length > 1) && (
            <div style={styles.navigation}>
              <button
                onClick={handlePreviousQuestion}
                disabled={currentCaseIndex === 0 && currentQuestionIndex === 0}
                style={{
                  ...styles.navButton,
                  ...((currentCaseIndex === 0 && currentQuestionIndex === 0) ? styles.buttonDisabled : {}),
                }}
              >
                ← Previous
              </button>
              <span style={styles.progressIndicator}>
                Case {currentCaseIndex + 1}, Question {currentQuestionIndex + 1} of {currentCase.questions.length}
              </span>
              <button
                onClick={handleNextQuestion}
                disabled={currentCaseIndex >= cases.length - 1 && currentQuestionIndex >= currentCase.questions.length - 1}
                style={{
                  ...styles.navButton,
                  ...((currentCaseIndex >= cases.length - 1 && currentQuestionIndex >= currentCase.questions.length - 1) ? styles.buttonDisabled : {}),
                }}
              >
                Next →
              </button>
            </div>
          )}

          {/* Question Card */}
          <div style={styles.questionCard}>
            <div style={styles.questionHeader}>
              <span style={styles.questionLabel}>
                Question {currentQuestionIndex + 1} of {currentCase.questions.length}
              </span>
              {currentQuestion.kind === 'mcq' && (
                <span style={styles.questionType}>Multiple Choice</span>
              )}
              {currentQuestion.kind === 'open_ended' && (
                <span style={styles.questionType}>Open-Ended</span>
              )}
            </div>

            {currentQuestion.kind === 'mcq' && (
              <div>
                <div style={styles.questionText}>{(currentQuestion as CaseBasedMCQ).question}</div>
                
                <div style={styles.optionsContainer}>
                  {(currentQuestion as CaseBasedMCQ).options.map((option, idx) => {
                    const isSelected = mcqAnswers[currentCaseIndex]?.[currentQuestionIndex] === idx;
                    const showResult = isSubmitted;
                    const isCorrect = idx === (currentQuestion as CaseBasedMCQ).answer_index;
                    const isSelectedAndCorrect = isSelected && isCorrect;
                    const isSelectedAndIncorrect = isSelected && !isCorrect;

                    return (
                      <div
                        key={idx}
                        style={{
                          ...styles.option,
                          ...(isSelected ? styles.optionSelected : {}),
                          ...(showResult && isSelectedAndCorrect ? styles.optionCorrect : {}),
                          ...(showResult && isSelectedAndIncorrect ? styles.optionIncorrect : {}),
                          ...(showResult && isCorrect && !isSelected ? styles.optionMissed : {}),
                          ...(isSubmitted ? styles.optionDisabled : {}),
                        }}
                        onClick={() => handleMCQSelect(idx)}
                      >
                        <div style={styles.optionHeader}>
                          <input
                            type="radio"
                            checked={isSelected}
                            onChange={() => handleMCQSelect(idx)}
                            disabled={isSubmitted}
                            style={styles.radio}
                          />
                          <span style={styles.optionLabel}>{String.fromCharCode(65 + idx)}</span>
                          {showResult && (
                            <span style={styles.resultIcon}>
                              {isSelectedAndCorrect && '✓'}
                              {isSelectedAndIncorrect && '✗'}
                              {isCorrect && !isSelected && '✓'}
                            </span>
                          )}
                        </div>
                        <div style={styles.optionText}>{option}</div>
                      </div>
                    );
                  })}
                </div>

                {!isSubmitted && (
                  <button
                    onClick={handleSubmit}
                    disabled={mcqAnswers[currentCaseIndex]?.[currentQuestionIndex] === null || mcqAnswers[currentCaseIndex]?.[currentQuestionIndex] === undefined}
                    style={{
                      ...styles.submitButton,
                      ...((mcqAnswers[currentCaseIndex]?.[currentQuestionIndex] === null || mcqAnswers[currentCaseIndex]?.[currentQuestionIndex] === undefined) ? styles.buttonDisabled : {}),
                    }}
                  >
                    Submit Answer
                  </button>
                )}

                {isSubmitted && (currentQuestion as CaseBasedMCQ).hint && (
                  <div style={styles.hintBox}>
                    <strong>💡 Hint:</strong> {(currentQuestion as CaseBasedMCQ).hint}
                  </div>
                )}
              </div>
            )}

            {currentQuestion.kind === 'open_ended' && (
              <div>
                <div style={styles.questionText}>{(currentQuestion as CaseBasedOpenEnded).question}</div>
                
                {!isSubmitted && (
                  <div style={styles.answerCard}>
                    <label style={styles.answerLabel}>Your Answer</label>
                    <textarea
                      value={openEndedAnswers[currentCaseIndex]?.[currentQuestionIndex] || ''}
                      onChange={(e) => handleOpenEndedChange(e.target.value)}
                      placeholder="Type your answer here..."
                      style={styles.textarea}
                      rows={8}
                    />
                    <button
                      onClick={handleSubmit}
                      disabled={!openEndedAnswers[currentCaseIndex]?.[currentQuestionIndex]?.trim()}
                      style={{
                        ...styles.submitButton,
                        ...(!openEndedAnswers[currentCaseIndex]?.[currentQuestionIndex]?.trim() ? styles.buttonDisabled : {}),
                      }}
                    >
                      Submit Answer
                    </button>
                  </div>
                )}

                {isSubmitted && (
                  <div style={styles.feedbackCard}>
                    <div style={styles.feedbackSection}>
                      <h4 style={styles.feedbackTitle}>📖 Expected Answer</h4>
                      <div style={styles.expectedAnswer}>{(currentQuestion as CaseBasedOpenEnded).expected_answer}</div>
                    </div>

                    {(currentQuestion as CaseBasedOpenEnded).rubric.length > 0 && (
                      <div style={styles.feedbackSection}>
                        <h4 style={styles.feedbackTitle}>📋 Rubric</h4>
                        <ul style={styles.rubricList}>
                          {(currentQuestion as CaseBasedOpenEnded).rubric.map((point, idx) => (
                            <li key={idx} style={styles.rubricItem}>{point}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Sources */}
            {currentQuestion.sources.length > 0 && (
              <div style={styles.sources}>
                <strong style={styles.sourcesTitle}>📚 Source References:</strong>
                <div style={styles.sourcesList}>
                  {currentQuestion.sources.map((ref, idx) => (
                    <span key={idx} style={styles.sourceTag}>
                      {ref.document_name} - Page {ref.page}
                    </span>
                  ))}
                </div>
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
  caseCard: {
    background: 'rgba(102, 126, 234, 0.05)',
    backdropFilter: 'blur(10px)',
    padding: '2rem',
    borderRadius: '1rem',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    border: '1px solid rgba(102, 126, 234, 0.2)',
  },
  caseHeader: {
    marginBottom: '1rem',
  },
  caseLabel: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#667eea',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  caseTitle: {
    margin: '0 0 1rem 0',
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#111827',
  },
  caseDescription: {
    fontSize: '1rem',
    color: '#374151',
    lineHeight: '1.6',
    whiteSpace: 'pre-wrap',
  },
  questionCard: {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    padding: '2rem',
    borderRadius: '1rem',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
  },
  questionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
  },
  questionLabel: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  questionType: {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#667eea',
    background: 'rgba(102, 126, 234, 0.1)',
    padding: '0.25rem 0.75rem',
    borderRadius: '0.375rem',
  },
  questionText: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '1.5rem',
    lineHeight: '1.6',
  },
  optionsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  option: {
    padding: '1.25rem',
    border: '2px solid #e5e7eb',
    borderRadius: '0.75rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
    background: 'white',
  },
  optionSelected: {
    borderColor: '#667eea',
    background: 'rgba(102, 126, 234, 0.05)',
  },
  optionCorrect: {
    borderColor: '#10b981',
    background: 'rgba(16, 185, 129, 0.1)',
  },
  optionIncorrect: {
    borderColor: '#ef4444',
    background: 'rgba(239, 68, 68, 0.1)',
  },
  optionMissed: {
    borderColor: '#10b981',
    background: 'rgba(16, 185, 129, 0.05)',
    borderStyle: 'dashed',
  },
  optionDisabled: {
    cursor: 'default',
  },
  optionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '0.5rem',
  },
  radio: {
    width: '20px',
    height: '20px',
    cursor: 'pointer',
  },
  optionLabel: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  resultIcon: {
    fontSize: '1.25rem',
    fontWeight: 'bold',
  },
  optionText: {
    fontSize: '1rem',
    color: '#374151',
    lineHeight: '1.6',
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
  hintBox: {
    marginTop: '1.5rem',
    padding: '1rem',
    background: 'rgba(245, 158, 11, 0.1)',
    border: '1px solid #f59e0b',
    borderRadius: '0.75rem',
    color: '#92400e',
    fontSize: '0.875rem',
    lineHeight: '1.6',
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
  expectedAnswer: {
    padding: '1rem',
    background: 'rgba(102, 126, 234, 0.05)',
    border: '1px solid rgba(102, 126, 234, 0.2)',
    borderRadius: '0.75rem',
    color: '#374151',
    lineHeight: '1.6',
    whiteSpace: 'pre-wrap',
  },
  rubricList: {
    margin: 0,
    paddingLeft: '1.5rem',
    listStyle: 'disc',
    color: '#374151',
    lineHeight: '1.8',
  },
  rubricItem: {
    marginBottom: '0.5rem',
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

