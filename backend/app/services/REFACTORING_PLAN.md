# Services Refactoring Plan

## Current Structure Analysis

### Files in `app/services/`
```
app/services/
├── __init__.py
├── rag_service.py              (308 lines) - RAG pipeline + Gemini client + prompts + source formatting
├── chat_service.py             (222 lines) - Chat DB ops + source formatting
├── chunking_service.py         (112 lines) - Chunking logic + DB persistence
├── file_extraction_service.py  (415 lines) - Dispatcher + all extractors (docx, pptx, txt, rtf, csv, xlsx)
├── pdf_service.py              (44 lines)  - PDF extraction only
├── docx_viewer_service.py      (187 lines) - DOCX to HTML conversion
├── pptx_viewer_service.py      (72 lines)  - PPTX slide extraction
├── embedding_service.py        (89 lines)  - Embedding creation (single + batch)
├── vector_service.py           (174 lines) - Pinecone operations
└── assessment/                 (not in scope)
    ├── mcq_generator.py
    ├── open_ended_evaluator.py
    └── prompts.py
```

### Dependency Map

**rag_service.py** imports:
- `embedding_service.create_embedding`
- `vector_service.query_vectors`
- `ai_config`, `service_config`
- Exports: `answer_question`, `get_gemini_client` (used by assessment services)

**chat_service.py** imports:
- Models only (Conversation, Message, Document, Chunk)
- Exports: DB operations + `format_sources_for_response`, `format_sources_for_db`

**chunking_service.py** imports:
- Models (Chunk)
- Exports: `chunk_text_parent_child`, `save_chunks_to_db`

**file_extraction_service.py** imports:
- `pdf_service.extract_text_from_pdf`
- Exports: `get_file_type`, `is_*_file`, `extract_text_from_file`, `extract_text_from_*`

**embedding_service.py** imports:
- `ai_config`, `service_config`
- Exports: `create_embedding`, `create_embeddings_batch`

**vector_service.py** imports:
- `ai_config`, `service_config`
- Exports: `store_vectors`, `query_vectors`

**API Usage:**
- `chat.py` → `rag_service.answer_question`, `chat_service.*`
- `documents.py` → `file_extraction_service.*`, `chunking_service.*`, `embedding_service.*`, `vector_service.*`
- `document_viewers.py` → `docx_viewer_service.*`, `pptx_viewer_service.*`
- `assessment.py` → `rag_service.get_gemini_client`

---

## Top 6 Safest Refactors (Highest ROI)

### 1. Extract Prompt Building Functions → `rag/prompts.py`
**Current:** `rag_service.py` has `_build_prompt()`, `_build_prompt_hybrid()`, `_get_verbosity_instruction()`

**Why Safe:**
- ✅ Pure functions (no side effects, no dependencies on state)
- ✅ No external dependencies (only uses `ai_config` constants)
- ✅ Easy to test in isolation
- ✅ Zero behavior change (just moving code)

**ROI:** High - Separates pure prompt logic from orchestration, improves testability

**Files to create:**
- `app/services/rag/prompts.py` - Move `_build_prompt`, `_build_prompt_hybrid`, `_get_verbosity_instruction`

**Impact:** Low risk, high clarity gain

---

### 2. Extract Source Formatting → `rag/sources.py`
**Current:** `rag_service.py` has `_format_sources()` (lines 115-125)

**Why Safe:**
- ✅ Pure function (takes list, returns list)
- ✅ No dependencies on external services
- ✅ Single responsibility (data transformation)
- ✅ Used only by `answer_question` internally

**ROI:** High - Separates data transformation from orchestration

**Files to create:**
- `app/services/rag/sources.py` - Move `_format_sources`

**Impact:** Minimal - only affects internal `rag_service.py` usage

---

### 3. Extract Gemini Client Wrapper → `integrations/gemini_client.py`
**Current:** `rag_service.py` has `get_gemini_client()`, `_GEMINI_CLIENT`, `_list_available_models()`, `_generate_answer_sync()`

**Why Safe:**
- ✅ Isolated integration code (single responsibility)
- ✅ Already used by `assessment` services (proves it's reusable)
- ✅ Clear boundary (wraps external API)
- ✅ Can be moved without changing behavior

**ROI:** Very High - Creates reusable integration layer, reduces coupling

**Files to create:**
- `app/services/integrations/gemini_client.py` - Move Gemini client code
- Update imports in `rag_service.py` and `assessment/*.py`

**Impact:** Medium - affects multiple files but clear boundaries

---

### 4. Extract Pure Chunking Logic → `chunking/chunker.py`
**Current:** `chunking_service.py` mixes chunking logic (`chunk_text_parent_child`, `estimate_tokens`) with DB persistence (`save_chunks_to_db`)

**Why Safe:**
- ✅ `chunk_text_parent_child` is pure (no DB, no side effects)
- ✅ `estimate_tokens` is pure utility
- ✅ DB persistence (`save_chunks_to_db`) is separate concern
- ✅ No external dependencies in chunking logic

**ROI:** High - Separates business logic from persistence, improves testability

**Files to create:**
- `app/services/chunking/chunker.py` - Move `chunk_text_parent_child`, `estimate_tokens`
- `app/services/chunking/repository.py` - Move `save_chunks_to_db`

**Impact:** Low - clear separation, no behavior change

---

### 5. Extract Chat Source Formatting → `chat/sources.py`
**Current:** `chat_service.py` has `format_sources_for_response()` and `format_sources_for_db()` (lines 164-221)

**Why Safe:**
- ✅ Pure functions (data transformation only)
- ✅ No DB operations (just formatting)
- ✅ Already separated from DB logic
- ✅ Used by API layer, not internal to chat service

**ROI:** Medium - Improves clarity, separates formatting from DB ops

**Files to create:**
- `app/services/chat/sources.py` - Move both formatting functions

**Impact:** Low - only affects imports in `chat.py` API route

---

### 6. Split File Extraction Dispatcher → `documents/extraction/dispatcher.py`
**Current:** `file_extraction_service.py` has dispatcher (`extract_text_from_file`, `get_file_type`, `is_*_file`) mixed with all extractors

**Why Safe:**
- ✅ Dispatcher is routing logic (no file I/O)
- ✅ Extractors are independent (can be moved separately)
- ✅ Clear separation of concerns
- ✅ `pdf_service.py` already exists (proves pattern works)

**ROI:** High - Creates clear structure, enables incremental extractor extraction

**Files to create:**
- `app/services/documents/extraction/dispatcher.py` - Move `get_file_type`, `is_*_file`, `extract_text_from_file`
- Keep extractors in `file_extraction_service.py` for now (can extract later)

**Impact:** Low - routing logic is isolated, extractors stay in place initially

---

## Refactoring Order (Safest First)

1. **rag/prompts.py** - Pure functions, zero risk
2. **rag/sources.py** - Pure function, internal use only
3. **chunking/chunker.py + repository.py** - Clear separation, no dependencies
4. **chat/sources.py** - Pure functions, external API usage
5. **documents/extraction/dispatcher.py** - Routing logic, extractors stay
6. **integrations/gemini_client.py** - Most complex but highest value

---

## Validation Strategy

After each refactor:
1. Fix imports in affected files
2. Run tests (if available)
3. Verify API endpoints still work
4. Check no behavior changes (same inputs → same outputs)

---

## Notes

- **Assessment services** are out of scope but use `get_gemini_client()` - will need import update
- **PDF service** already separated - good pattern to follow
- **Viewer services** (docx, pptx) can be moved later to `documents/viewers/`
- All refactors maintain 100% backward compatibility at API level

