#!/usr/bin/env python3
"""Verify all imports work after refactoring."""

import sys

def test_imports():
    """Test all critical imports."""
    errors = []
    
    # Test RAG imports
    try:
        from app.services.rag import answer_question
        print("✓ RAG imports work")
    except Exception as e:
        errors.append(f"RAG import failed: {e}")
    
    # Test Chat imports
    try:
        from app.services.chat import (
            create_conversation,
            get_conversation,
            get_conversation_messages,
            save_message,
            fetch_source_metadata,
            format_sources_for_response,
            format_sources_for_db,
        )
        print("✓ Chat imports work")
    except Exception as e:
        errors.append(f"Chat import failed: {e}")
    
    # Test Chunking imports
    try:
        from app.services.chunking import chunk_text_parent_child, save_chunks_to_db
        print("✓ Chunking imports work")
    except Exception as e:
        errors.append(f"Chunking import failed: {e}")
    
    # Test Documents imports
    try:
        from app.services.documents import (
            get_file_type,
            is_text_processable,
            is_media_file,
            is_image_file,
            extract_text_from_file,
            convert_docx_to_html,
            extract_pptx_slides,
        )
        print("✓ Documents imports work")
    except Exception as e:
        errors.append(f"Documents import failed: {e}")
    
    # Test Integrations imports
    try:
        from app.services.integrations.gemini_client import get_gemini_client, generate_content, list_available_models
        from app.services.integrations.embeddings import create_embedding, create_embeddings_batch
        from app.services.integrations.pinecone_store import store_vectors, query_vectors, init_index
        print("✓ Integrations imports work")
    except Exception as e:
        errors.append(f"Integrations import failed: {e}")
    
    # Test FastAPI app
    try:
        from app import app
        route_count = len(app.routes)
        print(f"✓ FastAPI app imports successfully ({route_count} routes)")
    except Exception as e:
        errors.append(f"FastAPI app import failed: {e}")
    
    # Test API routes
    try:
        from app.api import auth, courses, documents, chat, document_viewers, assessment
        print("✓ All API routes import successfully")
    except Exception as e:
        errors.append(f"API routes import failed: {e}")
    
    if errors:
        print("\n[ERROR] ERRORS FOUND:")
        for error in errors:
            print(f"  - {error}")
        return False
    else:
        print("\n[SUCCESS] All imports verified successfully!")
        return True

if __name__ == "__main__":
    success = test_imports()
    sys.exit(0 if success else 1)

