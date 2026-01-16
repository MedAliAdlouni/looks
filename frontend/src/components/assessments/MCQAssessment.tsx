import { useState } from 'react';
import { apiClient } from '../../api/client';
import type { MCQ, MCQOption } from '../../types/api';

interface MCQAssessmentProps {
  courseId: string;
}

export default function MCQAssessment({ courseId }: MCQAssessmentProps) {
  const [mcqs, setMcqs] = useState<MCQ[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Set<string>>(new Set());
  const [showHint, setShowHint] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const currentQuestion = mcqs[currentQuestionIndex];

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    try {
      const response = await apiClient.generateMCQs(courseId, {
        num_questions: 1,
      });
      setMcqs(response.mcqs);
      setCurrentQuestionIndex(0);
      setSelectedAnswers(new Set());
      setShowHint(false);
      setSubmitted(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate MCQ');
    } finally {
      setGenerating(false);
    }
  };

  const handleOptionToggle = (optionId: string) => {
    if (submitted) return;
    setSelectedAnswers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(optionId)) {
        newSet.delete(optionId);
      } else {
        newSet.add(optionId);
      }
      return newSet;
    });
  };

  const handleSubmit = () => {
    setSubmitted(true);
  };

  const handleNext = () => {
    if (currentQuestionIndex < mcqs.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswers(new Set());
      setShowHint(false);
      setSubmitted(false);
    }
  };

  const handleNewQuestion = () => {
    handleGenerate();
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Multiple Choice Questions</h3>
        {mcqs.length === 0 ? (
          <button
            onClick={handleGenerate}
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
              'Generate Question'
            )}
          </button>
        ) : (
          <button
            onClick={handleNewQuestion}
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
              'New Question'
            )}
          </button>
        )}
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {mcqs.length === 0 && !generating && (
        <div style={styles.empty}>
          <div style={styles.emptyIcon}>📝</div>
          <h4 style={styles.emptyTitle}>No questions yet</h4>
          <p style={styles.emptyText}>
            Click "Generate Question" to create an MCQ based on your course materials.
          </p>
        </div>
      )}

      {currentQuestion && (
        <div style={styles.questionCard}>
          <div style={styles.questionHeader}>
            <span style={styles.questionNumber}>
              Question {currentQuestionIndex + 1} of {mcqs.length}
            </span>
          </div>

          <div style={styles.questionText}>{currentQuestion.question}</div>

          <div style={styles.optionsContainer}>
            {currentQuestion.options.map((option: MCQOption) => {
              const isSelected = selectedAnswers.has(option.id);
              const showResult = submitted;
              const isCorrect = option.is_correct;
              const isSelectedAndCorrect = isSelected && isCorrect;
              const isSelectedAndIncorrect = isSelected && !isCorrect;
              const isCorrectButNotSelected = !isSelected && isCorrect;

              return (
                <div
                  key={option.id}
                  style={{
                    ...styles.option,
                    ...(isSelected ? styles.optionSelected : {}),
                    ...(showResult && isSelectedAndCorrect ? styles.optionCorrect : {}),
                    ...(showResult && isSelectedAndIncorrect ? styles.optionIncorrect : {}),
                    ...(showResult && isCorrectButNotSelected ? styles.optionMissed : {}),
                    ...(submitted ? styles.optionDisabled : {}),
                  }}
                  onClick={() => handleOptionToggle(option.id)}
                >
                  <div style={styles.optionHeader}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleOptionToggle(option.id)}
                      disabled={submitted}
                      style={styles.checkbox}
                    />
                    <span style={styles.optionLabel}>{option.id}</span>
                    {showResult && (
                      <span style={styles.resultIcon}>
                        {isSelectedAndCorrect && '✓'}
                        {isSelectedAndIncorrect && '✗'}
                        {isCorrectButNotSelected && '✓'}
                      </span>
                    )}
                  </div>
                  <div style={styles.optionText}>{option.text}</div>
                  {showResult && (
                    <div
                      style={{
                        ...styles.justification,
                        ...(isCorrect ? styles.justificationCorrect : styles.justificationIncorrect),
                      }}
                    >
                      <strong>Explanation:</strong> {option.justification}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={styles.actions}>
            <button
              onClick={() => setShowHint(!showHint)}
              disabled={submitted}
              style={{
                ...styles.hintButton,
                ...(showHint ? styles.hintButtonActive : {}),
                ...(submitted ? styles.buttonDisabled : {}),
              }}
            >
              {showHint ? 'Hide Hint' : 'Show Hint'}
            </button>
            {!submitted && (
              <button
                onClick={handleSubmit}
                disabled={selectedAnswers.size === 0}
                style={{
                  ...styles.submitButton,
                  ...(selectedAnswers.size === 0 ? styles.buttonDisabled : {}),
                }}
              >
                Submit Answer
              </button>
            )}
            {submitted && currentQuestionIndex < mcqs.length - 1 && (
              <button onClick={handleNext} style={styles.nextButton}>
                Next Question →
              </button>
            )}
          </div>

          {showHint && (
            <div style={styles.hintBox}>
              <strong>💡 Hint:</strong> {currentQuestion.hint}
            </div>
          )}

          {submitted && currentQuestion.source_references.length > 0 && (
            <div style={styles.sources}>
              <strong style={styles.sourcesTitle}>📚 Source References:</strong>
              <div style={styles.sourcesList}>
                {currentQuestion.source_references.map((ref, idx) => (
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
  questionNumber: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
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
  checkbox: {
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
  justification: {
    marginTop: '0.75rem',
    padding: '0.75rem',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    lineHeight: '1.6',
  },
  justificationCorrect: {
    background: 'rgba(16, 185, 129, 0.1)',
    color: '#059669',
  },
  justificationIncorrect: {
    background: 'rgba(239, 68, 68, 0.1)',
    color: '#dc2626',
  },
  actions: {
    display: 'flex',
    gap: '0.75rem',
    marginTop: '1.5rem',
  },
  hintButton: {
    padding: '0.75rem 1.5rem',
    background: 'rgba(102, 126, 234, 0.1)',
    color: '#667eea',
    border: '2px solid #667eea',
    borderRadius: '0.75rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '600',
    transition: 'all 0.2s',
  },
  hintButtonActive: {
    background: '#667eea',
    color: 'white',
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
  nextButton: {
    padding: '0.75rem 1.5rem',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '0.75rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '600',
    transition: 'all 0.2s',
    boxShadow: '0 4px 6px -1px rgba(102, 126, 234, 0.3)',
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

