/**
 * Assessment Persistence Utility
 * Handles saving and loading assessment state to/from localStorage
 * Now supports multiple question sets per course/mode
 */

export interface QuestionSetMetadata {
  id: string;
  title: string;
  createdAt: string;
  numQuestions: number;
  numDocuments: number;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface PersistedMCQState {
  questions: Array<{
    question: string;
    options: Array<{
      id: string;
      text: string;
      is_correct: boolean;
      justification: string;
    }>;
    hint: string;
    source_references: Array<{
      document_id: string;
      document_name: string;
      page: number;
    }>;
  }>;
  currentIndex: number;
  submittedAnswers: Array<Set<string>>; // Array of selected answer IDs per question
  submittedQuestions: Set<number>; // Which question indices have been submitted
  generationConfig: {
    numQuestions: number;
    selectedDocuments: string[];
    difficulty: 'easy' | 'medium' | 'hard';
  } | null;
  metadata?: QuestionSetMetadata;
}

export interface PersistedOpenEndedState {
  questions: Array<{
    question: string;
    source_references: Array<{
      document_id: string;
      document_name: string;
      page: number;
    }>;
  }>;
  currentIndex: number;
  answers: Array<string>; // Array of student answers per question
  submittedQuestions: Set<number>; // Which question indices have been submitted
  evaluations: Array<any>; // Array of evaluation responses per question
  generationConfig: {
    numQuestions: number;
    selectedDocuments: string[];
    difficulty: 'easy' | 'medium' | 'hard';
  } | null;
  metadata?: QuestionSetMetadata;
}

export interface PersistedFindMistakeState {
  items: Array<{
    type: 'find_mistake';
    id: string;
    prompt: string;
    incorrect_solution: string;
    expected_correction: string;
    explanation: string;
    sources: Array<{
      document_id: string;
      document_name: string;
      page: number;
    }>;
  }>;
  currentIndex: number;
  answers: Array<string>; // Array of student answers per item
  submittedItems: Set<number>; // Which item indices have been submitted
  generationConfig: {
    numQuestions: number;
    selectedDocuments: string[];
    difficulty: 'easy' | 'medium' | 'hard';
  } | null;
  metadata?: QuestionSetMetadata;
}

export interface PersistedCaseBasedState {
  cases: Array<{
    type: 'case_based';
    id: string;
    case_title: string;
    case_description: string;
    questions: Array<{
      kind: 'mcq' | 'open_ended';
      question: string;
      sources: Array<{
        document_id: string;
        document_name: string;
        page: number;
      }>;
      // MCQ fields
      options?: string[];
      answer_index?: number;
      hint?: string;
      // Open-ended fields
      expected_answer?: string;
      rubric?: string[];
    }>;
    sources: Array<{
      document_id: string;
      document_name: string;
      page: number;
    }>;
  }>;
  currentCaseIndex: number;
  currentQuestionIndex: number;
  mcqAnswers: Array<Array<number | null>>; // [caseIndex][questionIndex]
  openEndedAnswers: Array<Array<string>>; // [caseIndex][questionIndex]
  submittedQuestions: Array<number[]>; // [caseIndex] = Array of submitted question indices (serialized from Set)
  generationConfig: {
    numQuestions: number;
    selectedDocuments: string[];
    difficulty: 'easy' | 'medium' | 'hard';
  } | null;
  metadata?: QuestionSetMetadata;
}

export type AssessmentMode = 'mcq' | 'open-ended' | 'find-mistake' | 'case-based';

export type PersistedAssessmentState = 
  | PersistedMCQState 
  | PersistedOpenEndedState 
  | PersistedFindMistakeState 
  | PersistedCaseBasedState;

export interface QuestionSet {
  id: string;
  metadata: QuestionSetMetadata;
  data: Omit<PersistedAssessmentState, 'metadata'>;
}

const STORAGE_PREFIX = 'assessment_';
const SETS_STORAGE_PREFIX = 'assessment_sets_';

function getStorageKey(courseId: string, mode: AssessmentMode): string {
  return `${STORAGE_PREFIX}${courseId}_${mode}`;
}

function getSetsStorageKey(courseId: string, mode: AssessmentMode): string {
  return `${SETS_STORAGE_PREFIX}${courseId}_${mode}`;
}

// Generate unique ID for question sets
function generateSetId(): string {
  return `set_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// List all question sets for a course/mode
export function listQuestionSets(
  courseId: string,
  mode: AssessmentMode
): QuestionSetMetadata[] {
  try {
    const key = getSetsStorageKey(courseId, mode);
    const stored = localStorage.getItem(key);
    if (!stored) return [];
    
    const sets: QuestionSet[] = JSON.parse(stored);
    return sets.map(set => set.metadata).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error) {
    console.error('Failed to list question sets:', error);
    return [];
  }
}

// Save a question set
export function saveQuestionSet(
  courseId: string,
  mode: AssessmentMode,
  setId: string,
  state: PersistedAssessmentState,
  title?: string
): void {
  try {
    const setsKey = getSetsStorageKey(courseId, mode);
    const existingSets = listQuestionSetsData(courseId, mode);
    
    // Extract or create metadata
    let numQuestions = 0;
    if ('questions' in state) {
      numQuestions = state.questions.length;
    } else if ('items' in state) {
      numQuestions = state.items.length;
    } else if ('cases' in state) {
      numQuestions = state.cases.length;
    }
    
    const metadata: QuestionSetMetadata = state.metadata || {
      id: setId,
      title: title || `Assessment ${new Date().toLocaleDateString()}`,
      createdAt: new Date().toISOString(),
      numQuestions,
      numDocuments: state.generationConfig?.selectedDocuments.length || 0,
      difficulty: state.generationConfig?.difficulty,
    };
    
    const questionSet: QuestionSet = {
      id: setId,
      metadata: {
        ...metadata,
        id: setId,
      },
      data: { ...state, metadata: undefined } as any,
    };
    
    // Remove old set if exists, add new one
    const filteredSets = existingSets.filter(s => s.id !== setId);
    filteredSets.push(questionSet);
    
    // Serialize Sets properly
    const serializedSets = filteredSets.map(set => {
      const data: any = { ...set.data };
      
      // Handle submittedAnswers (Array<Set<string>>)
      if ('submittedAnswers' in set.data) {
        data.submittedAnswers = (set.data.submittedAnswers as any[]).map((arr: string[] | Set<string>) => 
          Array.isArray(arr) ? arr : Array.from(arr)
        );
      }
      
      // Handle submittedQuestions (Set<number> for MCQ/OpenEnded, Array<Set<number>> for CaseBased)
      if ('submittedQuestions' in set.data) {
        const subQ = set.data.submittedQuestions;
        // Check if it's an array (case-based) or a single Set (mcq/open-ended)
        if (Array.isArray(subQ)) {
          // Case-based: Array<Set<number>> -> Array<number[]>
          data.submittedQuestions = (subQ as Array<Set<number> | number[]>).map((item: Set<number> | number[]) =>
            Array.isArray(item) ? item : Array.from(item)
          );
        } else {
          // MCQ/Open-ended: Set<number> -> number[]
          data.submittedQuestions = Array.from(subQ as Set<number>);
        }
      }
      
      // Handle submittedItems (Set<number> for FindMistake)
      if ('submittedItems' in set.data) {
        data.submittedItems = Array.from(set.data.submittedItems as Set<number>);
      }
      
      return { ...set, data };
    });
    
    localStorage.setItem(setsKey, JSON.stringify(serializedSets));
  } catch (error) {
    console.error('Failed to save question set:', error);
  }
}

// Load a specific question set
export function loadQuestionSet(
  courseId: string,
  mode: AssessmentMode,
  setId: string
): PersistedAssessmentState | null {
  try {
    const setsKey = getSetsStorageKey(courseId, mode);
    const stored = localStorage.getItem(setsKey);
    if (!stored) return null;
    
    const sets: QuestionSet[] = JSON.parse(stored);
    const set = sets.find(s => s.id === setId);
    if (!set) return null;
    
    // Deserialize Sets
    const data: any = { ...set.data };
    
    // Handle submittedAnswers (Array<Set<string>>)
    if ('submittedAnswers' in set.data && Array.isArray(set.data.submittedAnswers)) {
      data.submittedAnswers = set.data.submittedAnswers.map((arr: string[]) => new Set(arr));
    }
    
    // Handle submittedQuestions - check data structure to determine type
    if ('submittedQuestions' in set.data) {
      const subQ = set.data.submittedQuestions;
      // Check if it's case-based by looking for 'cases' in data
      if ('cases' in set.data) {
        // Case-based: Array<number[]> -> Array<Set<number>>
        data.submittedQuestions = Array.isArray(subQ) && (subQ.length === 0 || Array.isArray(subQ[0]))
          ? (subQ as number[][]).map((arr: number[]) => new Set(arr))
          : [];
      } else {
        // MCQ/Open-ended: number[] -> Set<number>
        data.submittedQuestions = Array.isArray(subQ)
          ? new Set(subQ as number[])
          : new Set();
      }
    }
    
    // Handle submittedItems (Set<number> for FindMistake)
    if ('submittedItems' in set.data && Array.isArray(set.data.submittedItems)) {
      data.submittedItems = new Set(set.data.submittedItems as number[]);
    }
    
    data.metadata = set.metadata;
    
    return data as PersistedAssessmentState;
  } catch (error) {
    console.error('Failed to load question set:', error);
    return null;
  }
}

// Delete a question set
export function deleteQuestionSet(
  courseId: string,
  mode: AssessmentMode,
  setId: string
): void {
  try {
    const setsKey = getSetsStorageKey(courseId, mode);
    const existingSets = listQuestionSetsData(courseId, mode);
    const filteredSets = existingSets.filter(s => s.id !== setId);
    localStorage.setItem(setsKey, JSON.stringify(filteredSets));
  } catch (error) {
    console.error('Failed to delete question set:', error);
  }
}

// Rename a question set
export function renameQuestionSet(
  courseId: string,
  mode: AssessmentMode,
  setId: string,
  newTitle: string
): void {
  try {
    const setsKey = getSetsStorageKey(courseId, mode);
    const existingSets = listQuestionSetsData(courseId, mode);
    const setIndex = existingSets.findIndex(s => s.id === setId);
    if (setIndex >= 0) {
      existingSets[setIndex].metadata.title = newTitle;
      localStorage.setItem(setsKey, JSON.stringify(existingSets));
    }
  } catch (error) {
    console.error('Failed to rename question set:', error);
  }
}

// Duplicate a question set
export function duplicateQuestionSet(
  courseId: string,
  mode: AssessmentMode,
  setId: string
): string | null {
  try {
    const existingSet = loadQuestionSet(courseId, mode, setId);
    if (!existingSet) return null;
    
    const newId = generateSetId();
    const newTitle = `${existingSet.metadata?.title || 'Assessment'} (Copy)`;
    saveQuestionSet(courseId, mode, newId, { ...existingSet, metadata: undefined }, newTitle);
    return newId;
  } catch (error) {
    console.error('Failed to duplicate question set:', error);
    return null;
  }
}

// Helper to list all sets data (internal)
function listQuestionSetsData(
  courseId: string,
  mode: AssessmentMode
): QuestionSet[] {
  try {
    const key = getSetsStorageKey(courseId, mode);
    const stored = localStorage.getItem(key);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    return [];
  }
}

// Legacy support: Save single active state (backward compatibility)

// Legacy functions (for backward compatibility with existing single-set storage)
export function saveMCQState(
  courseId: string,
  state: PersistedMCQState,
  setId?: string
): string {
  const id = setId || generateSetId();
  saveQuestionSet(courseId, 'mcq', id, state);
  return id;
}

export function loadMCQState(
  courseId: string
): PersistedMCQState | null {
  // Try loading from new sets storage first
  const sets = listQuestionSets(courseId, 'mcq');
  if (sets.length > 0) {
    return loadQuestionSet(courseId, 'mcq', sets[0].id) as PersistedMCQState | null;
  }
  
  // Fallback to legacy storage
  try {
    const key = getStorageKey(courseId, 'mcq');
    const stored = localStorage.getItem(key);
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    return {
      ...parsed,
      submittedAnswers: parsed.submittedAnswers?.map((arr: string[]) => new Set(arr)) || [],
      submittedQuestions: new Set(parsed.submittedQuestions || []),
    };
  } catch (error) {
    console.error('Failed to load MCQ state:', error);
    return null;
  }
}

export function saveOpenEndedState(
  courseId: string,
  state: PersistedOpenEndedState,
  setId?: string
): string {
  const id = setId || generateSetId();
  saveQuestionSet(courseId, 'open-ended', id, state);
  return id;
}

export function loadOpenEndedState(
  courseId: string
): PersistedOpenEndedState | null {
  // Try loading from new sets storage first
  const sets = listQuestionSets(courseId, 'open-ended');
  if (sets.length > 0) {
    return loadQuestionSet(courseId, 'open-ended', sets[0].id) as PersistedOpenEndedState | null;
  }
  
  // Fallback to legacy storage
  try {
    const key = getStorageKey(courseId, 'open-ended');
    const stored = localStorage.getItem(key);
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    return {
      ...parsed,
      submittedQuestions: new Set(parsed.submittedQuestions || []),
    };
  } catch (error) {
    console.error('Failed to load Open-Ended state:', error);
    return null;
  }
}

export function clearAssessmentState(
  courseId: string,
  mode: AssessmentMode,
  setId?: string
): void {
  if (setId) {
    deleteQuestionSet(courseId, mode, setId);
  } else {
    // Legacy: clear single active state
    try {
      const key = getStorageKey(courseId, mode);
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to clear assessment state:', error);
    }
  }
}

