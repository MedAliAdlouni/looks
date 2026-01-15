# Curriculum AI Tutor - Frontend

Simple React + TypeScript frontend for testing the Curriculum AI Tutor backend.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:3000`

## Features

- **Authentication**: Login and Register pages
- **Course Management**: View, create, and delete courses
- **API Integration**: Full integration with backend API
- **Protected Routes**: Automatic redirect to login if not authenticated

## API Configuration

The frontend is configured to proxy API requests to `http://localhost:8000` (the backend server). Make sure your backend is running before starting the frontend.

## Project Structure

```
frontend/
├── src/
│   ├── api/          # API client
│   ├── context/      # React contexts (Auth)
│   ├── pages/        # Page components
│   ├── types/        # TypeScript types
│   ├── App.tsx       # Main app component
│   └── main.tsx      # Entry point
├── index.html
└── package.json
```

