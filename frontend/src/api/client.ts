import type { 
  User, 
  Course, 
  RegisterRequest, 
  LoginRequest, 
  TokenResponse, 
  CourseCreate,
  Document,
  ChatRequest,
  ChatResponse,
  MCQRequest,
  MCQListResponse,
  OpenEndedQuestionRequest,
  OpenEndedQuestionResponse,
  OpenEndedQuestionListResponse,
  OpenEndedEvaluationRequest,
  OpenEndedEvaluationResponse,
  FindMistakeRequest,
  FindMistakeListResponse,
  CaseBasedRequest,
  CaseBasedListResponse,
  Conversation,
  Message,
} from '../types/api';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

class ApiClient {
  private getToken(): string | null {
    return localStorage.getItem('token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${API_BASE}${endpoint}`;
    if (import.meta.env.DEV) {
      console.log(`API Request: ${options.method || 'GET'} ${url}`, options.body);
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const error = await response.json();
        if (error.detail) {
          // Handle FastAPI validation errors (array format)
          if (Array.isArray(error.detail)) {
            errorMessage = error.detail.map((err: any) => {
              const field = err.loc?.join('.') || 'field';
              return `${field}: ${err.msg}`;
            }).join(', ');
          } else {
            // Handle string detail messages
            errorMessage = error.detail;
          }
        } else if (error.message) {
          errorMessage = error.message;
        }
      } catch {
        // If response is not JSON, try to get text
        try {
          const text = await response.text();
          errorMessage = text || errorMessage;
        } catch {
          // Keep default error message
        }
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  // Auth
  async register(data: RegisterRequest): Promise<TokenResponse> {
    return this.request<TokenResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(data: LoginRequest): Promise<TokenResponse> {
    return this.request<TokenResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCurrentUser(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  // Courses
  async getCourses(): Promise<Course[]> {
    return this.request<Course[]>('/courses');
  }

  async createCourse(data: CourseCreate): Promise<Course> {
    return this.request<Course>('/courses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCourse(courseId: string): Promise<Course> {
    return this.request<Course>(`/courses/${courseId}`);
  }

  async updateCourse(courseId: string, data: CourseCreate): Promise<Course> {
    return this.request<Course>(`/courses/${courseId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCourse(courseId: string): Promise<void> {
    return this.request<void>(`/courses/${courseId}`, {
      method: 'DELETE',
    });
  }

  // Documents
  async uploadDocument(courseId: string, file: File): Promise<Document> {
    const formData = new FormData();
    formData.append('file', file);

    const token = this.getToken();
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${API_BASE}/courses/${courseId}/documents/upload`;
    if (import.meta.env.DEV) {
      console.log(`API Request: POST ${url}`, { file: file.name });
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const error = await response.json();
        if (error.detail) {
          errorMessage = Array.isArray(error.detail)
            ? error.detail.map((err: any) => {
                const field = err.loc?.join('.') || 'field';
                return `${field}: ${err.msg}`;
              }).join(', ')
            : error.detail;
        } else if (error.message) {
          errorMessage = error.message;
        }
      } catch {
        try {
          const text = await response.text();
          errorMessage = text || errorMessage;
        } catch {
          // Keep default error message
        }
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  async getDocuments(courseId: string): Promise<Document[]> {
    return this.request<Document[]>(`/courses/${courseId}/documents`);
  }

  async pasteTextDocument(courseId: string, title: string, text: string): Promise<Document> {
    return this.request<Document>(`/courses/${courseId}/documents/paste`, {
      method: 'POST',
      body: JSON.stringify({ title, text }),
    });
  }

  getDocumentFileUrl(documentId: string): string {
    const url = `${API_BASE}/documents/${documentId}/file`;
    // For authenticated requests, we'll need to pass the token in the Authorization header
    // The browser will handle this when we use fetch with credentials
    return url;
  }

  // Chat
  async sendMessage(courseId: string, request: ChatRequest): Promise<ChatResponse> {
    return this.request<ChatResponse>(`/courses/${courseId}/chat`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async sendMessageStream(
    courseId: string,
    request: ChatRequest,
    onChunk?: (chunk: string) => void
  ): Promise<ChatResponse> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${API_BASE}/courses/${courseId}/chat`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const error = await response.json();
        errorMessage = error.detail || error.message || errorMessage;
      } catch {
        // Keep default error message
      }
      throw new Error(errorMessage);
    }

    // Handle SSE streaming
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    let conversationId: string | null = null;
    let sources: any[] = [];

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.chunk) {
                fullContent += data.chunk;
                onChunk?.(data.chunk);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    }

    // Return response in ChatResponse format
    return {
      message_id: '',
      content: fullContent,
      sources: sources,
      conversation_id: conversationId || '',
      mode: request.mode || 'strict',
    };
  }

  // Assessments
  async generateMCQs(courseId: string, request: MCQRequest): Promise<MCQListResponse> {
    return this.request<MCQListResponse>(`/courses/${courseId}/assessments/mcq/generate`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async generateOpenEndedQuestion(courseId: string, request: OpenEndedQuestionRequest): Promise<OpenEndedQuestionListResponse> {
    return this.request<OpenEndedQuestionListResponse>(`/courses/${courseId}/assessments/open-ended/generate`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async evaluateOpenEndedAnswer(courseId: string, request: OpenEndedEvaluationRequest): Promise<OpenEndedEvaluationResponse> {
    return this.request<OpenEndedEvaluationResponse>(`/courses/${courseId}/assessments/open-ended/evaluate`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async generateFindMistake(courseId: string, request: FindMistakeRequest): Promise<FindMistakeListResponse> {
    return this.request<FindMistakeListResponse>(`/courses/${courseId}/assessments/find-mistake/generate`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async generateCaseBased(courseId: string, request: CaseBasedRequest): Promise<CaseBasedListResponse> {
    return this.request<CaseBasedListResponse>(`/courses/${courseId}/assessments/case-based/generate`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // Conversations
  async getConversations(courseId: string): Promise<Conversation[]> {
    return this.request<Conversation[]>(`/courses/${courseId}/conversations`);
  }

  async getConversationMessages(conversationId: string): Promise<Message[]> {
    return this.request<Message[]>(`/conversations/${conversationId}/messages`);
  }
}

export const apiClient = new ApiClient();

