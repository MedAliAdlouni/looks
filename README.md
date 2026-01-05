# Mohammed Ali El Adlouni — Curriculum-Aligned AI Tutor Project

**Project Name:** Curriculum-Aligned AI Tutor  
**Role:** Founder / Product Designer / Lead Developer  
**Target Audience:** Initially Middle & High School students; scalable to college, university, and self-taught learners  
**Goal:** Develop an AI tutoring platform that enables students to study and solve exercises strictly based on their own course materials, enhancing comprehension, active recall, and problem-solving while remaining fully curriculum-aligned.  

---

## 🌟 Project Overview

- AI tutor platform where students can **create courses** (e.g., Math, History, Dermatology) and upload **all course material** (PDF, Word, etc.).  
- The system **restricts AI responses strictly to the uploaded materials** to:
  - Prevent hallucinations  
  - Follow teacher- or material-specific problem-solving methods  
  - Provide **cited references** for all answers  
- **Three interactive learning modes**:
  1. **Material Understanding:** Students read documents while a side chatbot answers questions or allows students to select specific paragraphs for targeted queries. The system can generate MCQs or open-ended questions to self-test comprehension.  
  2. **Problem-Solving Mode:** Students drop problems into the chat or select them from the course material. The AI guides them step-by-step, referencing relevant sections of the course. If an answer isn’t present in the material, the AI alerts the student immediately.  
  3. **Audio Teacher-Student Simulation:** AI plays the role of a student asking the human learner questions to activate **active learning**, reinforcing memory retention and concept mastery.  

- Designed to **simulate a human tutor**, providing:
  - Stepwise guidance  
  - Hint scaffolding  
  - Pedagogically sound questioning  
  - Feedback based on material context  

---

## 🔑 Key Features

**1. Dashboard & Course Management**
- Create, edit, and organize courses  
- Upload multiple materials per course (PDF, Word, etc.)  
- Track progress by course and mode  

**2. Material Understanding**
- Interactive side-chatbot  
- Targeted paragraph-level questions  
- Automatic generation of:
  - MCQs for practice  
  - Open-ended comprehension questions  
- Highlights key concepts for review  

**3. Problem-Solving Mode**
- Drop or select exercises from course material  
- AI guides through problem-solving **using only the course content**  
- Scaffolding: hint → guided solution → full solution  
- Alerts if problem solution is not in course material  

**4. Audio Mode / Active Learning**
- AI simulates a student asking the learner questions  
- Focuses on **active recall and metacognition**  
- Can dynamically adjust question difficulty based on learner responses  

**5. Pedagogical Principles**
- Curriculum-aligned tutoring  
- Active recall and spaced repetition  
- Scaffolding and guided problem-solving  
- Metacognition and reflection  
- Dual-phase learning: comprehension + exercises  

---

## 🧰 Technical Stack (MVP)

- **Frontend:** React + Next.js, TailwindCSS, Shadcn/UI  
- **Backend API:** FastAPI (Python) — async orchestration, RAG, LLM integration  
- **PDF/Word Processing:** `pypdf`, `pdfplumber`, `python-docx`  
- **Vector Database:** Qdrant (for embeddings & retrieval)  
- **Embedding Models:** OpenAI `text-embedding-3-large` or open-source BGE models  
- **LLM Integration:** GPT-4 / Claude / Gemini, strictly retrieval-augmented  
- **Audio Mode:** Text-to-speech (TTS) + speech-to-text (STT) for interactive AI conversations  
- **Database:** PostgreSQL (users, courses, material metadata, progress)  
- **Auth & Security:** Supabase/Auth0/Clerk (secure login, privacy compliance for minors)  

---

## 🚀 Core Innovations & Differentiators

- **Strict Curriculum Alignment:** AI only uses the uploaded course materials, ensuring teacher-approved methods are followed.  
- **Interactive, Multi-Modal Learning:** Combines text, chat, and audio interactions for active learning.  
- **Pedagogically Driven:** Scaffolding, MCQs, open-ended questions, and active recall embedded in all learning modes.  
- **Transparent & Traceable:** AI cites material references for every answer.  
- **Adaptive Student Support:** Guides the learner through material comprehension and problem-solving while respecting their pace.  

---

## 🏆 MVP Milestones

1. **Course & Material Upload:** Multi-format support (PDF, Word)  
2. **Material Understanding Mode:** Chatbot answers + paragraph selection + automatic question generation  
3. **Problem-Solving Mode:** Guided solutions with curriculum restrictions  
4. **Audio Mode:** AI simulates student questioning for active recall  
5. **Future Enhancements:**  
   - Teacher dashboards  
   - Analytics for student progress  
   - Multi-subject and multi-level expansion  

---

## 📊 Competitive Landscape

| Product | Material Upload | AI Q&A | Curriculum Restricted | Multi-Modal / Audio | Pedagogical Alignment |
|---------|----------------|--------|----------------------|-------------------|---------------------|
| Google NotebookLM | ✅ | ✅ | Partial | ✖ | Limited |
| TurboLearn / StudyFetch | ✅ | ✅ | Limited | ✖ | Basic |
| QANDA | ❌ | ✅ | ✖ | ✖ | Minimal |
| Brainly | ❌ | ✅ | ✖ | ✖ | Minimal |
| Moodle + AI Plugins | ✅ | ✅ | Partial | ✖ | Partial |
| **Your AI Tutor** | ✅ | ✅ | ✅ | ✅ | ✅ |

**White Space:** No product currently combines **strict teacher-material grounding, multi-modal learning, and interactive pedagogy** in one platform.

---

## 💡 Expected Impact

- Enhances student comprehension and retention by enforcing **curriculum-aligned, active learning**  
- Provides teachers with a trustworthy AI tutor for student practice  
- Reduces hallucination risk and off-curriculum guidance  
- Scales from middle/high school to higher education and self-learning  
