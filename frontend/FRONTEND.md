# Frontend Documentation

## Table of Contents
1. [Mental Model - How It All Works](#mental-model---how-it-all-works)
2. [Folder Structure](#folder-structure)
3. [Key Technologies](#key-technologies)
4. [How Components Work Together](#how-components-work-together)
5. [Change Log](#change-log)

---

## Mental Model - How It All Works

### The Big Picture

Think of your frontend like a **smart house** with different rooms (pages) that you can navigate between. Each room has its own purpose, and there's a central "brain" (AuthContext) that remembers who you are and what you're allowed to do.

### Core Concepts

#### 1. **React Components = Reusable UI Pieces**
Imagine building with LEGO blocks. Each component is like a LEGO block - a reusable piece of the interface. For example:
- A button is a component
- A form is a component  
- A whole page (like Login) is a component made of smaller components

#### 2. **State = Memory**
Your app needs to remember things:
- Is the user logged in? (stored in `AuthContext`)
- What courses do they have? (stored in `Dashboard` component)
- What message are they typing? (stored in chat input)

**State** is like the app's short-term memory. When state changes, React automatically updates what you see on screen.

#### 3. **Props = Passing Information**
When you want to give information to a component, you pass it as **props** (properties). Like handing someone a note with instructions.

Example: `<PDFViewer document={myDocument} />` - we're passing the document information to the PDFViewer component.

#### 4. **Routes = Navigation**
Routes are like doors between rooms:
- `/login` → Login page
- `/register` → Register page  
- `/` → Dashboard (home)
- `/course/:courseId` → Course detail page

React Router watches the URL and shows the right "room" (component).

#### 5. **API Client = Talking to the Backend**
The `apiClient` is like a messenger that:
- Takes your requests (like "get my courses")
- Sends them to the backend server
- Brings back the response
- Handles authentication (sends your login token automatically)

#### 6. **Context = Shared Memory**
`AuthContext` is like a shared notebook that all components can read from. It stores:
- Who is logged in (`user`)
- Their authentication token (`token`)
- Functions to login/logout/register

Any component can "subscribe" to this context to know if someone is logged in.

### The Flow of a User Journey

1. **User visits the app** → `main.tsx` starts everything
2. **App checks if user is logged in** → `AuthContext` looks in browser storage for a saved token
3. **If not logged in** → Shows Login or Register page
4. **User logs in** → Token saved, user info fetched, redirected to Dashboard
5. **Dashboard loads** → Fetches courses from backend, displays them
6. **User clicks a course** → Navigates to CourseDetail page
7. **CourseDetail shows** → Documents tab or Chat tab
8. **User uploads PDF** → File sent to backend, document list refreshes
9. **User opens PDF** → PDFViewer component loads, shows PDF with chat sidebar
10. **User asks question** → Message sent to backend, AI responds, shown in chat

---

## Folder Structure

```
frontend/
├── src/                          # All your source code lives here
│   ├── main.tsx                  # Entry point - starts the app
│   ├── App.tsx                   # Main app component - sets up routing
│   ├── index.css                 # Global styles (applies to everything)
│   │
│   ├── api/                      # Backend communication
│   │   └── client.ts             # API client - all backend requests
│   │
│   ├── components/               # Reusable UI pieces
│   │   └── PDFViewer.tsx        # PDF viewer with chat sidebar
│   │
│   ├── context/                  # Shared state/global memory
│   │   └── AuthContext.tsx      # Authentication state (user, token, login/logout)
│   │
│   ├── pages/                    # Full page components
│   │   ├── Login.tsx            # Login page
│   │   ├── Register.tsx         # Registration page
│   │   ├── Dashboard.tsx        # Home page - shows all courses
│   │   └── CourseDetail.tsx    # Course page - documents & chat
│   │
│   └── types/                    # TypeScript type definitions
│       └── api.ts               # Types for API requests/responses
│
├── package.json                  # Dependencies and scripts
├── vite.config.ts               # Build tool configuration
├── tsconfig.json                # TypeScript configuration
└── index.html                   # HTML template
```

### What Each Folder Does

#### `src/` - The Main Source Directory
All your code goes here. This is what gets compiled and sent to the browser.

#### `api/` - Backend Communication
- **`client.ts`**: A class that handles all communication with your backend
  - Methods like `login()`, `getCourses()`, `uploadDocument()`, `sendMessage()`
  - Automatically adds authentication tokens to requests
  - Handles errors and converts responses to JavaScript objects

#### `components/` - Reusable UI Pieces
- **`PDFViewer.tsx`**: A complex component that:
  - Displays PDF documents using `react-pdf` library
  - Has zoom controls and page navigation
  - Shows a chat sidebar for asking questions
  - Handles text selection (you can highlight text and add it to chat)
  - Supports keyboard shortcuts (Ctrl+L to add selected text)

#### `context/` - Global State Management
- **`AuthContext.tsx`**: Provides authentication state to the entire app
  - Stores: `user`, `token`, `loading` status
  - Provides: `login()`, `register()`, `logout()` functions
  - Automatically checks localStorage on app start
  - Any component can use `useAuth()` hook to access this

#### `pages/` - Full Page Views
- **`Login.tsx`**: Simple form with email/password, calls `auth.login()`
- **`Register.tsx`**: Form with name/email/password, calls `auth.register()`
- **`Dashboard.tsx`**: 
  - Shows header with user info and logout
  - Lists all courses in a grid
  - Has "Create Course" button and form
  - Can delete courses
- **`CourseDetail.tsx`**: 
  - Shows course info and description
  - Two tabs: "Documents" and "Chat"
  - Documents tab: upload PDFs, list documents, click to view
  - Chat tab: conversation interface with AI

#### `types/` - Type Definitions
- **`api.ts`**: TypeScript interfaces that define the shape of data
  - `User`, `Course`, `Document`, `ChatRequest`, `ChatResponse`, etc.
  - Helps catch errors before runtime
  - Makes code more readable (you know what properties exist)

#### Root Files
- **`main.tsx`**: The very first file that runs. It:
  - Renders the `<App />` component into the HTML
  - Applies global CSS
- **`App.tsx`**: Sets up the app structure:
  - Wraps everything in `BrowserRouter` (enables navigation)
  - Wraps in `AuthProvider` (makes auth available everywhere)
  - Defines all routes and which component to show
  - Has `PrivateRoute` component that protects pages (redirects to login if not authenticated)
- **`package.json`**: Lists all dependencies (libraries you use)
- **`vite.config.ts`**: Configuration for Vite (the build tool):
  - Sets up proxy to backend (`/api` → `http://localhost:8000`)
  - Configures PDF.js worker for PDF rendering
  - Sets dev server port to 3000

---

## Key Technologies

### React
A JavaScript library for building user interfaces. It lets you:
- Build components (reusable UI pieces)
- Manage state (app memory)
- React to user interactions

### TypeScript
JavaScript with types. Helps catch errors and makes code more maintainable.

### React Router
Handles navigation between pages. Watches the URL and shows the right component.

### Vite
Fast build tool and development server. Compiles your code and serves it.

### react-pdf
Library for displaying PDF files in the browser. Used in `PDFViewer.tsx`.

### PDF.js
Mozilla's PDF rendering engine. `react-pdf` uses this under the hood.

---

## How Components Work Together

### Authentication Flow

```
User opens app
    ↓
main.tsx renders App
    ↓
App wraps everything in AuthProvider
    ↓
AuthProvider checks localStorage for token
    ↓
If token exists → fetch user info from backend
    ↓
AppRoutes checks if user is logged in
    ↓
If logged in → show Dashboard
If not → show Login/Register
```

### Course Management Flow

```
User on Dashboard
    ↓
Dashboard component loads → calls apiClient.getCourses()
    ↓
Backend returns list of courses
    ↓
Dashboard stores courses in state → displays them
    ↓
User clicks "Create Course" → form appears
    ↓
User submits → apiClient.createCourse() called
    ↓
Backend creates course → returns new course
    ↓
Dashboard refreshes course list
```

### Document Upload Flow

```
User on CourseDetail page
    ↓
User clicks "Choose PDF File"
    ↓
File selected → handleFileUpload() called
    ↓
apiClient.uploadDocument() sends file to backend
    ↓
Backend processes file (extracts text, creates chunks, generates embeddings)
    ↓
Frontend refreshes document list
    ↓
New document appears with "processing" status
    ↓
When processing completes, user can click to view PDF
```

### Chat Flow

```
User types message in chat input
    ↓
User clicks Send → handleSendMessage() called
    ↓
Message added to messages array (shows immediately)
    ↓
apiClient.sendMessage() sends to backend
    ↓
Backend uses RAG to find relevant document chunks
    ↓
Backend sends response with answer + sources
    ↓
Response added to messages array
    ↓
Chat scrolls to show new message
```

### PDF Viewer Flow

```
User clicks document in CourseDetail
    ↓
CourseDetail sets viewingDocument state
    ↓
PDFViewer component renders
    ↓
PDFViewer fetches PDF file from backend (with auth token)
    ↓
PDF.js loads and renders PDF pages
    ↓
User can zoom, scroll, select text
    ↓
User highlights text → "Add to chat" button appears
    ↓
User clicks button or presses Ctrl+L → text added to chat input
    ↓
User sends message → chat sidebar shows conversation
```

---

## Change Log

This section tracks all changes made to the frontend codebase.

### Initial Documentation
- Created comprehensive frontend documentation
- Documented mental model, folder structure, and component interactions
- Explained key technologies and data flows

