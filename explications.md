# Explications.md - Understanding the Technical Choices

This document explains the technical concepts and choices made in the MVP README. It's designed to help you understand **why** each technology was chosen and **how** it works.

---

## Table of Contents
1. [RAG Pipeline Architecture](#rag-pipeline-architecture)
2. [TypeScript vs JavaScript](#typescript-vs-javascript)
3. [Next.js Framework](#nextjs-framework)
4. [Tailwind CSS](#tailwind-css)
5. [shadcn/ui Component Library](#shadcnui-component-library)
6. [react-pdf for PDF Rendering](#react-pdf-for-pdf-rendering)
7. [State Management & React Hooks](#state-management--react-hooks)
8. [Database Migrations with Alembic](#database-migrations-with-alembic)
9. [Pinecone Vector Database](#pinecone-vector-database)
10. [Local Filesystem Storage](#local-filesystem-storage)
11. [PyMuPDF for PDF Processing](#pymupdf-for-pdf-processing)
12. [JWT Token Authentication](#jwt-token-authentication)
13. [Data Storage Architecture](#data-storage-architecture)
14. [Adding Features Post-MVP](#adding-features-post-mvp)

---

## RAG Pipeline Architecture

### What is RAG?

**RAG = Retrieval-Augmented Generation**

It's a technique that combines:
1. **Retrieval**: Finding relevant information from a knowledge base
2. **Augmentation**: Adding that information to an LLM prompt
3. **Generation**: LLM generates an answer based on the provided context

### Why Manual Implementation?

The README proposes building the RAG pipeline manually (chunking, embedding, vector DB, retrieval) rather than using managed services like LlamaIndex or OpenAI Assistants API.

**Reasons:**

**1. Cost Control**
- Managed services charge per API call, storage, and usage
- Manual implementation: you pay only for embeddings ($0.02 per 1M tokens) and Claude API calls
- At scale (1000+ students), cost difference is 10x-50x

**2. Full Control**
- You control chunking strategy (semantic vs fixed-size)
- You control retrieval logic (top-k, similarity thresholds)
- You control prompt engineering (how context is formatted)
- You can optimize for your specific use case (educational content)

**3. Customization**
- Can implement custom features like:
  - Chunk by section/paragraph instead of token count
  - Weight recent documents higher
  - Filter by document type
  - Add metadata-based filtering (page number, section)

**4. Learning**
- Understanding RAG deeply helps you debug issues
- When retrieval fails, you know exactly why
- You can explain to investors/users how the system works

**5. Vendor Independence**
- Not locked into OpenAI, Pinecone, or any specific service
- Can swap vector DB (Pinecone → ChromaDB) easily
- Can swap LLM (Claude → GPT-4) easily
- Can swap embedding model (OpenAI → Voyage AI) easily

### The RAG Pipeline Flow

```
User Question: "What is mitosis?"
        ↓
1. EMBEDDING GENERATION
   - Convert question to vector: [0.23, -0.45, 0.67, ..., 0.12] (1536 dimensions)
   - Uses OpenAI text-embedding-3-small model
   - Cost: ~$0.00002 per question
        ↓
2. VECTOR SEARCH (Retrieval)
   - Search Pinecone for similar vectors
   - Returns top 5 most relevant chunks
   - Each chunk has: text, page number, similarity score (0-1)
        ↓
3. CONTEXT FORMATTING (Augmentation)
   - Format chunks into prompt:
     """
     Course Material:
     [Page 47] Mitosis is the process of cell division...
     [Page 48] The stages of mitosis include...
     
     Question: What is mitosis?
     """
        ↓
4. LLM GENERATION
   - Send prompt to Claude
   - Claude reads context, generates answer
   - Cites page numbers from context
        ↓
5. RESPONSE
   - "According to page 47, mitosis is..."
   - Return answer + source chunks to frontend
```

### Alternative: Managed RAG Services

**LlamaIndex**
- Python library that abstracts RAG pipeline
- Automatic chunking, embedding, retrieval
- 5 lines of code instead of 500
- Less control, some vendor lock-in

**OpenAI Assistants API**
- Upload PDFs to OpenAI
- They handle everything (storage, chunking, retrieval, generation)
- Zero code for RAG
- Expensive ($0.20/GB/day storage), complete OpenAI lock-in

**Why we chose manual implementation:** Balance of control, cost, and learning value.

---

## TypeScript vs JavaScript

### JavaScript Example

```javascript
function calculateGrade(score) {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  return "C";
}

// Problem: No type checking
calculateGrade("eighty"); // Returns "C" - bug!
calculateGrade([80, 90]); // Returns "C" - bug!
calculateGrade(); // Returns "C" - bug!

// Problem: No IDE help
const result = calculateGrade(85);
result.toUpperCase(); // Works
result.toLowerCase(); // Works
result.sort(); // Crashes at runtime! strings don't have sort()
```

### TypeScript Example

```typescript
function calculateGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  return "C";
}

// Type errors caught BEFORE running:
calculateGrade("eighty"); // ❌ ERROR: Argument of type 'string' is not assignable to parameter of type 'number'
calculateGrade([80, 90]); // ❌ ERROR: Argument of type 'number[]' is not assignable to parameter of type 'number'
calculateGrade(); // ❌ ERROR: Expected 1 argument, but got 0

// IDE knows result is a string:
const result = calculateGrade(85); // result: string
result.toUpperCase(); // ✅ IDE autocompletes, knows this exists
result.toLowerCase(); // ✅ IDE autocompletes
result.sort(); // ❌ ERROR: Property 'sort' does not exist on type 'string'
```

### Why TypeScript?

**1. Catch Bugs Early**
- 15-20% of JavaScript bugs are type-related
- TypeScript catches these while you type, not at runtime
- Example: Passing wrong prop to React component

**2. Better IDE Experience**
- Autocomplete knows what properties/methods exist
- Jump to definition works perfectly
- Refactoring is safer (rename updates everywhere)

**3. Self-Documenting Code**
```typescript
// JavaScript - what does this function expect?
function createUser(data) {
  // ???
}

// TypeScript - crystal clear
interface UserData {
  email: string;
  password: string;
  fullName?: string; // Optional
}

function createUser(data: UserData): User {
  // Implementation
}
```

**4. Team Collaboration**
- New developers understand code faster
- API contracts are explicit
- Less "what does this function return?" questions

**5. Industry Standard**
- 80%+ of React jobs require TypeScript
- Major companies (Google, Microsoft, Airbnb) use it
- Better for long-term maintainability

### The Learning Curve

**Week 1:** Frustrating (syntax errors everywhere)
**Week 2:** Annoying (still fighting types)
**Week 3:** Neutral (getting used to it)
**Week 4:** Helpful (types catch actual bugs)
**Week 8:** Love it (can't imagine going back)

---

## Next.js Framework

### Plain React vs Next.js

**Plain React (Create React App):**
```
my-app/
├── src/
│   ├── App.js
│   ├── Dashboard.js
│   └── Login.js
├── public/
└── package.json

# Routing requires React Router
import { BrowserRouter, Routes, Route } from 'react-router-dom';

<Routes>
  <Route path="/" element={<Home />} />
  <Route path="/dashboard" element={<Dashboard />} />
</Routes>
```

**Next.js (App Router):**
```
my-app/
├── app/
│   ├── page.tsx              # Route: /
│   ├── dashboard/
│   │   └── page.tsx          # Route: /dashboard
│   └── courses/
│       └── [id]/
│           └── page.tsx      # Route: /courses/:id
└── package.json

# No routing library needed! File = Route
```

### Why Next.js?

**1. File-Based Routing**
- Create file → automatic route
- No router configuration
- Less boilerplate

**2. Server-Side Rendering (SSR)**
```typescript
// This runs on the server before sending HTML to browser
export default async function CoursePage({ params }) {
  // Fetch data on server
  const course = await fetchCourse(params.id);
  
  // HTML is generated with data already in it
  return <div>{course.name}</div>;
}
```

**Benefits:**
- Faster first page load (HTML arrives with content)
- Better SEO (search engines see full content)
- No loading spinners on initial load

**3. API Routes Built-In**
```typescript
// app/api/courses/route.ts
export async function GET() {
  const courses = await db.courses.findAll();
  return Response.json(courses);
}

// Accessible at: /api/courses
```

You can build frontend + backend in same project (though README separates them).

**4. Optimizations Out of the Box**
- Automatic code splitting (only loads JS needed for current page)
- Image optimization (automatic resize, WebP conversion)
- Font optimization (self-hosts Google Fonts)

**5. Production-Ready**
- Used by Netflix, Twitch, Nike, Uber
- Deploys to Vercel in 30 seconds
- Automatic HTTPS, CDN, caching

**6. TypeScript Support**
- First-class TypeScript support
- Type-safe routing, API routes

### Server Components vs Client Components

Next.js 14 introduces React Server Components:

**Server Component (default):**
```tsx
// app/courses/page.tsx
// Runs on server only, never sent to browser

export default async function CoursesPage() {
  const courses = await db.courses.findAll(); // Direct DB access!
  return <div>{courses.map(c => <CourseCard course={c} />)}</div>;
}
```

**Client Component (when needed):**
```tsx
// components/ChatInterface.tsx
'use client'; // Marks as client component

import { useState } from 'react';

export default function ChatInterface() {
  const [message, setMessage] = useState(''); // Needs state = client
  return <input value={message} onChange={e => setMessage(e.target.value)} />;
}
```

**Rule of thumb:**
- Default to server components (faster, smaller bundle)
- Use client components when you need: hooks, event handlers, browser APIs

---

## Tailwind CSS

### Traditional CSS Approach

**styles.css:**
```css
.card {
  background-color: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.card-title {
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 8px;
}

.card-description {
  color: #666;
  font-size: 14px;
}
```

**HTML:**
```html
<div class="card">
  <h2 class="card-title">Biology 101</h2>
  <p class="card-description">Introduction to cellular biology</p>
</div>
```

**Problems:**
- Need to switch between files (CSS ↔ HTML)
- Naming is hard (BEM, OOCSS, SMACSS conventions)
- CSS grows over time, never deleted (scared to remove)
- Hard to find what styles apply to an element

### Tailwind CSS Approach

**No CSS file needed:**
```html
<div class="bg-white rounded-lg p-4 shadow-md">
  <h2 class="text-xl font-bold mb-2">Biology 101</h2>
  <p class="text-gray-600 text-sm">Introduction to cellular biology</p>
</div>
```

**Class meanings:**
- `bg-white` → `background-color: white`
- `rounded-lg` → `border-radius: 8px`
- `p-4` → `padding: 16px` (1 unit = 4px)
- `shadow-md` → box-shadow preset
- `text-xl` → `font-size: 20px`
- `font-bold` → `font-weight: 700`
- `mb-2` → `margin-bottom: 8px`
- `text-gray-600` → `color: #718096`
- `text-sm` → `font-size: 14px`

### Why Tailwind?

**1. Speed**
- No context switching (HTML + styles in one place)
- No naming decisions (just compose utilities)
- Copy-paste components work immediately

**2. Consistency**
- Predefined spacing scale: 0, 1, 2, 3, 4, 6, 8, 10, 12, 16...
- Predefined color palette
- No more "should this be 15px or 16px?"

**3. Responsive Design Built-In**
```html
<div class="w-full md:w-1/2 lg:w-1/3">
  <!-- Full width on mobile, half on tablet, third on desktop -->
</div>
```

**4. Smaller CSS Bundle**
- Traditional CSS: grows to 100KB+ (all styles, even unused)
- Tailwind: tree-shakes unused classes → 10-20KB
- Only ships CSS you actually use

**5. No Dead Code**
- Delete HTML element → associated styles gone
- Traditional CSS: never sure if safe to delete `.card` class

### Learning Curve

**Day 1:** "This is ugly, I miss CSS"
**Day 3:** "Starting to remember common classes"
**Day 7:** "This is actually faster"
**Day 14:** "Can't imagine going back"

**Pro tip:** Keep Tailwind docs open, Cmd+F for what you need.

---

## shadcn/ui Component Library

### Traditional Component Libraries

**Material-UI (MUI):**
```bash
npm install @mui/material @emotion/react @emotion/styled
# Installs 5MB of dependencies
```

```tsx
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';

<Button variant="contained" color="primary">
  Click me
</Button>
```

**Problems:**
- Large bundle size (even if you use 3 components)
- Hard to customize (need to override theme deeply)
- Vendor lock-in (components live in node_modules)
- Version upgrades break things

### shadcn/ui Approach

**Installation:**
```bash
npx shadcn-ui@latest init
# Sets up Tailwind + config

npx shadcn-ui@latest add button
# Copies button component into YOUR codebase
```

**What happens:**
```
src/
└── components/
    └── ui/
        └── button.tsx  # Full source code, in YOUR repo!
```

**Usage:**
```tsx
import { Button } from "@/components/ui/button"

<Button variant="destructive" size="lg">
  Delete Account
</Button>
```

### Why shadcn/ui?

**1. You Own the Code**
- Component source is in YOUR project
- Edit freely, no version conflicts
- No dependency in package.json

**2. Built on Radix UI**
- Radix provides unstyled, accessible primitives
- shadcn adds beautiful Tailwind styling
- Best of both worlds: accessible + pretty

**3. Composition, Not Installation**
```bash
# Need dialog?
npx shadcn-ui add dialog

# Need dropdown menu?
npx shadcn-ui add dropdown-menu

# Only install what you use
```

**4. Copy-Paste Friendly**
- Find a component you like
- Copy the code
- Paste into your project
- Modify as needed

**5. Tailwind Integration**
- Uses same design tokens as your Tailwind config
- Consistent spacing, colors, shadows
- Easy to theme

### Example: Button Component

**What gets added to your project:**
```tsx
// src/components/ui/button.tsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)

export { Button, buttonVariants }
```

Now you can:
- Read the code and understand it
- Modify the variants
- Add new sizes/variants
- Change colors
- No "how do I override MUI styles?" stackoverflow searches

---

## react-pdf for PDF Rendering

### The Problem

Browsers have built-in PDF viewers, but:
- Can't control programmatically
- Can't highlight specific text
- Can't jump to specific page from React
- Can't embed in your UI

### PDF Rendering Options

**1. iframe (simplest)**
```html
<iframe src="/uploads/document.pdf#page=5" width="100%" height="600px"></iframe>
```
- **Pros:** Zero setup
- **Cons:** No programmatic control, browser-dependent UI

**2. PDF.js (Mozilla's library)**
- What Firefox uses for PDF rendering
- Low-level API, full control
- **Pros:** Most powerful, best text selection
- **Cons:** Steep learning curve, verbose API

**3. react-pdf (wrapper around PDF.js)**
```tsx
import { Document, Page } from 'react-pdf';

<Document file="/uploads/document.pdf">
  <Page pageNumber={currentPage} />
</Document>
```
- **Pros:** React-friendly API, most popular (1.5M downloads/week)
- **Cons:** Some quirks with text selection

### Why react-pdf?

**1. React Integration**
- Uses React components (fits your mental model)
- Props for configuration
- Hooks for events

**2. Features Needed for MVP**
- Render specific page: `<Page pageNumber={5} />`
- Handle loading states
- Navigate between pages
- Scale/zoom

**3. Community & Support**
- Active maintenance
- Good documentation
- Lots of Stack Overflow answers

**4. Free & Open Source**
- MIT license
- No usage limits
- No API keys needed

### react-pdf Limitations

**1. Text Selection**
- Can be buggy with complex layouts
- Sometimes doesn't align perfectly with rendered text

**2. Performance**
- Large PDFs (500+ pages) can be slow
- Need to implement pagination (don't render all pages at once)

**3. Annotations**
- No built-in support for highlighting, comments
- Need additional library for that

**For MVP:** These limitations don't matter. You just need basic page rendering + navigation.

### Implementation Example

```tsx
'use client';

import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Need to configure worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

export default function PDFViewer({ documentUrl, currentPage, onPageChange }) {
  const [numPages, setNumPages] = useState(null);

  return (
    <div className="pdf-viewer">
      <Document
        file={documentUrl}
        onLoadSuccess={({ numPages }) => setNumPages(numPages)}
        loading={<div>Loading PDF...</div>}
        error={<div>Failed to load PDF</div>}
      >
        <Page
          pageNumber={currentPage}
          renderTextLayer={true}
          renderAnnotationLayer={true}
        />
      </Document>
      
      <div className="controls">
        <button 
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
        >
          Previous
        </button>
        <span>Page {currentPage} of {numPages}</span>
        <button 
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= numPages}
        >
          Next
        </button>
      </div>
    </div>
  );
}
```

---

## State Management & React Hooks

### What is State?

**State = data that changes over time in your application**

Examples:
- User is logged in: `true` or `false`
- Current page of PDF: `1`, `2`, `3`, ...
- Chat messages: `[]`, `[{...}]`, `[{...}, {...}]`
- Form input value: `""`, `"Hello"`, `"Hello World"`

### Without React (Manual DOM Manipulation)

```javascript
let count = 0;

function increment() {
  count = count + 1;
  // Manually update DOM
  document.getElementById('count').textContent = count;
}

// HTML: <div id="count">0</div>
// Problem: Tedious, error-prone, hard to maintain
```

### With React Hooks

```tsx
import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);
  
  return (
    <div>
      <p>{count}</p>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
}

// React automatically updates DOM when count changes
```

### Core React Hooks

**1. useState - Store data**
```tsx
const [value, setValue] = useState(initialValue);

// Example: Form input
const [email, setEmail] = useState('');
<input value={email} onChange={e => setEmail(e.target.value)} />
```

**2. useEffect - Run code when something changes**
```tsx
useEffect(() => {
  // This runs when 'count' changes
  console.log(`Count is now ${count}`);
}, [count]); // Dependency array
```

**3. useContext - Share data across components**
```tsx
// Without context: pass props down multiple levels
<App>
  <Dashboard user={user}>
    <Sidebar user={user}>
      <Profile user={user} />  // Annoying!
    </Sidebar>
  </Dashboard>
</App>

// With context: access anywhere
const AuthContext = createContext();

function App() {
  const [user, setUser] = useState(null);
  return (
    <AuthContext.Provider value={{ user, setUser }}>
      <Dashboard />
    </AuthContext.Provider>
  );
}

function Profile() {
  const { user } = useContext(AuthContext); // Direct access!
  return <div>{user.name}</div>;
}
```

**4. useRef - Reference DOM elements**
```tsx
const inputRef = useRef(null);

<input ref={inputRef} />
<button onClick={() => inputRef.current.focus()}>
  Focus Input
</button>
```

**5. Custom Hooks - Reusable logic**
```tsx
function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (token) {
      fetchUser(token).then(setUser);
    }
    setLoading(false);
  }, []);
  
  return { user, loading };
}

// Use in any component
function Dashboard() {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  return <div>Welcome {user.name}</div>;
}
```

### State Management in Your App

**Component-Level State (useState):**
```tsx
function ChatInterface() {
  const [message, setMessage] = useState(''); // Local to this component
  const [messages, setMessages] = useState([]);
  
  const sendMessage = () => {
    setMessages([...messages, { text: message, role: 'user' }]);
    setMessage(''); // Clear input
  };
}
```

**App-Level State (Context):**
```tsx
// src/contexts/AuthContext.tsx
export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  
  const login = async (email, password) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('token', data.token);
  };
  
  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
  };
  
  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Use anywhere in app
function Navbar() {
  const { user, logout } = useContext(AuthContext);
  return (
    <nav>
      <span>{user?.email}</span>
      <button onClick={logout}>Logout</button>
    </nav>
  );
}
```

### Why Hooks?

**Before Hooks (Class Components):**
```tsx
class Counter extends React.Component {
  constructor(props) {
    super(props);
    this.state = { count: 0 };
    this.increment = this.increment.bind(this); // Annoying!
  }
  
  increment() {
    this.setState({ count: this.state.count + 1 });
  }
  
  render() {
    return (
      <button onClick={this.increment}>
        {this.state.count}
      </button>
    );
  }
}
```

**With Hooks (Functional Components):**
```tsx
function Counter() {
  const [count, setCount] = useState(0);
  return (
    <button onClick={() => setCount(count + 1)}>
      {count}
    </button>
  );
}
```

**Benefits:**
- Less boilerplate
- No `this` keyword confusion
- Easier to test
- Easier to extract reusable logic (custom hooks)

---

## Database Migrations with Alembic

### The Problem

**Scenario:**

**Week 1:** You create database
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255),
  password_hash VARCHAR(255)
);
```

**Week 3:** You need to add `full_name` column

**How do you update the database without losing data?**

```sql
-- Can't just drop and recreate (loses all users!)
DROP TABLE users;
CREATE TABLE users (...);

-- Need to alter:
ALTER TABLE users ADD COLUMN full_name VARCHAR(255);
```

**But:**
- What if you have 3 developers working on different features?
- What if production database needs different changes than local?
- What if you need to roll back a change?
- How do you keep track of schema history?

### Migrations = Version Control for Database Schema

**Alembic creates migration files:**

```python
# migrations/versions/001_create_users.py
def upgrade():
    op.create_table(
        'users',
        sa.Column('id', sa.UUID(), primary_key=True),
        sa.Column('email', sa.String(255)),
        sa.Column('password_hash', sa.String(255))
    )

def downgrade():
    op.drop_table('users')
```

```python
# migrations/versions/002_add_full_name.py
def upgrade():
    op.add_column('users', sa.Column('full_name', sa.String(255)))

def downgrade():
    op.drop_column('users', 'full_name')
```

### How Alembic Works

**1. Track Current Version**
Alembic creates a table: `alembic_version`
```sql
SELECT * FROM alembic_version;
-- version_num
-- 001
```

**2. Apply Migrations**
```bash
# Apply all pending migrations
alembic upgrade head

# Alembic:
# - Checks current version: 001
# - Finds pending migrations: 002
# - Runs 002.upgrade()
# - Updates version to 002
```

**3. Rollback if Needed**
```bash
# Go back one version
alembic downgrade -1

# Alembic:
# - Checks current version: 002
# - Runs 002.downgrade()
# - Updates version to 001
```

### Alembic Workflow

**1. Change your SQLAlchemy model:**
```python
# app/models/user.py
class User(Base):
    __tablename__ = "users"
    id = Column(UUID, primary_key=True)
    email = Column(String(255))
    password_hash = Column(String(255))
    full_name = Column(String(255))  # NEW FIELD
```

**2. Generate migration:**
```bash
alembic revision --autogenerate -m "add full_name to users"

# Alembic compares model to current database
# Generates migration file automatically
```

**3. Review generated migration:**
```python
# migrations/versions/abc123_add_full_name.py
def upgrade():
    op.add_column('users', sa.Column('full_name', sa.String(255)))

def downgrade():
    op.drop_column('users', 'full_name')
```

**4. Apply migration:**
```bash
alembic upgrade head
```

**5. Commit migration file to git:**
```bash
git add migrations/versions/abc123_add_full_name.py
git commit -m "Add full_name field to users"
```

### Why Alembic Specifically?

**1. Official SQLAlchemy Tool**
- Built by same team
- Deep integration with SQLAlchemy
- Understands SQLAlchemy column types

**2. Auto-Generation**
- Compares models to database
- Generates migration automatically
- Saves you from writing SQL by hand

**3. Python-