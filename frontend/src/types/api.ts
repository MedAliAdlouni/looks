export interface User {
  id: string;
  email: string;
  full_name: string;
}

export interface Course {
  id: string;
  user_id: string;
  name: string;
  description: string;
  document_count: number;
  created_at: string;
  updated_at: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
}

export interface CourseCreate {
  name: string;
  description: string;
}

export interface Document {
  id: string;
  course_id: string;
  filename: string;
  file_size: number;
  num_pages: number;
  file_type: string;
  mime_type: string;
  processing_status: string;
  uploaded_at: string;
  processed_at: string | null;
}

export interface ChatRequest {
  message: string;
  conversation_id?: string | null;
  mode?: 'strict' | 'hybrid';
  verbosity?: 'concise' | 'normal' | 'detailed';
  stream?: boolean;
}

export interface Source {
  page: number;
  chunk_id: string;
  similarity: number;
  document_id: string;
  document_name: string;
  chunk_text: string;
}

export interface ChatResponse {
  message_id: string;
  content: string;
  sources: Source[];
  conversation_id: string;
  mode?: 'strict' | 'hybrid';
}

// Assessment Types
export interface SourceReference {
  document_id: string;
  document_name: string;
  page: number;
}

export interface MCQOption {
  id: string;
  text: string;
  is_correct: boolean;
  justification: string;
}

export interface MCQ {
  question: string;
  options: MCQOption[];
  hint: string;
  source_references: SourceReference[];
}

export interface MCQRequest {
  topic?: string;
  num_questions?: number;
  document_ids?: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface MCQListResponse {
  mcqs: MCQ[];
}

export interface OpenEndedQuestionRequest {
  topic?: string;
  num_questions?: number;
  document_ids?: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface OpenEndedQuestionResponse {
  question: string;
  source_references: SourceReference[];
}

export interface OpenEndedQuestionListResponse {
  questions: OpenEndedQuestionResponse[];
}

export interface EvaluationDetails {
  score_explanation: string;
  correct_aspects: string[];
  missing_aspects: string[];
  incorrect_aspects: string[];
}

export interface OpenEndedEvaluationRequest {
  question: string;
  student_answer: string;
}

export interface OpenEndedEvaluationResponse {
  reference_answer: string;
  evaluation: EvaluationDetails;
  feedback: string;
  source_references: SourceReference[];
}

// Find Mistake Assessment Types
export interface FindMistakeRequest {
  num_questions?: number;
  document_ids?: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface FindMistakeResponse {
  type: 'find_mistake';
  id: string;
  prompt: string;
  incorrect_solution: string;
  expected_correction: string;
  explanation: string;
  sources: SourceReference[];
}

export interface FindMistakeListResponse {
  items: FindMistakeResponse[];
}

// Case-Based Assessment Types
export interface CaseBasedRequest {
  num_questions?: number;
  document_ids?: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface CaseBasedMCQ {
  kind: 'mcq';
  question: string;
  options: string[];
  answer_index: number;
  hint: string;
  sources: SourceReference[];
}

export interface CaseBasedOpenEnded {
  kind: 'open_ended';
  question: string;
  expected_answer: string;
  rubric: string[];
  sources: SourceReference[];
}

export type CaseBasedQuestion = CaseBasedMCQ | CaseBasedOpenEnded;

export interface CaseBasedResponse {
  type: 'case_based';
  id: string;
  case_title: string;
  case_description: string;
  questions: CaseBasedQuestion[];
  sources: SourceReference[];
}

export interface CaseBasedListResponse {
  cases: CaseBasedResponse[];
}

// Conversation Types
export interface Conversation {
  id: string;
  course_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{
    document_id: string;
    document_name: string;
    page: number;
    chunk_text?: string;
  }>;
  created_at: string;
}


