import { useState } from 'react';
import { apiClient } from '../api/client';
import type { OpenEndedQuestionResponse, OpenEndedEvaluationResponse } from '../types/api';

interface OpenEndedAssessmentProps {
  courseId: string;
}

export default function OpenEndedAssessment({ courseId }: OpenEndedAssessmentProps) {
  const [question, setQuestion] = useState<OpenEndedQuestionResponse | null>(null);
  const [studentAnswer, setStudentAnswer] = useState('');
  const [evaluation, setEvaluation] = useState<OpenEndedEvaluationResponse | null>(null);
  const [generating, setGenerating] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    try {
      const response = await apiClient.generateOpenEndedQuestion(courseId, {});
      setQuestion(response);
      setStudentAnswer('');
      setEvaluation(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate question');
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async () => {
    if (!question || !studentAnswer.trim()) return;

    setEvaluating(true);
    setError('');
    try {
      const response = await apiClient.evaluateOpenEndedAnswer(courseId, {
        question: question.question,
        student_answer: studentAnswer,
      });
      setEvaluation(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to evaluate answer');
    } finally {
      setEvaluating(false);
    }
  };

  const handleNewQuestion = () => {
    handleGenerate();
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Open-Ended Questions</h3>
        {!question ? (
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

      {!question && !generating && (
        <div style={styles.empty}>
          <div style={styles.emptyIcon}>✍️</div>
          <h4 style={styles.emptyTitle}>No question yet</h4>
          <p style={styles.emptyText}>
            Click "Generate Question" to create an open-ended question based on your course materials.
          </p>
        </div>
      )}

      {question && (
        <div style={styles.content}>
          <div style={styles.questionCard}>
            <div style={styles.questionHeader}>
              <span style={styles.questionLabel}>Question</span>
            </div>
            <div style={styles.questionText}>{question.question}</div>
            {question.source_references.length > 0 && (
              <div style={styles.sources}>
                <strong style={styles.sourcesTitle}>📚 Source References:</strong>
                <div style={styles.sourcesList}>
                  {question.source_references.map((ref, idx) => (
                    <span key={idx} style={styles.sourceTag}>
                      {ref.document_name} - Page {ref.page}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={styles.answerCard}>
            <div style={styles.answerHeader}>
              <label style={styles.answerLabel}>Your Answer</label>
            </div>
            <textarea
              value={studentAnswer}
              onChange={(e) => setStudentAnswer(e.target.value)}
              placeholder="Type your answer here..."
              disabled={!!evaluation}
              style={styles.textarea}
              rows={8}
            />
            {!evaluation && (
              <button
                onClick={handleSubmit}
                disabled={!studentAnswer.trim() || evaluating}
                style={{
                  ...styles.submitButton,
                  ...((!studentAnswer.trim() || evaluating) ? styles.buttonDisabled : {}),
                }}
              >
                {evaluating ? (
                  <>
                    <span style={styles.spinner}></span>
                    Evaluating...
                  </>
                ) : (
                  'Submit Answer'
                )}
              </button>
            )}
          </div>

          {evaluation && (
            <div style={styles.evaluationCard}>
              <div style={styles.evaluationSection}>
                <h4 style={styles.evaluationTitle}>📖 Reference Answer</h4>
                <div style={styles.referenceAnswer}>{evaluation.reference_answer}</div>
              </div>

              <div style={styles.evaluationSection}>
                <h4 style={styles.evaluationTitle}>📊 Evaluation</h4>
                <div style={styles.scoreExplanation}>{evaluation.evaluation.score_explanation}</div>

                {evaluation.evaluation.correct_aspects.length > 0 && (
                  <div style={styles.aspectsList}>
                    <strong style={styles.aspectsTitleCorrect}>✓ What you got right:</strong>
                    <ul style={styles.aspectsListItems}>
                      {evaluation.evaluation.correct_aspects.map((aspect, idx) => (
                        <li key={idx}>{aspect}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {evaluation.evaluation.missing_aspects.length > 0 && (
                  <div style={styles.aspectsList}>
                    <strong style={styles.aspectsTitleMissing}>⚠️ What you missed:</strong>
                    <ul style={styles.aspectsListItems}>
                      {evaluation.evaluation.missing_aspects.map((aspect, idx) => (
                        <li key={idx}>{aspect}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {evaluation.evaluation.incorrect_aspects.length > 0 && (
                  <div style={styles.aspectsList}>
                    <strong style={styles.aspectsTitleIncorrect}>✗ What was incorrect:</strong>
                    <ul style={styles.aspectsListItems}>
                      {evaluation.evaluation.incorrect_aspects.map((aspect, idx) => (
                        <li key={idx}>{aspect}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div style={styles.evaluationSection}>
                <h4 style={styles.evaluationTitle}>💬 Feedback</h4>
                <div style={styles.feedback}>{evaluation.feedback}</div>
              </div>

              {evaluation.source_references.length > 0 && (
                <div style={styles.sources}>
                  <strong style={styles.sourcesTitle}>📚 Source References:</strong>
                  <div style={styles.sourcesList}>
                    {evaluation.source_references.map((ref, idx) => (
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
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
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
    marginBottom: '1rem',
  },
  questionLabel: {
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
    lineHeight: '1.6',
    marginBottom: '1rem',
  },
  answerCard: {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    padding: '2rem',
    borderRadius: '1rem',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
  },
  answerHeader: {
    marginBottom: '1rem',
  },
  answerLabel: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#6b7280',
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
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.875rem 1.75rem',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '0.75rem',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '600',
    transition: 'all 0.2s',
    boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3)',
  },
  evaluationCard: {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    padding: '2rem',
    borderRadius: '1rem',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
  },
  evaluationSection: {
    marginBottom: '2rem',
  },
  evaluationTitle: {
    margin: '0 0 1rem 0',
    fontSize: '1.125rem',
    fontWeight: '700',
    color: '#111827',
  },
  referenceAnswer: {
    padding: '1rem',
    background: 'rgba(102, 126, 234, 0.05)',
    border: '1px solid rgba(102, 126, 234, 0.2)',
    borderRadius: '0.75rem',
    color: '#374151',
    lineHeight: '1.6',
    whiteSpace: 'pre-wrap',
  },
  scoreExplanation: {
    padding: '1rem',
    background: 'rgba(59, 130, 246, 0.05)',
    border: '1px solid rgba(59, 130, 246, 0.2)',
    borderRadius: '0.75rem',
    color: '#1e40af',
    lineHeight: '1.6',
    marginBottom: '1rem',
    fontWeight: '500',
  },
  aspectsList: {
    marginTop: '1rem',
  },
  aspectsTitleCorrect: {
    display: 'block',
    color: '#059669',
    marginBottom: '0.5rem',
    fontSize: '0.875rem',
  },
  aspectsTitleMissing: {
    display: 'block',
    color: '#d97706',
    marginBottom: '0.5rem',
    fontSize: '0.875rem',
  },
  aspectsTitleIncorrect: {
    display: 'block',
    color: '#dc2626',
    marginBottom: '0.5rem',
    fontSize: '0.875rem',
  },
  aspectsListItems: {
    margin: '0.5rem 0 0 1.5rem',
    padding: 0,
    listStyle: 'disc',
    color: '#374151',
    lineHeight: '1.8',
  },
  feedback: {
    padding: '1rem',
    background: 'rgba(245, 158, 11, 0.05)',
    border: '1px solid rgba(245, 158, 11, 0.2)',
    borderRadius: '0.75rem',
    color: '#92400e',
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

