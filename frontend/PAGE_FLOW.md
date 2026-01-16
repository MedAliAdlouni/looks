# Frontend Page Flow & Component Reference

> **Navigation Compass** - Complete documentation of all pages, their components, and how they connect.

---

## 📍 Application Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    App.tsx (Router)                         │
│  - Routes: /login, /register, /, /course/:courseId         │
│  - Auth Protection: PrivateRoute wrapper                    │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼──────┐    ┌───────▼──────┐    ┌───────▼──────┐
│   Login      │    │  Register    │    │  Dashboard   │
│   Page       │    │   Page       │    │   Page       │
└──────────────┘    └──────────────┘    └──────┬───────┘
                                                │
                                        ┌───────▼──────┐
                                        │ CourseDetail │
                                        │    Page      │
                                        └──────┬───────┘
                                               │
                    ┌─────────────────────────┼─────────────────────────┐
                    │                         │                         │
            ┌───────▼──────┐          ┌───────▼──────┐          ┌───────▼──────┐
            │ PDFViewer    │          │ DocxViewer   │          │ ImageViewer  │
            │ (Fullscreen) │          │ (Fullscreen)  │          │ (Fullscreen) │
            └──────────────┘          └──────────────┘          └──────────────┘
```

---

## 📄 Page 1: Login (`/login`)

**Route:** `/login`  
**File:** `src/pages/Login.tsx`  
**Purpose:** User authentication - sign in to access the application

### Components Used

#### Layout Components
- **`PageLayout`** (`components/layout/PageLayout.tsx`)
  - Provides consistent page wrapper with background gradient
  - Handles padding and max-width constraints
  - Sets up full-height container

#### UI Components
- **`Card`** (`components/ui/Card.tsx`)
  - Container for the login form
  - Provides card styling with padding and shadow
  - Max width: 420px, centered on page

- **`Input`** (`components/ui/Input.tsx`)
  - Email input field with label
  - Password input field with label
  - Handles form validation and styling

- **`Button`** (`components/ui/Button.tsx`)
  - Submit button for login form
  - Shows loading state during authentication
  - Full-width button styling

- **`Alert`** (`components/ui/Alert.tsx`)
  - Displays error messages if login fails
  - Dismissible error notification
  - Only shown when error state exists

### State Management
- `email` - User's email input
- `password` - User's password input
- `error` - Error message from failed login
- `loading` - Loading state during API call

### User Interactions
1. User enters email and password
2. Submits form → calls `login()` from `AuthContext`
3. On success → redirects to Dashboard (`/`)
4. On error → displays error message in Alert

### Navigation
- **Success:** Redirects to `/` (Dashboard)
- **Link:** "Create one here" → `/register`

---

## 📄 Page 2: Register (`/register`)

**Route:** `/register`  
**File:** `src/pages/Register.tsx`  
**Purpose:** User registration - create new account

### Components Used

#### Layout Components
- **`PageLayout`** (`components/layout/PageLayout.tsx`)
  - Same as Login page - consistent page wrapper

#### UI Components
- **`Card`** (`components/ui/Card.tsx`)
  - Container for registration form
  - Same styling as Login page

- **`Input`** (`components/ui/Input.tsx`)
  - Full Name input field
  - Email input field
  - Password input field
  - All with labels and validation

- **`Button`** (`components/ui/Button.tsx`)
  - Submit button for registration
  - Loading state during API call

- **`Alert`** (`components/ui/Alert.tsx`)
  - Error messages for registration failures

### State Management
- `email` - User's email input
- `password` - User's password input
- `fullName` - User's full name input
- `error` - Error message from failed registration
- `loading` - Loading state during API call

### User Interactions
1. User enters full name, email, and password
2. Submits form → calls `register()` from `AuthContext`
3. On success → redirects to Dashboard (`/`)
4. On error → displays error message

### Navigation
- **Success:** Redirects to `/` (Dashboard)
- **Link:** "Sign in here" → `/login`

---

## 📄 Page 3: Dashboard (`/`)

**Route:** `/` (root)  
**File:** `src/pages/Dashboard.tsx`  
**Purpose:** Home page - displays all user's courses, create/delete courses

### Components Used

#### Layout Components
- **`PageLayout`** (`components/layout/PageLayout.tsx`)
  - Main page container with gradient background

- **`PageHeader`** (`components/layout/PageHeader.tsx`)
  - Top header with title "📚 Curriculum AI Tutor"
  - Subtitle: "Manage and access your learning materials"

#### Dashboard-Specific Components
- **`CourseCard`** (`components/dashboard/CourseCard.tsx`)
  - Displays individual course information
  - Shows course name, description, document count
  - Action buttons: "View & Chat", "📝 Assessments", "Delete"
  - Navigates to course detail page on click
  - Handles course deletion

- **`CreateCourseForm`** (`components/dashboard/CreateCourseForm.tsx`)
  - Form to create new courses
  - Fields: Course Name, Description (textarea)
  - Submit and Cancel buttons
  - Only visible when `showCreateForm` is true

#### UI Components
- **`Button`** (`components/ui/Button.tsx`)
  - "Create Course" / "✕ Cancel" toggle button
  - Controls visibility of CreateCourseForm

- **`LoadingSpinner`** (`components/ui/LoadingSpinner.tsx`)
  - Shows "Loading courses..." while fetching data
  - Full-screen spinner during initial load

- **`Alert`** (`components/ui/Alert.tsx`)
  - Error messages for failed API calls
  - Dismissible error notifications

- **`Card`** (`components/ui/Card.tsx`)
  - Empty state card when no courses exist
  - Contains message and "Create Your First Course" button

### State Management
- `courses` - Array of all user's courses
- `loading` - Loading state while fetching courses
- `error` - Error message from API failures
- `showCreateForm` - Toggle for create course form visibility

### User Interactions
1. **Page Load:** Fetches all courses via `apiClient.getCourses()`
2. **Create Course:** 
   - Click "Create Course" → shows form
   - Fill form → calls `apiClient.createCourse()`
   - Refreshes course list on success
3. **View Course:** 
   - Click "View & Chat" on CourseCard → navigates to `/course/:courseId`
4. **Assessments:** 
   - Click "📝 Assessments" → navigates to `/course/:courseId?tab=assessments`
5. **Delete Course:** 
   - Click "Delete" → confirmation dialog → calls `apiClient.deleteCourse()`
   - Refreshes course list

### Navigation
- **CourseCard "View & Chat":** → `/course/:courseId`
- **CourseCard "Assessments":** → `/course/:courseId?tab=assessments`

---

## 📄 Page 4: CourseDetail (`/course/:courseId`)

**Route:** `/course/:courseId`  
**File:** `src/pages/CourseDetail.tsx`  
**Purpose:** Main course page - manage documents, chat with AI, view documents, take assessments

### Layout Structure
```
┌─────────────────────────────────────────────────────────┐
│              TopActionBar (Header)                       │
├──────────────┬──────────────────────────────────────────┤
│              │                                          │
│ DocumentSide│  Main Content Area                       │
│ bar (Left)  │  - UploadDropzone (top)                  │
│              │  - CourseChatAssistant (bottom)          │
│              │                                          │
└──────────────┴──────────────────────────────────────────┘
```

### Components Used

#### Course-Specific Components
- **`TopActionBar`** (`components/course/TopActionBar.tsx`)
  - Top header bar with course name
  - Back button (navigates to Dashboard)
  - "📝 Assessments" button (opens assessment view)
  - Fixed height: 64px with backdrop blur

- **`DocumentSidebar`** (`components/course/DocumentSidebar.tsx`)
  - Left sidebar (280px width) listing all documents
  - Shows document count and upload status
  - Clickable document items (only if processing completed)
  - Visual indicators: file type icons, processing status
  - Highlights selected document

- **`UploadDropzone`** (`components/course/UploadDropzone.tsx`)
  - Drag-and-drop file upload area
  - Click to browse files
  - Shows "Uploading..." state
  - Accepts: PDF, DOCX, PPTX, images, media, etc.
  - Positioned at top of main content area

- **`CourseChatAssistant`** (`components/course/CourseChatAssistant.tsx`)
  - ChatGPT-style chat interface
  - Message list with scroll-to-bottom
  - Input field with send button
  - Empty state when no messages
  - Uses `MessageBubble` for individual messages
  - Positioned below UploadDropzone

#### Document Viewers (Conditional - Full Screen)
These components replace the entire page when a document is selected:

- **`PDFViewer`** (`components/viewers/PDFViewer.tsx`)
  - Full-screen PDF viewer with zoom controls
  - Page navigation, text selection
  - Right sidebar with chat interface
  - Left sidebar with course navigation
  - Supports multiple documents navigation
  - Text highlighting and "Add to chat" feature

- **`DocxViewer`** (`components/viewers/DocxViewer.tsx`)
  - Displays DOCX/DOC files
  - Renders document content
  - Chat sidebar for questions

- **`PptxViewer`** (`components/viewers/PptxViewer.tsx`)
  - Displays PPTX/PPT presentations
  - Slide navigation
  - Chat sidebar

- **`ImageViewer`** (`components/viewers/ImageViewer.tsx`)
  - Displays images (PNG, JPG, JPEG, SVG)
  - Zoom and pan controls
  - Chat sidebar

- **`MediaViewer`** (`components/viewers/MediaViewer.tsx`)
  - Displays audio/video files (MP3, WAV, MP4, WEBM)
  - Media player controls
  - Chat sidebar

- **`DocumentViewer`** (`components/viewers/DocumentViewer.tsx`)
  - Generic viewer for other file types (TXT, RTF, CSV, etc.)
  - Text-based content display
  - Chat sidebar

#### Assessment Components (Conditional View)
Shown when user clicks "Assessments" button:

- **`MCQAssessment`** (`components/assessments/MCQAssessment.tsx`)
  - Multiple Choice Questions interface
  - Generates and displays MCQ questions
  - Answer selection and submission
  - Results display

- **`OpenEndedAssessment`** (`components/assessments/OpenEndedAssessment.tsx`)
  - Open-ended questions interface
  - Text input for answers
  - AI evaluation of responses

#### UI Components
- **`LoadingSpinner`** (`components/ui/LoadingSpinner.tsx`)
  - Full-screen spinner while loading course data

- **`Alert`** (`components/ui/Alert.tsx`)
  - Error messages for upload/API failures
  - Dismissible notifications

- **`Card`** (`components/ui/Card.tsx`)
  - Container for assessment view
  - Wraps assessment tabs and content

- **`Tabs`** (`components/ui/Tabs.tsx`)
  - Tab switcher for assessments
  - Tabs: "✓ Multiple Choice" and "✍️ Open-Ended"
  - Only visible in assessment view

### State Management
- `course` - Current course data
- `documents` - Array of all documents in course
- `loading` - Loading state while fetching course/documents
- `error` - Error messages
- `uploading` - Upload progress state
- `selectedDocument` - Currently selected document (null = no document)
- `messages` - Chat message history
- `inputMessage` - Current chat input text
- `sending` - Chat message sending state
- `conversationId` - Current conversation ID for chat continuity
- `showAssessments` - Toggle for assessment view
- `assessmentSubTab` - Current assessment tab ('mcq' | 'open-ended')

### User Interactions

#### Default View (No Document Selected)
1. **Upload Document:**
   - Drag file or click UploadDropzone
   - File validated → uploaded via `apiClient.uploadDocument()`
   - Document list refreshes
   - Shows "Processing" status until ready

2. **Chat with AI:**
   - Type message in CourseChatAssistant
   - Send → calls `apiClient.sendMessage()`
   - Response appears in chat
   - Conversation ID maintained for context

3. **Select Document:**
   - Click document in DocumentSidebar (if completed)
   - Page switches to full-screen document viewer

#### Document Viewer View
1. **View Document:**
   - Document renders in appropriate viewer (PDF/DOCX/etc.)
   - Can interact with document (zoom, scroll, etc.)

2. **Chat About Document:**
   - Right sidebar chat (in PDFViewer)
   - Ask questions about specific document
   - Text selection → "Add to chat" feature

3. **Close Document:**
   - Click close/back → returns to default view
   - `selectedDocument` set to null

#### Assessment View
1. **Open Assessments:**
   - Click "📝 Assessments" in TopActionBar
   - Page switches to assessment view

2. **Switch Tabs:**
   - Click between "Multiple Choice" and "Open-Ended"
   - Different assessment component renders

3. **Take Assessment:**
   - Generate questions
   - Answer questions
   - Submit for evaluation

### Navigation
- **TopActionBar "Back":** → `/` (Dashboard)
- **TopActionBar "Assessments":** → Toggles assessment view (same route, different state)
- **Document Click:** → Full-screen viewer (same route, different state)
- **Close Document:** → Returns to default view

### Conditional Rendering Logic
```typescript
if (loading) → LoadingSpinner
if (!course) → Error Alert
if (showAssessments) → Assessment View
if (selectedDocument) → Document Viewer (PDF/DOCX/etc.)
else → Default View (UploadDropzone + Chat)
```

---

## 🧩 Component Categories Reference

### Layout Components (`components/layout/`)
- **`PageLayout`** - Page wrapper with background and padding
- **`PageHeader`** - Page title and subtitle header

### UI Components (`components/ui/`)
- **`Button`** - Reusable button with variants (primary, secondary, success, error, ghost)
- **`Input`** - Form input with label support
- **`Card`** - Container card with padding and hover effects
- **`Alert`** - Notification messages (error, success, info)
- **`LoadingSpinner`** - Loading indicator (full-screen or inline)
- **`Tabs`** - Tab switcher component

### Dashboard Components (`components/dashboard/`)
- **`CourseCard`** - Course display card with actions
- **`CreateCourseForm`** - Form to create new courses

### Course Components (`components/course/`)
- **`TopActionBar`** - Course page header with actions
- **`DocumentSidebar`** - Left sidebar with document list
- **`UploadDropzone`** - File upload area
- **`CourseChatAssistant`** - Main chat interface
- **`MessageBubble`** - Individual chat message display
- **`DocumentCard`** - Document display card (if used)
- **`ChatTab`** - Chat tab component (if used)
- **`DocumentsTab`** - Documents tab component (if used)
- **`AssessmentsTab`** - Assessments tab component (if used)

### Document Viewers (`components/viewers/`)
- **`PDFViewer`** - PDF document viewer with chat
- **`DocxViewer`** - DOCX document viewer
- **`PptxViewer`** - PPTX presentation viewer
- **`ImageViewer`** - Image viewer
- **`MediaViewer`** - Audio/video player
- **`DocumentViewer`** - Generic text document viewer

### Assessment Components (`components/assessments/`)
- **`MCQAssessment`** - Multiple choice questions
- **`OpenEndedAssessment`** - Open-ended questions

### Shared Components (`components/shared/`)
- **`MarkdownMessage`** - Renders markdown in chat messages
- **`CourseNavigationSidebar`** - Course navigation sidebar (used in PDFViewer)

---

## 🔄 Data Flow Patterns

### Authentication Flow
```
Login/Register Page
    ↓ (submit form)
