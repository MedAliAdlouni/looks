# 🎓 AI Tutor - Curriculum-Aligned Learning Platform

<div align="center">

**An intelligent tutoring platform that helps students learn using their own course materials**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.109.0-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18.2.0-61DAFB?style=flat-square&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3.3-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-13+-4169E1?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![Pinecone](https://img.shields.io/badge/Pinecone-Vector%20DB-430098?style=flat-square)](https://www.pinecone.io/)

</div>

---

## 📖 Overview

AI Tutor is a sophisticated educational platform that leverages **Retrieval-Augmented Generation (RAG)** to provide students with accurate, curriculum-aligned learning assistance. Unlike generic AI tutors, this platform ensures that all answers are grounded in the student's own course materials, eliminating hallucinations and maintaining strict alignment with their curriculum.

### ✨ Key Differentiators

- **🎯 Zero Hallucinations**: If information isn't in your uploaded materials, the system explicitly tells you
- **📚 Curriculum-Aligned**: Follows your teacher's specific methods and course content
- **🔍 Source Citations**: Every answer includes citations showing exactly where information was found
- **🧠 Context-Aware**: Understands your course structure and maintains conversation context

---

## 🚀 Features

### Core Capabilities

| Feature | Description |
|---------|-------------|
| **📁 Course Management** | Create courses and organize all your learning materials in one place |
| **📄 Document Processing** | Upload and process PDFs, Word documents, PowerPoint presentations, and images |
| **💬 Interactive Chat** | Ask questions about your materials and receive answers with source citations |
| **📖 Document Viewer** | Read your materials side-by-side with an AI assistant for contextual help |
| **🧩 Problem Solving** | Get step-by-step guidance on exercises using your course content |
| **✅ Self-Assessment** | Generate practice questions (MCQs, case-based, and open-ended) to test understanding |
| **📊 Assessment Evaluation** | Get AI-powered feedback on your open-ended answers |

### Assessment Types

- **Multiple Choice Questions (MCQ)**: Auto-generated questions with multiple options
- **Case-Based Questions**: Scenario-based problems using your course materials
- **Find the Mistake**: Identify errors in provided solutions
- **Open-Ended Questions**: Free-form questions with AI evaluation and feedback

---

## 🏗️ Architecture

### System Overview

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   React SPA     │ ◄─────► │   FastAPI       │ ◄─────► │   PostgreSQL    │
│   (Frontend)    │  HTTP   │   (Backend)     │  SQL    │   (Database)    │
└─────────────────┘         └─────────────────┘         └─────────────────┘
                                      │
                                      │ Embeddings
                                      ▼
                            ┌─────────────────┐
                            │    Pinecone     │
                            │ (Vector Store)  │
                            └─────────────────┘
                                      │
                                      │ AI API
                                      ▼
                            ┌─────────────────┐
                            │  Google Gemini  │
                            │   (LLM)         │
                            └─────────────────┘
```

### RAG Pipeline

The platform uses a sophisticated RAG (Retrieval-Augmented Generation) pipeline:

1. **Document Ingestion**: Documents are uploaded and processed
2. **Chunking**: Documents are split into semantically meaningful chunks
3. **Embedding**: Chunks are converted to vector embeddings using Google's embedding model
4. **Storage**: Embeddings are stored in Pinecone vector database
5. **Retrieval**: User questions are embedded and matched against relevant chunks
6. **Generation**: Retrieved context is combined with the question to generate accurate answers
7. **Citation**: Sources are tracked and displayed with each answer

### Technology Stack

#### Frontend
- **Framework**: React 18.2 with TypeScript
- **Build Tool**: Vite 7.3
- **Routing**: React Router DOM 6.20
- **UI Components**: Custom component library with centralized theming
- **Document Rendering**: React-PDF for PDF viewing
- **Markdown**: React-Markdown for rich text rendering

#### Backend
- **Framework**: FastAPI 0.109 (Python 3.11+)
- **Database**: PostgreSQL with SQLAlchemy 2.0 ORM
- **Vector Database**: Pinecone for semantic search
- **AI Integration**: Google Gemini API
- **Authentication**: JWT tokens with bcrypt password hashing
- **File Processing**: 
  - PyMuPDF for PDFs
  - python-docx for Word documents
  - python-pptx for PowerPoint
  - PIL/Pillow for images

#### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Database Migrations**: Alembic
- **Package Management**: 
  - `uv` for Python (backend)
  - `npm` for Node.js (frontend)

---

## 📁 Project Structure

```
looks/
├── backend/                    # FastAPI backend application
│   ├── app/
│   │   ├── api/               # API route handlers
│   │   │   ├── auth.py        # Authentication endpoints
│   │   │   ├── courses.py     # Course management
│   │   │   ├── documents.py  # Document upload/management
│   │   │   ├── chat.py        # Chat/conversation endpoints
│   │   │   ├── document_viewers.py  # Document viewing
│   │   │   └── assessment.py  # Assessment generation/evaluation
│   │   ├── config/            # Configuration management
│   │   ├── models/            # SQLAlchemy database models
│   │   ├── schemas/           # Pydantic request/response schemas
│   │   ├── services/          # Business logic layer
│   │   │   ├── rag/           # RAG pipeline implementation
│   │   │   ├── chat/          # Chat service with streaming
│   │   │   ├── chunking/      # Document chunking logic
│   │   │   ├── documents/     # Document processing
│   │   │   ├── assessment/    # Assessment generators
│   │   │   └── integrations/  # External service integrations
│   │   └── utils/             # Utility functions
│   ├── alembic/               # Database migrations
│   ├── tests/                 # Test suite
│   ├── Dockerfile             # Backend container definition
│   └── pyproject.toml         # Python dependencies
│
├── frontend/                   # React frontend application
│   ├── src/
│   │   ├── components/        # React components
│   │   │   ├── ui/            # Reusable UI components
│   │   │   ├── layout/        # Layout components
│   │   │   ├── course/        # Course-specific components
│   │   │   ├── dashboard/     # Dashboard components
│   │   │   ├── assessments/   # Assessment components
│   │   │   └── viewers/       # Document viewer components
│   │   ├── pages/             # Page components
│   │   ├── api/               # API client
│   │   ├── context/           # React contexts (Auth, etc.)
│   │   ├── hooks/             # Custom React hooks
│   │   ├── theme/             # Design system & theming
│   │   └── types/             # TypeScript type definitions
│   ├── Dockerfile             # Frontend container definition
│   └── package.json           # Node.js dependencies
│
└── documentation/             # Project documentation
    ├── ERDiagram.md           # Database schema diagram
    ├── DOCKER_SETUP.md        # Docker deployment guide
    └── ALEMBIC_EXPLANATION.md # Migration documentation
```

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.11+** (for backend)
- **Node.js 18+** and npm (for frontend)
- **PostgreSQL 13+** (or use Docker)
- **Docker & Docker Compose** (optional, for containerized deployment)
- **API Keys**:
  - Google Gemini API key
  - Pinecone API key and index name

### Quick Start with Docker

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd looks
   ```

2. **Configure environment variables**
   
   Create `backend/.env`:
   ```env
   # Database
   DATABASE_URL=postgresql://user:password@postgres:5432/aitutor
   
   # AI Services
   GEMINI_API_KEY=your_gemini_api_key
   PINECONE_API_KEY=your_pinecone_api_key
   PINECONE_INDEX_NAME=your_index_name
   PINECONE_ENVIRONMENT=your_environment
   
   # Security
   SECRET_KEY=your_secret_key_here
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=1440
   
   # CORS
   CORS_ORIGINS=["http://localhost:5173"]
   ```

   Create `frontend/.env`:
   ```env
   VITE_API_BASE_URL=http://localhost:8000
   ```

3. **Start with Docker Compose**
   ```bash
   docker-compose up -d
   ```

4. **Run database migrations**
   ```bash
   docker-compose exec backend alembic upgrade head
   ```

5. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

### Manual Setup

#### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies using uv**
   ```bash
   pip install uv
   uv sync
   ```

3. **Set up environment variables** (create `.env` file as shown above)

4. **Initialize database**
   ```bash
   # Create database
   createdb aitutor
   
   # Run migrations
   alembic upgrade head
   ```

5. **Start the server**
   ```bash
   ./start.sh
   # or
   uvicorn app:app --reload --host 0.0.0.0 --port 8000
   ```

#### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables** (create `.env` file as shown above)

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Build for production**
   ```bash
   npm run build
   ```

---

## ⚙️ Configuration

### Backend Configuration

Key configuration files:
- `backend/app/config/base.py` - Base settings
- `backend/app/config/database.py` - Database configuration
- `backend/app/config/ai.py` - AI service configuration
- `backend/app/config/api.py` - API settings (CORS, etc.)

### Frontend Configuration

- `frontend/src/theme/theme.ts` - Centralized theme configuration
  - Colors, spacing, typography, shadows, etc.
  - All UI components automatically use these values

### Environment Variables

See the [Quick Start](#quick-start-with-docker) section for required environment variables.

---

## 📡 API Documentation

Once the backend is running, interactive API documentation is available at:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Main API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | User registration |
| `/api/auth/login` | POST | User authentication |
| `/api/courses` | GET, POST | List/create courses |
| `/api/courses/{id}` | GET, PUT, DELETE | Course operations |
| `/api/documents` | POST | Upload documents |
| `/api/chat/conversations` | GET, POST | Manage conversations |
| `/api/chat/messages` | POST | Send messages |
| `/api/assessment/generate` | POST | Generate assessments |
| `/api/assessment/evaluate` | POST | Evaluate answers |

---

## 🧪 Testing

### Backend Tests

```bash
cd backend
pytest
```

### Frontend Tests

```bash
cd frontend
npm test
```

---

## 🐳 Docker Deployment

### Development

```bash
docker-compose up
```

### Production

1. Update environment variables for production
2. Build images:
   ```bash
   docker-compose -f docker-compose.prod.yml build
   ```
3. Deploy:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

See `documentation/DOCKER_SETUP.md` for detailed deployment instructions.

---

## 🔐 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt for password storage
- **CORS Protection**: Configurable CORS policies
- **Input Validation**: Pydantic schemas for request validation
- **SQL Injection Prevention**: SQLAlchemy ORM with parameterized queries

---

## 📊 Database Schema

The application uses the following main entities:

- **Users**: User accounts and authentication
- **Courses**: Course containers for documents
- **Documents**: Uploaded course materials
- **Chunks**: Processed document segments for RAG
- **Conversations**: Chat conversation threads
- **Messages**: Individual messages in conversations

See `documentation/ERDiagram.md` for the complete entity-relationship diagram.

---

## 🛠️ Development

### Code Structure

- **Backend**: Follows FastAPI best practices with clear separation of concerns
  - API routes → Business logic → Database models
  - Service layer for complex operations
  - Dependency injection for testability

- **Frontend**: Modular React architecture
  - Component-based UI with reusable components
  - Centralized theme system
  - Type-safe API client

### Adding New Features

1. **Backend**: 
   - Add models in `app/models/`
   - Create schemas in `app/schemas/`
   - Implement services in `app/services/`
   - Add API routes in `app/api/`

2. **Frontend**:
   - Create components in `src/components/`
   - Add pages in `src/pages/`
   - Update API client in `src/api/`

### Database Migrations

```bash
# Create a new migration
cd backend
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---


## 🙏 Acknowledgments

- Built with [FastAPI](https://fastapi.tiangolo.com/)
- Powered by [Google Gemini](https://deepmind.google/technologies/gemini/)
- Vector search by [Pinecone](https://www.pinecone.io/)

---

<div align="center">

**Built with ❤️ to help students learn better by staying true to their curriculum**

[Report Bug](https://github.com/your-repo/issues) · [Request Feature](https://github.com/your-repo/issues)

</div>