AuthContext.login/register()
    ↓ (API call)
Backend validates
    ↓ (success)
Token saved → User state updated
    ↓
Redirect to Dashboard
```

### Course Management Flow
```
Dashboard
    ↓ (load)
apiClient.getCourses()
    ↓
Display CourseCard components
    ↓ (click course)
Navigate to CourseDetail
```

### Document Upload Flow
```
CourseDetail
    ↓ (upload file)
UploadDropzone → handleFileUpload()
    ↓
apiClient.uploadDocument()
    ↓
Backend processes file
    ↓
loadDocuments() → Refresh list
    ↓
Document appears in DocumentSidebar
```

### Chat Flow
```
CourseDetail / PDFViewer
    ↓ (send message)
handleSendMessage()
    ↓
apiClient.sendMessage()
    ↓
Backend RAG processing
    ↓
Response with sources
    ↓
Add to messages array
    ↓
CourseChatAssistant displays
```

### Document Viewing Flow
```
CourseDetail
    ↓ (click document)
handleDocumentClick()
    ↓
setSelectedDocument()
    ↓
Conditional render → PDFViewer/DocxViewer/etc.
    ↓ (close)
setSelectedDocument(null)
    ↓
Return to CourseDetail default view
```

---

## 📝 Quick Reference

### Page Routes
- `/login` → Login page
- `/register` → Register page
- `/` → Dashboard (protected)
- `/course/:courseId` → CourseDetail (protected)
- `/course/:courseId?tab=assessments` → CourseDetail in assessment mode

### Key State Variables
- **Auth:** `user`, `token` (from AuthContext)
- **Dashboard:** `courses`, `showCreateForm`
- **CourseDetail:** `course`, `documents`, `selectedDocument`, `messages`, `showAssessments`

### API Calls
- `apiClient.getCourses()` - Fetch all courses
- `apiClient.createCourse()` - Create new course
- `apiClient.deleteCourse()` - Delete course
- `apiClient.getCourse(id)` - Get course details
- `apiClient.getDocuments(courseId)` - Get course documents
- `apiClient.uploadDocument(courseId, file)` - Upload document
- `apiClient.sendMessage(courseId, message)` - Send chat message

### Component Import Patterns
```typescript
// UI Components
import { Button, Input, Card, Alert } from '../components/ui';

// Layout Components
import { PageLayout, PageHeader } from '../components/layout';

// Feature Components
import { CourseCard } from '../components/dashboard';
import { TopActionBar, DocumentSidebar } from '../components/course';

// Document Viewers
import { PDFViewer, DocxViewer, ImageViewer } from '../components/viewers';

// Assessment Components
import { MCQAssessment, OpenEndedAssessment } from '../components/assessments';

// Shared Components
import { MarkdownMessage, CourseNavigationSidebar } from '../components/shared';
```

---

## 🎯 Usage Tips

1. **Finding Components:** Use this document to locate which page uses which components
2. **Understanding Flow:** Follow the data flow patterns to see how state moves through the app
3. **Adding Features:** Check existing patterns before adding new components
4. **Debugging:** Use the state management sections to understand what data each page manages
5. **Navigation:** Reference the navigation sections to understand routing

---

**Last Updated:** Generated from codebase analysis  
**Maintained By:** Frontend Development Team

